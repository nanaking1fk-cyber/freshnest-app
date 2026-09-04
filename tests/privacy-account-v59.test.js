const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('profile is a focused menu with optional summary details',()=>{
  const profile=read('work-gym-planner-v16/guided-onboarding-v18.js');
  for(const label of ['Plan &amp; goals','Work schedule','Account &amp; privacy','More settings','Nutrition goals','Body &amp; progress','Advanced preferences'])assert.match(profile,new RegExp(label));
  assert.match(profile,/<details class="guidedProfileMore">[\s\S]*<details class="guidedProfileAtGlance">/);
  assert.match(profile,/guidedProfileCalendar'[\s\S]*page\?\.\('calendar'\)/);
  assert.match(profile,/guidedProfileProgress'[\s\S]*page\?\.\('progress'\)/);
  assert.match(profile,/A\.openProfileMenu=openProfileSummary/);
  assert.match(read('work-gym-planner-v16/app-v29.js'),/avatar\.id==='homeProfileBtn'&&A\.openProfileMenu/);
});

test('signed-in account controls use progressive disclosure',()=>{
  const account=read('work-gym-planner-v16/accounts-v18.js');
  for(const label of ['Cloud backup &amp; restore','Plan settings','Privacy &amp; account'])assert.match(account,new RegExp(label));
  assert.match(account,/class="accountMenuSection"/);
  assert.match(account,/Delete cloud account[\s\S]*different from deleting only this device's copy/);
});

test('permanent deletion is verified and clears stale sessions across tabs',()=>{
  const api=read('api/v18/account.js');
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(api,/check\.status!==404/);
  assert.match(api,/deleted:true,verified:true/);
  assert.match(account,/result\?\.deleted!==true\|\|result\?\.verified!==true/);
  assert.match(account,/addEventListener\?\.\('storage'/);
  assert.match(account,/type:'account-deleted'/);
  assert.match(account,/clearDeletedAccountLocally\(uid\);saveSession\(null\)/);
});

test('new profile and account styling stays scoped to the premium surfaces',()=>{
  const css=read('work-gym-planner-v16/app-v30.css');
  assert.match(css,/body\.premiumV30 #guidedProfileSummary \.guidedProfileMenu/);
  assert.match(css,/body\.premiumV30 #accountDialog \.accountMenuSection/);
  assert.doesNotMatch(css,/(^|\n)\.guidedProfileMenu/);
  assert.doesNotMatch(css,/(^|\n)#accountDialog \.accountMenuSection/);
});
