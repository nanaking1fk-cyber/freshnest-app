const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../shared/work-pay-v58');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
const rules=extra=>({...C.defaults(),timeZone:'UTC',rate:20,period:'weekly',anchor:'2026-08-31',weeklyAfter:40,...extra});
const range={start:'2026-08-31',end:'2026-09-06'};
const shift=(date,extra={})=>({id:date,date,start:'09:00',end:'17:00',title:'Work',sourceId:'job',kind:'work',status:'confirmed',...extra});
const shifts=(count,end='17:00')=>Array.from({length:count},(_,i)=>shift(C.addDays(range.start,i),{end}));
const report=(rows,extra={},period=range)=>C.summarize(rows,rules(extra),period);

test('navigation: only small hidden-page state writes use keepalive',async()=>{
 const source=read('work-gym-planner-v16/accounts-v18.js'),start=source.indexOf(' async function requestText('),end=source.indexOf(' async function raw(',start),seen=[];
 const context={TextEncoder,document:{visibilityState:'hidden'},window:{WWObservability:{request:async(url,opt)=>{seen.push(opt);return{}}}}};
 vm.runInNewContext(source.slice(start,end)+';this.run=requestText;',context);
 for(const [url,opt,hidden,keepalive] of [
  ['/api/v18/state',{method:'PUT',body:'{}'},true,true],
  ['/api/v18/state',{method:'PUT',body:'x'.repeat(60000)},true,false],
  ['/api/v18/state',{method:'PUT',body:'€'.repeat(25000)},true,false],
  ['/api/v18/state',{method:'PUT',body:'{}'},false,false],
  ['/api/v18/account',{method:'DELETE',body:'{}'},true,false]
 ]){context.document.visibilityState=hidden?'hidden':'visible';await context.run(url,opt);assert.equal(seen.at(-1).keepalive===true,keepalive);assert.equal(seen.at(-1).body,opt.body)}
});
test('hours: stable calendar identities deduplicate legacy mirrors, not distinct events',()=>{
 const first={name:'Work',sourceId:'job',eventId:'shift',start:'09:00',end:'17:00'},legacy={...first,eventId:undefined,legacy:true};
 assert.equal(C.calendarEntries([first,legacy],range.start).length,1);
 assert.equal(C.calendarEntries([first,{...first,eventId:'different'}],range.start).length,2);
 const id=C.calendarEntries([legacy],range.start)[0].id;
 assert.equal(C.calendarEntries([{name:'Other',sourceId:'b',start:'12:00',end:'14:00'},legacy],range.start)[1].id,id);
});

test('hours: regular shifts subtract unpaid breaks without rounding each segment',()=>{
 const r=report([shift(range.start,{breakMinutes:30})]);assert.equal(r.totals.hours,7.5);assert.equal(r.totals.gross,150);
 assert.equal(report([shift(range.start,{breakMinutes:30,paidHours:7})]).totals.hours,7);
});
test('hours: weekly overtime is computed per workweek, never averaged over a pay period',()=>{
 const rows=[...shifts(6),shift('2026-09-07'),shift('2026-09-08')];
 const r=report(rows,{}, {...range,end:'2026-09-13'});assert.equal(r.totals.regular,56);assert.equal(r.totals.overtime,8);assert.equal(r.totals.gross,1360);
});
test('hours: midweek period includes earlier workweek context',()=>{
 const r=report(shifts(6),{},{start:'2026-09-02',end:'2026-09-06'});assert.equal(r.totals.hours,32);assert.equal(r.totals.regular,24);assert.equal(r.totals.overtime,8);
});
test('hours: daily and weekly overtime are not counted twice',()=>{
 const r=report(shifts(5,'19:00'),{dailyAfter:8});assert.equal(r.totals.hours,50);assert.equal(r.totals.regular,40);assert.equal(r.totals.overtime,10);assert.equal(r.totals.gross,1100);
});
test('hours: daily double time and manual overtime',()=>{
 const r=report([shift(range.start,{end:'23:00'})],{dailyAfter:8,doubleAfter:12});assert.equal(r.totals.regular,8);assert.equal(r.totals.overtime,4);assert.equal(r.totals.double,2);assert.equal(r.totals.gross,360);
 assert.equal(report([shift(range.start,{kind:'overtime'})]).totals.gross,240);
});
test('hours: holiday is a subset, premium must be configured, stacking is explicit',()=>{
 const e=shift(range.start,{holiday:true});assert.equal(report([e]).totals.gross,160);assert.equal(report([e]).totals.holiday,8);
 assert.equal(report([e],{holidayMultiplier:2}).totals.gross,320);
 const ot={...e,kind:'overtime'};assert.equal(report([ot],{holidayMultiplier:2}).totals.gross,320);assert.equal(report([ot],{holidayMultiplier:2,stack:'add'}).totals.gross,400);
});
test('hours: overnight shifts split at midnight with correct night/weekend extras',()=>{
 const r=report([shift('2026-09-05',{start:'22:00',end:'06:00'})],{nightDifferential:2,weekendDifferential:3});assert.equal(r.totals.hours,8);assert.equal(r.totals.gross,200);
 const monday=report([shift('2026-08-30',{start:'22:00',end:'06:00'})],{weekendDifferential:3});assert.equal(monday.totals.hours,6);assert.equal(monday.totals.gross,120);
});
test('hours: night differential can be multiplied with premiums or paid flat',()=>{
 const e=shift(range.start,{start:'22:00',end:'06:00',kind:'overtime'});assert.equal(report([e],{nightDifferential:2}).totals.gross,264);assert.equal(report([e],{nightDifferential:2,differentialPremium:false}).totals.gross,256);
});
test('hours: unpaid overnight break is apportioned and disclosed',()=>{
 const b=C.bounds(shift(range.start,{start:'22:00',end:'06:00',breakMinutes:60}),rules());assert.equal(b.hours,7);assert.equal(b.segments[0].hours,1.75);assert.match(b.warnings.join(' '),/spread across/);
});
test('hours: daylight-saving spring forward and fall back use elapsed hours',()=>{
 const r=rules({timeZone:'America/New_York'});
 assert.equal(C.bounds(shift('2026-03-07',{start:'22:00',end:'06:00'}),r).hours,7);
 assert.equal(C.bounds(shift('2026-10-31',{start:'22:00',end:'06:00'}),r).hours,9);
 assert.throws(()=>C.bounds(shift('2026-03-08',{start:'02:30',end:'06:00'}),r),/does not exist/);
 const repeated=C.bounds(shift('2026-11-01',{start:'01:30',end:'02:30'}),r);assert.equal(repeated.hours,2);assert.match(repeated.warnings.join(' '),/Clock-change/);
});
test('hours: paid leave does not trigger work overtime',()=>{
 const r=report([...shifts(5),shift('2026-09-05',{kind:'leave',paidHours:8})]);assert.equal(r.totals.hours,40);assert.equal(r.totals.leave,8);assert.equal(r.totals.overtime,0);assert.equal(r.totals.gross,960);
});
test('hours: incomplete rates are never shown as a complete pay estimate',()=>{
 const r=report([shift(range.start)],{rate:null,withholdingPercent:20});assert.equal(r.incomplete,true);assert.equal(r.net,null);assert.equal(r.totals.hours,8);
 assert.equal(report([shift(range.start,{rate:0})]).incomplete,false);
});
test('hours: invalid times, rates, breaks and leave are rejected',()=>{
 for(const extra of [{rate:-1},{rate:'bad'},{differential:-2},{breakMinutes:600},{breakMinutes:'NaN'},{paidHours:49},{start:'bad'},{endDate:'2026-08-30'},{kind:'leave',paidHours:-1},{kind:'leave',paidHours:25}])assert.equal(report([shift(range.start,extra)]).incomplete,true,JSON.stringify(extra));
});
test('hours: rules validation is strict but optional thresholds may be blank',()=>{
 for(const r of [{otMultiplier:''},{weeklyAfter:0},{rate:-1},{withholdingPercent:101},{currency:'$'},{timeZone:'Bad/Timezone'},{anchor:'2026-02-30'},{dailyAfter:12,doubleAfter:8},{nightStart:'25:00'}])assert.throws(()=>C.validateRules(rules(r)));
 assert.equal(C.validateRules(rules({weeklyAfter:''})).weeklyAfter,null);
});
test('hours: deductions occur once per period and take-home needs withholding input',()=>{
 const deductions=[{name:'Pension',timing:'pre',mode:'percent',amount:5},{name:'Insurance',timing:'pre',mode:'fixed',amount:50},{name:'Union',timing:'post',mode:'fixed',amount:10}];
 const r=report(shifts(5),{deductions,withholdingPercent:20});assert.equal(r.totals.gross,800);assert.equal(r.pre,90);assert.equal(r.tax,142);assert.equal(r.post,10);assert.equal(r.net,558);
 assert.equal(report(shifts(5),{deductions}).net,null);
 assert.match(report([],{deductions,withholdingPercent:0}).warnings.join(' '),/exceed/);
});
test('hours: planned versus confirmed views remain separate',()=>{
 const rows=[shift(range.start),shift('2026-09-01',{status:'planned'})];assert.equal(report(rows).totals.hours,16);
 assert.equal(C.summarize(rows,rules(),range,{confirmedOnly:true}).totals.hours,8);
});
test('hours: saved rates are retained and explicit overlaps are flagged',()=>{
 const rows=[shift(range.start,{rate:18}),shift(range.start,{id:'second',start:'16:00',end:'18:00'})];const r=report(rows,{rate:25});assert.equal(r.totals.gross,194);assert.match(r.warnings.join(' '),/Overlapping/);
});
test('hours: periods work before the anchor, across months, and leap years',()=>{
 assert.deepEqual(C.periodFor('2026-08-30',rules()),{start:'2026-08-24',end:'2026-08-30'});
 assert.deepEqual(C.periodFor('2028-02-20',rules({period:'monthly'})),{start:'2028-02-01',end:'2028-02-29'});
 assert.deepEqual(C.periodFor('2026-09-15',rules({period:'semimonthly'})),{start:'2026-09-01',end:'2026-09-15'});
 assert.deepEqual(C.periodFor('2026-09-16',rules({period:'semimonthly'})),{start:'2026-09-16',end:'2026-09-30'});
 assert.deepEqual(C.periodFor('2026-09-10',rules({period:'fourweekly'})),{start:'2026-08-31',end:'2026-09-27'});
});
test('hours: calendar adapter ignores off/unknown rows, preserves exceptions and legacy times',()=>{
 const rows=C.calendarEntries([{off:true},{unknown:true},{eventId:'ot',sourceId:'a',name:'Extra',start:'19:00',end:'23:00'},{name:'Legacy',time:'4:00 PM–12:00 AM'}],range.start,[{id:'ot',exceptionType:'overtime'}]);
 assert.equal(rows.length,2);assert.equal(rows[0].kind,'overtime');assert.equal(rows[1].start,'16:00');assert.equal(rows[1].end,'00:00');assert.equal(rows[1].status,'planned');
});
test('hours: confirmed snapshots replace calendar rows, not the calendar itself',()=>{
 const original=shift(range.start,{id:'cal:one',calendar:true,status:'planned'}),before=JSON.stringify(original),confirmed={...original,status:'confirmed',start:'10:00',scheduledStart:'09:00',scheduledEnd:'17:00'};
 const rows=C.reconcile([original],{[confirmed.id]:confirmed});assert.equal(rows.length,1);assert.equal(rows[0].start,'10:00');assert.equal(rows[0].calendarChanged,false);assert.equal(JSON.stringify(original),before);
 assert.equal(C.reconcile([{...original,end:'18:00'}],{[confirmed.id]:confirmed})[0].calendarChanged,true);
 assert.equal(C.reconcile([],{[confirmed.id]:confirmed})[0].detached,true);
 assert.equal(C.reconcile([original],{[confirmed.id]:{...confirmed,status:'skipped'}}).length,0);
});
test('hours: timer timestamps keep precision and do not invent a clock-change warning',()=>{
 const b=C.bounds(shift(range.start,{start:'09:00',end:'10:00',startedAt:Date.parse(range.start+'T09:00:15Z'),endedAt:Date.parse(range.start+'T10:00:30Z')}),rules());assert.equal(C.round(b.hours),1);assert.equal(b.warnings.length,0);
});
test('hours: CSV exports protect spreadsheet formulas and omit personal identifiers',()=>{
 const r=report([shift(range.start,{title:' =HYPERLINK("evil")'})]);const csv=C.csv(r,'USD');assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("' =HYPERLINK"));assert.ok(csv.includes('Holiday worked hours (subset)'));assert.ok(!csv.includes('sourceId'));assert.ok(!csv.includes('account'));
});
test('hours: UI exposes clock, pay rules, restoring excluded entries and export without network access',()=>{
 const source=read('work-gym-planner-v16/work-pay-v58.js');new vm.Script(source);
 for(const text of ['calendarWorkPayV58','moreWorkPayV58','Clock in','Clock out','Start break','wpRulesV58','data-wp-restore','Compare with my payslip','CSV','navigator.locks','Your account changed'])assert.ok(source.includes(text),text);
 assert.doesNotMatch(source,/\bfetch\s*\(|authedFetch\s*\(|sendBeacon\s*\(|queueSync\s*\(/);
 assert.ok(source.includes("PREFIX='ww-workpay-v58:'"));assert.ok(!'ww-workpay-v58:user'.startsWith('wgp-v15-'));
 const accounts=read('work-gym-planner-v16/accounts-v18.js');assert.match(accounts,/if\(result\?\.deleted!==true\|\|result\?\.verified!==true\)[\s\S]*clearDeletedAccountLocally\(uid\)/);assert.match(accounts,/clearDeletedAccountLocally[\s\S]*'ww-workpay-v58:'\+uid/);
});
test('hours: assets load in web and service-worker entry points; premium styles scoped',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html','work-gym-planner/sw.js','work-gym-planner-v16/sw.js'])for(const asset of ['work-pay-v58.js','work-pay-v58.css'])assert.ok(read(file).includes(asset),file+' '+asset);
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){const source=read(file);assert.ok(source.includes('../shared/work-pay-v58.js'));assert.ok(source.includes('accounts-v18.js'));assert.ok(source.includes('health-consent-v35.js'));}
 const css=read('work-gym-planner-v16/work-pay-v58.css');for(const line of css.trim().split('\n'))assert.match(line,/^(body\.premiumV30|@media)/);assert.ok(css.includes('100dvh'));assert.ok(css.includes('[hidden]{display:none!important}'));
});
