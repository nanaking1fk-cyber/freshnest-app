const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('shared/usage-counts-v45.js','utf8');
function browser({on=false,gpc=false,dnt=false,native=false,fail=false}={}){
 const events={},calls=[],timers=new Map(),store=new Map();let sequence=0;
 if(on)store.set('ww-usage-counts-v45','yes');
 const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
 const document={readyState:'complete',body:{classList:{contains:()=>false}},querySelector:s=>s==='.page.active'?{id:'page-home'}:null,getElementById:()=>null,addEventListener:(name,fn)=>events[name]=fn};
 const window={document,addEventListener:(name,fn)=>events[name]=fn,page(){}};if(native)window.WGPNative={};
 const context={window,document,localStorage,navigator:{globalPrivacyControl:gpc,doNotTrack:dnt?'1':'0'},setTimeout:fn=>{timers.set(++sequence,fn);return sequence},clearTimeout:id=>timers.delete(id),fetch:(url,options)=>{calls.push({url,options});return fail?Promise.reject(Error('offline')):Promise.resolve({ok:true})}};
 vm.runInNewContext(source,context);
 return{api:window.WWUsage,window,events,calls,timers,store};
}
test('usage counts are off by default; consent is separate from account data',()=>{
 const b=browser();b.window.page('calendar');b.events.pagehide();assert.equal(b.calls.length,0);
 b.api.setEnabled(true);b.events.pagehide();assert.equal(b.calls.length,1);
 assert.deepEqual(JSON.parse(b.calls[0].options.body),{counts:{app_open:1,screen_home:1}});
 assert.deepEqual([...b.store.keys()],['ww-usage-counts-v45']);
});
test('only fixed screen counts are sent, without cookies, account headers, referrers or device fields',()=>{
 const b=browser({on:true});b.window.page('calendar');b.window.page('calendar');b.window.page('diary');b.window.page('someone@example.test');b.window.page('__proto__');b.events.pagehide();
 const {url,options}=b.calls[0];assert.equal(url,'/api/v18/usage-counts');
 assert.deepEqual(JSON.parse(options.body),{counts:{app_open:1,screen_home:1,screen_calendar:1,screen_nutrition:1}});
 assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.deepEqual(Object.keys(options.headers),['Content-Type']);
 assert.doesNotMatch(source,/document\.referrer|userAgent|WGC18|\.session|location\.|randomUUID|_vercel/);
});
test('opting out clears unsent counts and cross-tab withdrawal stops collection',()=>{
 const b=browser({on:true});b.api.setEnabled(false);b.events.pagehide();assert.equal(b.calls.length,0);
 b.api.setEnabled(true);b.window.page('training');b.store.set('ww-usage-counts-v45','no');b.events.storage({key:'ww-usage-counts-v45'});b.events.pagehide();assert.equal(b.calls.length,0);
});
test('privacy signals disable counts; batches are bounded and offline failure does not block',async()=>{
 for(const options of [{gpc:true},{dnt:true}]){const b=browser({on:true,...options});assert.equal(b.api.setEnabled(true),false);b.events.pagehide();assert.equal(b.calls.length,0)}
 const b=browser({on:true,native:true,fail:true});for(let i=0;i<1000;i++)b.window.page(i%2?'calendar':'training');b.events.pagehide();
 assert.equal(b.calls.length,10);for(const call of b.calls){assert.equal(call.url,'https://www.workandworkout.com/api/v18/usage-counts');assert.equal(Object.values(JSON.parse(call.options.body).counts).reduce((a,b)=>a+b),20)}
 await new Promise(resolve=>setImmediate(resolve));
});

process.env.SUPABASE_URL='https://db.example.test';process.env.SUPABASE_PUBLISHABLE_KEY='fixture';process.env.SUPABASE_SECRET_KEY='sb_secret_fixture';
const handler=require('../api/v18/usage-counts');
async function request(body,{origin='https://www.workandworkout.com',method='POST',fail=false,headers={}}={}){
 const calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return new Response(fail?'unavailable':'null',{status:fail?503:200})};
 const res={setHeader(){},end(value){this.body=value?JSON.parse(value):null}};
 await handler({method,url:'/api/v18/usage-counts',headers:{origin,...headers},body},res);return{res,calls};
}
test('collector rejects arbitrary data, invalid counters, unknown origins and public reads',async()=>{
 for(const body of [{counts:{screen_home:1},email:'private@example.test'},{counts:{food:'private'}},{counts:{app_open:21}},{counts:{app_open:-1}},{counts:{app_open:1.5}},{counts:[]},{counts:{}},{counts:{app_open:20,screen_home:1}}]){const {res,calls}=await request(body);assert.equal(res.statusCode,400);assert.equal(calls.length,0)}
 assert.equal((await request({counts:{app_open:1}},{origin:'https://attacker.test'})).res.statusCode,403);
 assert.equal((await request(null,{method:'GET'})).res.statusCode,405);
});
test('collector writes only aggregate increments and safely handles failure and privacy signals',async()=>{
 const {res,calls}=await request({counts:{app_open:1,screen_home:1}});assert.equal(res.statusCode,202);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://db.example.test/rest/v1/rpc/add_app_usage_counts');
 assert.deepEqual(JSON.parse(calls[0].options.body),{increments:{app_open:1,screen_home:1}});
 assert.equal((await request({counts:{app_open:1}},{fail:true})).res.statusCode,503);
 assert.equal((await request({counts:{app_open:1}},{headers:{'sec-gpc':'1'}})).calls.length,0);
});
test('database totals are private, fixed-schema aggregates; production, workers and native source include the collector',()=>{
 const sql=fs.readFileSync('supabase/migrations/20260903003626_aggregate_usage_counts_v45.sql','utf8');
 assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.app_usage_daily from public, anon, authenticated/);assert.match(sql,/security_invoker = true/);assert.match(sql,/on conflict\(day, metric\) do update/);
 assert.doesNotMatch(sql,/user_id|device_id|client_hash|ip_address|user_agent|referrer/);
 for(const file of ['work-gym-planner/index.html','work-gym-planner/boot.js','work-gym-planner/sw.js','work-gym-planner-v16/sw.js'])assert.match(fs.readFileSync(file,'utf8'),/usage-counts-v45\.js/);
 assert.match(fs.readFileSync('app-store/scripts/build-web.mjs','utf8'),/copyTree\(source.shared/);
 assert.match(fs.readFileSync('work-gym-planner/privacy.html','utf8'),/Optional usage counts/);
});
