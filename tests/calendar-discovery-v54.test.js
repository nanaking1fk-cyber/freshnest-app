const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const Core=require('../shared/v25-scheduling');
const js=read('work-gym-planner-v16/calendar-premium-v42.js'),platform=read('work-gym-planner-v16/schedule-platform-v25.js');
function harness(){
 const sources=[{id:'saved-source',name:'Existing workplace',color:'#58a6ff',enabled:true}],saved=[{id:'old-rotation',pattern:['D','O'],anchor:'2026-08-01'}];
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-09-03T12:00:00']))}}
 const context={WWScheduling:Core,PREFIX:'wgp-v15-',Date:FixedDate,selectedDate:'2026-09-03',document:{readyState:'loading',addEventListener(){},querySelectorAll:()=>[]},WWV25:{sources:()=>sources,rotations:()=>saved,saveRotations:value=>saved.splice(0,saved.length,...value)},jget:(key,fallback)=>fallback,requestAnimationFrame(){},toast(){}};
 context.window=context;vm.createContext(context);
 vm.runInContext(js.replace('API.closeDaySheet=closeDaySheet;',"API.test={customRotationWeeks,customRotationMarkup,workStepMarkup,newFlow,saveWorkFlow,setFlow:value=>flow=value};API.closeDaySheet=closeDaySheet;"),context);
 return{api:context.WWCalendarV42.test,saved,sources,context};
}
test('work colors have stable descriptive names without changing stored colors',()=>{
 assert.deepEqual(Core.COLORS,['#58a6ff','#b8f34a','#a78bfa','#f59e0b','#f472b6','#22d3ee','#fb7185','#34d399']);
 assert.deepEqual(Core.COLOR_NAMES,['Blue','Lime green','Purple','Amber','Pink','Cyan','Coral','Mint green']);
 assert.match(platform,/safe\(Core.COLOR_NAMES\[index\]\)/);assert.doesNotMatch(platform,/Color '\+\(index\+1\)/);
});
test('calendar shortcuts are outside settings and use the existing multi-date workflow',()=>{
 assert.match(js,/header.insertAdjacentHTML\('afterend',[^\n]*calendarSelectDatesV54[^\n]*calendarWorkSourceV54/);
 assert.match(js,/V.beginShiftPicker\?\.\(\)/);assert.match(js,/V.stopShiftPicker\?\.\(\)/);
 assert.match(platform,/V.beginShiftPicker=beginShiftPicker/);assert.match(platform,/quick.setAttribute\('aria-pressed',String\(shiftPickerActive\)\)/);
 assert.match(js,/id="calendarWorkSourceFormV54"/);assert.match(js,/saveSources\(sources\(\)\.concat\(source\)\)/);
});
test('custom rotations show actual dates, today, work/off states and no lettered weeks',()=>{
 const h=harness(),d=h.api.newFlow('work').draft;d.pattern='custom';
 const weeks=h.api.customRotationWeeks(d),html=h.api.customRotationMarkup(d);
 assert.equal(weeks[0][0].date,'2026-08-31');assert.equal(weeks[1][6].date,'2026-09-13');
 assert.equal(weeks.flat().filter(x=>x.today).length,1);assert.equal(weeks.flat().find(x=>x.today).date,'2026-09-03');
 assert.match(html,/data-rotation-date="2026-09-03"/);assert.match(html,/aria-current="date"/);assert.match(html,/aria-pressed="false"/);
 assert.doesNotMatch(html,/Week [ABCD]/);assert.match(html,/Start one week earlier/);assert.match(html,/This week/);
});
test('calendar dates stay consecutive across months, years and daylight-saving weeks',()=>{
 const h=harness();
 for(const anchor of ['2026-09-28','2026-12-31','2026-11-01','2026-03-08']){
  const d={anchor,weeks:4,custom:Array.from({length:28},(_,i)=>i%3!==0)},days=h.api.customRotationWeeks(d).flat();
  assert.equal(days.length,28);assert.equal(new Set(days.map(x=>x.date)).size,28);assert.equal(Core.dateFromKey(days[0].date).getDay(),1);
  days.forEach((day,i)=>{assert.equal(day.position,i);assert.equal(day.work,d.custom[i]);if(i)assert.equal(Core.diffDays(day.date,days[i-1].date),1)});
 }
});
test('the saved custom rotation matches every previewed date and preserves older rotations',()=>{
 const h=harness(),before=structuredClone(h.saved[0]),flow=h.api.newFlow('work'),d=flow.draft;
 d.pattern='custom';d.weeks=3;d.custom=Array.from({length:21},(_,i)=>i%4<2);d.anchor='2026-09-09';
 const preview=h.api.customRotationWeeks(d).flat();h.api.setFlow(flow);h.api.saveWorkFlow();
 assert.equal(h.saved.length,2);assert.deepEqual(h.saved[0],before);const saved=h.saved[1];assert.equal(saved.anchor,'2026-09-07');
 for(const day of preview){assert.equal(!!Core.rotationEventOn(saved,day.date,h.sources[0]),day.work);assert.equal(!!Core.rotationEventOn(saved,Core.keyFromDate(Core.addDays(Core.dateFromKey(day.date),21)),h.sources[0]),day.work)}
});
test('final review shows the same dated cycle when the start week changes',()=>{
 const h=harness(),flow=h.api.newFlow('work');flow.step=3;flow.draft.pattern='custom';flow.draft.anchor='2026-12-28';h.api.setFlow(flow);
 const html=h.api.workStepMarkup();assert.match(html,/First week begins \(Monday\)/);assert.match(html,/Dec 28, 2026/);assert.match(html,/Jan 10, 2027/);assert.match(html,/repeats every 2 weeks/);
});
test('the selected custom calendar replaces the preset list without losing its pattern',()=>{
 const h=harness(),flow=h.api.newFlow('work');flow.step=2;flow.draft.pattern='custom';h.api.setFlow(flow);
 assert.match(h.api.workStepMarkup(),/data-change-pattern/);assert.doesNotMatch(h.api.workStepMarkup(),/calendarPatternListV42/);
 flow.draft.choosingPattern=true;assert.match(h.api.workStepMarkup(),/calendarPatternListV42/);assert.doesNotMatch(h.api.workStepMarkup(),/data-rotation-date/);
});
test('production and offline loaders deliver the updated calendar and color dictionary',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html']){const source=read(file);assert.match(source,/calendar-premium-v42.css\?v=30\.1\.31-free57/);assert.match(source,/v25-scheduling.js\?v=30\.1\.31-free57/)}
 for(const file of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js','work-gym-planner/shell.html','work-gym-planner-v16/pwa-patch.js'])assert.match(read(file),/30\.1\.31-readiness62/);
});
