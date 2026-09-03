function setupPWA(){
 if('serviceWorker' in navigator){
  navigator.serviceWorker.register('../work-gym-planner/sw.js?v=30.1.31-onboarding49',{scope:'../work-gym-planner/'}).then(reg=>reg.update()).catch(error=>console.warn('Offline support unavailable',error));
 }
 const b=$('#reloadApp');
 if(b)b.onclick=()=>location.reload();
}
