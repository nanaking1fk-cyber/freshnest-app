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
  // The label used to be repeated as three inline strings and drifted. It is
  // now one constant rendered by one helper, so drift is structurally impossible.
  assert.deepEqual(js.match(/data-ww="signup">[^'<]+</g)||[],[],
    'signup labels must come from the CTA constant, never inline strings');
  assert.match(js,/var CTA='[^']+';/,'a single constant defines the primary action label');
  const uses=js.match(/\bcta\(1?\)/g)||[];
  assert.equal(uses.length,3,`the CTA belongs in nav, hero and close, found ${uses.length}`);
});

test('the phone gets the same argument in fewer screens',()=>{
  // Unabridged, the page ran 6.5 phone screens; the week board alone was 2.2 of
  // them. These four rules are what took it to 4.4 — each one is load-bearing.
  const phone=(css.match(/@media\(max-width:720px\)\{([\s\S]*?)\n\}/)||[])[1]||'';
  assert.ok(phone,'a phone block must exist');
  assert.match(phone,/\.wwBoard\{display:flex;overflow-x:auto/,
    'the week swipes sideways instead of stacking seven days deep');
  assert.match(phone,/\.wwRow:nth-of-type\(n\+4\)\{display:none\}/,
    'the hero device shows three rows on a phone, not five');
  assert.match(phone,/\.wwChip\{display:none\}/,
    'the narrative chips are desktop garnish and must not stack on a phone');
  assert.match(phone,/\.wwSticky\{order:-1\}/,
    'without the sticky column the phone must lead the claims, not trail them');
});

test('section spacing cannot cancel the page gutter',()=>{
  // .wwSec and .shell sit on the same element, so a `padding:X 0 0` shorthand on
  // .wwSec wins on source order and zeroes the shell's horizontal gutter. On a
  // desktop the centring margin hid it; on a phone the week board sat flush
  // against the screen edge.
  assert.match(js,/class="wwSec shell"/,'sections carry both classes');
  const rule=(css.match(/#wwLanding \.wwSec\{([^}]*)\}/)||[])[1]||'';
  assert.ok(rule,'a .wwSec rule must exist');
  assert.doesNotMatch(rule,/(^|;)padding:/,'.wwSec must not use the padding shorthand');
  assert.match(rule,/padding-top:/,'.wwSec sets only its own top padding');
});

test('the product is the only dark object on the page',()=>{
  // The whole direction rests on this inversion: light marketing ground, and
  // the app screen carrying the only dark surface so the eye lands on it.
  assert.match(css,/--paper:#FAFAF8/,'the ground is a warm off-white');
  assert.match(css,/#wwLanding\{[\s\S]*?background:var\(--paper\)/,
    'the landing ground must be the light paper token');
  assert.match(css,/\.wwScreen\{background:var\(--app\)/,
    'the device screen must keep the dark app palette');
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
