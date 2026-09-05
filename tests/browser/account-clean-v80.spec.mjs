import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');

const user={id:'returning-user',email:'returning@example.test',user_metadata:{display_name:'Maya'}};
const receipt={action:'granted',consentVersion:'2026-08-31-v1',policyVersion:'1.7',purposes:['account_cloud_sync'],agreement:{termsVersion:'1.2',privacyVersion:'1.7',acceptedAt:'2026-09-04T15:00:00Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'}};
const phoneProfile={id:user.id,name:'Phone plan',fixed:{enabled:false},variable:{enabled:false}};
const cloudProfile={id:user.id,name:'Saved plan',fixed:{enabled:false},variable:{enabled:false}};

for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:820}])test(`a different saved copy does not interrupt sign-in and Account stays compact on ${viewport.name}`,async({page})=>{
 await page.setViewportSize({width:viewport.width,height:viewport.height});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({user,phoneProfile})=>{
  localStorage.setItem('wgc-v18-local-owner',user.id);
  localStorage.setItem('wgp-v15-profile',JSON.stringify(phoneProfile));
 },{user,phoneProfile});
 await page.route('**/api/v18/config',route=>{
  const origin=new URL(route.request().url()).origin;
  return route.fulfill({json:{cloudConfigured:true,aiConfigured:false,apiVersion:18,supabaseUrl:origin,supabaseAnonKey:'test-publishable-key'}});
 });
 await page.route('**/auth/v1/token?grant_type=password',route=>route.fulfill({json:{access_token:'returning-token',refresh_token:'returning-refresh',expires_at:4102444800,user}}));
 await page.route('**/api/v18/health-consent**',route=>route.fulfill({json:{ok:true,receipt}}));
 await page.route('**/api/v18/state',route=>route.fulfill({json:{ok:true,state:{schemaVersion:23,storage:{'wgp-v15-profile':JSON.stringify(cloudProfile)}},updatedAt:'2026-09-04T18:00:00.000Z'}}));
 await page.route('**/_vercel/**',route=>route.fulfill({body:''}));

 await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
 await page.locator('.ww29SignIn').first().click();
 await page.locator('#loginEmail').fill(user.email);
 await page.locator('#loginPassword').fill('Valid-Test-Password-123!');
 await page.locator('#loginBtn').click();

 await expect(page.locator('#accountDialog')).not.toHaveClass(/open/);
 await expect(page.locator('#page-home')).toHaveClass(/active/);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wgp-v15-profile')).name)).toBe('Phone plan');

 await page.evaluate(()=>window.WGC18.openAccount('signin'));
 await expect(page.getByRole('heading',{name:'Account',exact:true})).toBeVisible();
 await expect(page.locator('#reviewAccountSync')).toBeVisible();
 expect(await page.locator('#accountDataSection').evaluate(section=>section.open)).toBe(false);
 await expect(page.locator('#loadSavedAccount')).not.toBeVisible();
 if(process.env.E2E_CAPTURE_ACCOUNT==='1')await page.screenshot({path:`/private/tmp/ww-account-v80-${viewport.name}.png`,fullPage:true});
 await page.locator('#reviewAccountSync').click();
 expect(await page.locator('#accountDataSection').evaluate(section=>section.open)).toBe(true);
 await expect(page.getByRole('button',{name:'Use my saved plan'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Keep this phone’s plan for now'})).toBeVisible();
 await expect(page.locator('#syncAccount')).toHaveCount(0);
 expect(errors).toEqual([]);
});
