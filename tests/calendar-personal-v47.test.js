const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
const core=read('work-gym-planner-v16/calendar.js'),calendar=read('work-gym-planner-v16/calendar-premium-v42.js'),css=read('work-gym-planner-v16/calendar-premium-v42.css');
function functionSource(name){const start=calendar.indexOf('  function '+name+'('),end=calendar.indexOf('\n',start),first=calendar.slice(start,end);return first.endsWith('}')?first:calendar.slice(start,calendar.indexOf('\n  }',start)+4)}
function storageContext(){
 const values=new Map();let next=0,syncs=0;
 const context={PREFIX:'test-',Date,uid:()=>String(++next),jget:(key,fallback)=>structuredClone(values.get(key)??fallback),jset:(key,value)=>values.set(key,structuredClone(value)),date:key=>new Date(key+'T12:00:00'),window:{WGC18:{queueSync:()=>syncs++}}};vm.createContext(context);
 vm.runInContext(core.slice(core.indexOf('const DAY_ITEMS_KEY'),core.indexOf('function workScheduleRows')),context);
 return{context,values,syncs:()=>syncs};
}
test('Personal event is a first-choice add flow with no work-source requirement',()=>{
 assert.match(calendar,/\['personal','•','Personal event'/);assert.match(calendar,/flow.kind==='personal'\)renderPersonalFlow/);
 const form=functionSource('renderPersonalFlow');for(const field of ['title','date','allDay','time','end','frequency'])assert.ok(form.includes('name="'+field+'"'));
 assert.match(form,/form\.onsubmit/);assert.match(form,/reportValidity/);assert.doesNotMatch(form,/ensureSource|Workplace|sourceId/);
});
test('personal events append to existing items and repeat without changing work storage',()=>{
 const {context:c,values,syncs}=storageContext();
 c.addDayItem('2026-09-03',{title:'Existing plan',type:'event'});
 const work=[{id:'shift',kind:'work',date:'2026-09-03'}];values.set('test-schedule-events-v25',work);
 Object.assign(c,{Core:{dateFromKey:key=>new Date(key+'T12:00:00')},closeOverlay(){},closeDaySheet(){},V:{selectTab(){}},refreshCalendar(){},toast(){}});
 vm.runInContext(functionSource('savePersonalEvent'),c);
 c.savePersonalEvent({date:'2026-09-03',personalTitle:' Dinner ',personalTime:'18:30',personalEnd:'20:00',frequency:'none'});
 assert.equal(c.personalItemsOn('2026-09-03').length,2);assert.equal(c.personalItemsOn('2026-09-03')[0].title,'Dinner');assert.equal(c.personalItemsOn('2026-09-03')[0].end,'20:00');
 c.savePersonalEvent({date:'2026-09-03',personalTitle:'Birthday',personalTime:'09:00',personalEnd:'10:00',allDay:true,frequency:'yearly'});
 assert.equal(c.recurringCalendarItemsOn('2027-09-03')[0].title,'Birthday');assert.equal(c.recurringCalendarItemsOn('2027-09-03')[0].time,'');assert.equal(c.recurringCalendarItemsOn('2027-09-03')[0].end,'');
 assert.deepEqual(values.get('test-schedule-events-v25'),work);assert.equal(syncs(),3);
 const event=c.personalItemsOn('2026-09-03')[0];c.patchDayItem('2026-09-03',event.id,{title:'Updated dinner',end:'21:00'});assert.equal(c.personalItemsOn('2026-09-03')[0].end,'21:00');c.deleteDayItem('2026-09-03',event.id);assert.equal(c.personalItemsOn('2026-09-03')[0].title,'Existing plan');
});
test('Compact defaults quietly and Detailed respects the saved preference',()=>{
 const {context:c}=storageContext();assert.equal(c.calendarDisplayMode(),'compact');
 c.renderCalendar=()=>{};c.setCalendarDisplayMode('details');assert.equal(c.calendarDisplayMode(),'details');c.setCalendarDisplayMode('compact');assert.equal(c.calendarDisplayMode(),'compact');
 assert.match(css,/\.monthbar \.calendarDisplayToggleV32\{display:flex/);
 assert.doesNotMatch(css,/\.calendarDisplayToggleV32\{display:none/);
assert.match(css,/data-calendar-density="details"\] \.calendarCellDetailsV47\{display:grid!important/);
});
test('personal events have markers, detailed labels and filters in month and week views',()=>{
 const state={work:true,personal:true,workout:true,holidays:true,overtime:true,timeOff:true},c={filters:()=>state,rawEventForRow:()=>null,eventKind:()=> 'work',V:{workRowDisplay:row=>({workplace:row.name,shift:'Work shift',time:row.time})}};vm.createContext(c);
 for(const name of ['safe','rowDisplay','visibleCellItems','cellDetailsMarkup','markerMarkup'])vm.runInContext(functionSource(name),c);
 const facts={work:[{name:'Work',time:'09:00–17:00'}],agenda:[{title:'<Dinner>',time:'18:30',end:'20:00'}],workout:false,holiday:[]};
 let items=c.visibleCellItems(facts);assert.equal(items.length,2);assert.match(c.cellDetailsMarkup(items),/&lt;Dinner&gt;/);assert.match(c.cellDetailsMarkup(items),/18:30–20:00/);assert.match(c.markerMarkup('2026-09-03',facts),/calendarMarkerV42 personal/);
 state.personal=false;items=c.visibleCellItems(facts);assert.equal(items.length,1);assert.doesNotMatch(c.markerMarkup('2026-09-03',facts),/calendarMarkerV42 personal/);
 assert.match(calendar,/\['personal','Personal events & tasks'/);assert.match(calendar,/#calendarWeekRailV33 \[data-week-date\]/);
});
