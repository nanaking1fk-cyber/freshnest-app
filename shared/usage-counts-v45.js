/* Optional aggregate counts. Never read account, planner, device or referral data. */
(function(){
 'use strict';
 if(window.WWUsage)return;
 const KEY='ww-usage-counts-v45';
 const screens=Object.freeze({home:'home',calendar:'calendar',training:'training',diary:'nutrition',progress:'progress',more:'settings'});
 let counts={},sent=0,timer=null,lastScreen='',opened=false;
 function enabled(){try{return localStorage.getItem(KEY)==='yes'&&navigator.globalPrivacyControl!==true&&navigator.doNotTrack!=='1'}catch{return false}}
 function flush(){
  clearTimeout(timer);timer=null;
  const batch=counts;counts={};
  if(!enabled()||!Object.keys(batch).length)return;
  // No cookies, bearer token, referrer, URL, device details or event timestamps.
  // This independent request never goes through authenticated account helpers.
  const endpoint=window.WGPNative?'https://www.workandworkout.com/api/v18/usage-counts':'/api/v18/usage-counts';
  try{Promise.resolve(fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({counts:batch}),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true})).catch(()=>{})}catch{}
 }
 function count(name){
  if(!enabled()||sent>=200)return;
  sent++;counts[name]=(counts[name]||0)+1;
  if(Object.values(counts).reduce((a,b)=>a+b,0)>=20)flush();
  else if(!timer)timer=setTimeout(flush,10000);
 }
 function screen(id){
  if(!Object.hasOwn(screens,id)||!enabled()||lastScreen===id)return;
  lastScreen=id;count('screen_'+screens[id]);
 }
 function start(){
  if(!enabled())return;
  if(!opened){opened=true;count('app_open')}
  const id=document.querySelector('.page.active')?.id?.replace(/^page-/,'');
  if(!document.body.classList.contains('landingActive'))screen(id);
 }
 function setEnabled(value){
  try{localStorage.setItem(KEY,value?'yes':'no')}catch{return false}
  if(!enabled()){counts={};lastScreen='';clearTimeout(timer);timer=null}else start();
  return enabled();
 }
 function mount(){
  const more=document.querySelector('#page-more');
  if(!more||document.getElementById('usageCountsChoice'))return;
  const card=document.createElement('section');card.id='usageCountsChoice';card.className='card';
  card.innerHTML='<h3>Help improve the app</h3><p>Optional: count app opens and visits to the main screens. Only shared daily totals are kept—no personal details, health data, device details or browsing history.</p><label class="check"><input id="allowUsageCounts" type="checkbox"> Share anonymous usage counts</label><small id="usageCountsStatus" role="status"></small>';
  more.appendChild(card);
  const input=card.querySelector('input'),status=card.querySelector('small');input.checked=enabled();
  input.onchange=()=>{input.checked=setEnabled(input.checked);status.textContent=input.checked?'On. You can turn this off at any time.':'Off. No more usage counts will be sent.'};
 }
 function install(){
  mount();
  const original=window.page;
  if(typeof original==='function')window.page=function(id){const result=original.apply(this,arguments);screen(id);return result};
  start();
 }
 window.WWUsage=Object.freeze({screen,setEnabled,enabled});
 window.addEventListener('pagehide',flush);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
 window.addEventListener('storage',event=>{if(event.key===KEY){if(!enabled()){counts={};clearTimeout(timer);timer=null}const input=document.getElementById('allowUsageCounts');if(input)input.checked=enabled()}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
