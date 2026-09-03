const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../work-gym-planner-v16/health-consent-v35.js'),'utf8');
const grant={action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']};
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
