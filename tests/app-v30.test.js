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

test('the premium brand uses one scalable mark instead of text initials',()=>{
  const landing=read('work-gym-planner-v16/landing-v29.js');
  const landingCss=read('work-gym-planner-v16/landing-v29.css');
  const worker=read('work-gym-planner/sw.js');
  const mark=read('work-gym-planner-v16/icons/brand-mark.svg');
  assert.match(landing,/icons\/brand-mark\.svg/);
  assert.match(landing,/function brandMark\(\)/);
  assert.match(landingCss,/\.ww29BrandMark img/);
  assert.match(css,/homeDashV27 \.hvBrand::before[\s\S]*icons\/brand-mark\.svg/);
  assert.match(css,/bottomNavV30::before[\s\S]*icons\/brand-mark\.svg/);
  assert.doesNotMatch(css,/bottomNavV30::before\{[\s\S]{0,180}content:"W\+W"/);
  assert.match(mark,/stroke="#F4F7F0"/);
  assert.match(mark,/stroke="#D6FF3F"/);
  assert.match(worker,/icons\/brand-mark\.svg/);
});

test('the release version is consistent',()=>{
  assert.match(shell,/30\.1\.7/);
  assert.equal(JSON.parse(read('package.json')).version,'30.1.7');
  assert.match(read('work-gym-planner/manifest.webmanifest'),/\?v=30\.1\.7/);
  assert.match(script,/Work \+ Workout \| Health planned around work/);
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

test('calendar intake is mounted by the production schedule module',()=>{
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  const plannerCss=read('work-gym-planner-v16/schedule-platform-v25.css');
  assert.match(planner,/function captureMarkup\(\)/);
  assert.match(planner,/id="smartCaptureInput"/);
  assert.match(planner,/id="smartCaptureBuild"/);
  assert.match(planner,/ensureCapture\(\)/,
    'the Add workspace must create its own capture surface instead of depending on an unloaded legacy module');
  assert.match(plannerCss,/#plannerPane-add>\.smartCaptureV19/);
});

test('all planner tools remain visible on phones without a floating coach collision',()=>{
  assert.match(css,/@media\(max-width:760px\)[\s\S]*plannerTabsV25\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css,/plannerTabsV25 button:nth-child\(-n\+3\)\{grid-column:span 2\}/);
  assert.match(css,/plannerTabsV25 button:nth-child\(n\+4\)\{grid-column:span 3\}/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.aiCoachFab,[\s\S]*\.coachFab\{display:none!important\}/);
});

test('planner tabs expose keyboard and panel relationships',()=>{
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(planner,/aria-controls="plannerPane-calendar"/);
  assert.match(planner,/aria-labelledby="plannerTab-add" hidden/);
  assert.match(planner,/event\.key==='ArrowRight'/);
  assert.match(planner,/pane\.hidden=!active/);
});

test('guided onboarding owns a complete responsive layout',()=>{
  assert.match(css,/\.guidedOnboardingSheet\{[\s\S]*display:grid/,
    'the onboarding sheet must not fall back to the legacy block layout');
  assert.match(css,/\.guidedQuestionIcon svg\{[\s\S]*width:24px;[\s\S]*height:24px/,
    'the onboarding icon must stay constrained on phones');
  assert.match(css,/\.guidedChoice\{[\s\S]*display:grid/,
    'answer choices must remain readable cards');
  assert.match(css,/#guidedOnboardingBody\{[\s\S]*overflow-y:auto/,
    'questions should scroll independently of the fixed actions');
  assert.match(css,/@media\(max-width:700px\)[\s\S]*grid-template-rows:96px minmax\(0,1fr\)/,
    'mobile onboarding needs an explicit viewport-safe composition');
  assert.match(css,/@media\(max-width:700px\) and \(max-height:700px\)/,
    'short mobile browser viewports need a compact mode');
});
