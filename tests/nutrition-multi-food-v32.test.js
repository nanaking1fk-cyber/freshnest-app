const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const shell=read('work-gym-planner-v15/index.html');
const production=read('work-gym-planner/index.html');
const worker=read('work-gym-planner/sw.js');
const diaryA=read('work-gym-planner-v16/diary-a.js');
const diaryB=read('work-gym-planner-v16/diary-b.js');
const init=read('work-gym-planner-v16/init.js');
const css=read('work-gym-planner-v16/app-v30.css');

test('food modal exposes a staged basket and multi-add controls',()=>{
  assert.match(shell,/id="foodBatchTray"/);
  assert.match(shell,/id="queueFoodEntry"[^>]*>Add &amp; keep adding</);
  assert.match(shell,/id="saveFoodEntry"/);
  assert.match(shell,/data-close="foodDialog"[^>]*aria-label="Cancel food logging"/);
  assert.match(init,/#queueFoodEntry'\)\.onclick=queueFoodEntry/);
});

test('pending foods append to existing diary rows and the final count includes the completed form',()=>{
  assert.match(diaryA,/function pendingFoodDrafts\(\)/);
  assert.match(diaryA,/form&&!batch\.some\(x=>sameFoodDraft\(x,form\)\)/,
    'the current form should count once when the same selected food is already staged');
  assert.match(diaryA,/saveDiary\(k,\[\.\.\.a,\.\.\.pending\.map\(diaryFood\)\]\)/,
    'multi-save must append rather than replace existing rows');
  assert.match(diaryA,/commit\.textContent=editing\?'Save changes':pending\.length/,
    'the save label must use staged foods plus the completed form');
});

test('search results separate selection from quick add',()=>{
  assert.match(diaryB,/class="foodResultSelect"[^>]*data-result-index/);
  assert.match(diaryB,/class="foodQuickAdd"[^>]*data-quick-add-index/);
  assert.match(diaryB,/queueFoodProduct\(lastSearchProducts\[\+b\.dataset\.quickAddIndex\]\)/);
  assert.match(diaryB,/lastSearchProducts=built;[\s\S]*bindFoodResults\(\);[\s\S]*await foodRequest/,
    'built-in results should be usable before remote search finishes');
});

test('recipes stage every recipe item and wait for final confirmation',()=>{
  assert.match(diaryB,/data-recipe="\$\{i\}"/);
  assert.match(diaryB,/stageFoodItems\(r\.items,r\.name\)/);
  assert.match(diaryA,/function stageFoodItems\(items,label='Foods'\)[\s\S]*foodState\.batch=\[\.\.\.\(foodState\.batch\|\|\[\]\),\.\.\.copies\]/);
  assert.doesNotMatch(diaryB,/data-recipe[\s\S]{0,900}saveDiary\(/,
    'choosing a recipe must not write directly to the diary');
});

test('existing entries remain individually editable and deletable',()=>{
  assert.match(diaryA,/a\.map\(z=>z\.id===foodState\.editId\?diaryFood\(x\):z\)/,
    'editing must replace only the matching row');
  assert.match(diaryA,/diary\(k\)\.filter\(x=>x\.id!==foodState\.editId\)/,
    'deleting must remove only the selected row');
  assert.match(diaryA,/function discardFoodDraft\(\)[^{]*\{foodState=/);
  assert.match(init,/e\.target\.id==='foodDialog'\)discardFoodDraft\(\)/);
  assert.match(init,/e\.key==='Escape'[\s\S]{0,100}discardFoodDraft\(\)/);
});

test('meal changes move all staged foods and summaries report count, calories, and protein',()=>{
  assert.match(diaryA,/foodState\.batch=\(foodState\.batch\|\|\[\]\)\.map\(x=>\(\{\.\.\.x,meal:foodState\.meal\}\)\)/);
  assert.match(diaryA,/\$\{count\} · \$\{Math\.round\(sum\)\} kcal · \$\{Math\.round\(protein\)\}g protein/);
  for(const meal of ['Breakfast','Lunch','Dinner','Snacks'])assert.ok(diaryA.includes(`'${meal}'`));
});

test('new diary and nutrition-modal CSS stays strictly scoped',()=>{
  const added=css.slice(css.indexOf('/* Multi-food logging is isolated'));
  const beforeProgress=added.slice(0,added.indexOf('/* Progress gets'));
  const selectors=beforeProgress.split('}').map(rule=>rule.split('{')[0].trim())
    .filter(Boolean).filter(selector=>!selector.startsWith('@')&&!selector.startsWith('/*'));
  const leaks=selectors.filter(selector=>selector.split(',').some(part=>{
    const value=part.trim();
    return value&&!value.startsWith('body.premiumV30 #foodDialog')&&!value.startsWith('body.premiumV30 #repeatMealDialog')&&!value.startsWith('body.premiumV30 #page-diary');
  }));
  assert.deepEqual(leaks,[]);
  assert.match(css,/body\.premiumV30 #foodDialog \.foodBatchTray/);
  assert.match(css,/body\.premiumV30 #foodDialog \.foodQuickAdd/);
  assert.match(css,/body\.premiumV30 #foodDialog \.sheetActions\{position:sticky/);
});

test('production shell and service worker retain required nutrition assets',()=>{
  for(const file of ['diary-a.js','diary-b.js','init.js','app-v30.css']){
    assert.ok(production.includes(file),`${file} must remain loaded by production`);
    assert.ok(worker.includes(file),`${file} must remain cached by the service worker`);
  }
});
