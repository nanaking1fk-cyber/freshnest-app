const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const account=read('work-gym-planner-v16/accounts-v18.js');

test('password recovery emails return to the planner reset flow',()=>{
  assert.match(account,/new URL\('\/work-gym-planner\/shell\.html'\s*,\s*'https:\/\/www\.workandworkout\.com'\)/);
  assert.match(account,/url\.searchParams\.set\('auth',purpose==='recovery'\?'recovery':'signup'\)/);
  assert.match(account,/authRedirectUrl\('recovery'\)/);
  assert.doesNotMatch(account,/function authRedirectUrl\(\)\{return 'https:\/\/www\.workandworkout\.com\/'\}/);
});

test('auth callback cleanup cannot be shadowed by the workout history function',()=>{
  assert.doesNotMatch(account,/(^|[^.])history\.replaceState\(/m);
  assert.equal((account.match(/window\.history\.replaceState\(/g)||[]).length,3);
  assert.doesNotMatch(read('work-gym-planner-v16/workout-plan.js'),/function history\(\)/);
  assert.match(read('work-gym-planner-v16/workout-plan.js'),/function workoutHistory\(\)/);
  for(const directory of ['work-gym-planner-v15','work-gym-planner-v16']){
    const files=fs.readdirSync(path.join(root,directory)).filter(file=>file.endsWith('.js'));
    for(const file of files)assert.doesNotMatch(read(`${directory}/${file}`),/\bhistory\(\)/,
      `${directory}/${file} must not shadow the browser History API`);
  }
});

test('a valid recovery exchange opens reset UI before normal post-login work',()=>{
  const start=account.indexOf("if(purpose==='recovery'){");
  const end=account.indexOf("toast('Email confirmed",start);
  assert.ok(start>0&&end>start,'recovery completion branch must exist');
  const completion=account.slice(start,end);
  assert.match(completion,/sessionStorage\.setItem\(RECOVERY_KEY,'1'\)/);
  assert.match(completion,/renderAccountUI\(\);openAccount\('signin'\)/);
  assert.match(completion,/return true[\s\S]*await afterAuth\(\)/,
    'recovery must return after opening reset UI instead of running onboarding or reload logic');
});

test('invalid or cross-browser reset links open an actionable account screen',()=>{
  const flow=account.slice(account.indexOf('async function consumeAuthRedirect()'),account.indexOf('A.signIn=signIn'));
  assert.match(flow,/if\(!verifier\)\{openAccount\('signin'\)/);
  assert.match(flow,/same browser where you requested it/);
  assert.match(flow,/catch\(e\)[\s\S]*openAccount\('signin'\)/);
  assert.match(flow,/invalid or expired/);
});

test('automatic onboarding cannot cover an active password reset',()=>{
  const onboarding=read('work-gym-planner-v16/onboarding-v18.js');
  const guided=read('work-gym-planner-v16/guided-onboarding-v18.js');
  assert.match(onboarding,/A\.openOnboarding=function\(\)\{if\(A\.passwordRecovery\)\{A\.openAccount\?\.\('signin'\);return\}/);
  assert.match(onboarding,/setTimeout\(\(\)=>\{if\(!A\.passwordRecovery/);
  assert.match(guided,/function openGuided\(options\)\{\s*if\(A\.passwordRecovery\)\{A\.openAccount\?\.\('signin'\);return\}/);
});

test('sign-in fields expose a complete password-manager form',()=>{
  assert.match(account,/<form id="signinPane" class="authPane" autocomplete="on">/);
  assert.match(account,/id="loginEmail" name="username" type="email"[^>]*autocomplete="username"/);
  assert.match(account,/id="loginPassword" name="password" type="password" autocomplete="current-password"/);
  assert.match(account,/id="loginBtn" type="submit"/);
  assert.match(account,/\$\('#signinPane'\)\.onsubmit=async event=>\{event\.preventDefault\(\)/);
});

test('signup and recovery fields are recognizable to password managers',()=>{
  assert.match(account,/<form id="signupPane"[^>]*autocomplete="on">/);
  assert.match(account,/id="signupEmail" name="username" type="email"[^>]*autocomplete="username"/);
  assert.match(account,/id="signupPassword" name="new-password" type="password"[^>]*autocomplete="new-password"/);
  assert.match(account,/<form id="recoveryPasswordForm"[^>]*autocomplete="on">/);
  assert.match(account,/id="recoveryEmail" name="username" type="email"[^>]*autocomplete="username" readonly/);
  assert.match(account,/id="recoveryNewPassword" name="new-password" type="password"[^>]*autocomplete="new-password"/);
  assert.match(account,/\$\('#recoveryPasswordForm'\)\?\.addEventListener\('submit'/);
});

test('production and native builds continue to load the repaired account module',()=>{
  assert.match(read('work-gym-planner/index.html'),/accounts-v18\.js/);
  assert.match(read('work-gym-planner/boot.js'),/accounts-v18\.js/);
  assert.match(read('work-gym-planner/sw.js'),/accounts-v18\.js/);
  assert.match(read('app-store/scripts/build-web.mjs'),/work-gym-planner-v16/);
});
