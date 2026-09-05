const crypto=require('crypto');
const lib=require('../../server/v18-lib');
const {cors,json,serviceFetch,errorResponse}=lib;

const METRICS=new Set(['steps','workouts','calories_burned','custom']);
const CADENCES=new Set(['daily','total']);
const SOURCES=new Set(['steps','workouts','calories','manual']);
const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let budgetMinute=0;
const userBudget=new Map();

function cleanText(value,max){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max)}
function cleanCode(value){return String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,8)}
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))}
function validUuid(value){return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(value||''))}
function daysBetween(start,end){return Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)}
function exactKeys(body,allowed){return Object.keys(body).every(key=>allowed.includes(key))}
function inviteCode(){let bytes=crypto.randomBytes(8),code='';for(let i=0;i<8;i++)code+=CODE_ALPHABET[bytes[i]&31];return code}
function expectedSource(metric){return metric==='steps'?'steps':metric==='workouts'?'workouts':metric==='calories_burned'?'calories':'manual'}
function unitFor(metric,custom){return metric==='steps'?'steps':metric==='workouts'?'workouts':metric==='calories_burned'?'kcal burned':cleanText(custom,24)}
function rateLimit(userId){
 const minute=Math.floor(Date.now()/60000);
 if(minute!==budgetMinute){budgetMinute=minute;userBudget.clear()}
 const used=(userBudget.get(userId)||0)+1;userBudget.set(userId,used);
 if(used>45)throw Object.assign(new Error('Please wait a moment before updating the challenge again.'),{status:429,retryAfter:30});
}
async function boards(userId,localDate){
 const result=await serviceFetch('rpc/challenge_boards_for_user_v78',{method:'POST',body:{target_user_id:userId,board_date:validDate(localDate)?localDate:null}});
 return Array.isArray(result)?result:[];
}
function parseBody(req){
 if(Number(req.headers['content-length']||0)>4096)throw Object.assign(new Error('Challenge request is too large.'),{status:413});
 let body=req.body;
 if(typeof body==='string'){try{body=JSON.parse(body)}catch{throw Object.assign(new Error('Use a valid challenge request.'),{status:400})}}
 if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('Challenge request is required.'),{status:400});
 return body;
}
async function create(user,body){
 const allowed=['action','title','metric','unitLabel','targetValue','cadence','startsOn','endsOn','displayName','sharingConfirmed','localDate'];
 if(!exactKeys(body,allowed)||body.sharingConfirmed!==true)throw Object.assign(new Error('Confirm the score sharing note to create this challenge.'),{status:400});
 const title=cleanText(body.title,60),metric=String(body.metric||''),cadence=String(body.cadence||'');
 const displayName=cleanText(body.displayName,30),target=Number(body.targetValue),starts=String(body.startsOn||''),ends=String(body.endsOn||'');
 const unit=unitFor(metric,body.unitLabel);
 if(title.length<3||displayName.length<2||!METRICS.has(metric)||!CADENCES.has(cadence)||unit.length<1||!Number.isFinite(target)||target<=0||target>100000000||!validDate(starts)||!validDate(ends)||daysBetween(starts,ends)<0||daysBetween(starts,ends)>180)throw Object.assign(new Error('Check the challenge name, goal and dates.'),{status:400});
 const payload={target_user_id:user.id,challenge_title:title,challenge_metric:metric,challenge_unit:unit,challenge_target:target,challenge_cadence:cadence,challenge_starts_on:starts,challenge_ends_on:ends,member_display_name:displayName};
 for(let attempt=0;attempt<2;attempt++){
  try{return await serviceFetch('rpc/create_challenge_v78',{method:'POST',body:{...payload,target_invite_code:inviteCode()}})}
  catch(error){if(attempt||!/duplicate|unique/i.test(error.message))throw error}
 }
}
async function join(user,body){
 const allowed=['action','inviteCode','displayName','sharingConfirmed','localDate'];
 const code=cleanCode(body.inviteCode),name=cleanText(body.displayName,30);
 if(!exactKeys(body,allowed)||body.sharingConfirmed!==true||code.length!==8||name.length<2)throw Object.assign(new Error('Enter the 8-character invite code and your display name.'),{status:400});
 return serviceFetch('rpc/join_challenge_v78',{method:'POST',body:{target_user_id:user.id,target_invite_code:code,member_display_name:name}});
}
async function score(user,body){
 const allowed=['action','challengeId','metric','date','value','source','localDate'];
 const id=String(body.challengeId||''),metric=String(body.metric||''),source=String(body.source||''),value=Number(body.value),day=String(body.date||'');
 if(!exactKeys(body,allowed)||!validUuid(id)||!METRICS.has(metric)||!SOURCES.has(source)||source!==expectedSource(metric)||!validDate(day)||!Number.isFinite(value)||value<0||value>100000000)throw Object.assign(new Error('Use a valid challenge score.'),{status:400});
 return serviceFetch('rpc/record_challenge_score_v78',{method:'POST',body:{target_user_id:user.id,target_challenge_id:id,score_date:day,score_value:value,score_source:source}});
}
async function membershipAction(user,body,action){
 if(!exactKeys(body,['action','challengeId','localDate'])||!validUuid(body.challengeId))throw Object.assign(new Error('Choose a valid challenge.'),{status:400});
 return serviceFetch(`rpc/${action}_challenge_v78`,{method:'POST',body:{target_user_id:user.id,target_challenge_id:body.challengeId}});
}

module.exports=async(req,res)=>{
 if(cors(req,res))return;
 try{
  const user=await lib.verifyUser(req);rateLimit(user.id);
  if(req.method==='GET'){
   const localDate=new URL(req.url||'/','http://local').searchParams.get('date');
   if(localDate&&!validDate(localDate))return json(res,400,{ok:false,error:'Use a valid local date.'});
   return json(res,200,{ok:true,boards:await boards(user.id,localDate)});
  }
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const body=parseBody(req),action=String(body.action||'');
  let challengeId=null;
  if(action==='create')challengeId=await create(user,body);
  else if(action==='join')challengeId=await join(user,body);
  else if(action==='score')await score(user,body);
  else if(action==='leave')await membershipAction(user,body,'leave');
  else if(action==='archive')await membershipAction(user,body,'archive');
  else throw Object.assign(new Error('Unknown challenge action.'),{status:400});
  return json(res,200,{ok:true,challengeId,boards:await boards(user.id,body.localDate)});
 }catch(error){
  if(/not found|has ended/i.test(error.message))Object.assign(error,{status:404});
  else if(/full/i.test(error.message))Object.assign(error,{status:409});
  else if(/owner|join this|only the challenge/i.test(error.message))Object.assign(error,{status:403});
  errorResponse(res,error);
 }
};

module.exports._test={cleanText,cleanCode,validDate,validUuid,daysBetween,exactKeys,expectedSource,unitFor};
