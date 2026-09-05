const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('signed-in account is a quiet menu with advanced controls collapsed',()=>{
 const source=read('work-gym-planner-v16/accounts-v18.js');
 assert.match(source,/signed\?'Account':'Your Work \+ Workout account'/);
 assert.match(source,/id="accountPlanSection" class="accountMenuSection"/);
 assert.match(source,/id="startOnboardingAccount"[^>]*><b>Review my plan<\/b>/);
 assert.match(source,/id="accountDataSection" class="accountMenuSection"/);
 assert.match(source,/class="accountAdvanced"><summary>More backup options/);
 assert.doesNotMatch(source,/class="accountMenuSection" \$\{A\.cloudStateReady\?'':'open'\}/);
 assert.match(source,/id="reviewAccountSync"[^>]*class="accountSyncNotice"/);
 assert.match(source,/Keep this phone’s plan for now/);
});

test('account styling is scoped and mobile-safe',()=>{
 const css=read('work-gym-planner-v16/account-v80.css');
 const rules=css.split('\n').filter(line=>line.includes('{')&&!line.trim().startsWith('/*')&&!line.trim().startsWith('@'));
 assert.ok(rules.length>20);
 for(const rule of rules)assert.match(rule,/^\s*body\.premiumV30 #accountDialog /);
 assert.match(css,/max-height:calc\(100dvh - max\(8px,env\(safe-area-inset-top\)\)\)/);
 assert.match(css,/\.accountAdvanced/);
});

test('native bundle and production loaders include the account refresh',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){
  const source=read(file);assert.match(source,/account-v80\.css\?v=30\.1\.31-account80/);assert.match(source,/accountRevision='30\.1\.31-account80'/);assert.match(source,/\['accounts-v18\.js','account-security-v18\.js'\]\.includes\(x\)\?accountRevision/);
 }
 assert.match(read('app-store/scripts/build-web.mjs'),/'work-gym-planner-v16\/account-v80\.css'/);
});
