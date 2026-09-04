const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('ad-ready tour assets are optimized, vertical and fast-started',()=>{
 const mp4=fs.readFileSync(path.join(root,'work-gym-planner-v16/assets/work-workout-tour-v76.mp4'));
 const poster=fs.statSync(path.join(root,'work-gym-planner-v16/assets/work-workout-tour-v76-poster.jpg'));
 assert.ok(mp4.length>500_000&&mp4.length<8_000_000,'tour should be useful but lightweight');
 assert.ok(poster.size>20_000&&poster.size<500_000,'poster should be optimized');
 assert.equal(mp4.subarray(4,8).toString(),'ftyp');
 assert.ok(mp4.subarray(0,300_000).includes(Buffer.from('moov')),'MP4 metadata should be at the front for streaming');
});

test('tour uses safe fictional demonstration data and covers the whole product',()=>{
 const generator=read('scripts/create-product-tour-v76.mjs');
 assert.match(generator,/maya@example\.test/);assert.match(generator,/City Hospital/);
 assert.match(generator,/pageErrors/);assert.match(generator,/if\(pageErrors\.length\)process\.exitCode=1/);
 for(const chapter of ['TODAY','CALENDAR','TRAINING','NUTRITION','STEPS & RECOVERY','HOURS & PAY','YOUR SPACE'])assert.ok(generator.includes(chapter),chapter);
});

test('in-app player loads the large video only after an explicit tap',()=>{
 const js=read('work-gym-planner-v16/product-tour-v76.js');
 assert.match(js,/<video controls playsinline preload="none"/);
 const tag=js.match(/<video controls playsinline preload="none"[^>]*>/)?.[0]||'';
 assert.doesNotMatch(tag,/\ssrc=/);
 assert.match(js,/player\.src=VIDEO/);assert.match(js,/dataset\.loaded/);
 assert.match(js,/landingProductTourV76/);assert.match(js,/openProductTourV76/);
 assert.match(js,/event\.key==='Escape'/);assert.match(js,/video\(\)\?\.pause\(\)/);
 for(const chapter of ['Today','Calendar','Training','Nutrition','Steps & recovery','Hours & pay','Your space'])assert.ok(js.includes("label:'"+chapter+"'"),chapter);
});

test('tour design is premium scoped and mobile viewport safe',()=>{
 const css=read('work-gym-planner-v16/product-tour-v76.css');
 const selectors=css.split('\n').map(line=>line.trim()).filter(line=>line.includes('{')&&!line.startsWith('@')).map(line=>line.split('{')[0]);
 assert.ok(selectors.length>20);
 selectors.flatMap(value=>value.split(',')).forEach(selector=>assert.match(selector.trim(),/^body\.premiumV30/));
 assert.match(css,/100dvh/);assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('production and offline loaders include the player but never pre-cache the video',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){
  const text=read(file);assert.ok(text.includes('product-tour-v76.js'),file);assert.ok(text.includes('product-tour-v76.css'),file);assert.ok(text.includes('30.1.31-tour76'),file);
 }
 for(const file of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
  const text=read(file);assert.ok(text.includes('product-tour-v76.js'),file);assert.ok(text.includes('product-tour-v76.css'),file);assert.ok(!text.includes('work-workout-tour-v76.mp4'),file);
 }
});
