const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('browser reporter covers runtime, resource, promise, network and server failures',()=>{
  const source=read('shared/observability.js');
  for(const signal of ['window_error','resource_error','unhandled_rejection','network_error','api_error'])assert.match(source,new RegExp(signal));
  assert.match(source,/MAX_REPORTS=10/);
  assert.match(source,/recent\.get\(key\)/);
  assert.match(source,/X-Work-Workout-Native/);
  assert.match(source,/credentials:'omit'/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|document\.cookie|accountId|healthData|plannerState/);
});

test('browser reporter survives the boot document handoff',()=>{
  for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){
    const source=read(file);
    assert.match(source,/h=h\.replace\('<head>','<head><base[\s\S]{0,240}shared\/observability\.js/);
  }
});

test('server sanitizes diagnostics and accepts only trusted web or native callers',()=>{
  const endpoint=require(path.join(root,'api/v18/client-error.js'));
  const tools=endpoint._test;
  const dirty='john@example.com Bearer abc.def token=secret 123456789 https://example.com/path?q=private "breakfast oats"';
  const clean=tools.redact(dirty,500);
  for(const secret of ['john@example.com','abc.def','token=secret','123456789','example.com','breakfast oats'])assert.doesNotMatch(clean,new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.equal(tools.cleanRoute('https://example.com/work-gym-planner/?token=secret#health'),'/work-gym-planner/');
  assert.equal(tools.requestAllowed({headers:{origin:'https://www.workandworkout.com','sec-fetch-site':'same-origin'}},'web'),true);
  assert.equal(tools.requestAllowed({headers:{origin:'https://evil.example','sec-fetch-site':'cross-site'}},'web'),false);
  assert.equal(tools.requestAllowed({headers:{origin:'capacitor://localhost','x-work-workout-native':'ios'}},'ios'),true);
  assert.equal(tools.requestAllowed({headers:{'x-work-workout-native':'android'}},'android'),true);
  assert.equal(tools.requestAllowed({headers:{}},'ios'),false);
});

test('diagnostic endpoint persists only sanitized, fingerprinted reports',async()=>{
  const endpoint=require(path.join(root,'api/v18/client-error.js'));
  const previous={url:process.env.SUPABASE_URL,anon:process.env.SUPABASE_PUBLISHABLE_KEY,service:process.env.SUPABASE_SECRET_KEY,fetch:global.fetch};
  process.env.SUPABASE_URL='https://database.example';
  process.env.SUPABASE_PUBLISHABLE_KEY='anon-test';
  process.env.SUPABASE_SECRET_KEY='service-test';
  let stored=null;
  global.fetch=async(url,options)=>{
    stored={url,body:JSON.parse(options.body)};
    return{ok:true,status:200,text:async()=>JSON.stringify([{report_id:'00000000-0000-0000-0000-000000000001',occurrence_count:1,accepted:true}])};
  };
  const headers={origin:'https://www.workandworkout.com','sec-fetch-site':'same-origin','x-forwarded-for':'203.0.113.42'};
  const req={method:'POST',url:'/api/v18/client-error',headers,socket:{},body:{source:'window_error',category:'client',release:'30.1.28',surface:'web',route:'/work-gym-planner/?email=john@example.com',errorName:'TypeError',message:'Failed for john@example.com token=secret',stack:'at run (https://www.workandworkout.com/app.js?token=secret:1:2)'}};
  let responseBody='';
  const res={setHeader(){},end(value=''){responseBody=value}};
  try{
    await endpoint(req,res);
    assert.equal(res.statusCode,202);
    assert.match(stored.url,/\/rest\/v1\/rpc\/record_app_error$/);
    assert.equal(stored.body.report_route,'/work-gym-planner/');
    assert.match(stored.body.report_fingerprint,/^[0-9a-f]{64}$/);
    assert.match(stored.body.report_client_hash,/^[0-9a-f]{64}$/);
    assert.doesNotMatch(JSON.stringify(stored.body),/john@example\.com|token=secret|203\.0\.113\.42/);
    assert.equal(JSON.parse(responseBody).ok,true);
  }finally{
    global.fetch=previous.fetch;
    for(const [key,value] of [['SUPABASE_URL',previous.url],['SUPABASE_PUBLISHABLE_KEY',previous.anon],['SUPABASE_SECRET_KEY',previous.service]])value===undefined?delete process.env[key]:process.env[key]=value;
  }
});

test('database reporting is private, aggregated, rate limited and retained',()=>{
  const sql=read('supabase/migrations/20260901043524_app_error_reporting_v36.sql');
  for(const table of ['app_error_reports','app_error_ingest_daily']){
    assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`,'i'));
    assert.match(sql,new RegExp(`revoke all on table public\\.${table} from public,anon,authenticated`,'i'));
  }
  assert.match(sql,/on conflict\(bucket_day,fingerprint\) do update/i);
  assert.match(sql,/occurrence_count=public\.app_error_reports\.occurrence_count\+1/);
  assert.match(sql,/request_count >= daily_limit/);
  assert.match(sql,/app_error_ingest_daily where day < current_date - 7/);
  assert.match(sql,/app_error_reports where bucket_day < current_date - 90/);
  assert.doesNotMatch(sql,/user_id|account_id|email_address|raw_ip/i);
});

test('native bundles load web diagnostics and include OS crash hooks',()=>{
  const build=read('app-store/scripts/build-web.mjs');
  const bridge=read('app-store/native/native-bridge.js');
  const ios=read('app-store/ios/App/App/AppDiagnosticsReporter.swift');
  const android=read('app-store/android/app/src/main/java/com/bibiniifarms/workandworkout/AppCrashReporter.java');
  assert.match(build,/shared\/observability\.js/);
  assert.match(bridge,/native_bridge/);
  assert.match(ios,/MXMetricManager\.shared\.add/);
  assert.match(ios,/X-Work-Workout-Native/);
  assert.match(android,/pending-native-crash\.json/);
  assert.match(android,/status >= 200 && status < 300/);
});
