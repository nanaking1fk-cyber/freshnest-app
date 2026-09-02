import {test,expect} from '@playwright/test';

const uid='account-restore-fixture';
const revision='2026-09-02T12:00:00.123456Z';
const savedProfile={id:'fixture',name:'Returning user',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Work',anchor:'2026-08-31',pattern:[1,1,1,1,1,0,0],start:'09:00',end:'17:00',commuteMin:20},variable:{enabled:false,name:'Extra work',start:'',end:'',commuteMin:20}};
const saved={storage:{'wgp-v15-profile':JSON.stringify(savedProfile),'wgp-v15-food-diary-2026-09-02':JSON.stringify([{id:'existing-food',meal:'Breakfast',name:'Oats',cal:150,protein:5}])}};

async function setup(page,{failRead=false,conflict=false}={}){
  const calls=[],errors=[];let receipt=null;
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({uid,conflict,savedProfile})=>{
    localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'fixture-token',expires_at:4102444800,user:{id:uid,email:'returning@example.test'}}));
    localStorage.setItem('wgc-v18-local-owner',uid);
    if(conflict)localStorage.setItem('wgp-v15-profile',JSON.stringify({...savedProfile,name:'Device copy'}));
  },{uid,conflict,savedProfile});
  // No real account, email, consent record or planner data is modified.
  await page.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url()),method=request.method();calls.push({path:url.pathname,method,body:request.postDataJSON()});
    let value={ok:true};
    if(url.pathname.endsWith('/config'))value={ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};
    if(url.pathname.endsWith('/health-consent')){
      if(method==='POST')receipt={action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']};
      value={ok:true,receipt};
    }
    if(url.pathname.endsWith('/state')){
      if(method==='GET'&&failRead)return route.fulfill({status:503,json:{ok:false,error:'Temporarily unavailable'}});
      value=method==='GET'?{ok:true,state:saved,updatedAt:revision}:{ok:true,updatedAt:'2026-09-02T12:01:00Z'};
    }
    return route.fulfill({status:200,json:value});
  });
  await page.route('**/_vercel/**',route=>route.fulfill({status:200,body:''}));
  await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#healthConsentDialog')).toHaveClass(/open/);
  return {calls,errors};
}
async function grant(page){
  await page.locator('#healthConsentConfirm').check();
  await page.locator('#healthConsentAgree').click();
}

for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
  test.describe(`${viewport.width}px returning account`,()=>{
    test.use({viewport,serviceWorkers:'block'});
    test('consent restores saved meals and profile, without onboarding or premature uploads',async({page},info)=>{
      const {calls,errors}=await setup(page);
      expect(calls.some(x=>x.path.endsWith('/state'))).toBe(false);
      expect(await page.evaluate(()=>WGC18.canStartOnboarding())).toBe(false);
      await page.screenshot({path:info.outputPath('consent.png')});
      await grant(page);
      await expect.poll(()=>page.evaluate(()=>WGC18.cloudStateReady)).toBe(true);
      expect(await page.evaluate(()=>profile().name)).toBe('Returning user');
      expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wgp-v15-food-diary-2026-09-02'))[0].id)).toBe('existing-food');
      await expect(page.locator('#guidedOnboarding.open,#onboardingV18.open')).toHaveCount(0);
      await page.evaluate(()=>WGC18.pushState());
      const writes=calls.filter(x=>x.path.endsWith('/state')&&x.method==='PUT');
      expect(writes.length).toBeGreaterThan(0);expect(writes[0].body.baseUpdatedAt).toBe(revision);
      await page.screenshot({path:info.outputPath('restored.png')});
      expect(errors).toEqual([]);
    });
    test('Not now keeps cloud sync and setup paused and offers a clear retry',async({page},info)=>{
      const {calls,errors}=await setup(page);
      await page.locator('#healthConsentLocal').click();
      await expect(page.locator('#accountRestoreGuard')).toBeVisible();
      await expect(page.locator('#loadSavedAccount')).toBeVisible();
      await expect(page.locator('#syncAccount')).toBeDisabled();
      await expect(page.locator('#resumeOnboarding')).toContainText('Load saved account');
      expect(await page.evaluate(()=>WGC18.pushState({quiet:true}))).toBe(false);
      expect(calls.some(x=>x.path.endsWith('/state'))).toBe(false);
      await page.screenshot({path:info.outputPath('protected.png')});
      const bounds=await page.locator('#loadSavedAccount').boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(errors).toEqual([]);
    });
    test('a connection failure cannot start onboarding or upload an empty account',async({page})=>{
      const {calls,errors}=await setup(page,{failRead:true});await grant(page);
      await expect.poll(()=>page.evaluate(()=>WGC18.accountState)).toBe('unavailable');
      await expect(page.locator('#loadSavedAccount')).toBeVisible();
      expect(await page.evaluate(()=>WGC18.canStartOnboarding())).toBe(false);
      expect(calls.some(x=>x.method==='PUT')).toBe(false);expect(errors).toEqual([]);
    });
    test('choosing the cloud copy preserves the device copy for recovery',async({page})=>{
      const {errors}=await setup(page,{conflict:true});await grant(page);
      await expect.poll(()=>page.evaluate(()=>WGC18.accountState)).toBe('choice');
      await page.locator('#loadSavedAccount').click();
      await expect.poll(()=>page.evaluate(()=>WGC18.cloudStateReady)).toBe(true);
      expect(await page.evaluate(()=>profile().name)).toBe('Returning user');
      expect(await page.evaluate(uid=>JSON.parse(JSON.parse(localStorage.getItem('wgc-v18-user-cache:'+uid)).storage['wgp-v15-profile']).name,uid)).toBe('Device copy');
      expect(errors).toEqual([]);
    });
  });
}
