const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const today=fs.readFileSync(path.join(root,'work-gym-planner-v16/today.js'),'utf8');
const start=today.indexOf('function dashboardWorkRows');
const end=today.indexOf('function renderPausedSetupDashboard',start);
const source=today.slice(start,end);

function dashboardFor(windowValue,profileValue={}){
  return new Function('window','profile','smartWork','variableCode','fixedWork','shiftText','homeTime',`${source};return dashboardWorkRows;`)(
    windowValue,
    ()=>profileValue,
    ()=>null,
    ()=>'D',
    ()=>false,
    on=>on?'Working':'Off',
    value=>value
  );
}

test('Home reads the same unified work rows as Calendar',()=>{
  const calendarRows=[
    {name:'Day shift',sourceName:'Hospital',shiftLabel:'Day shift',time:'7:00 AM–7:00 PM',sourceId:'primary',eventId:'shift-1'},
    {name:'Night shift',sourceName:'Weekend job',shiftLabel:'Night shift',start:'20:00',end:'04:00',sourceId:'second',rotationId:'rotation-1'}
  ];
  const dashboard=dashboardFor({WWV25:{workRowsOn:key=>{assert.equal(key,'2026-09-01');return calendarRows},workRowDisplay:row=>({workplace:row.sourceName,shift:row.shiftLabel})}});
  assert.deepEqual(dashboard('2026-09-01',{kind:'one'}),[
    {name:'Hospital',detail:'Day shift',value:'7:00 AM–7:00 PM',state:'work'},
    {name:'Weekend job',detail:'Night shift',value:'20:00 – 04:00',state:'work'}
  ]);
});

test('Home preserves calendar off days and unknown rows',()=>{
  const dashboard=dashboardFor({WWV25:{workRowsOn:()=>[
    {name:'Hospital · Off',time:'Off work',off:true},
    {name:'Agency roster',time:'Date needs review',unknown:true}
  ]}});
  assert.deepEqual(dashboard('2026-09-01',{kind:'unknown'}),[
    {name:'Hospital · Off',detail:'Work shift',value:'Off work',state:'off'},
    {name:'Agency roster',detail:'Work shift',value:'Date needs review',state:'unknown'}
  ]);
});

test('Home retains legacy profile schedules when the unified calendar is unavailable',()=>{
  const profileValue={fixed:{enabled:true,name:'Legacy job',start:'09:00',end:'17:00'}};
  const dashboard=new Function('window','profile','smartWork','variableCode','fixedWork','shiftText','homeTime',`${source};return dashboardWorkRows;`)(
    {},
    ()=>profileValue,
    ()=>null,
    ()=>'D',
    ()=>true,
    (on,startTime,endTime)=>on?`${startTime}-${endTime}`:'Off',
    value=>value
  );
  assert.deepEqual(dashboard('2026-09-01',{kind:'one'}),[
    {name:'Legacy job',value:'09:00-17:00',state:'work'}
  ]);
});
