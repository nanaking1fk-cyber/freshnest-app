// The v27 landing replaces two interleaved implementations (landing-v18 built
// the markup, story-v19 rewrote parts of it at runtime) with one module.
// These tests hold that boundary and the things that made the old page messy.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

const shell=read('work-gym-planner/index.html');
const css=read('work-gym-planner-v16/landing-v27.css');
const js=read('work-gym-planner-v16/landing-v27.js');

test('one landing module is loaded, not two',()=>{
  assert.match(shell,/landing-v27\.js/);
  assert.match(shell,/landing-v27\.css/);
  assert.doesNotMatch(shell,/landing-v18\.js/,'the retired landing module must not load');
  assert.doesNotMatch(shell,/landing-v18\.css/,'the retired landing stylesheet must not load');
});

test('story-v19 can no longer rewrite the landing',()=>{
  // enhanceLanding() self-disables: it looks for #premiumLanding, which the
  // v27 module never creates. Guard the id so that stays true.
  assert.match(read('work-gym-planner-v16/story-v19.js'),/getElementById\('premiumLanding'\)/);
  assert.doesNotMatch(js,/premiumLanding/,'v27 must not reuse the id story-v19 hooks');
});

test('the signed-in dashboard no longer carries landing marketing',()=>{
  const story=read('work-gym-planner-v16/story-v19.js');
  assert.doesNotMatch(story,/insertAdjacentHTML\('afterend',captureMarkup\(\)\+inAppWorkersMarkup\(\)\)/,
    'the in-app worker marketing block must not be injected');
  assert.match(story,/insertAdjacentHTML\('afterend',captureMarkup\(\)\)/,
    'the Quick Plan composer must still be injected');
});

test('landing styles cannot leak into the signed-in app',()=>{
  const rules=css.split('}').map(r=>r.split('{')[0].trim())
    .filter(Boolean).filter(r=>!r.startsWith('@')&&!r.startsWith('/*'));
  const leaks=rules.filter(r=>r&&!r.includes('#wwLanding')&&!r.startsWith('body.landingActive'));
  assert.deepEqual(leaks,[],'every rule must be scoped to #wwLanding');
});

test('typefaces are self-hosted so the CSP stays same-origin',()=>{
  assert.doesNotMatch(css,/fonts\.googleapis\.com|fonts\.gstatic\.com/,
    'no external font host — the CSP has no exception for one');
  const faces=css.match(/@font-face/g)||[];
  assert.equal(faces.length,8,'eight faces are declared');
  for(const file of (css.match(/vendor\/fonts\/[a-z0-9-]+\.woff2/g)||[])){
    assert.ok(fs.existsSync(path.join(root,'work-gym-planner-v16',file.replace('./',''))),
      `${file} must exist`);
  }
});

test('one verb for the primary action',()=>{
  const labels=js.match(/data-ww="signup">([^<]+)</g)||[];
  assert.ok(labels.length>=2,'the signup action appears more than once');
  const unique=new Set(labels.map(l=>l.replace(/.*>/,'')));
  assert.equal(unique.size,1,`the primary action must read the same everywhere, found: ${[...unique]}`);
});

test('the landing sits above the app chrome but below its own dialog',()=>{
  // .bottomNav is z-index:50 and .modal is 100 in the app stylesheets. Shipping
  // the landing at 40 put the app's tab bar on top of it.
  const z=(css.match(/#wwLanding\{[\s\S]*?z-index:(\d+)/)||[])[1];
  assert.ok(z,'the landing must declare a z-index');
  assert.ok(Number(z)>50,`must sit above .bottomNav (50), got ${z}`);
  assert.ok(Number(z)<100,`must sit below .modal (100) so the account dialog opens over it, got ${z}`);
  assert.match(css,/body\.landingActive \.bottomNav[^{]*\{display:none\}/,
    'app chrome must be hidden, not merely covered');
});

test('the landing only shows to signed-out visitors',()=>{
  assert.match(js,/function shouldShow\(\)\{return !A\.session\}/);
  assert.match(js,/wgc:authchange/);
});
