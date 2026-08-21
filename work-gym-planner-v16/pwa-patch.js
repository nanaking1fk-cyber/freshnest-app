function setupPWA(){
 // iPhone-first install mode: do not require service-worker/manifest validation
 // for Add to Home Screen. Apple standalone meta tags + touch icon handle install.
 if('serviceWorker' in navigator){
   navigator.serviceWorker.getRegistrations().then(regs=>{
     for(const reg of regs){
       if(reg.scope.includes('/work-gym-planner/')) reg.unregister().catch(()=>{});
     }
   }).catch(()=>{});
 }
 const b=$('#reloadApp');
 if(b)b.onclick=()=>location.reload();
}
