const crypto=require('crypto');
const {sanitizePlannerState}=require('../shared/v23-core');

const SUPABASE_URL=()=>process.env.SUPABASE_URL;
const ANON=()=>process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY;
const SERVICE=()=>process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;

function requestMeta(req,res){
  if(!req.requestId)req.requestId=crypto.randomUUID();
  res._wgcRequest=req;
  res.setHeader('X-Request-Id',req.requestId);
}

function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  const req=res._wgcRequest;
  console.log(JSON.stringify({event:'api_response',requestId:req?.requestId||null,method:req?.method||null,path:req?.url?.split('?')[0]||null,status}));
  res.end(JSON.stringify(body));
}

function cors(req,res){
  requestMeta(req,res);
  const origin=req.headers.origin||'';
  const allow=(process.env.CORS_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(origin)res.setHeader('Access-Control-Allow-Origin',allow.includes(origin)?origin:'null');
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  if(req.method==='OPTIONS'){
    res.statusCode=allow.includes(origin)?204:403;
    res.end();
    return true;
  }
  return false;
}

function envReady(){return !!(SUPABASE_URL()&&ANON()&&SERVICE())}

async function verifyUser(req){
  if(!envReady())throw Object.assign(new Error('Cloud backend is not configured.'),{status:503});
  const auth=req.headers.authorization||'';
  if(!auth.startsWith('Bearer '))throw Object.assign(new Error('Sign in required.'),{status:401});
  const response=await fetch(`${SUPABASE_URL()}/auth/v1/user`,{headers:{apikey:ANON(),Authorization:auth}});
  if(!response.ok)throw Object.assign(new Error('Session expired. Sign in again.'),{status:401});
  return await response.json();
}

function serviceHeaders(extra={}){
  const key=SERVICE();
  const headers={apikey:key,...extra};
  if(key&&!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
  return headers;
}

async function serviceFetch(path,{method='GET',body,prefer='return=representation'}={}){
  const response=await fetch(`${SUPABASE_URL()}/rest/v1/${path}`,{
    method,
    headers:serviceHeaders({'Content-Type':'application/json',Prefer:prefer}),
    body:body==null?undefined:JSON.stringify(body)
  });
  let data=null;
  const text=await response.text();
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!response.ok){
    const error=new Error(data?.message||data?.error||`Database request failed (${response.status})`);
    error.status=500;
    throw error;
  }
  return data;
}

async function getState(userId){
  const rows=await serviceFetch(`user_state?user_id=eq.${encodeURIComponent(userId)}&select=state,schema_version,updated_at`);
  const row=rows?.[0];
  if(!row)return null;
  return{...row,state:sanitizePlannerState(row.state,{appVersion:'23.0.0'}),schema_version:23};
}

async function saveState(userId,state){
  const sanitized=sanitizePlannerState(state,{appVersion:'23.0.0'});
  const rows=await serviceFetch('user_state?on_conflict=user_id',{
    method:'POST',
    body:{user_id:userId,state:sanitized,schema_version:23,updated_at:new Date().toISOString()},
    prefer:'resolution=merge-duplicates,return=representation'
  });
  return{...(rows?.[0]||{}),state:sanitized};
}

async function saveOnboarding(userId,answers){
  await serviceFetch('onboarding_answers?on_conflict=user_id',{
    method:'POST',
    body:{user_id:userId,answers,updated_at:new Date().toISOString()},
    prefer:'resolution=merge-duplicates,return=minimal'
  });
}

async function savePlan(userId,plan){
  await serviceFetch('rpc/replace_active_user_plan',{
    method:'POST',
    body:{target_user_id:userId,target_kind:'combined',target_plan:plan,target_source:'deterministic+ai'},
    prefer:'return=representation'
  });
}

async function deleteChat(userId,threadId=null){
  let path=`chat_messages?user_id=eq.${encodeURIComponent(userId)}`;
  if(threadId)path+=`&thread_id=eq.${encodeURIComponent(threadId)}`;
  await serviceFetch(path,{method:'DELETE',prefer:'return=minimal'});
}

async function countAI(userId){
  const limit=Math.max(1,Math.min(1000,+(process.env.AI_DAILY_LIMIT||40)||40));
  const used=await serviceFetch('rpc/count_ai_request',{method:'POST',body:{target_user_id:userId,daily_limit:limit},prefer:'return=representation'});
  if(used==null)throw Object.assign(new Error('Daily AI coach limit reached. Try again tomorrow.'),{status:429});
  return{used:+used,limit};
}

function parseStored(value,fallback=null){
  if(value==null)return fallback;
  if(typeof value!=='string')return value;
  try{return JSON.parse(value)}catch{return fallback}
}

function compactStoredContext(state){
  const storage=state?.storage||{};
  const profile=parseStored(storage['wgp-v15-profile'],null);
  const nutrition=parseStored(storage['wgp-v15-nutrition-settings'],null);
  const history=parseStored(storage['wgp-v15-training-history'],[]);
  return{
    profile,
    nutrition,
    recentCompleted:Array.isArray(history)?history.slice(-6):[],
    body:parseStored(storage['wgp-v15-body-log'],null),
    preferences:parseStored(storage['wgp-v15-onboarding-v18'],null)
  };
}

function extractOutputText(result){
  if(typeof result?.output_text==='string')return result.output_text;
  for(const item of result?.output||[])for(const content of item?.content||[])if(content.type==='output_text'&&content.text)return content.text;
  return'';
}

async function openAI({instructions,text,imageDataUrl,model}){
  if(!process.env.OPENAI_API_KEY)throw Object.assign(new Error('AI coach is not configured yet.'),{status:503});
  const content=[{type:'input_text',text:String(text||'')}];
  if(imageDataUrl)content.push({type:'input_image',image_url:imageDataUrl,detail:'high'});
  const body={model:model||process.env.OPENAI_MODEL||'gpt-5.6-terra',instructions,input:[{role:'user',content}],max_output_tokens:1800};
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result?.error?.message||'AI request failed.'),{status:response.status>=400&&response.status<500?response.status:502});
  return{raw:result,text:extractOutputText(result)};
}

function cleanJsonText(text){
  let value=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const start=value.indexOf('{'),end=value.lastIndexOf('}');
  if(start>=0&&end>start)value=value.slice(start,end+1);
  return value;
}

function parseAIJson(text,fallback=null){try{return JSON.parse(cleanJsonText(text))}catch{return fallback}}

function errorResponse(res,error){
  console.error(JSON.stringify({event:'api_error',requestId:res._wgcRequest?.requestId||null,path:res._wgcRequest?.url?.split('?')[0]||null,status:error.status||500,message:error.message||'Unexpected server error'}));
  json(res,error.status||500,{ok:false,error:error.message||'Unexpected server error'});
}

module.exports={json,cors,envReady,verifyUser,serviceHeaders,serviceFetch,getState,saveState,saveOnboarding,savePlan,deleteChat,countAI,compactStoredContext,openAI,parseAIJson,errorResponse,SUPABASE_URL,ANON,SERVICE};
