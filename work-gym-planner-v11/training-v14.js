// v14 Training Coach: date-based scheduled workouts, swipe navigation, full set history and progression coaching.
(function(){
  const HIST='training-history-v14',DRAFT='training-draft-v14-';
  let tDate=null,touchX=null;
  const E=id=>document.getElementById(id);
  const read=()=>{try{return JSON.parse(localStorage.getItem(HIST)||'[]')}catch{return[]}};
  const write=a=>localStorage.setItem(HIST,JSON.stringify(a.slice(-400)));
  const wiFor=k=>{let d=date(k),p=plan(d.getFullYear(),d.getMonth());return p[k]};
  const isGym=k=>wiFor(k)!=null;
  const shift=(k,n)=>{let d=date(k);d.setDate(d.getDate()+n);return dkey(d)};
  const fmt=k=>date(k).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  const fullfmt=k=>date(k).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const rxMeta=rx=>{let m=String(rx).match(/(\d+)\s*[×x]\s*(\d+)(?:[–-](\d+))?/);return m?{sets:+m[1],lo:+m[2],hi:+(m[3]||m[2])}:{sets:3,lo:8,hi:12}};
  const lowerBig=n=>/squat|deadlift|leg press|hip thrust/i.test(n);
  const upperBig=n=>/press|row|pulldown/i.test(n)&&!/leg press/i.test(n);
  const incFor=n=>lowerBig(n)?10:upperBig(n)?5:5;
  const bestE1RM=ex=>Math.max(0,...(ex?.sets||[]).map(s=>(+s.w||0)*(1+(+s.r||0)/30)));
  const volume=ex=>(ex?.sets||[]).reduce((z,s)=>z+(+s.w||0)*(+s.r||0),0);
  const doneSets=ex=>(ex?.sets||[]).filter(s=>(+s.r||0)>0).length;
  const avgReps=ex=>{let s=(ex?.sets||[]).filter(x=>(+x.r||0)>0);return s.length?s.reduce((a,x)=>a+(+x.r||0),0)/s.length:0};
  const minReps=ex=>{let s=(ex?.sets||[]).filter(x=>(+x.r||0)>0);return s.length?Math.min(...s.map(x=>+x.r||0)):0};
  const recentFor=(name,before)=>read().filter(s=>s.completed&&s.date<before).sort((a,b)=>b.date.localeCompare(a.date)).map(s=>s.exercises?.find(e=>e.name===name)).filter(Boolean);
  const latestSame=(name,before)=>recentFor(name,before)[0]||null;
  const lastSessionForDate=k=>read().find(s=>s.date===k)||null;
  const firstPlanned=()=>{let today=dkey();if(isGym(today))return today;for(let i=1;i<120;i++){let k=shift(today,i);if(isGym(k))return k}return today};
  const prevGym=k=>{for(let i=1;i<180;i++){let x=shift(k,-i);if(isGym(x))return x}return k};
  const nextGym=k=>{for(let i=1;i<180;i++){let x=shift(k,i);if(isGym(x))return x}return k};
  function migrateLegacy(wi){let out={};WK[wi][2].forEach((e,j)=>{let v=localStorage.getItem('lift-w'+wi+'e'+j);if(v){let [w,r]=v.split('|');out[e[0]]={w:+w||'',r:+r||''}}});return out}
  function draftFor(k,wi){
    try{let x=JSON.parse(localStorage.getItem(DRAFT+k)||'null');if(x&&x.workoutIndex===wi)return x}catch{}
    let saved=lastSessionForDate(k);if(saved)return JSON.parse(JSON.stringify(saved));
    let legacy=migrateLegacy(wi),w=WK[wi];
    return {date:k,workoutIndex:wi,completed:false,exercises:w[2].map(([name,rx])=>{let meta=rxMeta(rx),last=latestSame(name,k),lastSet=last?.sets?.find(s=>+s.w>0)||null,lv=legacy[name];let guess=lastSet?.w||lv?.w||'';return{name,rx,sets:Array.from({length:meta.sets},(_,i)=>({w:guess,r:i===0?(lv?.r||''):'',rir:''}))}})};
  }
  const saveDraft=x=>localStorage.setItem(DRAFT+x.date,JSON.stringify(x));
  function coachExercise(ex,k){
    let m=rxMeta(ex.rx),prevs=recentFor(ex.name,k),prev=prevs[0],prev2=prevs[1],complete=doneSets(ex)>=m.sets,avg=avgReps(ex),min=minReps(ex),w=Math.max(0,...ex.sets.map(s=>+s.w||0)),inc=incFor(ex.name);
    if(!complete)return 'Complete all '+m.sets+' working sets before increasing load.';
    if(!w)return avg>=m.hi?'Add resistance next time if this is a weighted movement.':'Keep the movement and add reps within '+m.lo+'–'+m.hi+'.';
    let cur1=bestE1RM(ex),p1=bestE1RM(prev),p2=bestE1RM(prev2);
    if(min>=m.hi)return 'Progress: add '+inc+' lb next time and restart near '+m.lo+' reps.';
    if(min>=m.lo&&avg<m.hi)return 'Keep '+w+' lb next time and add 1 rep where possible.';
    if(prev&&cur1<p1*.94&&prev2&&p1<p2*.97)return 'Fatigue flag: two declining exposures. Reduce load ~10% or remove one set next time.';
    if(min<m.lo)return 'Repeat or reduce the load 5–10% until every working set reaches at least '+m.lo+' reps.';
    return 'Repeat this load and beat today by a rep.';
  }
  function trendStats(){
    let h=read().filter(x=>x.completed).sort((a,b)=>a.date.localeCompare(b.date)),today=date(dkey()),last28=h.filter(s=>(today-date(s.date))/DAY<=28),sched=0;for(let i=0;i<28;i++)if(isGym(shift(dkey(),-i)))sched++;
    let adh=sched?Math.min(100,Math.round(last28.length/sched*100)):0;
    let vols=h.slice(-8).map(s=>(s.exercises||[]).reduce((a,e)=>a+volume(e),0)),vtrend=vols.length>=4?((vols.slice(-3).reduce((a,b)=>a+b,0)/3)/(vols.slice(-6,-3).reduce((a,b)=>a+b,0)/Math.max(1,vols.slice(-6,-3).length)||1)-1)*100:null;
    let prs=0;if(h.length>=2){let cur=h[h.length-1],past=h.slice(0,-1);for(let ex of cur.exercises||[]){let old=Math.max(0,...past.map(s=>bestE1RM((s.exercises||[]).find(e=>e.name===ex.name))));if(bestE1RM(ex)>old&&bestE1RM(ex)>0)prs++}}
    return{sessions:last28.length,adh,vtrend,prs};
  }
  function overallCoach(k,session){
    let s=trendStats(),msgs=[];
    if(s.adh>=85)msgs.push('Training adherence is strong at '+s.adh+'% over the last 4 weeks.');else if(s.sessions)msgs.push('4-week adherence is '+s.adh+'%. Consistency is the first lever to improve.');else msgs.push('Complete a few workouts and I’ll build your training trend.');
    if(s.prs)msgs.push(s.prs+' estimated strength PR'+(s.prs>1?'s':'')+' in your most recent completed workout.');
    if(s.vtrend!=null){if(s.vtrend>5)msgs.push('Recent training volume is trending up '+Math.round(s.vtrend)+'%.');else if(s.vtrend<-8)msgs.push('Recent volume is down '+Math.abs(Math.round(s.vtrend))+'%; check recovery and missed sets.');}
    if(session?.completed)msgs.push('This workout is saved and included in coaching analytics.');else msgs.push('Set entries are saved as a draft; tap Complete workout when you finish so they count in progression analysis.');
    return msgs.join(' ');
  }
  function workText(k){return nyu(k)&&bw(k)?'Both jobs':nyu(k)?'NYU':bw(k)?'Bellevue':'Off both'}
  function render(){
    let root=E('training');if(!root)return;if(!tDate)tDate=firstPlanned();if(!isGym(tDate))tDate=nextGym(tDate);let wi=wiFor(tDate),w=WK[wi],sess=draftFor(tDate,wi),prev=prevGym(tDate),next=nextGym(tDate),done=sess.completed;
    root.innerHTML=`<div class="trainingTop"><button id="trainPrev" aria-label="Previous workout">‹</button><div><small>${done?'COMPLETED':'SCHEDULED WORKOUT'}</small><h2>${fullfmt(tDate)}</h2><p>${w[0]} · ${w[1]} · ${workText(tDate)}</p></div><button id="trainNext" aria-label="Next workout">›</button></div><div class="swipeHint">Swipe left/right between training days · ${fmt(prev)} ← → ${fmt(next)}</div><div id="trainCoach" class="coachCard"><b>Progress Coach</b><p>${overallCoach(tDate,sess)}</p></div><div id="trainWorkout" class="trainWorkout">${sess.exercises.map((ex,ei)=>exerciseHtml(ex,ei,tDate)).join('')}</div><div class="trainActions"><button id="saveTrainDraft">Save draft</button><button id="completeTrain" class="primary">${done?'Update completed workout':'Complete workout'}</button></div><div class="trainingStats" id="trainingStats"></div>`;
    E('trainPrev').onclick=()=>{saveInputs(false);tDate=prevGym(tDate);render()};E('trainNext').onclick=()=>{saveInputs(false);tDate=nextGym(tDate);render()};E('saveTrainDraft').onclick=()=>{saveInputs(false);flash('Draft saved')};E('completeTrain').onclick=()=>{saveInputs(true);render();flash('Workout saved + analyzed')};
    bindSwipe();renderStats(sess);
  }
  function exerciseHtml(ex,ei,k){
    let last=latestSame(ex.name,k),lastTxt=last?last.sets.filter(s=>+s.r).map(s=>`${s.w||'BW'}×${s.r}`).join(', '):'No previous session',coach=last?coachExercise(last,k):'Log this workout to start exercise-specific coaching.';
    return `<article class="exerciseCard"><div class="exerciseHead"><div><h3>${esc(ex.name)}</h3><span>${esc(ex.rx)} · target 1–2 RIR on compounds</span></div><button class="historyChip" type="button" data-exhist="${ei}">History</button></div><div class="lastLine"><b>Last:</b> ${esc(lastTxt)}</div><div class="setHeader"><span>Set</span><span>Weight</span><span>Reps</span><span>RIR</span></div>${ex.sets.map((s,si)=>`<div class="setRow"><b>${si+1}</b><input data-e="${ei}" data-s="${si}" data-f="w" inputmode="decimal" type="number" step="2.5" value="${esc(s.w)}" placeholder="lb"><input data-e="${ei}" data-s="${si}" data-f="r" inputmode="numeric" type="number" value="${esc(s.r)}" placeholder="reps"><input data-e="${ei}" data-s="${si}" data-f="rir" inputmode="decimal" type="number" step="0.5" min="0" max="5" value="${esc(s.rir)}" placeholder="RIR"></div>`).join('')}<div class="exerciseCoach"><b>Next-step rule:</b> ${esc(coach)}</div><div class="exerciseHistory hidden" id="hist${ei}">${historyHtml(ex.name,k)}</div></article>`
  }
  function historyHtml(name,k){let a=read().filter(s=>s.completed&&s.date<k).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(s=>({date:s.date,ex:(s.exercises||[]).find(e=>e.name===name)})).filter(x=>x.ex);if(!a.length)return'<p>No completed history yet.</p>';return a.map(x=>`<div class="histRow"><span>${fmt(x.date)}</span><b>${x.ex.sets.filter(s=>+s.r).map(s=>`${s.w||'BW'}×${s.r}`).join(' · ')}</b><small>e1RM ${bestE1RM(x.ex)?bestE1RM(x.ex).toFixed(0)+' lb':'—'}</small></div>`).join('')}
  function currentFromInputs(){let wi=wiFor(tDate),w=WK[wi],base=draftFor(tDate,wi);base.exercises=w[2].map(([name,rx],ei)=>{let meta=rxMeta(rx),sets=[];for(let si=0;si<meta.sets;si++){let get=f=>rootQuery(`[data-e="${ei}"][data-s="${si}"][data-f="${f}"]`)?.value||'';sets.push({w:get('w'),r:get('r'),rir:get('rir')})}return{name,rx,sets}});return base}
  function rootQuery(q){return E('training')?.querySelector(q)}
  function saveInputs(complete){let s=currentFromInputs();s.completed=!!complete;s.completedAt=complete?new Date().toISOString():s.completedAt||null;saveDraft(s);if(complete){let h=read().filter(x=>x.date!==s.date);h.push(s);h.sort((a,b)=>a.date.localeCompare(b.date));write(h);for(let ei=0;ei<s.exercises.length;ei++){let set=s.exercises[ei].sets.find(x=>+x.r)||{};localStorage.setItem('lift-w'+s.workoutIndex+'e'+ei,(set.w||'')+'|'+(set.r||''))}}}
  function bindSwipe(){let area=E('trainWorkout');if(!area)return;area.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX},{passive:true});area.addEventListener('touchend',e=>{if(touchX==null)return;let dx=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)<60)return;saveInputs(false);tDate=dx<0?nextGym(tDate):prevGym(tDate);render()},{passive:true});document.querySelectorAll('[data-exhist]').forEach(b=>b.onclick=()=>E('hist'+b.dataset.exhist).classList.toggle('hidden'))}
  function renderStats(sess){let st=trendStats(),vol=(sess.exercises||[]).reduce((a,e)=>a+volume(e),0),el=E('trainingStats');if(!el)return;el.innerHTML=`<div><b>${st.sessions}</b><small>sessions / 4 wk</small></div><div><b>${st.adh}%</b><small>adherence</small></div><div><b>${Math.round(vol).toLocaleString()}</b><small>session volume</small></div><div><b>${st.prs}</b><small>recent PRs</small></div>`}
  function flash(t){let b=E('trainCoach');if(!b)return;let old=b.innerHTML;b.innerHTML='<b>'+esc(t)+'</b>';setTimeout(()=>{if(E('trainCoach'))E('trainCoach').innerHTML=old},1200)}
  renderTraining=render;
  window.trainingCoach={render,readHistory:read};
})();
