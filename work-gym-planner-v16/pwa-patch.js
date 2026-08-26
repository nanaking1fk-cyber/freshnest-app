function setupPWA(){
 if('serviceWorker' in navigator){
   navigator.serviceWorker.register('../work-gym-planner/sw.js?v=24.0.0',{scope:'../work-gym-planner/'}).then(reg=>reg.update()).catch(error=>console.warn('Offline support unavailable',error));
 }
 const b=$('#reloadApp');
 if(b)b.onclick=()=>location.reload();
}
