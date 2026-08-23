// v17: allow any repeating cycle length from 7 through 28 days.
const _fillProfileCycle17=fillProfileForm;
fillProfileForm=function(){
  _fillProfileCycle17();
  let rl=$('#rotationLength');if(rl){let current=profile()?.fixed?.pattern?.length||7;rl.innerHTML=Array.from({length:22},(_,i)=>{let n=i+7;return `<option value="${n}">${n} days</option>`}).join('');rl.value=String(clamp(current,7,28))}
};
function installCycleOptions17(){let rl=$('#rotationLength');if(!rl)return;let current=profile()?.fixed?.pattern?.length||7;rl.innerHTML=Array.from({length:22},(_,i)=>{let n=i+7;return `<option value="${n}">${n} days</option>`}).join('');rl.value=String(clamp(current,7,28));rl.onchange=e=>resizeRotation(e.target.value)}
installCycleOptions17();
document.addEventListener('DOMContentLoaded',()=>setTimeout(installCycleOptions17,0));
