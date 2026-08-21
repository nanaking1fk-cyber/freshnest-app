function setupPWA(){
 if(!('serviceWorker' in navigator))return;
 const path=location.pathname;
 const root=(path.match(/^(.*\/)(?:work-gym-planner(?:-v16)?\/)/)||[])[1]||'/';
 const folder=path.includes('/work-gym-planner-v16/')?'work-gym-planner-v16/':'work-gym-planner/';
 const scope=root+folder;
 const sw=scope+'sw.js';
 navigator.serviceWorker.register(sw,{scope}).then(reg=>{
   reg.addEventListener('updatefound',()=>{
     const nw=reg.installing;
     nw?.addEventListener('statechange',()=>{
       if(nw.state==='installed'&&navigator.serviceWorker.controller)$('#updateToast')?.classList.remove('hidden');
     });
   });
 }).catch(e=>recordDiagnostic?.('service-worker',e));
 navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
 const b=$('#reloadApp');
 if(b)b.onclick=async()=>{
   const reg=await navigator.serviceWorker.getRegistration(scope);
   reg?.waiting?.postMessage({type:'SKIP_WAITING'});
   location.reload();
 };
}
