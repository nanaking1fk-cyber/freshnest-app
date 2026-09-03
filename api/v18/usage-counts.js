const {cors,json,envReady,serviceFetch}=require('../../server/v18-lib');
const EVENTS=new Set(['app_open','screen_home','screen_calendar','screen_training','screen_nutrition','screen_progress','screen_settings']);
const ORIGINS=new Set(['https://www.workandworkout.com','https://workandworkout.com','capacitor://localhost','ionic://localhost','http://localhost','https://localhost']);
let bucketMinute=0,bucketCount=0;
function validCounts(body){
 if(!body||Object.keys(body).length!==1||!body.counts||typeof body.counts!=='object'||Array.isArray(body.counts))return false;
 const entries=Object.entries(body.counts);
 return entries.length>0&&entries.length<=EVENTS.size&&entries.every(([key,value])=>EVENTS.has(key)&&Number.isInteger(value)&&value>0&&value<=20)&&entries.reduce((n,[,value])=>n+value,0)<=20;
}
module.exports=async(req,res)=>{
 if(cors(req,res))return;
 if(req.method!=='POST')return json(res,405,{ok:false});
 // No account lookup or per-visitor record. Reject extra fields, even if supplied.
 if(!ORIGINS.has(req.headers.origin)||String(req.url||'').includes('?'))return json(res,403,{ok:false});
 if(req.headers['sec-gpc']==='1'||req.headers.dnt==='1')return json(res,202,{ok:true});
 if(Number(req.headers['content-length']||0)>512)return json(res,413,{ok:false});
 let body=req.body;
 if(typeof body==='string'){try{body=JSON.parse(body)}catch{return json(res,400,{ok:false})}}
 if(!validCounts(body))return json(res,400,{ok:false});
 // A coarse process budget limits database work without collecting network IDs.
 const minute=Math.floor(Date.now()/60000);if(minute!==bucketMinute){bucketMinute=minute;bucketCount=0}
 if(++bucketCount>600)return json(res,429,{ok:false});
 if(!envReady())return json(res,503,{ok:false});
 try{
  await serviceFetch('rpc/add_app_usage_counts',{method:'POST',body:{increments:body.counts}});
  return json(res,202,{ok:true});
 }catch{return json(res,503,{ok:false})}
};
module.exports._test={validCounts};
