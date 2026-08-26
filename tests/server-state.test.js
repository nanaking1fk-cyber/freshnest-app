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
  }});
  const body=JSON.parse(request.options.body);
  assert.equal(request.url.endsWith('/rest/v1/user_state?on_conflict=user_id'),true);
  assert.deepEqual(Object.keys(body.state.storage),['wgp-v15-profile']);
  assert.equal(JSON.stringify(body).includes('must-not-upload'),false);
  assert.equal(saved.state.schemaVersion,23);
});

test('plan save uses atomic replacement RPC',async()=>{
  let request;
  global.fetch=async(url,options)=>{request={url,options};return new Response('"plan-id"',{status:200})};
  await lib.savePlan('user-a',{summary:'ready'});
  assert.equal(request.url.endsWith('/rest/v1/rpc/replace_active_user_plan'),true);
  assert.deepEqual(JSON.parse(request.options.body),{
    target_user_id:'user-a',target_kind:'combined',target_plan:{summary:'ready'},target_source:'deterministic+ai'
  });
});
