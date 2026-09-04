'use strict';

// Reviewed against standard (not cached/batch) API pricing, 2026-09-03.
// A credit reserves at most $0.006 of provider spend. Only these models and
// bounded requests may use this allowance; changing a model needs a cost review.
const FREE_CREDITS=10, PLUS_CREDITS=100, CREDIT_MICROS=6000;
const PRODUCT_ID='com.bibiniifarms.workandworkout.ai.plus.monthly';
const BUNDLE_ID='com.bibiniifarms.workandworkout';
const FEATURES=Object.freeze({
  coach: Object.freeze({label:'Coach question',credits:1,model:'gpt-5.6-luna',inputBytes:16000,output:1200,detail:'high',image:false}),
  equipment: Object.freeze({label:'Equipment photo',credits:10,model:'gpt-5.6-terra',inputBytes:8000,output:1800,detail:'high',image:true}),
  meal: Object.freeze({label:'Meal photo',credits:10,model:'gpt-5.6-terra',inputBytes:8000,output:2200,detail:'high',image:true}),
  roster: Object.freeze({label:'Roster photo',credits:20,model:'gpt-5.6-terra',inputBytes:7000,output:6000,detail:'original',image:true}),
  schedule: Object.freeze({label:'AI schedule reading',credits:20,model:'gpt-5.6-terra',inputBytes:26000,output:4000,detail:'high',image:false}),
  plan: Object.freeze({label:'AI plan refinement',credits:20,model:'gpt-5.6-terra',inputBytes:22000,output:1800,detail:'high',image:false})
});
function failure(message,status=400,code='AI_INPUT_INVALID'){return Object.assign(new Error(message),{status,code})}
function boundedRequest(feature,request){
  const policy=FEATURES[feature];
  if(!policy)throw failure('This AI feature is unavailable.',503);
  const bytes=Buffer.byteLength(String(request.instructions||''))+Buffer.byteLength(String(request.text||''))+Buffer.byteLength(JSON.stringify(request.textFormat||{}));
  if(bytes>policy.inputBytes)throw failure('There is too much detail for one AI request. Try a shorter question or a smaller date range.',413);
  if(!!request.imageDataUrl!==policy.image)throw failure('Choose the matching AI tool for this request.');
  if(policy.image){
    const match=/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(request.imageDataUrl);
    if(!match||request.imageDataUrl.length>8_000_000)throw failure('Choose a smaller JPG, PNG or WebP photo.',413);
    let size;
    try{size=require('./image-dimensions-v56').imageDimensions(Buffer.from(match[2],'base64'),match[1].toLowerCase())}catch{throw failure('This photo could not be opened. Try a screenshot instead.')}
    if(!size.width||!size.height||!['jpg','png','webp'].includes(size.type))throw failure('This photo format is not supported.');
    // Original detail preserves small roster text. Cap patch count rather than
    // silently shrinking a dense roster and misreading somebody's shifts.
    if(policy.detail==='original'&&Math.ceil(size.width/32)*Math.ceil(size.height/32)>8192)throw failure('Highlight a smaller roster section. Try one week at a time.',413);
  }
  return {...request,model:policy.model,maxOutputTokens:policy.output,imageDetail:policy.detail,timeoutMs:Math.min(request.timeoutMs||48000,48000)};
}
function publicPolicy(){return {freeCredits:FREE_CREDITS,plusCredits:PLUS_CREDITS,productId:PRODUCT_ID,features:Object.fromEntries(Object.entries(FEATURES).map(([key,value])=>[key,{label:value.label,credits:value.credits,subscriptionRequired:key!=='coach'}]))}}
module.exports={FREE_CREDITS,PLUS_CREDITS,CREDIT_MICROS,PRODUCT_ID,BUNDLE_ID,FEATURES,boundedRequest,publicPolicy,failure};
