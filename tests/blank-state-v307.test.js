// Regression coverage for the two mobile blank states fixed in v30.1.13.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const shell=read('work-gym-planner/index.html');
const landing=read('work-gym-planner-v16/landing-v29.js');
const today=read('work-gym-planner-v16/today.js');
const guided=read('work-gym-planner-v16/guided-onboarding-v18.js');
const css=read('work-gym-planner-v16/app-v30.css');

test('a branded boot screen stays visible through the asynchronous document swap',()=>{
  assert.match(shell,/id="wwBoot" role="status"/);
  assert.match(shell,/Getting your week ready/);
  assert.match(shell,/h=h\.replace\('<body>','<body>'\+boot\)/);
  assert.match(shell,/wwBootStatus/);
  assert.match(landing,/function finishBoot\(\)/);
  assert.match(landing,/boot\.classList\.add\('done'\)/);
  assert.match(landing,/function show\(\)[\s\S]*finishBoot\(\)/);
  assert.match(landing,/function hide\(\)[\s\S]*finishBoot\(\)/);
});

test('an account without a completed profile always receives a useful home screen',()=>{
  assert.match(today,/function renderPausedSetupDashboard\(root\)/);
  assert.match(today,/if\(!profile\(\)\)\{renderPausedSetupDashboard\(root\);return\}/);
  assert.match(today,/id="resumeOnboarding"/);
  assert.match(today,/account\.openOnboarding/);
  assert.match(today,/Nothing is added to your calendar until you review and approve it/);
  assert.match(css,/\.onboardingPausedHome/);
  assert.match(css,/\.pausedSetupHero/);
  assert.match(css,/@media\(max-width:700px\)[\s\S]*\.pausedPreview\{grid-template-columns:1fr\}/);
});

test('Finish later persists the account-owned draft and resumes at the same question',()=>{
  assert.match(guided,/const DRAFT_KEY=PREFIX\+'guided-onboarding-draft-v30'/);
  assert.match(guided,/localStorage\.setItem\(DRAFT_KEY/);
  assert.match(guided,/draft\.step=step/);
  assert.match(guided,/step=Math\.max\(0,\+draft\.step\|\|0\)/);
  assert.match(guided,/window\.renderTodayDashboard\?\.\(\)/);
  assert.match(guided,/Setup saved\. Resume whenever you are ready/);
  assert.doesNotMatch(guided,/sessionStorage\.setItem\(DRAFT_KEY/);
});
