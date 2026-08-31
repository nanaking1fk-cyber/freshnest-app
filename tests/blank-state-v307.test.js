// Regression coverage for the two mobile blank states fixed in v30.1.24.
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
const accounts=read('work-gym-planner-v16/accounts-v18.js');
const legacyOnboarding=read('work-gym-planner-v16/onboarding-v18.js');
const integration=read('work-gym-planner-v16/v18-integration.js');
const authenticatedE2E=read('app-store/e2e/authenticated.spec.mjs');
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
  assert.match(guided,/PAUSED_SESSION_PREFIX/);
  assert.match(guided,/if\(automatic\)[\s\S]*pausedSessionKey/);
  assert.match(accounts,/openOnboarding\?\.\(\{auto:true\}\)/);
  assert.match(legacyOnboarding,/openOnboarding\(\{auto:true\}\)/);
  assert.match(integration,/openOnboarding\?\.\(\{auto:true\}\)/);
  assert.match(authenticatedE2E,/guidedOnboarding[\s\S]*not\.toHaveClass\(\/open\//);
  assert.match(authenticatedE2E,/finally\{[\s\S]*restoreA=await signIn[\s\S]*restoreA\.access_token/);
  assert.doesNotMatch(guided,/sessionStorage\.setItem\(DRAFT_KEY/);
});
