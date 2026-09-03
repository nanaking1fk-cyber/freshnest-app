const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {validateRequest,validateResult,responseFormat,instructions}=require('../server/roster-vision-v48');
const jpeg='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216]),Buffer.alloc(128),Buffer.from([255,217])]).toString('base64');
const input={identity:'Alex Green',month:'2026-09',image:jpeg,confirmed:true};
const work=(date='2026-09-07',start='19:00',end='07:00')=>({kind:'work',date,start,end,evidence:'19-07',uncertain:false});
const result=items=>({status:'matched',multiple_people:false,items,warnings:[]});
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');

test('roster uploads require a bounded JPEG, identity, month and explicit confirmation',()=>{
 assert.deepEqual(validateRequest(input),{identity:input.identity,month:input.month,image:jpeg});
 for(const change of [{identity:''},{month:'2026-13'},{confirmed:false},{image:'https://private.example/photo'},{image:'data:image/jpeg;base64,YWJj'}])assert.throws(()=>validateRequest({...input,...change}));
 assert.throws(()=>validateRequest({...input,image:jpeg+'a'.repeat(3800000)}),error=>error.status===413);
});
test('vision output preserves overnight shifts and explicit off days without inventing rotations',()=>{
 const value=validateResult(result([work(),work(),{kind:'off',date:'2026-09-08',start:'',end:'',uncertain:false}]),'2026-09');
 assert.equal(value.items.length,2);assert.equal(value.items[0].start,'19:00');assert.equal(value.items[0].end,'07:00');assert.equal(value.items[1].kind,'off');assert.equal(value.items[1].start,'');
 assert.ok(!('rotation' in value));assert.equal(value.items[0].sourceText,'');
});
test('unsafe dates and illegible times are excluded, with a partial-reading warning',()=>{
 const value=validateResult({...result([work(),work('2026-02-30'),work('2026-12-01'),work('2026-09-09','D',''),work('2026-09-10','08:00','08:00'),{...work('2026-09-11'),uncertain:true}]),warnings:['Private Name must never be echoed']},'2026-09');
 assert.equal(value.items.length,2);assert.equal(value.items[1].needsReview,true);assert.equal(value.warnings.length,1);assert.ok(!JSON.stringify(value).includes('Private Name'));
});
test('wrong-person, multiple-person and unreadable results cannot produce calendar items',()=>{
 for(const change of [{status:'no_match'},{status:'unreadable'},{multiple_people:true},{items:[]}])assert.throws(()=>validateResult({...result([work()]),...change},'2026-09'),error=>error.status===422);
 assert.equal(responseFormat.strict,true);assert.match(instructions,/Never assume a default shift length/);assert.match(instructions,/Do not expand rotations/);
});
function handler(dependencies){
 const context={module:{exports:{}},require:name=>name==='crypto'?require('crypto'):name.includes('roster-vision')?require('../server/roster-vision-v48'):dependencies,process:{env:{}},console};
 vm.runInNewContext(read('api/v25/roster-scan.js'),context);return context.module.exports;
}
test('the photo endpoint enforces auth and consent before quota or AI, with no persisted images',async()=>{
 const calls=[];let consent=true,authenticate=true;
 const dependencies={cors:()=>false,json:(res,status,body)=>({status,body}),verifyUser:async()=>{calls.push('auth');if(!authenticate)throw Object.assign(Error('Sign in'),{status:401});return{id:'synthetic-user'}},requireHealthConsent:async(user,purpose)=>{calls.push(purpose);if(!consent)throw Object.assign(Error('Consent needed'),{status:428})},countAI:async()=>calls.push('quota'),openAI:async options=>{calls.push(options);return{text:JSON.stringify(result([work()]))}},parseAIJson:JSON.parse,errorResponse:(res,error)=>({status:error.status,error:error.message})};
 const run=handler(dependencies);
 let response=await run({method:'POST',body:input},{});assert.equal(response.status,200);assert.deepEqual(calls.slice(0,3),['auth','personalized_ai','quota']);assert.equal(calls[3].imageDetail,'original');assert.equal(calls[3].timeoutMs,48000);assert.equal(calls[3].imageDataUrl,jpeg);assert.equal(calls[3].model,'gpt-5.6-terra');
 calls.length=0;consent=false;response=await run({method:'POST',body:input},{});assert.equal(response.status,428);assert.deepEqual(calls,['auth','personalized_ai']);
 calls.length=0;authenticate=false;response=await run({method:'POST',body:input},{});assert.equal(response.status,401);assert.deepEqual(calls,['auth']);
});
test('provider errors are sanitized and timeouts are bounded',async()=>{
 for(const failure of [Object.assign(Error('secret input text'),{name:'TimeoutError'}),Object.assign(Error('secret API key'),{status:401}),Object.assign(Error('provider capacity'),{status:429})]){
  const run=handler({cors:()=>false,verifyUser:async()=>({id:'test'}),requireHealthConsent:async()=>{},countAI:async()=>{},openAI:async()=>{throw failure},errorResponse:(res,error)=>({status:error.status,message:error.message})});
  const response=await run({method:'POST',body:input},{});assert.ok([504,502,429].includes(response.status));assert.ok(!response.message.includes('secret'));
 }
});
test('photo intake avoids legacy OCR, minimizes uploads and requires final review',()=>{
 const client=read('work-gym-planner-v16/roster-scan-v48.js');
 assert.match(client,/stopImmediatePropagation\(\)/);assert.doesNotMatch(client,/Tesseract|localStorage\.setItem|fileName:/);assert.match(client,/confirmed:true/);assert.match(client,/selectedImage\(\)/);assert.match(client,/ctx\.fillStyle='#fff'/);assert.match(client,/stamp!==generation/);assert.match(client,/AbortController/);assert.match(client,/WGPNative\.apiBase/);
 const schedule=read('work-gym-planner-v16/schedule-platform-v25.js');assert.match(schedule,/reviewRosterVision/);assert.match(schedule,/selected:!item\.needsReview/);assert.match(schedule,/sourceType:'roster-photo',sourceText:''/);assert.match(schedule,/data-proposal-start/);
});
test('roster assets ship in both production loaders, service workers and native bundle',()=>{
 for(const file of ['work-gym-planner/index.html','work-gym-planner/boot.js','work-gym-planner/sw.js','work-gym-planner-v16/sw.js','app-store/scripts/audit-bundle.mjs']){
  const value=read(file);assert.ok(value.includes('roster-scan-v48.js'),file);assert.ok(value.includes('roster-scan-v48.css'),file);
 }
 const css=read('work-gym-planner-v16/roster-scan-v48.css');
 for(const line of css.split('\n').filter(line=>line.includes('{')&&!line.startsWith('@')))assert.match(line,/^\s*body\.premiumV30 #(rosterScanDialogV48|page-calendar)/);
 assert.match(read('work-gym-planner/privacy.html'),/id="roster"/);
});
