const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const shell=read('work-gym-planner-v15/index.html');
const diaryA=read('work-gym-planner-v16/diary-a.js');
const diaryB=read('work-gym-planner-v16/diary-b.js');
const init=read('work-gym-planner-v16/init.js');
const api=read('api/v18/meal-scan.js');
const privacy=read('work-gym-planner/privacy.html');
const terms=read('work-gym-planner/terms.html');
const {responseFormat,validateMealScan}=require('../server/meal-scan-v38');

test('meal picker keeps reusable libraries and logging tools in the selected meal flow',()=>{
  assert.match(shell,/id="foodMeal"[\s\S]*Breakfast[\s\S]*Lunch[\s\S]*Dinner[\s\S]*Snacks/);
  for(const label of ['History','My Meals','My Recipes','My Foods'])assert.ok(shell.includes(`>${label}</button>`));
  for(const id of ['foodBarcodeTool','foodMealScanTool','foodQuickAddTool'])assert.match(shell,new RegExp(`id="${id}"`));
  assert.doesNotMatch(shell,/id="nutritionWorkspaceTabs"/);
});

test('search selection and quick-add clear results and invalidate slow remote responses',()=>{
  assert.match(diaryB,/function clearFoodSearch[\s\S]*foodSearchRequest\+\+/);
  assert.match(diaryB,/request!==foodSearchRequest\|\|input\.value\.trim\(\)!==q/);
  assert.match(diaryB,/data-result-index[\s\S]*setFoodBase\(lastSearchProducts/);
  assert.match(diaryB,/data-quick-add-index[\s\S]*queueFoodProduct\(lastSearchProducts/);
  assert.match(diaryA,/function setFoodBase\(p\)[\s\S]*showFoodEditor/);
  assert.match(diaryA,/function showFoodEditor[\s\S]*clearFoodSearch\?\.\(\{restore:false\}\)/);
  assert.match(diaryA,/function queueFoodProduct[\s\S]*clearFoodSearch\?\.\(\)/);
});

test('meal and recipe reuse stage fresh rows for final confirmation',()=>{
  assert.match(diaryA,/function stageFoodItems[\s\S]*id:uid\('food'\),meal/);
  assert.match(diaryA,/data-stage-meal[\s\S]*stageFoodItems\(x\.items,x\.meal\)/);
  assert.match(diaryB,/data-recipe[\s\S]*stageFoodItems\(r\.items,r\.name\)/);
  assert.doesNotMatch(diaryB,/data-recipe[\s\S]{0,900}saveDiary\(/);
});

test('Meal Scan is consent-gated, structured, rate-limited, and does not store photos',()=>{
  assert.match(init,/#foodMealScanTool'\)\.onclick=\(\)=>foodTab\('meal-scan'\)/);
  assert.match(diaryB,/ensureHealthConsent[\s\S]*purpose:'meal_scan_ai'/);
  assert.match(api,/requireAnyHealthConsent\(user,\['personalized_ai','meal_scan_ai'\]\)/);
  assert.match(api,/access\.run\(user,'meal'/);
  assert.match(api,/textFormat:responseFormat/);
  assert.match(api,/photoStored:false/);
  assert.doesNotMatch(api,/serviceFetch|userFetch|storage|upload/i);
  assert.equal(responseFormat.strict,true);
  assert.equal(responseFormat.schema.properties.items.maxItems,12);
});

test('Meal Scan estimates normalize into the existing per-100 diary format',()=>{
  const result=validateMealScan({items:[{
    name:'Rice',grams:200,calories:260,protein:5,carbs:56,fat:1,fiber:1,
    saturatedFat:.2,sodiumMg:4,confidence:.8
  }],note:'Portion is estimated.'});
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].defaultGrams,200);
  assert.equal(result.items[0].per100.cal,130);
  assert.equal(result.items[0].per100.c,28);
  assert.equal(result.note,'Portion is estimated.');
});

test('privacy and terms explicitly disclose meal-photo processing and uncertainty',()=>{
  assert.match(privacy,/resized meal photo is sent to OpenAI for one-time analysis/);
  assert.match(privacy,/does not intentionally store the meal photo/);
  assert.match(privacy,/remain an unsaved draft until you review and confirm/);
  assert.match(terms,/meal-photo analysis/);
  assert.match(terms,/Review every Meal Scan result before saving/);
});
