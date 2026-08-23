// v17.0 commercial/general-user layer ---------------------------------------
APP_VERSION='17.0.0';
const COMMERCIAL_PREF_KEY=PREFIX+'commercial-preferences-v17';

function genericProfileTemplate(){return{
  id:uid('profile'),name:'',sleepTarget:7.5,heightIn:null,
  trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',
  fixed:{enabled:true,name:'Primary job',anchor:dkey(),pattern:[1,1,1,1,1,0,0],start:'',end:'',commuteMin:20},
  variable:{enabled:false,name:'Secondary / variable job',start:'',end:'',commuteMin:20},createdAt:new Date().toISOString()
}}
blankProfile=genericProfileTemplate;

// Any repeating work cycle from 1–28 days, instead of hard-coding 14 days.
fixedWork=function(k){let p=profile();if(!p?.fixed?.enabled)return false;let pat=Array.isArray(p.fixed.pattern)&&p.fixed.pattern.length?p.fixed.pattern:[0],n=diffDays(k,p.fixed.anchor),i=((n%pat.length)+pat.length)%pat.length;return !!pat[i]};

const _suggestedTrainingDatesCommercial=suggestedTrainingDates;
suggestedTrainingDates=function(start,end){
 if(!profile())return[];let p=profile(),target=clamp(+p.trainingDaysPerWeek||(p.id==='francis'?3:3),2,4),o=overrides(),selected=[],firstMon=monOf(start),last=end;
 for(let wk=firstMon;wk<=last;wk=addDays(wk,7)){
   let candidates=[];for(let i=0;i<7;i++){let k=addDays(wk,i);if(k<start||k>end)continue;if(o[k]?.action==='skip')continue;let sc=recoveryScore(k);if(Number.isFinite(sc))candidates.push({k,sc})}
   candidates.sort((a,b)=>b.sc-a.sc||a.k.localeCompare(b.k));let picked=[];
   for(const c of candidates){if(picked.length>=target)break;if([...selected,...picked].every(x=>Math.abs(diffDays(c.k,x))>1))picked.push(c.k)}
   // If the user chose 4 days and spacing makes 4 impossible, allow one adjacent
   // upper/lower rotation opportunity rather than silently dropping a session.
   if(picked.length<target){for(const c of candidates){if(picked.length>=target)break;if(picked.includes(c.k))continue;let all=[...selected,...picked];let adjacent=all.filter(x=>Math.abs(diffDays(c.k,x))===1);if(adjacent.length<=1)picked.push(c.k)}}
   selected.push(...picked);selected.sort();
 }
 for(const [k,v] of Object.entries(o))if(v.action==='train'&&k>=start&&k<=end&&!selected.includes(k))selected.push(k);
 return [...new Set(selected)].sort();
};

const _singleJobWorkoutAvailableCommercial=singleJobWorkoutAvailable;
singleJobWorkoutAvailable=function(k){let p=profile();return (p?.singleJobTraining!==false)&&!!p&&workState(k).kind==='one'&&!completedOn(k)};

function ensureCommercialProfileUI(){
 let intro=$('#onboardingIntro');if(intro){let b=intro.querySelector('b'),p=intro.querySelector('p');if(b)b.textContent='Set up Work + Gym Coach for your own schedule, training and body goals.';if(p)p.textContent='Your plan adapts to your work cycle, recovery, completed workouts and nutrition. Data stays on this device unless you choose to export or sync it.';let francis=$('#useFrancis');if(francis){francis.style.display='none';francis.setAttribute('aria-hidden','true')}let custom=$('#useCustom');if(custom)custom.textContent='Start my setup';if(!$('#commercialTemplates')){let box=document.createElement('div');box.id='commercialTemplates';box.className='commercialTemplates';box.innerHTML='<button type="button" data-commercial-template="standard"><b>Standard work week</b><small>Mon–Fri style schedule</small></button><button type="button" data-commercial-template="rotating"><b>Rotating / shift work</b><small>Build a repeating 7–28 day cycle</small></button><button type="button" data-commercial-template="variable"><b>Variable monthly schedule</b><small>Enter or scan each month</small></button><button type="button" data-commercial-template="none"><b>No work schedule</b><small>Plan training from recovery only</small></button>';intro.appendChild(box)}}
 let reset=$('#resetFrancis');if(reset){reset.style.display='none';reset.setAttribute('aria-hidden','true')}
 let title=$('#profileTitle');if(title)title.textContent='Profile, work & training setup';
 let rot=$('#rotationGrid');if(rot&&!$('#rotationLength')){let h=rot.previousElementSibling;let wrap=document.createElement('div');wrap.className='commercialSetupGrid';wrap.innerHTML='<label>Repeating cycle length<select id="rotationLength"><option value="7">7 days</option><option value="8">8 days</option><option value="10">10 days</option><option value="14">14 days</option><option value="21">21 days</option><option value="28">28 days</option></select></label><label>Planned lifting days / week<select id="trainingDaysPerWeek"><option value="2">2 days</option><option value="3">3 days</option><option value="4">4 days</option></select></label><label>Offer workouts on single-job days<select id="singleJobTraining"><option value="yes">Yes</option><option value="no">No</option></select></label><label>Equipment access<select id="equipmentMode"><option value="full">Full commercial gym</option><option value="basic">Basic gym</option><option value="home">Home / minimal equipment</option></select></label>';if(h)h.insertAdjacentElement('afterend',wrap);else rot.insertAdjacentElement('beforebegin',wrap)}
 let fixedName=$('#fixedJobName')?.closest('label');if(fixedName)fixedName.firstChild.textContent='Primary / repeating job name';let varName=$('#variableJobName')?.closest('label');if(varName)varName.firstChild.textContent='Secondary / variable job name';
 let note=rot?.previousElementSibling;if(note?.classList?.contains('muted'))note.textContent='Tap each cycle day to switch Work ↔ Off. Day 1 is the anchor date. Your cycle can be 7–28 days.';
}
function setCommercialTemplate(kind){
 let set=(id,v)=>{let el=$('#'+id);if(el)el.value=v};let today=dkey();set('fixedAnchor',today);set('sleepTarget','7.5');set('trainingDaysPerWeek','3');set('singleJobTraining','yes');set('equipmentMode','full');
 if(kind==='standard'){set('fixedEnabled','yes');set('variableEnabled','no');set('fixedJobName','Work');set('variableJobName','Secondary / variable job');set('rotationLength','7');renderRotation([1,1,1,1,1,0,0])}
 if(kind==='rotating'){set('fixedEnabled','yes');set('variableEnabled','no');set('fixedJobName','Primary job');set('rotationLength','14');renderRotation([1,1,1,1,0,0,0,1,1,1,1,0,0,0])}
 if(kind==='variable'){set('fixedEnabled','no');set('variableEnabled','yes');set('fixedJobName','Primary job');set('variableJobName','Variable job');set('rotationLength','7');renderRotation([0,0,0,0,0,0,0])}
 if(kind==='none'){set('fixedEnabled','no');set('variableEnabled','no');set('fixedJobName','Work');set('variableJobName','Variable job');set('rotationLength','7');renderRotation([0,0,0,0,0,0,0])}
 $('#profileName')?.focus();
}
function resizeRotation(len){len=clamp(+len||7,1,28);let cur=$$('[data-rot]').map(b=>+b.dataset.v),pat=Array.from({length:len},(_,i)=>cur[i]??0);renderRotation(pat)}

const _fillProfileFormCommercial=fillProfileForm;
fillProfileForm=function(){_fillProfileFormCommercial();ensureCommercialProfileUI();let p=profile()||genericProfileTemplate(),len=p.fixed?.pattern?.length||7;if($('#rotationLength')){$('#rotationLength').value=[7,8,10,14,21,28].includes(len)?String(len):'14'}if($('#trainingDaysPerWeek'))$('#trainingDaysPerWeek').value=String(clamp(+p.trainingDaysPerWeek||3,2,4));if($('#singleJobTraining'))$('#singleJobTraining').value=p.singleJobTraining===false?'no':'yes';if($('#equipmentMode'))$('#equipmentMode').value=p.equipmentMode||'full'};
const _saveProfileFormCommercial=saveProfileForm;
saveProfileForm=function(){let days=+$('#trainingDaysPerWeek')?.value||3,single=$('#singleJobTraining')?.value!=='no',equipment=$('#equipmentMode')?.value||'full';_saveProfileFormCommercial();let p=profile();if(p){p.trainingDaysPerWeek=clamp(days,2,4);p.singleJobTraining=single;p.equipmentMode=equipment;p.productProfileVersion=17;jset(K.profile,p);renderAll()}};

// Filter equipment alternatives only when a user explicitly chooses a limited setup.
const _exerciseOptionsCommercial=exerciseOptions;
function commercialEquipmentAllowed(name,mode){if(mode==='full')return true;let e=String(equipmentFor(name)||'').toLowerCase();if(mode==='basic')return !/(hack|belt-squat|pec-deck|high-row|leg-extension|leg-curl|calf machine|chest-press machine|shoulder-press machine|lateral-raise machine|curl machine|ab machine)/.test(e);if(mode==='home')return /(dumbbell|bodyweight|band|weight plate|stability ball|pull-up bar)/.test(e);return true}
exerciseOptions=function(base){let all=_exerciseOptionsCommercial(base),mode=profile()?.equipmentMode||'full',filtered=all.filter((n,i)=>i===0||commercialEquipmentAllowed(n,mode));return filtered.length>=2?filtered:all};

function addCommercialProductUI(){
 let more=$('#page-more .menuCards');if(more&&!$('#commercialPrivacy')){let p=document.createElement('button');p.id='commercialPrivacy';p.innerHTML='<span>🔒</span><div><b>Privacy & terms</b><small>How your schedule, health and training data are handled</small></div><i>›</i>';p.onclick=()=>location.href='./privacy.html';more.appendChild(p)}
 let top=$('.topbar h1');if(top)top.textContent='Work + Gym Coach';document.title='Work + Gym Coach';
}
function migrateCommercialProfile(){let p=profile();if(!p)return;if(!p.trainingDaysPerWeek)p.trainingDaysPerWeek=p.id==='francis'?3:3;if(p.singleJobTraining==null)p.singleJobTraining=true;if(!p.equipmentMode)p.equipmentMode='full';if(!p.productProfileVersion)p.productProfileVersion=17;jset(K.profile,p)}

function setupCommercialV17(){ensureCommercialProfileUI();migrateCommercialProfile();addCommercialProductUI();$$('[data-commercial-template]').forEach(b=>b.onclick=()=>setCommercialTemplate(b.dataset.commercialTemplate));let rl=$('#rotationLength');if(rl)rl.onchange=e=>resizeRotation(e.target.value);let custom=$('#useCustom');if(custom)custom.onclick=()=>{let p=genericProfileTemplate();jset(K.profile,p);fillProfileForm()}}
setupCommercialV17();
document.addEventListener('DOMContentLoaded',()=>setTimeout(setupCommercialV17,0));
(function(){let st=document.createElement('style');st.textContent=`.commercialTemplates{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.commercialTemplates button{padding:10px;border:1px solid var(--line);border-radius:11px;background:var(--card);color:var(--text);text-align:left}.commercialTemplates b,.commercialTemplates small{display:block}.commercialTemplates b{font-size:10px}.commercialTemplates small{font-size:8px;color:var(--muted);margin-top:3px}.commercialSetupGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.commercialSetupGrid label{font-size:9px;color:var(--muted)}.commercialSetupGrid select{width:100%;margin-top:4px}@media(max-width:480px){.commercialTemplates,.commercialSetupGrid{grid-template-columns:1fr}}`;document.head.appendChild(st)})();
