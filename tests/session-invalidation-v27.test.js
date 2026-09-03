// Caught in production auth logs: a browser holding a revoked session retried
// /api/v18/state every ~30s for 25 minutes and never recovered.
//
// GoTrue answers a revoked session with 403 "session_not_found". The v26
// hardening began passing upstream statuses through unchanged, so the API
// returned 403 — but the browser's retry path only recognised 401. It never
// refreshed, never signed out, and looped until the tab was closed.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY='publishable-test';
process.env.SUPABASE_SECRET_KEY='secret-test';

const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const lib=require('../server/v18-lib');

const req=()=>({headers:{authorization:'Bearer stale-token'},method:'GET',url:'/api/v18/state'});

test('a revoked session reaches the client as 401, not 403',async()=>{
  global.fetch=async()=>new Response(
    JSON.stringify({error_code:'session_not_found',msg:'Session not found'}),{status:403});
  await assert.rejects(lib.verifyUser(req()),error=>{
    assert.equal(error.status,401,'403 session_not_found must surface as 401');
    assert.match(error.message,/Sign in again/);
    return true;
  });
});

test('an expired token still reaches the client as 401',async()=>{
  global.fetch=async()=>new Response(JSON.stringify({msg:'invalid JWT'}),{status:401});
  await assert.rejects(lib.verifyUser(req()),e=>e.status===401);
});

test('a genuine auth outage is not mistaken for a bad session',async()=>{
  global.fetch=async()=>new Response(JSON.stringify({msg:'boom'}),{status:503});
  await assert.rejects(lib.verifyUser(req()),e=>{
    assert.equal(e.status,502,'an upstream outage must not tell the user to sign in again');
    return true;
  });
});

test('a 429 from the auth service is still passed through',async()=>{
  global.fetch=async()=>new Response(JSON.stringify({msg:'slow down'}),{status:429});
  await assert.rejects(lib.verifyUser(req()),e=>e.status===429);
});

test('the browser treats a rejected session as recoverable, then final',()=>{
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(account,/r\.status===401&&retry/,
    'both statuses must trigger the refresh attempt');
  assert.match(account,/if\(r\.status===401\)\{lockPlannerForLoggedOut\(\);saveSession\(null\)\}/,
    'a second rejection must end the session rather than loop');
  assert.match(account,/lockPlannerForLoggedOut\(\);saveSession\(null\)/,
    'the stale session must be cleared, not retried forever');
});
