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
async function setup(page){
 const token='calendar-fixture-'+(++sequence),fixture={writes:0,revision:'2026-09-03T12:00:00.000Z',state:{storage:{'wgp-v15-profile':JSON.stringify(savedProfile),'wgp-v15-schedule-sources-v25':JSON.stringify([source]),'wgp-v15-schedule-events-v25':JSON.stringify([oldShift]),'wgp-v15-schedule-rotations-v25':JSON.stringify([oldRotation]),'wgp-v15-schedule-sources-initialized-v25':'true'}}};
 fixtures.set(token,fixture);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-09-03T12:00:00'));
 await page.addInitScript(token=>{localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:token,expires_at:4102444800,user:{id:'calendar-fixture',email:'calendar@example.test'}}));localStorage.setItem('wgc-v18-local-owner','calendar-fixture')},token);
 await page.goto(base+'/work-gym-planner/',{waitUntil:'domcontentloaded'});await expect.poll(()=>page.evaluate(()=>window.WGC18?.cloudStateReady)).toBe(true);
 await page.locator('.bottomNav [data-page="calendar"]').click();await expect(page.locator('#calendarHeading')).toContainText('September 2026');
 return{fixture,errors,token};
}
async function verifySavedRecords(page){expect(await page.evaluate(()=>WWV25.events().find(x=>x.id==='old-shift'))).toEqual(oldShift);expect(await page.evaluate(()=>WWV25.rotations().find(x=>x.id==='old-rotation'))).toEqual(oldRotation)}
for(const width of [375,1440])test.describe(`${width}px discoverable calendar`,()=>{
 test.use({viewport:{width,height:900}});
 test('front-page source creation uses named colors and keeps existing schedules',async({page,browser},info)=>{
  const {fixture,errors,token}=await setup(page);
  for(const id of ['calendarSelectDatesV54','calendarWorkSourceV54']){await expect(page.locator('#'+id)).toBeVisible();const r=await page.locator('#'+id).boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width);expect(r.y+r.height).toBeLessThan(900)}
  await page.screenshot({path:info.outputPath('calendar-shortcuts.png')});
  await page.locator('#calendarWorkSourceV54').click();const form=page.locator('#calendarWorkSourceFormV54');
  expect(await form.locator('select option').allTextContents()).toEqual(['Blue','Lime green','Purple','Amber','Pink','Cyan','Coral','Mint green']);
  await form.locator('[name="name"]').fill('Weekend clinic');await form.locator('[name="color"]').selectOption({label:'Purple'});await form.locator('[name="overtimeThreshold"]').fill('36');
  await expect(form.locator('.calendarSourcePreviewV54')).toContainText('Purple · Weekend clinic');await page.screenshot({path:info.outputPath('work-source.png')});
  await form.getByRole('button',{name:'Add work source',exact:true}).click();await expect(form).toHaveCount(0);
  const sources=await page.evaluate(()=>WWV25.sources());expect(sources).toHaveLength(2);expect(sources[0]).toEqual(source);expect(sources[1]).toMatchObject({name:'Weekend clinic',color:'#a78bfa',overtimeThreshold:36,enabled:true});await verifySavedRecords(page);
  await page.locator('#calendarWorkSourceV54').click();await form.locator('[name="name"]').fill('Existing workplace');await form.getByRole('button',{name:'Add work source',exact:true}).click();await expect(form).toBeVisible();expect(await page.evaluate(()=>WWV25.sources().length)).toBe(2);await page.keyboard.press('Escape');
  await page.locator('#calendarWorkSourceV54').click();await form.locator('[name="name"]').fill('Discard this draft');await form.locator('[data-source-cancel]').click();expect(await page.evaluate(()=>WWV25.sources().length)).toBe(2);
  // Verify restoration on a second device, not a reload racing a background save.
  await page.evaluate(()=>WGC18.pushState({quiet:true}));expect(JSON.parse(fixture.state.storage['wgp-v15-schedule-sources-v25'])).toHaveLength(2);
  const second=await browser.newContext({viewport:{width,height:900}});
  try{
   await second.addInitScript(token=>{localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:token,expires_at:4102444800,user:{id:'calendar-fixture',email:'calendar@example.test'}}));localStorage.setItem('wgc-v18-local-owner','calendar-fixture')},token);
   const restored=await second.newPage();restored.on('pageerror',e=>errors.push(e.message));await restored.clock.setFixedTime(new Date('2026-09-03T12:00:00'));
   await restored.goto(base+'/work-gym-planner/');await expect.poll(()=>restored.evaluate(()=>WGC18.cloudStateReady)).toBe(true);expect(await restored.evaluate(()=>WWV25.sources().length)).toBe(2);await verifySavedRecords(restored);
  }finally{await second.close()}
  await page.locator('.bottomNav [data-page="calendar"]').click();await page.locator('#calendarFilterV42').click();await page.locator('[data-calendar-settings]').click();await page.locator('[data-planner-open="sources"]').click();
  expect(await page.locator('#sourceColorV25 option').allTextContents()).toEqual(['Blue','Lime green','Purple','Amber','Pink','Cyan','Coral','Mint green']);expect(errors).toEqual([]);
 });
 test('front-page multi-select stays clear, works across months and requires review',async({page},info)=>{
  const {errors}=await setup(page);await page.locator('#calendarSelectDatesV54').click();await expect(page.locator('#calendarSelectDatesV54')).toHaveAttribute('aria-pressed','true');
  for(const key of ['2026-09-03','2026-09-04','2026-09-10'])await page.locator(`#calendarGrid [data-date="${key}"]`).click();
  await expect(page.locator('#dayCard')).toBeHidden();await expect(page.locator('body')).not.toHaveClass(/calendarDaySheetOpenV42/);
  await page.locator('#calendarGrid [data-date="2026-09-04"]').click();await page.locator('#calNext').click();await page.locator('#calendarGrid [data-date="2026-10-01"]').click();await page.locator('#calPrev').click();
  await expect(page.locator('#calendarGrid .shiftPickV35')).toHaveCount(2);await expect(page.locator('#reviewPickedShiftsV35')).toHaveText('Review 3 shifts');await page.screenshot({path:info.outputPath('select-dates.png')});
  await page.locator('#reviewPickedShiftsV35').click();await expect(page.locator('#proposalSaveV25')).toBeVisible();expect(await page.evaluate(()=>WWV25.events().length)).toBe(1);
  await page.locator('#proposalSaveV25').click();await expect.poll(()=>page.evaluate(()=>WWV25.events().length)).toBe(4);await verifySavedRecords(page);
  await page.locator('#calendarSelectDatesV54').click();await page.locator('#cancelShiftPickerV35').click();await expect(page.locator('#calendarSelectDatesV54')).toHaveAttribute('aria-pressed','false');expect(errors).toEqual([]);
 });
 test('custom rotation starts this week, preserves toggles, and saves the displayed dates',async({page},info)=>{
  const {fixture,errors}=await setup(page);
  // A stale previously-selected calendar date must not become a generic rotation week.
  await page.evaluate(()=>{selectedDate='2026-12-28'});
  await page.locator('#calendarAddV42').click();await page.locator('[data-add-kind="work"]').click();await page.locator('[data-flow-next]').click();await page.locator('[data-pattern="custom"]').click();
  await expect(page.locator('.calendarPatternListV42')).toHaveCount(0);await expect(page.locator('[data-change-pattern]')).toBeVisible();
  await expect(page.locator('[data-rotation-date]').first()).toHaveAttribute('data-rotation-date','2026-08-31');await expect(page.locator('[data-rotation-date="2026-09-03"]')).toHaveAttribute('aria-current','date');
  await expect(page.locator('.customRotationV42')).not.toContainText('Week A');await expect(page.locator('.customRotationV42')).not.toContainText('Week B');
  await page.locator('[data-rotation-day="0"]').click();await expect(page.locator('[data-rotation-day="0"]')).toHaveAttribute('aria-pressed','false');
  await page.locator('[data-change-pattern]').click();await page.locator('[data-pattern="custom"]').click();await expect(page.locator('[data-rotation-day="0"]')).toHaveAttribute('aria-pressed','false');
  await page.locator('[data-rotation-week="1"]').click();await expect(page.locator('[data-rotation-day="0"]')).toHaveAttribute('data-rotation-date','2026-09-07');await expect(page.locator('[data-rotation-day="0"]')).toHaveAttribute('aria-pressed','false');
  await page.locator('[data-rotation-this-week]').click();await page.locator('[name="weeks"]').selectOption('3');await expect(page.locator('[data-rotation-date]')).toHaveCount(21);await expect(page.locator('[data-rotation-day="20"]')).toHaveAttribute('data-rotation-date','2026-09-20');
  await page.locator('.customRotationV42').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('dated-rotation.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const preview=await page.locator('[data-rotation-date]').evaluateAll(buttons=>buttons.map(b=>({date:b.dataset.rotationDate,work:b.getAttribute('aria-pressed')==='true'})));
  await page.locator('[data-flow-next]').click();await expect(page.locator('[name="anchor"]')).toHaveValue('2026-08-31');await expect(page.locator('.rotationReviewDatesV54')).toContainText('Sep 20, 2026');await page.locator('[data-flow-next]').click();
  const saved=await page.evaluate(()=>WWV25.rotations().find(x=>x.id!=='old-rotation'));expect(saved.anchor).toBe('2026-08-31');expect(saved.pattern).toEqual(preview.map(d=>d.work?'D':'O'));await verifySavedRecords(page);
  const actual=await page.evaluate(({saved,preview})=>preview.map(d=>!!WWScheduling.rotationEventOn(saved,d.date,WWV25.sources()[0])),{saved,preview});expect(actual).toEqual(preview.map(d=>d.work));
  await page.evaluate(()=>WGC18.pushState({quiet:true}));expect(JSON.parse(fixture.state.storage['wgp-v15-schedule-rotations-v25'])).toHaveLength(2);expect(errors).toEqual([]);
 });
});
