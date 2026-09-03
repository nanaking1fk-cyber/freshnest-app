// v18 account migration privacy: sync planner/fitness data, never credentials.
window.WGC18=window.WGC18||{};
(function(A){
 function secureCapture(){
  let storage={};
  for(let i=0;i<localStorage.length;i++){
    let k=localStorage.key(i);
    if(!window.WGC23Core?.isPlannerKey(k,PREFIX))continue;
    storage[k]=localStorage.getItem(k);
  }
  return window.WGC23Core?.sanitizePlannerState({appVersion:APP_VERSION,capturedAt:new Date().toISOString(),storage},{prefix:PREFIX,appVersion:APP_VERSION})||{schemaVersion:23,appVersion:APP_VERSION,capturedAt:new Date().toISOString(),storage};
 }
 A.captureLocalState=secureCapture;
 // Override the account module's generic exporter so every migration path uses
 // the same privacy filter before sending state through the authenticated API.
 window.exportState18=secureCapture;
 let pendingPush=null;
 A.waitForPendingSync=()=>pendingPush?.catch(()=>{});
 A.pushState=function(options={}){
   if(pendingPush)return pendingPush;
   pendingPush=pushState(options).finally(()=>{pendingPush=null});
   return pendingPush;
 };
 async function pushState({quiet=false}={}){
   if(!A.session||A.deletingAccount)return false;
   const uid=A.session.user.id;
   if(!A.cloudStateReady){if(quiet)return false;await A.resumeAccount?.();if(!A.cloudStateReady)return false}
   A.assertCloudReady();
   if(typeof A.ensureHealthConsent!=='function'||!await A.ensureHealthConsent({interactive:!quiet,purpose:'account_cloud_sync'}))return false;
   if(A.session?.user?.id!==uid)return false;
   A.assertCloudReady();
   let state=secureCapture();
   let result;
   try{result=await A.authedFetch('state',{method:'PUT',body:JSON.stringify({state,baseUpdatedAt:A.cloudRevision})})}catch(error){if(A.session?.user?.id===uid&&(error.code==='STATE_CONFLICT'||error.code==='STATE_BASE_REQUIRED'))A.pauseCloudSync?.();throw error}
   if(A.session?.user?.id!==uid)return false;
   A.acceptCloudRevision(result.updatedAt,uid);
   localStorage.setItem('wgc-v18-last-sync',result.updatedAt||new Date().toISOString());
   if(!quiet)toast(`Synced ${Object.keys(state.storage).length} planner records. Account credentials never leave this device state.`);
   return true;
 };
 A.queueSync=function(){if(!A.session)return;clearTimeout(A._syncTimer);A._syncTimer=setTimeout(()=>A.pushState({quiet:true}).catch(()=>{}),1200)};
})(window.WGC18);
