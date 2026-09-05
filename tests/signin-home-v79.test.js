const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('successful sign-in uses a quiet transition and lands on Home',()=>{
 const source=read('work-gym-planner-v16/accounts-v18.js');
 assert.match(source,/function finishSignInToHome\(\)/);
 assert.match(source,/closeModal\('accountDialog'\)[\s\S]*window\.page\('home'\)/);
 assert.match(source,/Opening your home…/);
 assert.match(source,/A\.signInCompleting=true;status\('Signing in…'\)/);
 assert.match(source,/await signIn\([^\n]+if\(A\.canStartOnboarding\(\)\|\|A\.canOpenHome\(\)\)finishSignInToHome\(\);else\{A\.signInCompleting=false;renderAccountUI\(\)\}/);
});

test('restore conflicts keep both copies protected while sign-in may open the phone plan on Home',()=>{
 const source=read('work-gym-planner-v16/accounts-v18.js');
 assert.match(source,/A\.canOpenHome=\(\)=>[\s\S]*A\.accountState==='choice'[\s\S]*localStorage\.getItem\(OWNER_KEY\)===A\.session\?\.user\?\.id/);
 assert.match(source,/protectCopy\(uid,local\);setAccountState\('choice'\);status\('Signed in\. Your phone plan is open; review backup when convenient\.'\)/);
 assert.doesNotMatch(source,/setAccountState\('choice'\);openAccount\('signin'\)/);
});

test('production loaders and service workers refresh the sign-in fix',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){
  const source=read(file);
  assert.match(source,/accountRevision='30\.1\.31-account80'/);
  assert.match(source,/account-v80\.css\?v=30\.1\.31-account80/);
  assert.match(source,/\['accounts-v18\.js','account-security-v18\.js'\]\.includes\(x\)\?accountRevision:assetRevision/);
 }
 for(const file of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
  const source=read(file);assert.match(source,/account80/);assert.match(source,/profile77/);
 }
});
