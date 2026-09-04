import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');
const C=require('../shared/work-pay-v58.js');
const key='ww-workpay-v58:pay-fixture',sourceId='pay-job';
const agreement={termsVersion:'1.2',privacyVersion:'1.6',acceptedAt:'2026-09-03T18:00:00Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'};
const receipt={action:'granted',consentVersion:'2026-08-31-v1',agreement,purposes:['account_cloud_sync']};
const defaults=()=>({...C.defaults(),rate:20,period:'weekly',anchor:'2026-08-31',timeZone:'UTC'});
const calendar=[{id:'pay-shift',sourceId,kind:'work',date:'2026-09-03',start:'09:00',end:'17:00',title:'Hospital shift'}];
async function start(page,{rules=defaults(),records={}}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-09-03T20:00:00Z'));
 await page.route('**/api/**',route=>{
  const p=new URL(route.request().url()).pathname;
  if(p.endsWith('/config'))return route.fulfill({json:{cloudConfigured:true,aiConfigured:false,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'}});
  if(p.endsWith('/health-consent'))return route.fulfill({json:{ok:true,receipt}});
  if(p.endsWith('/state'))return route.fulfill({json:{ok:true,state:{storage:{
   'wgp-v15-profile':JSON.stringify({name:'Alex',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:false},variable:{enabled:false}}),
   'wgp-v15-schedule-sources-v25':JSON.stringify([{id:sourceId,name:'Hospital',enabled:true,color:'#62a0ff'}]),
   'wgp-v15-schedule-sources-initialized-v25':'true',
   'wgp-v15-schedule-events-v25':JSON.stringify(calendar)
  }},updatedAt:'2026-09-03T12:00:00Z'}});
  return route.fulfill({json:{ok:true}});
 });
 await page.route('**/_vercel/**',r=>r.fulfill({body:''}));
 await page.addInitScript(({receipt,key,sourceId,rules,records})=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'fixture-only',expires_at:4102444800,user:{id:'pay-fixture',email:'pay@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','pay-fixture');
  localStorage.setItem('wgc-health-consent-v35:pay-fixture',JSON.stringify(receipt));
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,revision:0,rules:rules?{[sourceId]:rules}:{},records,timer:null,payslips:{}}));
 },{receipt,key,sourceId,rules,records});
 await page.goto('/work-gym-planner/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>window.WGC18?.cloudStateReady)).toBe(true);
 await page.evaluate(()=>WWWorkPay.open());
 await expect(page.locator('#workPayDialogV58')).toHaveClass(/open/);
 await expect(page.locator('#wpSourceV58')).toHaveValue(sourceId);
 return errors;
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const settings=async page=>{await page.locator('#wpRulesV58').click();await expect(page.locator('#wpRulesFormV58')).toBeVisible()};
test('deductions switch between an amount and percent of gross, and persist',async({page})=>{
 await start(page);await settings(page);
 await page.getByText('Estimated taxes & deductions',{exact:true}).count().then(async n=>{if(n)await page.getByText('Estimated taxes & deductions',{exact:true}).click()});
 await page.locator('#wpDeductionsV58').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true});
 await page.locator('#wpAddDeductionV58').click();
 const row=page.locator('.wpDeduction');await row.locator('[data-deduction="name"]').fill('Pension');
 await row.getByRole('button',{name:'% of gross',exact:true}).click();
 await row.locator('[data-deduction="amount"]').fill('5');
 await expect(row.locator('[data-deduction="mode"]')).toHaveValue('percent');
 await row.getByRole('button',{name:'Amount',exact:true}).click();
 await expect(row.locator('[data-deduction="mode"]')).toHaveValue('fixed');
 await row.getByRole('button',{name:'% of gross',exact:true}).click();
 await page.locator('#wpRulesFormV58 button[type="submit"]').click();
 await expect(page.locator('#wpGrossV58')).toBeVisible();
 expect((await saved(page)).rules[sourceId].deductions[0]).toMatchObject({mode:'percent',amount:5});
 await settings(page);await expect(page.locator('[data-deduction="mode"]')).toHaveValue('percent');
});
for(const width of [320,390,1280])test(`calendar fits the viewport with short labels at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await start(page);
 await page.evaluate(()=>WWWorkPay.close());await page.locator('nav [data-page="calendar"]').click();
 await expect(page.locator('#calendarAddV42')).toBeVisible();
 await expect(page.locator('#calendarShareV42')).not.toBeVisible();
 await expect(page.locator('#calendarSelectDatesV54')).toBeVisible();
 await page.locator('#calendarOptionsV67>summary').click();
 const menu=await page.locator('.calendarOptionsBodyV67').boundingBox();expect(menu.x).toBeGreaterThanOrEqual(0);expect(menu.x+menu.width).toBeLessThanOrEqual(width);
 await page.locator('[data-calendar-display="details"]').click();
 const cell=page.locator('.calDay[data-date="2026-09-03"]');
 expect((await cell.boundingBox()).height).toBeLessThanOrEqual(86);
 await expect(cell.locator('.calendarCellItemV47 small')).toHaveCount(0);
 await expect(cell.locator('.calendarCellItemV47.work strong')).toContainText('Hospital');
 await expect(page.locator('nav [data-page="home"]')).toHaveCSS('touch-action','manipulation');
 await page.screenshot({path:`/private/tmp/ww-layout68-${width}.png`,fullPage:true});
 await page.locator('#calendarAddV42').click();
 await expect(page.locator('[data-add-kind]:visible')).toHaveCount(3);
 await page.locator('[data-add-kind="workmenu"]').click();
 await expect(page.getByRole('button',{name:/One shift/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Repeating schedule/})).toBeVisible();
 await page.locator('[data-add-kind="work"]').click();
 await expect(page.getByText('Which shift do you work?',{exact:true})).toBeVisible();
});
const save=async page=>{await page.locator('#wpRulesFormV58 button[type="submit"]').click();await expect(page.locator('#wpGrossV58')).toBeVisible()};

for(const width of [390,1440]){
 test('simple pay setup and tax estimate at '+width,async({page},testInfo)=>{
  await page.setViewportSize({width,height:900});const errors=await start(page,{rules:null});
  await page.locator('#wpSetupV58').click();
  await expect(page.locator('#wpMorePayV65')).not.toHaveAttribute('open');
  await expect(page.locator('#workPayDialogV58 [name="weeklyAfter"]')).not.toBeVisible();
  await expect(page.locator('#workPayDialogV58 [name="withholdingPercent"]')).not.toBeVisible();
  await expect(page.locator('#wpEstimateTaxV65')).not.toBeChecked();
  expect(await page.locator('#wpRulesFormV58 input:visible, #wpRulesFormV58 select:visible').count()).toBe(6);
  await page.locator('#workPayDialogV58 [name="rate"]').fill('20');await page.locator('#workPayDialogV58 [name="period"]').selectOption('weekly');await page.locator('#workPayDialogV58 [name="anchor"]').fill('2026-08-31');
  await page.screenshot({path:'/private/tmp/ww-pay65-settings-'+width+'-'+(process.env.E2E_BROWSER||'chromium')+'.png'});
  await save(page);await expect(page.locator('#wpGrossV58')).toHaveText('$160.00');await expect(page.locator('#wpTakeHomeV65')).toHaveText('—');
  await page.locator('#wpTaxSetupV65').click();await page.locator('#wpEstimateTaxV65').check();await page.locator('#workPayDialogV58 [name="withholdingPercent"]').fill('20');await save(page);
  await expect(page.locator('#wpTakeHomeV65')).toHaveText('$128.00');await expect(page.locator('.wpTaxCaption')).toContainText('$32.00 (20%)');
  await page.screenshot({path:'/private/tmp/ww-pay65-overview-'+width+'-'+(process.env.E2E_BROWSER||'chromium')+'.png'});
  expect(await page.locator('#wpBodyV58').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await settings(page);await page.locator('#workPayDialogV58 [name="period"]').selectOption('monthly');await expect(page.getByLabel('Pay period start',{exact:true})).toHaveValue('2026-08-01');await expect(page.getByLabel('Pay period end',{exact:true})).toHaveValue('2026-08-31');await page.locator('#wpCancelV58').click();
  expect((await saved(page)).rules[sourceId].withholdingPercent).toBe(20);expect(errors).toEqual([]);
 });
 test('log, edit and restore hours without changing calendar at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});const errors=await start(page);
  const original=await page.evaluate(()=>localStorage.getItem('wgp-v15-schedule-events-v25'));
  await page.locator('#wpAddV58').click();await expect(page.locator('#wpShiftOptionsV65')).not.toHaveAttribute('open');
  expect(await page.locator('#wpEntryFormV58 input:visible, #wpEntryFormV58 select:visible').count()).toBe(4);
  await page.locator('#workPayDialogV58 [name="date"]').fill('2026-09-02');await page.locator('#workPayDialogV58 [name="breakMinutes"]').fill('30');
  await expect(page.locator('#wpEntryPreviewV58')).toContainText('7.5 paid hours');
  await page.locator('#wpEntryFormV58 button[type="submit"]').click();await expect(page.locator('.wpRow')).toHaveCount(2);
  let records=(await saved(page)).records;const id=Object.keys(records)[0];expect(records[id].breakMinutes).toBe(30);
  await page.locator('[data-wp-entry="'+id+'"]').click();await page.locator('#workPayDialogV58 [name="end"]').fill('18:00');await page.locator('#wpEntryFormV58 button[type="submit"]').click();await expect(page.locator('#wpGrossV58')).toBeVisible();
  records=(await saved(page)).records;expect(records[id].end).toBe('18:00');expect(records[id].rate).toBe(20);
  await page.locator('[data-wp-entry="'+id+'"]').click();await page.locator('#wpRemoveV58').click();await expect(page.locator('.wpRow')).toHaveCount(1);
  await page.getByText('Excluded entries · 1',{exact:true}).click();await page.locator('[data-wp-restore="'+id+'"]').click();await expect(page.locator('.wpRow')).toHaveCount(2);
  expect(await page.evaluate(()=>localStorage.getItem('wgp-v15-schedule-events-v25'))).toBe(original);
  expect(await page.locator('#wpBodyV58').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(errors).toEqual([]);
 });
}
test('saving basics preserves existing advanced pay settings, ledger and other workplaces',async({page})=>{
 const rules={...defaults(),currency:'NZD',withholdingPercent:12.345,weeklyAfter:40,dailyAfter:8,doubleAfter:12,otMultiplier:1.75,doubleMultiplier:2.5,holidayMultiplier:2,stack:'add',nightDifferential:3.25,weekendDifferential:2.75,differentialPremium:false,breakMinutes:30,deductions:[{name:'Pension',mode:'fixed',timing:'pre',amount:25}]};
 const records={manual:{id:'manual',sourceId,date:'2026-09-01',start:'09:00',end:'17:00',kind:'work',status:'confirmed',rate:18,title:'Saved shift'}};
 await start(page,{rules,records});await page.evaluate(({key,sourceId})=>{const s=JSON.parse(localStorage.getItem(key));s.rules.other={rate:99};s.payslips[sourceId+'|2026-08-31']=100;localStorage.setItem(key,JSON.stringify(s))},{key,sourceId});
 await settings(page);await expect(page.locator('#wpEstimateTaxV65')).toBeChecked();await page.locator('#workPayDialogV58 [name="rate"]').fill('22');await save(page);
 const value=await saved(page);expect(value.rules[sourceId]).toEqual({...rules,rate:22});expect(value.records).toEqual(records);expect(value.rules.other).toEqual({rate:99});expect(value.payslips[sourceId+'|2026-08-31']).toBe(100);
 await page.locator('#wpCloseV58').click();await page.reload();await expect.poll(()=>page.evaluate(()=>window.WGC18?.cloudStateReady)).toBe(true);await page.evaluate(()=>WWWorkPay.open());await settings(page);await expect(page.locator('#workPayDialogV58 [name="withholdingPercent"]')).toHaveValue('12.345');
});
test('taxes require a valid explicit percent and turning them off does not change earnings',async({page})=>{
 await start(page);await settings(page);await page.locator('#wpEstimateTaxV65').check();
 await page.locator('#wpRulesFormV58 button[type="submit"]').click();expect((await saved(page)).revision).toBe(0);
 await page.locator('#workPayDialogV58 [name="withholdingPercent"]').fill('101');await page.locator('#wpRulesFormV58 button[type="submit"]').click();expect((await saved(page)).revision).toBe(0);
 await page.locator('#workPayDialogV58 [name="withholdingPercent"]').fill('0');await save(page);await expect(page.locator('#wpTakeHomeV65')).toHaveText('$160.00');
 await settings(page);await expect(page.locator('#wpEstimateTaxV65')).toBeChecked();await page.locator('#wpEstimateTaxV65').uncheck();await save(page);
 expect((await saved(page)).rules[sourceId].withholdingPercent).toBeNull();await expect(page.locator('#wpTakeHomeV65')).toHaveText('—');await expect(page.locator('#wpGrossV58')).toHaveText('$160.00');
});
test('paid leave remains editable and cancelling settings leaves all saved data alone',async({page})=>{
 const records={leave:{id:'leave',sourceId,date:'2026-09-02',kind:'leave',paidHours:8,status:'confirmed',rate:20,title:'PTO'}};
 await start(page,{records});const original=await saved(page);
 await settings(page);await page.locator('#workPayDialogV58 [name="rate"]').fill('999');await page.locator('#wpCancelV58').click();expect(await saved(page)).toEqual(original);
 await page.locator('[data-wp-entry="leave"]').click();await expect(page.locator('#wpShiftOptionsV65')).toHaveAttribute('open');await expect(page.locator('#workPayDialogV58 [name="start"]')).not.toBeVisible();await page.locator('#workPayDialogV58 [name="paidHours"]').fill('6');await page.locator('#wpEntryFormV58 button[type="submit"]').click();await expect(page.locator('#wpGrossV58')).toBeVisible();expect((await saved(page)).records.leave.paidHours).toBe(6);
});
test('both period dates stay linked, persist and drive period navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await start(page,{rules:{...defaults(),period:'biweekly',anchor:'2026-08-24'}});await settings(page);
 const startDate=page.getByLabel('Pay period start',{exact:true}),endDate=page.getByLabel('Pay period end',{exact:true});
 await expect(startDate).toHaveValue('2026-08-24');await expect(endDate).toHaveValue('2026-09-06');
 await startDate.fill('2026-08-31');await startDate.press('Tab');await expect(endDate).toHaveValue('2026-09-13');
 await endDate.fill('2026-09-20');await endDate.press('Tab');await expect(startDate).toHaveValue('2026-09-07');await save(page);
 expect((await saved(page)).rules[sourceId].anchor).toBe('2026-09-07');await expect(page.locator('.wpPeriod')).toContainText('Sep 7 – Sep 20, 2026');
 await page.locator('#wpPrevV58').click();await expect(page.locator('.wpPeriod')).toContainText('Aug 24 – Sep 6, 2026');await page.locator('#wpNextV58').click();
 await settings(page);await expect(startDate).toHaveValue('2026-09-07');await expect(endDate).toHaveValue('2026-09-20');
 expect(await page.locator('#wpBodyV58').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:'/private/tmp/ww-pay65-period-dates-'+(process.env.E2E_BROWSER||'chromium')+'.png'});
 const before=await saved(page);await endDate.fill('');await page.locator('#wpRulesFormV58 button[type="submit"]').click();expect(await saved(page)).toEqual(before);
});
test('monthly and half-month dates handle leap years and year boundaries',async({page})=>{
 await start(page);await settings(page);const period=page.locator('#wpRulesFormV58 [name="period"]'),startDate=page.getByLabel('Pay period start',{exact:true}),endDate=page.getByLabel('Pay period end',{exact:true});
 await period.selectOption('monthly');await startDate.fill('2028-02-10');await startDate.press('Tab');await expect(startDate).toHaveValue('2028-02-01');await expect(endDate).toHaveValue('2028-02-29');
 await period.selectOption('semimonthly');await expect(endDate).toHaveValue('2028-02-15');await endDate.fill('2028-02-29');await endDate.press('Tab');await expect(startDate).toHaveValue('2028-02-16');
 await period.selectOption('biweekly');await startDate.fill('2026-12-28');await startDate.press('Tab');await expect(endDate).toHaveValue('2027-01-10');
 await period.selectOption('fourweekly');await expect(endDate).toHaveValue('2027-01-24');await save(page);await expect(page.locator('.wpPeriod')).toContainText('Dec 28 – Jan 24, 2027');
});
