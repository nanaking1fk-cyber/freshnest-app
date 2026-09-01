const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('release metadata, CI and dependency auditing target the current canonical package',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'30.1.26');
  assert.match(read('README.md'),/Current release — v30\.1\.26/);
  assert.match(read('TAKEOVER.md'),/Version 30\.1\.26 is live/);
  assert.match(pkg.scripts.ci,/audit:dependencies/);
  assert.match(pkg.scripts.ci,/native:verify/);
  assert.ok(fs.existsSync(path.join(root,'app-store/package-lock.json')));
  const workflow=read('.github/workflows/quality.yml');
  assert.match(workflow,/npm ci --prefix app-store/);
  assert.match(workflow,/npm run audit:dependencies/);
  assert.match(workflow,/npm run native:verify/);
});

test('calendar API avoids the legacy Vercel query parser',()=>{
  const api=read('api/v25/calendar.js');
  assert.match(api,/new URL\(String\(req\.url/);
  assert.match(api,/\.searchParams/);
  assert.doesNotMatch(api,/\breq\.query\b|\burl\.parse\s*\(/);
});

test('release audit enforces Supabase RLS and explicit table access',()=>{
  const audit=read('scripts/audit-release.mjs');
  assert.match(audit,/must enable RLS/);
  assert.match(audit,/must declare explicit Data API grants or revokes/);
  assert.match(read('docs/release-process.md'),/Every migration that creates a table in an exposed schema/);
});
