import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Isolated first-login flows: sample accounts only, never production consent.
test.use({browserName:process.env.E2E_BROWSER||'chromium'});
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
let server,base,fixtureNumber=0;
const trackers=new Map();
test.beforeAll(async()=>{
 server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'");
  const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value))};
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.endsWith('/config'))return json({ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:base,supabaseAnonKey:'fixture'});
   const tracker=trackers.get((req.headers.authorization||'').replace(/^Bearer /,''));
   if(url.pathname.endsWith('/health-consent')||url.pathname.endsWith('/state')){
    if(!tracker)return json({ok:false},401);
    if(url.pathname.endsWith('/health-consent')){
     if(req.method==='POST'){
      let body='';for await(const chunk of req)body+=chunk;tracker.grants.push(JSON.parse(body));
      if(tracker.holdSave)await new Promise(resolve=>tracker.release=resolve);
      if(tracker.failSave)return json({ok:false,error:'fixture unavailable'},503);
      tracker.receipt=grant(tracker.grants.at(-1).purposes);
     }
     return json({ok:true,receipt:tracker.receipt});
    }
    if(req.method==='GET'){tracker.stateReads++;return json({ok:true,state:tracker.cloud,updatedAt:tracker.cloud?'2026-09-03T12:00:00Z':null})}
    tracker.stateWrites++;return json({ok:true,updatedAt:'2026-09-03T12:01:00Z'});
   }
   return json({ok:true});
  }
  if(url.pathname.startsWith('/_vercel/')){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('')}
  if(['/work-gym-planner/','/work-gym-planner/index.html'].includes(url.pathname)){res.writeHead(307,{Location:'/work-gym-planner/shell.html'+url.search});return res.end()}
  const file=resolve(root,'.'+url.pathname);if(!file.startsWith(root+'/')){res.writeHead(403);return res.end()}
  try{const body=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404);res.end('Not found')}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))});
const grant=purposes=>({action:'granted',consentVersion:'2026-08-31-v1',policyVersion:'1.5',purposes});
const mainPurposes=['account_cloud_sync','personalized_ai','meal_scan_ai'];
async function setup(page,{receipt=null,cloud=null,failSave=false,holdSave=false}={}){
 const tracker={stateReads:0,stateWrites:0,grants:[],errors:[],receipt,cloud,failSave,holdSave,release:null};
 const token='privacy-fixture-'+(++fixtureNumber);trackers.set(token,tracker);
 page.on('pageerror',error=>tracker.errors.push(error.message));
 await page.addInitScript(token=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:token,expires_at:4102444800,user:{id:'privacy-fixture',email:'privacy@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','privacy-fixture');
 },token);
 await page.goto(base+'/work-gym-planner/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!window.WGC18?.config.loaded)).toBe(true);
 return tracker;
}
async function choose(page,purposes=mainPurposes){
 for(const purpose of purposes)await page.locator(`#healthConsentPurposes input[value="${purpose}"]`).check();
 await page.locator('#healthConsentConfirm').check();
}
for(const viewport of [{width:375,height:667},{width:390,height:844},{width:1440,height:900}])test(`privacy is first, readable and saves three choices together at ${viewport.width}px`,async({page},info)=>{
 await page.setViewportSize(viewport);const t=await setup(page);
 await expect(page.locator('#healthConsentDialog')).toHaveClass(/open/);
 await expect(page.locator('#healthConsentTitle')).toHaveText('Privacy before you begin');
 await expect(page.locator('#guidedOnboarding')).not.toHaveClass(/open/);
 expect(t.stateReads).toBe(0);expect(t.stateWrites).toBe(0);
 await expect(page.locator('#healthConsentPurposes input:checked')).toHaveCount(0);
 await expect(page.locator('#healthConsentConfirm')).not.toBeChecked();
 await expect(page.locator('#healthConsentAgree')).toBeDisabled();
 await expect(page.locator('.healthConsentMore')).not.toHaveAttribute('open');
 for(const purpose of mainPurposes)await expect(page.locator(`#healthConsentPurposes input[value="${purpose}"]`)).toBeVisible();
 const fits=await page.evaluate(()=>{const dialog=document.querySelector('#healthConsentDialog'),actions=document.querySelector('#healthConsentDialog .healthConsentActions').getBoundingClientRect();return dialog.scrollWidth<=innerWidth+1&&actions.bottom<=innerHeight+1&&actions.top>=0});expect(fits).toBe(true);
 await page.screenshot({path:info.outputPath('privacy-first.png')});
 await choose(page);await page.locator('#healthConsentAgree').click();
 await expect(page.locator('#guidedStepLabel')).toHaveText('Step 1 of 3');await expect(page.locator('#guidedOnboarding')).toHaveClass(/open/);
 expect(t.grants).toHaveLength(1);expect(t.grants[0].purposes).toEqual(mainPurposes);expect(t.grants[0].confirmed).toBe(true);expect(t.stateReads).toBe(1);
 expect(await page.evaluate(async()=>{const a=WGC18;return[await a.ensureHealthConsent({interactive:true,purpose:'personalized_ai'}),await a.ensureHealthConsent({interactive:true,purpose:'meal_scan_ai'})]})).toEqual([true,true]);
 await expect(page.locator('#healthConsentDialog')).not.toHaveClass(/open/);expect(t.errors).toEqual([]);
});
test('device-only choice starts local setup without reading or changing the cloud',async({page})=>{
 const t=await setup(page,{cloud:{storage:{'wgp-v15-profile':'{"name":"Saved account"}'}}});
 await page.locator('#healthConsentLocal').click();await expect(page.locator('#guidedOnboarding')).toHaveClass(/open/);
 expect(await page.evaluate(()=>({state:WGC18.accountState,ready:WGC18.cloudStateReady}))).toEqual({state:'local',ready:false});
 expect(t.grants).toHaveLength(0);expect(t.stateReads).toBe(0);expect(t.stateWrites).toBe(0);expect(t.errors).toEqual([]);
});
test('Escape dismisses without permission or new-account setup',async({page})=>{
 const t=await setup(page);await expect(page.locator('#healthConsentDialog')).toHaveClass(/open/);await page.keyboard.press('Escape');
 await expect(page.locator('#accountRestoreGuard')).toContainText('Your saved account is protected');await expect(page.locator('#guidedOnboarding')).not.toHaveClass(/open/);
 expect(t.grants).toHaveLength(0);expect(t.stateReads).toBe(0);expect(t.stateWrites).toBe(0);
});
test('choosing only Meal Scan does not also enable cloud or personalized AI',async({page})=>{
 const t=await setup(page);await choose(page,['meal_scan_ai']);
 await expect(page.locator('#healthConsentAgree')).toHaveText('Agree & continue on device');await expect(page.locator('#healthConsentDeviceNotice')).toBeVisible();
 await page.locator('#healthConsentAgree').click();await expect(page.locator('#guidedOnboarding')).toHaveClass(/open/);
 expect(t.grants[0].purposes).toEqual(['meal_scan_ai']);expect(t.stateReads).toBe(0);
 expect(await page.evaluate(()=>[WGC18.hasHealthConsent('account_cloud_sync'),WGC18.hasHealthConsent('personalized_ai'),WGC18.hasHealthConsent('meal_scan_ai')])).toEqual([false,false,true]);
});
test('a failed save stays actionable without enabling features or opening setup',async({page})=>{
 const t=await setup(page,{failSave:true});await choose(page);await page.locator('#healthConsentAgree').click();
 await expect(page.locator('#healthConsentStatus')).toContainText('We could not save your choice');await expect(page.locator('#healthConsentDialog')).toHaveClass(/open/);await expect(page.locator('#guidedOnboarding')).not.toHaveClass(/open/);
 expect(t.stateReads).toBe(0);expect(await page.evaluate(()=>WGC18.hasHealthConsent('account_cloud_sync'))).toBe(false);
 t.failSave=false;await page.locator('#healthConsentAgree').click();await expect(page.locator('#guidedOnboarding')).toHaveClass(/open/);expect(t.grants).toHaveLength(2);
});
test('existing permissions are remembered without granting any extra purposes',async({page})=>{
 const t=await setup(page,{receipt:grant(['account_cloud_sync','meal_scan_ai'])});
 await expect(page.locator('#guidedOnboarding')).toHaveClass(/open/);await expect(page.locator('#healthConsentDialog')).not.toHaveClass(/open/);
 expect(t.grants).toHaveLength(0);expect(t.stateReads).toBe(1);expect(await page.evaluate(()=>WGC18.hasHealthConsent('personalized_ai'))).toBe(false);
});
for(const width of [390,1440])test(`upfront consent restores an existing plan and meals before setup at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const savedProfile={id:'fixture',name:'Returning user',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Work',anchor:'2026-08-31',pattern:[1,1,1,1,1,0,0],start:'09:00',end:'17:00',commuteMin:20},variable:{enabled:false,name:'Extra work',start:'',end:'',commuteMin:20}};
 const mealKey='wgp-v15-food-diary-2026-09-02',foods=[{id:'existing-food',meal:'Breakfast',name:'Oats',cal:150,protein:5}];
 const t=await setup(page,{cloud:{storage:{'wgp-v15-profile':JSON.stringify(savedProfile),[mealKey]:JSON.stringify(foods)}}});
 await expect(page.locator('#healthConsentDialog')).toHaveClass(/open/);expect(t.stateReads).toBe(0);expect(t.stateWrites).toBe(0);
 await choose(page,['account_cloud_sync']);await page.locator('#healthConsentAgree').click();
 await expect.poll(()=>page.evaluate(()=>WGC18.cloudStateReady)).toBe(true);
 expect(await page.evaluate(()=>profile().name)).toBe('Returning user');
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),mealKey)).toEqual(foods);
 await expect(page.locator('#guidedOnboarding.open,#onboardingV18.open')).toHaveCount(0);
 expect(t.stateReads).toBe(1);expect(t.stateWrites).toBe(0);expect(t.errors).toEqual([]);
});
test('a pending save cannot be double-submitted or dismissed by Escape',async({page})=>{
 const t=await setup(page,{holdSave:true});await choose(page);await page.locator('#healthConsentAgree').click();
 await expect(page.locator('#healthConsentStatus')).toHaveText('Saving your choices…');await page.keyboard.press('Escape');
 await expect(page.locator('#healthConsentDialog')).toHaveClass(/open/);await expect(page.locator('#healthConsentAgree')).toBeDisabled();await expect(page.locator('#healthConsentLocal')).toBeDisabled();
 expect(t.grants).toHaveLength(1);expect(t.stateReads).toBe(0);t.release();await expect(page.locator('#guidedOnboarding')).toHaveClass(/open/);
});
