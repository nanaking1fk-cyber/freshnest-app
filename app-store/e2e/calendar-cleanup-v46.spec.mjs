import {test,expect} from '@playwright/test';

const savedProfile={id:'calendar-fixture',name:'Calendar test',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Work',anchor:'2026-08-31',pattern:[0,0,0,0,0,0,0],start:'07:00',end:'19:00',commuteMin:20},variable:{enabled:false,name:'Extra work',start:'',end:'',commuteMin:20}};
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'fixture-token',expires_at:4102444800,user:{id:'calendar-fixture',email:'calendar@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','calendar-fixture');
  localStorage.setItem('wgc-health-consent-v35:calendar-fixture',JSON.stringify({action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']}));
 });
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let value={ok:true};
  if(path.endsWith('/config'))value={ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};
  if(path.endsWith('/health-consent'))value={ok:true,receipt:{action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']}};
  if(path.endsWith('/state'))value={ok:true,state:{storage:{'wgp-v15-profile':JSON.stringify(savedProfile),'wgp-v15-schedule-sources-v25':JSON.stringify([{id:'work-fixture',name:'Work',enabled:true,color:'#62a0ff'}]),'wgp-v15-schedule-sources-initialized-v25':'true'}},updatedAt:'2026-09-03T12:00:00Z'};
  return route.fulfill({status:200,json:value});
 });
 await page.route('**/_vercel/**',route=>route.fulfill({status:200,body:''}));
 await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>window.WGC18?.cloudStateReady)).toBe(true);
 await page.locator('.bottomNav [data-page="calendar"]').click();
 await page.evaluate(()=>{selectedDate='2026-09-02';calView=new Date(2026,8,2);renderCalendar()});
 await expect(page.locator('#calendarHeading')).toContainText('September 2026');return errors;
}
async function openImport(page){await page.locator('#calendarAddV42').click();await page.locator('[data-open-import]').click();await expect(page.locator('#scheduleAddWaysV35')).toBeVisible()}

for(const viewport of [{width:390,height:844},{width:1440,height:1000}])test.describe(`${viewport.width}px clean calendar`,()=>{
 test.use({viewport,serviceWorkers:'block'});
 test('roster entry is quiet; only Type or paste reveals Effortless input',async({page},info)=>{
  const errors=await setup(page);await openImport(page);
  await expect(page.locator('#smartCaptureV19')).toBeHidden();
  await expect(page.locator('#uploadWorkRosterV35')).toBeVisible();await expect(page.locator('#typeWorkScheduleV35')).toHaveAttribute('aria-expanded','false');
  await page.screenshot({path:info.outputPath('input-choices.png')});
  await page.locator('#typeWorkScheduleV35').click();await expect(page.locator('.smartCaptureIntro')).toBeVisible();await expect(page.locator('#scheduleImportV24')).toBeHidden();
  await page.locator('#smartCaptureInput').fill('Work Monday 7am-7pm');
  await page.locator('#plannerPane-add .calendarPaneBackV42').click();await openImport(page);
  await expect(page.locator('#smartCaptureV19')).toBeHidden();await page.locator('#typeWorkScheduleV35').click();
  await expect(page.locator('#smartCaptureInput')).toHaveValue('Work Monday 7am-7pm');expect(errors).toEqual([]);
 });
 test('photo or PDF shows only upload controls and keeps extracted-schedule review visible',async({page},info)=>{
  const errors=await setup(page);await openImport(page);await page.locator('#uploadWorkRosterV35').click();
  await expect(page.locator('#scheduleImportV24')).toBeVisible();await expect(page.locator('.smartCaptureIntro')).toBeHidden();await expect(page.locator('#smartCaptureInput')).toBeHidden();
  await expect(page.locator('#rosterIdentityV31')).toBeVisible();await page.screenshot({path:info.outputPath('upload-controls.png')});
  // Exercise the OCR-to-review boundary with fixture text, without uploading a real roster.
  await page.evaluate(()=>WGC19.reviewRawText('Work Monday 7am-7pm',{sourceType:'ocr'}));
  await expect(page.locator('#proposalSaveV25')).toBeVisible();await expect(page.locator('.smartCaptureIntro')).toBeHidden();expect(errors).toEqual([]);
 });
 test('multi-select never opens a covering day panel and still supports deselection and cross-month review',async({page},info)=>{
  const errors=await setup(page);await openImport(page);await page.locator('#chooseWorkDatesV35').click();
  for(const key of ['2026-09-03','2026-09-04','2026-09-05'])await page.locator('#calendarGrid [data-date="'+key+'"]').click();
  await expect(page.locator('#reviewPickedShiftsV35')).toHaveText('Review 3 shifts');
  await expect(page.locator('body')).not.toHaveClass(/calendarDaySheetOpenV42/);await expect(page.locator('#dayCard')).toBeHidden();
  await page.locator('#calendarGrid [data-date="2026-09-04"]').click();await expect(page.locator('#reviewPickedShiftsV35')).toHaveText('Review 2 shifts');
  await page.locator('#calNext').click();await page.locator('#calendarGrid [data-date="2026-10-01"]').click();
  await page.locator('#calPrev').click();await expect(page.locator('#calendarGrid .shiftPickV35')).toHaveCount(2);
  await page.locator('#calendarGrid').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('multi-select.png')});
  const visibleDate=page.locator('#calendarGrid [data-date="2026-09-17"]');await visibleDate.scrollIntoViewIfNeeded();
  expect(await visibleDate.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);
  await page.locator('#reviewPickedShiftsV35').click();await expect(page.locator('#proposalSaveV25')).toBeVisible();await expect(page.locator('.smartCaptureIntro')).toBeHidden();
  await expect(page.locator('.reviewSignalsV25')).toContainText('3 proposed');expect(await page.evaluate(()=>WWV25.events().length)).toBe(0);expect(errors).toEqual([]);
 });
 test('cancelling multi-select restores ordinary day details; starting selection closes an already open day',async({page})=>{
  const errors=await setup(page);await openImport(page);await page.locator('#chooseWorkDatesV35').click();await page.locator('#cancelShiftPickerV35').click();
  await page.locator('#calendarGrid [data-date="2026-09-03"]').click();await expect(page.locator('body')).toHaveClass(/calendarDaySheetOpenV42/);
  await page.locator('[data-calendar-add-day]').click();await page.locator('[data-open-import]').click();await page.locator('#chooseWorkDatesV35').click();
  await expect(page.locator('body')).not.toHaveClass(/calendarDaySheetOpenV42/);await expect(page.locator('#dayCard')).toBeHidden();expect(errors).toEqual([]);
 });
});
