const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const lib=require('../server/v18-lib');

test('health-data choice is separate, granular, affirmative and local-first',()=>{
  const source=read('work-gym-planner-v16/health-consent-v35.js');
  assert.match(source,/Your privacy choices/);
  assert.match(source,/Your planner still works if you leave everything off/);
  assert.match(source,/Not now/);
  assert.match(source,/Save my choices/);
  assert.match(source,/id="healthConsentConfirm" type="checkbox"/);
  assert.doesNotMatch(source,/id="healthConsentConfirm" type="checkbox"[^>]*checked/);
  for(const purpose of ['account_cloud_sync','encrypted_webdav_sync','personalized_ai','meal_scan_ai'])assert.match(source,new RegExp(purpose));
  assert.match(source,/disabled>Continue/);
  assert.match(source,/pending\?\.saving\|\|!confirmed/);
  assert.match(source,/I allow this optional use/);
  assert.match(source,/legalPage\('privacy\.html','#health'\)/);
  assert.doesNotMatch(source,/\.\.\/work-gym-planner\/privacy\.html/);
});

test('feature consent uses one friendly AI-tools purpose and hides technical jargon',()=>{
  const source=read('work-gym-planner-v16/health-consent-v35.js');
  assert.match(source,/id!=='meal_scan_ai'\|\|active\('meal_scan_ai'\)/);
  assert.match(source,/title:'AI tools'/);
  assert.match(source,/Use AI Coach, Meal Scan and roster reading/);
  assert.match(source,/Scan photos are not kept/);
  assert.match(source,/activeFor[\s\S]*personalized_ai[\s\S]*meal_scan_ai/);
  assert.match(source,/We remember both on and off choices/);
  assert.match(source,/I can change my mind at any time/);
  assert.match(source,/We could not save your choice\. Please try again\./);
  assert.doesNotMatch(source,/Optional and separate from account terms|explicit-consent standards|AES-GCM encrypted|through Vercel to OpenAI|private Supabase account/);
});

test('consent can be withdrawn without deleting local planner data',()=>{
  const source=read('work-gym-planner-v16/health-consent-v35.js');
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(source,/Turn off all/);
  assert.match(source,/interactive:true,purpose:'account_cloud_sync',force:true/);
  assert.match(source,/action==='granted'\?'grant':'withdraw'/);
  assert.match(source,/This does not delete anything already saved online/);
  assert.match(source,/We could not update your choices\. Please try again\./);
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
  assert.match(read('work-gym-planner-v16/sync-v18.js'),/if\(sent!==false\)\{dirty=generation!==sending/);
});

test('server enforces consent before health state writes and personalized AI',()=>{
  const state=read('api/v18/state.js');
  const coach=read('api/v18/coach.js');
  const onboarding=read('api/v18/onboarding.js');
  assert.match(state,/req\.method==='PUT'\|\|req\.method==='POST'[\s\S]*requireHealthConsent\(user,'account_cloud_sync'\)/);
  assert.doesNotMatch(state,/req\.method==='GET'[\s\S]{0,100}requireHealthConsent/);
  assert.match(coach,/requireHealthConsent\(user,'personalized_ai'\)/);
  assert.match(onboarding,/requireHealthConsent\(user,'personalized_ai'\)/);
  assert.match(read('api/v18/meal-scan.js'),/requireAnyHealthConsent\(user,\['personalized_ai','meal_scan_ai'\]\)/);
  assert.ok(coach.indexOf("requireHealthConsent(user,'personalized_ai')")<coach.indexOf('access.run(user,mode'));
  assert.match(read('server/v18-lib.js'),/status:428,[\s\S]*code:'HEALTH_CONSENT_REQUIRED'/);
});

test('server recognizes only the current version and selected purpose',()=>{
  const browser=read('work-gym-planner-v16/health-consent-v35.js');
  const server=read('server/v18-lib.js');
  const statement='I agree to the selected uses of my health and wellness data. I can change my mind at any time.';
  assert.match(browser,/POLICY_VERSION='1\.6'/);
  assert.match(server,/HEALTH_POLICY_VERSION='1\.6'/);
  assert.match(browser,new RegExp(statement.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(server,new RegExp(statement.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
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
  assert.match(sql,/meal_scan_ai/);
  const fix=read('supabase/migrations/20260901235058_allow_meal_scan_health_consent.sql');
  assert.match(fix,/drop constraint if exists health_data_consent_allowed_purposes/i);
  assert.match(fix,/add constraint health_data_consent_allowed_purposes/i);
  assert.match(fix,/meal_scan_ai/);
  assert.match(fix,/validate constraint health_data_consent_allowed_purposes/i);
  assert.doesNotMatch(fix,/delete from|update public\.health_data_consent_events/i);
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
  assert.match(privacy,/Version:<\/strong> 1\.6/);
  assert.match(privacy,/one short privacy step in plain language/);
  assert.match(privacy,/not requested again for every scan or AI request/);
  assert.match(privacy,/Leaving optional features off/);
  assert.match(privacy,/consent version, policy version, selected purposes, statement, locale and time/);
  assert.match(privacy,/Account &amp; privacy/);
  assert.match(privacy,/Consent receipts/);
  assert.match(privacy,/Article 9\(2\)\(a\)/);
});
