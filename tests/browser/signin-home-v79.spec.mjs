import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');

const user={id:'returning-user',email:'returning@example.test',user_metadata:{display_name:'Maya'}};
const receipt={action:'granted',consentVersion:'2026-08-31-v1',policyVersion:'1.7',purposes:['account_cloud_sync'],agreement:{termsVersion:'1.2',privacyVersion:'1.7',acceptedAt:'2026-09-04T15:00:00Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'}};
const savedProfile={id:user.id,name:'Maya',fixed:{enabled:false},variable:{enabled:false}};

for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:820}])test(`returning user goes from sign-in to Home without showing the profile menu on ${viewport.name}`,async({page})=>{
 await page.setViewportSize({width:viewport.width,height:viewport.height});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.__signedProfileShownDuringLogin=false;
  document.addEventListener('DOMContentLoaded',()=>{
   new MutationObserver(()=>{
    if(document.querySelector('#accountDialog.open .signedAccount'))window.__signedProfileShownDuringLogin=true;
   }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  },{once:true});
 });
 await page.route('**/api/v18/config',route=>{
  const origin=new URL(route.request().url()).origin;
  return route.fulfill({json:{cloudConfigured:true,aiConfigured:false,apiVersion:18,supabaseUrl:origin,supabaseAnonKey:'test-publishable-key'}});
 });
 await page.route('**/auth/v1/token?grant_type=password',route=>route.fulfill({json:{access_token:'returning-token',refresh_token:'returning-refresh',expires_at:4102444800,user}}));
 await page.route('**/api/v18/health-consent**',route=>route.fulfill({json:{ok:true,receipt}}));
 await page.route('**/api/v18/state',async route=>{
  await new Promise(resolve=>setTimeout(resolve,350));
  return route.fulfill({json:{ok:true,state:{schemaVersion:23,storage:{'wgp-v15-profile':JSON.stringify(savedProfile)}},updatedAt:'2026-09-04T15:00:00.000Z'}});
 });
 await page.route('**/_vercel/**',route=>route.fulfill({body:''}));

 await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
 await page.locator('.ww29SignIn').first().click();
 await page.locator('#loginEmail').fill(user.email);
 await page.locator('#loginPassword').fill('Valid-Test-Password-123!');
 await page.locator('#loginBtn').click();

 await expect(page.getByRole('heading',{name:'Opening Work + Workout'})).toBeVisible();
 await expect(page.getByText('Opening your home…')).toBeVisible();
 await expect(page.locator('#accountDialog')).not.toHaveClass(/open/);
 await expect(page.locator('#page-home')).toHaveClass(/active/);
 expect(await page.evaluate(()=>window.__signedProfileShownDuringLogin)).toBe(false);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wgp-v15-profile')).name)).toBe('Maya');
 expect(errors).toEqual([]);
});
