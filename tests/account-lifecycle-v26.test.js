// Follow-up hardening found while reviewing the v26 audit work.
//
// 1. The password-recovery flag lived in sessionStorage and was cleared only on
//    a successful password change, so an abandoned recovery left the "choose a
//    new password" panel armed for the next account signed in on that tab.
// 2. deleteChat() issued an unfiltered PostgREST DELETE when no thread was
//    given, leaning entirely on RLS to scope it.
// 3. work-gym-planner-v16/sw.js used cache.addAll(), which is atomic: one
//    failed vendor asset aborts the whole service-worker install.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

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

test('service workers cache their shell resiliently, not atomically',()=>{
  for(const worker of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
    const source=read(worker);
    assert.match(source,/Promise\.allSettled\(SHELL\.map\(url=>c\.add\(url\)\)\)/,`${worker} must not abort install on one bad asset`);
    assert.doesNotMatch(source,/c\.addAll\(SHELL\)/,`${worker} still uses atomic addAll`);
  }
});

test('both service-worker shells list the vendored browser dependencies',()=>{
  for(const worker of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
    const source=read(worker);
    for(const asset of ['vendor/pdfjs/pdf.min.mjs','vendor/tesseract/tesseract.min.js','vendor/html5-qrcode/html5-qrcode.min.js'])
      assert.ok(source.includes(asset),`${worker} is missing ${asset}`);
  }
});
