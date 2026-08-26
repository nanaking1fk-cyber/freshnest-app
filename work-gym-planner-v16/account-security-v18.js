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
 A.pushState=async function({quiet=false}={}){
   if(!A.session)return false;
   let state=secureCapture();
   let result=await A.authedFetch('state',{method:'PUT',body:JSON.stringify({state})});
   localStorage.setItem('wgc-v18-last-sync',result.updatedAt||new Date().toISOString());
   if(!quiet)toast(`Synced ${Object.keys(state.storage).length} planner records. Account credentials never leave this device state.`);
   return true;
 };
 A.queueSync=function(){if(!A.session)return;clearTimeout(A._syncTimer);A._syncTimer=setTimeout(()=>A.pushState({quiet:true}).catch(()=>{}),1200)};
})(window.WGC18);
