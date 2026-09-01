// v16.3 Interactive Home dashboard ------------------------------------------
const HOME_ICONS={
 menu:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
 brand:'<svg viewBox="0 0 24 24"><path d="M4 7v10m3-12v14m3-7h4m0-7v14m3-12v10m3-7v4M7 12h10"/><path d="m8 18 3-3 2 2 4-5"/></svg>',
 work:'<svg viewBox="0 0 24 24"><path d="M9 6V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V6M4 7h16v12H4zM4 11h16M10 11v2h4v-2"/></svg>',
 training:'<svg viewBox="0 0 24 24"><path d="M3 9v6m3-8v10m3-5h6m0-5v10m3-8v6m3-4v2M6 12h12"/></svg>',
 fire:'<svg viewBox="0 0 24 24"><path d="M13.5 3.5c.6 3-2.4 4.2-1.2 7.1.7 1.6 2.6 1.9 3.2.2.4-1.2-.1-2.4-.6-3.2 3.5 2 5 5.1 4 8.4-1 3.5-4.1 5.5-7.2 5.5-4.5 0-7.3-2.9-6.7-6.8.5-3.4 3.2-5 5.4-7.6.8-.9 1.7-2.1 1.7-3.6.7.4 1 .7 1.4 1Z"/></svg>',
 target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3m10 7h-3M12 22v-3M2 12h3"/></svg>',
 bed:'<svg viewBox="0 0 24 24"><path d="M3 19v-8m18 8v-5a2 2 0 0 0-2-2H9a3 3 0 0 0-3 3v4M3 17h18M6 12V8h5a2 2 0 0 1 2 2v2"/></svg>',
 steps:'<svg viewBox="0 0 24 24"><path d="M8 4c1.4 0 2.4 1.1 2.2 2.4L9.7 10c-.2 1.2-.9 2.1-2 2.6L5.3 14c-1.4.8-3.2-.1-3.3-1.7-.1-1 .5-1.9 1.4-2.3l1.4-.7.8-3.1C6 4.9 6.8 4 8 4Zm8.2 7c1.4 0 2.4 1.1 2.2 2.4l-.5 3.6c-.2 1.2-.9 2.1-2 2.6L13.5 21c-1.4.8-3.2-.1-3.3-1.7-.1-1 .5-1.9 1.4-2.3l1.4-.7.8-3.1c.4-1.3 1.2-2.2 2.4-2.2Z"/></svg>',
 heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11Z"/></svg>',
 bolt:'<svg viewBox="0 0 24 24"><path d="m13.5 2-7 11h5l-1 9 7-12h-5z"/></svg>',
 apple:'<svg viewBox="0 0 24 24"><path d="M12 7c1.6-2.5 4.8-2.6 6.5-.7 1.7 1.9 1.6 5.1.5 7.7-1.7 4.1-4.1 7-6.2 7-1.1 0-1.7-.7-2.8-.7S8.2 21 7.1 21C5 21 2.7 18.1 1 14c-1.1-2.6-1.2-5.8.5-7.7C3.2 4.4 6.4 4.5 8 7c1.2-.7 2.8-.7 4 0Zm.2-2.2c.2-2 1.7-3.6 3.6-3.8.1 2-1.3 3.8-3.6 3.8Z"/></svg>',
 scale:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 9a5 5 0 0 1 8 0l-4 3zM12 12v4"/></svg>',
 body:'<svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.2"/><path d="M8 10c1.2-1.4 2.5-2.1 4-2.1s2.8.7 4 2.1l1.5 4-2.3 1-.7-2.1V21h-5v-8.1L8.8 15l-2.3-1z"/></svg>',
 barcode:'<svg viewBox="0 0 24 24"><path d="M4 5v14M7 5v14m3-14v14m4-14v14m3-14v14m3-14v14M2 3v4m0 10v4m20-18v4m0 10v4"/></svg>',
 chevron:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>'
};
function nextPlannedWorkout(after=dkey()){let dates=canonicalScheduleThrough(addDays(after,35)).filter(k=>k>=after);for(const k of dates){if(completedOn(k))continue;return{k,wi:projectedWorkoutIndex(k)}}return null}
function homeGreeting(){let h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
function homeTime(t){if(!t)return'';let [h,m]=t.split(':').map(Number),ap=h>=12?'PM':'AM',hh=h%12||12;return`${hh}:${String(m||0).padStart(2,'0')} ${ap}`}
function shiftText(on,start,end){return on&&start&&end?`${homeTime(start)} – ${homeTime(end)}`:on?'Working':'Off'}
function readinessColor(score){return score>=80?'#34d058':score>=65?'#5bd66f':score>=50?'#f6b73c':'#ff6b6b'}
function workLoadLabel(s){return s.kind==='both'?'High Load':s.kind==='one'?'Work Day':s.kind==='unknown'?'Needs Review':'Recovery Opportunity'}
function todayTrainingInfo(k){let comp=completedOn(k),scheduled=isScheduled(k),wi=comp?.workoutIndex??(scheduled?projectedWorkoutIndex(k):null),next=nextPlannedWorkout(addDays(k,wi!=null?1:0)),own=profile()?.trainingMode==='existing';if(wi!=null)return{title:typeof plannedWorkoutName==='function'?plannedWorkoutName(k,wi):WORKOUTS[wi].name,sub:comp?'Completed':own?`${plannedWorkoutTime(k)||'Time flexible'} · your routine`:`Week ${phaseInfo(k).week} · ${phaseInfo(k).name}`,date:k,wi,completed:!!comp};if(next)return{title:'Recovery Day',sub:`Next: ${typeof plannedWorkoutName==='function'?plannedWorkoutName(next.k,next.wi):WORKOUTS[next.wi].name}`,date:next.k,wi:next.wi,next:true};return{title:'Recovery Day',sub:'No workout scheduled',date:null,wi:null}}
function dashboardWorkRows(k,s){
 let canonical=window.WWV25?.workRowsOn?.(k);
 if(Array.isArray(canonical))return canonical.map(row=>({
  name:row.name||'Work shift',
  value:row.time||(row.start&&row.end?`${homeTime(row.start)} – ${homeTime(row.end)}`:row.off?'Off work':'Working'),
  state:row.unknown?'unknown':row.off?'off':'work'
 }));
 let p=profile(),rows=[],smart=typeof smartWork==='function'?smartWork(k):null;
 if(smart){rows.push({name:smart.label||p?.variable?.name||'Work shift',value:smart.start&&smart.end?`${homeTime(smart.start)} – ${homeTime(smart.end)}`:'Working',state:'work'})}
 else if(p?.variable?.enabled){let code=variableCode(k),on=code==='X';rows.push({name:p.variable.name||'Variable job',value:code==='?'?'Schedule unknown':shiftText(on,p.variable.start,p.variable.end),state:code==='?'?'unknown':on?'work':'off'})}
 if(p?.fixed?.enabled){let on=fixedWork(k);rows.push({name:p.fixed.name||'Fixed job',value:shiftText(on,p.fixed.start,p.fixed.end),state:on?'work':'off'})}
 return rows
}
function renderPausedSetupDashboard(root){
 let account=window.WGC18||{},user=account.session?.user||{},name=String(user.user_metadata?.display_name||user.email?.split('@')[0]||'there').trim(),hasDraft=!!localStorage.getItem(PREFIX+'guided-onboarding-draft-v30');
 root.innerHTML=`<div class="homeDash homeDashV27 onboardingPausedHome">
  <header class="hvHead pausedHead">
   <button class="hvBrand" id="pausedMenuBtn" aria-label="Open menu"><b>Work + Workout</b><span class="hvCode">Menu</span></button>
   <button class="hvAvatar" id="pausedAccountBtn" aria-label="Open account">${esc(name.charAt(0).toUpperCase()||'W')}</button>
   <div class="hvHello"><p class="hvCode">YOUR PRIVATE PLAN</p><h1>Welcome, ${esc(name)}.</h1></div>
  </header>
  <section class="pausedSetupHero">
   <p class="hvCode">${hasDraft?'SETUP SAVED':'READY WHEN YOU ARE'}</p>
   <h2>${hasDraft?'Pick up where you left off.':'Build a week that fits your real life.'}</h2>
   <p>${hasDraft?'Your answers are safely saved on this account. Finish when you have a few minutes.':'Tell us about your work, training and food preferences when you are ready. You can leave and return at any time.'}</p>
   <button id="resumeOnboarding" class="pausedPrimary">${hasDraft?'Resume setup':'Start setup'} <span aria-hidden="true">→</span></button>
  </section>
  <section class="pausedPreview" aria-label="What your plan will include">
   <article><span>01</span><b>Work schedule</b><small>Photo, PDF, pasted shifts or a repeating rotation</small></article>
   <article><span>02</span><b>Training</b><small>Realistic workout windows fitted around your job</small></article>
   <article><span>03</span><b>Nutrition</b><small>Meal guidance and targets shaped around your day</small></article>
  </section>
  <p class="pausedNote">Nothing is added to your calendar until you review and approve it.</p>
 </div>`;
 document.getElementById('resumeOnboarding').onclick=()=>account.openOnboarding?.();
 document.getElementById('pausedMenuBtn').onclick=()=>page('more');
 document.getElementById('pausedAccountBtn').onclick=()=>account.openAccount?.('account');
}
function renderTodayDashboard(){
 let root=$('#todayDashboard');if(!root)return;if(!profile()){renderPausedSetupDashboard(root);return}
 let k=dkey(),p=profile(),s=workState(k),r=recoveryReadiness(k),n=target(k),t=totals(k),training=todayTrainingInfo(k),
  calPct=clamp(Math.round(t.cal/Math.max(1,n.cal)*100),0,100),
  proteinPct=clamp(Math.round(t.p/Math.max(1,n.p)*100),0,100),
  carbPct=clamp(Math.round(t.c/Math.max(1,n.c)*100),0,100),
  fatPct=clamp(Math.round(t.f/Math.max(1,n.f)*100),0,100),
  left=Math.max(0,Math.round(n.cal-t.cal)),
  rows=dashboardWorkRows(k,s),
  workingRows=rows.filter(x=>x.state==='work'),
  workSummary=workingRows.length?workingRows.map(x=>x.name).join(' + '):(s.kind==='unknown'?'Needs review':'No work added'),
  initial=(p.name||'U').trim().charAt(0).toUpperCase(),
  loadLabel=workingRows.length>1?'High load':s.kind==='unknown'?'Needs review':workingRows.length?'Work day':'Open day',
  stepDay=healthDay(k),steps=hasStepValue(stepDay)?Math.max(0,Math.round(+stepDay.steps)):0,stepsLogged=hasStepValue(stepDay),dailyStepGoal=stepGoal(),stepPct=clamp(Math.round(steps/dailyStepGoal*100),0,100),stepBridge=nativeSteps(),stepConnected=nativeStepEnabled(),stepUpdated=relativeStepSync(stepDay.stepsSyncedAt);

 // One line, not a paragraph. The panel it sits in already says "readiness".
 let recoveryMsg=r.score>=80?'Train as prescribed.':r.score>=65?'Train as planned, respect the RIR.':r.score>=50?'Keep it controlled. Avoid failure work.':'Move heavy work or use the fatigue-adjusted set.';

 // A macro row carries its own colour so the bar means something.
 const macro=(id,kind,label,now,goal,unit,pct)=>
  `<${id?'button':'div'} class="hvMacro ${kind}"${id?` id="${id}"`:''}>
    <span class="hvMacroTop"><small>${esc(label)}</small><b>${now} / ${goal}${unit}</b></span>
    <span class="hvBar"><i style="width:${pct}%"></i></span>
   </${id?'button':'div'}>`;

 root.innerHTML=`<div class="homeDash homeDashV27">

  <header class="hvHead">
   <button class="hvBrand" id="homeMenuBtn" aria-label="Open menu">
    <b>Work + Workout</b><span class="hvCode">Menu</span>
   </button>
   <button class="hvAvatar" id="homeProfileBtn" aria-label="Open profile">${esc(initial)}</button>
   <div class="hvHello">
    <p class="hvCode">${fmt(k,{weekday:'long',day:'numeric',month:'long'})}</p>
    <h1>${esc(homeGreeting())}, ${esc(p.name||'there')}</h1>
   </div>
  </header>

  <div class="homeSummaryGrid hvStrip">
   <button class="hvTile w" id="homeWorkCard">
    <span class="hvCode">Shift</span><b>${esc(workSummary)}</b><em>${esc(loadLabel)}</em>
   </button>
   <button class="hvTile t" id="homeTrainingCard">
    <span class="hvCode">Training</span><b>${esc(training.title)}</b><em>${esc(training.sub)}</em>
   </button>
   <button class="hvTile r" id="homeRecoveryCard">
    <span class="hvCode">Readiness</span><b>${r.score}<i>%</i></b><em>${esc(r.band)} · ${r.sleep?r.sleep.toFixed(1)+'h sleep':'sleep not logged'}</em>
   </button>
  </div>

  <section class="hvPanel">
   <div class="hvPanelHead">
    <h2>Today</h2>
    <button class="hvLink" id="homeFullPlan">Full plan <span aria-hidden="true">→</span></button>
   </div>
   <div class="hvRows">
    ${rows.map(x=>`<div class="hvRow ${x.state==='work'?'w':'r'}">
      <time>${esc(x.value)}</time><i class="hvTick"></i>
      <span class="hvWhat"><b>${esc(x.name)}</b><small>${x.state==='work'?'Protected':'Not working'}</small></span>
     </div>`).join('')||
     `<div class="hvRow r"><time>—</time><i class="hvTick"></i>
       <span class="hvWhat"><b>No work added</b><small>The whole day is yours</small></span></div>`}
    <div class="hvRow t">
     <time>${training.completed?'Logged':'Planned'}</time><i class="hvTick"></i>
     <span class="hvWhat"><b>${esc(training.title)}</b><small>${esc(training.sub)}</small></span>
    </div>
   </div>
   <div class="hvPanelFoot">
    <span class="hvNote">${training.title==='Recovery Day'?'Mobility, steps, nutrition and sleep.':training.completed?'Logged. Recovery now drives the next recommendation.':esc(recoveryMsg)}</span>
    <button class="hvBtn" id="homeNextWorkout">${training.title==='Recovery Day'?'Next workout':'Open workout'}</button>
   </div>
  </section>

  <section class="hvPanel hvStepsPanel">
   <div class="hvPanelHead">
    <h2>Steps</h2>
    <button class="hvLink" id="homeStepSettings">Manage <span aria-hidden="true">→</span></button>
   </div>
   <div class="hvStepHero">
    <span class="hvStepRing" style="--step-progress:${stepPct*3.6}deg"><i>${HOME_ICONS.steps}</i></span>
    <div class="hvStepCopy">
     <strong>${stepsLogged?steps.toLocaleString():'—'}</strong>
     <span>of ${dailyStepGoal.toLocaleString()} daily steps</span>
     <span class="hvBar big"><i class="s" style="width:${stepPct}%"></i></span>
     <small>${stepsLogged?`${esc(stepSourceLabel(stepDay))}${stepUpdated?' · updated '+esc(stepUpdated):''}`:stepBridge?.available?'Connect your phone to start syncing':'Log steps manually or use the mobile app'}</small>
    </div>
    <button id="homeStepAction" class="hvBtn">${stepConnected?'Refresh':stepBridge?.available?'Connect':'Log steps'}</button>
   </div>
  </section>

  <section class="hvPanel">
   <div class="hvPanelHead">
    <h2>Fuel</h2>
    <button class="hvLink" id="homeAddFood">Add food <span aria-hidden="true">+</span></button>
   </div>
   <button class="hvHero" id="homeCaloriesCard">
    <span class="hvHeroCopy">
     <span class="hvHeroNum">${Math.round(t.cal).toLocaleString()}<i>/ ${n.cal.toLocaleString()} kcal</i></span>
     <span class="hvBar big"><i class="m" style="width:${calPct}%"></i></span>
     <span class="hvCode">${left.toLocaleString()} left today</span>
    </span>
    <span class="hvMealVisual" aria-hidden="true"></span>
   </button>
   <div class="hvMacros">
    ${macro('homeProteinCard','t','Protein',Math.round(t.p),n.p,'g',proteinPct)}
    ${macro('','m','Carbs',Math.round(t.c),Math.round(n.c),'g',carbPct)}
    ${macro('','r','Fat',Math.round(t.f),Math.round(n.f),'g',fatPct)}
   </div>
  </section>

  <section class="hvPanel quickPanel">
   <div class="hvPanelHead"><h2>Log something</h2></div>
   <div class="quickGrid hvQuick">
    <button id="quickWeight"><b>Weigh in</b><span class="hvCode">Morning weight</span></button>
    <button id="quickBody"><b>Body stats</b><span class="hvCode">Waist, photos</span></button>
    <button id="quickBarcode"><b>Scan barcode</b><span class="hvCode">Packaged food</span></button>
   </div>
  </section>

 </div>`;

 // Every binding is guarded: the quick grid no longer duplicates actions that
 // already exist in the panels above, so some ids are intentionally absent.
 const on=(id,fn)=>{const el=$('#'+id);if(el)el.onclick=fn};
 const addFood=()=>{page('diary');setTimeout(()=>openFood('Breakfast'),80)};

 on('homeMenuBtn',()=>page('more'));
 on('homeProfileBtn',()=>{fillProfileForm();openModal('profileDialog')});
 on('homeWorkCard',()=>page('calendar'));
 on('homeTrainingCard',()=>training.date?openTrainingDate(training.date):page('training'));
 on('homeRecoveryCard',()=>{fillHealthForm?.();openModal('healthDialog')});
 on('homeStepSettings',()=>{fillHealthForm?.();openModal('healthDialog')});
 on('homeStepAction',()=>{if(stepConnected)syncNativeSteps({announce:true});else{fillHealthForm?.();openModal('healthDialog');if(!stepBridge?.available)setTimeout(()=>$('#healthSteps')?.focus(),120)}});
 on('homeFullPlan',()=>page('calendar'));
 on('homeNextWorkout',()=>training.date?openTrainingDate(training.date):page('training'));
 on('homeCaloriesCard',()=>page('diary'));
 on('homeProteinCard',()=>page('diary'));
 on('homeAddFood',addFood);
 on('quickWeight',()=>{page('progress');setTimeout(()=>$('#checkWeight')?.focus(),120)});
 on('quickBody',()=>{page('progress');setTimeout(()=>$('#checkWaist')?.focus(),120)});
 on('quickBarcode',()=>{page('diary');setTimeout(()=>{openFood('Breakfast');foodTab('scan')},80)});
}
