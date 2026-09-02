const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');

for(const file of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
  test(file+' serves cached scripts without waiting for the network',async()=>{
    const listeners={},cached={source:'cached'};let fetched=0;
    vm.runInNewContext(read(file),{self:{addEventListener:(name,handler)=>listeners[name]=handler},caches:{match:async()=>cached},fetch:async()=>{fetched++;throw Error('must not fetch')},URL,location:{origin:'https://example.test'}});
    let response;
    listeners.fetch({request:{method:'GET',url:'https://example.test/script.js?v=account44',headers:new Headers()},respondWith:value=>response=value});
    assert.equal(await response,cached);assert.equal(fetched,0);
  });
  test(file+' downloads optional tools on demand and leaves API traffic uncached',async()=>{
    const listeners={},puts=[];let fetched=0;
    vm.runInNewContext(read(file),{self:{addEventListener:(name,handler)=>listeners[name]=handler},caches:{match:async()=>null,open:async()=>({put:async request=>puts.push(request.url)})},fetch:async()=>{fetched++;return new Response('tool')},URL,location:{origin:'https://example.test'}});
    let response;
    listeners.fetch({request:{method:'GET',url:'https://example.test/vendor/tool.js',headers:new Headers()},respondWith:value=>response=value});
    await response;assert.equal(fetched,1);assert.deepEqual(puts,['https://example.test/vendor/tool.js']);
    for(const [url,headers] of [['https://example.test/api/v18/state',new Headers()],['https://example.test/private',new Headers({Authorization:'Bearer private'})]])listeners.fetch({request:{method:'GET',url,headers},respondWith:()=>assert.fail('private request intercepted')});
  });
}

test('calendar redraw observers are scoped instead of rerunning setup after every app change',()=>{
  const calendar=read('work-gym-planner-v16/calendar-premium-v42.js');
  assert.match(calendar,/observe\(calendar,\{subtree:true,childList:true\}\)/);
  assert.match(calendar,/calendarMarkersV42,\.calendarDayBriefV42,\.calendarDayCloseV42/);
  for(const file of ['calendar-premium-v42.js','schedule-platform-v25.js'])assert.doesNotMatch(read('work-gym-planner-v16/'+file),/observe\(document\.documentElement/);
});
