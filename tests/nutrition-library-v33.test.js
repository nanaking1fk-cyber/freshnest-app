const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const shell=read('work-gym-planner-v15/index.html');
const diary=read('work-gym-planner-v16/diary-a.js');
const diaryB=read('work-gym-planner-v16/diary-b.js');
const init=read('work-gym-planner-v16/init.js');
const css=read('work-gym-planner-v16/app-v30.css');
const production=read('work-gym-planner/index.html');
const worker=read('work-gym-planner/sw.js');

test('food logging exposes history, meals, recipes, and foods as accessible in-picker tabs',()=>{
  for(const view of ['history','meals','recipe','saved']){
    assert.match(shell,new RegExp(`id="foodTab-${view}"[^>]*role="tab"[^>]*aria-controls="foodPane-${view}"`));
    assert.match(shell,new RegExp(`id="foodPane-${view}"[^>]*role="tabpanel"[^>]*aria-labelledby="foodTab-${view}"`));
  }
  assert.doesNotMatch(shell,/nutritionWorkspaceTabs|data-nutrition-view/,
    'the libraries should appear while adding to a meal, not as permanent diary navigation');
  assert.match(init,/\['ArrowLeft','ArrowRight','Home','End'\]/,
    'the tab strip should support keyboard navigation');
});

test('history and reusable meals are derived from existing diary storage',()=>{
  assert.match(diary,/function nutritionLoggedMeals\(limit=100\)[\s\S]*loggedDates\(\)/);
  assert.match(diary,/function nutritionHistoryFoods\(limit=80\)[\s\S]*diary\(k\)/);
  assert.match(diary,/data-history-food/);
  assert.match(diary,/data-history-add/);
  assert.match(diary,/function nutritionReusableMeals\(limit=100\)[\s\S]*mealCopyFingerprint\(x\.items\)/,
    'identical logged meals should appear once in My Meals');
  assert.match(diary,/data-stage-meal/);
  assert.match(diary,/stageFoodItems\(x\.items,x\.meal\)/);
});

test('recipes and personal foods reuse the established compatible stores',()=>{
  assert.match(diary,/function myFoods\(\)\{return jget\(K\.foods,\[\]\)\}/);
  assert.match(diary,/function recipes\(\)\{return jget\(K\.recipes,\[\]\)\}/);
  assert.match(diaryB,/data-saved-add/);
  assert.match(diaryB,/data-recipe/);
  assert.match(diary,/saveMealRecipe[\s\S]*jget\(K\.recipes,\[\]\)/);
  assert.doesNotMatch(diary,/K\.(?:mealHistory|nutritionHistory|savedMeals)/,
    'the upgrade should not introduce a second, incompatible diary format');
});

test('repeating a meal defaults to the following day and appends fresh rows',()=>{
  assert.match(shell,/id="repeatMealDate" type="date"/);
  assert.match(shell,/id="repeatMealMeal"[\s\S]*Breakfast[\s\S]*Lunch[\s\S]*Dinner[\s\S]*Snacks/);
  assert.match(diary,/sourceDate\?addDays\(sourceDate,1\)/,
    'a historical meal should default to the next calendar day');
  assert.match(diary,/repeatMealState\.items\.map\(x=>[\s\S]*id:uid\('food'\),meal/,
    'copied rows need new ids and the destination meal');
  assert.match(diary,/jset\(K\.diary\+targetDate,\[\.\.\.diary\(targetDate\),\.\.\.copies\]\)/,
    'copying should preserve and append to destination diary rows');
});

test('repeat confirmation blocks an exact duplicate and cancel paths discard the draft',()=>{
  assert.match(diary,/mealCopyFingerprint\(existing\)===mealCopyFingerprint\(copies\)/);
  assert.match(init,/b\.dataset\.close==='repeatMealDialog'\)repeatMealState=null/);
  assert.match(init,/e\.target\.id==='repeatMealDialog'\)repeatMealState=null/);
  assert.match(init,/e\.key==='Escape'[\s\S]{0,100}repeatMealState=null/);
  assert.match(init,/#confirmRepeatMeal'\)\.onclick=confirmRepeatMeal/);
});

test('current meals can be repeated and copied totals remain computed from food rows',()=>{
  assert.match(diary,/data-repeat-meal="\$\{meal\}"/);
  assert.match(diary,/openRepeatMeal\(diary\(k\)\.filter\(x=>x\.meal===b\.dataset\.repeatMeal\)/);
  assert.match(diary,/function nutritionMealSummary\(items\)[\s\S]*foodTotals\(x\)/);
  assert.match(diary,/\$\{Math\.round\(q\.cal\)\} kcal · \$\{Math\.round\(q\.p\)\}g protein/);
});

test('in-picker nutrition library and repeat dialog CSS is premium and locally scoped',()=>{
  const librarySelectors=css.match(/[^{}]+\{[^{}]*\}/g).map(rule=>rule.slice(0,rule.indexOf('{')).trim())
    .filter(selector=>/nutritionLibrary/.test(selector));
  assert.ok(librarySelectors.length>=8);
  for(const selector of librarySelectors){
    for(const part of selector.split(','))assert.match(part.trim(),/^body\.premiumV30 #foodDialog /);
  }
  const repeatSelectors=css.match(/[^{}]+\{[^{}]*\}/g).map(rule=>rule.slice(0,rule.indexOf('{')).trim())
    .filter(selector=>selector.includes('#repeatMealDialog'));
  assert.ok(repeatSelectors.length>=15);
  for(const selector of repeatSelectors){
    for(const part of selector.split(','))assert.match(part.trim(),/^body\.premiumV30 #repeatMealDialog(?:\s|$)/);
  }
  assert.match(css,/body\.premiumV30 #repeatMealDialog \.sheetActions\{position:sticky/);
});

test('production and service worker retain the complete nutrition bundle',()=>{
  for(const file of ['diary-a.js','diary-b.js','init.js','app-v30.css']){
    assert.ok(production.includes(file),`${file} must remain loaded in production`);
    assert.ok(worker.includes(file),`${file} must remain cached by the service worker`);
  }
});
