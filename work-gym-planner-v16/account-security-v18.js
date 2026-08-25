// v18 account migration privacy: sync planner/fitness data, never credentials.
window.WGC18=window.WGC18||{};
(function(A){
 function secureCapture(){
  let storage={},exclude=new Set([K.sync,'wgc-v18-auth','wgp-v18-auth-session','wgc-v18-api-base'].filter(Boolean));
  for(let i=0;i<localStorage.length;i++){
    let k=localStorage.key(i);if(!k||exclude.has(k)||k.startsWith('sb-'))continue;
    if(!(k.startsWith(PREFIX)||k.startsWith('wgc-v18-')||k.startsWith('wgp-v18-')))continue;
    if(/(?:password|passphrase|webdav|cloud-token|service.?role|api.?key|secret)/i.test(k))continue;
    storage[k]=localStorage.getItem(k);
  }
  return{schemaVersion:18,appVersion:APP_VERSION,capturedAt:new Date().toISOString(),storage};
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
   if(!quiet)toast(`Synced ${Object.keys(state.storage).length} planner records. Private cloud credentials stayed on this device.`);
   return true;
 };
 A.queueSync=function(){if(!A.session)return;clearTimeout(A._syncTimer);A._syncTimer=setTimeout(()=>A.pushState({quiet:true}).catch(()=>{}),1200)};
})(window.WGC18);
