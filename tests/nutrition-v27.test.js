// The food diary printed the same calorie figure three times in a row —
// "2325 calories remaining" above "2325 Goal − 0 Food = 2325 Left" — and gave
// six macro bars the same grey, so colour carried nothing.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

const skeleton=read('work-gym-planner-v15/index.html');
const diary=read('work-gym-planner-v16/diary-a.js');
const css=read('work-gym-planner-v16/nutrition-v27.css');

test('the calorie equation is gone',()=>{
  assert.doesNotMatch(skeleton,/energyEquation/,
    'goal − food = left restated a number already shown above it');
  assert.doesNotMatch(skeleton,/id="calLeftSmall"/,
    'the third restatement of the same figure is gone');
});

test('one headline figure, one context line',()=>{
  assert.equal((skeleton.match(/id="calRemaining"/g)||[]).length,1);
  assert.match(skeleton,/class="energyLine"/);
  // eaten and goal appear once each, as context rather than as an equation
  assert.equal((skeleton.match(/id="calFood"/g)||[]).length,1);
  assert.equal((skeleton.match(/id="calGoal"/g)||[]).length,1);
});

test('a removed id cannot break the render',()=>{
  assert.match(diary,/const set=\(id,v\)=>\{const el=\$\(id\);if\(el\)el\.textContent=v\}/);
  assert.doesNotMatch(diary,/\$\('cal[A-Za-z]+'\)\.textContent=/,
    'an unguarded assignment would throw when an id is retired');
});

test('macros carry their domain colour',()=>{
  for(const cls of ['mProtein','mCarbs','mFat','mMinor'])
    assert.ok(diary.includes(`'${cls}'`),`${cls} must be assigned in the macro list`);
  assert.match(diary,/macroLine \$\{cls\}/);
  assert.match(css,/\.macroLine\.mProtein \.track i\{background:var\(--nv-train\)\}/);
  assert.match(css,/\.macroLine\.mCarbs\s+\.track i\{background:var\(--nv-meal\)\}/);
  assert.match(css,/\.macroLine\.mFat\s+\.track i\{background:var\(--nv-rest\)\}/);
});

test('diary styles cannot leak out of the diary page',()=>{
  const rules=css.split('}').map(r=>r.split('{')[0].trim())
    .filter(Boolean).filter(r=>!r.startsWith('@')&&!r.startsWith('/*'));
  const leaks=rules.filter(r=>r&&!r.includes('#page-diary'));
  assert.deepEqual(leaks,[],'every rule must be scoped to #page-diary');
});

test('the stylesheet is loaded and cached',()=>{
  assert.match(read('work-gym-planner/index.html'),/nutrition-v27\.css/);
  assert.match(read('work-gym-planner/sw.js'),/nutrition-v27\.css/);
});
