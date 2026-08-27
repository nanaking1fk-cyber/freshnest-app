// The signed-in Home showed the same number three times, coloured eleven icons
// six different ways, and buried Today's Plan under two marketing blocks.
// These tests hold the cleanup.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

const today=read('work-gym-planner-v16/today.js');
const css=read('work-gym-planner-v16/home-v27.css');
const shell=read('work-gym-planner/index.html');

test('the product is called one thing',()=>{
  assert.doesNotMatch(today,/WORK \/ GYM/,'the header said "WORK / GYM COACH" while the landing said "Work + Workout"');
  assert.match(today,/Work \+ Workout/);
});

test('the day is the first thing under the header',()=>{
  const strip=today.indexOf('homeSummaryGrid');
  const plan=today.indexOf('>Today</h2>');
  const fuel=today.indexOf('>Fuel</h2>');
  assert.ok(strip>0&&plan>strip,'the today strip comes first, then the plan');
  assert.ok(fuel>plan,'fuel follows the plan, not the other way round');
});

test('a figure is not repeated across panels',()=>{
  // Calories used to appear as a summary card, a macro row and a ring.
  assert.equal((today.match(/n\.cal\.toLocaleString\(\)/g)||[]).length,1,
    'the calorie target belongs in exactly one place');
  assert.doesNotMatch(today,/nutritionRing|homeRing|readinessPanel/,
    'the duplicate rings are gone');
});

test('quick actions do not duplicate what is already on screen',()=>{
  for(const gone of ['quickWorkout','quickFood'])
    assert.ok(!today.includes(`id="${gone}"`),
      `${gone} duplicates an action already present in a panel above`);
  for(const kept of ['quickWeight','quickBody','quickBarcode'])
    assert.ok(today.includes(`id="${kept}"`),`${kept} has no other route`);
});

test('every binding is guarded so a removed id cannot break the rest',()=>{
  assert.match(today,/const on=\(id,fn\)=>\{const el=\$\('#'\+id\);if\(el\)el\.onclick=fn\}/);
  const raw=today.slice(today.indexOf('const on=('));
  assert.doesNotMatch(raw,/\$\('#[a-zA-Z]+'\)\.onclick=/,
    'an unguarded binding would throw and kill every binding after it');
});

test('colour is semantic, not decorative',()=>{
  for(const name of ['--hv-work','--hv-train','--hv-meal','--hv-rest'])
    assert.ok(css.includes(name),`${name} must be defined`);
  // the old rainbow classes carried no meaning
  assert.doesNotMatch(today,/homeIcon (green|blue|orange|purple)|metricIcon|macroIcon/,
    'the decorative icon colours are gone');
});

test('home styles cannot leak out of the dashboard',()=>{
  const rules=css.split('}').map(r=>r.split('{')[0].trim())
    .filter(Boolean).filter(r=>!r.startsWith('@')&&!r.startsWith('/*'));
  const leaks=rules.filter(r=>r&&!r.includes('.homeDashV27'));
  assert.deepEqual(leaks,[],'every rule must be scoped to .homeDashV27');
});

test('the Quick Plan composer still has its anchor',()=>{
  // story-v19 injects it after .homeSummaryGrid inside .homeDash
  assert.match(today,/class="homeDash homeDashV27"/);
  assert.match(today,/class="homeSummaryGrid hvStrip"/);
  assert.match(today,/class="quickGrid hvQuick"/);
});

test('the stylesheet is loaded and cached',()=>{
  assert.match(shell,/home-v27\.css/);
  assert.match(read('work-gym-planner/sw.js'),/home-v27\.css/);
});
