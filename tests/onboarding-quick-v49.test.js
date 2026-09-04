const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
const source=read('work-gym-planner-v16/guided-onboarding-v18.js');
const DRAFT='wgp-v15-guided-onboarding-draft-v30';
function storage(initial={}){const values=new Map(Object.entries(initial));return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}}
function harness({saved=null,previous=null,profile=null}={}){
 const elements=new Map(),opened=[],applied=[];
 function el(id){if(!elements.has(id)){const classes=new Set();elements.set(id,{dataset:{},style:{},textContent:'',innerHTML:'',classList:{add:key=>classes.add(key),remove:key=>classes.delete(key),contains:key=>classes.has(key),toggle:(key,on)=>on?classes.add(key):classes.delete(key)}})}return elements.get(id)}
 const context={PREFIX:'wgp-v15-',localStorage:storage(saved?{[DRAFT]:JSON.stringify(saved)}:{}),sessionStorage:storage(),profile:()=>profile,jget:()=>previous?{answers:previous}:null,
 document:{getElementById:id=>id==='startOnboardingAccount'?null:el(id),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},documentElement:{}},MutationObserver:class{observe(){}},CustomEvent:class{},dispatchEvent(){},setTimeout(){},requestAnimationFrame(){},matchMedia:()=>({matches:false}),
 openModal:id=>opened.push(id),closeModal(){},WGC18:{config:{cloudConfigured:false,aiConfigured:false},buildDeterministicPlan:()=>({training:{days:[]},nutrition:{}}),applyPersonalizedPlan:(answers,plan)=>applied.push({answers,plan}),pushState:()=>Promise.resolve()}};
 context.window=context;vm.createContext(context);
 // Expose lexical helpers only inside this test, while executing the real module.
 vm.runInContext(source.replace('  A.openOnboarding=openGuided;',`  A.test={quickScreens,activeScreens,goNext,set,showPreview,readDraft:()=>draft};\n  A.openOnboarding=openGuided;`),context);
 return{A:context.WGC18,context,el,opened,applied};
}
function legacy(step,workMode='standard'){return{version:2,step,values:{name:'Alex',age:'30',heightFt:'5',heightIn:'8',weight:'160',goal:'maintain',workMode,jobStart:'09:00',jobEnd:'17:00',secondJob:'no',trainingMode:'adaptive',sleepHours:'8',restrictions:'No peanuts',foods:'rice, beans',experience:'advanced'},days:{job:[1,2,3,4,5],second:[]}}}
test('shift-based onboarding leads directly to the work calendar setup',()=>{
 assert.match(source,/next\.textContent=answers\.work\.scheduleDeferred\?'Add my work schedule'/);
 assert.match(source,/if\(answers\.work\.scheduleDeferred\)\{window\.WWCalendarV42\?\.openAdd\('workmenu'\)/);
 assert.match(source,/Workout times are provisional until your work schedule is added/);
 const h=harness(),calls=[];h.context.WWCalendarV42={openAdd:kind=>calls.push(kind)};h.context.openCalendarDate=()=>calls.push('calendar');
 h.A.test.showPreview({basics:{name:'Alex'},training:{mode:'adaptive'},work:{scheduleDeferred:true}},{},false);
 assert.equal(h.el('guidedNext').textContent,'Add my work schedule');h.el('guidedNext').onclick();
 assert.deepEqual(calls,['calendar','workmenu']);
});

test('onboarding always has three steps, regardless of work or training mode',()=>{
 const h=harness();h.A.openOnboarding();
 for(const work of ['standard','rotating','none','calendar'])for(const training of ['adaptive','existing']){
  h.A.test.set('workMode',work);h.A.test.set('trainingMode',training);
  assert.deepEqual(Array.from(h.A.test.activeScreens(),s=>s.id),['quick-basics','quick-work','quick-training']);
 }
 assert.equal(h.el('guidedStepLabel').textContent,'Step 1 of 3');
});

test('optional questions are absent from quick start but available in explicit plan settings',()=>{
 const h=harness();h.A.openOnboarding();
 const markup=h.A.test.quickScreens.map(s=>s.render()).join('');
 for(const field of ['sex','bodyFat','activity','sleepHours','bedtime','commute','secondJob','foods','cuisines','restrictions','experience','limitations']){
  assert.ok(!markup.includes('data-answer="'+field+'"'),field);
  assert.ok(!markup.includes('data-choice-field="'+field+'"'),field);
 }
 h.A.openPlanSettings();assert.ok(h.A.test.activeScreens().some(s=>s.id==='nutrition'));
 assert.match(source,/guidedProfileDetails.*More plan settings/);
 assert.match(source,/guidedProfileDetails'\).onclick=.*openGuided\(\{details:true\}\)/);
 assert.match(source,/morePlanSettingsV49'\).onclick=.*openGuided\(\{details:true\}\)/);
});

test('old drafts map to the right new step without losing answers',()=>{
 for(const [oldStep,newStep] of [[0,0],[1,0],[2,1],[3,1],[4,1],[5,2],[6,2],[7,2]]){
  const h=harness({saved:legacy(oldStep)});h.A.openOnboarding();const saved=h.A.test.readDraft();
  assert.equal(saved.step,newStep);assert.equal(saved.flow,'quick-v49');
  assert.equal(saved.values.restrictions,'No peanuts');assert.equal(saved.values.sleepHours,'8');
  assert.deepEqual(Array.from(saved.days.job),[1,2,3,4,5]);
 }
});

test('quick drafts resume at the same step, and settings drafts return to the matching quick section',()=>{
 const saved={...legacy(1),flow:'quick-v49',screenId:'quick-work'};
 const h=harness({saved});h.A.openOnboarding();assert.equal(h.el('guidedStepLabel').textContent,'Step 2 of 3');
 h.A.openPlanSettings();assert.equal(h.A.test.activeScreens()[h.A.test.readDraft().step].id,'workMode');
 h.A.openOnboarding();assert.equal(h.el('guidedStepLabel').textContent,'Step 2 of 3');
});

test('new accounts can defer work without invented shifts, while saved optional answers survive',()=>{
 const h=harness();h.A.openOnboarding();const answers=h.A.onboardingAnswers();
 assert.equal(answers.work.scheduleDeferred,true);assert.equal(answers.work.primaryDays.length,0);assert.equal(answers.work.primaryStart,'');assert.equal(answers.training.experience,'beginner');
 const old=harness({saved:legacy(0)});old.A.openOnboarding();const restored=old.A.onboardingAnswers();
 assert.equal(restored.nutrition.restrictions,'No peanuts');assert.equal(restored.basics.sleepHours,8);assert.equal(restored.training.experience,'advanced');
 assert.deepEqual(Array.from(restored.nutrition.foods),['rice','beans']);
});

test('saved second jobs and personal routines are kept without extra required screens',()=>{
 const saved=legacy(6);Object.assign(saved.values,{secondJob:'yes',secondStart:'18:00',secondEnd:'21:00',trainingMode:'existing',existingRoutine:'Mon 18:00 Push\nWed 18:00 Pull',duration:'45'});saved.days.second=[6];
 const h=harness({saved});h.A.openOnboarding();const answers=h.A.onboardingAnswers();
 assert.equal(answers.work.secondaryEnabled,true);assert.deepEqual(Array.from(answers.work.secondaryDays),[6]);
 assert.equal(answers.training.existingRoutine.length,2);assert.equal(answers.training.existingRoutine[0].name,'Push');assert.equal(answers.training.existingRoutine[0].end,'18:45');
 assert.equal(h.A.test.activeScreens().length,3);
});

test('legacy profiles retain training preferences even without saved questionnaire answers',()=>{
 const h=harness({profile:{name:'Alex',heightIn:68,trainingExperience:'advanced',trainingDuration:45,trainingPreferred:'evening',trainingLimitations:'Avoid jumping'}});h.A.openOnboarding();const answers=h.A.onboardingAnswers();
 assert.equal(answers.basics.heightFt,5);assert.equal(answers.basics.heightIn,8);assert.equal(answers.training.experience,'advanced');assert.equal(answers.training.duration,45);assert.equal(answers.training.limitations,'Avoid jumping');
});

test('resuming at the final step cannot bypass required measurements',async()=>{
 const saved=legacy(7);saved.values.age='';const h=harness({saved});h.A.openOnboarding();await h.A.test.goNext();
 assert.equal(h.applied.length,0);assert.equal(h.el('guidedStepLabel').textContent,'Step 1 of 3');assert.match(h.el('guidedStatus').textContent,/age, height and weight/);
});

test('valid quick setup builds once after exactly three steps',async()=>{
 const h=harness({saved:legacy(0,'calendar')});h.A.openOnboarding();await h.A.test.goNext();assert.equal(h.el('guidedStepLabel').textContent,'Step 2 of 3');
 await h.A.test.goNext();assert.equal(h.el('guidedStepLabel').textContent,'Step 3 of 3');assert.equal(h.applied.length,0);
 await h.A.test.goNext();assert.equal(h.applied.length,1);assert.equal(h.el('guidedStepLabel').textContent,'Your plan preview');
 assert.match(h.el('guidedStatus').textContent,/Add your work schedule in Calendar/);
 assert.equal(h.context.localStorage.getItem(DRAFT),null);
});

test('cloud restore and password recovery still block both onboarding entry points',()=>{
 for(const entry of ['openOnboarding','openPlanSettings']){
  const h=harness();h.A.session={user:{id:'test'}};h.A.canStartOnboarding=()=>false;h.A[entry]();assert.equal(h.opened.length,0);
  h.A.canStartOnboarding=()=>true;h.A.passwordRecovery=true;h.A[entry]();assert.equal(h.opened.length,0);
 }
});
test('signed-in quick setup never starts an unsolicited AI refinement',async()=>{
 const h=harness({saved:legacy(0,'calendar')});h.A.session={user:{id:'fixture'}};h.A.config={aiConfigured:true};h.A.canStartOnboarding=()=>true;
 h.A.authedFetch=()=>assert.fail('initial setup must not call AI');
 h.A.openOnboarding();await h.A.test.goNext();await h.A.test.goNext();await h.A.test.goNext();
 assert.equal(h.applied.length,1);assert.doesNotMatch(h.el('guidedStatus').textContent,/refining/);
});

test('a late automatic startup cannot interrupt an already open setup or clear its validation',()=>{
 const h=harness();h.A.openOnboarding();h.el('guidedOnboarding').classList.add('open');
 h.el('guidedStatus').textContent='Check your age, height and weight to continue.';
 h.A.openOnboarding({auto:true});
 assert.equal(h.opened.length,1);assert.match(h.el('guidedStatus').textContent,/age, height and weight/);
});

test('production and offline loaders ship the three-step flow and its scoped styles',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){
  const text=read(file);assert.match(text,/assetRevision='30\.1\.31-scan70'/);assert.ok(text.includes('guided-onboarding-v18.js'));assert.ok(text.includes('app-v30.css?v=30.1.31-scan70'));
 }
 for(const file of ['work-gym-planner/shell.html','work-gym-planner/sw.js','work-gym-planner-v16/sw.js','work-gym-planner-v16/pwa-patch.js'])assert.ok(read(file).includes('30.1.31-scan70'));
 const css=read('work-gym-planner-v16/app-v30.css');assert.match(css,/body\.premiumV30 #guidedOnboarding\.guidedQuickV49 \.guidedFieldGrid/);
});
