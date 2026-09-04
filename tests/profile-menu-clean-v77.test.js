const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('profile opens with only three essential destinations',()=>{
  const source=read('work-gym-planner-v16/guided-onboarding-v18.js');
  const essential=source.match(/guidedProfileMenu guidedProfileEssentials">([\s\S]*?)<\/div>'/)?.[1]||'';
  assert.equal((essential.match(/<button /g)||[]).length,3);
  for(const label of ['Plan &amp; goals','Work schedule','Account &amp; privacy'])assert.match(essential,new RegExp(label));
  for(const label of ['Nutrition goals','Body &amp; progress','Advanced preferences'])assert.doesNotMatch(essential,new RegExp(label));
});

test('secondary profile settings and plan facts require deliberate disclosure',()=>{
  const source=read('work-gym-planner-v16/guided-onboarding-v18.js');
  assert.match(source,/<details class="guidedProfileMore">[\s\S]*Nutrition goals[\s\S]*Body &amp; progress[\s\S]*Advanced preferences[\s\S]*guidedProfileAtGlance[\s\S]*<\/details>/);
  assert.match(source,/guidedProfileMore'\)\?\.removeAttribute\('open'\)/);
  assert.match(source,/guidedProfileAtGlance'\)\?\.removeAttribute\('open'\)/);
});

test('all profile destinations keep their existing behavior',()=>{
  const source=read('work-gym-planner-v16/guided-onboarding-v18.js');
  assert.match(source,/guidedProfileEdit'[\s\S]*openGuided\(\)/);
  assert.match(source,/guidedProfileDetails'[\s\S]*openGuided\(\{details:true\}\)/);
  assert.match(source,/guidedProfileCalendar'[\s\S]*page\?\.\('calendar'\)/);
  assert.match(source,/guidedProfileNutrition'[\s\S]*openModal\?\.\('nutritionDialog'\)/);
  assert.match(source,/guidedProfileProgress'[\s\S]*page\?\.\('progress'\)/);
  assert.match(source,/guidedProfileAccount'[\s\S]*openAccount\?\.\('account'\)/);
});

test('profile menu styling is premium-scoped and mobile viewport safe',()=>{
  const css=read('work-gym-planner-v16/app-v30.css');
  for(const selector of ['guidedProfileMenu','guidedProfileMore','guidedProfileSecondary','guidedProfileAtGlance','guidedProfileActions']){
    assert.match(css,new RegExp('body\\.premiumV30 #guidedProfileSummary \\.'+selector));
  }
  assert.match(css,/body\.premiumV30 #guidedProfileSummary \.guidedProfileSheet\{[^}]*max-height:calc\(100dvh/);
  assert.match(css,/body\.premiumV30 #guidedProfileSummary \.guidedProfileActions\{[^}]*position:sticky/);
  assert.doesNotMatch(css,/(^|\n)\.guidedProfile(More|Secondary|Essentials)/);
});
