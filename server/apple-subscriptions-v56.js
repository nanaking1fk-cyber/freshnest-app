'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {PRODUCT_ID,BUNDLE_ID,failure}=require('./ai-policy-v56');
const lib=()=>require('./v18-lib');
const safeError=()=>failure('Apple purchase verification is unavailable. Your purchase is safe; try Restore Purchases shortly.',503,'APPLE_UNAVAILABLE');
function configured(){return process.env.APPLE_IAP_ENABLED==='true'&&['APPLE_ISSUER_ID','APPLE_KEY_ID','APPLE_PRIVATE_KEY'].every(key=>!!process.env[key])&&Number.isSafeInteger(Number(process.env.APPLE_APP_ID))&&Number(process.env.APPLE_APP_ID)>0}
function sandboxUsers(){return new Set(String(process.env.APPLE_SANDBOX_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean))}
function apple(environment){
  if(!configured())throw safeError();
  const {AppStoreServerAPIClient,SignedDataVerifier}=require('@apple/app-store-server-library');
  const roots=['AppleRootCA-G3.cer','AppleRootCA-G2.cer'].map(file=>fs.readFileSync(path.join(__dirname,'apple-certs',file)));
  return {
    verifier:new SignedDataVerifier(roots,true,environment,BUNDLE_ID,Number(process.env.APPLE_APP_ID)),
    client:new AppStoreServerAPIClient(process.env.APPLE_PRIVATE_KEY.replace(/\\n/g,'\n'),process.env.APPLE_KEY_ID,process.env.APPLE_ISSUER_ID,BUNDLE_ID,environment)
  };
}
async function decode(signed,kind,userId){
  if(typeof signed!=='string'||signed.length<100||signed.length>30000)throw failure('The Apple purchase could not be verified.',400,'APPLE_INVALID');
  if(!configured())throw safeError();
  const environments=['Production'];
  if(userId?sandboxUsers().has(userId):sandboxUsers().size>0)environments.push('Sandbox');
  for(const environment of environments){
    try{
      const service=apple(environment);
      const value=await service.verifier[kind==='notification'?'verifyAndDecodeNotification':'verifyAndDecodeTransaction'](signed);
      return {value,environment,service};
    }catch{/* Never log signed purchase data or Apple's verbose payload errors. */}
  }
  throw failure('The Apple purchase could not be verified. Try Restore Purchases.',400,'APPLE_INVALID');
}
function validateTransaction(transaction,token,environment,originalId){
  const t=transaction,now=Date.now();
  if(t.bundleId!==BUNDLE_ID||t.productId!==PRODUCT_ID||t.environment!==environment||t.type!=='Auto-Renewable Subscription'||t.inAppOwnershipType!=='PURCHASED'||t.quantity!==1||
     String(t.appAccountToken||'').toLowerCase()!==String(token||'').toLowerCase()||!token||
     !/^\d{1,40}$/.test(t.originalTransactionId||'')||!/^\d{1,40}$/.test(t.transactionId||'')||originalId&&t.originalTransactionId!==originalId||
     ![t.purchaseDate,t.expiresDate,t.signedDate].every(Number.isSafeInteger)||t.purchaseDate>now+60000||t.signedDate>now+60000||t.expiresDate<=t.purchaseDate)
    throw failure('This purchase does not match this Work + Workout account.',409,'APPLE_ACCOUNT_MISMATCH');
  return t;
}
async function currentTransaction(service,environment,originalId,token){
  let response;
  try{response=await service.client.getAllSubscriptionStatuses(originalId)}catch{throw safeError()}
  if(response.bundleId!==BUNDLE_ID||response.environment!==environment)throw safeError();
  const transactions=[];
  for(const group of response.data||[]){
    for(const item of group.lastTransactions||[]){
      if(item.originalTransactionId!==originalId)continue;
      let t;try{t=await service.verifier.verifyAndDecodeTransaction(item.signedTransactionInfo)}catch{throw safeError()}
      validateTransaction(t,token,environment,originalId);
      transactions.push({transaction:t,status:item.status});
    }
  }
  transactions.sort((a,b)=>b.transaction.purchaseDate-a.transaction.purchaseDate||b.transaction.signedDate-a.transaction.signedDate);
  if(!transactions.length)throw safeError();
  return transactions[0];
}
async function save(userId,token,environment,current){
  const t=current.transaction;
  const active=[1,4].includes(current.status)&&!t.revocationDate&&!t.isUpgraded&&t.expiresDate>Date.now();
  await lib().serviceFetch('rpc/record_apple_ai_subscription_v56',{method:'POST',body:{
    target_user_id:userId,account_token:token,store_environment:environment,original_id:t.originalTransactionId,current_id:t.transactionId,
    purchase_time:new Date(t.purchaseDate).toISOString(),expiry_time:new Date(t.expiresDate).toISOString(),signature_time:new Date(t.signedDate).toISOString(),is_active:active
  }});
  return {active,transactionId:t.transactionId};
}
async function account(userId){
  const result=await lib().serviceFetch('rpc/ai_allowance_v56',{method:'POST',body:{target_user_id:userId}});
  return Array.isArray(result)?result[0]:result;
}
async function verifyPurchase(userId,signed){
  const state=await account(userId);
  const {value,environment,service}=await decode(signed,'transaction',userId);
  validateTransaction(value,state.appAccountToken,environment);
  const latest=await currentTransaction(service,environment,value.originalTransactionId,state.appAccountToken);
  await save(userId,state.appAccountToken,environment,latest);
  // A restored old transaction may correspond to a newer renewal. Finishing
  // the submitted transaction is safe only AFTER current access is persisted.
  return {transactionId:value.transactionId,active:[1,4].includes(latest.status)&&!latest.transaction.revocationDate&&latest.transaction.expiresDate>Date.now()};
}
async function refresh(userId){
  const rows=await lib().serviceFetch(`apple_ai_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=environment,original_transaction_id,expires_at,verified_at&order=expires_at.desc&limit=4`);
  if(!rows?.length)return;
  const state=await account(userId);
  for(const row of rows){
    if(row.environment==='Sandbox'&&!sandboxUsers().has(userId)){
      await lib().serviceFetch(`apple_ai_subscriptions?user_id=eq.${encodeURIComponent(userId)}&environment=eq.Sandbox`,{method:'PATCH',body:{active:false}});continue;
    }
    if(Date.parse(row.expires_at)>Date.now()&&Date.parse(row.verified_at)>Date.now()-120000)continue;
    const service=apple(row.environment);
    const latest=await currentTransaction(service,row.environment,row.original_transaction_id,state.appAccountToken);
    await save(userId,state.appAccountToken,row.environment,latest);
  }
}
async function notification(signed){
  const {value,environment,service}=await decode(signed,'notification');
  if(value.notificationType==='TEST')return;
  if(!value.data?.signedTransactionInfo)return;
  let transaction;try{transaction=await service.verifier.verifyAndDecodeTransaction(value.data.signedTransactionInfo)}catch{throw safeError()}
  const token=String(transaction.appAccountToken||'');
  if(!/^[0-9a-f-]{36}$/i.test(token))throw failure('Purchase account is missing.',400,'APPLE_INVALID');
  const rows=await lib().serviceFetch(`ai_billing_accounts?app_account_token=eq.${encodeURIComponent(token)}&select=user_id&limit=1`);
  const userId=rows?.[0]?.user_id;
  if(!userId)return; // Deleted accounts remain deleted; never recreate one.
  if(environment==='Sandbox'&&!sandboxUsers().has(userId))return;
  validateTransaction(transaction,token,environment);
  // Query current Apple status even for old/duplicate notifications. An old
  // renewal notification cannot resurrect a refunded or expired purchase.
  const latest=await currentTransaction(service,environment,transaction.originalTransactionId,token);
  await save(userId,token,environment,latest);
}
module.exports={configured,account,refresh,verifyPurchase,notification,validateTransaction,currentTransaction};
