// Diary UI ------------------------------------------------------------------
const MEALS=['Breakfast','Lunch','Dinner','Snacks'];
let repeatMealState=null;
function renderDiary(){let k=$('diaryDate')?.value||dkey(),t=target(k),a=totals(k),left=Math.round(t.cal-a.cal);if(!$('calRemaining'))return;const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};set('calRemaining',left);set('calGoal',t.cal.toLocaleString());set('calFood',Math.round(a.cal).toLocaleString());set('calLeftSmall',left);let ms=[['Protein',a.p,t.p,'g','mProtein'],['Carbs',a.c,t.c,'g','mCarbs'],['Fat',a.f,t.f,'g','mFat'],['Fiber',a.fiber,t.fiber,'g','mMinor'],['Sodium',a.sodium,t.sodium,'mg','mMinor'],['Sat fat',a.satFat,t.satFat,'g','mMinor']];$('macroGrid').innerHTML=ms.map(([n,v,g,u,cls])=>`<div class="macroLine ${cls}"><label><span>${n}</span><span>${Math.round(v)} / ${Math.round(g)} ${u}</span></label><div class="track"><i style="width:${Math.min(100,g?v/g*100:0)}%"></i></div></div>`).join('');let dist=MEALS.map(m=>({m,p:mealTotals(k,m).p}));$('proteinDistribution').textContent=`Protein distribution: ${dist.map(x=>`${x.m} ${Math.round(x.p)}g`).join(' · ')}. Aim to spread protein across 3–4 meals when practical.`;
 let entries=diary(k),html='';for(const meal of MEALS){let ar=entries.filter(x=>x.meal===meal),sum=ar.reduce((z,x)=>z+foodTotals(x).cal,0),protein=ar.reduce((z,x)=>z+foodTotals(x).p,0),count=`${ar.length} ${ar.length===1?'item':'items'}`;html+=`<section class="meal"><div class="mealHead"><h3>${meal}<small>${count} · ${Math.round(sum)} kcal · ${Math.round(protein)}g protein</small></h3><div class="mealActions">${ar.length?`<button data-repeat-meal="${meal}">Repeat</button>`:''}<button data-save-recipe="${meal}">Save meal</button><button data-add-food="${meal}">+ Add foods</button></div></div>${ar.length?ar.map(x=>{let q=foodTotals(x);return`<button class="foodRow" data-food-id="${esc(x.id)}" aria-label="Edit ${esc(x.name)}"><div><div class="foodName">${esc(x.name)}</div><div class="foodSub">${esc(foodAmountLabel(x))} · P ${q.p.toFixed(1)} · C ${q.c.toFixed(1)} · F ${q.f.toFixed(1)}${x.source?` · ${esc(x.source)}`:''}</div></div><div class="foodCal">${Math.round(q.cal)}<small>kcal</small></div></button>`}).join(''):'<div class="emptyMeal">No foods yet. Add everything you ate to this meal.</div>'}</section>`}$('mealList').innerHTML=html;$$('[data-add-food]').forEach(b=>b.onclick=()=>openFood(b.dataset.addFood));$$('[data-food-id]').forEach(b=>b.onclick=()=>editFoodEntry(b.dataset.foodId));$$('[data-save-recipe]').forEach(b=>b.onclick=()=>saveMealRecipe(k,b.dataset.saveRecipe));$$('[data-repeat-meal]').forEach(b=>b.onclick=()=>openRepeatMeal(diary(k).filter(x=>x.meal===b.dataset.repeatMeal),{sourceDate:k,meal:b.dataset.repeatMeal,label:b.dataset.repeatMeal}));let water=+(localStorage.getItem(K.water+k)||0);$('waterText').textContent=`${water} / ${t.water} oz`;renderNutritionLibrary()}
function saveMealRecipe(k,meal){let items=diary(k).filter(x=>x.meal===meal);if(!items.length)return toast('No foods in this meal');let name=prompt('Recipe name:',meal+' meal');if(!name)return;let r=jget(K.recipes,[]);r.unshift({id:uid('recipe'),name,items:structuredClone(items),createdAt:new Date().toISOString()});jset(K.recipes,r.slice(0,100));renderNutritionLibrary();toast('Recipe saved')}

function nutritionLoggedMeals(limit=100){let out=[];for(const k of loggedDates().slice().reverse()){for(const meal of MEALS){let items=diary(k).filter(x=>x.meal===meal);if(items.length)out.push({date:k,meal,items})}}return out.slice(0,limit)}
function nutritionReusableMeals(limit=100){let unique=new Map;for(const x of nutritionLoggedMeals(500)){let key=x.meal+'|'+mealCopyFingerprint(x.items),found=unique.get(key);if(found)found.times++;else unique.set(key,{...x,times:1})}return[...unique.values()].slice(0,limit)}
function nutritionMealSummary(items){return items.reduce((a,x)=>{let q=foodTotals(x);a.cal+=q.cal;a.p+=q.p;return a},{cal:0,p:0})}
function nutritionFoodNames(items,max=4){let names=items.slice(0,max).map(x=>esc(x.name)).join(' · ');return names+(items.length>max?` · +${items.length-max} more`:'')}
function nutritionEmpty(title,copy){return`<div class="nutritionLibraryEmpty"><b>${esc(title)}</b><p>${esc(copy)}</p></div>`}
function nutritionHistoryFoods(limit=80){let seen=new Set,out=[];for(const k of loggedDates().slice().reverse()){for(const x of diary(k).slice().reverse()){let key=(x.code?`code:${x.code}`:`name:${String(x.name||'').trim().toLowerCase()}`)+'|'+(+x.grams||100);if(seen.has(key))continue;seen.add(key);out.push({date:k,meal:x.meal||'Meal',product:{name:x.name,brand:'',code:x.code||'',source:x.source||'Diary history',...window.WGCFoodPortions.productFromEntry(x)}});if(out.length>=limit)return out}}return out}
function stageFoodItems(items,label='Foods'){if(!items?.length)return;let meal=foodState.meal||$('foodMeal')?.value||'Breakfast',copies=items.map(x=>{let {saveToFoods,...entry}=structuredClone(x);return{...entry,id:uid('food'),meal,saveToFoods:false}});foodState.batch=[...(foodState.batch||[]),...copies];clearFoodSearch?.({restore:false});renderFoodBatch();toast(`${copies.length} ${copies.length===1?'food':'foods'} from ${label} ready to add`)}
function renderNutritionLibrary(){let history=$('nutritionHistoryList'),meals=$('nutritionMealsList');if(!history||!meals)return;let recent=nutritionHistoryFoods(),logged=nutritionReusableMeals();history.innerHTML=recent.length?recent.map((x,i)=>{let grams=window.WGCFoodPortions.portion(x.product).total,q=window.WGCFoodPortions.totalNutrition(x.product).cal;return`<article class="nutritionLibraryCard"><div class="nutritionLibraryIcon">H</div><button type="button" class="nutritionLibrarySelect" data-history-food="${i}"><small>${esc(fmt(x.date,{month:'short',day:'numeric'}))} · ${esc(x.meal)}</small><b>${esc(x.product.name)}</b><p>${esc(foodAmountLabel(x.product))} · ${Math.round(q)} kcal</p></button><button type="button" class="nutritionLibraryAdd" data-history-add="${i}" aria-label="Add ${esc(x.product.name)}">+</button></article>`}).join(''):nutritionEmpty('No history yet','Foods you log will appear here for fast reuse.');meals.innerHTML=logged.length?logged.map((x,i)=>{let q=nutritionMealSummary(x.items);return`<article class="nutritionLibraryCard"><div class="nutritionLibraryIcon">${x.meal.slice(0,1)}</div><div><small>Last eaten ${esc(fmt(x.date,{month:'short',day:'numeric'}))} · ${esc(x.meal)}</small><b>${x.items.length} ${x.items.length===1?'food':'foods'} · ${Math.round(q.cal)} kcal · ${Math.round(q.p)}g protein</b><p>${nutritionFoodNames(x.items)}${x.times>1?` · Logged ${x.times} times`:''}</p></div><button type="button" class="nutritionLibraryAdd" data-stage-meal="${i}" aria-label="Add this meal">+</button></article>`}).join(''):nutritionEmpty('No meals yet','Log a meal once, then add it again here.');$$('[data-history-food]').forEach(b=>b.onclick=()=>setFoodBase(recent[+b.dataset.historyFood].product));$$('[data-history-add]').forEach(b=>b.onclick=()=>queueFoodProduct(recent[+b.dataset.historyAdd].product));$$('[data-stage-meal]').forEach(b=>{b.onclick=()=>{let x=logged[+b.dataset.stageMeal];stageFoodItems(x.items,x.meal)}});renderSavedFoods();renderRecipes()}
function mealCopyFingerprint(items){return items.map(x=>[String(x.name||'').trim().toLowerCase(),+x.grams||0,...['cal','p','c','f','fiber','satFat','sodium'].map(k=>+(x.per100?.[k]||0))].join('|')).sort().join('||')}
function openRepeatMeal(items,{sourceDate='',meal='Breakfast',label='Meal'}={}){if(!items?.length)return toast('There are no foods to repeat');repeatMealState={items:structuredClone(items),sourceDate,label};$('repeatMealTitle').textContent=`Repeat ${label}`;$('repeatMealContext').textContent=sourceDate?`From ${fmt(sourceDate,{weekday:'short',month:'short',day:'numeric'})}`:'Choose where to log these foods';$('repeatMealDate').value=sourceDate?addDays(sourceDate,1):($('diaryDate')?.value||dkey());$('repeatMealMeal').value=MEALS.includes(meal)?meal:'Breakfast';let q=nutritionMealSummary(items);$('repeatMealPreview').innerHTML=`<div class="repeatMealPreviewHead"><span><b>${items.length} ${items.length===1?'food':'foods'}</b><small>${Math.round(q.cal)} kcal · ${Math.round(q.p)}g protein</small></span></div><div>${items.map(x=>{let t=foodTotals(x);return`<span><b>${esc(x.name)}</b><small>${esc(foodAmountLabel(x))} · ${Math.round(t.cal)} kcal</small></span>`}).join('')}</div>`;openModal('repeatMealDialog')}
function confirmRepeatMeal(){if(!repeatMealState?.items?.length)return;let targetDate=$('repeatMealDate').value||dkey(),meal=$('repeatMealMeal').value||'Breakfast',existing=diary(targetDate).filter(x=>x.meal===meal),copies=repeatMealState.items.map(x=>{let {saveToFoods,...entry}=x;return{...entry,id:uid('food'),meal}});if(existing.length&&mealCopyFingerprint(existing)===mealCopyFingerprint(copies))return toast(`That ${meal.toLowerCase()} is already logged`);jset(K.diary+targetDate,[...diary(targetDate),...copies]);repeatMealState=null;closeModal('repeatMealDialog');$('diaryDate').value=targetDate;renderDiary();toast(`${copies.length} ${copies.length===1?'food':'foods'} added to ${meal}`)}

// Food modal/search/scanner -------------------------------------------------
function openFood(meal='Breakfast'){foodState={editId:null,base:null,meal,batch:[],libraryTab:'history'};clearFoodForm();$('foodMeal').value=meal;$('foodTitle').textContent='Add foods';clearFoodSearch?.({restore:false});resetMealScan?.();openModal('foodDialog');foodTab('history');renderNutritionLibrary();renderFoodBatch();$('#foodSearchInput')?.focus()}
function clearFoodForm({showEditor=false}={}){['foodName','foodGrams','foodCal','foodProtein','foodCarbs','foodFat','foodFiber','foodSatFat','foodSodium'].forEach(id=>{if($(id))$(id).value=''});$('foodGrams').value=100;$('foodServings').value=1;$('foodServingSizeLabel').textContent='Serving size (g)';$('saveToMyFoods').checked=false;$('deleteFoodEntry').classList.add('hidden');$('foodSourceCard').innerHTML='';$('foodEntryEditor').hidden=!showEditor;foodState.base=null;foodState.batchEditId=null;foodState.nutritionReviewed=true;renderFoodBatch()}
function showFoodEditor(title='Food details'){clearFoodSearch?.({restore:false});$$('#foodDialog [data-food-pane]').forEach(p=>{p.hidden=true;p.classList.remove('active')});$$('#foodTabs button').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false');b.tabIndex=-1});$('foodSearchResults').hidden=true;$('foodEntryEditor').hidden=false;$('foodEditorTitle').textContent=title;$('foodEditorMeal').textContent=foodState.meal||'Breakfast';stopBarcode();renderFoodBatch()}
function foodTab(t='history'){let libraries=['history','meals','recipe','saved'],key=[...libraries,'scan','meal-scan','manual'].includes(t)?t:'history';if(libraries.includes(key))foodState.libraryTab=key;$$('#foodTabs button').forEach(b=>{let on=b.dataset.tab===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});$$('#foodDialog [data-food-pane]').forEach(p=>{let on=p.dataset.foodPane===key;p.hidden=!on;p.classList.toggle('active',on)});$('foodSearchResults').hidden=true;$('foodEntryEditor').hidden=key!=='manual';if(key==='manual')showFoodEditor(foodState.editId?'Edit food':'Quick add food');if(key!=='scan')stopBarcode();renderFoodBatch()}
function myFoods(){return jget(K.foods,[])}function recentFoods(){return jget(K.recent,[])}
function recipes(){return jget(K.recipes,[])}
const FOOD_NUTRIENT_FIELDS={cal:'foodCal',p:'foodProtein',c:'foodCarbs',f:'foodFat',fiber:'foodFiber',satFat:'foodSatFat',sodium:'foodSodium'};
function foodAmountLabel(x){return window.WGCFoodPortions.amountLabel(x)}
function currentFoodPortion(){let F=window.WGCFoodPortions,size=F.positive($('foodGrams').value),count=F.positive($('foodServings').value);return size&&count&&size*count<=100000?{size,count,total:F.rounded(size*count),unit:F.unit(foodState.base)}:null}
function foodFormError(){
 if(!$('foodName').value.trim())return 'Choose or enter a food first.';
 if(!currentFoodPortion())return 'Enter a serving size and number of servings greater than zero.';
 if(window.WGCFoodPortions.number($('foodCal').value)===null)return 'Enter the calories for one serving from the food label.';
 for(const id of Object.values(FOOD_NUTRIENT_FIELDS)){let value=$(id).value;if(value!==''&&window.WGCFoodPortions.number(value)===null)return 'Nutrition values must be zero or greater.'}
 if(+($('foodCal').value)*100/currentFoodPortion().size>1000)return 'Check the serving size and calories against the food label.';
 if(foodState.nutritionReviewed===false)return 'Check and correct the nutrition values using the food label before adding.';
 return '';
}
function renderFoodPortionSummary(){
 let host=$('foodPortionSummary');if(!host)return;let p=currentFoodPortion(),F=window.WGCFoodPortions,cal=F.number($('foodCal').value);
 if(!p){host.textContent='Enter a serving size and number of servings greater than zero.';return}
 host.textContent=F.format(p.count)+' × '+F.format(p.size)+' '+p.unit+' = '+F.format(p.total)+' '+p.unit+' total'+(cal===null?' · Enter calories below':' · '+Math.round((foodState.base?.per100?.cal??cal*100/p.size)*p.total/100)+' kcal');
}
function setFoodBase(p){
 if(!p)return;foodState.base=structuredClone(p);foodState.batchEditId=null;foodState.nutritionReviewed=!p.needsNutritionCheck;
 let portion=window.WGCFoodPortions.portion(p);$('foodName').value=p.name||'';$('foodGrams').value=portion.size;$('foodServings').value=portion.count;$('foodServingSizeLabel').textContent='Serving size ('+portion.unit+')';$('saveToMyFoods').checked=false;
 updateFoodTotalsFromBase();
 let label=p.servingLabel?'<p>Label serving: '+esc(p.servingLabel)+'</p>':'';
 let note=p.source==='Open Food Facts'?'Packaged-food information. Match the brand and check your label.':/AI/i.test(p.source||'')?'Photo estimate. Adjust the portion and nutrition to match your meal.':/Built-in/.test(p.source||'')?'Generic estimate. Match the cooking method and weigh your portion when possible.':'You can adjust this food without changing other diary entries.';
 $('foodSourceCard').innerHTML='<div class="sourceCard"><b>'+esc(p.name)+'</b>'+(p.brand?' · '+esc(p.brand):'')+'<p>'+esc(note)+'</p>'+label+(p.nutritionWarnings||[]).map(x=>'<p class="foodNutritionWarning">'+esc(x)+'</p>').join('')+'</div>';
 rememberRecentFood(p);showFoodEditor('Review food');renderFoodBatch();
 requestAnimationFrame(()=>$('foodEntryEditor')?.scrollIntoView({block:'start'}));
}
function rememberRecentFood(p){let r=recentFoods().filter(x=>x.code!==p.code||x.name!==p.name);r.unshift(p);jset(K.recent,r.slice(0,20))}
function updateFoodTotalsFromBase(){
 if(!foodState.base)return;let size=window.WGCFoodPortions.positive($('foodGrams').value);if(!size)return;
 for(const [key,id] of Object.entries(FOOD_NUTRIENT_FIELDS)){let value=window.WGCFoodPortions.number(foodState.base.per100?.[key]);$(id).value=value===null?'':String(Math.round(value*size/100*100)/100)}
}
function per100FromForm(){let size=window.WGCFoodPortions.positive($('foodGrams').value);return Object.fromEntries(Object.entries(FOOD_NUTRIENT_FIELDS).map(([key,id])=>{let value=window.WGCFoodPortions.number($(id).value);return[key,value!==null&&size?value*100/size:null]}))}
function updateFoodNutritionFromForm(){
 if(currentFoodPortion()){foodState.base={...(foodState.base||{}),per100:per100FromForm(),source:foodState.base?.source||'Manual'};foodState.nutritionReviewed=true}
 renderFoodBatch();
}
function foodDraftFromForm(){
 if(foodFormError())return null;let portion=currentFoodPortion(),base=foodState.base;
 return{id:foodState.editId||foodState.batchEditId||uid('food'),name:$('foodName').value.trim(),meal:$('foodMeal').value,grams:portion.total,servingSize:portion.size,servings:portion.count,nutritionUnit:portion.unit,servingLabel:+base?.defaultGrams===portion.size?base.servingLabel||'':'',per100:{...(base?.per100||per100FromForm())},source:base?.source||'Manual',code:base?.code||'',brand:base?.brand||'',saveToFoods:$('saveToMyFoods').checked};
}
function foodDraftFromProduct(p){let portion=window.WGCFoodPortions.portion(p);return{id:uid('food'),name:p.name||'Food',meal:foodState.meal||'Breakfast',grams:portion.total,servingSize:portion.size,servings:portion.count,nutritionUnit:portion.unit,servingLabel:p.servingLabel||'',per100:{...(p.per100||{})},source:p.source||'Saved',code:p.code||'',brand:p.brand||'',saveToFoods:false}}
function savePersonalFood(x){if(!x.saveToFoods)return;let f=myFoods().filter(z=>z.name.toLowerCase()!==x.name.toLowerCase());f.unshift(window.WGCFoodPortions.productFromEntry(x));jset(K.foods,f.slice(0,300))}
function diaryFood(x){let {saveToFoods,...entry}=x;return entry}
function sameFoodDraft(a,b){if(!a||!b)return false;return(a.code&&b.code?a.code===b.code:a.name.trim().toLowerCase()===b.name.trim().toLowerCase())&&+a.grams===+b.grams&&window.WGCFoodPortions.unit(a)===window.WGCFoodPortions.unit(b)}
function pendingFoodDrafts(){let batch=[...(foodState.batch||[])],form=foodDraftFromForm();if(foodState.batchEditId)return batch.map(x=>x.id===foodState.batchEditId&&form?form:x);if(form&&!batch.some(x=>sameFoodDraft(x,form)))batch.push(form);return batch}
function queueFoodProduct(p){
 if(foodState.editId||!p)return;
 if(p.needsNutritionCheck||p.servingSizeKnown===false||window.WGCFoodPortions.number(p.per100?.cal)===null){setFoodBase(p);return}
 let x=foodDraftFromProduct(p),form=foodDraftFromForm();foodState.batch=[...(foodState.batch||[]),x];
 if(form&&sameFoodDraft(form,x))clearFoodForm();rememberRecentFood(p);clearFoodSearch?.();renderFoodBatch();
}
function queueFoodEntry(){
 if(foodState.editId)return saveFoodEntry();let x=foodDraftFromForm();if(!x)return toast(foodFormError());
 if(foodState.batchEditId)foodState.batch=(foodState.batch||[]).map(item=>item.id===foodState.batchEditId?x:item);else foodState.batch=[...(foodState.batch||[]),x];
 clearFoodForm();clearFoodSearch?.({restore:false});foodTab(foodState.libraryTab||'history');$('#foodSearchInput')?.focus();renderFoodBatch();
}
function editQueuedFood(id){let x=(foodState.batch||[]).find(x=>x.id===id);if(!x)return;setFoodBase(window.WGCFoodPortions.productFromEntry(x));foodState.batchEditId=id;$('saveToMyFoods').checked=!!x.saveToFoods;$('foodEditorTitle').textContent='Adjust selected food';renderFoodBatch()}
function removeQueuedFood(id){foodState.batch=(foodState.batch||[]).filter(x=>x.id!==id);if(foodState.batchEditId===id)clearFoodForm();renderFoodBatch()}
function changeFoodMeal(meal){foodState.meal=meal||'Breakfast';foodState.batch=(foodState.batch||[]).map(x=>({...x,meal:foodState.meal}));if($('foodEditorMeal'))$('foodEditorMeal').textContent=foodState.meal;renderFoodBatch()}
function renderFoodBatch(){
 let tray=$('foodBatchTray'),commit=$('saveFoodEntry'),queue=$('queueFoodEntry'),context=$('foodMealContext');if(!tray||!commit||!queue)return;
 let editing=!!foodState.editId,meal=$('foodMeal')?.value||foodState.meal||'Breakfast',batch=foodState.batch||[],pending=editing?[]:pendingFoodDrafts(),sum=pending.reduce((z,x)=>z+foodTotals(x).cal,0),editorOpen=!$('foodEntryEditor').hidden;
 foodState.meal=meal;if($('foodEditorMeal'))$('foodEditorMeal').textContent=meal;if(context)context.textContent=editing?'Update this diary item':'Building '+meal+' · '+pending.length+' selected';tray.hidden=editing||!batch.length;
 tray.innerHTML=batch.length?'<div class="foodBatchHead"><span><b>'+batch.length+' '+(batch.length===1?'food':'foods')+' ready</b><small>'+Math.round(sum)+' kcal in '+esc(meal)+'</small></span><button type="button" data-clear-food-batch>Clear</button></div><div class="foodBatchItems">'+batch.map(original=>{let x=pending.find(item=>item.id===original.id)||original,q=foodTotals(x);return'<div><button type="button" class="foodBatchSelect" data-edit-food-batch="'+esc(x.id)+'" aria-label="Edit portion for '+esc(x.name)+'"><b>'+esc(x.name)+'</b><small>'+esc(foodAmountLabel(x))+' · '+Math.round(q.cal)+' kcal</small><em>Edit portion</em></button><button type="button" data-remove-food-batch="'+esc(x.id)+'" aria-label="Remove '+esc(x.name)+'">×</button></div>'}).join('')+'</div>':'';
 $$('[data-edit-food-batch]').forEach(b=>b.onclick=()=>editQueuedFood(b.dataset.editFoodBatch));$$('[data-remove-food-batch]').forEach(b=>b.onclick=()=>removeQueuedFood(b.dataset.removeFoodBatch));
 let clear=$('[data-clear-food-batch]');if(clear)clear.onclick=()=>{foodState.batch=[];if(foodState.batchEditId)clearFoodForm();renderFoodBatch()};
 queue.classList.toggle('hidden',editing||!editorOpen);queue.textContent=foodState.batchEditId?'Update portion':'Add & keep adding';queue.disabled=!!foodFormError();
 let incomplete=editorOpen&&!!$('foodName').value.trim()&&!!foodFormError();
 commit.disabled=editing?!foodDraftFromForm():!pending.length||incomplete;commit.textContent=editing?'Save changes':pending.length?'Add '+pending.length+' '+(pending.length===1?'food':'foods')+' to '+meal:'Add to '+meal;
 commit.dataset.pendingCount=String(pending.length);commit.dataset.pendingCalories=String(Math.round(sum));renderFoodPortionSummary();
}
function discardFoodDraft(){foodState={editId:null,base:null,meal:'Breakfast',batch:[],libraryTab:'history'};clearFoodSearch?.({restore:false});resetMealScan?.();clearFoodForm()}
function saveFoodEntry(){
 let k=$('diaryDate').value,a=diary(k),x=foodDraftFromForm();
 if(!$('foodEntryEditor').hidden&&$('foodName').value.trim()&&!x)return toast(foodFormError());
 if(foodState.editId){if(!x)return toast(foodFormError());savePersonalFood(x);saveDiary(k,a.map(z=>z.id===foodState.editId?diaryFood(x):z));closeModal('foodDialog');return}
 let pending=pendingFoodDrafts();if(!pending.length)return toast('Choose or enter at least one food');
 if(pending.some(item=>!window.WGCFoodPortions.positive(item.grams)||window.WGCFoodPortions.number(item.per100?.cal)===null))return toast('Review the serving size and calories of each selected food.');
 pending.forEach(savePersonalFood);saveDiary(k,[...a,...pending.map(diaryFood)]);let meal=foodState.meal||pending[0].meal,count=pending.length;closeModal('foodDialog');toast(count+' '+(count===1?'food':'foods')+' added to '+meal);
}
function editFoodEntry(id){
 let x=diary($('diaryDate').value).find(z=>z.id===id);if(!x)return;
 foodState={editId:id,base:null,meal:x.meal,batch:[],libraryTab:'history'};openModal('foodDialog');$('foodTitle').textContent='Edit food';$('foodMeal').value=x.meal;
 setFoodBase(window.WGCFoodPortions.productFromEntry(x));$('deleteFoodEntry').classList.remove('hidden');$('foodEditorTitle').textContent='Edit food';renderFoodBatch();
}
function deleteFoodEntry(){if(!foodState.editId)return;let k=$('diaryDate').value;saveDiary(k,diary(k).filter(x=>x.id!==foodState.editId));closeModal('foodDialog')}

const BUILTIN_FOODS=[
 {name:'Chicken breast, cooked',source:'Built-in generic food',defaultGrams:170,per100:{cal:165,p:31,c:0,f:3.6,fiber:0,satFat:1,sodium:74}},
 {name:'White rice, cooked',source:'Built-in generic food',defaultGrams:158,per100:{cal:130,p:2.7,c:28.2,f:.3,fiber:.4,satFat:.08,sodium:1}},
 {name:'Brown rice, cooked',source:'Built-in generic food',defaultGrams:195,per100:{cal:123,p:2.7,c:25.6,f:1,fiber:1.6,satFat:.26,sodium:4}},
 {name:'Whole egg',source:'Built-in generic food',defaultGrams:50,per100:{cal:143,p:12.6,c:.7,f:9.5,fiber:0,satFat:3.1,sodium:142}},
 {name:'Egg whites',source:'Built-in generic food',defaultGrams:100,per100:{cal:52,p:10.9,c:.7,f:.2,fiber:0,satFat:0,sodium:166}},
 {name:'Greek yogurt, nonfat plain',source:'Built-in generic food',defaultGrams:170,per100:{cal:59,p:10.3,c:3.6,f:.4,fiber:0,satFat:.1,sodium:36}},
 {name:'Oats, dry',source:'Built-in generic food',defaultGrams:40,per100:{cal:379,p:13.2,c:67.7,f:6.5,fiber:10.1,satFat:1.2,sodium:6}},
 {name:'Banana',source:'Built-in generic food',defaultGrams:118,per100:{cal:89,p:1.1,c:22.8,f:.3,fiber:2.6,satFat:.1,sodium:1}},
 {name:'Apple',source:'Built-in generic food',defaultGrams:182,per100:{cal:52,p:.3,c:13.8,f:.2,fiber:2.4,satFat:.03,sodium:1}},
 {name:'Salmon, cooked',source:'Built-in generic food',defaultGrams:170,per100:{cal:206,p:22.1,c:0,f:12.4,fiber:0,satFat:3.1,sodium:59}},
 {name:'Ground turkey 93% lean, cooked',source:'Built-in generic food',defaultGrams:113,per100:{cal:203,p:27.4,c:0,f:10.4,fiber:0,satFat:2.8,sodium:92}},
 {name:'Sweet potato, baked',source:'Built-in generic food',defaultGrams:180,per100:{cal:90,p:2,c:20.7,f:.15,fiber:3.3,satFat:.03,sodium:36}},
 {name:'Broccoli, cooked',source:'Built-in generic food',defaultGrams:156,per100:{cal:35,p:2.4,c:7.2,f:.4,fiber:3.3,satFat:.08,sodium:41}},
 {name:'Avocado',source:'Built-in generic food',defaultGrams:100,per100:{cal:160,p:2,c:8.5,f:14.7,fiber:6.7,satFat:2.1,sodium:7}},
 {name:'Whey protein powder',source:'Built-in generic food',defaultGrams:32,per100:{cal:375,p:75,c:12.5,f:6.3,fiber:0,satFat:3.1,sodium:500}}
].map(x=>({...x,brand:'',code:'',img:'',nutritionUnit:'g',defaultServings:1,servingLabel:({'Whole egg':'1 large egg (50 g)','Banana':'1 medium banana (118 g)','Apple':'1 medium apple (182 g)','White rice, cooked':'1 cup cooked (158 g)','Brown rice, cooked':'1 cup cooked (195 g)'})[x.name]||x.defaultGrams+' g portion'}));
function builtinFoodMatches(q){q=q.toLowerCase();let terms=q.split(/\s+/).filter(Boolean);return BUILTIN_FOODS.filter(x=>terms.every(t=>x.name.toLowerCase().includes(t))).slice(0,8)}
