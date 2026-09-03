const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../shared/observability.js'),'utf8');
function harness(fetcher){
 const reports=[],calls=[],events={};
 const context={URL,AbortController,Error,Date,Math,setTimeout,clearTimeout,navigator:{onLine:true},location:{href:'https://www.workandworkout.com/work-gym-planner/',origin:'https://www.workandworkout.com'},addEventListener:(type,fn)=>events[type]=fn};
 context.window=context;context.fetch=async(input,init)=>{
  if(String(input).includes('/client-error')){reports.push(JSON.parse(init.body));return new Response('{}')}
  calls.push({input,init});return fetcher(input,init,calls.length);
 };
 vm.createContext(context);vm.runInContext(source,context);
 return{context,reports,calls,events,request:context.WWObservability.request};
}
test('one transient read retries once and a recovered request is not reported as a crash',async()=>{
 const h=harness((url,opt,count)=>{if(count===1)throw new TypeError('Load failed');return new Response('{"ok":true}')});
 const result=await h.request('/api/v18/state',{}, {retries:1,readText:true,timeoutMs:1000});
 assert.equal(result.text,'{"ok":true}');assert.equal(h.calls.length,2);assert.equal(h.reports.length,0);
});
test('failed reads have a bounded retry and one useful final report',async()=>{
 const h=harness(()=>{throw new TypeError('Load failed')});
 await assert.rejects(h.request('/api/v18/health-consent?secret=hidden',{}, {retries:9}),{code:'NETWORK_ERROR'});
 assert.equal(h.calls.length,2);assert.equal(h.reports.length,1);
 assert.equal(h.reports[0].route,'/api/v18/health-consent');assert.match(h.reports[0].message,/GET request failed/);
 assert.ok(!JSON.stringify(h.reports).includes('hidden'));
});
test('writes, consent, deletion and billable scans are never automatically replayed',async()=>{
 for(const [url,method] of [['/api/v18/state','PUT'],['/api/v18/health-consent','POST'],['/api/v18/account','DELETE'],['/api/v18/meal-scan','POST']]){
  const h=harness(()=>{throw new TypeError('Load failed')});
  await assert.rejects(h.request(url,{method,body:'sample'}, {retries:1}),{code:'NETWORK_ERROR'});assert.equal(h.calls.length,1);
 }
});
test('authorization, consent, conflict and rate-limit responses are not retried',async()=>{
 for(const status of [401,403,409,429,503]){
  const h=harness(()=>new Response('{}',{status}));
  assert.equal((await h.request('/api/v18/state',{}, {retries:1})).status,status);assert.equal(h.calls.length,1);
 }
});
test('the timeout covers response-body stalls and produces a friendly retry error',async()=>{
 const h=harness((url,{signal})=>({status:200,text:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true}))}));
 await assert.rejects(h.request('/api/v18/state',{}, {timeoutMs:10,readText:true,retries:1}),{name:'TimeoutError',code:'REQUEST_TIMEOUT'});
 assert.equal(h.calls.length,1);assert.equal(h.reports.length,1);assert.match(h.reports[0].message,/timed out/);
});
test('cancelled searches produce no network-error reports or retry',async()=>{
 const controller=new AbortController();
 const h=harness((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true})));
 const pending=h.request('/cgi/search.pl',{signal:controller.signal},{timeoutMs:100,retries:1});controller.abort();
 await assert.rejects(pending,{name:'AbortError'});assert.equal(h.calls.length,1);assert.equal(h.reports.length,0);
});
test('ordinary fetch preserves the caller signal for cancelling its response body',async()=>{
 const controller=new AbortController(),h=harness(()=>new Response('ok'));
 await h.context.fetch('/sample',{signal:controller.signal});assert.equal(h.calls[0].init.signal,controller.signal);
});
test('offline calls do not flood the network or erase any device data',async()=>{
 const h=harness(()=>assert.fail('offline network request'));h.context.navigator.onLine=false;
 await assert.rejects(h.request('/api/v18/state'),{code:'NETWORK_OFFLINE'});assert.equal(h.calls.length,0);assert.equal(h.reports.length,0);
});
test('account switches stop the old read before retrying with stale credentials',async()=>{
 let sameOwner=true;
 const h=harness(()=>{sameOwner=false;throw new TypeError('disconnected')});
 await assert.rejects(h.request('/api/v18/state',{}, {retries:1,shouldContinue:()=>sameOwner}),{code:'REQUEST_CANCELLED'});
 assert.equal(h.calls.length,1);assert.equal(h.reports.length,0);
});
test('feature diagnostics use accepted sources and retain cross-realm error details',()=>{
 const h=harness(()=>new Response('{}'));
 const error=vm.runInNewContext('new TypeError("Cannot read properties of undefined")');
 h.context.WWObservability.capture('account_restore',error,{name:'AccountRestoreError'});
 h.context.WWObservability.capture('native_steps',error,{name:'StepSyncError'});
 assert.deepEqual(h.reports.map(x=>x.source),['window_error','native_bridge']);
 assert.match(h.reports[0].message,/Cannot read/);assert.ok(h.reports[0].stack);
});
test('app and external script failures remain reported without leaking their origin or query',()=>{
 const h=harness(()=>new Response('{}'));
 h.events.error({target:{src:'https://www.workandworkout.com/shared/example.js?v=sample'}});
 h.events.error({target:{src:'https://external.example/en_US/pcm.js?token=private'}});
 assert.equal(h.reports.length,2);
 assert.deepEqual(h.reports.map(x=>[x.source,x.category,x.errorName]),[['resource_error','script','ResourceError'],['resource_error','script','ExternalResourceError']]);
 assert.equal(h.reports[1].route,'/en_US/pcm.js');
 assert.ok(!JSON.stringify(h.reports).includes('external.example'));
 assert.ok(!JSON.stringify(h.reports).includes('private'));
});
