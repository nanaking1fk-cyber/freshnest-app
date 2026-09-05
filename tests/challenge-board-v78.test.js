const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const migration=read('supabase/migrations/20260904235740_challenge_boards_v78.sql');
const first='00000000-0000-4000-8000-000000000781';
const second='00000000-0000-4000-8000-000000000782';
const third='00000000-0000-4000-8000-000000000783';
const day=new Date().toISOString().slice(0,10);
let db,challengeId;

test.before(async()=>{
 db=new PGlite();
 await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(migration);
});
test.after(async()=>db?.close());
test.beforeEach(async()=>{
 await db.exec('delete from auth.users;');
 await db.query('insert into auth.users values ($1),($2),($3)',[first,second,third]);
 challengeId=(await db.query("select public.create_challenge_v78($1,'12,000 steps','steps','steps',12000,'daily',$2,$2,'ABCD2345','Maya') as id",[first,day])).rows[0].id;
});

test('migration creates least-privilege challenge tables and server-only RPCs',()=>{
 for(const table of ['challenge_boards_v78','challenge_members_v78','challenge_scores_v78']){
  assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(migration,new RegExp(`revoke all on public\\.${table} from public,anon,authenticated`));
  assert.match(migration,new RegExp(`server_only_no_direct_client_access on public\\.${table}`));
 }
 assert.match(migration,/security invoker/g);
 assert.doesNotMatch(migration,/security definer/i);
 assert.match(migration,/references auth\.users\(id\) on delete cascade/);
 assert.match(migration,/sharing_consent_version text not null/);
 assert.match(migration,/foreign key \(challenge_id,user_id\)[\s\S]*on delete cascade/);
 assert.match(migration,/>= 100/);
});

test('invited coworkers see ranked aggregate scores but no account identifiers',async()=>{
 const joined=(await db.query("select public.join_challenge_v78($1,'ABCD2345','Jordan') as id",[second])).rows[0].id;
 assert.equal(joined,challengeId);
 await db.query("select public.record_challenge_score_v78($1,$2,$3,12500,'steps')",[first,challengeId,day]);
 await db.query("select public.record_challenge_score_v78($1,$2,$3,9800,'steps')",[second,challengeId,day]);
 const board=(await db.query('select public.challenge_boards_for_user_v78($1,$2) as value',[second,day])).rows[0].value[0];
 assert.equal(board.title,'12,000 steps');assert.equal(board.members.length,2);
 assert.deepEqual(board.members.map(member=>[member.displayName,member.rank]),[['Maya',1],['Jordan',2]]);
 assert.equal(board.members.find(member=>member.isYou).todayValue,9800);
 const publicShape=JSON.stringify(board);
 for(const secret of [first,second,'userId','user_id','email'])assert.ok(!publicShape.includes(secret),secret);
});

test('score source, membership, dates, board size and owner controls are enforced in the database',async()=>{
 await assert.rejects(db.query("select public.record_challenge_score_v78($1,$2,$3,2,'manual')",[first,challengeId,day]),/source does not match/i);
 await assert.rejects(db.query("select public.record_challenge_score_v78($1,$2,$3,2,'steps')",[second,challengeId,day]),/Join this challenge first/i);
 await assert.rejects(db.query('select public.leave_challenge_v78($1,$2)',[first,challengeId]),/owner must end/i);
 await assert.rejects(db.query('select public.archive_challenge_v78($1,$2)',[second,challengeId]),/Only the challenge owner/i);
 await db.query("select public.join_challenge_v78($1,'ABCD2345','Jordan')",[second]);
 await db.query("select public.record_challenge_score_v78($1,$2,$3,12000,'steps')",[second,challengeId,day]);
 await db.query('select public.leave_challenge_v78($1,$2)',[second,challengeId]);
 assert.equal((await db.query('select count(*)::int as n from public.challenge_members_v78 where user_id=$1',[second])).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int as n from public.challenge_scores_v78 where user_id=$1',[second])).rows[0].n,0);
});

test('account deletion cascades challenge membership and an owned board',async()=>{
 await db.query("select public.join_challenge_v78($1,'ABCD2345','Jordan')",[second]);
 await db.query("select public.record_challenge_score_v78($1,$2,$3,100,'steps')",[second,challengeId,day]);
 await db.query('delete from auth.users where id=$1',[second]);
 assert.equal((await db.query('select count(*)::int as n from public.challenge_members_v78 where user_id=$1',[second])).rows[0].n,0);
 await db.query('delete from auth.users where id=$1',[first]);
 assert.equal((await db.query('select count(*)::int as n from public.challenge_boards_v78')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int as n from public.challenge_scores_v78')).rows[0].n,0);
});

test('ordinary browser roles cannot read tables or execute challenge RPCs',async()=>{
 await db.exec('set role authenticated');
 try{
  await assert.rejects(db.query('select * from public.challenge_members_v78'),/permission denied/);
  await assert.rejects(db.query('select public.challenge_boards_for_user_v78($1,$2)',[first,day]),/permission denied/);
 }finally{await db.exec('reset role')}
});

test('API validates a small signed-in action surface and never accepts identity fields',()=>{
 const api=read('api/v18/challenges.js');
 const checks=require('../api/v18/challenges')._test;
 assert.equal(checks.cleanCode('ab-cd 2345'),'ABCD2345');
 assert.equal(checks.expectedSource('steps'),'steps');assert.equal(checks.expectedSource('calories_burned'),'calories');
 assert.equal(checks.unitFor('workouts','ignored'),'workouts');assert.equal(checks.daysBetween('2026-09-01','2026-09-15'),14);
 assert.equal(checks.validUuid(challengeId),true);assert.equal(checks.validUuid('00000000-0000-4000-8000-000000000781-extra'),false);
 assert.equal(checks.exactKeys({action:'join',email:'x'},['action']),false);
 assert.match(api,/await lib\.verifyUser\(req\)/);
 assert.match(api,/sharingConfirmed!==true/);
 assert.match(api,/userBudget/);assert.match(api,/content-length/);
 for(const action of ['create','join','score','leave','archive'])assert.ok(api.includes("action==='"+action+"'"),action);
 for(const forbidden of ['req.body.userId','req.body.email','req.body.ownerId'])assert.ok(!api.includes(forbidden));
});

test('client supports four challenge types, automatic daily totals, manual scores and private sharing',()=>{
 const client=read('work-gym-planner-v16/challenges-v78.js');
 for(const value of ['steps','workouts','calories_burned','custom'])assert.match(client,new RegExp(value));
 assert.match(client,/workouts:\{[^\n]+suggested:1[^\n]+cadence:'daily'/);assert.match(client,/calories_burned:\{[^\n]+cadence:'total'/);
 assert.match(client,/healthDay\(today\(\)\)/);assert.match(client,/workoutHistory\(\)/);
 assert.match(client,/session\?\.completed&&session\.date===today\(\)/);
 assert.match(client,/Join &amp; share my score/);assert.match(client,/navigator\.share/);assert.match(client,/navigator\.clipboard/);
 assert.match(client,/setInterval\([\s\S]*30000/);assert.match(client,/document\.visibilityState/);
 assert.match(client,/data-challenge-leave/);assert.match(client,/data-challenge-archive/);
 assert.match(client,/Connect .*? &amp; sync/);assert.match(client,/Enter today’s steps/);assert.match(client,/Enter steps manually/);assert.match(client,/source:board\.metric==='steps'\?'steps'/);
 assert.match(client,/Today’s challenge score is already current/);assert.match(client,/force:true/);
 assert.match(client,/today · .* days completed/);
 assert.match(client,/URLSearchParams\(location\.search\)\.get\('challenge'\)/);assert.match(client,/searchParams\.delete\('challenge'\)/);
 assert.doesNotMatch(client,/localStorage\.(?:setItem|removeItem)/);
 for(const phrase of ['email address, account ID, meals','health records','aggregate challenge number'])assert.ok(read('work-gym-planner/privacy.html').includes(phrase));
 assert.match(read('work-gym-planner/terms.html'),/workplace surveillance, employment evaluation, gambling/);
});

test('challenge design is premium scoped, viewport safe and included in every production bundle',()=>{
 const css=read('work-gym-planner-v16/challenges-v78.css');
 const rules=css.split('\n').map(line=>line.trim()).filter(line=>line.includes('{')&&!line.startsWith('@'));
 assert.ok(rules.length>45);
 for(const line of rules){
  const selectors=line.split('{')[0].split(',').map(value=>value.trim());
  for(const selector of selectors)assert.match(selector,/^body\.premiumV30(?: #challengeDialogV78| #page-more|\.challengeOpenV78)/,selector);
 }
 assert.match(css,/height:100dvh;max-height:100dvh/);assert.match(css,/\.challengeBackdropV78\{display:none\}/);assert.match(css,/padding:max\(15px,env\(safe-area-inset-top\)\)/);assert.match(css,/@media\(max-width:430px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html','work-gym-planner/sw.js','work-gym-planner-v16/sw.js']){
  const source=read(file);assert.ok(source.includes('challenges-v78.js'),file);assert.ok(source.includes('challenges-v78.css'),file);
 }
 const build=read('app-store/scripts/build-web.mjs');assert.match(build,/challenges-v78\.js/);assert.match(build,/challenges-v78\.css/);
 assert.match(read('work-gym-planner-v16/app-v30.js'),/matches:\['challenges'/);
});
