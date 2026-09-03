const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const workers=['work-gym-planner/sw.js','work-gym-planner-v16/sw.js'];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function redirectedResponse(){
 const response=new Response('offline planner',{headers:{'content-type':'text/html','content-security-policy':"default-src 'self'"}});
 Object.defineProperty(response,'redirected',{value:true});return response;
}
function worker(file,{cached=null,network=async()=>new Response('network'),offlineShell=null}={}){
 const listeners={},calls={matches:[],writes:[],opens:[],network:[]};
 const cache={match:async(request,options)=>{calls.matches.push({request,options});return String(request).includes('shell.html')||String(request)==='./index.html'?offlineShell:typeof cached==='function'?cached():cached},put:async(request,response)=>calls.writes.push({request,response})};
 const caches={open:async name=>{calls.opens.push(name);return cache},match:()=>{throw Error('must not use another app or old release cache')}};
 const context={self:{addEventListener:(name,fn)=>listeners[name]=fn},caches,URL,Response,location:{origin:'https://www.workandworkout.com'},fetch:async request=>{calls.network.push(request);return network(request)}};
 vm.runInNewContext(read(file),context);
 return{calls,dispatch(url,options={}){let result;listeners.fetch({request:{url:new URL(url,'https://www.workandworkout.com').href,method:'GET',mode:'navigate',headers:new Headers(),...options},respondWith:value=>{result=value}});return result}};
}

for(const file of workers){
 test(`${file}: cached redirected pages are safe to replay and retain security headers`,async()=>{
  const h=worker(file,{cached:redirectedResponse()});const response=await h.dispatch('/work-gym-planner/');
  assert.equal(response.redirected,false);assert.equal(response.status,200);assert.equal(await response.text(),'offline planner');assert.equal(response.headers.get('content-security-policy'),"default-src 'self'");assert.equal(h.calls.network.length,0);assert.ok(h.calls.opens.every(name=>name.endsWith('-free57-hours58')));
 });
 test(`${file}: one-time links bypass cache, including an already-installed redirect entry`,()=>{
  for(const query of ['auth=signup&code=secret','auth=recovery&code=secret','code=secret','token_hash=secret','error=access_denied&error_code=otp_expired','access_token=secret','refresh_token=secret']){
   const h=worker(file,{cached:redirectedResponse()});assert.equal(h.dispatch('/work-gym-planner/?'+query),undefined);assert.equal(h.calls.matches.length,0);assert.equal(h.calls.writes.length,0);assert.equal(h.calls.network.length,0);
  }
 });
 test(`${file}: offline navigation fallback cannot replay a redirected shell`,async()=>{
  const h=worker(file,{network:async()=>{throw Error('offline')},offlineShell:redirectedResponse()});const response=await h.dispatch('/work-gym-planner/unseen');assert.equal(response.redirected,false);assert.equal(await response.text(),'offline planner');
 });
 test(`${file}: new redirected responses are cleaned before caching`,async()=>{
  const h=worker(file,{network:async()=>redirectedResponse()});const response=await h.dispatch('/work-gym-planner/');assert.equal(response.redirected,false);assert.equal(h.calls.writes.length,1);assert.equal(h.calls.writes[0].response.redirected,false);
 });
 test(`${file}: API, external, POST and bearer requests remain outside cache`,()=>{
  for(const [url,options] of [['/api/v18/state',{}],['https://example.test/asset',{}],['/work-gym-planner/',{method:'POST'}],['/work-gym-planner/',{headers:new Headers({Authorization:'Bearer private'})}]]){const h=worker(file);assert.equal(h.dispatch(url,options),undefined)}
 });
}
test('planner folder and index redirect to the strict-CSP external-script shell',()=>{
 const config=JSON.parse(read('vercel.json'));
 // Vercel gives physical index.html precedence over rewrites. A redirect
 // selects the external-script shell; the worker safely replays its response.
 for(const url of ['/work-gym-planner/','/work-gym-planner/index.html'])assert.equal(config.redirects.find(rule=>rule.source===url)?.destination,'/work-gym-planner/shell.html');
 assert.doesNotMatch(read('work-gym-planner/shell.html'),/<script(?![^>]+src=)[^>]*>/i);
});
test('new emails use the direct shell and the fixed worker is refreshed',()=>{
 assert.match(read('work-gym-planner-v16/accounts-v18.js'),/new URL\('\/work-gym-planner\/shell\.html'/);
 assert.match(read('work-gym-planner-v16/pwa-patch.js'),/updateViaCache:'none'/);
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/shell.html','work-gym-planner/index.html',...workers])assert.ok(read(file).includes('30.1.31-free57-hours58'));
});
