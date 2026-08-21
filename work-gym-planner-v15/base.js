'use strict';
const VERSION='15.0.0', PREFIX='wgp-v15-', DAY=86400000;
const K={profile:PREFIX+'profile',bellevue:PREFIX+'bellevue-',history:PREFIX+'training-history',drafts:PREFIX+'training-drafts',overrides:PREFIX+'schedule-overrides',snapshots:PREFIX+'plan-snapshots',diary:PREFIX+'food-diary-',nutrition:PREFIX+'nutrition-settings',body:PREFIX+'body-log',foods:PREFIX+'my-foods',recent:PREFIX+'recent-foods',recipes:PREFIX+'recipes',water:PREFIX+'water-',migrated:PREFIX+'migrated'};
const $=q=>{if(!q)return null;return /^[#.[>:+~]/.test(q)||q.includes(' ')?document.querySelector(q):document.getElementById(q)}, $$=q=>[...document.querySelectorAll(q)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function dkey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function date(k){return new Date(k+'T12:00:00')}
function addDays(k,n){let d=date(k);d.setDate(d.getDate()+n);return dkey(d)}
function diffDays(a,b){return Math.round((date(a)-date(b))/DAY)}
function ymk(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function daysInMonth(ym){let [y,m]=ym.split('-').map(Number);return new Date(y,m,0).getDate()}
function monOf(k){let d=date(k),off=(d.getDay()+6)%7;d.setDate(d.getDate()-off);return dkey(d)}
function fmt(k,opt={weekday:'long',month:'long',day:'numeric',year:'numeric'}){return date(k).toLocaleDateString(undefined,opt)}
function uid(prefix='id'){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function jget(key,fallback){try{let x=JSON.parse(localStorage.getItem(key)||'null');return x??fallback}catch{return fallback}}
function jset(key,val){localStorage.setItem(key,JSON.stringify(val))}
function toast(msg,ms=1800){let old=document.querySelector('.flash');if(old)old.remove();let el=document.createElement('div');el.className='toast flash';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),ms)}

const FRANCIS_PATTERN=[1,1,0,1,1,1,1,0,1,1,1,1,0,0];
const FRANCIS_BEL={
 '2026-08':{1:'D',2:'D',3:'X',4:'X',5:'X',6:'X',7:'X',8:'D',9:'D',10:'X',11:'D',12:'X',13:'X',14:'X',15:'X',16:'X',17:'X',18:'D',19:'X',20:'X',21:'X',22:'D',23:'D',24:'X',25:'X',26:'D',27:'X',28:'X',29:'X',30:'X',31:'X'},
 '2026-09':{1:'X',2:'X',3:'X',4:'X',5:'D',6:'X',7:'H',8:'D',9:'X',10:'X',11:'X',12:'D',13:'D',14:'X',15:'X',16:'X',17:'X',18:'D',19:'X',20:'X',21:'X',22:'X',23:'D',24:'X',25:'X',26:'X',27:'D',28:'D',29:'X',30:'X'}
};
function francisProfile(){return {id:'francis',name:'Francis',sleepTarget:7.5,fixed:{enabled:true,name:'NYU',anchor:'2026-08-17',pattern:[...FRANCIS_PATTERN],start:'',end:'',commuteMin:30},variable:{enabled:true,name:'Bellevue',start:'',end:'',commuteMin:30},createdAt:new Date().toISOString()}}
function blankProfile(){return {id:uid('profile'),name:'',sleepTarget:7.5,fixed:{enabled:false,name:'Fixed job',anchor:dkey(),pattern:[1,1,1,1,1,0,0,1,1,1,1,1,0,0],start:'',end:'',commuteMin:30},variable:{enabled:false,name:'Variable job',start:'',end:'',commuteMin:30},createdAt:new Date().toISOString()}}
function profile(){return jget(K.profile,null)}
function saveProfileObj(p){jset(K.profile,p);freezePastSnapshots();renderAll()}
function seedFrancis(){let p=francisProfile();jset(K.profile,p);for(const [ym,map] of Object.entries(FRANCIS_BEL))if(!localStorage.getItem(K.bellevue+ym))jset(K.bellevue+ym,map);let n=nutrition();n={...n,gymCal:2300,restCal:2100,protein:180,goalWeight:180,goalBf:12};jset(K.nutrition,n);freezePastSnapshots();fillProfileForm();renderAll()}

function migrateLegacy(){if(localStorage.getItem(K.migrated))return;let found=false;
  if(!profile()){
    let hasLegacy=false;for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i)||'';if(k.startsWith('bellevue-')||k.startsWith('b-')||k.startsWith('food-diary-')||k==='training-history-v14'||k==='nutrition-settings'){hasLegacy=true;break}}
    if(hasLegacy){jset(K.profile,francisProfile());found=true}
  }
  for(let i=0;i<localStorage.length;i++){let key=localStorage.key(i);if(!key)continue;
    if(key.startsWith('bellevue-')||key.startsWith('b-')){let ym=key.slice(key.indexOf('-')+1);if(/^\d{4}-\d{2}$/.test(ym)&&!localStorage.getItem(K.bellevue+ym)){let m=jget(key,null);if(m){jset(K.bellevue+ym,m);found=true}}}
    if(key.startsWith('food-diary-')){let dk=key.slice(11);if(!localStorage.getItem(K.diary+dk)){let a=jget(key,[]).map(x=>legacyFood(x));jset(K.diary+dk,a);found=true}}
    if(key.startsWith('water-')){let dk=key.slice(6);if(!localStorage.getItem(K.water+dk)){localStorage.setItem(K.water+dk,localStorage.getItem(key)||'0');found=true}}
  }
  if(!localStorage.getItem(K.nutrition)&&localStorage.getItem('nutrition-settings')){let g=jget('nutrition-settings',{});jset(K.nutrition,{...nutritionDefaults(),gymCal:+g.gym||2300,restCal:+g.rest||2100,protein:+g.protein||180,fat:+g.fat||70,water:+g.water||96,goalWeight:+g.goalWeight||180,goalBf:+g.goalBf||12,planStart:g.start||dkey()});found=true}
  if(!localStorage.getItem(K.history)&&localStorage.getItem('training-history-v14')){let h=jget('training-history-v14',[]).filter(x=>x.completed).map(s=>({id:s.id||uid('legacy'),date:s.date,workoutIndex:+s.workoutIndex||0,completed:true,completedAt:s.completedAt||s.date+'T12:00:00',exercises:(s.exercises||[]).map(e=>({name:e.name,sets:(e.sets||[]).map(z=>({w:+z.w||0,r:+z.r||0,rir:z.rir===''?null:+z.rir}))})),legacy:true}));jset(K.history,h);found=true}
  const body={};for(let i=0;i<localStorage.length;i++){let key=localStorage.key(i);if(key?.startsWith('nutrition-log-')){let dk=key.slice(14),x=jget(key,{});if(x.weight||x.waist||x.bf)body[dk]={weight:+x.weight||null,waist:+x.waist||null,bf:+x.bf||null};}}
  if(Object.keys(body).length&&!localStorage.getItem(K.body)){jset(K.body,body);found=true}
  localStorage.setItem(K.migrated,found?'legacy-found':'checked');
}
function legacyFood(x){let g=100;return {id:x.id||uid('legacy-food'),name:x.name||'Food',meal:x.meal||'Snacks',grams:g,per100:{cal:+x.cal||0,p:+x.p||0,c:+x.c||0,f:+x.f||0,fiber:0,satFat:0,sodium:0},source:'Legacy import',note:x.serving||''}}
