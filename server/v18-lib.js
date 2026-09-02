const crypto=require('crypto');
const {sanitizePlannerState}=require('../shared/v23-core');

const SUPABASE_URL=()=>process.env.SUPABASE_URL;
const ANON=()=>process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY;
const SERVICE=()=>process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const HEALTH_CONSENT_VERSION='2026-08-31-v1';
const HEALTH_POLICY_VERSION='1.5';
const HEALTH_CONSENT_PURPOSES=Object.freeze(['account_cloud_sync','encrypted_webdav_sync','personalized_ai','meal_scan_ai']);
const HEALTH_CONSENT_STATEMENT='I agree to the selected uses of my health and wellness data. I can change my mind at any time.';
const HEALTH_WITHDRAWAL_STATEMENT='I withdraw my consent for future account cloud sync, encrypted WebDAV sync, personalized AI, and Meal Scan processing of my health and wellness data.';

function requestMeta(req,res){
  if(!req.requestId)req.requestId=crypto.randomUUID();
  if(!req.requestStartedAt)req.requestStartedAt=Date.now();
  res._wgcRequest=req;
  res.setHeader('X-Request-Id',req.requestId);
}

function json(res,status,body,{cacheControl='no-store'}={}){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control',cacheControl);
  const req=res._wgcRequest;
  console.log(JSON.stringify({event:'api_response',requestId:req?.requestId||null,method:req?.method||null,path:req?.url?.split('?')[0]||null,status,durationMs:req?.requestStartedAt?Date.now()-req.requestStartedAt:null}));
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
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-Work-Workout-Native');
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

function normalizeConsentRow(row){
  if(!row)return null;
  return{
    action:row.action,
    consentVersion:row.consent_version,
    policyVersion:row.policy_version,
    purposes:Array.isArray(row.purposes)?row.purposes:[],
    statement:row.explicit_statement,
    locale:row.locale||null,
    region:row.region||'global',
    createdAt:row.created_at
  };
}

async function getHealthConsent(userId,authorization){
  if(!userId)throw Object.assign(new Error('Sign in required.'),{status:401});
  const path=`health_data_consent_events?select=action,consent_version,policy_version,purposes,explicit_statement,locale,region,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc,id.desc&limit=1`;
  const rows=await userFetch(authorization,path);
  return normalizeConsentRow(rows?.[0]);
}

function healthConsentActive(receipt,purpose){
  return !!receipt&&receipt.action==='granted'&&receipt.consentVersion===HEALTH_CONSENT_VERSION&&HEALTH_CONSENT_PURPOSES.includes(purpose)&&receipt.purposes.includes(purpose);
}

async function recordHealthConsent(userId,authorization,{action,purposes=[],locale=null}={}){
  if(!userId)throw Object.assign(new Error('Sign in required.'),{status:401});
  const normalizedAction=action==='withdrawn'?'withdrawn':'granted';
  const normalizedPurposes=normalizedAction==='granted'?[...new Set(purposes.filter(value=>HEALTH_CONSENT_PURPOSES.includes(value)))]:[];
  if(normalizedAction==='granted'&&!normalizedPurposes.length)throw Object.assign(new Error('Select at least one health-data use.'),{status:400});
  const rows=await userFetch(authorization,'health_data_consent_events',{
    method:'POST',
    body:{
      user_id:userId,
      action:normalizedAction,
      consent_version:HEALTH_CONSENT_VERSION,
      policy_version:HEALTH_POLICY_VERSION,
      purposes:normalizedPurposes,
      explicit_statement:normalizedAction==='granted'?HEALTH_CONSENT_STATEMENT:HEALTH_WITHDRAWAL_STATEMENT,
      locale:String(locale||'').slice(0,35)||null,
      region:'global',
      source:'work-and-workout-app'
    }
  });
  return normalizeConsentRow(rows?.[0]);
}

async function requireHealthConsent(user,purpose){
  const receipt=await getHealthConsent(user?.id,user?.authorization);
  if(!healthConsentActive(receipt,purpose)){
    throw Object.assign(new Error('Choose whether to allow this health-data feature before continuing.'),{
      status:428,
      code:'HEALTH_CONSENT_REQUIRED',
      purpose
    });
  }
  return receipt;
}

async function getState(userIdOrAuthorization,authorization=userIdOrAuthorization){
  const rows=await userFetch(authorization,'user_state?select=state,schema_version,updated_at&limit=1');
  const row=rows?.[0];
  if(!row)return null;
  return{...row,state:sanitizePlannerState(row.state,{appVersion:'23.0.0'}),schema_version:23};
}

async function saveState(userId,state,authorization,baseUpdatedAt){
  if(baseUpdatedAt===undefined)throw Object.assign(new Error('Reload the app and load your saved account before syncing.'),{status:428,code:'STATE_BASE_REQUIRED'});
  if(baseUpdatedAt!==null&&(typeof baseUpdatedAt!=='string'||!Number.isFinite(Date.parse(baseUpdatedAt))))throw Object.assign(new Error('A valid saved-account version is required.'),{status:400,code:'STATE_BASE_REQUIRED'});
  const sanitized=sanitizePlannerState(state,{appVersion:'23.0.0'});
  const conflict=()=>Object.assign(new Error('Your saved account changed. Load the latest copy before syncing; no data was overwritten.'),{status:409,code:'STATE_CONFLICT'});
  const creating=baseUpdatedAt===null;
  const updatedAt=new Date(Math.max(Date.now(),creating?0:Date.parse(baseUpdatedAt)+1)).toISOString();
  let rows;
  try{rows=await userFetch(authorization,creating?'user_state':`user_state?user_id=eq.${encodeURIComponent(userId)}&updated_at=eq.${encodeURIComponent(baseUpdatedAt)}`,{
    method:creating?'POST':'PATCH',
    body:{...(creating?{user_id:userId}:{}),state:sanitized,schema_version:23,updated_at:updatedAt},
    prefer:'return=representation'
  })}catch(error){if(error.status===409)throw conflict();throw error}
  if(!rows?.[0])throw conflict();
  return{...rows[0],state:sanitized};
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
  const globalLimit=Math.max(1,Math.min(1_000_000,+(process.env.AI_GLOBAL_DAILY_LIMIT||100)||100));
  const result=await serviceFetch('rpc/reserve_ai_request',{method:'POST',body:{target_user_id:userId,user_daily_limit:limit,global_daily_limit:globalLimit},prefer:'return=representation'});
  const row=Array.isArray(result)?result[0]:result;
  if(!row?.allowed){
    const globalBlocked=row?.blocked_reason==='global';
    throw Object.assign(new Error(globalBlocked?'AI planning capacity has been reached for today. Try again tomorrow.':'Daily AI coach limit reached. Try again tomorrow.'),{status:429,retryAfter:3600});
  }
  return{used:+row.user_requests,limit,globalUsed:+row.global_requests,globalLimit};
}

function paidAccount(user){
  const metadata=user?.app_metadata||{};
  const planValue=metadata.plan&&typeof metadata.plan==='object'?(metadata.plan.id||metadata.plan.name):metadata.plan;
  const tier=String(planValue||metadata.tier||metadata.subscription_tier||'').toLowerCase();
  const entitlement=metadata.ai_coach===true||metadata.entitlements?.ai_coach===true;
  const paidTier=['paid','pro','premium'].includes(tier);
  const status=String(metadata.subscription_status||'').toLowerCase();
  const inactive=['canceled','cancelled','expired','inactive','unpaid'].includes(status);
  return !inactive&&(entitlement||paidTier);
}

async function reserveAICoach(user){
  if(!user?.id)throw Object.assign(new Error('Sign in required.'),{status:401});
  const userLimit=Math.max(1,Math.min(1000,+(process.env.AI_DAILY_LIMIT||40)||40));
  const globalLimit=Math.max(1,Math.min(1_000_000,+(process.env.AI_GLOBAL_DAILY_LIMIT||100)||100));
  const paid=paidAccount(user);
  const result=await serviceFetch('rpc/reserve_ai_coach_request',{
    method:'POST',
    body:{target_user_id:user.id,paid_access:paid,user_daily_limit:userLimit,global_daily_limit:globalLimit},
    prefer:'return=representation'
  });
  const row=Array.isArray(result)?result[0]:result;
  if(!row?.allowed){
    if(row?.blocked_reason==='trial_used'){
      throw Object.assign(new Error('Your free AI Coach question has been used. Continued coaching requires a paid plan.'),{
        status:402,code:'AI_COACH_PAID_REQUIRED'
      });
    }
    const globalBlocked=row?.blocked_reason==='global';
    throw Object.assign(new Error(globalBlocked?'AI planning capacity has been reached for today. Try again tomorrow.':'Daily AI Coach limit reached. Try again tomorrow.'),{status:429,retryAfter:3600});
  }
  return{
    access:row.access_type||(paid?'paid':'trial'),
    trialQuestions:+row.trial_questions||0,
    used:+row.user_requests,
    globalUsed:+row.global_requests
  };
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
  const req=res._wgcRequest;
  console.error(JSON.stringify({event:'api_error',requestId:req?.requestId||null,path:req?.url?.split('?')[0]||null,status:error.status||500,durationMs:req?.requestStartedAt?Date.now()-req.requestStartedAt:null,message:error.message||'Unexpected server error'}));
  if(error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));
  const body={ok:false,error:error.message||'Unexpected server error'};
  if(error.code)body.code=error.code;
  json(res,error.status||500,body);
}

module.exports={json,cors,envReady,verifyUser,serviceHeaders,serviceFetch,userHeaders,userFetch,getHealthConsent,healthConsentActive,recordHealthConsent,requireHealthConsent,HEALTH_CONSENT_VERSION,HEALTH_POLICY_VERSION,HEALTH_CONSENT_PURPOSES,HEALTH_CONSENT_STATEMENT,getState,saveState,saveOnboarding,savePlan,deleteChat,countAI,paidAccount,reserveAICoach,countStateWrite,compactStoredContext,openAI,parseAIJson,errorResponse,SUPABASE_URL,ANON,SERVICE};
