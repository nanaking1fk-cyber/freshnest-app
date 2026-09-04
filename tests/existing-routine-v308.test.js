// Regression coverage for bring-your-own-routine scheduling and mobile cinema.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('onboarding offers an existing-routine path and preserves raw schedule input',()=>{
  const guided=read('work-gym-planner-v16/guided-onboarding-v18.js');
  const planner=read('work-gym-planner-v16/onboarding-v18.js');
  assert.match(guided,/I already have a routine/);
  assert.match(guided,/We schedule and track it—we do not replace it/);
  assert.match(guided,/function parseTrainingRoutine/);
  assert.match(guided,/existingRoutineText:get\('existingRoutine'\)/);
  assert.match(planner,/pr\.trainingMode=a\.training\.mode\|\|'adaptive'/);
  assert.match(planner,/pr\.existingRoutine=pr\.trainingMode==='existing'/);
  assert.match(planner,/Your existing routine — kept exactly as entered/);
});

test('existing routines drive calendar dates and names instead of adaptive assignment',()=>{
  const commercial=read('work-gym-planner-v16/commercial-v17.js');
  const calendar=read('work-gym-planner-v16/calendar.js');
  const today=read('work-gym-planner-v16/today.js');
  assert.match(commercial,/function existingRoutineOn\(k\)/);
  assert.match(commercial,/p\.trainingMode==='existing'&&p\.existingRoutine\?\.length/);
  assert.match(commercial,/function plannedWorkoutName\(k/);
  assert.match(calendar,/plannedWorkoutName/);
  assert.match(calendar,/your routine/);
  assert.match(today,/plannedWorkoutName/);
});

test('existing-routine logging never requires the built-in exercise program',()=>{
  const training=read('work-gym-planner-v16/training-b.js');
  const history=read('work-gym-planner-v16/training-history-v1610.js');
  assert.match(training,/function renderOwnRoutineTraining\(root\)/);
  assert.match(training,/It does not replace your program or assign exercises/);
  assert.match(training,/customRoutine:true/);
  assert.match(training,/exercises:comp\?\.exercises\|\|\[\]/);
  assert.match(history,/s\.customWorkoutName/);
});

test('phone welcome keeps the example in normal flow without covering signup',()=>{
  const css=read('work-gym-planner-v16/landing-v29.css');
  const phone=css.slice(css.indexOf('@media(max-width:780px)'));
  assert.ok(phone.includes('.ww29Hero{grid-template-columns:1fr'));
  assert.ok(phone.includes('.ww29Preview{padding:24px'));
  assert.ok(!phone.includes('position:absolute'));
});
