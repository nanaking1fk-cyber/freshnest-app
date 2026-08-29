const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const roster=require('../shared/v31-roster');
const scheduling=require('../shared/v25-scheduling');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('a multi-person table imports only the signed-in user row',()=>{
  const text=`Weekly roster · August 2026
Name | Mon 8/24 | Tue 8/25 | Wed 8/26 | Thu 8/27 | Fri 8/28 | Sat 8/29 | Sun 8/30
Jordan Mensah | 7a-3p | 7a-3p | OFF | OFF | 7a-3p | OFF | OFF
Francis Kwarteng | 7a-7p | 7a-7p | 7a-7p | 7a-7p | OFF | OFF | OFF
Alex Rivera | OFF | 3p-11p | 3p-11p | 3p-11p | OFF | OFF | OFF`;
  const result=roster.analyze(text,{identity:'Francis Kwarteng',now:new Date(2026,7,20)});
  assert.equal(result.status,'matched');
  assert.equal(result.shifts.length,4);
  assert.deepEqual(result.shifts.map(item=>item.date),['2026-08-24','2026-08-25','2026-08-26','2026-08-27']);
  assert.ok(result.shifts.every(item=>item.start==='07:00'&&item.end==='19:00'));
  assert.doesNotMatch(result.normalizedText,/Jordan|Alex/);
  assert.equal(result.ignoredOtherRows,true);
});

test('a section roster matches a saved employee alias and keeps other sections out',()=>{
  const text=`EMPLOYEE: A. Rivera
08/24/2026 07:00-15:00
08/25/2026 07:00-15:00

EMPLOYEE: FK-1042
08/24/2026 19:00-07:00
08/25/2026 19:00-07:00
08/26/2026 OFF
08/27/2026 19:00-07:00

EMPLOYEE: J. Mensah
08/24/2026 09:00-17:00`;
  const result=roster.analyze(text,{identity:'Francis Kwarteng',aliases:['FK-1042'],now:new Date(2026,7,20)});
  assert.equal(result.status,'matched');
  assert.equal(result.identity.requested,'FK-1042');
  assert.equal(result.shifts.length,3);
  assert.ok(result.shifts.every(item=>item.overnight));
  assert.doesNotMatch(result.normalizedText,/Rivera|Mensah/);
});

test('the parser refuses to guess when the roster identity is not found',()=>{
  const result=roster.analyze('Jordan Mensah | 8/24 | 7a-3p',{identity:'Francis Kwarteng',now:new Date(2026,7,20)});
  assert.equal(result.status,'identity_not_found');
  assert.deepEqual(result.shifts,[]);
});

test('a name-only OCR row maps following shift cells to the dates above it',()=>{
  const text=`Weekly roster · September 2026
Mon 9/1
Tue 9/2
Wed 9/3
Francis Kwarteng
7:00 AM - 7:00 PM
OFF
7:00 AM - 7:00 PM
Jordan Mensah
3:00 PM - 11:00 PM
3:00 PM - 11:00 PM
OFF`;
  const result=roster.analyze(text,{identity:'Francis Kwarteng',now:new Date(2026,7,28)});
  assert.equal(result.status,'matched');
  assert.deepEqual(result.shifts.map(item=>[item.date,item.start,item.end]),[
    ['2026-09-01','07:00','19:00'],
    ['2026-09-03','07:00','19:00']
  ]);
  assert.doesNotMatch(result.normalizedText,/Jordan|15:00|23:00/);
});

test('repeated work sequences become an optional indefinite rotation',()=>{
  const shifts=[];
  for(let day=1;day<=12;day++)if((day-1)%6<4)shifts.push({date:`2026-09-${String(day).padStart(2,'0')}`,start:'07:00',end:'19:00',overnight:false});
  const rotation=roster.inferRotation(shifts,{start:'2026-09-01',end:'2026-09-12'});
  assert.equal(rotation.label,'4 on / 2 off');
  assert.deepEqual(rotation.pattern,['D','D','D','D','O','O']);
  assert.equal(rotation.anchor,'2026-09-01');
});

test('matched roster output enters the trusted proposal parser as dated work only',()=>{
  const text=`8/24/2026 8/25/2026 8/26/2026
Taylor Smith 09:00-17:00 OFF 09:00-17:00
Francis Kwarteng 07:00-19:00 07:00-19:00 OFF
Jordan Mensah OFF 15:00-23:00 15:00-23:00`;
  const result=roster.analyze(text,{identity:'Francis Kwarteng',now:new Date(2026,7,20),title:'Hospital shift'});
  const proposals=scheduling.parseNaturalLanguage(result.normalizedText,{sourceId:'hospital',sourceType:'roster'});
  assert.equal(proposals.length,2);
  assert.deepEqual(proposals.map(item=>[item.date,item.start,item.end]),[['2026-08-24','07:00','19:00'],['2026-08-25','07:00','19:00']]);
  assert.ok(proposals.every(item=>item.kind==='work'&&item.sourceId==='hospital'));
  assert.doesNotMatch(result.normalizedText,/Taylor|Jordan/);
});

test('scanned PDFs use local OCR and uncertain identities stop before proposals',()=>{
  const adaptive=read('work-gym-planner-v16/adaptive-planner-v24.js');
  const platform=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(adaptive,/Scanning image-only PDF page/);
  assert.match(adaptive,/Tesseract\.recognize\(canvas/);
  assert.match(adaptive,/prepareImage\(file\)/);
  assert.match(adaptive,/id="rosterIdentityV31"/);
  assert.match(adaptive,/reviewRosterText/);
  assert.doesNotMatch(adaptive,/input\.value=text;input\.dataset\.sourceType='ocr'/);
  assert.match(platform,/Which row belongs to you\?/);
  assert.match(platform,/window\.WGC19=window\.WGC19\|\|\{\}/);
  assert.match(platform,/Other employees’ rows are not added/);
  assert.match(platform,/Use AI accuracy check/);
  assert.match(platform,/never the full image\/PDF or coworkers/);
  assert.match(platform,/sourceType:sourceType\|\|'text'/);
  assert.match(platform,/Continue the detected pattern/);
  assert.match(platform,/Work rotation added to your calendar/);
  assert.match(read('work-gym-planner-v16/schedule.js'),/langPath:'\/work-gym-planner-v16\/vendor\/tessdata'/);
  assert.ok(fs.statSync(path.join(root,'work-gym-planner-v16/vendor/tessdata/eng.traineddata.gz')).size>10_000_000);
  assert.ok(fs.statSync(path.join(root,'work-gym-planner-v16/vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js')).size>3_000_000);
});

test('production loads the identity-aware roster engine before calendar intake',()=>{
  const shell=read('work-gym-planner/index.html');
  const worker=read('work-gym-planner/sw.js');
  assert.match(shell,/shared\/v31-roster\.js/);
  assert.match(worker,/shared\/v31-roster\.js/);
  assert.ok(shell.indexOf('v31-roster.js')<shell.indexOf("'adaptive-planner-v24.js'"));
});
