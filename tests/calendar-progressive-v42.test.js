const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');

const root=join(__dirname,'..');
const read=file=>readFileSync(join(root,file),'utf8');
const js=read('work-gym-planner-v16/calendar-premium-v42.js');
const css=read('work-gym-planner-v16/calendar-premium-v42.css');
const platform=read('work-gym-planner-v16/schedule-platform-v25.js');

test('calendar defaults to a quiet progressive-disclosure workspace',()=>{
  for(const label of ['Month','Week','Today','Share'])assert.match(js,new RegExp(`>${label}<`));
  assert.match(js,/id="calendarAddV42"[^>]*>[\s\S]*?<\/span> Add<\/button>/);
  assert.match(js,/What would you like to add\?/);
  assert.match(js,/function openAdd\(kind,key\)\{var root=overlay\([\s\S]*?flow=newFlow\(kind,key\);renderFlow\(root\)\}/);
  for(const label of ['Work schedule','Extra shift','Time off','Holiday','Workout'])assert.match(js,new RegExp(label));
  assert.match(css,/\.plannerTabsV25\{display:none!important\}/);
  assert.match(css,/\.calDay \.dayDots,[\s\S]*\.calDay \.dayDetails,[\s\S]*\.calDay \.agendaCount\{display:none!important\}/);
});

test('normal work schedules use a guided shift, pattern and start flow',()=>{
  assert.match(js,/\['Shift','Pattern','Start'\]/);
  for(const label of ['Mon – Fri','Weekends','Every other weekend','4 on \/ 4 off','Custom rotation'])assert.match(js,new RegExp(label.replace('/','\\/')));
  assert.match(js,/data-rotation-day/);
  assert.match(js,/Tap a day to switch Work \/ Off/);
  assert.match(js,/Core\.startOfWeek\(anchor\)/);
  assert.match(js,/saveRotations\(rotations\(\)\.concat\(rotation\)\)/);
});

test('overtime and extra shifts remain one-off exceptions',()=>{
  assert.match(js,/draft:\{date:selected,/);
  for(const value of ['extra_shift','overtime','call_in','swap_shift'])assert.match(js,new RegExp(value));
  assert.match(js,/Extend existing shift/);
  assert.match(js,/Separate overtime shift/);
  assert.match(js,/d\.end=Core\.timeAfter\(d\.start,120\)/);
  assert.match(js,/exception:true,exceptionType:d\.exceptionType/);
  assert.match(js,/provenance:\{type:'calendar-exception'\}/);
  assert.match(platform,/exception:event\.exceptionType\|\|event\.timeOffType\|\|'time_off'/);
});

test('time off is saved as reversible dated overrides without changing rotations',()=>{
  for(const label of ['PTO','Vacation','Sick day','Unpaid leave'])assert.match(js,new RegExp(label));
  assert.match(js,/kind:'off',date:key/);
  assert.match(js,/saveEvents\(events\(\)\.concat\(added\)\)/);
  assert.doesNotMatch(js,/saveTimeOff[\s\S]{0,900}saveRotations/);
});

test('regional and workplace holidays are supported without assuming workers are off',()=>{
  for(const region of ['United States','United Kingdom','Canada','European Union'])assert.match(js,new RegExp(region));
  assert.match(js,/Treat as days off/);
  assert.match(js,/Public holidays do not have to mean a day off/);
  assert.match(js,/provenance\?\.type!=='holiday-auto'/);
  assert.match(js,/holidayList\(y,settings\.region\)/);
});

test('calendar PDF sharing has range, inclusion, preview, file-share and download paths',()=>{
  for(const label of ['This month','Next month','Custom','Work shifts','Overtime \/ extra shifts','Days off','Holidays','Workouts','Notes','Preview PDF'])assert.match(js,new RegExp(label.replace('/','\\/')));
  assert.match(js,/new Blob\(\[output\],\{type:'application\/pdf'\}\)/);
  assert.match(js,/navigator\.canShare\?\.\(\{files:\[file\]\}\)/);
  assert.match(js,/link\.download=fileName/);
  assert.match(js,/%PDF-1\.4/);
});

test('calendar sheets and mobile day details stay within the viewport',()=>{
  assert.match(css,/\.calendarSheetV42\{[^}]*max-height:min\(820px,calc\(100dvh - 36px\)\)/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.calendarDaySheetOpenV42 #page-calendar #plannerPane-calendar>\.dayCard\{display:block/);
  assert.match(css,/#plannerPane-calendar\.active\{animation:none;transform:none\}/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.calendarSheetV42\{width:100%;max-height:calc\(100dvh/);
  assert.match(css,/body\.premiumV30 #page-calendar/);
  assert.match(css,/body\.premiumV30 \.calendarOverlayV42/);
});

test('production, offline and native loaders include the v42 calendar',()=>{
  for(const file of ['work-gym-planner/index.html','work-gym-planner/boot.js']){
    const source=read(file);
    assert.match(source,/calendar-premium-v42\.css\?v=30\.1\.31/);
    assert.match(source,/calendar-premium-v42\.js/);
  }
  for(const file of ['work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
    const source=read(file);
    assert.match(source,/calendar-premium-v42\.css/);
    assert.match(source,/calendar-premium-v42\.js/);
  }
  assert.match(read('app-store/scripts/build-web.mjs'),/calendar-premium-v42\.js/);
  assert.match(read('app-store/scripts/audit-bundle.mjs'),/calendar-premium-v42\.css/);
});
