const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY='publishable-test';
process.env.SUPABASE_SECRET_KEY='secret-test';
const lib=require('../server/v18-lib');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('production browser dependencies are same-origin and pinned',()=>{
  const runtime=[
    read('vercel.json'),read('work-gym-planner-v16/adaptive-planner-v24.js'),
    read('work-gym-planner-v16/schedule.js'),read('work-gym-planner-v16/diary-b.js')
  ].join('\n');
  assert.doesNotMatch(runtime,/cdn\.jsdelivr\.net/);
  for(const file of [
    'work-gym-planner-v16/vendor/pdfjs/pdf.min.mjs',
    'work-gym-planner-v16/vendor/pdfjs/pdf.worker.min.mjs',
    'work-gym-planner-v16/vendor/tesseract/tesseract.min.js',
    'work-gym-planner-v16/vendor/tesseract/worker.min.js',
    'work-gym-planner-v16/vendor/tesseract-core/tesseract-core-lstm.wasm',
    'work-gym-planner-v16/vendor/html5-qrcode/html5-qrcode.min.js'
  ])assert.ok(fs.statSync(path.join(root,file)).size>1000,file);
  assert.match(read('work-gym-planner-v16/vendor/README.md'),/npm tarball SHA-256/);
});

test('account confirmation uses PKCE and cannot redirect bearer tokens',()=>{
  const account=read('work-gym-planner-v16/accounts-v18.js');
  assert.match(account,/code_challenge_method:'s256'/);
  assert.match(account,/grant_type=pkce/);
  assert.match(account,/auth_code:code,code_verifier:verifier/);
  assert.match(account,/https:\/\/www\.workandworkout\.com\//);
  assert.doesNotMatch(account,/accountApiOverride|wgc-v18-vercel-api|WGC_API_BASE/);
  assert.doesNotMatch(read('index.html'),/document\.write/);
});

test('disallowed CORS origins receive no allow-origin header',()=>{
  const headers=new Map();
  const res={setHeader:(key,value)=>headers.set(key,value),end:()=>{},statusCode:0};
  assert.equal(lib.cors({method:'OPTIONS',headers:{origin:'https://attacker.example'},url:'/api/v18/state'},res),true);
  assert.equal(res.statusCode,403);
  assert.equal(headers.has('Access-Control-Allow-Origin'),false);
});

test('signed native app origins can reach the production API',()=>{
  for(const origin of ['capacitor://localhost','http://localhost','https://localhost']){
    const headers=new Map();
    const res={setHeader:(key,value)=>headers.set(key,value),end:()=>{},statusCode:0};
    assert.equal(lib.cors({method:'OPTIONS',headers:{origin},url:'/api/v18/state'},res),true);
    assert.equal(res.statusCode,204);
    assert.equal(headers.get('Access-Control-Allow-Origin'),origin);
  }
});

test('database transport preserves upstream 4xx and maps upstream failures to 502',async()=>{
  global.fetch=async()=>new Response(JSON.stringify({message:'conflict'}),{status:409});
  await assert.rejects(lib.serviceFetch('example'),error=>error.status===409);
  global.fetch=async()=>new Response(JSON.stringify({message:'unavailable'}),{status:503});
  await assert.rejects(lib.serviceFetch('example'),error=>error.status===502);
});

test('security migration makes RLS and rate limits load-bearing',()=>{
  const sql=read('supabase/migrations/20260827140029_security_hardening_v26.sql');
  const privileges=read('supabase/migrations/20260827140126_user_table_least_privilege_v26.sql');
  assert.equal(fs.existsSync(path.join(root,'supabase/migrations/20260827100000_security_hardening_v26.sql')),false);
  assert.equal(fs.existsSync(path.join(root,'supabase/migrations/20260827113000_user_table_least_privilege_v26.sql')),false);
  assert.match(sql,/state_write_usage_daily enable row level security/i);
  assert.match(sql,/revoke all on public\.state_write_usage_daily from public,anon,authenticated/i);
  assert.match(sql,/grant select,insert,update,delete on public\.state_write_usage_daily to service_role/i);
  assert.match(sql,/count_state_write/);
  assert.match(sql,/replace_own_active_user_plan/);
  assert.match(sql,/auth\.uid\(\)/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(privileges,/revoke all on public\.user_state from public,anon,authenticated/i);
  assert.match(privileges,/grant select,insert,update on public\.user_state to authenticated/i);
  assert.match(privileges,/revoke all on public\.ai_usage_daily from public,anon,authenticated/i);
});

test('state writes reserve a budget and config is edge-cacheable',()=>{
  const state=read('api/v18/state.js');
  const config=read('api/v18/config.js');
  assert.match(state,/await countStateWrite\(user\.id,bytes\);const row=await saveState\(/);
  assert.match(config,/s-maxage=3600/);
  assert.match(config,/stale-while-revalidate=86400/);
});

test('AI requests have an atomic deployment-wide hard stop',()=>{
  const migration=read('supabase/migrations/20260831100000_global_ai_budget_v31.sql');
  const server=read('server/v18-lib.js');
  assert.match(migration,/ai_global_usage_daily enable row level security/i);
  assert.match(migration,/revoke all on public\.ai_global_usage_daily from public,anon,authenticated/i);
  assert.match(migration,/for update/i);
  assert.match(migration,/current_global_requests >= global_daily_limit/i);
  assert.match(migration,/current_user_requests >= user_daily_limit/i);
  assert.match(migration,/revoke all on function public\.reserve_ai_request\(uuid,integer,integer\) from anon,authenticated/i);
  assert.match(server,/AI_GLOBAL_DAILY_LIMIT\|\|100/);
  assert.match(server,/rpc\/reserve_ai_request/);
  assert.match(server,/blocked_reason==='global'/);
});
