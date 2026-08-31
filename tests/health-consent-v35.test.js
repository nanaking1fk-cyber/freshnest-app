const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const lib=require('../server/v18-lib');

test('health-data choice is separate, granular, affirmative and local-first',()=>{
  const source=read('work-gym-planner-v16/health-consent-v35.js');
  assert.match(source,/Choose how health data is used/);
  assert.match(source,/Your planner works on this device without consent/);
  assert.match(source,/Keep data on this device/);
  assert.match(source,/Agree to selected uses/);
  assert.match(source,/id="healthConsentConfirm" type="checkbox"/);
  assert.doesNotMatch(source,/id="healthConsentConfirm" type="checkbox"[^>]*checked/);
  for(const purpose of ['account_cloud_sync','encrypted_webdav_sync','personalized_ai'])assert.match(source,new RegExp(purpose));
  assert.match(source,/disabled>Agree to selected uses/);
  assert.match(source,/selected&&confirmed/);
  assert.match(source,/Optional and separate from account terms/);
  assert.match(source,/legalPage\('privacy\.html','#health'\)/);
  assert.doesNotMatch(source,/\.\.\/work-gym-planner\/privacy\.html/);
});

test('consent can be withdrawn without deleting local planner data',()=>{
  const source=read('work-gym-planner-v16/health-consent-v35.js');
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(source,/Withdraw all/);
  assert.match(source,/interactive:true,purpose:'account_cloud_sync',force:true/);
  assert.match(source,/action==='granted'\?'grant':'withdraw'/);
  assert.match(source,/Existing cloud records are not automatically deleted/);
  assert.match(source,/Local planning still works/);
  assert.match(account,/healthConsentPanelHTML/);
  assert.match(account,/bindHealthConsentPanel/);
  assert.match(account,/A\.renderAccountUI=renderAccountUI/);
});

test('browser cloud and AI paths require the matching selected purpose',()=>{
  const secure=read('work-gym-planner-v16/account-security-v18.js');
  const account=read('work-gym-planner-v16/accounts-v18.js');
  const webdav=read('work-gym-planner-v16/cloud.js');
  const consent=read('work-gym-planner-v16/health-consent-v35.js');
  assert.match(secure,/interactive:!quiet,purpose:'account_cloud_sync'/);
  assert.match(account,/interactive:true,purpose:'account_cloud_sync'/);
  assert.match(webdav,/interactive:!silent,purpose:'encrypted_webdav_sync'/);
  assert.match(webdav,/interactive:true,purpose:'encrypted_webdav_sync'/);
  assert.match(consent,/path==='coach'\|\|path==='onboarding'\?'personalized_ai'/);
  assert.match(read('work-gym-planner-v16/sync-v18.js'),/if\(sent!==false\)\{dirty=false/);
});

test('server enforces consent before health state writes and personalized AI',()=>{
  const state=read('api/v18/state.js');
  const coach=read('api/v18/coach.js');
  const onboarding=read('api/v18/onboarding.js');
  assert.match(state,/req\.method==='PUT'\|\|req\.method==='POST'[\s\S]*requireHealthConsent\(user,'account_cloud_sync'\)/);
  assert.doesNotMatch(state,/req\.method==='GET'[\s\S]{0,100}requireHealthConsent/);
  assert.match(coach,/requireHealthConsent\(user,'personalized_ai'\)/);
  assert.match(onboarding,/requireHealthConsent\(user,'personalized_ai'\)/);
  assert.ok(coach.indexOf("requireHealthConsent(user,'personalized_ai')")<coach.indexOf('reserveAICoach(user)'));
  assert.match(read('server/v18-lib.js'),/status:428,[\s\S]*code:'HEALTH_CONSENT_REQUIRED'/);
});

test('server recognizes only the current version and selected purpose',()=>{
  const receipt={action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']};
  assert.equal(lib.healthConsentActive(receipt,'account_cloud_sync'),true);
  assert.equal(lib.healthConsentActive(receipt,'personalized_ai'),false);
  assert.equal(lib.healthConsentActive({...receipt,consentVersion:'old'},'account_cloud_sync'),false);
  assert.equal(lib.healthConsentActive({...receipt,action:'withdrawn'},'account_cloud_sync'),false);
});

test('consent receipts are append-only, owner-scoped and cascade with account deletion',()=>{
  const sql=read('supabase/migrations/20260831223544_health_data_consent_v35.sql');
  assert.match(sql,/create table if not exists public\.health_data_consent_events/i);
  assert.match(sql,/references auth\.users\(id\) on delete cascade/i);
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/grant select,insert on table public\.health_data_consent_events to authenticated/i);
  assert.match(sql,/revoke all on table public\.health_data_consent_events from public,anon,authenticated/i);
  assert.match(sql,/for select[\s\S]*to authenticated[\s\S]*auth\.uid\(\)/i);
  assert.match(sql,/for insert[\s\S]*to authenticated[\s\S]*with check/i);
  assert.doesNotMatch(sql,/create policy[\s\S]*for (?:update|delete)/i);
  assert.match(sql,/health_data_consent_events_user_created_idx/i);
});

test('consent module is ordered before autosync and remains in offline/native releases',()=>{
  for(const loader of ['work-gym-planner/index.html','work-gym-planner/boot.js']){
    const source=read(loader);
    assert.match(source,/health-consent-v35\.js/);
    assert.match(source,/orderedScripts/);
    assert.ok(source.indexOf('health-consent-v35.js')<source.lastIndexOf("h=h.replace('</body>'"),loader);
  }
  for(const worker of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js'])assert.match(read(worker),/health-consent-v35\.js/);
  assert.match(read('app-store/scripts/build-web.mjs'),/health-consent-v35\.js/);
});

test('published policy describes the implemented global consent controls',()=>{
  const privacy=read('work-gym-planner/privacy.html');
  assert.match(privacy,/Version:<\/strong> 1\.2/);
  assert.match(privacy,/Each purpose is optional and unchecked by default/);
  assert.match(privacy,/Choosing “Keep data on this device”/);
  assert.match(privacy,/consent version, policy version, selected purposes, statement, locale and time/);
  assert.match(privacy,/Account &amp; sync/);
  assert.match(privacy,/Consent receipts/);
  assert.match(privacy,/Article 9\(2\)\(a\)/);
});
