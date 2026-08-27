// The root index.html is the first thing every visitor hits, and Vercel serves
// the physical file rather than the vercel.json `"source": "/"` rewrite (the
// filesystem check wins). So whatever this file does IS what `/` does.
//
// Regression: the v26 hardening pointed its meta refresh at
// https://www.workandworkout.com/ unconditionally. On the canonical host that
// target is the current URL, so `/` redirected to itself — an infinite loop on
// production, and a bounce off every preview deployment, which also makes the
// "validate the preview" release step impossible.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');

function refreshTarget(html){
  const m=html.match(/<meta\s+http-equiv=["']refresh["']\s+content=["']\s*\d+\s*;\s*url=([^"']+)["']/i);
  return m?m[1].trim():null;
}

test('the root entrypoint redirects somewhere',()=>{
  assert.ok(refreshTarget(index),'root index.html must declare a refresh target');
});

test('the root entrypoint never redirects to itself',()=>{
  const target=refreshTarget(index);
  for(const origin of ['https://www.workandworkout.com','https://workandworkout.com']){
    const resolved=new URL(target,origin+'/').href;
    assert.notEqual(resolved,origin+'/',`serving / on ${origin} would redirect to itself`);
  }
});

test('the root entrypoint target is relative so previews stay testable',()=>{
  const target=refreshTarget(index);
  assert.doesNotMatch(target,/^https?:\/\//i,'an absolute target bounces every preview deployment to production');
  assert.match(target,/work-gym-planner\/?$/,'the target should be the app directory');
});

test('the visible fallback link matches the refresh target',()=>{
  const target=refreshTarget(index);
  const link=index.match(/<a\s+href=["']([^"']+)["']/i);
  assert.ok(link,'a no-JS fallback link must exist');
  assert.equal(link[1],target,'the fallback link and the refresh must agree');
});

test('the app the root points at actually exists',()=>{
  assert.ok(fs.existsSync(path.join(root,'work-gym-planner','index.html')));
});

test('the root entrypoint still ships no executable script',()=>{
  assert.doesNotMatch(index,/<script/i,'the hardened root entrypoint must stay script-free');
  assert.doesNotMatch(index,/document\.write/);
});
