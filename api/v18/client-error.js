const crypto=require('crypto');
const {json,cors,envReady,serviceFetch,SERVICE}=require('../../server/v18-lib');

const SOURCES=new Set(['window_error','unhandled_rejection','boot_load','resource_error','network_error','api_error','native_bridge','native_crash','native_hang']);
const CATEGORIES=new Set(['network','script','storage','auth','client','api','native']);
const SURFACES=new Set(['web','ios','android']);
const WEB_ORIGINS=new Set(['https://www.workandworkout.com','https://workandworkout.com']);
const NATIVE_ORIGINS=new Set(['capacitor://localhost','ionic://localhost','http://localhost','https://localhost']);

function bodyValue(req){
  if(req.body&&typeof req.body==='object')return req.body;
  if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return null}}
  return null;
}

function redact(value,limit){
  return String(value||'')
    .replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/https?:\/\/[^\s)\]}]+/gi,'[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]')
    .replace(/\bBearer\s+\S+/gi,'Bearer [credential]')
    .replace(/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}(?:\.[A-Za-z0-9_-]{8,})?/g,'[credential]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,'[id]')
    .replace(/((?:token|key|code|secret|password)\s*[=:]\s*)[^\s,;&]+/gi,'$1[redacted]')
    .replace(/(["'])(?:(?!\1).){1,160}\1/g,'$1[value]$1')
    .replace(/\b\d{7,}\b/g,'[number]')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,limit);
}

function cleanRoute(value){
  const text=String(value||'').slice(0,1000);
  try{
    const parsed=new URL(text,'https://www.workandworkout.com');
    return parsed.pathname.replace(/[^\w./:@%+~-]/g,'').slice(0,240)||'/';
  }catch{return'/'}
}

function cleanStack(value){
  function redactFrame(line){
    return String(line||'')
      .replace(/[\u0000-\u001f\u007f]/g,' ')
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]')
      .replace(/\bBearer\s+\S+/gi,'Bearer [credential]')
      .replace(/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}(?:\.[A-Za-z0-9_-]{8,})?/g,'[credential]')
      .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,'[id]')
      .replace(/((?:token|key|code|secret|password)\s*[=:]\s*)[^\s,;&]+/gi,'$1[redacted]')
      .replace(/\b\d{12,}\b/g,'[number]')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,260);
  }
  return String(value||'')
    .split('\n')
    .slice(0,40)
    .map(line=>redactFrame(line.replace(/https?:\/\/[^/\s]+/gi,'').replace(/([?#])[^\s)\]}]+/g,'')))
    .filter(Boolean)
    .join('\n')
    .slice(0,4000);
}

function requestAllowed(req,surface){
  const origin=String(req.headers.origin||'').replace(/\/$/,'');
  const fetchSite=String(req.headers['sec-fetch-site']||'');
  const nativeHeader=String(req.headers['x-work-workout-native']||'').toLowerCase();
  if(surface==='web')return WEB_ORIGINS.has(origin)&&(!fetchSite||fetchSite==='same-origin');
  if(nativeHeader!==surface)return false;
  return origin?NATIVE_ORIGINS.has(origin):true;
}

function clientHash(req){
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  const address=forwarded||String(req.socket?.remoteAddress||'unknown');
  const day=new Date().toISOString().slice(0,10);
  return crypto.createHmac('sha256',SERVICE()).update(`${day}|${address}`).digest('hex');
}

module.exports=async(req,res)=>{
  if(cors(req,res))return;
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed.'});
  const declared=Number(req.headers['content-length']||0);
  if(declared>16384)return json(res,413,{ok:false,error:'Diagnostic report is too large.'});
  const body=bodyValue(req);
  if(!body)return json(res,400,{ok:false,error:'Invalid diagnostic report.'});
  let encoded='';
  try{encoded=JSON.stringify(body)}catch{}
  if(Buffer.byteLength(encoded)>16384)return json(res,413,{ok:false,error:'Diagnostic report is too large.'});

  const source=String(body.source||'');
  const category=String(body.category||'');
  const release=String(body.release||'');
  const surface=String(body.surface||'web').toLowerCase();
  if(!SOURCES.has(source)||!CATEGORIES.has(category)||!SURFACES.has(surface)||!/^\d+\.\d+\.\d+$/.test(release))return json(res,400,{ok:false,error:'Invalid diagnostic report.'});
  if(!requestAllowed(req,surface))return json(res,403,{ok:false,error:'Trusted app request required.'});
  if(!envReady())return json(res,503,{ok:false,error:'Diagnostic reporting is temporarily unavailable.'});

  const route=cleanRoute(body.route);
  const errorName=redact(body.errorName,80)||'Error';
  const message=redact(body.message,240);
  const stack=cleanStack(body.stack);
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({release,surface,source,category,route,errorName,message,stack:stack.split('\n').slice(0,5)})).digest('hex');
  try{
    const result=await serviceFetch('rpc/record_app_error',{
      method:'POST',
      body:{
        report_client_hash:clientHash(req),
        report_fingerprint:fingerprint,
        report_release:release,
        report_surface:surface,
        report_source:source,
        report_category:category,
        report_route:route,
        report_error_name:errorName,
        report_message:message||null,
        report_stack:stack||null,
        daily_limit:100
      }
    });
    const row=Array.isArray(result)?result[0]:result;
    console.error(JSON.stringify({event:'client_error_recorded',reportId:row?.report_id||null,fingerprint,release,surface,source,category,accepted:row?.accepted!==false}));
    return json(res,202,{ok:true,accepted:row?.accepted!==false,reportId:row?.report_id||null});
  }catch(error){
    console.error(JSON.stringify({event:'client_error_store_failed',release,surface,source,category,status:error.status||500}));
    return json(res,503,{ok:false,error:'Diagnostic reporting is temporarily unavailable.'});
  }
};

module.exports._test={redact,cleanRoute,cleanStack,requestAllowed};
