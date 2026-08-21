// Apple Health / recovery data ------------------------------------------------
function healthLog(){return jget(K.health,{})}
function saveHealthLog(x){jset(K.health,x)}
function healthDay(k){return healthLog()[k]||{}}
function mergeHealthDay(k,patch){let h=healthLog();h[k]={...(h[k]||{}),...patch};saveHealthLog(h)}
function durationHours(a,b){return Math.max(0,(new Date(b)-new Date(a))/3600000)}
function healthDateFromISO(s){if(!s)return null;let d=new Date(s);return Number.isNaN(+d)?null:dkey(d)}
function appleHealthType(t){t=String(t||'');if(t.includes('BodyMass'))return'weight';if(t.includes('StepCount'))return'steps';if(t.includes('RestingHeartRate'))return'restingHr';if(t.includes('SleepAnalysis'))return'sleep';return null}
function convertWeight(v,u){v=+v||0;u=String(u||'').toLowerCase();if(u.includes('kg'))return v*2.2046226218;return v}
async function importAppleHealthFile(file){if(!file)throw Error('Choose an Apple Health export.xml file.');let text=await file.text();if(!text.includes('<HealthData'))throw Error('This does not look like Apple Health export.xml.');let doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('Apple Health XML could not be parsed.');let map=healthLog(),body=bodyLog(),counts={weight:0,steps:0,sleep:0,restingHr:0};
 for(const rec of doc.querySelectorAll('Record')){let kind=appleHealthType(rec.getAttribute('type'));if(!kind)continue;let start=rec.getAttribute('startDate'),end=rec.getAttribute('endDate'),k=healthDateFromISO(end||start);if(!k)continue;let d=map[k]||{};
  if(kind==='weight'){let w=convertWeight(rec.getAttribute('value'),rec.getAttribute('unit'));if(w>70&&w<700){d.weight=w;body[k]={...(body[k]||{}),weight:w};counts.weight++}}
  if(kind==='steps'){let v=+rec.getAttribute('value')||0;d.steps=(+d.steps||0)+v;counts.steps++}
  if(kind==='restingHr'){let v=+rec.getAttribute('value')||0;if(v>20&&v<220){if(!d.restingHrValues)d.restingHrValues=[];d.restingHrValues.push(v);counts.restingHr++}}
  if(kind==='sleep'){let val=String(rec.getAttribute('value')||'');if(/Asleep/i.test(val)&&!/Awake/i.test(val)){d.sleepHours=(+d.sleepHours||0)+durationHours(start,end);counts.sleep++}}
  map[k]=d;
 }
 for(const d of Object.values(map)){if(d.restingHrValues?.length){d.restingHr=d.restingHrValues.reduce((a,b)=>a+b,0)/d.restingHrValues.length;delete d.restingHrValues}if(d.steps)d.steps=Math.round(d.steps);if(d.sleepHours)d.sleepHours=Math.round(d.sleepHours*10)/10}
 saveHealthLog(map);saveBodyLog(body);return counts}
async function importHealthCSV(file){if(!file)throw Error('Choose a CSV file.');let rows=(await file.text()).trim().split(/\r?\n/);if(rows.length<2)throw Error('CSV is empty.');let headers=rows[0].split(',').map(x=>x.trim().toLowerCase()),map=healthLog(),body=bodyLog(),count=0;let idx=n=>headers.findIndex(h=>h===n||h.includes(n));let di=idx('date'),wi=idx('weight'),si=idx('steps'),sli=idx('sleep'),ri=idx('resting');if(di<0)throw Error('CSV needs a date column.');
 for(const row of rows.slice(1)){let c=row.split(',').map(x=>x.trim().replace(/^"|"$/g,'')),k=c[di];if(!/^\d{4}-\d{2}-\d{2}$/.test(k)){let d=new Date(k);if(Number.isNaN(+d))continue;k=dkey(d)}let d=map[k]||{};if(wi>=0&&+c[wi]){d.weight=+c[wi];body[k]={...(body[k]||{}),weight:+c[wi]}}if(si>=0&&+c[si])d.steps=+c[si];if(sli>=0&&+c[sli])d.sleepHours=+c[sli];if(ri>=0&&+c[ri])d.restingHr=+c[ri];map[k]=d;count++}
 saveHealthLog(map);saveBodyLog(body);return count}
function healthBaseline(end=dkey(),days=28){let h=healthLog(),rows=[];for(let i=1;i<=days;i++){let x=h[addDays(end,-i)];if(x)rows.push(x)}let avg=k=>{let a=rows.map(x=>+x[k]).filter(Boolean);return a.length?a.reduce((p,q)=>p+q,0)/a.length:null};return{sleep:avg('sleepHours'),restingHr:avg('restingHr'),steps:avg('steps')}}
function recoveryReadiness(k=dkey()){let p=profile(),h=healthDay(k),prev=healthDay(addDays(k,-1)),base=healthBaseline(k),score=80,reasons=[];let sleep=+h.sleepHours||+prev.sleepHours||null,target=+p?.sleepTarget||7.5;if(sleep!=null){let delta=sleep-target;if(delta>=.5){score+=7;reasons.push(`sleep ${sleep.toFixed(1)}h`)}else if(delta<0){let pen=Math.min(30,Math.round(Math.abs(delta)*9));score-=pen;reasons.push(`${Math.abs(delta).toFixed(1)}h below sleep target`)}}else reasons.push('sleep not logged');let rhr=+h.restingHr||null;if(rhr&&base.restingHr){let d=rhr-base.restingHr;if(d>=8){score-=16;reasons.push(`resting HR +${Math.round(d)} bpm vs baseline`)}else if(d>=4){score-=8;reasons.push(`resting HR +${Math.round(d)} bpm`)}}
 let ws=workState(k);if(ws.kind==='both'){score-=25;reasons.push('double-job day')}else if(ws.kind==='one'){score-=8;reasons.push('work day')}else if(ws.kind==='unknown'){score-=18;reasons.push('work schedule unknown')}
 let rs=recoveryScore(k);if(Number.isFinite(rs)){if(rs>=12)score+=7;else if(rs<5)score-=8}
 let recent=history().filter(s=>s.completed&&diffDays(k,s.date)>=0&&diffDays(k,s.date)<=3);if(recent.length>=2){score-=8;reasons.push('2+ lifting sessions in last 3 days')}
 score=clamp(Math.round(score),0,100);let band=score>=80?'High':score>=65?'Good':score>=50?'Moderate':'Low';return{score,band,reasons,sleep,rhr,steps:+h.steps||null}}
function renderHealthSummary(){let box=$('#healthSummary');if(!box)return;let k=dkey(),r=recoveryReadiness(k),h=healthDay(k);box.innerHTML=`<div class="readinessRing"><b>${r.score}</b><small>${r.band}</small></div><div><h3>Recovery readiness</h3><p>${esc(r.reasons.slice(0,3).join(' · '))}</p><div class="healthMetrics"><span><b>${h.sleepHours?h.sleepHours.toFixed(1)+'h':'—'}</b><small>sleep</small></span><span><b>${h.steps?Math.round(h.steps).toLocaleString():'—'}</b><small>steps</small></span><span><b>${h.restingHr?Math.round(h.restingHr):'—'}</b><small>resting HR</small></span></div></div>`}
