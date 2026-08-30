import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',
  fullyParallel:false,
  forbidOnly:!!process.env.CI,
  retries:process.env.CI?1:0,
  reporter:process.env.CI?'github':'list',
  timeout:60_000,
  expect:{timeout:12_000},
  use:{
    baseURL:process.env.E2E_BASE_URL||'https://www.workandworkout.com',
    // Without these, actions and navigations are unbounded and a stuck step
    // silently consumes the whole test budget, reporting only a timeout with
    // no indication of which line hung.
    actionTimeout:20_000,
    navigationTimeout:45_000,
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure'
  },
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}]
});
