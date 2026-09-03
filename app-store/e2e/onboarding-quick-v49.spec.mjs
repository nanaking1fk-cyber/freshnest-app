import {test,expect} from '@playwright/test';

async function setup(page,{draft=null}={}){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));let cloud=null;
 await page.addInitScript(()=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'fixture-token',expires_at:4102444800,user:{id:'quick-onboarding-fixture',email:'onboarding@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','quick-onboarding-fixture');
  localStorage.setItem('wgc-health-consent-v35:quick-onboarding-fixture',JSON.stringify({action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']}));
 });
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let value={ok:true};
  if(path.endsWith('/config'))value={ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};
  if(path.endsWith('/health-consent'))value={ok:true,receipt:{action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']}};
  if(path.endsWith('/state')&&route.request().method()==='PUT'){cloud=route.request().postDataJSON().state;return route.fulfill({status:200,json:{ok:true,updatedAt:new Date().toISOString()}})}
  if(path.endsWith('/state'))value={ok:true,state:cloud,updatedAt:cloud?'2026-09-03T12:00:00Z':null};
  return route.fulfill({status:200,json:value});
 });
 await page.route('**/_vercel/**',route=>route.fulfill({status:200,body:''}));
 await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>window.WGC18?.cloudStateReady)).toBe(true);
 await expect(page.locator('#guidedOnboarding')).toHaveClass(/open/);
 if(draft)await page.evaluate(d=>{localStorage.setItem('wgp-v15-guided-onboarding-draft-v30',JSON.stringify(d));WGC18.openOnboarding()},draft);
 return errors;
}
async function basics(page){
 for(const [key,value] of Object.entries({name:'Alex',age:'30',heightFt:'5',heightIn:'8',weight:'160'}))await page.locator(`[data-answer="${key}"]`).fill(value);
 await page.locator('[data-answer="goal"]').selectOption('maintain');
 await page.locator('#guidedNext').click();await expect(page.locator('#guidedStepLabel')).toHaveText('Step 2 of 3');
}
async function viewportFits(page){
 const fits=await page.evaluate(()=>{const dialog=document.querySelector('#guidedOnboarding'),button=document.querySelector('#guidedNext').getBoundingClientRect();return dialog.scrollWidth<=innerWidth+1&&button.bottom<=innerHeight+1&&button.top>=0&&document.body.scrollWidth<=innerWidth+1});
 expect(fits).toBe(true);
}

for(const viewport of [{width:390,height:844},{width:1440,height:1000}])test(`three-step onboarding builds a saved plan and exposes optional settings at ${viewport.width}px`,async({page},info)=>{
 await page.setViewportSize(viewport);const errors=await setup(page);
 await expect(page.locator('#guidedStepLabel')).toHaveText('Step 1 of 3');await viewportFits(page);
 await page.screenshot({path:info.outputPath('starting-point.png')});await basics(page);
 await expect(page.locator('[data-answer="jobStart"]')).toHaveCount(0);
 await page.locator('[data-answer="workMode"]').selectOption('standard');
 await page.locator('[data-answer="jobStart"]').fill('08:00');await page.locator('[data-answer="jobEnd"]').fill('16:00');
 await expect(page.locator('[data-answer="secondJob"],[data-answer="commute"],[data-answer="bedtime"]')).toHaveCount(0);
 await viewportFits(page);await page.screenshot({path:info.outputPath('work-schedule.png')});
 await page.locator('#guidedNext').click();await expect(page.locator('#guidedStepLabel')).toHaveText('Step 3 of 3');
 await page.locator('[data-answer="trainingDays"]').selectOption('2');await page.locator('[data-answer="equipment"]').selectOption('home');
 await viewportFits(page);await page.screenshot({path:info.outputPath('training.png')});
 await page.locator('#guidedNext').click();await expect(page.locator('#guidedStepLabel')).toHaveText('Your plan preview');
 const saved=await page.evaluate(()=>({profile:profile(),setup:JSON.parse(localStorage.getItem('wgp-v15-onboarding-v18')),draft:localStorage.getItem('wgp-v15-guided-onboarding-draft-v30')}));
 expect(saved.profile.name).toBe('Alex');expect(saved.profile.fixed.enabled).toBe(true);expect(saved.profile.fixed.start).toBe('08:00');expect(saved.profile.trainingDaysPerWeek).toBe(2);expect(saved.profile.equipmentMode).toBe('home');expect(saved.draft).toBeNull();
 expect(saved.setup.answers.work.primaryDays).toEqual([1,2,3,4,5]);expect(saved.setup.plan.nutrition.gymCalories).toBeGreaterThan(1200);expect(saved.setup.plan.nutrition.protein).toBeGreaterThan(0);
 await page.locator('#guidedNext').click();await expect(page.locator('#page-calendar')).toBeVisible();
 await page.locator('.bottomNav [data-page="home"]').click();await page.locator('#homeProfileBtn').click();
 await expect(page.locator('#morePlanSettingsV49')).toBeVisible();await page.locator('#morePlanSettingsV49').click();
 await expect(page.locator('#guidedOnboardingTitle')).toHaveText('More plan settings');await expect(page.locator('#guidedStepLabel')).toContainText('Settings section');
 expect(errors).toEqual([]);
});

test('phone setup can pause, resume, defer work and keep an existing workout routine',async({page})=>{
 await page.setViewportSize({width:375,height:667});const errors=await setup(page);await basics(page);
 await page.locator('#guidedClose').click();await expect(page.locator('#guidedOnboarding')).not.toHaveClass(/open/);
 await page.locator('#resumeOnboarding').click();await expect(page.locator('#guidedStepLabel')).toHaveText('Step 2 of 3');
 await expect(page.locator('[data-answer="workMode"]')).toHaveValue('calendar');await page.locator('#guidedNext').click();
 await page.locator('[data-choice-value="existing"]').click();await page.locator('[data-answer="existingRoutine"]').fill('Mon 18:00 Push\nWed 18:00 Pull\nFri 17:30 Legs');
 await viewportFits(page);await page.locator('#guidedNext').click();await expect(page.locator('#guidedStepLabel')).toHaveText('Your plan preview');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wgp-v15-onboarding-v18')));
 expect(saved.answers.work.scheduleDeferred).toBe(true);expect(saved.answers.work.primaryDays).toEqual([]);expect(saved.plan.training.days.map(x=>x.workout)).toEqual(['Push','Pull','Legs']);expect(saved.plan.training.days[2].start).toBe('17:30');
 await expect(page.locator('#guidedStatus')).toContainText('Add your work schedule in Calendar');expect(errors).toEqual([]);
});

test('an old last-step draft keeps preferences but cannot build with missing basics',async({page})=>{
 const draft={version:2,step:7,values:{name:'Alex',age:'',heightFt:'5',heightIn:'8',weight:'160',workMode:'standard',jobStart:'09:00',jobEnd:'17:00',secondJob:'no',trainingMode:'adaptive',restrictions:'No peanuts',sleepHours:'8'},days:{job:[1,2,3,4,5],second:[]}};
 const errors=await setup(page,{draft});await expect(page.locator('#guidedStepLabel')).toHaveText('Step 3 of 3');await page.locator('#guidedNext').click();
 await expect(page.locator('#guidedStepLabel')).toHaveText('Step 1 of 3');await expect(page.locator('#guidedStatus')).toContainText('age, height and weight');
 await page.evaluate(()=>WGC18.openOnboarding({auto:true}));await expect(page.locator('#guidedStatus')).toContainText('age, height and weight');
 expect(await page.evaluate(()=>profile())).toBeNull();
 await page.locator('[data-answer="age"]').fill('30');await page.locator('#guidedNext').click();await page.locator('#guidedNext').click();await page.locator('#guidedNext').click();
 await expect(page.locator('#guidedStepLabel')).toHaveText('Your plan preview');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wgp-v15-onboarding-v18')).answers);
 expect(saved.nutrition.restrictions).toBe('No peanuts');expect(saved.basics.sleepHours).toBe(8);expect(errors).toEqual([]);
});
