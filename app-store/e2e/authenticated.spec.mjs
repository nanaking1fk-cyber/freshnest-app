import {test,expect} from '@playwright/test';

const required=['E2E_USER_A_EMAIL','E2E_USER_A_PASSWORD','E2E_USER_B_EMAIL','E2E_USER_B_PASSWORD'];
const missing=required.filter(key=>!process.env[key]);
test.skip(missing.length>0,`Dedicated E2E accounts are not configured: ${missing.join(', ')}`);

async function config(request){
  const response=await request.get('/api/v18/config');
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function signIn(request,cloud,email,password){
  const response=await request.post(`${cloud.supabaseUrl}/auth/v1/token?grant_type=password`,{
    headers:{apikey:cloud.supabaseAnonKey,'Content-Type':'application/json'},
    data:{email,password}
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function state(request,token){
  const response=await request.get('/api/v18/state',{headers:{Authorization:`Bearer ${token}`}});
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function putState(request,token,value){
  const response=await request.put('/api/v18/state',{headers:{Authorization:`Bearer ${token}`},data:{state:value}});
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test('dedicated accounts remain isolated and restore across sessions',async({request,browser})=>{
  // The signed-in journey does a cold production load plus Supabase auth.
  // Playwright leaves actions and navigations unbounded, so the 60s default
  // budget is the only ceiling and a slow cold load consumes all of it.
  test.setTimeout(120_000);
  const cloud=await config(request);
  const a=await signIn(request,cloud,process.env.E2E_USER_A_EMAIL,process.env.E2E_USER_A_PASSWORD);
  const b=await signIn(request,cloud,process.env.E2E_USER_B_EMAIL,process.env.E2E_USER_B_PASSWORD);
  const beforeA=await state(request,a.access_token);
  const beforeB=await state(request,b.access_token);
  const markerA=`account-a-${Date.now()}`;
  const markerB=`account-b-${Date.now()}`;
  try{
    await putState(request,a.access_token,{appVersion:'30.1.30',storage:{'wgp-v15-e2e-marker':JSON.stringify(markerA)}});
    await putState(request,b.access_token,{appVersion:'30.1.30',storage:{'wgp-v15-e2e-marker':JSON.stringify(markerB)}});
    const readA=await state(request,a.access_token);
    const readB=await state(request,b.access_token);
    expect(readA.state.storage['wgp-v15-e2e-marker']).toBe(JSON.stringify(markerA));
    expect(readB.state.storage['wgp-v15-e2e-marker']).toBe(JSON.stringify(markerB));
    expect(readA.state.storage['wgp-v15-e2e-marker']).not.toBe(readB.state.storage['wgp-v15-e2e-marker']);

    const context=await browser.newContext();
    const page=await context.newPage();
    // Match the public spec: the landing page carries video that 'load' waits on.
    await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Sign in'}).first().click();
    await page.locator('#loginEmail').fill(process.env.E2E_USER_A_EMAIL);
    await page.locator('#loginPassword').fill(process.env.E2E_USER_A_PASSWORD);
    await page.locator('#loginBtn').click();
    await expect(page.locator('#accountChip')).toHaveClass(/signed/);
    // Writing the marker above replaced the account state, so this account now
    // looks brand new and the app opens its six-question setup wizard. That
    // wizard is modal: it makes the rest of the page inert, so nothing on the
    // dashboard can be clicked until it is dismissed.
    const setupWizard=page.locator('#guidedClose');
    await setupWizard.waitFor({state:'visible'});
    await setupWizard.click();
    await expect(page.locator('#guidedOnboarding')).not.toHaveClass(/open/);
    // #accountChip is a legacy control: premium-v18.css hides it outright with
    // `body.premiumV18 .accountChip{display:none!important}`, so it can be
    // asserted on but never clicked. The live entry point is the dashboard
    // avatar, which opens the same account dialog.
    await page.locator('#pausedAccountBtn').click();
    await expect(page.locator('#signOutAccount')).toBeVisible();
    await page.locator('#signOutAccount').click();
    await expect(page.locator('#accountChip')).not.toHaveClass(/signed/);
    await context.close();
  }finally{
    // The browser journey signs account A out globally. Supabase invalidates
    // the password-grant session created above as part of that sign-out, so
    // cleanup must authenticate again instead of reusing a revoked token.
    const restoreA=await signIn(request,cloud,process.env.E2E_USER_A_EMAIL,process.env.E2E_USER_A_PASSWORD);
    const restoreB=await signIn(request,cloud,process.env.E2E_USER_B_EMAIL,process.env.E2E_USER_B_PASSWORD);
    await putState(request,restoreA.access_token,beforeA.state||{appVersion:'30.1.30',storage:{}});
    await putState(request,restoreB.access_token,beforeB.state||{appVersion:'30.1.30',storage:{}});
  }
});

test('authenticated schedule interpretation and provider status are reachable',async({request})=>{
  const cloud=await config(request);
  const session=await signIn(request,cloud,process.env.E2E_USER_A_EMAIL,process.env.E2E_USER_A_PASSWORD);
  const headers={Authorization:`Bearer ${session.access_token}`};
  const schedule=await request.post('/api/v25/schedule',{headers,data:{text:'Work Monday through Thursday 7 AM to 7 PM for September 2026.',referenceDate:'2026-08-30',timeZone:'America/New_York',sourceType:'text'}});
  expect(schedule.ok()).toBeTruthy();
  const proposal=await schedule.json();
  expect(proposal.engine).toBe('ai');
  expect(proposal.items.length).toBeGreaterThan(0);
  expect(proposal.items.every(item=>/^2026-09-/.test(item.date))).toBeTruthy();
  const provider=await request.get('/api/v25/calendar?action=status',{headers});
  expect(provider.ok()).toBeTruthy();
  expect(await provider.json()).toMatchObject({ok:true});
});
