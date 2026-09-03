import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {setup,openImport} from './roster-fixture-v48.mjs';
const headers=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url))).headers[0].headers;
const csp=headers.find(x=>x.key==='Content-Security-Policy').value;
const entries=['07:00–15:00','15:00–23:00','OFF','19:00–07:00','08:00–16:30','OFF','07:00–19:00'];
const items=entries.map((entry,index)=>{const [start,end]=entry.split('–');return{kind:entry==='OFF'?'off':'work',date:`2026-09-${String(index+7).padStart(2,'0')}`,start:end?start:'',end:end||'',title:entry==='OFF'?'Off work':'Work shift',needsReview:false,confidence:{label:'Medium',score:.8,reasons:[]}}});
async function photo(page){
 const data=await page.evaluate(entries=>{
  const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=600;const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1800,600);c.fillStyle='#101820';c.font='bold 36px Arial';c.fillText('RIVERSIDE TEAM — WEEKLY WORK ROSTER',30,55);c.font='26px Arial';c.fillText('September 2026 · Week of September 7',30,100);
  const xs=[300,510,720,930,1140,1350,1560];c.font='bold 23px Arial';c.fillText('EMPLOYEE',30,153);xs.forEach((x,i)=>c.fillText(['MON 7','TUE 8','WED 9','THU 10','FRI 11','SAT 12','SUN 13'][i],x,153));
  c.font='24px Arial';for(const [y,name,shifts]of [[225,'Jamie Taylor',Array(7).fill('08:00–16:00')],[315,'Alex Green',entries],[405,'Morgan Lee',Array(7).fill('23:00–07:00')]]){c.fillStyle=y===315?'#f0f5fa':'#fafafa';c.fillRect(20,y-40,1760,65);c.fillStyle='#101820';c.fillText(name,30,y);xs.forEach((x,i)=>c.fillText(shifts[i],x,y))}
  c.strokeStyle='#889199';for(const y of [175,260,350,440]){c.beginPath();c.moveTo(20,y);c.lineTo(1780,y);c.stroke()}
  c.font='22px Arial';c.fillText('OFF = no scheduled shift. All times use the 24-hour clock.',30,510);
  return canvas.toDataURL('image/png').split(',')[1];
 },entries);
 return Buffer.from(data,'base64');
}
async function begin(page){
 const errors=await setup(page);await openImport(page);await page.locator('#uploadWorkRosterV35').click();
 const legacy=[];page.on('request',req=>{if(/tesseract|traineddata|\/api\/v25\/schedule$/.test(req.url()))legacy.push(req.url())});
 const file=await photo(page);await page.locator('#scheduleFileV24').setInputFiles({name:'weekly-roster.png',mimeType:'image/png',buffer:file});
 await expect(page.locator('#rosterScanDialogV48')).toBeVisible();return{errors,legacy,file};
}
async function highlight(page){
 const view=page.locator('#rosterCanvasV48');await view.scrollIntoViewIfNeeded();const box=await view.boundingBox();
 await page.mouse.move(box.x+8,box.y+8);await page.mouse.down();await page.mouse.move(box.x+box.width-8,box.y+box.height*.29,{steps:4});await page.mouse.up();
 await page.locator('#rosterScanDialogV48 summary').click();await page.locator('[data-edge="y"]').fill('45');await page.locator('[data-edge="bottom"]').fill('58');await page.locator('#rosterAddAreaV48').click();
 await expect(page.locator('#rosterRegionCountV48')).toContainText('2 sections');await page.locator('#rosterMonthV48').fill('2026-09');
 await page.locator('#rosterConfirmV48').check();
}
for(const width of [390,1440])test.describe(`${width}px roster photo`,()=>{
 test.use({viewport:{width,height:1000},serviceWorkers:'block'});
 test('upload, redact, read and review before saving under production CSP',async({page},info)=>{
  await page.route('**/work-gym-planner/',async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}})});
  const {errors,legacy,file}=await begin(page);let payload;
  await page.route('**/api/v25/roster-scan',route=>{payload=route.request().postDataJSON();return route.fulfill({json:{ok:true,items,warnings:[]}})});
  await highlight(page);await expect(page.locator('#rosterReadV48')).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('roster-highlight.png')});
  await page.locator('#rosterReadV48').click();await expect(page.locator('#proposalSaveV25')).toBeVisible();
  expect(payload.identity).toBe('Alex Green');expect(payload.month).toBe('2026-09');expect(payload.confirmed).toBe(true);expect(legacy).toEqual([]);
  expect(await page.evaluate(()=>WWV25.events())).toEqual([]);
  // Jamie's row is blank in the actual uploaded image, while Alex's is visible.
  expect(await page.evaluate(async image=>{const img=new Image();img.src=image;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const trimmedTop=348-img.height;return [...ctx.getImageData(20,190-trimmedTop,1700,50).data].every(value=>value>248)},payload.image)).toBe(true);
  writeFileSync(info.outputPath('sample-full-roster.png'),file);writeFileSync(info.outputPath('sample-selected-roster.jpg'),Buffer.from(payload.image.split(',')[1],'base64'));
  await page.screenshot({path:info.outputPath('roster-review.png')});await page.locator('#proposalSaveV25').click();
  const saved=await page.evaluate(()=>WWV25.events().map(x=>({kind:x.kind,date:x.date,start:x.start,end:x.end,overnight:x.overnight})));
  expect(saved).toHaveLength(7);expect(saved.find(x=>x.date==='2026-09-10').overnight).toBe(true);expect(saved.filter(x=>x.kind==='off')).toHaveLength(2);
  expect(await page.evaluate(()=>personalItemsOn('2026-09-03')[0].title)).toBe('Existing personal plan');expect(errors).toEqual([]);
 });
 test('cancel ignores late results and allows selecting the same file again',async({page})=>{
  const {errors,file}=await begin(page);let finish;await page.route('**/api/v25/roster-scan',route=>new Promise(resolve=>{finish=async()=>{await route.fulfill({json:{ok:true,items,warnings:[]}}).catch(()=>{});resolve()}}));
  await highlight(page);await page.locator('#rosterReadV48').click();await expect.poll(()=>!!finish).toBe(true);await page.getByRole('button',{name:'Cancel roster scan',exact:true}).click();await finish();
  await expect(page.locator('#rosterScanDialogV48')).toHaveCount(0);expect(await page.evaluate(()=>WWV25.events())).toEqual([]);
  await page.locator('#scheduleFileV24').setInputFiles({name:'weekly-roster.png',mimeType:'image/png',buffer:file});await expect(page.locator('#rosterScanDialogV48')).toBeVisible();await expect(page.locator('#rosterReadV48')).toBeDisabled();await page.keyboard.press('Escape');await expect(page.locator('#rosterScanDialogV48')).toHaveCount(0);expect(errors).toEqual([]);
 });
 test('failed reads stay in the editor; corrections and uncertain dates need review',async({page})=>{
  const {errors}=await begin(page);let fail=true;await page.route('**/api/v25/roster-scan',route=>route.fulfill(fail?{status:422,json:{ok:false,error:'We could not match your name. Include your name in the highlighted row.'}}:{json:{ok:true,items:[{...items[0],needsReview:true}],warnings:['Compare your roster before saving.']}}));
  await highlight(page);await page.locator('#rosterReadV48').click();await expect(page.locator('#rosterScanStatusV48')).toContainText('could not match');expect(await page.evaluate(()=>WWV25.events())).toEqual([]);
  fail=false;await page.locator('#rosterReadV48').click();const check=page.locator('[data-proposal-check]');await expect(check).not.toBeChecked();await check.check();await page.locator('[data-proposal-start]').fill('08:30');await page.locator('#proposalSaveV25').click();await expect(page.locator('#proposalStatusV25')).toContainText('Times updated');expect(await page.evaluate(()=>WWV25.events())).toEqual([]);
  await page.locator('#proposalSaveV25').click();expect(await page.evaluate(()=>WWV25.events()[0].start)).toBe('08:30');expect(errors).toEqual([]);
 });
});
