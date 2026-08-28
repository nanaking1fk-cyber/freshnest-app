// v29 owns one signed-out experience: cinematic motion, real product states,
// and a worker-first story. These tests keep old landing modules from returning.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const shell=read('work-gym-planner/index.html');
const css=read('work-gym-planner-v16/landing-v29.css');
const js=read('work-gym-planner-v16/landing-v29.js');

test('one current landing module is loaded',()=>{
  assert.match(shell,/landing-v29\.js/);
  assert.match(shell,/landing-v29\.css/);
  assert.doesNotMatch(shell,/landing-v27\.(?:js|css)|landing-v18\.(?:js|css)|story-v19\.js/);
});

test('the cinematic hero shows the app in use across the day',()=>{
  for(const film of ['story-phone-work-v21.mp4','story-phone-gym-v21.mp4','story-phone-meal-v21.mp4']){
    assert.match(js,new RegExp(film.replace('.','\\.')));
    assert.ok(fs.existsSync(path.join(root,'work-gym-planner-v16/assets',film)));
  }
  assert.match(js,/Plan active/);
  assert.match(js,/Adaptive Coach/);
  assert.match(js,/Schedule changed/);
});

test('the story is authentic to connected working lives',()=>{
  assert.match(js,/Add your work schedule/);
  assert.match(js,/Get your whole week planned/);
  assert.match(js,/Upload a photo or PDF/);
  assert.match(js,/errands and reminders/);
  for(const signal of ['Work','Train','Fuel','Recover'])assert.match(js,new RegExp('>'+signal+'<'));
  for(const worker of ['Healthcare','Construction','Logistics','Hospitality'])assert.match(js,new RegExp(worker));
});

test('the trust layer appears before commitment',()=>{
  assert.match(js,/Nothing saves without your approval/);
  assert.match(js,/Review before it is saved/);
  assert.match(js,/Nothing saved yet/);
  assert.match(js,/confidence/i);
  assert.match(js,/Conflict found/);
});

test('mobile keeps sign in visible',()=>{
  assert.match(js,/class="ww29SignIn" data-ww29="signin">Sign in/);
  assert.doesNotMatch(css,/\.ww29NavActions \.ww29SignIn\{display:none/);
});

test('typefaces and cinematic media stay same-origin',()=>{
  assert.doesNotMatch(css,/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.equal((css.match(/@font-face/g)||[]).length,6);
  for(const file of css.match(/vendor\/fonts\/[a-z0-9-]+\.woff2/g)||[]){
    assert.ok(fs.existsSync(path.join(root,'work-gym-planner-v16',file)));
  }
  assert.doesNotMatch(js,/https?:\/\//,'the landing must not stream third-party media');
});

test('feature and worker controls are interactive and motion-safe',()=>{
  assert.match(js,/showFeature/);
  assert.match(js,/showScene/);
  assert.match(js,/data-feature="train" role="tab" aria-selected="false"/);
  assert.match(js,/setAttribute\('aria-selected'/);
  assert.match(js,/data-worker-next/);
  assert.match(js,/prefers-reduced-motion/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('the redesign stylesheet and final shell load last',()=>{
  const styles=shell.indexOf('app-v29.css'),schedule=shell.indexOf('schedule-platform-v25.css');
  const app=shell.indexOf("'app-v29.js'"),planner=shell.indexOf("'schedule-platform-v25.js'");
  assert.ok(styles>schedule);
  assert.ok(app>planner);
});

test('the landing sits between app chrome and account dialogs',()=>{
  const z=(css.match(/#wwLanding\.ww29\{[\s\S]*?z-index:(\d+)/)||[])[1];
  assert.ok(Number(z)>50&&Number(z)<100,`unexpected landing z-index ${z}`);
  assert.match(css,/body\.landingActive #appRoot[^\{]*\{display:none!important\}/);
  assert.match(css,/body\.landingActive\{[^}]*overflow-y:auto/);
  assert.doesNotMatch(css,/#wwLanding\.ww29\{[^}]*position:fixed/);
  assert.doesNotMatch(css,/#wwLanding\.ww29\{[^}]*-webkit-overflow-scrolling:touch/);
});

test('mobile landing respects device safe areas and avoids sticky blur stalls',()=>{
  assert.match(css,/env\(safe-area-inset-top,0px\)/);
  assert.match(css,/env\(safe-area-inset-left,0px\)/);
  assert.match(css,/env\(safe-area-inset-right,0px\)/);
  assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
  assert.match(css,/@media\(max-width:780px\)[\s\S]*?\.ww29NavIn\{[^}]*backdrop-filter:none/);
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/dataset\.cinemaVisible/);
  assert.match(js,/window\.scrollTo\(0,0\)/);
});

test('the landing only shows to signed-out visitors',()=>{
  assert.match(js,/function shouldShow\(\)\{return !A\.session\}/);
  assert.match(js,/wgc:authchange/);
});
