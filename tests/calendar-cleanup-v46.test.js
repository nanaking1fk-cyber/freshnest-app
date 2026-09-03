const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
const calendar=read('work-gym-planner-v16/calendar-premium-v42.js'),platform=read('work-gym-planner-v16/schedule-platform-v25.js'),css=read('work-gym-planner-v16/calendar-premium-v42.css');

test('single-day details never open during date multi-select, but still work normally',()=>{
 const classes=new Set(),cardClasses=new Set(['v42Expanded']);let rendered=0;
 const list=set=>({contains:key=>set.has(key),add:key=>set.add(key),remove:key=>set.delete(key)});
 const context={document:{body:{classList:list(classes)},getElementById:()=>({classList:list(cardClasses)})},queueDecorate:()=>rendered++};
 vm.createContext(context);
 vm.runInContext(calendar.match(/  function closeDaySheet\(\)\{[^\n]+/)[0]+calendar.match(/  function openDaySheet\(\)\{[\s\S]*?\n  \}/)[0],context);
 classes.add('calendarShiftPickingV35');classes.add('calendarDaySheetOpenV42');context.openDaySheet();
 assert.equal(classes.has('calendarDaySheetOpenV42'),false);assert.equal(cardClasses.has('v42Expanded'),false);assert.equal(rendered,0);
 classes.delete('calendarShiftPickingV35');context.openDaySheet();assert.equal(classes.has('calendarDaySheetOpenV42'),true);assert.equal(rendered,1);
 assert.match(calendar,/closest\('\.calDay\[data-date\]'\)\)openDaySheet\(\)/);
 assert.match(calendar,/closest\('\[data-week-date\]'\)\)openDaySheet\(\)/);
 assert.match(platform,/function beginShiftPicker\([\s\S]*?closeDaySheet\?\.\(\)/);
});

test('capture is hidden by default and each explicit input choice has its own mode',()=>{
 const elements={
  'plannerPane-add':{dataset:{}},'smartCaptureV19':{hidden:false},
  typeWorkScheduleV35:{attrs:{},setAttribute(k,v){this.attrs[k]=v}},
  uploadWorkRosterV35:{attrs:{},setAttribute(k,v){this.attrs[k]=v}}
 };
 const context={document:{getElementById:key=>elements[key]}};vm.createContext(context);
 vm.runInContext(platform.match(/  function setCaptureMode\(mode\)\{[\s\S]*?\n  \}/)[0],context);
 context.setCaptureMode();assert.equal(elements['smartCaptureV19'].hidden,true);
 context.setCaptureMode('text');assert.equal(elements['smartCaptureV19'].hidden,false);assert.equal(elements.typeWorkScheduleV35.attrs['aria-expanded'],'true');assert.equal(elements.uploadWorkRosterV35.attrs['aria-expanded'],'false');
 context.setCaptureMode('upload');assert.equal(elements.typeWorkScheduleV35.attrs['aria-expanded'],'false');assert.equal(elements.uploadWorkRosterV35.attrs['aria-expanded'],'true');
 context.setCaptureMode('review');assert.equal(elements['plannerPane-add'].dataset.captureMode,'review');assert.equal(elements['smartCaptureV19'].hidden,false);
 assert.match(platform,/name==='add'\)\{setCaptureMode\('choose'\)/);
 assert.match(platform,/typed.onclick=function\(\)\{setCaptureMode\('text'\)/);
 assert.match(platform,/upload.onclick=function\(\)\{setCaptureMode\('upload'\)/);
 assert.match(platform,/Capture.reviewRawText=[\s\S]*?setCaptureMode\('review'\)/);
 assert.match(platform,/function reviewRosterText[\s\S]*?setCaptureMode\('review'\)/);
 assert.match(platform,/function renderTrustedReview[\s\S]*?setCaptureMode\('review'\)/);
});

test('cleanup rules are premium-calendar scoped and prevent both sheet and backdrop overlap',()=>{
 const rules=css.split('/* v46:')[1];assert.ok(rules);
 assert.match(rules,/body\.premiumV30\.calendarShiftPickingV35 #page-calendar #dayCard\{display:none!important\}/);
 assert.match(rules,/calendarShiftPickingV35\.calendarDaySheetOpenV42::before\{display:none\}/);
 assert.match(rules,/#plannerPane-add\[data-capture-mode="choose"\] #smartCaptureV19\{display:none!important\}/);
 for(const selector of rules.slice(rules.indexOf('*/')+2).split(/\{[^}]*\}/).filter(x=>x.trim()).flatMap(x=>x.trim().split(',\n')))assert.ok(selector.startsWith('body.premiumV30'),selector);
});

test('production and offline loaders refresh the cleaned-up calendar',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html','work-gym-planner/shell.html','work-gym-planner/sw.js','work-gym-planner-v16/sw.js','work-gym-planner-v16/pwa-patch.js'])assert.match(read(file),/30\.1\.31-crash53/);
});
