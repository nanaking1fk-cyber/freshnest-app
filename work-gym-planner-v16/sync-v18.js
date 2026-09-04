// v18 lightweight account autosync. Keeps local-first writes responsive.
window.WGC18=window.WGC18||{};
(function(A){
 let timer=null,pushing=false,dirty=false,lastPush=0,generation=0,failures=0,nextAttempt=0,blocked=null,sessionOwner=A.session?.user?.id||null;
 const MAX_BACKOFF=15*60*1000;
 function schedule(delay){clearTimeout(timer);timer=setTimeout(push,Math.max(0,delay))}
 function terminal(error){
  if(error?.code==='HEALTH_CONSENT_REQUIRED'||error?.status===428)return'consent';
  if(error?.status===401||error?.status===403)return'account';
  if(error?.code==='STATE_CONFLICT'||error?.status===409)return'conflict';
  return null
 }
 async function push(){
  if(pushing||!dirty||blocked||window.navigator?.onLine===false||!A.session||!A.cloudStateReady||typeof A.pushState!=='function')return;
  if(Date.now()<nextAttempt){schedule(nextAttempt-Date.now());return}
  pushing=true;const sending=generation;
  try{
   let sent=await A.pushState({quiet:true});
   if(sent!==false){dirty=generation!==sending;lastPush=Date.now();failures=0;nextAttempt=0}
  }catch(error){
   blocked=terminal(error);
   if(blocked){clearTimeout(timer);if(blocked==='conflict')A.pauseCloudSync?.()}
   else{
    failures++;const delay=Math.min(MAX_BACKOFF,15000*Math.pow(2,Math.min(failures-1,6)));nextAttempt=Date.now()+delay;schedule(delay)
   }
   console.warn(blocked?'Account autosync paused:':'Account autosync deferred:',error.message)
  }finally{pushing=false}
 }
 A.queueSync=function(){if(!A.session)return;dirty=true;generation++;if(blocked)return;const delay=Math.max(2500,nextAttempt-Date.now());schedule(delay)};
 const oldSet=window.jset;
 if(typeof oldSet==='function'&&!oldSet.__sync18){let wrapped=function(key,val){let r=oldSet(key,val);if(A.session)A.queueSync();return r};wrapped.__sync18=true;window.jset=wrapped}
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty&&!blocked&&Date.now()>=nextAttempt)push()});
 window.addEventListener('online',()=>{if(dirty&&!blocked&&Date.now()>=nextAttempt)push()});
 window.addEventListener('wgc:health-consent-change',event=>{if(blocked==='consent'&&event.detail?.activePurposes?.includes('account_cloud_sync')){blocked=null;failures=0;nextAttempt=0;schedule(0)}});
 window.addEventListener('wgc:authchange',()=>{const uid=A.session?.user?.id||null;if(uid===sessionOwner)return;sessionOwner=uid;blocked=null;failures=0;nextAttempt=0;if(uid&&dirty)schedule(0)});
 setInterval(()=>{if(dirty&&!blocked&&Date.now()-lastPush>30000&&Date.now()>=nextAttempt)push()},30000);
})(window.WGC18);
