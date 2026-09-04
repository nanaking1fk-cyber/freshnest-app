const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

function syncHarness(failure){
 const timers=[],listeners={},warnings=[];let calls=0,now=100000,currentFailure=failure;
 const A={session:{user:{id:'user-a'}},cloudStateReady:true,pushState:async()=>{calls++;if(currentFailure)throw currentFailure;return true},pauseCloudSync(){this.paused=true}};
 const document={visibilityState:'visible',addEventListener:(name,fn)=>listeners['document:'+name]=fn};
 const window={WGC18:A,navigator:{onLine:true},addEventListener:(name,fn)=>listeners[name]=fn};
 const context={window,document,setTimeout:(fn,delay)=>{const task={fn,delay};timers.push(task);return task},clearTimeout:task=>{const i=timers.indexOf(task);if(i>=0)timers.splice(i,1)},setInterval(){},Date:{now:()=>now},Math,console:{warn:(...args)=>warnings.push(args)}};
 vm.runInNewContext(read('work-gym-planner-v16/sync-v18.js'),context);
 return{A,timers,listeners,warnings,calls:()=>calls,setNow:value=>{now=value},succeed:()=>{currentFailure=null}};
}
test('a consent refusal pauses every queued autosave until consent is granted',async()=>{
 const error=Object.assign(Error('consent'),{status:428,code:'HEALTH_CONSENT_REQUIRED'}),h=syncHarness(error);
 h.A.queueSync();await h.timers.shift().fn();assert.equal(h.calls(),1);
 h.listeners['document:visibilitychange']();h.listeners.online();h.A.queueSync();assert.equal(h.calls(),1);assert.equal(h.timers.length,0);
 h.succeed();h.listeners['wgc:health-consent-change']({detail:{activePurposes:['account_cloud_sync']}});await h.timers.shift().fn();assert.equal(h.calls(),2);
});
test('network failures use bounded exponential backoff instead of retry storms',async()=>{
 const h=syncHarness(TypeError('offline'));h.A.queueSync();await h.timers.shift().fn();assert.equal(h.calls(),1);
 assert.equal(h.timers.length,1);assert.equal(h.timers[0].delay,15000);
 h.listeners.online();h.listeners['document:visibilitychange']();assert.equal(h.calls(),1);assert.equal(h.timers.length,1);
});
test('backgrounding the account module no longer invents a cloud write',()=>{
 const accounts=read('work-gym-planner-v16/accounts-v18.js');
 assert.doesNotMatch(accounts,/visibilitychange[^\n]+A\.queueSync/);
});
test('sign-out and token refresh propagate across open tabs',()=>{
 const accounts=read('work-gym-planner-v16/accounts-v18.js');
 assert.match(accounts,/event\.key===SESSION_KEY/);
 assert.match(accounts,/tokenChanged:true,external:true/);
 assert.match(accounts,/if\(!next\)\{clearRecoveryFlag\(\);lockPlannerForLoggedOut\(\)\}/);
});
test('expected client denials are not logged as production crashes',()=>{
 const server=read('server/v18-lib.js');
 assert.match(server,/serverFailure=status>=500/);
 assert.match(server,/serverFailure\?'api_error':'api_rejected'/);
});
test('subscription refreshes back off and token refreshes do not reset the account',()=>{
 const source=read('work-gym-planner-v16/ai-subscription-v56.js');
 assert.match(source,/Date\.now\(\)<nextRefresh/);
 assert.match(source,/Math\.min\(10\*60\*1000,30000\*Math\.pow/);
 assert.match(source,/\[401,403\]\.includes\(error\?\.status\)\?5\*60\*1000/);
 assert.match(source,/if\(uid===sessionOwner\)\{if\(event\.detail\?\.tokenChanged\)/);
});
test('billing tables have explicit deny policies for browser roles',()=>{
 const migration=read('supabase/migrations/20260904183304_explicit_server_only_billing_policies.sql');
 for(const table of ['ai_billing_accounts','apple_ai_subscriptions','ai_credit_periods','ai_credit_days','ai_credit_requests'])assert.ok(migration.includes(`'${table}'`),table);
 assert.match(migration,/for all to anon, authenticated using \(false\) with check \(false\)/);
});
test('older internal tables use the same explicit service-only boundary',()=>{
 const migration=read('supabase/migrations/20260904184322_explicit_server_only_internal_policies.sql');
 for(const table of ['ai_coach_trial_usage','ai_global_usage_daily','ai_usage_daily','app_error_ingest_daily','app_error_reports','app_usage_daily','calendar_connections','calendar_event_links','calendar_oauth_states','state_write_usage_daily'])assert.ok(migration.includes(`'${table}'`),table);
 assert.match(migration,/for all to anon, authenticated using \(false\) with check \(false\)/);
});
