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

test('typed schedules use the authenticated AI reader but retain local and roster safeguards',()=>{
  const platform=read('work-gym-planner-v16/schedule-platform-v25.js');
  assert.match(platform,/async function readTypedScheduleWithAI/);
  assert.match(platform,/fetch\('\/api\/v25\/schedule'/);
  assert.match(platform,/sourceType==='text'\|\|sourceType==='roster'/);
  assert.match(platform,/sourceType==='roster'/);
  assert.match(platform,/Nothing changes until you approve it/);
  assert.match(platform,/AI schedule reading is not enabled on this deployment/);
  assert.match(platform,/function crossCheckAIProposal/);
  assert.match(platform,/AI and local date reader disagree/);
  assert.match(platform,/local draft only/);
});

test('schedule API bounds output and reserves high reasoning for paid accounts',()=>{
  const api=read('api/v25/schedule.js');
  const ai=read('server/v18-lib.js');
  assert.match(api,/maxOutputTokens:4000,reasoning/);
  assert.match(api,/user\.app_metadata\?\.plan/);
  assert.match(api,/\['paid','pro','premium'\]\.includes/);
  assert.match(api,/engine:'ai'/);
  assert.match(api,/explicit numeric or named calendar date always wins/i);
  assert.match(ai,/result\?\.status==='incomplete'/);
  assert.match(ai,/maxOutputTokens=1800,reasoning=null/);
});

test('a full month proposal fits comfortably inside the 4,000-token schedule budget',()=>{
  const month=scheduling.parseNaturalLanguage('In September 2026 I work Monday through Friday, 7am-3pm.',{
    now:new Date(2026,7,26,9),sourceId:'hospital'
  });
  const structured=JSON.stringify({items:month,assumptions:[]});
  // A conservative four-characters-per-token estimate still leaves room for
  // model formatting overhead and confidence notes.
  assert.equal(month.length,22);
  assert.ok(Math.ceil(structured.length/4)<3000,`month proposal unexpectedly large: ${structured.length} characters`);
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

test('monthly and date-range timelines populate only the named workdays',()=>{
  const now=new Date(2026,7,26,9);
  const month=scheduling.parseNaturalLanguage('In September 2026 I work Monday through Friday, 7am-3pm.',{now,sourceId:'hospital'});
  assert.equal(month.length,22);
  assert.deepEqual([month[0].date,month.at(-1).date,month[0].start,month[0].end],['2026-09-01','2026-09-30','07:00','15:00']);

  const range=scheduling.parseNaturalLanguage('August 25–September 7, 2026: I work Tuesday through Saturday, 3p-11p.',{now,sourceId:'hospital'});
  assert.equal(range.length,10);
  assert.deepEqual([range[0].date,range.at(-1).date,range[0].start,range[0].end],['2026-08-25','2026-09-05','15:00','23:00']);
});

test('timeline periods can use different schedules and alternate weekends',()=>{
  const now=new Date(2026,7,26,9);
  const parsed=scheduling.parseNaturalLanguage('August 1–15, 2026: work Monday through Friday 7am-3pm; August 16–31, 2026: work Tuesday through Saturday 3pm-11pm.',{now,sourceId:'hospital'});
  assert.deepEqual(parsed.map(item=>[item.date,item.start,item.end]),[
    ['2026-08-03','07:00','15:00'],['2026-08-04','07:00','15:00'],['2026-08-05','07:00','15:00'],['2026-08-06','07:00','15:00'],['2026-08-07','07:00','15:00'],['2026-08-10','07:00','15:00'],['2026-08-11','07:00','15:00'],['2026-08-12','07:00','15:00'],['2026-08-13','07:00','15:00'],['2026-08-14','07:00','15:00'],
    ['2026-08-18','15:00','23:00'],['2026-08-19','15:00','23:00'],['2026-08-20','15:00','23:00'],['2026-08-21','15:00','23:00'],['2026-08-22','15:00','23:00'],['2026-08-25','15:00','23:00'],['2026-08-26','15:00','23:00'],['2026-08-27','15:00','23:00'],['2026-08-28','15:00','23:00'],['2026-08-29','15:00','23:00']
  ]);
  const alternating=scheduling.parseNaturalLanguage('In October 2026 I work every other weekend 0700-1900.',{now,sourceId:'hospital'});
  assert.deepEqual(alternating.map(item=>item.date),['2026-10-03','2026-10-04','2026-10-17','2026-10-18','2026-10-31']);
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

test('weekend rotations only populate the selected weekend interval',()=>{
  const everyOther=scheduling.normalizeRotation({id:'weekend-2',sourceId:'hospital',anchor:'2026-09-05',preset:'alternating_weekends',pattern:scheduling.patternFromPreset('alternating_weekends')});
  const everyThird=scheduling.normalizeRotation({id:'weekend-3',sourceId:'hospital',anchor:'2026-09-05',preset:'third_weekend',pattern:scheduling.patternFromPreset('third_weekend')});
  assert.deepEqual(scheduling.projectRotation(everyOther,'2026-09-01','2026-10-04',{}).map(item=>item.date),[
    '2026-09-05','2026-09-06','2026-09-19','2026-09-20','2026-10-03','2026-10-04'
  ]);
  assert.deepEqual(scheduling.projectRotation(everyThird,'2026-09-01','2026-10-18',{}).map(item=>item.date),[
    '2026-09-05','2026-09-06','2026-09-26','2026-09-27','2026-10-17','2026-10-18'
  ]);
  const legacy=scheduling.normalizeRotation({id:'old-weekend',sourceId:'hospital',anchor:'2026-09-06',preset:'alternating_weekends',pattern:['D','D','D','D','D','D','D','D','D','D','O','O','O','O']});
  assert.equal(legacy.anchor,'2026-09-05');
  assert.deepEqual(scheduling.projectRotation(legacy,'2026-09-01','2026-09-20',{}).map(item=>item.date),[
    '2026-09-05','2026-09-06','2026-09-19','2026-09-20'
  ]);
});

test('a midnight-to-midnight shift remains attached to its stated calendar date',()=>{
  const times=scheduling.parseTimes('12am-12am');
  assert.deepEqual(times,{start:'00:00',end:'00:00',overnight:true,ambiguous:false});
  const entry=scheduling.parseNaturalLanguage('Work September 5, 2026 12am-12am.',{now:new Date(2026,7,30),sourceId:'hospital'})[0];
  assert.equal(entry.date,'2026-09-05');
  assert.equal(scheduling.durationHours(entry),24);
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
  assert.match(ui,/proposals\.filter\(function\(item\)\{return item\.date\}\)/,
    'dated AI items that need confirmation must remain in the calendar grid');
  assert.match(ui,/data-proposal-calendar-date/,
    'date confirmation must be editable directly on the calendar card');
  assert.match(ui,/item\.needsReview&&!item\.date/,
    'the long fallback row is reserved for entries without a usable date');
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
  assert.match(ui,/id="calendarClearManageV32"/);
  assert.match(ui,/function bindCalendarClearActions\(\)/);
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
