import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {defineConfig}=require('@playwright/test');
export default defineConfig({
 testDir:'.',testMatch:'*.spec.mjs',timeout:45000,expect:{timeout:15000},
 reporter:'list',workers:1,
 outputDir:process.env.E2E_OUTPUT||'/private/tmp/ww-home63-browser',
 // Keep the offline worker from bypassing mocked APIs, especially in WebKit.
 // Offline navigation and callback safety have their own service-worker tests.
 use:{baseURL:process.env.E2E_BASE_URL||'http://127.0.0.1:4183',browserName:process.env.E2E_BROWSER||'chromium',serviceWorkers:'block',actionTimeout:15000,navigationTimeout:30000,trace:'retain-on-failure',screenshot:'only-on-failure'}
});
