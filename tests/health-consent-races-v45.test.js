const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../work-gym-planner-v16/health-consent-v35.js'),'utf8');
const agreement={termsVersion:'1.2',privacyVersion:'1.6',acceptedAt:'2026-09-03T18:00:00Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'};
const grant={action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync'],agreement};
function harness(){
 const data=new Map(),events={};
 const A={session:{user:{id:'user-a'}},renderAccountUI(){},authedFetch:async()=>({receipt:null})};
 const context={window:null,localStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)},navigator:{language:'en'},setTimeout(){},$:()=>null,CustomEvent:class{},closeModal(){},toast(){},console};
 context.window=context;context.WGC18=A;context.addEventListener=(name,fn)=>events[name]=fn;context.dispatchEvent=()=>{};
 vm.runInNewContext(source.slice(0,source.lastIndexOf(' inject();'))+' A.testRecord=record;})(window.WGC18);',context);
 return{A,data,events};
}
test('a stale privacy read cannot overwrite newly accepted consent',async()=>{
 const h=harness();let finish;
 h.A.authedFetch=async(path,options)=>options?{receipt:grant}:new Promise(resolve=>{finish=resolve});
 const reading=h.A.refreshHealthConsent();await h.A.testRecord('granted',['account_cloud_sync']);
 finish({receipt:null});await reading;
 assert.equal(h.A.hasHealthConsent('account_cloud_sync'),true);
 assert.equal(JSON.parse(h.data.get('wgc-health-consent-v35:user-a')).action,'granted');
});
test('a privacy read from another account cannot replace the current account choices',async()=>{
 const h=harness();let finish;h.A.authedFetch=()=>new Promise(resolve=>{finish=resolve});
 const reading=h.A.refreshHealthConsent();h.A.session={user:{id:'user-b'}};finish({receipt:grant});await reading;
 assert.equal(h.data.has('wgc-health-consent-v35:user-b'),false);assert.equal(h.A.hasHealthConsent('account_cloud_sync'),false);
});
test('an old privacy save cannot grant consent to a newly signed-in account',async()=>{
 const h=harness();let finish;h.A.authedFetch=()=>new Promise(resolve=>{finish=resolve});
 const saving=h.A.testRecord('granted',['account_cloud_sync']);h.A.session={user:{id:'user-b'}};finish({receipt:grant});
 await assert.rejects(saving,/account changed/);assert.equal(h.data.has('wgc-health-consent-v35:user-b'),false);
});
test('refreshing the same account token does not clear accepted privacy choices',async()=>{
 const h=harness();h.A.authedFetch=async()=>({receipt:grant});await h.A.refreshHealthConsent();
 h.events['wgc:authchange']();assert.equal(h.A.hasHealthConsent('account_cloud_sync'),true);
});
test('concurrent onboarding and startup checks both receive existing consent',async()=>{
 const h=harness();let finish,calls=0;
 h.A.authedFetch=()=>{calls++;return new Promise(resolve=>{finish=resolve})};
 const onboarding=h.A.reviewPrivacyForOnboarding(),startup=h.A.refreshHealthConsent();
 assert.equal(calls,1);finish({receipt:grant});
 assert.equal((await onboarding).cloudAllowed,true);
 assert.deepEqual(await startup,grant);
 assert.equal(h.A.hasHealthConsent('account_cloud_sync'),true);
});
test('a failed shared consent check can be retried without granting anything',async()=>{
 const h=harness();let fail,calls=0;
 h.A.authedFetch=()=>{calls++;return new Promise((resolve,reject)=>{fail=reject})};
 const first=h.A.refreshHealthConsent(),second=h.A.refreshHealthConsent();
 fail(Error('offline'));
 const results=await Promise.allSettled([first,second]);
 assert.ok(results.every(result=>result.status==='rejected'));assert.equal(calls,1);
 assert.equal(h.A.hasHealthConsent('account_cloud_sync'),false);
 h.A.authedFetch=async()=>({receipt:grant});await h.A.refreshHealthConsent();
 assert.equal(h.A.hasHealthConsent('account_cloud_sync'),true);
});
test('consent checks for different accounts never share an in-flight result',async()=>{
 const h=harness(),pending=[];
 h.A.authedFetch=()=>new Promise(resolve=>pending.push(resolve));
 const first=h.A.refreshHealthConsent();h.A.session={user:{id:'user-b'}};
 const second=h.A.refreshHealthConsent();assert.equal(pending.length,2);
 pending[1]({receipt:null});await second;pending[0]({receipt:grant});await first;
 assert.equal(h.A.hasHealthConsent('account_cloud_sync'),false);
 assert.equal(h.data.has('wgc-health-consent-v35:user-b'),false);
});
test('one saved AI-tools choice enables Meal Scan without another prompt',async()=>{
 const h=harness(),aiGrant={...grant,purposes:['personalized_ai']};
 h.A.authedFetch=async()=>({receipt:aiGrant});await h.A.refreshHealthConsent();
 assert.equal(h.A.hasHealthConsent('meal_scan_ai'),true);
 assert.equal(await h.A.ensureHealthConsent({interactive:false,purpose:'meal_scan_ai'}),true);
});
test('previous Meal-Scan-only receipts remain valid',async()=>{
 const h=harness(),legacyGrant={...grant,purposes:['meal_scan_ai']};
 h.A.authedFetch=async()=>({receipt:legacyGrant});await h.A.refreshHealthConsent();
 assert.equal(h.A.hasHealthConsent('meal_scan_ai'),true);
});

test('saved off choices survive sign-in on a fresh device without another form',async()=>{
 const h=harness(),off={...grant,action:'withdrawn',purposes:[]};
 h.A.authedFetch=async()=>({receipt:off});
 const choice=await h.A.reviewPrivacyForOnboarding();
 assert.equal(choice.deviceOnly,true);assert.equal(choice.completed,true);
 for(let i=0;i<3;i++)assert.equal(await h.A.ensureHealthConsent({interactive:true,purpose:'personalized_ai'}),false);
 assert.equal(h.A.hasAppAgreement(),true);
 assert.deepEqual(JSON.parse(h.data.get('wgc-health-consent-v35:user-a')),off);
});
test('ordinary policy display changes do not invalidate accepted terms or saved choices',async()=>{
 const h=harness();h.A.authedFetch=async()=>({receipt:{...grant,policyVersion:'older-notice'}});
 assert.equal((await h.A.reviewPrivacyForOnboarding()).completed,true);
});
test('offline startup uses known choices locally without pretending cloud consent was checked',async()=>{
 const h=harness();h.A.authedFetch=async()=>({receipt:grant});await h.A.refreshHealthConsent();
 h.A.authedFetch=async()=>{throw Error('offline')};
 const choice=await h.A.reviewPrivacyForOnboarding();
 assert.equal(choice.deviceOnly,true);assert.equal(choice.cloudAllowed,false);assert.equal(choice.offline,true);
 assert.equal(h.A.hasAppAgreement(),true);
});
test('device-only acceptance is durable and withdrawal keeps the original terms timestamp',async()=>{
 const h=harness();h.A.session=null;
 await h.A.testRecord('withdrawn',[],{termsConfirmed:true});
 const first=JSON.parse(h.data.get('wgc-health-consent-v35:device'));
 assert.equal(first.agreement.termsVersion,'1.2');assert.equal(first.purposes.length,0);
 await h.A.testRecord('granted',['personalized_ai']);await h.A.testRecord('withdrawn',[]);
 const latest=JSON.parse(h.data.get('wgc-health-consent-v35:device'));
 assert.equal(latest.agreement.acceptedAt,first.agreement.acceptedAt);
 assert.equal((await h.A.reviewPrivacyForOnboarding()).deviceOnly,true);
});
test('a failed server agreement save cannot be presented as permanently saved',async()=>{
 const h=harness();h.A.authedFetch=async()=>({receipt:{...grant,agreement:null}});
 await assert.rejects(h.A.testRecord('granted',['account_cloud_sync'],{termsConfirmed:true}),/not confirmed/);
 assert.equal(h.A.hasAppAgreement(),false);
});
test('another tabs saved off choices replace stale permission without erasing terms',async()=>{
 const h=harness();h.A.authedFetch=async()=>({receipt:grant});await h.A.refreshHealthConsent();
 h.data.set('wgc-health-consent-v35:user-a',JSON.stringify({...grant,action:'withdrawn',purposes:[]}));
 h.events.storage({key:'wgc-health-consent-v35:user-a'});
 assert.equal(h.A.hasHealthConsent('account_cloud_sync'),false);assert.equal(h.A.hasAppAgreement(),true);
});
