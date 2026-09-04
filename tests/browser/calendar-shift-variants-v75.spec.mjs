import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');

const sourceId='hospital';
const agreement={termsVersion:'1.2',privacyVersion:'1.6',acceptedAt:'2026-09-04T12:00:00Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'};
const receipt={action:'granted',consentVersion:'2026-08-31-v1',agreement,purposes:['account_cloud_sync']};
async function start(page,width){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width,height:width<600?844:900});
 await page.clock.setFixedTime(new Date('2026-09-07T12:00:00Z'));
 await page.route('**/api/**',route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname.endsWith('/config'))return route.fulfill({json:{cloudConfigured:true,aiConfigured:false,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'}});
  if(pathname.endsWith('/health-consent'))return route.fulfill({json:{ok:true,receipt}});
  if(pathname.endsWith('/state'))return route.fulfill({json:{ok:true,state:{storage:{
   'wgp-v15-profile':JSON.stringify({name:'Alex',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:false},variable:{enabled:false}}),
   'wgp-v15-schedule-sources-v25':JSON.stringify([{id:sourceId,name:'City Hospital',color:'#34d399',enabled:true,overtimeThreshold:40}]),
   'wgp-v15-schedule-sources-initialized-v25':'true','wgp-v15-schedule-events-v25':'[]','wgp-v15-schedule-rotations-v25':'[]'
  }},updatedAt:'2026-09-04T12:00:00Z'}});
  return route.fulfill({json:{ok:true}});
 });
 await page.route('**/_vercel/**',route=>route.fulfill({body:''}));
 await page.addInitScript(({receipt})=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'fixture-only',expires_at:4102444800,user:{id:'shift-fixture',email:'shift@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','shift-fixture');localStorage.setItem('wgc-health-consent-v35:shift-fixture',JSON.stringify(receipt));
 },{receipt});
 await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>window.WGC18?.cloudStateReady)).toBe(true);
 await page.locator('nav [data-page="calendar"]').click();await expect(page.locator('#calendarAddV42')).toBeVisible();
 return errors;
}
async function openRepeatingShift(page){
 await page.locator('#calendarAddV42').click();await page.locator('[data-add-kind="workmenu"]').click();await page.locator('[data-add-kind="work"]').click();
 await expect(page.getByText('Which shift do you work?',{exact:true})).toBeVisible();
}
async function saveCurrentSchedule(page,date){
 await page.locator('[data-flow-next]').click();await page.locator('[data-pattern="weekdays"]').click();await page.locator('[data-flow-next]').click();
 await page.locator('[name="anchor"]').fill(date);await page.locator('[data-flow-next]').click();await expect(page.locator('#calendarAddFlowV42')).toHaveCount(0);
}

test('one workplace saves separate Evening and Night rotations with their colors',async({page})=>{
 const errors=await start(page,1280);await openRepeatingShift(page);
 await expect(page.locator('[data-shift-variant]')).toHaveCount(3);await page.locator('[data-shift-variant="evening"]').click();
 const sheet=page.locator('#calendarAddFlowV42');await expect(sheet.locator('[name="start"]')).toHaveValue('15:00');await expect(sheet.locator('[name="end"]')).toHaveValue('23:00');
 await sheet.locator('[name="start"]').fill('16:00');await sheet.locator('[name="end"]').fill('00:00');
 await page.screenshot({path:'/private/tmp/ww-shifts75-desktop.png',fullPage:true});await saveCurrentSchedule(page,'2026-09-07');
 await openRepeatingShift(page);await page.locator('[data-shift-variant="night"]').click();await saveCurrentSchedule(page,'2026-09-14');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wgp-v15-schedule-rotations-v25')));
 expect(saved).toHaveLength(2);expect(saved.map(item=>item.sourceId)).toEqual([sourceId,sourceId]);
 expect(saved[0]).toMatchObject({shiftVariantId:'evening',shiftLabel:'Evening shift',shiftColor:'#f59e0b',dayStart:'16:00',dayEnd:'00:00'});
 expect(saved[1]).toMatchObject({shiftVariantId:'night',shiftLabel:'Night shift',shiftColor:'#a78bfa',dayStart:'23:00',dayEnd:'07:00'});
 expect(errors).toEqual([]);
});

test('shift choices and multi-date controls fit a phone viewport',async({page})=>{
 const errors=await start(page,390);await openRepeatingShift(page);
 const choices=page.locator('.calendarShiftChoicesV75');await expect(choices).toBeVisible();
 expect(await choices.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 for(const id of ['day','evening','night'])await expect(page.locator(`[data-shift-variant="${id}"]`)).toBeVisible();
 await page.screenshot({path:'/private/tmp/ww-shifts75-mobile.png',fullPage:true});
 await page.locator('[data-sheet-back]').click();await page.locator('[data-sheet-back]').click();
 await page.locator('#calendarSelectDatesV54').click();await expect(page.locator('.shiftPickerVariantsV75')).toBeVisible();
 expect(await page.locator('#shiftPickerBarV35').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 await page.locator('[data-picker-variant="night"]').click();await expect(page.locator('#shiftPickerStartV35')).toHaveValue('23:00');await expect(page.locator('#shiftPickerEndV35')).toHaveValue('07:00');
 expect(errors).toEqual([]);
});
