import {test,expect} from '@playwright/test';
import {setup as accountSetup} from './roster-fixture-v48.mjs';

const cookie={product_name:'Cocoa Cookies',brands:'Sample Bakery',code:'1234567890123',serving_size:'2 cookies (30 g)',nutriments:{'energy-kcal_100g':480,proteins_100g:6,carbohydrates_100g:64,fat_100g:22,fiber_100g:4,'saturated-fat_100g':8,sodium_100g:.15}};
const drink={product_name:'Orange Drink',brands:'Sample Drinks',code:'1234567890124',serving_size:'1 bottle (330 ml)',serving_quantity:330,serving_quantity_unit:'ml',nutriments:{'energy-kcal_100g':42,proteins_100g:0,carbohydrates_100g:10.5,fat_100g:0}};
async function setup(page){
 const errors=await accountSetup(page);
 await page.route('https://world.openfoodfacts.org/**',route=>{
  const url=new URL(route.request().url());if(url.pathname.includes('/product/'))return route.fulfill({status:200,json:{status:1,product:drink}});
  const q=(url.searchParams.get('search_terms')||'').toLowerCase();return route.fulfill({status:200,json:{products:[cookie,drink].filter(x=>x.product_name.toLowerCase().includes(q))}});
 });
 await page.evaluate(()=>{jset(K.diary+'2026-09-03',[{id:'existing',name:'Previously logged lunch',meal:'Lunch',grams:100,per100:{cal:100,p:5,c:15,f:2}}]);$('diaryDate').value='2026-09-03';renderDiary()});
 await page.locator('.bottomNav [data-page="diary"]').click();return errors;
}
async function openMeal(page,meal='Breakfast'){await page.locator(`[data-add-food="${meal}"]`).click();await expect(page.locator('#foodDialog')).toHaveClass(/open/)}
async function search(page,text){await page.locator('#foodSearchInput').fill(text);await page.locator('#foodSearchInput').press('Enter');await expect(page.locator('.foodResultSelect').first()).toBeVisible()}
async function fits(page){expect(await page.evaluate(()=>{const sheet=document.querySelector('#foodDialog .sheet');return document.body.scrollWidth<=innerWidth+1&&sheet.scrollWidth<=sheet.clientWidth+1})).toBe(true)}

for(const viewport of [{width:390,height:844},{width:1440,height:1000}])test.describe(`${viewport.width}px nutrition portions`,()=>{
 test.use({viewport});
 test('search, fractional servings, basket adjustments and existing-row edits calculate correctly',async({page},info)=>{
  const errors=await setup(page);await openMeal(page);await search(page,'cookies');await page.locator('.foodResultSelect').click();
  await expect(page.locator('#foodGrams')).toHaveValue('30');await expect(page.locator('#foodServings')).toHaveValue('1');await expect(page.locator('#foodCal')).toHaveValue('144');await expect(page.locator('#foodSearchResults')).toBeHidden();await expect(page.locator('#foodSearchInput')).toHaveValue('');
  await page.locator('#foodServings').fill('2');await expect(page.locator('#foodPortionSummary')).toContainText('288 kcal');await page.locator('#saveToMyFoods').check();await fits(page);await page.screenshot({path:info.outputPath('serving-controls.png')});
  await page.locator('#queueFoodEntry').click();await search(page,'banana');await page.locator('.foodQuickAdd').first().click();
  await expect(page.locator('[data-edit-food-batch]')).toHaveCount(2);await page.locator('[data-edit-food-batch]').filter({hasText:'Cocoa Cookies'}).click();await page.locator('#foodServings').fill('0.5');
  await expect(page.locator('#queueFoodEntry')).toHaveText('Update portion');await expect(page.locator('#saveToMyFoods')).toBeChecked();await expect(page.locator('#saveFoodEntry')).toHaveAttribute('data-pending-count','2');await expect(page.locator('#foodPortionSummary')).toContainText('72 kcal');
  await page.locator('#saveFoodEntry').click();await expect(page.locator('#calFood')).toHaveText('277');
  let state=await page.evaluate(()=>({rows:diary('2026-09-03'),daily:totals('2026-09-03'),meal:mealTotals('2026-09-03','Breakfast'),foods:myFoods()}));
  expect(state.rows).toHaveLength(3);expect(state.rows[0].id).toBe('existing');expect(state.daily.cal).toBeCloseTo(277.02);expect(state.meal.cal).toBeCloseTo(177.02);expect(state.foods.find(x=>x.name==='Cocoa Cookies').defaultServings).toBe(.5);
  const row=page.locator('.foodRow').filter({hasText:'Cocoa Cookies'});await row.click();await expect(page.locator('#foodGrams')).toHaveValue('30');await expect(page.locator('#foodServings')).toHaveValue('0.5');
  await page.locator('#foodServings').fill('3');await page.locator('#saveFoodEntry').click();await expect(page.locator('#calFood')).toHaveText('637');
  state=await page.evaluate(()=>({rows:diary('2026-09-03'),meal:mealTotals('2026-09-03','Breakfast')}));expect(state.rows).toHaveLength(3);expect(state.meal.cal).toBeCloseTo(537.02);
  await row.click();await page.locator('#deleteFoodEntry').click();await expect(page.locator('#calFood')).toHaveText('205');expect(errors).toEqual([]);
 });

 test('manual per-serving labels, changing portion size, invalid inputs and My Foods reuse',async({page})=>{
  const errors=await setup(page);await openMeal(page,'Snacks');await page.locator('#foodQuickAddTool').click();
  await page.locator('#foodName').fill('My snack');await page.locator('#foodGrams').fill('50');await page.locator('#foodCal').fill('120');await page.locator('#foodProtein').fill('10');await page.locator('#foodServings').fill('2');await expect(page.locator('#foodPortionSummary')).toContainText('240 kcal');
  await page.locator('#foodGrams').fill('100');await expect(page.locator('#foodCal')).toHaveValue('240');await expect(page.locator('#foodProtein')).toHaveValue('20');await expect(page.locator('#foodPortionSummary')).toContainText('480 kcal');
  await page.locator('#foodServings').fill('0');await expect(page.locator('#saveFoodEntry')).toBeDisabled();await expect(page.locator('#queueFoodEntry')).toBeDisabled();await page.locator('#foodServings').fill('1.5');
  await page.locator('#saveToMyFoods').check();await page.locator('#saveFoodEntry').click();await expect(page.locator('#calFood')).toHaveText('460');
  await openMeal(page,'Dinner');await page.locator('#foodTab-saved').click();await page.locator('[data-saved]').filter({hasText:'My snack'}).click();await expect(page.locator('#foodGrams')).toHaveValue('100');await expect(page.locator('#foodServings')).toHaveValue('1.5');
  await page.locator('#foodServings').fill('0.5');await page.locator('#saveFoodEntry').click();await expect(page.locator('#calFood')).toHaveText('580');expect(errors).toEqual([]);
 });

 test('barcode liquids use millilitres and preserve macros when the amount changes',async({page})=>{
  const errors=await setup(page);await openMeal(page,'Lunch');await page.locator('#foodBarcodeTool').click();await page.locator('#barcodeManual').fill(drink.code);await page.locator('#barcodeLookup').click();
  await expect(page.locator('#foodServingSizeLabel')).toHaveText('Serving size (ml)');await expect(page.locator('#foodGrams')).toHaveValue('330');await page.locator('#foodGrams').fill('250');await page.locator('#foodServings').fill('2');await expect(page.locator('#foodPortionSummary')).toContainText('500 ml total · 210 kcal');await fits(page);
  await page.locator('#saveFoodEntry').click();await expect(page.locator('.foodRow').filter({hasText:'Orange Drink'})).toContainText('500 ml');
  const row=await page.evaluate(()=>diary('2026-09-03').find(x=>x.name==='Orange Drink'));expect(row.nutritionUnit).toBe('ml');expect(row.grams).toBe(500);expect(row.per100.cal).toBe(42);expect(row.per100.c).toBe(10.5);expect(errors).toEqual([]);
 });

 test('recipe portions remain drafts, support adjustments and preserve saved meals on cancel',async({page})=>{
  const errors=await setup(page);await page.evaluate(()=>jset(K.recipes,[{id:'sample-recipe',name:'Rice and chicken',items:[{id:'r',name:'Rice',meal:'Dinner',grams:158,per100:{cal:130,p:2.7}},{id:'c',name:'Chicken',meal:'Dinner',grams:100,per100:{cal:165,p:31}}]}]));
  await openMeal(page,'Dinner');await page.locator('#foodTab-recipe').click();await page.locator('[data-recipe]').click();await expect(page.locator('[data-edit-food-batch]')).toHaveCount(2);expect(await page.evaluate(()=>diary('2026-09-03').length)).toBe(1);
  await page.locator('[data-edit-food-batch]').filter({hasText:'Rice'}).click();await page.locator('#foodServings').fill('0.5');await page.locator('#queueFoodEntry').click();await page.locator('#foodMeal').selectOption('Lunch');await page.locator('#saveFoodEntry').click();
  const state=await page.evaluate(()=>({rows:diary('2026-09-03'),total:totals('2026-09-03').cal}));expect(state.rows).toHaveLength(3);expect(state.rows.every(x=>x.meal==='Lunch')).toBe(true);expect(state.total).toBeCloseTo(367.7);
  await openMeal(page);await page.locator('#foodTab-recipe').click();await page.locator('[data-recipe]').click();await page.locator('[data-remove-food-batch]').first().click();await page.locator('[data-clear-food-batch]').click();await page.keyboard.press('Escape');expect(await page.evaluate(()=>diary('2026-09-03').length)).toBe(3);expect(errors).toEqual([]);
 });
});

test('missing packaged-food calories require label entry, while true zero-calorie foods can be logged',async({page})=>{
 const errors=await setup(page);await page.route('https://world.openfoodfacts.org/cgi/**',route=>route.fulfill({status:200,json:{products:[{product_name:'Unknown food',serving_size:'1 piece (20 g)',nutriments:{}}]}}));
 await openMeal(page);await search(page,'unknown');await page.locator('.foodQuickAdd').click();await expect(page.locator('#foodCal')).toHaveValue('');await expect(page.locator('#saveFoodEntry')).toBeDisabled();await page.locator('#foodCal').fill('0');await expect(page.locator('#saveFoodEntry')).toBeEnabled();await page.locator('#saveFoodEntry').click();expect(await page.evaluate(()=>diary('2026-09-03').at(-1).per100.cal)).toBe(0);expect(errors).toEqual([]);
});
