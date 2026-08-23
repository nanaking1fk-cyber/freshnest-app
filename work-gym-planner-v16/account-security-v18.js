// v18 account migration privacy: sync fitness/planner data, never old cloud credentials.
window.WGC18=window.WGC18||{};
(function(A){
 function secureCapture(){let storage={},exclude=new Set([K.sync].filter(Boolean));for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(!k||!k.startsWith(PREFIX)||exclude.has(k))continue;if(/(?:password|passphrase|webdav|cloud-token|secret)/i.test(k))continue;storage[k]=localStorage.getItem(k)}return{schemaVersion:18,appVersion:APP_VERSION,capturedAt:new Date().toISOString(),storage}}
 A.captureLocalState=secureCapture;
 A.pushState=async function({quiet=false}={}){if(!A.session)return false;let state=secureCapture(),j=await A.authedFetch('state',{method:'PUT',body:JSON.stringify({state})});localStorage.setItem('wgc-v18-last-sync',j.updatedAt||new Date().toISOString());if(!quiet){let s=$('#accountStatus');if(s)s.textContent=`Synced ${Object.keys(state.storage).length} planner records to your account. Private WebDAV credentials stayed on this device.`;toast('Account sync complete')}return true};
})(window.WGC18);
