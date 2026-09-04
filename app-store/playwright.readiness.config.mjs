import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',
 testMatch:['ai-billing-v56.spec.mjs','native-auth-v55.spec.mjs','request-reliability-v53.spec.mjs'],
 workers:1,forbidOnly:!!process.env.CI,retries:0,timeout:60000,
 expect:{timeout:12000},reporter:process.env.CI?'github':'list',
 // Each test fixture starts its own isolated server and uses synthetic data.
 use:{browserName:process.env.E2E_BROWSER||'chromium',actionTimeout:20000,navigationTimeout:45000,trace:'retain-on-failure',screenshot:'only-on-failure',serviceWorkers:'block'}
});
