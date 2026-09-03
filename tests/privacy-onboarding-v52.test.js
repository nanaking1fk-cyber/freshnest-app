const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('first account load offers privacy before cloud restore and plan setup',()=>{
 const account=read('work-gym-planner-v16/accounts-v18.js');
 const flow=account.slice(account.indexOf('async function afterAuth('),account.indexOf('function accountSafetyHTML'));
 assert.ok(flow.indexOf('reviewPrivacyForOnboarding')<flow.indexOf("A.authedFetch('state')"));
 assert.match(flow,/privacy\.deviceOnly&&!forceCloud/);
 assert.match(flow,/if\(A\.session\?\.user\?\.id!==uid\)return/);
 assert.match(account,/Next: choose your privacy settings/);
 assert.doesNotMatch(account,/Every account starts with a private, empty planner/);
});

test('privacy onboarding is granular and keeps other backup setup collapsed',()=>{
 const source=read('work-gym-planner-v16/health-consent-v35.js');
 assert.match(source,/Terms & privacy/);
 assert.match(source,/Agree & continue on device/);
 assert.match(source,/Agree & continue/);
 assert.match(source,/showAll:true,onboarding:true/);
 assert.match(source,/<details class="healthConsentMore"><summary>Other backup options/);
 assert.doesNotMatch(source,/<details class="healthConsentMore"[^>]*\bopen/);
 assert.match(source,/already\?'checked':''/);
 assert.match(source,/healthConsentConfirm'\)\.checked=agreementCurrent\(\)/);
 assert.match(source,/consentVersion:CONSENT_VERSION/);
 for(const file of ['privacy.html','terms.html'])assert.ok(source.includes(`legalPage('${file}'`));
});

test('existing choices and cancellation cannot become new permission',()=>{
 const source=read('work-gym-planner-v16/health-consent-v35.js');
 const review=source.slice(source.indexOf('async function reviewForOnboarding'),source.indexOf('async function ensure('));
 assert.match(review,/await refresh\(\{render:false\}\)/);
 assert.match(review,/if\(agreementCurrent\(\)&&choicesSaved\(\)\)return/);
 assert.match(source,/deviceOnly:result==='device-only'/);
 assert.match(source,/if\(pending\?\.saving&&!force\)return/);
 assert.match(source,/if\(pending!==choice\)return/);
 assert.match(source,/event\.stopImmediatePropagation\(\);closeChoice\(false\)/);
 assert.match(source,/if\(pending\)closeChoice\(false,true\)/);
});

test('privacy body scrolls while actions stay visible on short screens',()=>{
 const css=read('work-gym-planner-v16/app-v30.css');
 assert.match(css,/body\.premiumV30 #healthConsentDialog \.healthConsentBody\{min-height:0;overflow-y:auto/);
 assert.match(css,/\.healthConsentActions\{[^}]*flex-shrink:0/);
 assert.match(css,/max-height:calc\(100dvh - max\(8px,env\(safe-area-inset-top\)\)\)/);
});
