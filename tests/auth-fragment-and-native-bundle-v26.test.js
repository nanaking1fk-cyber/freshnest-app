// Regressions found while reviewing the v26 audit-hardening work.
//
// 1. LEGACY_AUTH_FRAGMENT was `!!location.hash`, so every in-page anchor
//    (#landingFeatures, #landingHow, ...) was treated as a retired implicit-flow
//    bearer-token link: the fragment was stripped on load and the user was shown
//    "this older confirmation link can no longer be accepted".
// 2. app-store/scripts/build-web.mjs rewrote schedule.js by matching literal
//    jsDelivr strings that vendoring removed. String.replace on a missing literal
//    is a silent no-op, so the native bundle would have shipped absolute
//    /work-gym-planner-v16/vendor/... paths that do not exist inside Capacitor.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {isLegacyAuthFragment}=require('../shared/v23-core');

test('in-page anchors are not mistaken for legacy auth fragments',()=>{
  for(const hash of ['','#','#landingTop','#landingFeatures','#landingHow','#landingWorkers','#landingPrivacy','#page-more','#a=1'])
    assert.equal(isLegacyAuthFragment(hash),false,`${hash||'(empty)'} must not be treated as a legacy auth fragment`);
});

test('retired implicit-flow bearer fragments are still rejected',()=>{
  for(const hash of [
    '#access_token=abc&refresh_token=def&token_type=bearer',
    'access_token=abc',
    '#expires_in=3600&refresh_token=def',
    '#provider_token=abc',
    '#id_token=abc'
  ])assert.equal(isLegacyAuthFragment(hash),true,`${hash} must be rejected`);
});

test('an empty-valued token parameter is not enough to reject a fragment',()=>{
  assert.equal(isLegacyAuthFragment('#access_token='),false);
  assert.equal(isLegacyAuthFragment('#landingFeatures&access_token='),false);
});

test('the account module classifies fragments instead of stripping every hash',()=>{
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.doesNotMatch(account,/LEGACY_AUTH_FRAGMENT=!!location\.hash/,'must not treat any hash as an auth fragment');
  assert.match(account,/LEGACY_AUTH_FRAGMENT=legacyAuthFragment\(location\.hash\)/);
  assert.match(account,/core\.isLegacyAuthFragment/,'should delegate to the shared classifier');
  assert.match(account,/access_token\|refresh_token\|provider_token/,'needs a standalone fallback if the shared module is absent');
});

test('the shared classifier loads before the account module in the app shell',()=>{
  const shell=read('work-gym-planner/index.html');
  const core=shell.indexOf('v23-core.js');
  const accounts=shell.indexOf("'accounts-v18.js'");
  assert.ok(core>=0,'shared/v23-core.js must be in the shell');
  assert.ok(accounts>=0,'accounts-v18.js must be in the shell');
  assert.ok(core<accounts,'v23-core.js must be ordered before accounts-v18.js');
});

test('native bundle rewrites match the vendored sources and fail loudly',()=>{
  const build=read('app-store/scripts/build-web.mjs');
  const schedule=read('work-gym-planner-v16/schedule.js');
  const diary=read('work-gym-planner-v16/diary-b.js');

  assert.doesNotMatch(build,/cdn\.jsdelivr\.net/,'the native builder must not search for retired CDN URLs');
  assert.match(build,/function rewrite\(source,find,replacement,label\)/);
  assert.match(build,/throw new Error\(`Native bundle rewrite failed/);

  // Every literal the builder searches for must still exist in the source it rewrites.
  for(const find of build.match(/rewrite\(schedule,"((?:[^"\\]|\\.)*)"/g)||[]){
    const needle=JSON.parse(find.slice(find.indexOf('"')));
    assert.ok(schedule.includes(needle),`schedule.js no longer contains the rewrite target ${JSON.stringify(needle)}`);
  }
  assert.match(diary,/const SCANNER_URL='[^']+';/,'diary-b.js must keep a rewritable SCANNER_URL');
});

test('native bundle audit rejects web-only absolute asset paths',()=>{
  assert.match(read('app-store/scripts/audit-bundle.mjs'),/work-gym-planner-v1\[56\]/);
});

test('vendored browser dependencies are referenced same-origin only',()=>{
  for(const file of ['work-gym-planner-v16/schedule.js','work-gym-planner-v16/diary-b.js','work-gym-planner-v16/adaptive-planner-v24.js']){
    const source=read(file);
    assert.doesNotMatch(source,/cdn\.jsdelivr\.net/,file);
    assert.match(source,/\/work-gym-planner-v16\/vendor\//,`${file} should load vendored assets`);
  }
});

// Guard (not a fix): the shell assembles the running document by regex-stripping
// script tags out of the v15 markup. A whitespace or attribute change in v15
// makes those regexes match nothing silently, which double-loads modules.
test('app shell strip patterns still match the v15 markup they target',()=>{
  const shell=read('work-gym-planner/index.html');
  const v15=read('work-gym-planner-v15/index.html');
  const removeList=shell.match(/const remove=\[(.*?)\]/s);
  assert.ok(removeList,'shell must declare the list of scripts it strips');
  const files=removeList[1].split(',').map(x=>x.trim().replace(/^'|'$/g,'')).filter(Boolean);
  assert.ok(files.length>0);
  for(const file of files){
    const pattern=new RegExp('<script\\s+defer\\s+src="\\./'+file.replace('.','\\.')+'"><\\/script>\\s*');
    assert.match(v15,pattern,`shell strips ${file} but v15 markup no longer matches that pattern`);
  }
  for(const anchor of ['<head>','</head>','</body>'])
    assert.ok(v15.includes(anchor),`shell injects at ${anchor}, which must exist in the v15 markup`);
});
