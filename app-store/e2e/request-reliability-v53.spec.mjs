import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Fault injection runs locally with invented accounts and a synthetic photo.
// Never send test failures, consent, health data or food queries to production.
test.use({browserName:process.env.E2E_BROWSER||'chromium'});
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const sources=new Set(['window_error','unhandled_rejection','boot_load','resource_error','network_error','api_error','native_bridge','native_crash','native_hang']);
const purposes=['account_cloud_sync','meal_scan_ai'];
const receipt=()=>({action:'granted',consentVersion:'2026-08-31-v1',policyVersion:'1.5',purposes});
const savedProfile={id:'fixture',name:'Saved sample account',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Work',anchor:'2026-08-31',pattern:[1,1,1,1,1,0,0],start:'09:00',end:'17:00',commuteMin:20},variable:{enabled:false,name:'Extra work',start:'',end:'',commuteMin:20}};
const mealKey='wgp-v15-food-diary-2026-09-02';
const savedFoods=[{id:'saved-oats',meal:'Breakfast',name:'Sample oats',cal:150,protein:5}];
const trackers=new Map(),fixtureErrors=[];let server,base,sequence=0,foodSearches=0;
const readBody=async req=>{let text='';for await(const chunk of req)text+=chunk;return text?JSON.parse(text):{}};
test.beforeAll(async()=>{
 server=createServer((req,res)=>{
  serve(req,res).catch(error=>{
   // Closing a browser context can cancel an in-flight diagnostic upload.
   if(!req.aborted&&error.code!=='ECONNRESET')fixtureErrors.push(error.message);
   res.destroy();
  });
 });
 async function serve(req,res){
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'");
  const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value))};
  if(url.pathname==='/off/cgi/search.pl'){foodSearches++;return json({products:[{code:'12345678',product_name:'Sample packaged oats',serving_size:'40 g',nutriments:{'energy-kcal_100g':380,proteins_100g:12}}]})}
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.endsWith('/config'))return json({ok:true,cloudConfigured:true,aiConfigured:true,supabaseUrl:base,supabaseAnonKey:'fixture'});
   const tracker=trackers.get((req.headers.authorization||'').replace(/^Bearer /,''));
   if(url.pathname.endsWith('/client-error')){
    const report=await readBody(req);const accepted=sources.has(report.source);
    // Reports do not contain account identifiers; only the fixture associates them.
    for(const t of trackers.values())if(t.active)t.reports.push({report,accepted});
    return json({ok:accepted},accepted?200:400);
   }
   if(!tracker)return json({ok:false},401);
   if(url.pathname.endsWith('/health-consent')){
    if(req.method==='POST'){tracker.grants.push(await readBody(req));tracker.receipt=receipt()}
    return json({ok:true,receipt:tracker.receipt});
   }
   if(url.pathname.endsWith('/state')){
    if(req.method==='GET')tracker.reads++;
    else{tracker.writes++;tracker.cloud=(await readBody(req)).state;tracker.revision='2026-09-03T14:01:00Z'}
    return json({ok:true,state:tracker.cloud,updatedAt:tracker.revision});
   }
   if(url.pathname.endsWith('/meal-scan')){
    tracker.scans++;const body=await readBody(req);tracker.photoReceived=body.imageDataUrl?.startsWith('data:image/jpeg;base64,');
    return json({ok:true,items:[{name:'Sample rice',defaultGrams:100,per100:{cal:130,protein:2.7,carbs:28,fat:.3}},{name:'Sample beans',defaultGrams:100,per100:{cal:140,protein:9,carbs:24,fat:.5}}]});
   }
   return json({ok:true});
  }
  if(url.pathname.startsWith('/_vercel/')){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('')}
  if(['/work-gym-planner/','/work-gym-planner/index.html'].includes(url.pathname)){res.writeHead(307,{Location:'/work-gym-planner/shell.html'+url.search});return res.end()}
  const file=resolve(root,'.'+url.pathname);if(!file.startsWith(root+'/')){res.writeHead(403);return res.end()}
  try{let body=await readFile(file);if(url.pathname.endsWith('/diary-b.js'))body=body.toString().replaceAll('https://world.openfoodfacts.org',base+'/off');res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404);res.end('Not found')}
 }
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));expect(fixtureErrors).toEqual([])});
async function setup(page,{consented=true,faults={}}={}){
 for(const t of trackers.values())t.active=false;
 const t={active:true,receipt:consented?receipt():null,cloud:{storage:{'wgp-v15-profile':JSON.stringify(savedProfile),[mealKey]:JSON.stringify(savedFoods)}},revision:'2026-09-03T14:00:00Z',reads:0,writes:0,grants:[],scans:0,reports:[],errors:[]};
 const token='reliability-fixture-'+(++sequence);trackers.set(token,t);
 page.on('pageerror',error=>t.errors.push(error.message));
 await page.addInitScript(({token,faults})=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:token,expires_at:4102444800,user:{id:'reliability-fixture',email:'sample@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','reliability-fixture');
  window.__faults=faults;window.__attempts={};
  const original=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
   const key=(init.method||input?.method||'GET').toUpperCase()+' '+new URL(typeof input==='string'?input:input.url,location.href).pathname;
   window.__attempts[key]=(window.__attempts[key]||0)+1;
   const fault=window.__faults[key];
   if(fault){delete window.__faults[key];if(fault==='lost-response')await original(input,init);throw new TypeError('Synthetic connection interruption')}
   return original(input,init);
  };
 },{token,faults});
 await page.goto(base+'/work-gym-planner/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>!!window.WGC18?.config.loaded)).toBe(true);
 if(consented)await expect.poll(()=>page.evaluate(()=>WGC18.cloudStateReady)).toBe(true);
 return t;
}
test('a dropped cloud read recovers without losing the account or starting onboarding',async({page})=>{
 const t=await setup(page,{faults:{'GET /api/v18/state':'disconnect'}});
 expect(await page.evaluate(()=>window.__attempts['GET /api/v18/state'])).toBe(2);
 expect(t.reads).toBe(1);expect(t.writes).toBe(0);
 expect(await page.evaluate(()=>profile().name)).toBe(savedProfile.name);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),mealKey)).toEqual(savedFoods);
 await expect(page.locator('#guidedOnboarding.open,#onboardingV18.open')).toHaveCount(0);
 expect(t.reports).toEqual([]);expect(t.errors).toEqual([]);
});
test('lost cloud save acknowledgement reads back once without duplicating the write',async({page})=>{
 const t=await setup(page);
 const result=await page.evaluate(async()=>{
  window.__faults['PUT /api/v18/state']='lost-response';
  localStorage.setItem('wgp-v15-food-diary-2026-09-02',JSON.stringify([{id:'changed-fixture',meal:'Lunch',name:'Sample soup',cal:200,protein:10}]));
  await WGC18.pushState({quiet:true});return{revision:WGC18.cloudRevision,ready:WGC18.cloudStateReady};
 });
 expect(result).toEqual({revision:'2026-09-03T14:01:00Z',ready:true});
 expect(t.writes).toBe(1);expect(t.reads).toBe(2);
 expect(JSON.parse(t.cloud.storage[mealKey])[0].name).toBe('Sample soup');
 expect(await page.evaluate(()=>window.__attempts['PUT /api/v18/state'])).toBe(1);
 await expect.poll(()=>t.reports.length).toBe(1);expect(t.reports[0].accepted).toBe(true);expect(t.errors).toEqual([]);
});
test('consent connection failure stays actionable and saves only on an explicit retry',async({page})=>{
 const t=await setup(page,{consented:false,faults:{'POST /api/v18/health-consent':'disconnect'}});
 await expect(page.locator('#healthConsentDialog')).toHaveClass(/open/);
 for(const purpose of purposes)await page.locator(`#healthConsentPurposes input[value="${purpose}"]`).check();
 await page.locator('#healthConsentConfirm').check();await page.locator('#healthConsentAgree').click();
 await expect(page.locator('#healthConsentStatus')).toContainText('We could not save your choice');
 expect(t.grants).toHaveLength(0);expect(t.reads).toBe(0);expect(t.writes).toBe(0);
 expect(await page.evaluate(()=>window.__attempts['POST /api/v18/health-consent'])).toBe(1);
 await page.locator('#healthConsentAgree').click();await expect.poll(()=>page.evaluate(()=>WGC18.cloudStateReady)).toBe(true);
 expect(t.grants).toHaveLength(1);expect(t.reads).toBe(1);expect(t.errors).toEqual([]);
 await expect.poll(()=>t.reports.length).toBeGreaterThanOrEqual(2);expect(t.reports.every(x=>x.accepted)).toBe(true);
});
for(const width of [390,1440])test(`food search and photo recovery at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const t=await setup(page);const searchesBefore=foodSearches;
 await page.getByRole('button',{name:'Nutrition',exact:true}).click();
 await page.locator('[data-add-food="Breakfast"]').click();
 await page.locator('#foodSearchInput').fill('oats');
 await expect(page.locator('#foodSearchResults')).toContainText('Tap Search for packaged foods');expect(foodSearches).toBe(searchesBefore);
 await page.locator('#foodSearchBtn').click();await expect(page.locator('#foodSearchResults')).toContainText('Sample packaged oats');expect(foodSearches).toBe(searchesBefore+1);
 await page.locator('#foodSearchBtn').click();expect(foodSearches).toBe(searchesBefore+1);
 await page.locator('#clearFoodSearch').click();await expect(page.locator('#foodSearchResults')).toBeHidden();
 await page.locator('#foodBarcodeTool').click();await page.locator('#barcodeManual').fill('34');await page.locator('#barcodeLookup').click();
 await expect(page.locator('#barcodeStatus')).toContainText('Enter the full');expect(await page.evaluate(()=>Object.keys(__attempts).some(x=>x.includes('/product/34')))).toBe(false);
 await page.locator('#foodMealScanTool').click();
 await page.locator('#mealScanPhoto').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=','base64')});
 await expect(page.locator('#analyzeMealPhoto')).toBeEnabled();
 await page.evaluate(()=>{window.__faults['POST /api/v18/meal-scan']='disconnect'});
 await page.locator('#analyzeMealPhoto').click();await expect(page.locator('#mealScanStatus')).toContainText('Your photo is still here');await expect(page.locator('#mealScanPreview img')).toBeVisible();
 expect(t.scans).toBe(0);expect(await page.evaluate(()=>__attempts['POST /api/v18/meal-scan'])).toBe(1);
 await page.screenshot({path:info.outputPath('meal-retry.png')});
 await page.locator('#analyzeMealPhoto').click();await expect(page.locator('#foodBatchTray')).toContainText('Sample rice');await expect(page.locator('#foodBatchTray')).toContainText('Sample beans');
 expect(t.scans).toBe(1);expect(t.photoReceived).toBe(true);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),mealKey)).toEqual(savedFoods);
 await expect(page.locator('#foodDialog')).toHaveClass(/open/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('staged-foods.png')});
 expect(t.errors).toEqual([]);await expect.poll(()=>t.reports.length).toBe(1);expect(t.reports[0].accepted).toBe(true);
});
