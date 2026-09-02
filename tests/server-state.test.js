const test=require('node:test');
const assert=require('node:assert/strict');

process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY='publishable-test';
process.env.SUPABASE_SECRET_KEY='secret-test';
const lib=require('../server/v18-lib');

test('server independently sanitizes state before database storage',async()=>{
  let request;
  global.fetch=async(url,options)=>{
    request={url,options};
    return new Response(JSON.stringify([{user_id:'user-a',updated_at:'2026-08-25T00:00:00Z'}]),{status:200,headers:{'content-type':'application/json'}});
  };
  const saved=await lib.saveState('user-a',{storage:{
    'wgp-v15-profile':'{"name":"Private A"}',
    'wgc-v18-session':'{"refresh_token":"must-not-upload"}',
    'wgc-v18-user-cache:user-b':'other-user'
  }},'Bearer user-jwt',null);
  const body=JSON.parse(request.options.body);
  assert.equal(request.url.endsWith('/rest/v1/user_state'),true);
  assert.equal(request.options.method,'POST');
  assert.doesNotMatch(request.options.headers.Prefer,/merge-duplicates/);
  assert.equal(request.options.headers.Authorization,'Bearer user-jwt');
  assert.notEqual(request.options.headers.Authorization,process.env.SUPABASE_SECRET_KEY);
  assert.deepEqual(Object.keys(body.state.storage),['wgp-v15-profile']);
  assert.equal(JSON.stringify(body).includes('must-not-upload'),false);
  assert.equal(saved.state.schemaVersion,23);
});

test('state writes without a loaded cloud version fail before any database request',async()=>{
  let calls=0;global.fetch=async()=>{calls++;throw Error('must not send')};
  await assert.rejects(lib.saveState('user-a',{storage:{}},'Bearer user-jwt'),error=>error.status===428&&error.code==='STATE_BASE_REQUIRED');
  assert.equal(calls,0);
});

test('existing state updates are atomic compare-and-swap writes',async()=>{
  const revision='2026-09-02T20:00:00.123456+00:00';let request;
  global.fetch=async(url,options)=>{request={url,options};return new Response(JSON.stringify([{updated_at:'2026-09-02T20:01:00Z'}]),{status:200})};
  await lib.saveState('user-a',{storage:{}},'Bearer user-jwt',revision);
  assert.equal(request.options.method,'PATCH');
  const url=new URL(request.url);
  assert.equal(url.searchParams.get('user_id'),'eq.user-a');
  assert.equal(url.searchParams.get('updated_at'),'eq.'+revision);
  assert.equal(JSON.parse(request.options.body).user_id,undefined);
});

test('a stale or concurrently created account is never silently overwritten',async()=>{
  global.fetch=async()=>new Response('[]',{status:200});
  await assert.rejects(lib.saveState('user-a',{storage:{}},'Bearer user-jwt','2026-09-02T20:00:00Z'),error=>error.status===409&&error.code==='STATE_CONFLICT');
  global.fetch=async()=>new Response(JSON.stringify({message:'duplicate key'}),{status:409});
  await assert.rejects(lib.saveState('user-a',{storage:{}},'Bearer user-jwt',null),error=>error.status===409&&error.code==='STATE_CONFLICT');
});

test('plan save uses atomic replacement RPC',async()=>{
  let request;
  global.fetch=async(url,options)=>{request={url,options};return new Response('"plan-id"',{status:200})};
  await lib.savePlan({summary:'ready'},'Bearer user-jwt');
  assert.equal(request.url.endsWith('/rest/v1/rpc/replace_own_active_user_plan'),true);
  assert.deepEqual(JSON.parse(request.options.body),{
    target_kind:'combined',target_plan:{summary:'ready'},target_source:'deterministic+ai'
  });
  assert.equal(request.options.headers.Authorization,'Bearer user-jwt');
});
