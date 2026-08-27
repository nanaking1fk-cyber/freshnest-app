const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('calendar uses adaptive user-neutral labels',()=>{
  const calendar=read('work-gym-planner-v16/calendar.js');
  const today=read('work-gym-planner-v16/today.js');
  assert.match(calendar,/Plans &amp; to-do/);
  assert.match(calendar,/Import a schedule/);
  assert.doesNotMatch(calendar,/Fixed-job off weekend/);
  assert.doesNotMatch(calendar,/Both jobs/);
  assert.doesNotMatch(today,/Off Both|Both Jobs|Single-Job Day/);
});

test('adaptive planner accepts text, voice, image and PDF with review before save',()=>{
  const planner=read('work-gym-planner-v16/adaptive-planner-v24.js');
  assert.match(planner,/accept="image\/\*,application\/pdf,\.pdf"/);
  assert.match(planner,/loadTesseract/);
  assert.match(planner,/vendor\/pdfjs\/pdf\.min\.mjs/);
  assert.match(planner,/reviewRawText/);
  assert.match(planner,/Nothing is added until you review and approve it/);
});

test('v25 scheduling assets are loaded and cached by the production wrapper',()=>{
  const index=read('work-gym-planner/index.html');
  const worker=read('work-gym-planner/sw.js');
  assert.match(index,/adaptive-planner-v24\.css/);
  assert.match(index,/adaptive-planner-v24\.js/);
  assert.match(index,/schedule-platform-v25\.css/);
  assert.match(index,/schedule-platform-v25\.js/);
  assert.match(index,/v25-scheduling\.js/);
  // Version-derived rather than pinned: a partial bump used to pass here.
  const manifest=JSON.parse(read('work-gym-planner/manifest.webmanifest'));
  const version=(manifest.start_url.match(/\?v=([\d.]+)/)||[])[1];
  assert.ok(version,'the manifest must carry a version in start_url');
  assert.ok(index.includes(`Loading Work + Workout ${version}`),
    `the shell boot message must state version ${version}`);
  assert.ok(worker.includes(`wgp-stable-v${version}`),
    `the service-worker cache key must state version ${version}`);
  const stray=(index.match(/\?v=[\d.]+/g)||[]).filter(q=>q!==`?v=${version}`);
  assert.deepEqual(stray,[],'every cache-busting query in the shell must use the same version');
  assert.match(worker,/adaptive-planner-v24\.js/);
  assert.match(worker,/vendor\/tesseract\/worker\.min\.js/);
});
