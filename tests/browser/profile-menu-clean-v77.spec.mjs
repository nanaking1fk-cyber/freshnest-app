import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');

async function openSignedInApp(page){
 await page.addInitScript(()=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'profile-test',expires_at:4102444800,user:{id:'profile-test',email:'maya@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','profile-test');
  localStorage.setItem('wgp-v15-profile',JSON.stringify({id:'profile-test',name:'Maya',trainingDaysPerWeek:3,trainingDuration:45,sleepTarget:8,fixed:{enabled:false},variable:{enabled:false}}));
 });
 await page.route('**/api/config',route=>route.fulfill({json:{cloudConfigured:false,aiConfigured:false,apiVersion:18}}));
 await page.goto('/work-gym-planner/');
 await page.locator('#homeProfileBtn').click();
 await expect(page.locator('#guidedProfileSummary')).toBeVisible();
}

test('mobile profile starts calm and reveals optional settings on demand',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await openSignedInApp(page);
 const essentials=page.locator('#guidedProfileSummary .guidedProfileEssentials button');
 await expect(essentials).toHaveCount(3);
 await expect(page.getByRole('button',{name:/Plan & goals/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Work schedule/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Account & privacy/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Nutrition goals/})).toBeHidden();
 await page.locator('#guidedProfileSummary .guidedProfileMore>summary').click();
 await expect(page.getByRole('button',{name:/Nutrition goals/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Body & progress/})).toBeVisible();
 const box=await page.locator('#guidedProfileSummary .guidedProfileSheet').boundingBox();
 expect(box.width).toBeLessThanOrEqual(390);
 expect(box.height).toBeLessThanOrEqual(844);
 await page.screenshot({path:'/private/tmp/ww-profile-v77-mobile.png'});
});

test('profile essentials retain navigation behavior on desktop',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await openSignedInApp(page);
 await page.getByRole('button',{name:/Work schedule/}).click();
 await expect(page.locator('#guidedProfileSummary')).toBeHidden();
 await expect(page.locator('#page-calendar')).toHaveClass(/active/);
 await page.screenshot({path:'/private/tmp/ww-profile-v77-desktop.png'});
});
