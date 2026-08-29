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

function json(res,status,body,{cacheControl='no-store'}={}){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control',cacheControl);
  const req=res._wgcRequest;
  console.log(JSON.stringify({event:'api_response',requestId:req?.requestId||null,method:req?.method||null,path:req?.url?.split('?')[0]||null,status}));
  res.end(JSON.stringify(body));
}

function cors(req,res){
  requestMeta(req,res);
  const origin=req.headers.origin||'';
  const allow=new Set([
    'https://www.workandworkout.com',
    'https://workandworkout.com',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost',
    String(process.env.APP_ORIGIN||'').replace(/\/$/,'')
  ].filter(Boolean));
  const accepted=allow.has(origin);
  if(origin&&accepted)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  if(req.method==='OPTIONS'){
    res.statusCode=accepted?204:403;
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
  async function request(){
    const response=await fetch(`${SUPABASE_URL()}/auth/v1/user`,{headers:{apikey:ANON(),Authorization:auth}});
    const text=await response.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={message:text}}
    return{response,data};
  }
  let result=await request();
  if(!result.response.ok&&/jwt issued at future/i.test(String(result.data?.message||result.data?.msg||''))){
    await new Promise(resolve=>setTimeout(resolve,350));
    result=await request();
  }
  if(!result.response.ok){
    // GoTrue answers a revoked session with 403 session_not_found, not 401.
    // Passing that through unchanged left the browser looping: its retry path
    // only recognises 401, so it never refreshed and never signed the user out.
    // Any rejection of the caller's token means the same thing to the client.
    const upstream=result.response.status;
    const rejected=upstream===401||upstream===403;
    const status=rejected?401:(upstream>=400&&upstream<500?upstream:502);
    throw Object.assign(new Error(status===401?'Session expired. Sign in again.':(result.data?.message||'Authentication service is temporarily unavailable.')),{status});
  }
  return{...result.data,authorization:auth};
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
    error.status=response.status>=400&&response.status<500?response.status:502;
    throw error;
  }
  return data;
}

function userHeaders(authorization,extra={}){
  if(!authorization?.startsWith?.('Bearer '))throw Object.assign(new Error('Sign in required.'),{status:401});
  return{apikey:ANON(),Authorization:authorization,...extra};
}

async function userFetch(authorization,path,{method='GET',body,prefer='return=representation'}={}){
  const response=await fetch(`${SUPABASE_URL()}/rest/v1/${path}`,{
    method,
    headers:userHeaders(authorization,{'Content-Type':'application/json',Prefer:prefer}),
    body:body==null?undefined:JSON.stringify(body)
  });
  const text=await response.text();let data=null;
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!response.ok){
    const error=new Error(data?.message||data?.error||`Database request failed (${response.status})`);
    error.status=response.status>=400&&response.status<500?response.status:502;
    throw error;
  }
  return data;
}

async function getState(userIdOrAuthorization,authorization=userIdOrAuthorization){
  const rows=await userFetch(authorization,'user_state?select=state,schema_version,updated_at&limit=1');
  const row=rows?.[0];
  if(!row)return null;
  return{...row,state:sanitizePlannerState(row.state,{appVersion:'23.0.0'}),schema_version:23};
}

async function saveState(userId,state,authorization){
  const sanitized=sanitizePlannerState(state,{appVersion:'23.0.0'});
  const rows=await userFetch(authorization,'user_state?on_conflict=user_id',{
    method:'POST',
    body:{user_id:userId,state:sanitized,schema_version:23,updated_at:new Date().toISOString()},
    prefer:'resolution=merge-duplicates,return=representation'
  });
  return{...(rows?.[0]||{}),state:sanitized};
}

async function saveOnboarding(userId,answers,authorization){
  await userFetch(authorization,'onboarding_answers?on_conflict=user_id',{
    method:'POST',
    body:{user_id:userId,answers,updated_at:new Date().toISOString()},
    prefer:'resolution=merge-duplicates,return=minimal'
  });
}

async function savePlan(plan,authorization){
  await userFetch(authorization,'rpc/replace_own_active_user_plan',{
    method:'POST',
    body:{target_kind:'combined',target_plan:plan,target_source:'deterministic+ai'},
    prefer:'return=representation'
  });
}

async function deleteChat(userId,threadId=null,authorization){
  // RLS already scopes this to the caller. The explicit owner filter keeps the
  // DELETE qualified as well, so a policy regression cannot widen it and
  // PostgREST never sees an unfiltered mutation.
  if(!userId)throw Object.assign(new Error('Sign in required.'),{status:401});
  let path=`chat_messages?user_id=eq.${encodeURIComponent(userId)}`;
  if(threadId)path+=`&thread_id=eq.${encodeURIComponent(threadId)}`;
  await userFetch(authorization,path,{method:'DELETE',prefer:'return=minimal'});
}

async function countAI(userId){
  const limit=Math.max(1,Math.min(1000,+(process.env.AI_DAILY_LIMIT||40)||40));
  const used=await serviceFetch('rpc/count_ai_request',{method:'POST',body:{target_user_id:userId,daily_limit:limit},prefer:'return=representation'});
  if(used==null)throw Object.assign(new Error('Daily AI coach limit reached. Try again tomorrow.'),{status:429});
  return{used:+used,limit};
}

async function countStateWrite(userId,payloadBytes){
  const dailyLimit=Math.max(10,Math.min(5000,+(process.env.STATE_DAILY_WRITE_LIMIT||300)||300));
  const byteLimit=Math.max(8_000_000,Math.min(2_000_000_000,+(process.env.STATE_DAILY_BYTE_LIMIT||256_000_000)||256_000_000));
  const used=await serviceFetch('rpc/count_state_write',{method:'POST',body:{target_user_id:userId,payload_bytes:payloadBytes,daily_write_limit:dailyLimit,daily_byte_limit:byteLimit},prefer:'return=representation'});
  const row=Array.isArray(used)?used[0]:used;
  if(!row)throw Object.assign(new Error('Daily account-sync budget reached. Your data is safe on this device; try syncing again tomorrow.'),{status:429,retryAfter:3600});
  return{writes:+row.writes,bytes:+row.bytes,dailyLimit,byteLimit};
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

async function openAI({instructions,text,imageDataUrl,model,textFormat=null,safetyIdentifier='',maxOutputTokens=1800,reasoning=null}){
  if(!process.env.OPENAI_API_KEY)throw Object.assign(new Error('AI coach is not configured yet.'),{status:503});
  const content=[{type:'input_text',text:String(text||'')}];
  if(imageDataUrl)content.push({type:'input_image',image_url:imageDataUrl,detail:'high'});
  const body={model:model||process.env.OPENAI_MODEL||'gpt-5.6-terra',instructions,input:[{role:'user',content}],max_output_tokens:Math.max(256,Math.min(24000,Number(maxOutputTokens)||1800)),store:false};
  // Callers that need machine-readable data opt in to a strict schema.  The
  // default remains plain text for the coach and onboarding refinement.
  if(textFormat)body.text={format:textFormat};
  // Scheduling is a high-consequence interpretation task: callers can opt
  // into deliberate reasoning without changing the faster coach responses.
  if(reasoning)body.reasoning={effort:String(reasoning)};
  // Never send an email address or account name as a safety identifier.
  if(safetyIdentifier)body.safety_identifier=String(safetyIdentifier).slice(0,64);
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result?.error?.message||'AI request failed.'),{status:response.status>=400&&response.status<500?response.status:502});
  if(result?.status==='incomplete')throw Object.assign(new Error('AI schedule reading was incomplete. Try a shorter date range or add the schedule in two parts.'),{status:422});
  const output=extractOutputText(result);
  if(!output)throw Object.assign(new Error('AI did not return a schedule proposal. Please try again.'),{status:502});
  return{raw:result,text:output};
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
  if(error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));
  json(res,error.status||500,{ok:false,error:error.message||'Unexpected server error'});
}

module.exports={json,cors,envReady,verifyUser,serviceHeaders,serviceFetch,userHeaders,userFetch,getState,saveState,saveOnboarding,savePlan,deleteChat,countAI,countStateWrite,compactStoredContext,openAI,parseAIJson,errorResponse,SUPABASE_URL,ANON,SERVICE};
