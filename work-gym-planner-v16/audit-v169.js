// v16.9 stabilization: system audit, body stats, workday workout options.
APP_VERSION='16.9.0';

if(typeof EXERCISE_ALTERNATIVES==='object'&&typeof MUSCLE_MAP==='object'){
  for(const [base,alts] of Object.entries(EXERCISE_ALTERNATIVES)){
    const groups=MUSCLE_MAP[base];
    if(groups) for(const alt of alts) if(!MUSCLE_MAP[alt]) MUSCLE_MAP[alt]=[...groups];
  }
}
weeklyMuscleSets=function(end=dkey(),days=7){
  let start=addDays(end,-days+1),out={};
  for(const s of workoutHistory().filter(x=>x.completed&&x.date>=start&&x.date<=end)){
    for(const e of s.exercises||[]){
      let groups=MUSCLE_MAP[e.name]||MUSCLE_MAP[e.baseName]||['other'];
      let hard=(e.sets||[]).filter(z=>+z.r>0&&(z.rir===''||z.rir==null||+z.rir<=3)).length;
      for(const g of groups) out[g]=(out[g]||0)+hard;
    }
  }
  return out;
};

function singleJobWorkoutAvailable(k){return !!profile()&&workState(k).kind==='one'&&!completedOn(k)}
function singleJobWorkoutIndex(k){return dueWorkoutIndex(k)}
function singleJobWorkoutName(k){return WORKOUTS[singleJobWorkoutIndex(k)]?.name||'Workout'}

const _trainingDatesAround169=trainingDatesAround;
trainingDatesAround=function(){
  let today=dkey(),start=addDays(today,-90),end=addDays(today,120),base=_trainingDatesAround169(),single=[];
  for(let k=start;k<=end;k=addDays(k,1)) if(singleJobWorkoutAvailable(k)) single.push(k);
  return [...new Set([...base,...single])].sort();
};
const _initialTrainingDate169=initialTrainingDate;
initialTrainingDate=function(){let k=dkey();return singleJobWorkoutAvailable(k)?k:_initialTrainingDate169()};
const _todayTrainingInfo169=todayTrainingInfo;
todayTrainingInfo=function(k){
  let base=_todayTrainingInfo169(k);
  if(!completedOn(k)&&!isScheduled(k)&&singleJobWorkoutAvailable(k)){
    let wi=singleJobWorkoutIndex(k);return{title:WORKOUTS[wi].name,sub:'Fits around today’s shift · optional',date:k,wi,optional:true};
  }
  return base;
};
const _renderCalendar169=renderCalendar;
renderCalendar=function(){
  _renderCalendar169();
  $$('.calDay[data-date]').forEach(el=>{
    let k=el.dataset.date;
    if(singleJobWorkoutAvailable(k)&&!isScheduled(k)){
      el.classList.add('singleJobWorkout');
      let dots=el.querySelector('.dayDots');
      if(dots&&!dots.querySelector('.singleJobDot')) dots.insertAdjacentHTML('beforeend','<i class="dot blue singleJobDot" title="Optional workout"></i>');
      let old=el.getAttribute('aria-label')||'';
      if(!old.includes('Optional workout')) el.setAttribute('aria-label',old+` Optional workout: ${singleJobWorkoutName(k)}.`);
    }
  });
};
const _renderDayCard169=renderDayCard;
renderDayCard=function(){
  _renderDayCard169();let k=selectedDate;
  if(singleJobWorkoutAvailable(k)&&!isScheduled(k)){
    let card=$('#dayCard'),name=singleJobWorkoutName(k);
    if(card&&!card.querySelector('.singleJobOffer')){
      let box=document.createElement('div');box.className='singleJobOffer';
      box.innerHTML=`<b>Optional workout: ${esc(name)}</b><span>This session can fit around today’s work schedule. Start it if it works for you, or leave the day open.</span>`;
      let action=card.querySelector('[data-traintoday]');if(action)card.insertBefore(box,action);else card.appendChild(box);
    }
  }
};
const _renderTraining169=renderTraining;
renderTraining=function(){_renderTraining169();if(singleJobWorkoutAvailable(trainingDate)&&!isScheduled(trainingDate)){let s=$('#trainingRoot .trainNav small');if(s)s.textContent='OPTIONAL · WORKDAY SESSION'}};

function ensureBodyStatsUI(){
  let nameLabel=$('#profileName')?.closest('label');
  if(nameLabel&&!$('#profileHeightFt')){
    let wrap=document.createElement('div');wrap.className='heightPair span2';
    wrap.innerHTML='<label>Height (ft)<input id="profileHeightFt" type="number" min="3" max="8" step="1" inputmode="numeric"></label><label>Height (in)<input id="profileHeightIn" type="number" min="0" max="11.9" step="0.1" inputmode="decimal"></label>';
    nameLabel.insertAdjacentElement('afterend',wrap);
  }
  let check=$('#checkBf')?.closest('.formGrid');
  if(check&&!$('#checkNeck')) check.insertAdjacentHTML('beforeend','<label>Neck (in)<input id="checkNeck" type="number" step="0.1" inputmode="decimal"></label><label>Hips (in)<input id="checkHips" type="number" step="0.1" inputmode="decimal"></label><label>Chest (in)<input id="checkChest" type="number" step="0.1" inputmode="decimal"></label><label>Upper arm (in)<input id="checkArm" type="number" step="0.1" inputmode="decimal"></label><label>Thigh (in)<input id="checkThigh" type="number" step="0.1" inputmode="decimal"></label>');
  let stats=$('#bodyStats');
  if(stats&&!$('#bodyMetricsDetailed')){
    let card=document.createElement('div');card.id='bodyMetricsDetailed';card.className='card bodyMetricsCard';
    card.innerHTML='<h3>Body metrics</h3><div id="bodyMetricGrid" class="bodyMetricGrid"></div><div id="measurementGrid" class="measurementGrid"></div><p class="muted bodyMetricNote">BMI is a screening metric and does not distinguish muscle from body fat. Lean/fat mass and FFMI require a body-fat estimate.</p>';
    stats.insertAdjacentElement('afterend',card);
  }
  let ph=$('#progressHeading');if(ph)ph.textContent='Body Stats & Progress';
  let more=$('#page-more .menuCards');
  if(more&&!$('#openBodyProgress')){let b=document.createElement('button');b.id='openBodyProgress';b.innerHTML='<span>📊</span><div><b>Body stats & progress</b><small>BMI, body composition, measurements, trends</small></div><i>›</i>';more.insertBefore(b,more.firstChild);b.onclick=()=>{page('progress');setTimeout(()=>$('#checkWeight')?.focus(),80)}}
  if(more&&!$('#runSystemCheck')){let b=document.createElement('button');b.id='runSystemCheck';b.innerHTML='<span>✅</span><div><b>System check</b><small>Verify tabs, controls, storage and core modules</small></div><i>›</i>';more.appendChild(b);b.onclick=()=>{let r=runSystemAudit();if(r.ok)toast(`System check passed · ${r.checks} checks`);else alert('System check found:\n\n'+r.issues.join('\n'))}}
}
function profileHeightIn(){return +profile()?.heightIn||0}
function latestBodyRecord(){let a=Object.entries(bodyLog()).filter(([,x])=>+x.weight||+x.waist||+x.bf||+x.neck||+x.hips||+x.chest||+x.arm||+x.thigh).sort((a,b)=>a[0].localeCompare(b[0]));return a.at(-1)||null}
function calcBodyMetrics(x){let h=profileHeightIn(),w=+x?.weight||0,bf=+x?.bf||0,waist=+x?.waist||0,hm=h*.0254,wkg=w*.45359237;let bmi=h&&w?703*w/(h*h):null,fat=bf&&w?w*bf/100:null,lean=fat!=null?w-fat:null,leanKg=lean!=null?lean*.45359237:null,ffmi=leanKg&&hm?leanKg/(hm*hm):null,whr=waist&&h?waist/h:null;return{h,w,bf,waist,bmi,fat,lean,ffmi,whr,wkg,hm}}
function fmtMetric(v,d=1){return v==null||!Number.isFinite(v)?'—':(+v).toFixed(d)}
function renderBodyMetrics169(){
  let rec=latestBodyRecord(),k=rec?.[0],x=rec?.[1]||{},m=calcBodyMetrics(x),n=nutrition(),an=nutritionAnalytics(dkey()),goalW=+n.goalWeight||0,goalBf=+n.goalBf||0;
  let goalText=!m.w||!goalW?'—':Math.abs(m.w-goalW)<.2?'At goal':`${Math.abs(m.w-goalW).toFixed(1)} lb ${m.w>goalW?'to lose':'to gain'}`;
  let bfGoal=!m.bf||!goalBf?'—':Math.abs(m.bf-goalBf)<.1?'At goal':`${Math.abs(m.bf-goalBf).toFixed(1)} pts ${m.bf>goalBf?'above':'below'}`;
  let grid=$('#bodyMetricGrid');if(grid)grid.innerHTML=[['Latest weight',m.w?m.w.toFixed(1)+' lb':'—'],['BMI',fmtMetric(m.bmi,1)],['Body fat',m.bf?m.bf.toFixed(1)+'%':'—'],['Waist',m.waist?m.waist.toFixed(1)+' in':'—'],['Lean mass',m.lean!=null?m.lean.toFixed(1)+' lb':'—'],['Fat mass',m.fat!=null?m.fat.toFixed(1)+' lb':'—'],['FFMI',fmtMetric(m.ffmi,1)],['Waist / height',fmtMetric(m.whr,2)],['Height',m.h?`${Math.floor(m.h/12)}′ ${(m.h%12).toFixed(1)}″`:'Set in Profile'],['Metric weight',m.w?m.wkg.toFixed(1)+' kg':'—'],['Goal weight',goalText],['Goal body fat',bfGoal],['7-day avg',an.w7?.points?.length?fmtMetric(avgWeight(addDays(dkey(),-6),dkey()),1)+' lb':'—'],['14d trend',an.w14.perWeek==null?'—':`${an.w14.perWeek>0?'+':''}${an.w14.perWeek.toFixed(2)} lb/wk`],['Est. maintenance',an.maint?an.maint.tdee+' kcal':'—'],['Last check-in',k?fmt(k,{month:'short',day:'numeric'}):'—']].map(([a,b])=>`<div><small>${a}</small><b>${b}</b></div>`).join('');
  let mg=$('#measurementGrid');if(mg){let arr=[['Neck',x.neck],['Hips',x.hips],['Chest',x.chest],['Upper arm',x.arm],['Thigh',x.thigh]].filter(([,v])=>+v);mg.innerHTML=arr.length?'<h4>Latest measurements</h4>'+arr.map(([a,v])=>`<span><small>${a}</small><b>${(+v).toFixed(1)} in</b></span>`).join(''):''}
}
const _renderProgress169=renderProgress;
renderProgress=function(){_renderProgress169();let rec=latestBodyRecord(),x=rec?.[1]||{},m=calcBodyMetrics(x),s=$('#bodyStats');if(s)s.innerHTML=`<div><b>${m.w?m.w.toFixed(1):'—'}</b><small>latest lb</small></div><div><b>${fmtMetric(m.bmi,1)}</b><small>BMI</small></div><div><b>${m.bf?m.bf.toFixed(1)+'%':'—'}</b><small>body fat</small></div><div><b>${m.waist?m.waist.toFixed(1)+' in':'—'}</b><small>waist</small></div>`;renderBodyMetrics169()};
const _fillProfileForm169=fillProfileForm;
fillProfileForm=function(){_fillProfileForm169();let h=profileHeightIn();if($('#profileHeightFt'))$('#profileHeightFt').value=h?Math.floor(h/12):'';if($('#profileHeightIn'))$('#profileHeightIn').value=h?(h%12).toFixed(1).replace(/\.0$/,''):''};
const _saveProfileForm169=saveProfileForm;
saveProfileForm=function(){let p=profile()||blankProfile(),ft=+$('#profileHeightFt')?.value||0,inch=+$('#profileHeightIn')?.value||0,h=ft*12+inch;if(h>=36&&h<=96)p.heightIn=Math.round(h*10)/10;else if(!h)delete p.heightIn;jset(K.profile,p);_saveProfileForm169()};
function saveBodyCheckin169(){let k=$('#checkDate').value||dkey(),b=bodyLog(),old=b[k]||{},fields={weight:'checkWeight',waist:'checkWaist',bf:'checkBf',neck:'checkNeck',hips:'checkHips',chest:'checkChest',arm:'checkArm',thigh:'checkThigh'},x={...old};for(const [key,id] of Object.entries(fields)){let v=+$('#'+id)?.value||0;if(v>0)x[key]=v;else delete x[key]}b[k]=x;saveBodyLog(b);if(x.weight&&typeof mergeHealthDay==='function')mergeHealthDay(k,{weight:x.weight});renderProgress();renderTodayDashboard?.();toast('Body check-in saved + analyzed')}
function populateBodyCheckin(k=$('#checkDate')?.value||dkey()){let x=bodyLog()[k]||{},map={checkWeight:'weight',checkWaist:'waist',checkBf:'bf',checkNeck:'neck',checkHips:'hips',checkChest:'chest',checkArm:'arm',checkThigh:'thigh'};for(const [id,key] of Object.entries(map))if($('#'+id))$('#'+id).value=x[key]??''}

function bindHomeActions169(){
  let k=dkey(),tr=todayTrainingInfo(k),goDiary=()=>{page('diary');$('#diaryDate').value=k;renderDiary()};
  if($('#homeMenuBtn'))$('#homeMenuBtn').onclick=()=>page('more');
  if($('#homeProfileBtn'))$('#homeProfileBtn').onclick=()=>{fillProfileForm();openModal('profileDialog')};
  if($('#homeWorkCard'))$('#homeWorkCard').onclick=()=>{selectedDate=k;let d=date(k);calView=new Date(d.getFullYear(),d.getMonth(),1);page('calendar');renderCalendar()};
  if($('#homeTrainingCard'))$('#homeTrainingCard').onclick=()=>openTrainingDate(tr.date||k);
  if($('#homeCaloriesCard'))$('#homeCaloriesCard').onclick=goDiary;if($('#homeProteinCard'))$('#homeProteinCard').onclick=goDiary;
  if($('#homeRecoveryCard'))$('#homeRecoveryCard').onclick=()=>{fillHealthForm();openModal('healthDialog')};
  if($('#homeFullPlan'))$('#homeFullPlan').onclick=()=>{selectedDate=k;page('calendar');renderCalendar()};
  if($('#homeNextWorkout'))$('#homeNextWorkout').onclick=()=>openTrainingDate(tr.date||k);
  if($('#homeAddFood'))$('#homeAddFood').onclick=()=>{goDiary();openFood('Snacks')};
  if($('#quickWorkout'))$('#quickWorkout').onclick=()=>openTrainingDate(singleJobWorkoutAvailable(k)?k:(tr.date||k));
  if($('#quickFood'))$('#quickFood').onclick=()=>{goDiary();openFood('Snacks')};
  if($('#quickWeight'))$('#quickWeight').onclick=()=>{page('progress');setTimeout(()=>$('#checkWeight')?.focus(),70)};
  if($('#quickBody'))$('#quickBody').onclick=()=>{page('progress');setTimeout(()=>$('#checkWaist')?.focus(),70)};
  if($('#quickBarcode'))$('#quickBarcode').onclick=()=>{goDiary();openFood('Snacks');foodTab('scan')};
}
const _renderTodayDashboard169=renderTodayDashboard;
renderTodayDashboard=function(){_renderTodayDashboard169();bindHomeActions169()};

function runSystemAudit(){
  let issues=[],checks=0,need=(ok,msg)=>{checks++;if(!ok)issues.push(msg)};
  ['page-home','page-calendar','page-diary','page-training','page-progress','page-more','calendarGrid','trainingRoot','mealList','bodyStats','foodDialog','profileDialog','bellevueDialog','nutritionDialog'].forEach(id=>need(!!$('#'+id),`Missing interface element: ${id}`));
  ['renderTodayDashboard','renderCalendar','renderDiary','renderTraining','renderProgress','openFood','startBarcode','scanSchedulePhoto','exportBackup','importBackup','recoveryReadiness','globalTrainingPrescription'].forEach(n=>need(typeof window[n]==='function',`Missing core function: ${n}`));
  let nav=$$('.bottomNav button');need(nav.length===5,'Bottom navigation should contain 5 tabs');for(const b of nav)need(!!$('#page-'+b.dataset.page),`Navigation target missing: ${b.dataset.page}`);
  for(const b of $$('#foodTabs button'))need(!!$('#foodPane-'+b.dataset.tab),`Food tab target missing: ${b.dataset.tab}`);
  let ids=[...document.querySelectorAll('[id]')].map(x=>x.id),dup=ids.filter((x,i)=>ids.indexOf(x)!==i);need(dup.length===0,`Duplicate element IDs: ${[...new Set(dup)].join(', ')}`);
  try{let key='wgp-audit-test';localStorage.setItem(key,'1');need(localStorage.getItem(key)==='1','Local storage write/read failed');localStorage.removeItem(key)}catch{need(false,'Local storage unavailable')}
  need(typeof structuredClone==='function','structuredClone unavailable');need(!!window.crypto?.subtle,'Encrypted-backup crypto unavailable');
  let result={ok:issues.length===0,checks,issues,at:new Date().toISOString(),version:APP_VERSION,optional:{camera:!!navigator.mediaDevices?.getUserMedia,notifications:'Notification'in window,barcodeNative:'BarcodeDetector'in window}};
  try{let a=diagnostics();a.unshift({at:result.at,type:'system-audit',msg:result.ok?`PASS ${checks} checks`:`FAIL ${issues.join(' | ')}`,version:APP_VERSION,path:location.pathname});jset(K.diagnostics,a.slice(0,30))}catch{}
  return result;
}
function installStabilization169(){
  ensureBodyStatsUI();$('#saveCheckin').onclick=saveBodyCheckin169;$('#checkDate').onchange=()=>populateBodyCheckin();populateBodyCheckin();bindHomeActions169();
  let about=$('#aboutDialog .card');if(about)about.innerHTML=`<p><b>Version:</b> ${APP_VERSION}</p><p>Interactive Home, equipment-aware exercise alternatives, workday-aware workout options, BMI/body-composition tracking, adaptive training/nutrition coaching and encrypted backups.</p><p><b>System audit:</b> <span id="aboutAudit">checking…</span></p><p>Camera scanning, OCR, notifications and private-cloud sync remain browser/service dependent.</p>`;
  let r=runSystemAudit(),a=$('#aboutAudit');if(a)a.textContent=r.ok?`Passed ${r.checks} core checks`:`${r.issues.length} issue(s) detected`;renderAll();
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(installStabilization169,0));
(function(){let st=document.createElement('style');st.textContent=`.dot.blue{background:#3b82f6!important}.calDay.singleJobWorkout{box-shadow:inset 0 -2px 0 rgba(59,130,246,.7)}.singleJobOffer{display:flex;flex-direction:column;gap:4px;padding:10px 11px;margin:10px 0;border:1px solid rgba(59,130,246,.28);background:rgba(59,130,246,.07);border-radius:11px}.singleJobOffer b{color:#2563eb;font-size:12px}.singleJobOffer span{font-size:10px;color:var(--muted);line-height:1.4}.heightPair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bodyMetricsCard h3{margin-top:0}.bodyMetricGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.bodyMetricGrid>div{background:var(--chip);border-radius:10px;padding:9px;text-align:center}.bodyMetricGrid small{display:block;font-size:8px;color:var(--muted);line-height:1.2}.bodyMetricGrid b{display:block;margin-top:4px;font-size:12px}.measurementGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:10px}.measurementGrid h4{grid-column:1/-1;margin:3px 0;font-size:11px}.measurementGrid span{background:var(--chip);border-radius:9px;padding:7px;text-align:center}.measurementGrid small,.measurementGrid b{display:block}.measurementGrid small{font-size:8px;color:var(--muted)}.measurementGrid b{font-size:10px;margin-top:3px}.bodyMetricNote{font-size:9px!important;margin:10px 0 0}@media(max-width:560px){.bodyMetricGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.measurementGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.heightPair{grid-template-columns:1fr 1fr}}`;document.head.appendChild(st)})();
