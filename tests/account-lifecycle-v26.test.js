// Follow-up hardening found while reviewing the v26 audit work.
//
// 1. The password-recovery flag lived in sessionStorage and was cleared only on
//    a successful password change, so an abandoned recovery left the "choose a
//    new password" panel armed for the next account signed in on that tab.
// 2. deleteChat() issued an unfiltered PostgREST DELETE when no thread was
//    given, leaning entirely on RLS to scope it.
// 3. work-gym-planner-v16/sw.js used one atomic cache.addAll() for both the
//    essential shell and large optional OCR assets. A vendor failure must not
//    block an update, but a missing index or core script must still fail it.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY='publishable-test';
process.env.SUPABASE_SECRET_KEY='secret-test';

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const lib=require('../server/v18-lib');

const AUTH='Bearer test-token';
function captureFetch(){
  const calls=[];
  global.fetch=async(url,options)=>{calls.push({url:String(url),options});return new Response(null,{status:204})};
  return calls;
}

async function runWorkerInstall(file,{failRequired=false,failOptional=false}={}){
  const listeners={},calls={required:[],optional:[],skipWaiting:0};
  const cache={
    addAll:async urls=>{calls.required=[...urls];if(failRequired)throw Error('required asset failed')},
    add:async url=>{calls.optional.push(url);if(failOptional&&calls.optional.length===1)throw Error('optional asset failed')}
  };
  const self={
    addEventListener:(name,listener)=>{listeners[name]=listener},
    skipWaiting:async()=>{calls.skipWaiting++},
    clients:{claim:async()=>{}}
  };
  const caches={open:async()=>cache,keys:async()=>[],delete:async()=>true,match:async()=>null};
  vm.runInNewContext(read(file),{self,caches,fetch:async()=>({ok:true,clone(){return this}}),URL,location:{origin:'https://example.test'},Promise});
  let pending;
  listeners.install({waitUntil:value=>{pending=value}});
  await pending;
  return calls;
}

test('deleting a whole chat history still sends an owner-scoped filter',async()=>{
  const calls=captureFetch();
  await lib.deleteChat('11111111-2222-3333-4444-555555555555',null,AUTH);
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.method,'DELETE');
  assert.match(calls[0].url,/user_id=eq\.11111111-2222-3333-4444-555555555555/);
  assert.doesNotMatch(calls[0].url,/thread_id=/);
  assert.ok(!/chat_messages$/.test(calls[0].url),'the DELETE must never be unfiltered');
});

test('deleting one thread scopes by both owner and thread',async()=>{
  const calls=captureFetch();
  await lib.deleteChat('11111111-2222-3333-4444-555555555555','aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',AUTH);
  assert.match(calls[0].url,/user_id=eq\.11111111-2222-3333-4444-555555555555/);
  assert.match(calls[0].url,/thread_id=eq\.aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/);
});

test('deleteChat refuses to run without an owner',async()=>{
  const calls=captureFetch();
  await assert.rejects(lib.deleteChat(null,null,AUTH),error=>error.status===401);
  assert.equal(calls.length,0,'no request may be sent without an owner');
});

test('the chat endpoint passes the signed-in user through to deleteChat',()=>{
  assert.match(read('api/v18/chat.js'),/deleteChat\(user\.id,threadId,user\.authorization\)/);
});

test('an abandoned password recovery is cleared on sign-in and sign-out',()=>{
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(account,/function clearRecoveryFlag\(\)\{try\{sessionStorage\.removeItem\(RECOVERY_KEY\)\}catch\{\}A\.passwordRecovery=false\}/);
  assert.match(account,/clearRecoveryFlag\(\);saveSession\(j\)/,'sign-in must clear a stale recovery flag');
  const signOut=account.slice(account.indexOf('async function signOut()'),account.indexOf('async function signOut()')+400);
  assert.match(signOut,/clearRecoveryFlag\(\)/,'sign-out must clear the recovery flag');
  const failedExchange=account.slice(account.indexOf('The confirmation link could not be completed')-260);
  assert.match(failedExchange.slice(0,300),/clearRecoveryFlag\(\)/,'a failed PKCE exchange must clear the recovery flag');
});

test('service workers require the core shell and tolerate optional vendor failures',()=>{
  for(const worker of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
    const source=read(worker);
    assert.match(source,/const OPTIONAL_SHELL=SHELL\.filter\(url=>url\.includes\('\/vendor\/'\)\)/,`${worker} must separate optional vendor assets`);
    assert.match(source,/const REQUIRED_SHELL=SHELL\.filter\(url=>!OPTIONAL_SHELL\.includes\(url\)\)/,`${worker} must identify the required shell`);
    assert.match(source,/await c\.addAll\(REQUIRED_SHELL\)/,`${worker} must fail installation when an essential shell asset is missing`);
    assert.match(source,/Promise\.allSettled\(OPTIONAL_SHELL\.map\(url=>c\.add\(url\)\)\)/,`${worker} must tolerate an optional vendor-cache failure`);
  }
});

test('both service-worker shells list the vendored browser dependencies',()=>{
  for(const worker of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
    const source=read(worker);
    for(const asset of ['vendor/pdfjs/pdf.min.mjs','vendor/tesseract/tesseract.min.js','vendor/html5-qrcode/html5-qrcode.min.js'])
      assert.ok(source.includes(asset),`${worker} is missing ${asset}`);
  }
});

test('service workers never cache authenticated API responses',()=>{
  for(const worker of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
    const source=read(worker);
    assert.match(source,/u\.pathname\.startsWith\('\/api\/'\)/,`${worker} must bypass every API request`);
    assert.match(source,/e\.request\.headers\.has\('Authorization'\)/,`${worker} must bypass authenticated requests`);
    assert.match(source,/if\(r\.ok\)/,`${worker} must cache successful static responses only`);
  }
  assert.match(read('work-gym-planner/sw.js'),/shared\/v23-core\.js/,
    'the production offline shell must include the account-isolation helper it executes');
});

test('local file previews point account users to the secure website',()=>{
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(account,/location\.protocol==='file:'/);
  assert.match(account,/https:\/\/www\.workandworkout\.com\//);
  assert.match(account,/This is a local preview/);
});

test('notification artwork exists at the path used by the app',()=>{
  const source=read('work-gym-planner-v16/notifications.js');
  const match=source.match(/icon:'\.\.\/work-gym-planner\/icons\/([^']+)'/);
  assert.ok(match,'notification icon must use the deployed planner icon directory');
  assert.ok(fs.existsSync(path.join(root,'work-gym-planner/icons',match[1])),`missing notification icon ${match[1]}`);
});

test('service-worker installation executes required and optional cache phases',async()=>{
  for(const worker of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
    const calls=await runWorkerInstall(worker,{failOptional:true});
    assert.ok(calls.required.length>10,`${worker} should have a substantial required shell`);
    assert.ok(calls.required.every(url=>!url.includes('/vendor/')),`${worker} put a vendor asset in the required shell`);
    assert.ok(calls.optional.length>=3,`${worker} should attempt optional vendor assets`);
    assert.ok(calls.optional.every(url=>url.includes('/vendor/')),`${worker} put a core asset in the optional shell`);
    assert.equal(calls.skipWaiting,1,`${worker} should install despite one optional cache failure`);
  }
});

test('service-worker installation fails closed when the required shell is incomplete',async()=>{
  for(const worker of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js'])
    await assert.rejects(runWorkerInstall(worker,{failRequired:true}),/required asset failed/);
});
