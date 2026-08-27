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
  assert.match(js,/Progressive Coach/);
  assert.match(js,/Plan adapted/);
});

test('the story is authentic to connected working lives',()=>{
  assert.match(js,/Your shift is fixed/);
  for(const signal of ['Work','Train','Fuel','Recover'])assert.match(js,new RegExp('>'+signal+'<'));
  for(const worker of ['Healthcare','Construction','Logistics','Hospitality'])assert.match(js,new RegExp(worker));
});

test('the trust layer appears before commitment',()=>{
  assert.match(js,/Review before saving/);
  assert.match(js,/Nothing saved silently/);
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
  assert.match(css,/body\.landingActive \.bottomNav[^{]*\{display:none!important\}/);
});

test('the landing only shows to signed-out visitors',()=>{
  assert.match(js,/function shouldShow\(\)\{return !A\.session\}/);
  assert.match(js,/wgc:authchange/);
});
