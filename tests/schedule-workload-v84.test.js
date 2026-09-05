const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

const platform=read('work-gym-planner-v16/schedule-platform-v25.js');
const today=read('work-gym-planner-v16/today.js');
const calendar=read('work-gym-planner-v16/calendar.js');
const premium=read('work-gym-planner-v16/calendar-premium-v42.js');
const optional=read('work-gym-planner-v16/audit-v169.js')+read('work-gym-planner-v16/singlejob-ui-v169.js')+read('work-gym-planner-v16/commercial-v17.js');
const native=read('app-store/native/native-bridge.js');
const appCss=read('work-gym-planner-v16/app-v30.css');

test('multiple saved shifts become a high-load work state for adaptive training',()=>{
  assert.match(platform,/blocks=workEventsOn\(key\)\.length/);
  assert.match(platform,/blocks>1[\s\S]*kind:'both'/);
  assert.match(platform,/blocks===1&&state\.kind==='off'[\s\S]*kind:'one'/);
  assert.match(platform,/multipleWorkBlocks:true/);
  assert.match(platform,/wgp:schedulechange/);
  assert.match(platform,/renderTodayDashboard/);
  assert.match(platform,/renderTraining/);
});

test('workplace and shift variant are presented separately without changing saved rows',()=>{
  assert.match(platform,/function workRowDisplay\(row\)/);
  assert.match(platform,/workplace:workplace,shift:shift/);
  assert.match(today,/name:display\.workplace/);
  assert.match(today,/detail:display\.shift/);
  assert.match(today,/Multiple shifts/);
  assert.match(calendar,/function calendarWorkDisplay/);
  assert.match(premium,/function rowDisplay/);
  assert.match(premium,/\[label,display\.shift,display\.time\]/);
});

test('workday workout language does not assume how many jobs a person has',()=>{
  assert.doesNotMatch(optional,/Single-job day|single-job days|working one job|SINGLE-JOB DAY/i);
  assert.match(optional,/Fits around today’s shift/);
  assert.match(optional,/Optional workout/);
});

test('native iPhone viewport cannot remain double-tap or focus zoomed',()=>{
  assert.match(native,/function stabilizeNativeViewport/);
  assert.match(native,/maximum-scale=1,user-scalable=no/);
  assert.match(native,/touch-action:manipulation/);
  assert.match(native,/font-size:16px!important/);
  assert.match(native,/appStateChange[\s\S]*stabilizeNativeViewport/);
  assert.match(appCss,/body\.premiumV30 button[\s\S]*touch-action:manipulation/);
});

test('production and offline loaders invalidate the repaired schedule assets',()=>{
  for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html','work-gym-planner/shell.html','work-gym-planner/sw.js','work-gym-planner-v16/sw.js','work-gym-planner-v16/pwa-patch.js']){
    assert.match(read(file),/30\.1\.31-profile77-schedule84/,file);
  }
});
