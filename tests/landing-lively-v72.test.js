const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..','work-gym-planner-v16',file),'utf8');
const js=read('landing-v29.js'),css=read('landing-v29.css');

test('welcome offers three visitor-controlled, clearly labeled examples',()=>{
 for(const name of ['day','night','off'])assert.ok(js.includes('data-ww72-day="'+name+'"'));
 assert.ok(js.includes('aria-label="Explore example schedules"'));
 assert.ok(js.includes('aria-live="polite"'));
 assert.ok(js.includes('aria-controls="ww72DayExample"'));
 assert.ok(js.includes("item.setAttribute('aria-pressed',String(item===button))"));
 assert.ok(js.includes('Example day, not your saved schedule'));
});
test('welcome interaction changes the example only, without persistence or services',()=>{
 const interaction=js.slice(js.indexOf("root.querySelectorAll('[data-ww72-day]')"),js.indexOf('function shouldShow'));
 for(const forbidden of ['fetch(','localStorage','sessionStorage','setTimeout','setInterval','openAccount','save('])assert.ok(!interaction.includes(forbidden),forbidden);
 assert.ok(interaction.includes('.textContent=example.title'));
 assert.ok(interaction.includes('preview.dataset.example=choice'));
});
test('welcome motion is short, finite and respects reduced motion',()=>{
 assert.ok(js.includes("!window.matchMedia('(prefers-reduced-motion: reduce)').matches"));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(css.includes('transition:none;animation:none'));
 assert.ok(!css.includes('infinite'));
 assert.ok(!js.includes('setInterval'));
 assert.ok(js.includes('class="ww72Atmosphere" aria-hidden="true"'));
 assert.ok(css.includes('pointer-events:none'));
});
