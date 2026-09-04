'use strict';
const crypto=require('node:crypto');
const {boundedRequest,publicPolicy,failure}=require('./ai-policy-v56');
const subscriptions=require('./apple-subscriptions-v56');
const lib=()=>require('./v18-lib');
async function status(user){
  await subscriptions.refresh(user.id);
  const state=await subscriptions.account(user.id);
  return {...state,...publicPolicy(),purchaseAvailable:subscriptions.configured()};
}
async function run(user,feature,request,reservationId=crypto.randomUUID()){
  if(!user?.id)throw failure('Sign in to use AI.',401);
  if(!process.env.OPENAI_API_KEY)throw failure('AI is temporarily unavailable. This attempt does not count toward your allowance.',503);
  const bounded=boundedRequest(feature,request);
  await subscriptions.refresh(user.id);
  const state=await lib().serviceFetch('rpc/ai_allowance_v56',{method:'POST',body:{target_user_id:user.id,feature_name:feature,reservation_id:reservationId,global_request_limit:Math.max(1,Math.min(100,Number(process.env.AI_GLOBAL_DAILY_LIMIT)||100))}});
  if(!state?.allowed){
    if(state?.reason==='subscription')throw failure('AI Plus is required for AI scans and schedule reading. Manual entry and barcode lookup stay free.',402,'AI_SUBSCRIPTION_REQUIRED');
    if(state?.reason==='credits')throw failure(`Your monthly AI allowance has been used. It renews ${new Date(state.resetsAt).toLocaleDateString('en-US',{timeZone:'UTC'})}. Manual entry stays free.`,402,'AI_CREDITS_REQUIRED');
    if(state?.reason==='duplicate')throw failure('This request was already started. Please check its result before trying again.',409,'AI_DUPLICATE');
    throw failure('AI is at capacity today. Please try tomorrow. This attempt does not count toward your allowance.',429,'AI_CAPACITY');
  }
  const out=await lib().openAI(bounded);
  const {appAccountToken,...usage}=state;
  return {...out,usage};
}
module.exports={status,run};
