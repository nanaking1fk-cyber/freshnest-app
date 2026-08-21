// Workouts ------------------------------------------------------------------
const WORKOUTS=[
 {name:'Lower A',focus:'Quads + posterior chain',stress:'lower',ex:[
  {name:'Hack Squat',sets:4,lo:6,hi:8,inc:10},{name:'Romanian Deadlift',sets:3,lo:6,hi:8,inc:10},{name:'Leg Press',sets:3,lo:10,hi:12,inc:10},{name:'Seated Leg Curl',sets:3,lo:10,hi:12,inc:5},{name:'Leg Extension',sets:2,lo:12,hi:15,inc:5},{name:'Standing Calf Raise',sets:3,lo:10,hi:15,inc:5},{name:'Cable Crunch',sets:3,lo:12,hi:15,inc:5}]},
 {name:'Upper A',focus:'Chest + back',stress:'upper',ex:[
  {name:'Incline Dumbbell Press',sets:4,lo:6,hi:8,inc:5},{name:'Chest-Supported Row',sets:4,lo:6,hi:8,inc:5},{name:'Lat Pulldown',sets:3,lo:8,hi:10,inc:5},{name:'Machine Chest Press',sets:3,lo:8,hi:10,inc:5},{name:'Cable Lateral Raise',sets:3,lo:12,hi:20,inc:2.5},{name:'Rope Triceps Pressdown',sets:3,lo:10,hi:15,inc:5},{name:'Preacher Curl',sets:3,lo:10,hi:15,inc:2.5}]},
 {name:'Lower B',focus:'Glutes + hamstrings',stress:'lower',ex:[
  {name:'Smith Machine Squat',sets:3,lo:8,hi:10,inc:10},{name:'Hip Thrust',sets:3,lo:8,hi:10,inc:10},{name:'Bulgarian Split Squat',sets:3,lo:8,hi:10,inc:5},{name:'Lying Leg Curl',sets:3,lo:10,hi:12,inc:5},{name:'Leg Extension',sets:2,lo:12,hi:15,inc:5},{name:'Seated Calf Raise',sets:3,lo:12,hi:15,inc:5},{name:'Hanging Knee Raise',sets:3,lo:10,hi:15,inc:0}]},
 {name:'Upper B',focus:'Shoulders + back + arms',stress:'upper',ex:[
  {name:'Flat Bench / Machine Press',sets:3,lo:6,hi:8,inc:5},{name:'Neutral-Grip Lat Pulldown',sets:3,lo:8,hi:10,inc:5},{name:'Seated DB Shoulder Press',sets:3,lo:8,hi:10,inc:5},{name:'Seated Cable Row',sets:3,lo:8,hi:12,inc:5},{name:'Incline Cable Fly',sets:2,lo:12,hi:15,inc:2.5},{name:'Lateral Raise',sets:4,lo:12,hi:20,inc:2.5},{name:'Incline DB Curl',sets:3,lo:10,hi:12,inc:2.5},{name:'Overhead Cable Triceps Extension',sets:3,lo:10,hi:12,inc:2.5}]}
];
function history(){return jget(K.history,[]).sort((a,b)=>a.date.localeCompare(b.date))}
function saveHistory(h){jset(K.history,h.slice(-800))}
function drafts(){return jget(K.drafts,{})}function saveDrafts(d){jset(K.drafts,d)}
function overrides(){return jget(K.overrides,{})}function saveOverrides(o){jset(K.overrides,o)}
function snapshots(){return jget(K.snapshots,{})}function saveSnapshots(s){jset(K.snapshots,s)}
function dueWorkoutIndex(before=null){return history().filter(x=>x.completed&&(!before||x.date<before)).length%WORKOUTS.length}
function completedOn(k){return history().find(x=>x.completed&&x.date===k)||null}
function trainingStressPenalty(k){let h=history().filter(x=>x.completed&&x.date<k).sort((a,b)=>b.date.localeCompare(a.date))[0];if(!h)return 0;let gap=diffDays(k,h.date);if(gap<=1)return -100;if(gap===2&&WORKOUTS[h.workoutIndex]?.stress==='lower')return -2;return 0}
function timeHour(t){if(!t)return null;let [h,m]=String(t).split(':').map(Number);return h+(m||0)/60}
function lateEnd(t){let h=timeHour(t);return h!=null&&(h>=22||h<=4)}
function earlyStart(t){let h=timeHour(t);return h!=null&&h<=8.5}
function turnaroundHours(end,start,commuteMin=0){let e=timeHour(end),s=timeHour(start);if(e==null||s==null)return null;if(e<=4)e+=24;if(s<=e)s+=24;return s-e-(+commuteMin||0)/60}
function recoveryScore(k){let s=workState(k);if(s.kind==='unknown'||s.kind==='both')return-Infinity;let p=profile(),score=s.kind==='off'?12:5,pk=addDays(k,-1),ps=workState(pk);if(ps.kind==='off')score+=4;if(ps.kind==='both')score-=4;if(fixedOffWeekend(k))score+=2;if(ps.fixed&&lateEnd(p?.fixed?.end))score-=3;if(s.variable&&earlyStart(p?.variable?.start))score-=1;let turn=s.variable&&ps.fixed?turnaroundHours(p?.fixed?.end,p?.variable?.start,(+p?.fixed?.commuteMin||0)+(+p?.variable?.commuteMin||0)):null;if(turn!=null){let need=(+p?.sleepTarget||7.5)+1;if(turn<need)score-=Math.ceil((need-turn)*2)}score+=trainingStressPenalty(k);return score}
function suggestedTrainingDates(start,end){
 if(!profile())return[];let o=overrides(),selected=[],firstMon=monOf(start),last=end;
 for(let wk=firstMon;wk<=last;wk=addDays(wk,7)){
   let candidates=[];for(let i=0;i<7;i++){let k=addDays(wk,i);if(k<start||k>end)continue;if(o[k]?.action==='skip')continue;let sc=recoveryScore(k);if(Number.isFinite(sc))candidates.push({k,sc})}
   candidates.sort((a,b)=>b.sc-a.sc||a.k.localeCompare(b.k));let picked=[];
   for(const c of candidates){if(picked.length>=3)break;if([...selected,...picked].every(x=>Math.abs(diffDays(c.k,x))>1))picked.push(c.k)}
   let optional=candidates.find(c=>c.sc>=10&&!picked.includes(c.k)&&[...selected,...picked].every(x=>Math.abs(diffDays(c.k,x))>1));
   selected.push(...picked);if(optional)selected.push(optional.k);selected.sort();
 }
 for(const [k,v] of Object.entries(o))if(v.action==='train'&&k>=start&&k<=end&&!selected.includes(k))selected.push(k);
 return [...new Set(selected)].sort();
}
function scheduleWindow(centerStart,centerEnd){let start=addDays(monOf(centerStart),-7),end=addDays(monOf(centerEnd),13);return suggestedTrainingDates(start,end)}
function projectedWorkoutIndex(k){let comp=completedOn(k);if(comp)return comp.workoutIndex;let today=dkey(),base=k<today?addDays(k,-35):today,dates=suggestedTrainingDates(base,addDays(k,1)).filter(x=>x>=base&&x<=k),start=dueWorkoutIndex(base);let ix=dates.indexOf(k);return ix<0?dueWorkoutIndex(k):(start+ix)%4}
function isScheduled(k){return suggestedTrainingDates(addDays(k,-8),addDays(k,8)).includes(k)}
function freezePastSnapshots(){if(!profile())return;let s=snapshots(),today=dkey(),dates=suggestedTrainingDates(addDays(today,-35),today);for(const k of dates)if(k<=today&&!s[k])s[k]={planned:true,workoutIndex:completedOn(k)?.workoutIndex??projectedWorkoutIndex(k),frozenAt:new Date().toISOString()};for(const h of history())if(h.completed&&!s[h.date])s[h.date]={planned:true,workoutIndex:h.workoutIndex,frozenAt:h.completedAt};saveSnapshots(s)}
