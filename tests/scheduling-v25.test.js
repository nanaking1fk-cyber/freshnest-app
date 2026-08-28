const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const scheduling=require('../shared/v25-scheduling');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('utility planner understands the full mixed-life example and proposes free times',()=>{
  const now=new Date(2026,7,26,9);
  const raw='Work Monday–Thursday 7 AM–7 PM. Dentist Tuesday at 2. Buy groceries before Friday. Gym three times this week.';
  const parsed=scheduling.parseNaturalLanguage(raw,{now,sourceId:'hospital'});
  assert.equal(parsed.filter(item=>item.kind==='work').length,32);
  assert.equal(parsed.filter(item=>item.kind==='workout').length,3);
  assert.equal(parsed.find(item=>item.title==='Dentist').start,'14:00');
  assert.equal(parsed.find(item=>item.kind==='todo').title,'Buy groceries');

  const placed=scheduling.placeFlexibleEntries(parsed,[],{now});
  const workouts=placed.filter(item=>item.kind==='workout');
  assert.equal(new Set(workouts.map(item=>item.date)).size,3);
  assert.ok(workouts.every(item=>item.start&&item.end));
  assert.ok(placed.find(item=>item.kind==='todo').date<='2026-08-27');

  const conflicts=scheduling.detectConflicts(placed,[]);
  const dentist=placed.find(item=>item.title==='Dentist');
  assert.ok(conflicts[dentist.id].some(item=>item.type==='proposal-overlap'));
});

test('raw typed shifts keep each explicit date paired with its own time range',()=>{
  const now=new Date(2026,7,26,9);
  const parsed=scheduling.parseNaturalLanguage('My shifts: Mon 8/24 0700-1900, Wed 8/26 7a-7p, Fri 8/28 3p-11p.',{now,sourceId:'hospital'});
  const shifts=parsed.filter(item=>item.kind==='work');
  assert.deepEqual(shifts.map(item=>[item.date,item.start,item.end]),[
    ['2026-08-24','07:00','19:00'],
    ['2026-08-26','07:00','19:00'],
    ['2026-08-28','15:00','23:00']
  ]);
  assert.ok(shifts.every(item=>!item.needsReview));
});

test('this week and next week wording uses the named calendar week',()=>{
  const now=new Date(2026,7,26,9);
  const thisWeek=scheduling.parseNaturalLanguage('This week I work Monday, Wednesday and Friday 7am-3pm.',{now,sourceId:'hospital'});
  assert.deepEqual(thisWeek.map(item=>item.date),['2026-08-24','2026-08-26','2026-08-28']);
  const nextWeek=scheduling.parseNaturalLanguage('Next week I work Monday through Thursday 7am-7pm.',{now,sourceId:'hospital'});
  assert.deepEqual(nextWeek.map(item=>item.date),['2026-08-31','2026-09-01','2026-09-02','2026-09-03']);
});

test('weekday and numeric date disagreements require confirmation instead of silent saving',()=>{
  const now=new Date(2026,7,26,9);
  const [shift]=scheduling.parseNaturalLanguage('Work Monday 8/26 from 7am to 3pm.',{now,sourceId:'hospital'});
  assert.equal(shift.date,'2026-08-26');
  assert.equal(shift.needsReview,true);
  assert.equal(shift.confidence.label,'Low');
  assert.ok(shift.confidence.reasons.includes('weekday and calendar date disagree'));
});

test('rotation engine projects 4-on/2-off indefinitely and preserves exceptions',()=>{
  const rotation=scheduling.normalizeRotation({
    id:'rotation-a',sourceId:'hospital',name:'Clinical rotation',anchor:'2026-08-24',
    pattern:scheduling.patternFromPreset('four_two'),dayStart:'07:00',dayEnd:'19:00',
    exceptions:{'2026-08-26':{action:'skip'},'2026-08-30':{action:'replace',start:'11:00',end:'23:00'}}
  });
  const projected=scheduling.projectRotation(rotation,'2026-08-24','2027-08-31',{name:'Hospital',color:'#58a6ff'});
  assert.equal(projected.some(item=>item.date==='2026-08-26'),false);
  assert.equal(projected.find(item=>item.date==='2026-08-30').start,'11:00');
  assert.ok(projected.some(item=>item.date>'2027-08-24'));
});

test('rotating night shifts cross midnight and conflict with early appointments',()=>{
  const rotation=scheduling.normalizeRotation({id:'night',sourceId:'road',anchor:'2026-08-24',pattern:['N','O'],nightStart:'19:00',nightEnd:'07:00'});
  const shift=scheduling.rotationEventOn(rotation,'2026-08-24',{name:'Night crew',color:'#a78bfa'});
  const appointment={id:'appt',kind:'event',date:'2026-08-25',title:'Appointment',start:'06:30',end:'07:30'};
  assert.equal(shift.overnight,true);
  assert.equal(scheduling.overlap(shift,appointment),true);
});

test('multi-source weekly totals track source colors and overtime',()=>{
  const sources=[{id:'a',name:'Hospital',color:'#58a6ff',overtimeThreshold:40},{id:'b',name:'Clinic',color:'#a78bfa',overtimeThreshold:20}];
  const events=[];
  for(let day=24;day<=27;day++)events.push({id:'a-'+day,kind:'work',date:`2026-08-${day}`,title:'Hospital',start:'07:00',end:'19:00',sourceId:'a'});
  events.push({id:'b-1',kind:'work',date:'2026-08-28',title:'Clinic',start:'08:00',end:'18:00',sourceId:'b'});
  const summary=scheduling.weeklySummary(events,'2026-08-26',sources);
  assert.equal(summary.totalHours,58);
  assert.equal(summary.totals.find(item=>item.source.id==='a').overtime,8);
  assert.equal(summary.totals.find(item=>item.source.id==='b').overtime,0);
});

test('trusted review renders every item and requires explicit collision resolution',()=>{
  const ui=read('work-gym-planner-v16/schedule-platform-v25.js');
  const css=read('work-gym-planner-v16/schedule-platform-v25.css');
  assert.doesNotMatch(ui,/slice\(0,10\)|index>=10/);
  assert.match(ui,/function proposalCalendarMarkup\(\)/);
  assert.match(ui,/Calendar preview/);
  assert.match(ui,/data-proposal-check/);
  assert.match(ui,/Work source or employer/);
  assert.match(ui,/function resolveCaptureSource\(\)/);
  assert.match(css,/plannerWorkspaceV25 input:not\(\[type="checkbox"\]\).*font-size:16px!important/);
  assert.match(ui,/Keep both/);
  assert.match(ui,/Replace the existing item/);
  assert.match(ui,/Skip this suggestion/);
  assert.match(ui,/Choose Keep, Replace or Skip for every conflict/);
  assert.match(ui,/confidenceV25/);
});

test('calendar can be cleared without deleting the account or health history',()=>{
  const ui=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(ui,/id="calendarClearV25"/);
  assert.match(ui,/function clearCalendarContent\(\)/);
  assert.match(ui,/saveEvents\(\[\]\);saveRotations\(\[\]\)/);
  assert.match(ui,/saveDayItems\(\{\}\)/);
  assert.match(ui,/keeps your account, saved employer names, workout history, nutrition/);
  assert.match(ui,/id="calendarClearV25"/);
});

test('calendar connection schema is RLS-enabled and browser roles cannot read tokens',()=>{
  const migration=read('supabase/migrations/20260826120000_calendar_sync_v25.sql');
  for(const table of ['calendar_oauth_states','calendar_connections','calendar_event_links']){
    assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration,new RegExp(`revoke all on public\\.${table} from public,anon,authenticated`));
  }
  assert.match(migration,/encrypted_access_token text not null/);
  assert.match(migration,/unique \(user_id,provider,local_event_id\)/);
});

test('calendar provider tokens use authenticated encryption',()=>{
  process.env.CALENDAR_TOKEN_ENCRYPTION_KEY='test-only-calendar-key-that-is-at-least-32-characters';
  const calendar=require('../server/calendar-v25');
  const encrypted=calendar.encrypt('private-token');
  assert.notEqual(encrypted,'private-token');
  assert.equal(calendar.decrypt(encrypted),'private-token');
  assert.match(encrypted,/^v1\./);
});

test('calendar OAuth can return safely to native apps without accepting arbitrary schemes',()=>{
  const calendar=require('../server/calendar-v25');
  assert.equal(calendar.allowedReturnTo('workandworkout://calendar-connected?ignored=true'),'workandworkout://calendar-connected');
  assert.equal(calendar.allowedReturnTo('otherapp://calendar-connected'),'https://www.workandworkout.com/');
  assert.equal(calendar.allowedReturnTo('https://attacker.example/steal'),'https://www.workandworkout.com/');
});
