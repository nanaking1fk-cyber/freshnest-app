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
 assert.match(source,/await signIn\([^\n]+if\(A\.canStartOnboarding\(\)\)finishSignInToHome\(\);else\{A\.signInCompleting=false;renderAccountUI\(\)\}/);
});

test('restore conflicts keep the protective account choice instead of forcing Home',()=>{
 const source=read('work-gym-planner-v16/accounts-v18.js');
 assert.match(source,/if\(!forceCloud&&meaningfulState\(local\)[\s\S]*setAccountState\('choice'\);openAccount\('signin'\)/);
 assert.match(source,/if\(A\.canStartOnboarding\(\)\)finishSignInToHome\(\);else\{A\.signInCompleting=false;renderAccountUI\(\)\}/);
});

test('production loaders and service workers refresh the sign-in fix',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){
  const source=read(file);
  assert.match(source,/accountRevision='30\.1\.31-signin79'/);
  assert.match(source,/x==='accounts-v18\.js'\?accountRevision:assetRevision/);
 }
 for(const file of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
  const source=read(file);assert.match(source,/signin79/);assert.match(source,/profile77/);
 }
});
