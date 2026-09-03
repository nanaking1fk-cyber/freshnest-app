import {test,expect} from '@playwright/test';

const savedProfile={id:'calendar-fixture',name:'Calendar test',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Work',anchor:'2026-08-31',pattern:[0,0,0,0,0,0,0],start:'07:00',end:'19:00',commuteMin:20},variable:{enabled:false,name:'Extra work',start:'',end:'',commuteMin:20}};
async function setup(page){
 const errors=[];let savedState=null;page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'fixture-token',expires_at:4102444800,user:{id:'calendar-fixture',email:'calendar@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','calendar-fixture');
  localStorage.setItem('wgc-health-consent-v35:calendar-fixture',JSON.stringify({action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']}));
 });
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let value={ok:true};
  if(path.endsWith('/config'))value={ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};
  if(path.endsWith('/health-consent'))value={ok:true,receipt:{action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync']}};
  if(path.endsWith('/state')&&route.request().method()==='PUT'){savedState=route.request().postDataJSON().state;return route.fulfill({status:200,json:{ok:true,updatedAt:new Date().toISOString()}})}
  if(path.endsWith('/state'))value={ok:true,state:savedState||{storage:{'wgp-v15-calendar-items':JSON.stringify({'2026-09-03':[{id:'old-event',title:'Existing personal plan',time:'10:00',type:'event',done:false}]}),'wgp-v15-profile':JSON.stringify(savedProfile),'wgp-v15-schedule-sources-v25':JSON.stringify([{id:'work-fixture',name:'Work',enabled:true,color:'#62a0ff'}]),'wgp-v15-schedule-sources-initialized-v25':'true'}},updatedAt:'2026-09-03T12:00:00Z'};
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


for(const viewport of [{width:390,height:844},{width:1440,height:1000}])test.describe(`${viewport.width}px personal calendar`,()=>{
 test.use({viewport,serviceWorkers:'block'});
 test('personal event entry saves times, preserves older plans, and supports edit and remove',async({page},info)=>{
  const errors=await setup(page),before=await page.evaluate(()=>WWV25.events());
  await page.locator('#calendarGrid [data-date="2026-09-03"]').click();await page.locator('[data-calendar-add-day]').click();
  await expect(page.locator('[data-add-kind="personal"]')).toBeVisible();await page.locator('[data-add-kind="personal"]').click();
  const form=page.locator('#calendarPersonalFormV47');await expect(form.locator('[name="date"]')).toHaveValue('2026-09-03');
  await form.locator('[name="title"]').fill('Dinner with friends');await form.locator('[name="time"]').fill('18:30');await form.locator('[name="end"]').fill('20:00');
  await page.screenshot({path:info.outputPath('personal-event-form.png')});
  await form.getByRole('button',{name:'Save event',exact:true}).click();await expect(form).toHaveCount(0);
  expect(await page.evaluate(()=>personalItemsOn('2026-09-03').map(x=>x.title))).toEqual(['Existing personal plan','Dinner with friends']);
  expect(await page.evaluate(()=>WWV25.events())).toEqual(before);
  await page.locator('#calendarGrid [data-date="2026-09-03"]').click();await expect(page.locator('.calendarDayBriefV42')).toContainText('Dinner with friends');
  await page.locator('[data-calendar-manage-day]').click();await page.getByRole('button',{name:'Edit Dinner with friends',exact:true}).click();
  const edit=page.locator('[data-agenda-form]');await expect(edit.locator('[name="end"]')).toHaveValue('20:00');
  await edit.locator('[name="title"]').fill('Dinner with family');await edit.locator('[name="end"]').fill('21:00');await edit.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.locator('.calendarDayBriefV42')).toContainText('Dinner with family');await page.getByRole('button',{name:'Remove Dinner with family',exact:true}).click();
  expect(await page.evaluate(()=>personalItemsOn('2026-09-03').map(x=>x.title))).toEqual(['Existing personal plan']);expect(errors).toEqual([]);
 });
 test('Compact and Detailed are visible and apply in month and week, including personal filters',async({page},info)=>{
  const errors=await setup(page);await page.evaluate(()=>{WWV25.saveEvents([{id:'fixture-shift',kind:'work',date:'2026-09-04',title:'Work',sourceId:'work-fixture',sourceName:'Work',start:'07:00',end:'19:00'}]);renderCalendar()});
  const compact=page.locator('[data-calendar-display="compact"]'),detailed=page.locator('[data-calendar-display="details"]'),day=page.locator('#calendarGrid [data-date="2026-09-03"]');
  await expect(compact).toBeVisible();await expect(detailed).toBeVisible();await expect(compact).toHaveAttribute('aria-pressed','true');
  await expect(day.locator('.calendarMarkerV42.personal')).toBeVisible();await expect(day.locator('.calendarCellDetailsV47')).toBeHidden();
  await page.screenshot({path:info.outputPath('compact.png')});await detailed.click();
  await expect(day.locator('.calendarCellDetailsV47')).toBeVisible();await expect(day.locator('.calendarCellDetailsV47')).toContainText('Existing personal plan');await expect(page.locator('#calendarGrid [data-date="2026-09-04"] .calendarCellDetailsV47')).toContainText('7:00 AM');await expect(day.locator('.calendarCellDetailsV47')).toContainText('10:00');
  await page.screenshot({path:info.outputPath('detailed.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-calendar-view="week"]').click();const week=page.locator('#calendarWeekRailV33 [data-week-date="2026-09-03"]');
  await expect(week.locator('.calendarCellDetailsV47')).toBeVisible();await expect(week.locator('.calendarCellDetailsV47')).toContainText('Existing personal plan');
  await compact.click();await expect(week.locator('.calendarCellDetailsV47')).toBeHidden();await detailed.click();
  await page.locator('#calendarFilterV42').click();await page.locator('#calendarFiltersSheetV42 [name="personal"]').uncheck();await page.locator('[data-save-filters]').click();
  await expect(week.locator('.calendarMarkerV42.personal')).toHaveCount(0);await expect(week.locator('.calendarCellDetailsV47')).not.toContainText('Existing personal plan');
  expect(await page.evaluate(()=>personalItemsOn('2026-09-03').length)).toBe(1);
  await page.reload({waitUntil:'domcontentloaded'});await expect.poll(()=>page.evaluate(()=>window.WGC18?.cloudStateReady)).toBe(true);await page.locator('.bottomNav [data-page="calendar"]').click();
  await expect(detailed).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
 });
 test('all-day repeating events and cancellation work without changing work schedules',async({page},info)=>{
  const errors=await setup(page);await page.locator('#calendarAddV42').click();await page.locator('[data-add-kind="personal"]').click();
  const form=page.locator('#calendarPersonalFormV47');await form.locator('[name="title"]').fill('Family birthday');await form.locator('[name="date"]').fill('2026-09-12');await form.locator('[name="allDay"]').check();
  await expect(form.locator('[data-personal-times]')).toBeHidden();await form.locator('[name="frequency"]').selectOption('yearly');await form.getByRole('button',{name:'Save event',exact:true}).click();
  expect(await page.evaluate(()=>recurringCalendarItemsOn('2027-09-12').map(x=>({title:x.title,time:x.time})))).toEqual([{title:'Family birthday',time:''}]);expect(await page.evaluate(()=>WWV25.events())).toEqual([]);
  await page.locator('#calendarAddV42').click();await page.locator('[data-add-kind="personal"]').click();await form.locator('[name="title"]').fill('Discard me');await form.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await page.evaluate(()=>agendaItemsOn('2026-09-12').map(x=>x.title))).toEqual(['Family birthday']);expect(errors).toEqual([]);
 });
});
