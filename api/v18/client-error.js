const {json,cors}=require('../../server/v18-lib');

const SOURCES=new Set(['window_error','unhandled_rejection','boot_load']);
const CATEGORIES=new Set(['network','script','storage','auth','client']);
const ORIGINS=new Set(['https://www.workandworkout.com','https://workandworkout.com']);

module.exports=async(req,res)=>{
  if(cors(req,res))return;
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed.'});
  const origin=String(req.headers.origin||'');
  const fetchSite=String(req.headers['sec-fetch-site']||'');
  if(!ORIGINS.has(origin)||fetchSite&&fetchSite!=='same-origin')return json(res,403,{ok:false,error:'Same-origin browser request required.'});
  const source=String(req.body?.source||'');
  const category=String(req.body?.category||'');
  const release=String(req.body?.release||'');
  if(!SOURCES.has(source)||!CATEGORIES.has(category)||!/^\d+\.\d+\.\d+$/.test(release))return json(res,400,{ok:false,error:'Invalid telemetry event.'});
  console.error(JSON.stringify({event:'client_error',source,category,release}));
  return json(res,202,{ok:true});
};
