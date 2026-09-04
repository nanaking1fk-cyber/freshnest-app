import {test,expect} from '@playwright/test';
import {savedAgreement} from './fixtures/saved-agreement.mjs';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Test the actual generated store bundle. Native plugin callbacks and account
// services are fixtures: no real account, email, health record or purchase.
test.use({browserName:process.env.E2E_BROWSER||'chromium',viewport:{width:390,height:844}});
const root=resolve(fileURLToPath(new URL('../www',import.meta.url)));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
let server,base,requests=[];
test.beforeAll(async()=>{
 server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};
  if(url.pathname.startsWith('/auth/v1/')){
   let body='';for await(const part of req)body+=part;
   requests.push({path:url.pathname,query:Object.fromEntries(url.searchParams),body:JSON.parse(body||'{}')});
   if(url.pathname.endsWith('/signup'))return json({user:{id:'native-fixture'}});
   if(url.pathname.endsWith('/recover'))return json({});
   if(url.pathname.endsWith('/user'))return json({id:'native-fixture',email:'native@example.test'});
   return json({access_token:'native-fixture-token',refresh_token:'native-fixture-refresh',expires_at:4102444800,user:{id:'native-fixture',email:'native@example.test'}});
  }
  const file=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+'/')){res.writeHead(403);return res.end()}
  try{const body=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404);res.end('Not found')}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))});
async function setup(page,launchUrl,existing=false){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://www.workandworkout.com/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let body={ok:true};
  if(path.endsWith('/config'))body={ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:base,supabaseAnonKey:'fixture'};
  if(path.endsWith('/health-consent'))body={ok:true,receipt:null};
  if(path.endsWith('/state'))body={ok:true,state:null,updatedAt:null};
  if(existing&&path.endsWith('/health-consent'))body={ok:true,receipt:{action:'granted',consentVersion:'2026-08-31-v1',policyVersion:'1.6',purposes:['account_cloud_sync'],agreement:savedAgreement}};
  if(existing&&path.endsWith('/state'))body={ok:true,updatedAt:'2026-09-04T12:00:00Z',state:{storage:{'wgp-v15-profile':JSON.stringify({name:'Alex',age:35,sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Evening shift',anchor:'2026-08-31',pattern:[1,1,1,1,1,0,0],start:'16:00',end:'00:00',commuteMin:20},variable:{enabled:false}})}}};
  if(path.endsWith('/subscription'))body={ok:true,tier:'free',credits:10,remaining:10,resetsAt:'2026-10-01T00:00:00Z',purchaseAvailable:false};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body),headers:{'Access-Control-Allow-Origin':'*'}});
 });
 await page.addInitScript(({launchUrl,existing})=>{
  if(existing){localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'native-fixture-token',expires_at:4102444800,user:{id:'native-fixture',email:'native@example.test'}}));localStorage.setItem('wgc-v18-local-owner','native-fixture')}
  window.nativeEvents={};
  window.Capacitor={getPlatform:()=> 'ios',Plugins:{
   App:{addListener:(name,fn)=>{window.nativeEvents[name]=fn},getLaunchUrl:async()=>({url:launchUrl})},
   Browser:{open:async()=>{},close:async()=>{}},
   StatusBar:{setOverlaysWebView:async()=>{},setStyle:async()=>{}},SplashScreen:{hide:async()=>{}}
  }};
  if(launchUrl&&!sessionStorage.getItem('fixture-seeded')){
   sessionStorage.setItem('fixture-seeded','1');
   localStorage.setItem('wgc-v25-pkce-verifier','cold-private-verifier');
   localStorage.setItem('wgc-v25-pkce-purpose','recovery');
  }
 },{launchUrl,existing});
 await page.goto(base+'/index.html');
 await expect.poll(async()=>{
  try{return await page.evaluate(()=>!!window.WGC18?.config.loaded)}
  catch(error){if(/Execution context was destroyed|Cannot find context/.test(error.message))return false;throw error}
 }).toBe(true);
 await expect(page.locator('body')).toHaveClass(/native-ready/);
 expect(await page.evaluate(()=>window.WGPNative.isNative)).toBe(true);
 return errors;
}

for(const width of [390,1280])test('free packaged planner stays usable and fits '+width+'px',async({page},info)=>{
 await page.setViewportSize({width,height:844});const errors=await setup(page,undefined,true);
 await expect.poll(()=>page.evaluate(()=>WGC18.cloudStateReady)).toBe(true);
 for(const section of ['home','calendar','diary']){
  await page.evaluate(section=>{document.querySelectorAll('.modal.open').forEach(el=>closeModal(el.id));window.page(section)},section);
  await expect(page.locator('#page-'+section)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath(width+'-'+section+'.png')});
 }
 await page.evaluate(()=>WGC18.openAIPlan());
 await expect(page.locator('#aiPlanAvailability')).toContainText('not available to buy yet');
 await expect(page.locator('#aiPlanBalance')).toHaveText('10 of 10 credits left');
 expect(errors).toEqual([]);
});

test('packaged signup requests a native return and confirms back into privacy choices',async({page},info)=>{
 const errors=await setup(page);
 await page.evaluate(()=>WGC18.openAccount('signup'));
 await page.locator('#signupName').fill('Native fixture');await page.locator('#signupEmail').fill('native@example.test');
 await page.locator('#signupPassword').fill('Fixture-only-password-123!');await page.locator('#signupBtn').click();
 await expect(page.locator('#accountStatus')).toContainText('return to this app');
 const sent=requests.filter(r=>r.path.endsWith('/signup')).at(-1);
 expect(sent.query.redirect_to).toBe('workandworkout://auth-callback?auth=signup');
 expect(sent.body.code_challenge_method).toBe('s256');expect(sent.body.code_challenge.length).toBeGreaterThan(40);
 const verifier=await page.evaluate(()=>localStorage.getItem('wgc-v25-pkce-verifier'));
 await page.evaluate(()=>{window.nativeEvents.appUrlOpen({url:'workandworkout://auth-callback?auth=signup&code=sample-native-signup'})});
 await expect(page.locator('#healthConsentDialog')).toHaveClass(/open/);
 expect(requests.filter(r=>r.path.endsWith('/token')).at(-1).body).toEqual({auth_code:'sample-native-signup',code_verifier:verifier});
 expect(page.url()).not.toContain('code=');
 expect(await page.evaluate(()=>localStorage.getItem('wgc-v25-pkce-verifier'))).toBe(null);
 await expect(page.locator('#healthConsentPurposes input:checked')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('native-confirmation.png')});expect(errors).toEqual([]);
});

test('packaged reset requests the cross-browser web flow; legacy app links still complete a new password',async({page},info)=>{
 const errors=await setup(page);await page.evaluate(()=>WGC18.openAccount('signin'));
 await page.locator('#loginEmail').fill('native@example.test');await page.locator('#recoverBtn').click();
 await expect(page.locator('#accountStatus')).toContainText('email');
 const sent=requests.filter(r=>r.path.endsWith('/recover')).at(-1);
 expect(sent.query.redirect_to).toBe('https://www.workandworkout.com/work-gym-planner/shell.html?auth=recovery');
 await page.evaluate(()=>{window.nativeEvents.appUrlOpen({url:'workandworkout://auth-callback?auth=recovery&code=sample-native-recovery'})});
 await expect(page.locator('#recoveryPasswordForm')).toBeVisible();
 await page.screenshot({path:info.outputPath('native-password-reset.png')});
 await page.locator('#recoveryNewPassword').fill('Another-fixture-password-456!');await page.locator('#saveRecoveredPassword').click();
 await expect.poll(()=>page.evaluate(()=>WGC18.passwordRecovery)).toBe(false);
 expect(requests.filter(r=>r.path.endsWith('/user')).at(-1).body).toEqual({password:'Another-fixture-password-456!'});
 expect(page.url()).not.toContain('code=');expect(errors).toEqual([]);
});

test('terminated-app reset launch exchanges only once and never loops',async({page})=>{
 const before=requests.filter(r=>r.path.endsWith('/token')).length;
 const errors=await setup(page,'workandworkout://auth-callback?auth=recovery&code=sample-native-cold');
 await expect(page.locator('#recoveryPasswordForm')).toBeVisible();
 expect(requests.filter(r=>r.path.endsWith('/token')).slice(before).map(r=>r.body)).toEqual([{auth_code:'sample-native-cold',code_verifier:'cold-private-verifier'}]);
 await page.reload();await expect(page.locator('#recoveryPasswordForm')).toBeVisible();
 expect(requests.filter(r=>r.path.endsWith('/token')).length).toBe(before+1);expect(errors).toEqual([]);
});

test('packaged legal pages exist locally and no service worker controls native navigation',async({page})=>{
 const errors=await setup(page);
 expect(await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
 for(const file of ['privacy.html','terms.html','support.html','delete-account.html']){
  const response=await page.goto(base+'/'+file);expect(response.status()).toBe(200);
  await expect(page.locator('body')).not.toBeEmpty();
 }
 expect(errors).toEqual([]);
});
