const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('production routes use an external-script shell under strict script CSP',()=>{
  const config=JSON.parse(read('vercel.json'));
  const rootRewrite=config.rewrites.find(rule=>rule.source==='/');
  const appRedirect=config.redirects.find(rule=>rule.source==='/work-gym-planner/');
  assert.equal(rootRewrite.destination,'/work-gym-planner/shell.html');
  assert.equal(appRedirect.destination,'/work-gym-planner/shell.html');
  const csp=config.headers.find(rule=>rule.source==='/').headers.find(header=>header.key==='Content-Security-Policy').value;
  assert.match(csp,/script-src 'self'/);
  assert.doesNotMatch(csp,/script-src[^;]*'unsafe-inline'/);
  const shell=read('work-gym-planner/shell.html');
  assert.doesNotMatch(shell,/<script(?![^>]+src=)[^>]*>/i);
  assert.doesNotMatch(shell,/<style\b/i);
  assert.match(shell,/shared\/observability\.js/);
  assert.match(shell,/\/_vercel\/speed-insights\/script\.js/);
});

test('client diagnostics capture actionable failures without planner or account state',()=>{
  const source=read('shared/observability.js');
  assert.match(source,/client-error/);
  assert.match(source,/release:RELEASE/);
  assert.match(source,/api\/v18\/client-error/);
  assert.match(source,/resource_error/);
  assert.match(source,/unhandledrejection/);
  assert.match(source,/response\.status>=500/);
  for(const forbidden of ['localStorage','sessionStorage','document.cookie','userId','plannerState','diary'])assert.doesNotMatch(source,new RegExp(forbidden,'i'));
  const endpoint=read('api/v18/client-error.js');
  assert.match(endpoint,/record_app_error/);
  assert.match(endpoint,/Trusted app request required/);
  assert.match(endpoint,/createHmac\('sha256'/);
  assert.doesNotMatch(endpoint,/authorization.*report_|report_.*authorization/i);
});

test('dedicated authenticated E2E is scheduled but cannot run without explicit secrets',()=>{
  const workflow=read('.github/workflows/quality.yml');
  const spec=read('app-store/e2e/authenticated.spec.mjs');
  const appPackage=JSON.parse(read('app-store/package.json'));
  const appConfig=read('app-store/playwright.config.mjs');
  assert.match(workflow,/vars\.E2E_ENABLED == 'true'/);
  assert.match(workflow,/E2E_USER_A_EMAIL/);
  assert.equal(appPackage.scripts['test:e2e'],'playwright test --config ./playwright.config.mjs');
  assert.match(appConfig,/from '@playwright\/test'/);
  assert.match(appConfig,/testDir:'\.\/e2e'/);
  assert.match(spec,/remain isolated/);
  assert.match(spec,/finally\s*\{/);
  assert.match(spec,/signOutAccount/);
});

test('calendar reconciliation is additive and preserves existing live rows',()=>{
  const sql=read('supabase/migrations/20260830170000_calendar_sync_v25_reconcile.sql');
  assert.match(sql,/if not exists[\s\S]+calendar_connections_touch/i);
  assert.doesNotMatch(sql,/drop\s+(table|trigger)/i);
  assert.match(sql,/revoke all[\s\S]+anon,authenticated/i);
});
