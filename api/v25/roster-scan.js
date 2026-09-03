const crypto=require('crypto');
const {json,cors,verifyUser,requireHealthConsent,countAI,openAI,parseAIJson,errorResponse}=require('../../server/v18-lib');
const {validateRequest,validateResult,responseFormat,instructions}=require('../../server/roster-vision-v48');
module.exports=async(req,res)=>{
 if(cors(req,res))return;
 try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed.'});
  const user=await verifyUser(req);
  const {identity,month,image}=validateRequest(req.body);
  await requireHealthConsent(user,'personalized_ai');
  await countAI(user.id);
  let out;
  try{
   out=await openAI({instructions,text:JSON.stringify({employee:identity,rosterMonth:month}),imageDataUrl:image,imageDetail:'original',model:process.env.OPENAI_ROSTER_MODEL||process.env.OPENAI_SCHEDULE_MODEL||process.env.OPENAI_MODEL||'gpt-5.6-terra',textFormat:responseFormat,maxOutputTokens:6000,reasoning:'high',timeoutMs:48000,safetyIdentifier:crypto.createHash('sha256').update(String(user.id)).digest('hex').slice(0,32)});
  }catch(error){
   const timedOut=['TimeoutError','AbortError'].includes(error.name),limited=error.status===429;
   throw Object.assign(new Error(timedOut?'Reading took too long. Try one week at a time.':limited?'The photo reader is busy. Please try again shortly.':'The photo reader could not finish. Please try again with a clearer section.'),{status:timedOut?504:limited?429:502,code:timedOut?'ROSTER_TIMEOUT':'ROSTER_UNAVAILABLE'});
  }
  return json(res,200,{ok:true,engine:'roster-vision',...validateResult(parseAIJson(out.text,{}),month)});
 }catch(error){return errorResponse(res,error)}
};
