const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function harness(){
 const elements=new Map(),calls=[],staged=[],messages=[];
 const element=id=>{id=id.replace(/^#/,'');if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',hidden:false,disabled:false,textContent:'',classList:{contains:()=>true,toggle(){}}});return elements.get(id)};
 const context={URL,AbortController,setTimeout,clearTimeout,structuredClone,console,Date,$:element,$$:()=>[],foodState:{meal:'Breakfast',batch:[],libraryTab:'history'},myFoods:()=>[],builtinFoodMatches:()=>[{name:'Oats',source:'Built in'}],esc:String,stopBarcode(){},renderFoodBatch(){},foodTab(){},toast:text=>messages.push(text),foodDraftFromProduct:x=>x,stageFoodItems:items=>staged.push(...items)};
 context.window=context;context.WGCFoodPortions={normalizeOFF:x=>x};
 context.WWObservability={request:async(url,init)=>{calls.push({url,init});return{response:{ok:true,status:200},text:'{"products":[]}'}}};
 context.WGC18={session:{user:{id:'sample'}},ensureHealthConsent:async()=>true,authedFetch:async()=>({items:[]})};
 vm.createContext(context);vm.runInContext(read('work-gym-planner-v16/diary-b.js'),context);
 vm.runInContext("foodResult=(food)=>food.name;showFoodSearchResults=()=>{};bindFoodResults=()=>{};stopBarcode=async()=>{};",context);
 return{context,element,calls,staged,messages,run:code=>vm.runInContext(code,context)};
}
test('typing finds local foods without calling the rate-limited provider',async()=>{
 const h=harness();h.element('foodSearchInput').value='oats';await h.context.searchFood({remote:false});
 assert.equal(h.calls.length,0);assert.match(h.element('foodSearchResults').innerHTML,/Oats.*Tap Search/);
 assert.match(read('work-gym-planner-v16/init.js'),/searchFood\(\{remote:false\}\)/);
});
test('explicit searches reuse packaged-food results and limit repeated remote queries',async()=>{
 const h=harness();h.element('foodSearchInput').value='oats';await h.context.searchFood();await h.context.searchFood();
 assert.equal(h.calls.length,1);h.element('foodSearchInput').value='milk';await h.context.searchFood();
 assert.equal(h.calls.length,1);assert.match(h.element('foodSearchResults').innerHTML,/wait a few seconds/);
});
test('a failed packaged-food lookup leaves local foods and Quick add available',async()=>{
 const h=harness();h.element('foodSearchInput').value='oats';h.context.WWObservability.request=async()=>{throw new TypeError('offline')};
 await h.context.searchFood();assert.match(h.element('foodSearchResults').innerHTML,/Oats.*Quick add/);
});
test('clearing search cancels a pending lookup and prevents stale results resurfacing',async()=>{
 const h=harness();let finish,signal;
 h.context.WWObservability.request=(url,opt)=>{signal=opt.signal;return new Promise(resolve=>finish=resolve)};
 h.element('foodSearchInput').value='oats';const pending=h.context.searchFood();h.context.clearFoodSearch({restore:false});
 assert.equal(signal.aborted,true);finish({response:{ok:true},text:'{"products":[{"name":"Late result"}]}'});await pending;
 assert.equal(h.element('foodSearchResults').innerHTML,'');assert.equal(h.element('foodSearchResults').hidden,true);
});
test('incomplete barcodes never reach the provider',async()=>{
 const h=harness();await h.context.lookupBarcode('34');await h.context.lookupBarcode('bad-text-12345678');
 assert.equal(h.calls.length,0);assert.match(h.element('barcodeStatus').textContent,/full 8, 12, 13 or 14-digit/);
});
test('repeated camera detections share one barcode request',async()=>{
 const h=harness();let finish;h.context.WWObservability.request=(url,init)=>{h.calls.push({url,init});return new Promise(resolve=>finish=resolve)};
 const pending=h.context.lookupBarcode('123456789012');await h.context.lookupBarcode('123456789012');assert.equal(h.calls.length,1);
 finish({response:{ok:true},text:'{"status":0}'});await pending;
});
test('a failed meal scan retains its photo, enables retry and cannot double-submit',async()=>{
 const h=harness();h.run("mealScanImageDataUrl='data:image/jpeg;base64,sample'");let reject,calls=0;
 h.context.WGC18.authedFetch=()=>{calls++;return new Promise((resolve,fail)=>reject=fail)};
 const pending=h.context.analyzeMealPhoto();await Promise.resolve();await h.context.analyzeMealPhoto();assert.equal(calls,1);
 reject(Object.assign(Error('offline'),{code:'NETWORK_ERROR'}));await pending;
 assert.equal(h.run('mealScanImageDataUrl'),'data:image/jpeg;base64,sample');assert.equal(h.element('analyzeMealPhoto').disabled,false);
 assert.match(h.element('mealScanStatus').textContent,/photo is still here/);assert.equal(h.staged.length,0);
});
test('a cancelled or different-account meal scan cannot stage late foods',async()=>{
 for(const change of ['resetMealScan()',"WGC18.session={user:{id:'other'}}"]){
  const h=harness();let finish,started;const sending=new Promise(resolve=>started=resolve);h.run("mealScanImageDataUrl='data:image/jpeg;base64,sample'");
  h.context.WGC18.authedFetch=()=>{started();return new Promise(resolve=>finish=resolve)};
  const pending=h.context.analyzeMealPhoto();await sending;h.run(change);
  finish({items:[{name:'Late meal',defaultGrams:100,per100:{cal:100}}]});await pending;assert.equal(h.staged.length,0);
 }
});
