const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
const F=require('../work-gym-planner-v16/food-portions-v50');
const macros={cal:400,p:20,c:50,f:10,fiber:5,satFat:2,sodium:100};
function harness(initial=[]){
 const elements=new Map(),data=new Map();let rows=structuredClone(initial),nextId=0;
 function el(id){id=id.replace(/^#/,'');if(!elements.has(id))elements.set(id,{value:'',checked:false,hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',focus(){}});return elements.get(id)}
 const c={window:{WGCFoodPortions:F},$:el,$$:()=>[],foodState:{editId:null,base:null,batch:[],meal:'Breakfast'},uid:()=>String(++nextId),esc:value=>String(value||''),structuredClone,requestAnimationFrame(){},stopBarcode(){},clearFoodSearch(){},K:{foods:'foods',recent:'recent',recipes:'recipes'},jget:(key,fallback)=>data.get(key)||fallback,jset:(key,value)=>data.set(key,value),diary:()=>rows,saveDiary:(date,value)=>{rows=value},closeModal(){},openModal(){},toast(){}};
 vm.createContext(c);vm.runInContext(read('work-gym-planner-v16/nutrition-core.js').match(/function foodTotals\(x\)\{[^\n]+/)[0],c);vm.runInContext(read('work-gym-planner-v16/diary-a.js'),c);
 el('foodMeal').value='Breakfast';el('diaryDate').value='2026-09-03';el('foodServings').value='1';el('foodGrams').value='100';
 return{c,el,data,rows:()=>rows};
}

test('serving labels use their weight, not the number of pieces or a fraction',()=>{
 for(const [label,grams] of [['2 cookies (30 g)',30],['1/2 cup (40 g)',40],['½ cup (40g)',40],['1 bar (33,5 g)',33.5],['1 oz (28 g)',28],['0.25 kg',250]]){
  const p=F.normalizeOFF({serving_size:label,nutriments:{'energy-kcal_100g':400}});assert.equal(p.defaultGrams,grams,label);assert.equal(F.totalNutrition(p).cal,grams*4,label);
 }
 assert.equal(F.servingFromOFF({serving_size:'2 cookies'}).known,false);
 assert.equal(F.servingFromOFF({serving_size:'2 cookies'}).size,100);
});

test('normalized serving quantity wins and liquids retain ml instead of being labelled grams',()=>{
 const p=F.normalizeOFF({serving_quantity:330,serving_quantity_unit:'ml',serving_size:'1 bottle (330 ml)',nutriments:{'energy-kcal_100g':42}});
 assert.equal(p.nutritionUnit,'ml');assert.equal(F.totalNutrition(p).cal,138.6);assert.equal(F.amountLabel(p),'330 ml');
 assert.equal(F.servingFromOFF({serving_size:'250 ml'}).unit,'ml');
 assert.equal(F.servingFromOFF({serving_size:'8 fl oz'}).known,false);
 assert.equal(F.servingFromOFF({serving_size:'1 oz'}).size,28.349523125);
});

test('per-serving-only labels convert once; kcal, kJ, salt and explicit zero are handled correctly',()=>{
 const p=F.normalizeOFF({serving_size:'2 crackers (25g)',nutriments:{'energy-kcal_serving':100,proteins_serving:5,carbohydrates_serving:12.5,fat_serving:2.5,sodium_serving:.025}});
 assert.equal(p.per100.cal,400);assert.equal(p.per100.sodium,100);assert.equal(F.totalNutrition(p).cal,100);
 assert.ok(Math.abs(F.normalizeOFF({nutriments:{'energy-kj_100g':418.4}}).per100.cal-100)<1e-8);
 assert.ok(Math.abs(F.normalizeOFF({nutriments:{energy_100g:418.4,energy_unit:'kcal'}}).per100.cal-100)<1e-8);
 const zero=F.normalizeOFF({nutriments:{'energy-kcal_100g':0,energy_100g:10,salt_100g:1.25}});
 assert.equal(zero.per100.cal,0);assert.equal(zero.per100.sodium,500);
});

test('missing, nonfinite and implausible nutrition is flagged instead of silently guessed',()=>{
 for(const value of [null,'',undefined,-2,Infinity,'unknown'])assert.equal(F.normalizeOFF({nutriments:{'energy-kcal_100g':value}}).per100.cal,null);
 assert.equal(F.normalizeOFF({serving_size:'2 cookies',nutriments:{'energy-kcal_serving':100}}).per100.cal,null);
 assert.equal(F.normalizeOFF({nutriments:{'energy-kcal_100g':1500}}).needsNutritionCheck,true);
 assert.equal(F.normalizeOFF({nutriments:{'energy-kcal_100g':720,proteins_100g:9.5,carbohydrates_100g:.6,fat_100g:10}}).needsNutritionCheck,true);
 assert.equal(F.normalizeOFF({nutriments:{'energy-kcal_100g':0,proteins_100g:0,carbohydrates_100g:0,fat_100g:0}}).needsNutritionCheck,false);
});

test('serving size and count scale all seven nutrients once and preserve precision',()=>{
 const h=harness();h.c.setFoodBase({name:'Sample food',defaultGrams:50,per100:macros});h.el('foodServings').value='2.5';
 let draft=h.c.foodDraftFromForm();assert.equal(draft.grams,125);assert.equal(draft.servings,2.5);assert.equal(h.c.foodTotals(draft).cal,500);assert.equal(h.c.foodTotals(draft).sodium,125);
 h.el('foodGrams').value='30';h.c.updateFoodTotalsFromBase();draft=h.c.foodDraftFromForm();assert.equal(draft.grams,75);assert.equal(h.c.foodTotals(draft).cal,300);
 for(const key of F.nutrients)assert.equal(h.c.foodTotals(draft)[key],macros[key]*.75,key);
 h.c.setFoodBase({name:'Precise portion',defaultGrams:33,per100:{...macros,cal:123.456789}});assert.equal(h.c.foodDraftFromForm().per100.cal,123.456789);
});

test('manual label corrections survive subsequent changes to serving size and count',()=>{
 const h=harness();h.c.clearFoodForm({showEditor:true});h.el('foodName').value='My food';h.el('foodGrams').value='50';h.el('foodCal').value='100';h.c.updateFoodNutritionFromForm();
 h.el('foodServings').value='3';assert.equal(h.c.foodTotals(h.c.foodDraftFromForm()).cal,300);
 h.el('foodGrams').value='100';h.c.updateFoodTotalsFromBase();assert.equal(h.el('foodCal').value,'200');assert.equal(h.c.foodTotals(h.c.foodDraftFromForm()).cal,600);
 h.c.setFoodBase({name:'Database food',defaultGrams:50,per100:macros});h.el('foodCal').value='150';h.c.updateFoodNutritionFromForm();h.el('foodGrams').value='100';h.c.updateFoodTotalsFromBase();assert.equal(h.el('foodCal').value,'300');
});

test('empty, zero, negative or invalid portions never fall back to an invented 100 g',()=>{
 const h=harness();h.c.setFoodBase({name:'Sample',defaultGrams:50,per100:macros});
 for(const [id,value] of [['foodGrams',''],['foodGrams','0'],['foodGrams','-3'],['foodServings','0'],['foodServings','NaN']]){
  h.el('foodGrams').value='50';h.el('foodServings').value='1';h.el(id).value=value;assert.equal(h.c.foodDraftFromForm(),null);
 }
});

test('quick-add portions can be edited in the basket without duplicating foods or touching saved rows',()=>{
 const previous={id:'old',name:'Already saved',meal:'Breakfast',grams:100,per100:macros},h=harness([previous]);
 h.c.queueFoodProduct({name:'Egg',defaultGrams:50,per100:{...macros,cal:143}});const id=h.c.foodState.batch[0].id;
 h.c.editQueuedFood(id);h.el('foodServings').value='2';let pending=h.c.pendingFoodDrafts();assert.equal(pending.length,1);assert.equal(pending[0].grams,100);assert.equal(pending[0].id,id);assert.equal(h.rows().length,1);
 h.c.queueFoodEntry();assert.equal(h.c.foodState.batch.length,1);assert.equal(h.c.foodState.batch[0].servings,2);h.c.saveFoodEntry();assert.equal(h.rows().length,2);assert.deepEqual(h.rows()[0],previous);assert.equal(h.c.foodTotals(h.rows()[1]).cal,143);
});

test('existing rows edit and delete independently; legacy grams remain compatible',()=>{
 const h=harness([{id:'old',name:'Old entry',meal:'Lunch',grams:80,per100:macros},{id:'keep',name:'Keep me',meal:'Lunch',grams:100,per100:macros}]);
 h.c.editFoodEntry('old');assert.equal(+h.el('foodGrams').value,80);assert.equal(+h.el('foodServings').value,1);h.el('foodServings').value='0.5';h.c.saveFoodEntry();assert.equal(h.rows()[0].grams,40);assert.equal(h.rows()[1].grams,100);
 h.c.deleteFoodEntry();assert.equal(h.rows().length,1);assert.equal(h.rows()[0].id,'keep');
});

test('My Foods and history retain portion metadata, including liquid quantities',()=>{
 const entry={name:'Drink',grams:500,servingSize:250,servings:2,nutritionUnit:'ml',per100:macros,saveToFoods:true};
 const h=harness();h.c.savePersonalFood(entry);const product=h.data.get('foods')[0];assert.equal(product.defaultGrams,250);assert.equal(product.defaultServings,2);assert.equal(product.nutritionUnit,'ml');
 h.c.setFoodBase(product);const restored=h.c.foodDraftFromForm();assert.equal(restored.grams,500);assert.equal(restored.servings,2);assert.equal(h.c.foodTotals(restored).cal,2000);
});

test('unknown calories and unknown serving sizes open review instead of instant quick-add',()=>{
 for(const product of [F.normalizeOFF({product_name:'Unknown'}),F.normalizeOFF({product_name:'Unspecified portion',nutriments:{'energy-kcal_100g':80}})]){
  const h=harness();h.c.queueFoodProduct(product);assert.equal(h.c.foodState.batch.length,0);assert.equal(h.el('foodEntryEditor').hidden,false);
 }
});

test('portion controls and calculation module load in production, offline and native source',()=>{
 const html=read('work-gym-planner-v15/index.html');for(const id of ['foodGrams','foodServings','foodPortionSummary'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('Nutrition for 1 serving'));assert.ok(read('work-gym-planner-v16/diary-a.js').includes('data-edit-food-batch'));
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html','work-gym-planner-v16/index.html','work-gym-planner/sw.js','work-gym-planner-v16/sw.js'])assert.ok(read(file).includes('food-portions-v50.js'),file);
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html','work-gym-planner/sw.js','work-gym-planner-v16/sw.js','work-gym-planner-v16/pwa-patch.js'])assert.ok(read(file).includes('30.1.31-free57'),file);
});
