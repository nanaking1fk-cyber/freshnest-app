// v30 turns the authenticated product into a focused workspace instead of
// exposing every control and every insight at once.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const shell=read('work-gym-planner/index.html');
const script=read('work-gym-planner-v16/app-v30.js');
const css=read('work-gym-planner-v16/app-v30.css');

test('v30 assets load last and are available offline',()=>{
  const css29=shell.indexOf('app-v29.css');
  const css30=shell.indexOf('app-v30.css');
  const js29=shell.indexOf("'app-v29.js'");
  const js30=shell.indexOf("'app-v30.js'");
  assert.ok(css30>css29,'v30 CSS must override the older shell');
  assert.ok(js30>js29,'v30 behavior must run after the older shell');
  assert.match(read('work-gym-planner/sw.js'),/app-v30\.css/);
  assert.match(read('work-gym-planner/sw.js'),/app-v30\.js/);
  assert.match(script,/ensureStylesLast\(\)/,
    'the runtime must restore v30 after the legacy theme moves its stylesheet');
});

test('the release version is consistent',()=>{
  assert.match(shell,/Loading Work \+ Workout 30\.0\.2/);
  assert.equal(JSON.parse(read('package.json')).version,'30.0.2');
  assert.match(read('work-gym-planner/manifest.webmanifest'),/\?v=30\.0\.2/);
});

test('training opens one exercise at a time',()=>{
  assert.match(script,/setExerciseState\(card,index===0\)/);
  assert.match(script,/cards\.forEach\(function\(other\)\{if\(other!==card\)setExerciseState\(other,false\)\}\)/);
  assert.match(css,/\.exerciseCard\.v30Collapsed>:not\(\.exerciseHead\)/);
});

test('secondary training analytics are available without dominating the session',()=>{
  assert.match(script,/trainingInsightsToggleV30/);
  assert.match(script,/v30InsightsOpen/);
  assert.match(css,/#trainingRoot:not\(\.v30InsightsOpen\)>\.muscleCard/);
  assert.match(css,/#trainingRoot:not\(\.v30InsightsOpen\)>#completedWorkoutHistory/);
  assert.match(script,/actions\.insertAdjacentElement\('afterend',stats\)/,
    'training statistics belong after the workout actions, not above exercise one');
});

test('nutrition shows essentials before detailed limits and meal templates',()=>{
  assert.match(script,/macroToggleV30/);
  assert.match(script,/nutritionPlanToggleV30/);
  assert.match(css,/\.v30MacroCompact:not\(\.v30MacroOpen\) \.macroLine:nth-child\(n\+5\)/);
  assert.match(css,/#personalNutritionPlan\.v30PlanCompact/);
});

test('settings are grouped by user intent',()=>{
  for(const heading of ['Plan & coaching','Health & progress','Account & data','Help & legal'])
    assert.ok(script.includes(heading),`${heading} group is required`);
  assert.match(css,/\.menuCardsV30\{display:grid/);
});

test('mobile and desktop get purpose-built navigation',()=>{
  assert.match(css,/@media\(min-width:1024px\)/);
  assert.match(css,/\.bottomNavV30::before/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.hvStrip\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
