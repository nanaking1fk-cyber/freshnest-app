import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

test.use({browserName:process.env.E2E_BROWSER||'chromium'});
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const savedProfile={id:'calendar-fixture',name:'Calendar sample',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Work',anchor:'2026-08-31',pattern:[0,0,0,0,0,0,0],start:'07:00',end:'19:00',commuteMin:20},variable:{enabled:false,name:'Extra work',start:'',end:'',commuteMin:20}};
const source={id:'old-source',name:'Existing workplace',enabled:true,color:'#58a6ff',overtimeThreshold:40};
const oldShift={id:'old-shift',kind:'work',date:'2026-09-02',start:'07:00',end:'15:00',sourceId:'old-source',title:'Saved shift'};
const oldRotation={id:'old-rotation',sourceId:'old-source',name:'Paused saved rotation',active:false,anchor:'2026-08-31',pattern:['D','O'],dayStart:'07:00',dayEnd:'15:00'};
const fixtures=new Map(),serverErrors=[];let server,base,sequence=0;
const body=async req=>{let value='';for await(const chunk of req)value+=chunk;return value?JSON.parse(value):{}};
test.beforeAll(async()=>{
 server=createServer((req,res)=>serve(req,res).catch(error=>{if(!req.aborted&&error.code!=='ECONNRESET')serverErrors.push(error.message);res.destroy()}));
 async function serve(req,res){
  const url=new URL(req.url,'http://localhost'),json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value))};
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'");
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.endsWith('/config'))return json({ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:base,supabaseAnonKey:'fixture'});
   const fixture=fixtures.get((req.headers.authorization||'').replace(/^Bearer /,''));
   if(url.pathname.endsWith('/client-error')){serverErrors.push('Unexpected app diagnostic: '+(await body(req)).errorName);return json({ok:true})}
   if(!fixture)return json({ok:false},401);
   if(url.pathname.endsWith('/health-consent'))return json({ok:true,receipt:{action:'granted',consentVersion:'2026-08-31-v1',policyVersion:'1.5',purposes:['account_cloud_sync']}});
   if(url.pathname.endsWith('/account')&&req.method==='DELETE')return json({ok:true,deleted:fixture.allowDeletion===true});
   if(url.pathname.endsWith('/state')){
    if(req.method==='PUT'){const sent=await body(req);if(sent.baseUpdatedAt!==fixture.revision)return json({ok:false,code:'STATE_CONFLICT'},409);fixture.state=sent.state;fixture.writes++;fixture.revision=new Date(Date.parse(fixture.revision)+1000).toISOString()}
    return json({ok:true,state:fixture.state,updatedAt:fixture.revision});
   }
   return json({ok:true});
  }
  if(url.pathname.startsWith('/_vercel/')){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('')}
  if(['/work-gym-planner/','/work-gym-planner/index.html'].includes(url.pathname)){res.writeHead(307,{Location:'/work-gym-planner/shell.html'+url.search});return res.end()}
  const file=resolve(root,'.'+url.pathname);if(!file.startsWith(root+'/')){res.writeHead(403);return res.end()}
  try{res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file))}catch{res.writeHead(404);res.end('Not found')}
 }
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));expect(serverErrors).toEqual([])});
async function readyAccount(page){
 await expect.poll(()=>page.evaluate(()=>['ready','choice'].includes(window.WGC18?.accountState))).toBe(true);
 if(await page.evaluate(()=>WGC18.accountState==='choice'))await page.locator('#loadSavedAccount').click();
 await expect.poll(()=>page.evaluate(()=>WGC18.cloudStateReady)).toBe(true);
 if(await page.locator('#accountDialog').isVisible())await page.locator('#accountDialog').getByRole('button',{name:'Done',exact:true}).click();
}
async function setup(page){
 const token='calendar-fixture-'+(++sequence),fixture={writes:0,revision:'2026-09-03T12:00:00.000Z',state:{storage:{'wgp-v15-profile':JSON.stringify(savedProfile),'wgp-v15-schedule-sources-v25':JSON.stringify([source]),'wgp-v15-schedule-events-v25':JSON.stringify([oldShift]),'wgp-v15-schedule-rotations-v25':JSON.stringify([oldRotation]),'wgp-v15-schedule-sources-initialized-v25':'true'}}};
 fixtures.set(token,fixture);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-09-03T12:00:00Z'));
 await page.addInitScript(token=>{localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:token,expires_at:4102444800,user:{id:'calendar-fixture',email:'calendar@example.test'}}));localStorage.setItem('wgc-v18-local-owner','calendar-fixture')},token);
 await page.goto(base+'/work-gym-planner/',{waitUntil:'domcontentloaded'});await readyAccount(page);
 await page.locator('.bottomNav [data-page="calendar"]').click();await expect(page.locator('#calendarHeading')).toContainText('September 2026');
 return{fixture,errors,token};
}
async function verifySavedRecords(page){expect(await page.evaluate(()=>WWV25.events().find(x=>x.id==='old-shift'))).toEqual(oldShift);expect(await page.evaluate(()=>WWV25.rotations().find(x=>x.id==='old-rotation'))).toEqual(oldRotation)}

async function openHours(page){await page.locator('#calendarWorkPayV58').click();await expect(page.locator('#wpTitleV58')).toHaveText('Hours & pay')}
async function saveRules(page){
 await page.locator('#wpRulesV58').click();const form=page.locator('#wpRulesFormV58');
 await form.locator('[name="rate"]').fill('20');await form.locator('[name="period"]').selectOption('weekly');await form.locator('[name="anchor"]').fill('2026-08-31');await form.locator('[name="timeZone"]').fill('UTC');
 await form.getByRole('button',{name:'Save pay rules'}).click();await expect(form).toHaveCount(0);
}
for(const width of [375,1440])test.describe(width+'px Hours and pay',()=>{
 test.use({viewport:{width,height:900}});
 test('calendar hours, pay rules, confirm/edit/restore, deductions and private CSV',async({page},info)=>{
  const {fixture,errors}=await setup(page);await openHours(page);
  await expect(page.locator('#wpHoursV58')).toContainText('8');await expect(page.locator('#wpGrossV58')).toContainText('rates');
  await saveRules(page);await expect(page.locator('#wpGrossV58')).toHaveText('$160.00');
  await page.screenshot({path:info.outputPath('hours-overview.png')});
  await page.locator('[data-wp-entry]').first().click();let form=page.locator('#wpEntryFormV58');
  await form.locator('[name="breakMinutes"]').fill('30');await expect(page.locator('#wpEntryPreviewV58')).toContainText('7.5 paid hours');
  await form.getByRole('button',{name:'Confirm hours'}).click();await expect(page.locator('#wpGrossV58')).toHaveText('$150.00');
  await verifySavedRecords(page);
  await page.locator('[data-wp-view="confirmed"]').click();await expect(page.locator('#wpHoursV58')).toHaveText('7.5 h');
  await page.locator('[data-wp-entry]').first().click();await page.locator('#wpSkipV58').click();await expect(page.locator('.wpRows .wpRow')).toHaveCount(0);
  await page.getByText('Excluded entries · 1',{exact:true}).click();await page.locator('[data-wp-restore]').click();
  await page.locator('[data-wp-view="forecast"]').click();await expect(page.locator('#wpGrossV58')).toHaveText('$160.00');
  await page.locator('#wpRulesV58').click();form=page.locator('#wpRulesFormV58');
  await form.locator('summary').filter({hasText:'Deductions'}).click();
  await form.locator('[name="withholdingPercent"]').fill('20');await page.locator('#wpAddDeductionV58').click();
  await form.locator('[data-deduction="name"]').fill('Pension');await form.locator('[data-deduction="amount"]').fill('10');
  await page.screenshot({path:info.outputPath('pay-rules.png')});
  await form.getByRole('button',{name:'Save pay rules'}).click();
  await page.locator('.wpBreakdown summary').click();await expect(page.locator('#wpNetV58')).toHaveText('$120.00');
  await page.locator('#wpPayslipV58').click();await page.locator('[name="takeHome"]').fill('118');await page.getByRole('button',{name:'Save comparison'}).click();await page.locator('.wpBreakdown summary').click();await expect(page.locator('.wpBreakdown')).toContainText('Difference: -$2.00');
  await page.evaluate(()=>WGC18.pushState({quiet:true}));expect(Object.keys(fixture.state.storage).some(k=>k.startsWith('ww-workpay'))).toBe(false);
  const downloaded=page.waitForEvent('download');await page.locator('#wpExportV58').click();const download=await downloaded;expect(download.suggestedFilename()).toContain('work-hours-2026-08-31');
  const csv=await readFile(await download.path(),'utf8');expect(csv).toContain('Estimated gross');expect(csv).not.toContain('calendar@example.test');
  expect(await page.locator('#workPayDialogV58 .sheet').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('#workPayDialogV58')).toBeHidden();await expect(page.locator('#calendarWorkPayV58')).toBeFocused();expect(errors).toEqual([]);
 });
 test('timer survives reload, handles unpaid breaks, and saves only after review',async({page},info)=>{
  const {errors}=await setup(page);await openHours(page);await saveRules(page);await page.locator('#wpClockInV58').click();await page.getByRole('button',{name:'Start clock',exact:true}).click();
  await expect(page.locator('#wpBreakV58')).toHaveText('Start break');
  await page.clock.setFixedTime(new Date('2026-09-03T13:00:00Z'));await page.locator('#wpBreakV58').click();await expect(page.locator('#wpBreakV58')).toHaveText('End break');
  await page.clock.setFixedTime(new Date('2026-09-03T13:30:00Z'));await page.locator('#wpBreakV58').click();await expect(page.locator('#wpBreakV58')).toHaveText('Start break');
  await page.evaluate(async()=>{await WGC18.pushState({quiet:true});await WGC18.waitForPendingSync?.()});
  // A save completed during navigation can require the existing saved-copy
  // choice. Honor that guard; local pay records must survive cloud restoration.
  await page.reload();await readyAccount(page);await page.locator('.bottomNav [data-page="calendar"]').click();await openHours(page);
  await page.clock.setFixedTime(new Date('2026-09-03T15:00:00Z'));await page.locator('#wpClockOutV58').click();await expect(page.locator('#wpEntryPreviewV58')).toContainText('2.5 paid hours');await page.locator('#wpCancelV58').click();
  expect(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('ww-workpay-v58:calendar-fixture')).records).length)).toBe(0);
  await page.locator('#wpClockOutV58').click();await page.getByRole('button',{name:'Confirm hours'}).click();
  await page.locator('[data-wp-view="confirmed"]').click();await expect(page.locator('#wpHoursV58')).toHaveText('2.5 h');await expect(page.locator('#wpGrossV58')).toHaveText('$50.00');
  await page.locator('[data-wp-entry]').click();await page.locator('[name="start"]').fill('12:30');await expect(page.locator('#wpEntryPreviewV58')).toContainText('2 paid hours');await page.getByRole('button',{name:'Confirm hours'}).click();await expect(page.locator('#wpGrossV58')).toHaveText('$40.00');
  await page.screenshot({path:info.outputPath('confirmed-timer.png')});await verifySavedRecords(page);expect(errors).toEqual([]);
 });
});
test('pay records remain owner-scoped and only successful deletion clears them',async({page})=>{
 const {fixture,errors}=await setup(page);await openHours(page);await saveRules(page);
 await page.evaluate(()=>localStorage.setItem('ww-workpay-v58:other-account','private'));
 await expect(page.evaluate(()=>WGC18.deleteAccount('DELETE ACCOUNT','calendar-fixture'))).rejects.toThrow('not confirmed');
 expect(await page.evaluate(()=>!!localStorage.getItem('ww-workpay-v58:calendar-fixture'))).toBe(true);
 fixture.allowDeletion=true;await page.evaluate(()=>WGC18.deleteAccount('DELETE ACCOUNT','calendar-fixture'));
 expect(await page.evaluate(()=>localStorage.getItem('ww-workpay-v58:calendar-fixture'))).toBe(null);expect(await page.evaluate(()=>localStorage.getItem('ww-workpay-v58:other-account'))).toBe('private');expect(errors).toEqual([]);
});
test('draft conflicts, account switching and native export preserve private pay data',async({page})=>{
 const {errors}=await setup(page);await openHours(page);await saveRules(page);await page.locator('#wpRulesV58').click();await page.locator('[name="rate"]').fill('99');
 await page.evaluate(()=>{const key='ww-workpay-v58:calendar-fixture',s=JSON.parse(localStorage.getItem(key));s.revision++;s.rules['old-source'].rate=21;localStorage.setItem(key,JSON.stringify(s));window.dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(s)}))});
 await page.getByRole('button',{name:'Save pay rules'}).click();await expect(page.locator('#wpStatusV58')).toContainText('changed in another tab');
 await page.locator('#wpCancelV58').click();await expect(page.locator('#wpGrossV58')).toHaveText('$168.00');
 await page.evaluate(()=>{window.WGPNative={isNative:true};window.downloadBlob=async(blob,name)=>{window.__payExport={text:await blob.text(),name,type:blob.type}}});
 await page.locator('#wpExportV58').click();await expect.poll(()=>page.evaluate(()=>window.__payExport?.name)).toContain('work-hours-');expect(await page.evaluate(()=>window.__payExport.type)).toContain('text/csv');
 await page.evaluate(()=>{WGC18.session.user.id='second-user';window.dispatchEvent(new CustomEvent('wgc:authchange'))});await expect(page.locator('#workPayDialogV58')).toBeHidden();
 await page.evaluate(()=>WWWorkPay.open());await expect(page.locator('#wpGrossV58')).toContainText('rates');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ww-workpay-v58:calendar-fixture')).rules['old-source'].rate)).toBe(21);expect(errors).toEqual([]);
});
