const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const core=require('../shared/v23-core');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const PROFILE='wgp-v15-profile',OWNER='wgc-v18-local-owner';
const state=name=>({storage:{[PROFILE]:JSON.stringify({name})}});
const remote=name=>({state:state(name),updatedAt:'2026-09-02T12:00:00.123456Z'});
function storage(initial={}){
  const data=new Map(Object.entries(initial));
  return {get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
function harness({local={},consent=true,response=remote('Saved user'),secure=false}={}){
  const localStorage=storage(local),timers=[],events=[],calls=[],modals=[];
  const document={readyState:'complete',addEventListener(){},getElementById(){return null}};
  const context={localStorage,sessionStorage:storage(),document,location:{hash:'',pathname:'/work-gym-planner/',search:'',protocol:'https:'},URL,URLSearchParams,TextEncoder,crypto:require('node:crypto').webcrypto,btoa:s=>Buffer.from(s,'binary').toString('base64'),fetch:async()=>{throw Error('unexpected real network')},CustomEvent:class{constructor(type){this.type=type}},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},setInterval(){},clearInterval(){},console,APP_VERSION:'test',PREFIX:'wgp-v15-',LEGACY_EXPORT_KEYS:[],LEGACY_EXPORT_PREFIXES:[],K:{profile:PROFILE,migrated:'wgp-v15-migrated',recovery:'wgp-v15-recovery-snapshots',diagnostics:'wgp-v15-diagnostics'},$:()=>null,$$:()=>[],openModal:id=>modals.push(id),closeModal(){},toast(){},recordDiagnostic(){},createRecoverySnapshot(){},profile:()=>JSON.parse(localStorage.getItem(PROFILE)||'null')};
  context.window=context;context.WGC23Core=core;context.dispatchEvent=event=>events.push(event.type);context.renderAll=()=>events.push('render');
  vm.createContext(context);
  const source=read('work-gym-planner-v16/accounts-v18.js');
  // Load the actual module functions without browser startup or CSS injection.
  vm.runInContext(source.slice(0,source.indexOf(' loadSession();if(!A.session)'))+'})(window.WGC18);',context);
  const A=context.WGC18;A.session={access_token:'test',user:{id:'user-a'}};A.config={loaded:true,cloudConfigured:true};
  A.ensureHealthConsent=async options=>{calls.push({kind:'consent',options});return typeof consent==='function'?consent():consent};
  A.authedFetch=async(route,options)=>{calls.push({kind:'request',route,options});return typeof response==='function'?response(route,options):response};
  A.openOnboarding=()=>events.push('onboarding');
  if(secure)vm.runInContext(read('work-gym-planner-v16/account-security-v18.js'),context);
  return {A,context,localStorage,calls,events,modals,flush:()=>{while(timers.length)timers.shift()()}};
}

test('returning users grant consent and restore their existing account before sync or onboarding',async()=>{
  let grant;const h=harness({consent:()=>new Promise(resolve=>{grant=resolve}),secure:true});
  const pending=h.A.resumeAccount();
  assert.equal(h.A.canStartOnboarding(),false);
  assert.equal(await h.A.pushState({quiet:true}),false);
  assert.equal(h.calls.filter(x=>x.kind==='request').length,0);
  assert.equal(h.calls[0].options.interactive,true);
  grant(true);await pending;h.flush();
  assert.equal(JSON.parse(h.localStorage.getItem(PROFILE)).name,'Saved user');
  assert.equal(h.A.cloudStateReady,true);
  assert.equal(h.A.cloudRevision,remote().updatedAt);
  assert.ok(!h.events.includes('onboarding'));
});

test('declining consent is never mistaken for an empty account',async()=>{
  const h=harness({consent:false,secure:true});await h.A.resumeAccount();h.flush();
  assert.equal(h.A.accountState,'needs-consent');
  assert.equal(h.A.canStartOnboarding(),false);
  assert.equal(await h.A.pushState({quiet:true}),false);
  assert.equal(h.calls.filter(x=>x.kind==='request').length,0);
  assert.ok(!h.events.includes('onboarding'));
});

test('startup calendar defaults do not count as a conflicting saved plan',async()=>{
  const h=harness({local:{[OWNER]:'user-a','wgp-v15-schedule-sources-v25':'[{"id":"work","name":"Work"}]','wgp-v15-schedule-sources-initialized-v25':'true'}});
  await h.A.resumeAccount();assert.equal(h.A.cloudStateReady,true);
  assert.equal(JSON.parse(h.localStorage.getItem(PROFILE)).name,'Saved user');
});

test('failed or malformed cloud reads stay protected rather than starting new-account setup',async()=>{
  for(const response of [()=>{throw Error('offline')},{ok:true},{state:{storage:{}}}]){
    const h=harness({response,secure:true});await h.A.resumeAccount();h.flush();
    assert.equal(h.A.accountState,'unavailable');
    assert.equal(h.A.canStartOnboarding(),false);
    assert.equal(await h.A.pushState({quiet:true}),false);
    assert.ok(!h.events.includes('onboarding'));
  }
});

test('a confirmed empty cloud account may start onboarding and uses an insert-only base',async()=>{
  const h=harness({response:(route,options)=>options?{updatedAt:'new-revision'}:{state:null,updatedAt:null},secure:true});
  await h.A.resumeAccount();h.flush();
  assert.equal(h.A.accountState,'ready');assert.ok(h.events.includes('onboarding'));
  await h.A.pushState();
  const put=h.calls.find(x=>x.options?.method==='PUT');
  assert.equal(JSON.parse(put.options.body).baseUpdatedAt,null);
});

test('a different device copy requires a choice, then survives loading the cloud copy',async()=>{
  const h=harness({local:{[OWNER]:'user-a',...state('Device user').storage},secure:true});
  await h.A.resumeAccount();h.flush();
  assert.equal(h.A.accountState,'choice');assert.equal(h.A.canStartOnboarding(),false);
  assert.equal(JSON.parse(h.localStorage.getItem(PROFILE)).name,'Device user');
  assert.equal(await h.A.pushState({quiet:true}),false);
  await h.A.resumeAccount({forceCloud:true});
  assert.equal(JSON.parse(h.localStorage.getItem(PROFILE)).name,'Saved user');
  const backup=JSON.parse(h.localStorage.getItem('wgc-v18-user-cache:user-a'));
  assert.equal(JSON.parse(backup.storage[PROFILE]).name,'Device user');
});

test('an unchanged cloud revision preserves unsynced local edits',async()=>{
  const h=harness({local:{[OWNER]:'user-a',...state('Offline edit').storage,'wgc-v44-cloud-revision:user-a':JSON.stringify(remote().updatedAt)}});
  await h.A.resumeAccount();
  assert.equal(h.A.cloudStateReady,true);
  assert.equal(JSON.parse(h.localStorage.getItem(PROFILE)).name,'Offline edit');
});

test('another account and unclaimed device data are preserved but never uploaded to a new owner',async()=>{
  for(const owner of ['user-b',null]){
    const h=harness({local:{...(owner?{[OWNER]:owner}:{}),...state('Other user').storage},response:{state:null,updatedAt:null}});
    await h.A.resumeAccount();
    assert.equal(h.localStorage.getItem(PROFILE),null);
    const saved=JSON.parse(h.localStorage.getItem(owner?'wgc-v18-user-cache:user-b':'wgc-v18-unclaimed-device-state'));
    assert.equal(JSON.parse(saved.storage[PROFILE]).name,'Other user');
  }
});

test('failure to save a recovery copy stops restore before clearing the device',async()=>{
  const h=harness({local:{[OWNER]:'user-a',...state('Device user').storage}});
  const write=h.localStorage.setItem;
  h.localStorage.setItem=(key,value)=>{if(key.startsWith('wgc-v44-protected-copy:'))throw Object.assign(Error('full'),{name:'QuotaExceededError'});return write(key,value)};
  await h.A.resumeAccount({forceCloud:true});
  assert.equal(h.A.accountState,'unavailable');
  assert.equal(JSON.parse(h.localStorage.getItem(PROFILE)).name,'Device user');
});

test('cloud writes carry the loaded revision and concurrent sync requests share one write',async()=>{
  let finish;const h=harness({secure:true,response:(route,options)=>options?new Promise(resolve=>{finish=resolve}):remote('Saved user')});
  await h.A.resumeAccount();
  const first=h.A.pushState(),second=h.A.pushState();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls.filter(x=>x.options?.method==='PUT').length,1);
  assert.equal(JSON.parse(h.calls.find(x=>x.options?.method==='PUT').options.body).baseUpdatedAt,remote().updatedAt);
  finish({updatedAt:'2026-09-02T12:01:00Z'});await Promise.all([first,second]);
  assert.equal(h.A.cloudRevision,'2026-09-02T12:01:00Z');
});

test('a stale cloud write pauses autosync and preserves local content',async()=>{
  const h=harness({secure:true,response:(route,options)=>{if(options)throw Object.assign(Error('conflict'),{code:'STATE_CONFLICT'});return remote('Saved user')}});
  await h.A.resumeAccount();
  await assert.rejects(h.A.pushState(),/conflict/);
  assert.equal(h.A.cloudStateReady,false);
  assert.equal(JSON.parse(h.localStorage.getItem(PROFILE)).name,'Saved user');
});

test('account changes during consent never read or restore the previous account',async()=>{
  let grant;const h=harness({consent:()=>new Promise(resolve=>{grant=resolve})});
  const pending=h.A.resumeAccount();h.A.session={user:{id:'user-b'}};grant(true);await pending;
  assert.equal(h.calls.filter(x=>x.kind==='request').length,0);
  assert.equal(h.A.cloudStateReady,false);
});

test('rejected reset emails retain the verifier for the already-sent link and prevent retries',async()=>{
  const h=harness({local:{'wgc-v25-pkce-verifier':'valid-previous','wgc-v25-pkce-purpose':'recovery'}});
  h.A.config.supabaseUrl='https://example.test';let calls=0;
  h.context.fetch=async()=>{calls++;return {ok:false,status:429,headers:{get:()=>null},text:async()=>JSON.stringify({error_code:'over_email_send_rate_limit',msg:'Email rate exceeded'})}};
  await assert.rejects(h.A.recover('user@example.test'),/temporarily at capacity/);
  assert.equal(h.localStorage.getItem('wgc-v25-pkce-verifier'),'valid-previous');
  await assert.rejects(h.A.recover('user@example.test'),/already requested/);
  assert.equal(calls,1);
});

test('startup and every onboarding entry point honor saved-account readiness',()=>{
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(account,/await accountModulesReady/);
  assert.match(account,/else await afterAuth\(\)/);
  assert.match(account,/Password updated securely'\);await afterAuth\(\)/);
  for(const file of ['onboarding-v18.js','guided-onboarding-v18.js'])assert.match(read('work-gym-planner-v16/'+file),/A\.canStartOnboarding\?\.\(\)===false/);
  assert.match(read('work-gym-planner-v16/onboarding-v18.js'),/function applyPlan\(a,p\)\{if\(A\.session&&A\.canStartOnboarding/);
  for(const loader of ['work-gym-planner/boot.js','work-gym-planner/index.html'])assert.match(read(loader),/assetRevision='30\.1\.31-account44'/);
});
