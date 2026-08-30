import {test,expect} from '@playwright/test';

test('production shell, security headers, and public configuration load',async({page,request})=>{
  const response=await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
  expect(response?.ok()).toBeTruthy();
  const csp=response?.headers()['content-security-policy']||'';
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  await expect(page.getByRole('button',{name:'Sign in'}).first()).toBeVisible({timeout:30_000});
  const config=await request.get('/api/v18/config');
  expect(config.ok()).toBeTruthy();
  const body=await config.json();
  expect(body).toMatchObject({ok:true,cloudConfigured:true});
  expect(body.supabaseUrl).toMatch(/^https:\/\//);
  expect(body.supabaseAnonKey).toBeTruthy();
});
