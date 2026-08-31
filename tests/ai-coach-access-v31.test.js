const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const lib=require('../server/v18-lib');

function configure(){
  process.env.SUPABASE_URL='https://project.supabase.co';
  process.env.SUPABASE_SECRET_KEY='service-secret';
  process.env.AI_DAILY_LIMIT='40';
  process.env.AI_GLOBAL_DAILY_LIMIT='100';
}

test.afterEach(()=>{
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.AI_DAILY_LIMIT;
  delete process.env.AI_GLOBAL_DAILY_LIMIT;
  delete global.fetch;
});

test('free accounts reserve exactly one lifetime AI Coach trial question',async()=>{
  configure();let request;
  global.fetch=async(url,options)=>{request={url,options};return new Response(JSON.stringify([{
    allowed:true,access_type:'trial',trial_questions:1,user_requests:1,global_requests:1
  }]),{status:200})};
  const access=await lib.reserveAICoach({id:'00000000-0000-4000-8000-000000000001',app_metadata:{}});
  assert.equal(access.access,'trial');
  assert.equal(access.trialQuestions,1);
  assert.match(request.url,/rpc\/reserve_ai_coach_request$/);
  assert.deepEqual(JSON.parse(request.options.body),{
    target_user_id:'00000000-0000-4000-8000-000000000001',
    paid_access:false,user_daily_limit:40,global_daily_limit:100
  });
});

test('a used free trial is rejected before an OpenAI request can be made',async()=>{
  configure();
  global.fetch=async()=>new Response(JSON.stringify([{
    allowed:false,access_type:'trial',blocked_reason:'trial_used',trial_questions:1,
    user_requests:1,global_requests:1
  }]),{status:200});
  await assert.rejects(
    lib.reserveAICoach({id:'00000000-0000-4000-8000-000000000002',app_metadata:{}}),
    error=>error.status===402&&error.code==='AI_COACH_PAID_REQUIRED'
  );
});

test('paid app_metadata keeps AI Coach access without trusting user metadata',async()=>{
  configure();let body;
  global.fetch=async(url,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify([{
    allowed:true,access_type:'paid',trial_questions:0,user_requests:2,global_requests:2
  }]),{status:200})};
  const user={id:'00000000-0000-4000-8000-000000000003',app_metadata:{plan:'premium'},user_metadata:{plan:'free'}};
  assert.equal(lib.paidAccount(user),true);
  const access=await lib.reserveAICoach(user);
  assert.equal(access.access,'paid');
  assert.equal(body.paid_access,true);
  assert.equal(lib.paidAccount({app_metadata:{},user_metadata:{plan:'premium'}}),false);
});

test('the Coach endpoint and interface explain the one-question beta gate',()=>{
  const endpoint=read('api/v18/coach.js');
  const ui=read('work-gym-planner-v16/ai-coach-v18.js');
  const sql=read('supabase/migrations/20260831042724_ai_coach_trial_gate.sql');
  assert.match(endpoint,/reserveAICoach\(user\)/);
  assert.doesNotMatch(endpoint,/countAI\(user\.id\)/);
  assert.match(endpoint,/trialRemaining:coachAccess\.access==='trial'\?0:null/);
  assert.match(ui,/one free AI Coach question/i);
  assert.match(ui,/Continued coaching requires a paid plan/i);
  assert.match(ui,/Your AI Coach trial does not reset/);
  assert.match(sql,/questions between 0 and 1/);
  assert.match(sql,/for update/);
  assert.match(sql,/revoke all on function public\.reserve_ai_coach_request[\s\S]*anon,authenticated/);
});
