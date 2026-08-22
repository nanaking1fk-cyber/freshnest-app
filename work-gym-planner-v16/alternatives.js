// Exercise alternatives / equipment-aware swaps ----------------------------
// v16.8: lets each workout slot use an equivalent exercise without mixing
// progression histories between different movements.
const ALT_PREF_KEY='wgp-exercise-alternative-prefs-v1';
const EXERCISE_ALTERNATIVES={
 'Hack Squat':['Smith Machine Squat','Barbell Back Squat','Goblet Squat','Belt Squat'],
 'Romanian Deadlift':['Dumbbell Romanian Deadlift','Smith Romanian Deadlift','Barbell Romanian Deadlift','Cable Pull-Through'],
 'Leg Press':['Belt Squat','Smith Machine Squat','Goblet Squat','Bulgarian Split Squat'],
 'Seated Leg Curl':['Lying Leg Curl','Standing Leg Curl','Nordic Hamstring Curl','Stability-Ball Leg Curl'],
 'Leg Extension':['Single-Leg Leg Extension','Reverse Nordic Curl','Spanish Squat','Sissy Squat'],
 'Standing Calf Raise':['Smith Calf Raise','Leg Press Calf Raise','Dumbbell Standing Calf Raise','Seated Calf Raise'],
 'Cable Crunch':['Machine Ab Crunch','Weighted Decline Crunch','Weighted Floor Crunch','Hanging Knee Raise'],
 'Incline Dumbbell Press':['Incline Barbell Press','Incline Smith Press','Incline Machine Press','Feet-Elevated Push-Up'],
 'Chest-Supported Row':['Seated Cable Row','Machine Row','One-Arm Dumbbell Row','Barbell Row'],
 'Lat Pulldown':['Assisted Pull-Up','Pull-Up','Single-Arm Lat Pulldown','Machine High Row'],
 'Machine Chest Press':['Flat Dumbbell Press','Barbell Bench Press','Smith Bench Press','Push-Up'],
 'Cable Lateral Raise':['Dumbbell Lateral Raise','Machine Lateral Raise','Leaning Cable Lateral Raise'],
 'Rope Triceps Pressdown':['Straight-Bar Pressdown','Single-Arm Cable Pressdown','Assisted Dip','Close-Grip Push-Up'],
 'Preacher Curl':['Incline Dumbbell Curl','Cable Curl','Hammer Curl','Machine Curl'],
 'Smith Machine Squat':['Barbell Back Squat','Hack Squat','Leg Press','Goblet Squat'],
 'Hip Thrust':['Barbell Hip Thrust','Smith Hip Thrust','Glute Bridge','Cable Pull-Through'],
 'Bulgarian Split Squat':['Reverse Lunge','Walking Lunge','Step-Up','Single-Leg Press'],
 'Lying Leg Curl':['Seated Leg Curl','Standing Leg Curl','Nordic Hamstring Curl','Stability-Ball Leg Curl'],
 'Seated Calf Raise':['Standing Calf Raise','Leg Press Calf Raise','Dumbbell Seated Calf Raise','Smith Calf Raise'],
 'Hanging Knee Raise':['Captain’s-Chair Knee Raise','Reverse Crunch','Cable Crunch','Weighted Crunch'],
 'Flat Bench / Machine Press':['Flat Dumbbell Press','Barbell Bench Press','Smith Bench Press','Machine Chest Press','Push-Up'],
 'Neutral-Grip Lat Pulldown':['Neutral-Grip Pull-Up','Assisted Neutral-Grip Pull-Up','Single-Arm Lat Pulldown','Machine High Row'],
 'Seated DB Shoulder Press':['Machine Shoulder Press','Smith Shoulder Press','Standing Dumbbell Press','Arnold Press'],
 'Seated Cable Row':['Chest-Supported Row','Machine Row','One-Arm Dumbbell Row','Barbell Row'],
 'Incline Cable Fly':['Pec Deck','Dumbbell Fly','Standing Cable Fly','Push-Up'],
 'Lateral Raise':['Cable Lateral Raise','Machine Lateral Raise','Dumbbell Lateral Raise'],
 'Incline DB Curl':['Preacher Curl','Cable Curl','Hammer Curl','Machine Curl'],
 'Overhead Cable Triceps Extension':['Dumbbell Overhead Triceps Extension','EZ-Bar Skull Crusher','Rope Triceps Pressdown','Single-Arm Overhead Cable Extension']
};
const EQUIPMENT_LABELS={
 'Hack Squat':'Hack machine','Smith Machine Squat':'Smith machine','Barbell Back Squat':'Barbell + rack','Goblet Squat':'Dumbbell','Belt Squat':'Belt-squat machine',
 'Romanian Deadlift':'Barbell','Dumbbell Romanian Deadlift':'Dumbbells','Smith Romanian Deadlift':'Smith machine','Barbell Romanian Deadlift':'Barbell','Cable Pull-Through':'Cable',
 'Leg Press':'Leg-press machine','Bulgarian Split Squat':'Dumbbells / bodyweight','Seated Leg Curl':'Leg-curl machine','Lying Leg Curl':'Leg-curl machine','Standing Leg Curl':'Leg-curl machine','Nordic Hamstring Curl':'Bodyweight / anchor','Stability-Ball Leg Curl':'Stability ball',
 'Leg Extension':'Leg-extension machine','Single-Leg Leg Extension':'Leg-extension machine','Reverse Nordic Curl':'Bodyweight','Spanish Squat':'Band / cable','Sissy Squat':'Bodyweight / support',
 'Standing Calf Raise':'Calf machine','Smith Calf Raise':'Smith machine','Leg Press Calf Raise':'Leg press','Dumbbell Standing Calf Raise':'Dumbbells','Seated Calf Raise':'Seated calf machine','Dumbbell Seated Calf Raise':'Dumbbells',
 'Cable Crunch':'Cable','Machine Ab Crunch':'Ab machine','Weighted Decline Crunch':'Bench + weight','Weighted Floor Crunch':'Weight plate / dumbbell','Hanging Knee Raise':'Pull-up bar','Captain’s-Chair Knee Raise':'Captain’s chair','Reverse Crunch':'Bodyweight','Weighted Crunch':'Weight plate / dumbbell',
 'Incline Dumbbell Press':'Dumbbells + bench','Incline Barbell Press':'Barbell + bench','Incline Smith Press':'Smith + bench','Incline Machine Press':'Press machine','Feet-Elevated Push-Up':'Bodyweight',
 'Chest-Supported Row':'Machine / bench + dumbbells','Seated Cable Row':'Cable','Machine Row':'Row machine','One-Arm Dumbbell Row':'Dumbbell + bench','Barbell Row':'Barbell',
 'Lat Pulldown':'Cable / pulldown','Assisted Pull-Up':'Assisted pull-up machine','Pull-Up':'Pull-up bar','Single-Arm Lat Pulldown':'Cable','Machine High Row':'High-row machine','Neutral-Grip Lat Pulldown':'Cable / pulldown','Neutral-Grip Pull-Up':'Pull-up bar','Assisted Neutral-Grip Pull-Up':'Assisted pull-up machine',
 'Machine Chest Press':'Chest-press machine','Flat Dumbbell Press':'Dumbbells + bench','Barbell Bench Press':'Barbell + bench','Smith Bench Press':'Smith + bench','Push-Up':'Bodyweight','Flat Bench / Machine Press':'Bench / press machine',
 'Cable Lateral Raise':'Cable','Dumbbell Lateral Raise':'Dumbbells','Machine Lateral Raise':'Lateral-raise machine','Leaning Cable Lateral Raise':'Cable','Lateral Raise':'Dumbbells',
 'Rope Triceps Pressdown':'Cable + rope','Straight-Bar Pressdown':'Cable + bar','Single-Arm Cable Pressdown':'Cable','Assisted Dip':'Assisted-dip machine','Close-Grip Push-Up':'Bodyweight',
 'Preacher Curl':'Preacher bench / machine','Incline Dumbbell Curl':'Dumbbells + bench','Cable Curl':'Cable','Hammer Curl':'Dumbbells','Machine Curl':'Curl machine','Incline DB Curl':'Dumbbells + bench',
 'Hip Thrust':'Hip-thrust setup','Barbell Hip Thrust':'Barbell + bench','Smith Hip Thrust':'Smith + bench','Glute Bridge':'Barbell / bodyweight',
 'Reverse Lunge':'Dumbbells / barbell','Walking Lunge':'Dumbbells / bodyweight','Step-Up':'Box + dumbbells','Single-Leg Press':'Leg press',
 'Seated DB Shoulder Press':'Dumbbells + bench','Machine Shoulder Press':'Shoulder-press machine','Smith Shoulder Press':'Smith + bench','Standing Dumbbell Press':'Dumbbells','Arnold Press':'Dumbbells',
 'Incline Cable Fly':'Cable + bench','Pec Deck':'Pec-deck machine','Dumbbell Fly':'Dumbbells + bench','Standing Cable Fly':'Cable',
 'Overhead Cable Triceps Extension':'Cable','Dumbbell Overhead Triceps Extension':'Dumbbell','EZ-Bar Skull Crusher':'EZ bar + bench','Single-Arm Overhead Cable Extension':'Cable'
};
const ALT_INCREMENT_OVERRIDES={
 'Goblet Squat':5,'Dumbbell Romanian Deadlift':5,'Standing Leg Curl':2.5,'Nordic Hamstring Curl':0,'Stability-Ball Leg Curl':0,'Reverse Nordic Curl':0,'Spanish Squat':0,'Sissy Squat':0,
 'Dumbbell Standing Calf Raise':5,'Weighted Floor Crunch':5,'Hanging Knee Raise':0,'Captain’s-Chair Knee Raise':0,'Reverse Crunch':0,
 'Feet-Elevated Push-Up':0,'Assisted Pull-Up':5,'Pull-Up':0,'Neutral-Grip Pull-Up':0,'Assisted Neutral-Grip Pull-Up':5,'Push-Up':0,'Close-Grip Push-Up':0,
 'Dumbbell Lateral Raise':2.5,'Machine Lateral Raise':2.5,'Leaning Cable Lateral Raise':2.5,'Cable Lateral Raise':2.5,
 'Single-Arm Cable Pressdown':2.5,'Hammer Curl':2.5,'Cable Curl':2.5,'Machine Curl':2.5,'Incline Dumbbell Curl':2.5,
 'Glute Bridge':10,'Reverse Lunge':5,'Walking Lunge':5,'Step-Up':5,'Dumbbell Seated Calf Raise':5,
 'Standing Dumbbell Press':5,'Arnold Press':5,'Dumbbell Fly':2.5,'Standing Cable Fly':2.5,'Pec Deck':5,
 'Dumbbell Overhead Triceps Extension':2.5,'EZ-Bar Skull Crusher':5,'Single-Arm Overhead Cable Extension':2.5
};
function altPrefs(){try{return JSON.parse(localStorage.getItem(ALT_PREF_KEY)||'{}')}catch{return{}}}
function saveAltPrefs(x){localStorage.setItem(ALT_PREF_KEY,JSON.stringify(x))}
function exerciseOptions(base){return [base.name,...(EXERCISE_ALTERNATIVES[base.name]||[])].filter((x,i,a)=>a.indexOf(x)===i)}
function equipmentFor(name){return EQUIPMENT_LABELS[name]||'Equivalent equipment'}
function activeExerciseMeta(base,name){return {...base,name:name||base.name,inc:Object.prototype.hasOwnProperty.call(ALT_INCREMENT_OVERRIDES,name)?ALT_INCREMENT_OVERRIDES[name]:base.inc}}
function preferredExerciseName(wi,ei,base){let p=altPrefs(),name=p[wi+':'+ei];return exerciseOptions(base).includes(name)?name:base.name}
function priorWeightFor(name,k){let ex=exposures(name,k)[0]?.ex;return ex?.sets?.find(z=>+z.w)?.w||''}
function makeVariantSets(meta,k,stored=null){if(stored?.length)return structuredClone(stored);let count=typeof prescribedSets==='function'?prescribedSets(meta,k):meta.sets,guess=priorWeightFor(meta.name,k);return Array.from({length:count},()=>({w:guess,r:'',rir:''}))}

// Fix prior-weight prefill and allow a remembered alternative per workout slot.
const _baseSessionDraft=sessionDraft;
sessionDraft=function(k,wi){
 let ds=drafts();if(ds[k]&&ds[k].workoutIndex===wi)return ds[k];
 let done=completedOn(k);if(done)return structuredClone(done);
 let w=WORKOUTS[wi],variantSets={};
 let ex=w.ex.map((base,ei)=>{let name=preferredExerciseName(wi,ei,base),meta=activeExerciseMeta(base,name);return{name,baseName:base.name,sets:makeVariantSets(meta,k)}});
 return{id:uid('session'),date:k,workoutIndex:wi,completed:false,phase:typeof phaseInfo==='function'?phaseInfo(k):null,variantSets,exercises:ex};
};

// Save the selected variation name with the set data.
collectTrainingInputs=function(k,wi){
 let s=sessionDraft(k,wi),w=WORKOUTS[wi];s.variantSets=s.variantSets||{};
 s.exercises=w.ex.map((base,ei)=>{let old=s.exercises[ei]||{},sel=document.querySelector(`[data-exercise-swap="${ei}"]`),name=sel?.value||old.name||base.name,count=old.sets?.length||base.sets,sets=Array.from({length:count},(_,si)=>({w:$(`[data-e="${ei}"][data-s="${si}"][data-f="w"]`)?.value||'',r:$(`[data-e="${ei}"][data-s="${si}"][data-f="r"]`)?.value||'',rir:$(`[data-e="${ei}"][data-s="${si}"][data-f="rir"]`)?.value||''}));s.variantSets[ei+':'+name]=structuredClone(sets);return{name,baseName:base.name,sets}});return s;
};

function swapExerciseVariation(ei,newName){
 if(trainingDate==null)return;let wi=completedOn(trainingDate)?.workoutIndex??projectedWorkoutIndex(trainingDate),w=WORKOUTS[wi],base=w.ex[ei],s=collectTrainingInputs(trainingDate,wi),old=s.exercises[ei];s.variantSets=s.variantSets||{};
 if(old?.name)s.variantSets[ei+':'+old.name]=structuredClone(old.sets||[]);
 let meta=activeExerciseMeta(base,newName),stored=s.variantSets[ei+':'+newName];s.exercises[ei]={name:newName,baseName:base.name,sets:makeVariantSets(meta,trainingDate,stored)};
 let p=altPrefs();p[wi+':'+ei]=newName;saveAltPrefs(p);let d=drafts();d[trainingDate]=s;saveDrafts(d);renderTraining();toast(`${newName} selected`);
}

// Include alternatives in strength-chart selection.
allExerciseNames=function(){return [...new Set(WORKOUTS.flatMap(w=>w.ex.flatMap(e=>exerciseOptions(e))))]};

// Render the existing training screen with the active variation metadata, then
// add a native selector to each exercise card. This keeps all existing training
// features intact while making history/coaching variation-specific.
const _renderTrainingWithoutAlternatives=renderTraining;
renderTraining=function(){
 if(!profile())return _renderTrainingWithoutAlternatives();
 if(!trainingDate)trainingDate=initialTrainingDate();
 let wi=completedOn(trainingDate)?.workoutIndex??projectedWorkoutIndex(trainingDate),w=WORKOUTS[wi],s=sessionDraft(trainingDate,wi),original=w.ex.map(x=>({...x}));
 try{
  w.ex=w.ex.map((base,ei)=>activeExerciseMeta(base,s.exercises[ei]?.name||base.name));
  _renderTrainingWithoutAlternatives();
  let cards=[...document.querySelectorAll('#trainingSwipe .exerciseCard')];
  cards.forEach((card,ei)=>{let base=original[ei],current=s.exercises[ei]?.name||base.name,opts=exerciseOptions(base);if(opts.length<2)return;let wrap=document.createElement('div');wrap.className='exerciseSwapWrap';wrap.innerHTML=`<label><span>Exercise option</span><select data-exercise-swap="${ei}" aria-label="Alternative for ${esc(base.name)}">${opts.map(n=>`<option value="${esc(n)}" ${n===current?'selected':''}>${esc(n)} · ${esc(equipmentFor(n))}</option>`).join('')}</select></label><small>Swap equipment without changing the workout's muscle-group goal. Progress is tracked separately for each variation.</small>`;let head=card.querySelector('.exerciseHead');head?.insertAdjacentElement('afterend',wrap);wrap.querySelector('select').onchange=e=>swapExerciseVariation(ei,e.target.value)});
 }finally{w.ex=original}
};

// Keep selector styling self-contained so this upgrade does not depend on a
// stylesheet cache refresh.
(function(){let st=document.createElement('style');st.textContent=`.exerciseSwapWrap{margin:9px 0 10px;padding:9px 10px;border:1px solid var(--line);background:var(--chip);border-radius:11px}.exerciseSwapWrap label{display:flex;align-items:center;justify-content:space-between;gap:8px}.exerciseSwapWrap label span{font-size:10px;font-weight:900;color:var(--muted);white-space:nowrap}.exerciseSwapWrap select{min-width:0;width:68%;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:9px;padding:8px 9px;font-size:11px;font-weight:800}.exerciseSwapWrap small{display:block;margin-top:6px;font-size:8.5px;line-height:1.35;color:var(--muted)}@media(max-width:430px){.exerciseSwapWrap label{display:block}.exerciseSwapWrap label span{display:block;margin-bottom:5px}.exerciseSwapWrap select{width:100%}}`;document.head.appendChild(st)})();
