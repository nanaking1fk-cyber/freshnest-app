import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');
const config={cloudConfigured:true,aiConfigured:true,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};
const agreement={termsVersion:'1.2',privacyVersion:'1.6',acceptedAt:'2026-09-03T18:00:00Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'};
const receipt={action:'granted',consentVersion:'2026-08-31-v1',agreement,purposes:['account_cloud_sync','personalized_ai']};
async function mock(page,{connection=route=>route.fulfill({json:config}),signed=false}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{
  const p=new URL(route.request().url()).pathname;
  if(p.endsWith('/config'))return connection(route);
  if(p.endsWith('/health-consent'))return route.fulfill({json:{ok:true,receipt}});
  if(p.endsWith('/state'))return route.fulfill({json:{ok:true,state:{storage:{
   'wgp-v15-profile':JSON.stringify({name:'Alex',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:false},variable:{enabled:false}}),
   'wgp-v15-schedule-sources-v25':JSON.stringify([{id:'work-fixture',name:'Hospital',enabled:true,color:'#62a0ff'}]),
   'wgp-v15-schedule-sources-initialized-v25':'true',
   'wgp-v15-schedule-events-v25':JSON.stringify([{id:'shift-fixture',sourceId:'work-fixture',kind:'work',date:'2026-09-03',start:'07:00',end:'15:00',title:'Hospital shift'}])
  }},updatedAt:'2026-09-03T12:00:00Z'}});
  return route.fulfill({json:{ok:true}});
 });
 await page.route('**/_vercel/**',r=>r.fulfill({body:''}));
 if(signed)await page.addInitScript(receipt=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'fixture-token',expires_at:4102444800,user:{id:'home-fixture',email:'home@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','home-fixture');
  localStorage.setItem('wgc-health-consent-v35:home-fixture',JSON.stringify(receipt));
 },receipt);
 return errors;
}
async function welcome(page){await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});await expect(page.locator('#wwLanding')).toBeVisible();await expect(page.locator('#wwBoot')).toHaveCount(0)}
for(const size of [{width:390,height:844},{width:1440,height:1000}]){
 test('clean welcome and visible account actions at '+size.width,async({page})=>{
  await page.setViewportSize(size);const errors=await mock(page);const media=[];page.on('request',r=>{if(r.resourceType()==='media')media.push(r.url())});
  await welcome(page);
  const signup=page.getByRole('button',{name:'Create account',exact:true});await expect(signup).toBeVisible();
  const box=await signup.boundingBox();expect(box.y+box.height).toBeLessThan(size.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(media).toEqual([]);await expect(page.locator('.ww29Preview')).toContainText('Example');
  await page.screenshot({path:'/private/tmp/ww-welcome63-'+size.width+'.png',fullPage:true});
  await signup.click();await expect(page.locator('#signupPane')).toBeVisible();
  await page.locator('[data-auth-tab="signin"]').click();await expect(page.locator('#signinPane')).toBeVisible();
  expect(errors).toEqual([]);
 });
 test('signed-in Home stays focused and its actions work at '+size.width,async({page})=>{
  await page.setViewportSize(size);await page.clock.setFixedTime(new Date('2026-09-03T16:00:00Z'));const errors=await mock(page,{signed:true});
  await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>window.WGC18?.cloudStateReady)).toBe(true);
  await page.locator('.bottomNav [data-page="home"]').click();
  await expect(page.locator('.hvRows')).toContainText('Hospital');
  await expect(page.locator('.hvRows .hvRow.w')).toHaveCount(1);
  await expect(page.locator('[data-home-detail="checkins"]')).not.toHaveAttribute('open');
  await expect(page.locator('[data-home-detail="nutrition"]')).not.toHaveAttribute('open');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'/private/tmp/ww-home63-'+size.width+'.png',fullPage:true});
  await page.locator('[data-home-detail="checkins"]>summary').click();await expect(page.locator('#quickWeight')).toBeVisible();
  await page.evaluate(()=>renderTodayDashboard());await expect(page.locator('#quickWeight')).toBeVisible();
  await page.locator('#homeFullPlan').click();await expect(page.locator('#page-calendar')).toHaveClass(/active/);
  expect(errors).toEqual([]);
 });
}
test('slow account service keeps the requested Create account mode',async({page})=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 await mock(page,{connection:async route=>{await gate;return route.fulfill({json:config})}});
 await welcome(page);await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page.locator('#accountBody')).toContainText('Connecting securely');
 release();await expect(page.locator('#signupPane')).toBeVisible();
 await page.locator('#signupName').fill('Test');await page.locator('#signupEmail').fill('test@example.test');
 await page.evaluate(()=>WGC18.renderAccountUI());await expect(page.locator('#signupEmail')).toHaveValue('test@example.test');
});
test('a temporary connection failure can be retried without reloading or losing signup intent',async({page})=>{
 let healthy=false;await mock(page,{connection:r=>r.fulfill({status:healthy?200:503,json:healthy?config:{error:'Temporary test outage'}})});
 await welcome(page);await expect.poll(()=>page.evaluate(()=>!!window.WGC18?.config?.error)).toBe(true);
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page.locator('#retryAccountConnection')).toBeVisible();
 await expect(page.locator('#accountBody')).not.toContainText('not configured');
 healthy=true;await page.locator('#retryAccountConnection').click();await expect(page.locator('#signupPane')).toBeVisible();
});
test('email callback survives a failed initial connection check',async({page})=>{
 await mock(page,{connection:r=>r.fulfill({status:503,json:{error:'Temporary test outage'}})});
 await page.addInitScript(()=>localStorage.setItem('wgc-v25-pkce-verifier','fixture-only'));
 await page.goto('/work-gym-planner/shell.html?code=fixture-only&auth=recovery',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!window.WGC18?.config?.error)).toBe(true);
 expect(new URL(page.url()).searchParams.get('code')).toBe('fixture-only');
 expect(await page.evaluate(()=>localStorage.getItem('wgc-v25-pkce-verifier'))).toBe('fixture-only');
});
test('root entry shows a dark branded fallback before its redirect loads',async({page})=>{
 let release;const gate=new Promise(resolve=>release=resolve);await mock(page);
 await page.route('**/entry.js',async route=>{await gate;return route.continue()});
 await page.goto('/',{waitUntil:'commit'});
 await expect(page.getByRole('heading',{name:'Work + Workout',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(7, 10, 13)');
 release();await expect(page.locator('#wwLanding')).toBeVisible();
});
test('cold shell paints a dark loading screen even while stylesheets are delayed',async({page})=>{
 let release;const gate=new Promise(resolve=>release=resolve);await mock(page);
 await page.route('**/*.css*',async route=>{await gate;return route.continue()});
 await page.goto('/work-gym-planner/shell.html',{waitUntil:'commit'});
 await expect(page.locator('#wwBoot')).toBeVisible();
 expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(7, 10, 13)');
 release();await expect(page.locator('#wwLanding')).toBeVisible();await expect(page.locator('#wwBoot')).toHaveCount(0);
});
