// One lightweight welcome owns the signed-out experience.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const shell=read('work-gym-planner/index.html'),css=read('work-gym-planner-v16/landing-v29.css'),js=read('work-gym-planner-v16/landing-v29.js');
test('one current landing module is loaded',()=>{
 for(const type of ['js','css'])assert.ok(shell.includes('landing-v29.'+type));
 for(const old of ['landing-v27','landing-v18','story-v19'])assert.ok(!shell.includes(old));
});
test('welcome has clear signup and signin entry points',()=>{
 assert.ok(js.includes('data-ww29="signup">Create account'));
 assert.ok(js.includes('data-ww29="signin">Sign in'));
 assert.ok(js.includes("A.openAccount?.(button.dataset.ww29==='signup'?'signup':'signin')"));
 assert.ok(!js.includes('Build my week'));
});
test('welcome is a short overview with optional detail, not a wall of features',()=>{
 assert.ok(js.includes('Room for both.'));
 assert.ok(js.includes('class="ww29Essentials"'));
 assert.ok(js.includes('<details class="ww29How">'));
 assert.ok(js.includes('How do I get started?'));
 assert.ok(!js.includes('ww29Workers'));
});
test('the example is labeled and promises do not imply unlimited AI',()=>{
 assert.ok(js.includes('Example day, not your saved schedule'));
 assert.ok(js.includes('<small>Example</small>'));
 assert.ok(js.includes('AI use has a monthly limit'));
 assert.ok(js.includes('Free to start. No card needed.'));
 assert.ok(js.includes('review changes before they are saved'));
});
test('welcome has no autoplay videos, carousels or background timers',()=>{
 for(const gone of ['<video','autoplay','setInterval','IntersectionObserver','data-worker-next'])assert.ok(!js.includes(gone),gone);
 assert.ok(css.includes('prefers-reduced-motion'));
});
test('fonts and brand assets remain first party and available offline',()=>{
 assert.ok(!css.includes('fonts.googleapis'));
 assert.ok(!css.includes('fonts.gstatic'));
 for(const match of css.matchAll(/vendor\/fonts\/([a-z0-9-]+\.woff2)/g))assert.ok(fs.existsSync(path.join(__dirname,'../work-gym-planner-v16/vendor/fonts',match[1])));
 assert.ok(js.includes('icons/brand-mark.svg'));
});
test('help and policies remain discoverable',()=>{
 for(const file of ['privacy.html','terms.html','support.html'])assert.ok(js.includes("pageUrl('"+file+"')"));
});
test('welcome is below account dialogs and hides app chrome',()=>{
 assert.ok(css.includes('z-index:60'));
 assert.ok(css.includes('body.landingActive #appRoot'));
 assert.ok(css.includes('overflow-y:auto'));
 assert.ok(!css.includes('#wwLanding.ww29{position:fixed'));
});
test('mobile welcome respects safe areas and keeps both account actions',()=>{
 for(const side of ['top','left','right','bottom'])assert.ok(css.includes('safe-area-inset-'+side));
 assert.ok(css.includes('backdrop-filter:none'));
 assert.ok(!css.includes('.ww29SignIn{display:none'));
 assert.ok(!css.includes('.ww29Secondary{display:none'));
});
test('welcome only shows to signed-out visitors',()=>{
 assert.ok(js.includes('function shouldShow(){return !A.session}'));
 assert.ok(js.includes('wgc:authchange'));
 assert.ok(js.includes('wgc:profile-ready'));
});
