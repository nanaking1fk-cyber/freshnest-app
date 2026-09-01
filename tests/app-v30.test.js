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
  assert.match(shell,/30\.1\.26/);
  assert.equal(JSON.parse(read('package.json')).version,'30.1.26');
  assert.match(read('work-gym-planner/manifest.webmanifest'),/\?v=30\.1\.26/);
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
  for(const heading of ['Plan & coaching','Health & progress','Account & data','Legal & privacy'])
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

test('planner stays calendar-first while secondary tools move behind Settings',()=>{
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(planner,/plannerTab-tools/);
  assert.match(planner,/Settings<\/span>/);
  assert.match(planner,/plannerToolsMenuV31/);
  assert.match(planner,/data-planner-open="sources"/);
  assert.match(css,/plannerTabsV25\{[\s\S]*?display:flex;justify-content:flex-end;[\s\S]*?background:transparent/);
  assert.match(css,/plannerToolsMenuV31/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.aiCoachFab,[\s\S]*\.coachFab\{display:none!important\}/);
});

test('work sources are selectable during import and can be deleted completely',()=>{
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  const plannerCss=read('work-gym-planner-v16/schedule-platform-v25.css');
  assert.match(planner,/id="captureSourcePickerV25"/);
  assert.match(planner,/New work source…/);
  assert.match(planner,/sourceOptions\(existing\.dataset\.sourceId\|\|source\?\.id,true\)/,
    'the Add menu must include every saved work source, including paused sources');
  assert.match(planner,/if\(name==='add'\)captureSourceControl\(\)/,
    'opening Add must refresh its work-source selector');
  assert.match(planner,/data-source-delete/);
  assert.match(planner,/saveEvents\(events\(\)\.filter/,
    'deleting a source must remove its own saved shifts');
  assert.match(planner,/saveRotations\(rotations\(\)\.filter/,
    'deleting a source must remove its own rotations');
  assert.match(plannerCss,/captureContextV25 input,body\.premiumV18 \.captureContextV25 select/);
});

test('workspace tabs are compact and nutrition has a meal visual',()=>{
  const today=read('work-gym-planner-v16/today.js');
  const homeCss=read('work-gym-planner-v16/home-v27.css');
  assert.match(css,/plannerTabsV25 button\{width:auto;min-width:0;min-height:38px/);
  assert.match(today,/hvMealVisual/);
  assert.match(homeCss,/nutrition-meal-v30\.png/);
});

test('premium calendar uses a split day inspector and a focused mobile week rail',()=>{
  const calendar=read('work-gym-planner-v16/calendar.js');
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(planner,/id="calendarTodayV33"/);
  assert.match(planner,/id="calendarWeekRailV33"/);
  assert.match(calendar,/function renderCalendarWeekRail\(\)/);
  assert.match(calendar,/dayCardHeadV33/);
  assert.match(calendar,/dayAddToggleV33/);
  assert.match(calendar,/data-agenda-form[^>]*hidden/);
  assert.match(css,/#plannerPane-calendar\.active\{display:grid;grid-template-columns:minmax\(0,1\.72fr\) minmax\(310px,\.72fr\)/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.calendarWeekRailV33\{display:grid/);
});

test('calendar keeps destructive and setup actions out of the everyday view',()=>{
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.doesNotMatch(planner,/id="calendarQuickAddV31"/);
  assert.doesNotMatch(planner,/id="calendarClearWorkspaceV25"/);
  assert.match(planner,/id="calendarClearManageV32"/);
  assert.match(planner,/#calendarClearV25,#calendarClearManageV32/);
  assert.match(planner,/<small>SETTINGS<\/small><h2>Calendar<\/h2>/);
});

test('calendar supports detail labels as well as a compact color-only view',()=>{
  const calendar=read('work-gym-planner-v16/calendar.js');
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(calendar,/function calendarDisplayMode\(\)/);
  assert.match(calendar,/function calendarCellDetails\(/);
  assert.match(calendar,/dataset\.display=display/);
  assert.match(planner,/data-calendar-display="details"/);
  assert.match(planner,/data-calendar-display="compact"/);
  assert.match(css,/\.dayDetails/);
  assert.match(css,/#calendarGrid\[data-display="compact"\] \.dayDetails\{display:none/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.monthbar>\.calendarDisplayToggleV32\{display:flex/,
    'Details and Compact must stay available on mobile');
});

test('work schedules can be added by selecting calendar dates or uploading an existing roster',()=>{
  const calendar=read('work-gym-planner-v16/calendar.js');
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  const adaptive=read('work-gym-planner-v16/adaptive-planner-v24.js');
  assert.match(planner,/id="chooseWorkDatesV35"/);
  assert.match(planner,/id="uploadWorkRosterV35"/);
  assert.match(planner,/id="typeWorkScheduleV35"/);
  assert.match(planner,/function handleCalendarDateTap\(key\)/);
  assert.match(planner,/function reviewPickedShifts\(\)/);
  assert.match(planner,/value="off"[^>]*>Off work/);
  assert.match(planner,/kind:off\?'off':'work'/);
  assert.match(planner,/existing\.kind==='off'/,
    'manual off days must be stored as reversible overrides instead of deleting a rotation');
  assert.match(planner,/renderTrustedReview\(\)/,
    'calendar-picked shifts must use the same review-before-save trust layer');
  assert.match(planner,/var day=index\+1,date=/,
    'the proposal calendar must convert zero-based array indexes to one-based calendar days');
  assert.match(calendar,/handleCalendarDateTap/);
  assert.match(calendar,/shiftPickV35/);
  assert.match(adaptive,/id="scheduleFileV24" type="file" accept="image\/\*,application\/pdf,\.pdf"/);
  assert.match(adaptive,/async function extractImage\(file\)/);
  assert.match(adaptive,/async function extractPdf\(file\)/);
  assert.match(adaptive,/reviewRosterText/,
    'photo and PDF extraction must enter the roster identity and review flow');
  assert.match(css,/\.scheduleAddWaysV35/);
  assert.match(css,/\.calDay\.shiftPickV35/);
  const scheduleCss=read('work-gym-planner-v16/schedule-platform-v25.css');
  assert.match(scheduleCss,/input\[type="checkbox"\]:not\(:checked\)/,
    'hidden date and source fields must not make selected proposals look cancelled');
});

test('rotation settings support correctly anchored second and third weekends',()=>{
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  const scheduling=read('shared/v25-scheduling.js');
  assert.match(planner,/value="alternating_weekends">Every other weekend/);
  assert.match(planner,/value="third_weekend">Every third weekend/);
  assert.match(planner,/function weekendRotationAnchor\(value\)/);
  assert.match(planner,/First worked weekend/);
  assert.match(scheduling,/preset==='alternating_weekends'/);
  assert.match(scheduling,/preset==='third_weekend'/);
});

test('calendar supports recurring personal events such as payday',()=>{
  const calendar=read('work-gym-planner-v16/calendar.js');
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  const premiumCss=read('work-gym-planner-v16/premium-v18.css');
  assert.match(calendar,/RECURRING_CALENDAR_ITEMS_KEY/);
  assert.match(calendar,/function recurrenceMatches\(/);
  assert.match(calendar,/function addRecurringCalendarItem\(/);
  assert.match(calendar,/function skipRecurringCalendarItem\(/);
  assert.match(calendar,/function toggleRecurringCalendarItem\(/);
  assert.match(calendar,/Every month/);
  assert.match(calendar,/Every 2 weeks/);
  assert.match(calendar,/Removed from this date; the repeat schedule is unchanged/);
  assert.match(planner,/saveRecurringCalendarItems\(\[\]\)/,
    'Clear calendar must remove repeating personal events too');
  assert.match(premiumCss,/select\[name="repeat"\]/,
    'the repeat picker must remain usable in the compact mobile form');
});

test('individual calendar items can be completed or removed without erasing rotation patterns',()=>{
  const calendar=read('work-gym-planner-v16/calendar.js');
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(calendar,/data-work-toggle/);
  assert.match(calendar,/data-work-delete/);
  assert.match(calendar,/data-agenda-toggle/);
  assert.match(calendar,/data-agenda-delete/);
  assert.match(planner,/function toggleWorkItemDone\(/);
  assert.match(planner,/function removeWorkItem\(/);
  assert.match(planner,/exceptions\[key\]=\{action:'skip'/,
    'removing one generated shift must create a dated exception');
  assert.match(css,/dayScheduleRow\.done b/);
});

test('selected-day timeline includes nutrition and keeps actions inside their rows',()=>{
  const calendar=read('work-gym-planner-v16/calendar.js');
  const premium=read('work-gym-planner-v16/premium-v18.css');
  assert.match(calendar,/dayScheduleRow nutrition/);
  assert.match(calendar,/Nutrition target/);
  assert.match(calendar,/agendaDone/);
  assert.match(calendar,/data-agenda-toggle/);
  assert.match(premium,/\.dayScheduleRow>span:first-child/,
    'only the timeline icon may receive the fixed square sizing, not the action group');
  assert.doesNotMatch(premium,/\.dayScheduleRow>span,/,
    'action buttons must not be forced into the icon box at the row corner');
  assert.match(css,/\.dayAgendaRow \.agendaActions\{grid-column:2/,
    'personal Done, Edit and Remove actions must wrap inside the inspector');
});

test('selected calendar days can add recurring payday and reversible off work entries',()=>{
  const calendar=read('work-gym-planner-v16/calendar.js');
  const planner=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(calendar,/<option value="payday">Payday<\/option>/);
  assert.match(calendar,/<option value="off">Off work<\/option>/);
  assert.match(calendar,/kind==='payday'&&form\.elements\.repeat\.value==='none'/,
    'payday cannot be saved as a non-recurring item');
  assert.match(calendar,/form\.elements\.repeat\.value='biweekly'/,
    'payday starts with a useful every-two-weeks recurrence default');
  assert.match(calendar,/WWV25\?\.addOffDay/);
  assert.match(planner,/function addOffDay\(key,sourceId\)/);
  assert.match(planner,/V\.addOffDay=addOffDay/);
});

test('training and More reveal secondary controls on demand',()=>{
  assert.match(script,/trainingToolsToggleV31/);
  assert.match(script,/menuGroupToggleV31/);
  assert.match(script,/function setMenuGroupOpen\(/);
  assert.match(script,/other===section&&open/,
    'opening one More category must collapse every other category');
  assert.match(css,/#trainingRoot:not\(\.v31ToolsOpen\)>\.trainTools\{display:none!important\}/);
  assert.match(script,/menuGroupItemsV30\" hidden/);
  assert.match(css,/\.menuGroupItemsV30\[hidden\]\{display:none!important\}/,
    'collapsed menu content must not be forced visible by the grid rule');
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
