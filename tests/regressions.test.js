const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('account flow has redirect handling, bounded auth retry and account-menu sign out',()=>{
  const source=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(source,/redirect_to=/);
  assert.match(source,/A\.authedFetch=async function\(path,opt=\{\},retry=true\)/);
  assert.match(source,/A\.authedFetch\(path,opt,false\)/);
  assert.match(source,/id="signOutAccount"/);
  assert.doesNotMatch(source,/out\.id='signOutQuick'/);
  assert.match(source,/logout\?scope=global/);
});

test('logged-out visitors always see the public landing experience',()=>{
  assert.match(read('work-gym-planner-v16/landing-v18.js'),/function shouldShow\(\)\{return!A\.session\}/);
});

test('unsafe account/session prefixes are absent from secure capture',()=>{
  const source=read('work-gym-planner-v16/account-security-v18.js');
  assert.doesNotMatch(source,/startsWith\('wgc-v18-'/);
  assert.match(source,/WGC23Core\?\.isPlannerKey/);
});

test('workout completion requires performed reps and PWA registers offline support',()=>{
  assert.match(read('work-gym-planner-v16/training-a.js'),/Log at least one completed set/);
  assert.match(read('work-gym-planner-v16/pwa-patch.js'),/serviceWorker\.register/);
  assert.doesNotMatch(read('work-gym-planner-v16/pwa-patch.js'),/\.unregister\(/);
});
