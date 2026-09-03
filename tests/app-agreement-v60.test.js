const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const lib=require('../server/v18-lib');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const agreement={termsVersion:'1.2',privacyVersion:'1.6',acceptedAt:'2026-09-03T18:00:00.000Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'};
const row={user_id:'test-owner',action:'granted',consent_version:'2026-08-31-v1',policy_version:'1.6',purposes:['personalized_ai'],created_at:'2026-09-03T18:00:00.000Z',app_agreement:agreement};
function fixture(t,initial=[]){
 t.mock.method(global,'fetch',async(url,options={})=>{
  assert.ok(String(url).includes('/rest/v1/health_data_consent_events'));
  if(options.method==='POST'){const saved=JSON.parse(options.body);initial.unshift(saved);return new Response(JSON.stringify([saved]),{status:201})}
  assert.match(String(url),/user_id=eq\.test-owner/);
  const rows=String(url).includes('app_agreement=not.is.null')?initial.filter(r=>r.app_agreement):initial;
  return new Response(JSON.stringify(rows.slice(0,1)),{status:200});
 });
 return initial;
}
test('one server receipt atomically saves terms and an explicit all-off decision',async t=>{
 const rows=fixture(t);
 const saved=await lib.recordHealthConsent('test-owner','Bearer fixture',{action:'withdrawn',purposes:[],termsConfirmed:true,termsVersion:'1.2'});
 assert.equal(saved.action,'withdrawn');assert.equal(saved.purposes.length,0);
 assert.equal(saved.agreement.termsVersion,'1.2');assert.equal(saved.agreement.privacyVersion,'1.6');
 assert.equal(saved.agreement.statement,agreement.statement);assert.ok(Date.parse(saved.agreement.acceptedAt));
 assert.equal(rows.length,1);assert.equal(rows[0].user_id,'test-owner');
});
test('turning optional permissions off preserves the original agreement record',async t=>{
 fixture(t,[row]);
 const saved=await lib.recordHealthConsent('test-owner','Bearer fixture',{action:'withdrawn'});
 assert.deepEqual(saved.agreement,agreement);assert.equal(saved.purposes.length,0);
});
test('an old-client concurrent withdrawal cannot erase a separately recorded acceptance',async t=>{
 fixture(t,[{...row,action:'withdrawn',purposes:[],app_agreement:null},row]);
 const receipt=await lib.getHealthConsent('test-owner','Bearer fixture');
 assert.equal(receipt.action,'withdrawn');assert.deepEqual(receipt.agreement,agreement);
 assert.equal(lib.healthConsentActive(receipt,'personalized_ai'),false);
});
test('historical permission is never backfilled as terms acceptance',async t=>{
 fixture(t,[{...row,app_agreement:null}]);
 const receipt=await lib.getHealthConsent('test-owner','Bearer fixture');assert.equal(receipt.agreement,undefined);
 assert.equal(lib.healthConsentActive(receipt,'personalized_ai'),true);
});
test('an outdated terms version cannot be accepted',async t=>{
 fixture(t);
 await assert.rejects(lib.recordHealthConsent('test-owner','Bearer fixture',{action:'withdrawn',termsConfirmed:true,termsVersion:'old'}),/current Terms/);
});
test('agreement storage is additive, retains existing RLS, and cannot reset user records',()=>{
 const migration=read('supabase/migrations/20260903192147_saved_app_agreement_v60.sql');
 assert.match(migration,/add column if not exists app_agreement jsonb/);
 assert.match(migration,/health_consent_app_agreement_shape/);
 assert.doesNotMatch(migration,/delete from|update public|disable row level security|drop table/i);
 const client=read('work-gym-planner-v16/health-consent-v35.js');
 assert.match(client,/choicesSaved\(\)&&!force/);
 assert.match(client,/selected\.length\?'granted':'withdrawn'/);
 assert.match(client,/termsConfirmed:!agreementCurrent\(\)/);
 const guided=read('work-gym-planner-v16/guided-onboarding-v18.js');
 assert.ok(guided.indexOf('await A.reviewPrivacyForOnboarding()')<guided.indexOf("window.openModal?.('guidedOnboarding')"));
});
