const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../shared/work-pay-v58');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../work-gym-planner-v16/work-pay-v58.js'),'utf8');
const rules=extra=>C.validateRules({...C.defaults(),rate:25,timeZone:'UTC',...extra});
const range={start:'2026-08-31',end:'2026-09-06'};
const entries=[{id:'saved',sourceId:'job',title:'Shift',date:'2026-09-01',start:'09:00',end:'17:00',kind:'work',status:'confirmed'}];

test('simple pay: taxes are explicitly optional, zero is different from no estimate',()=>{
 for(const [percentage,tax,net] of [[null,null,null],[0,0,200],[20,40,160],[100,200,0],[12.345,24.69,175.31]]){
  const report=C.summarize(entries,rules({withholdingPercent:percentage}),range);
  assert.equal(report.tax,tax);assert.equal(report.net,net);
 }
 for(const value of [-1,101,'not a number'])assert.throws(()=>rules({withholdingPercent:value}));
});
test('simple pay: deductions adjust the tax estimate once per period',()=>{
 const r=rules({withholdingPercent:20,deductions:[{name:'Pension',timing:'pre',mode:'fixed',amount:20},{name:'Benefits',timing:'post',mode:'fixed',amount:10}]});
 const result=C.summarize(entries,r,range);
 assert.equal(result.tax,36);assert.equal(result.net,134);
 assert.equal(C.summarize(entries,{...r,withholdingPercent:null},range).net,null);
});
test('simple pay: a missing rate does not produce a misleading take-home estimate',()=>{
 const result=C.summarize(entries,rules({rate:null,withholdingPercent:20}),range);
 assert.equal(result.incomplete,true);assert.equal(result.net,null);
});
test('simple pay: optional settings are disclosed without changing the storage or calculation engine',()=>{
 for(const text of ['Estimate taxes','More pay options','Shift options','wpTakeHomeV65','wpTaxSetupV65','taxField.required=taxToggle.checked','taxField.disabled=!taxToggle.checked','Object.assign({},r,Object.fromEntries(new FormData(form)))','data.withholdingPercent=taxToggle.checked?taxField.value:null'])assert.ok(source.includes(text),text);
 assert.ok(source.indexOf('id="wpEstimateTaxV65"')<source.indexOf('id="wpMorePayV65"'));
 assert.ok(!source.includes('id="wpMorePayV65" open'));
 assert.doesNotMatch(source,/\bfetch\s*\(|sendBeacon\s*\(|authedFetch\s*\(/);
 assert.match(source,/PREFIX='ww-workpay-v58:'/);
});
test('simple pay: both loaders refresh the pay stylesheet and scripts for returning users',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){
  const text=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  assert.ok(text.includes('work-pay-v58.css?v=30.1.31-profile77'));
  assert.ok(text.includes("assetRevision='30.1.31-profile77'"));
 }
});
test('simple pay: editable start and end dates use inclusive, frequency-aligned periods',()=>{
 const context={C};vm.runInNewContext(source.slice(source.indexOf(' function payPeriodDates('),source.indexOf(' function renderSettings('))+';this.dates=payPeriodDates;',context);
 for(const [date,period,fromEnd,start,end] of [
  ['2026-08-31','weekly',false,'2026-08-31','2026-09-06'],
  ['2026-09-20','biweekly',true,'2026-09-07','2026-09-20'],
  ['2026-12-28','fourweekly',false,'2026-12-28','2027-01-24'],
  ['2028-02-10','monthly',false,'2028-02-01','2028-02-29'],
  ['2028-02-29','semimonthly',true,'2028-02-16','2028-02-29'],
  ['2026-09-15','semimonthly',true,'2026-09-01','2026-09-15']
 ]){const result=context.dates(date,period,fromEnd);assert.equal(result.start,start);assert.equal(result.end,end)}
 assert.throws(()=>context.dates('2027-02-29','monthly'),/valid pay period date/);
 assert.ok(source.includes("field('Pay period start'"));assert.ok(source.includes("field('Pay period end'"));
});
