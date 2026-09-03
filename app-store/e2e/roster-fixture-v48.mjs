import {test,expect} from '@playwright/test';

const savedProfile={id:'calendar-fixture',name:'Alex Green',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Work',anchor:'2026-08-31',pattern:[0,0,0,0,0,0,0],start:'07:00',end:'19:00',commuteMin:20},variable:{enabled:false,name:'Extra work',start:'',end:'',commuteMin:20}};
async function setup(page){
 const errors=[];let savedState=null;page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'fixture-token',expires_at:4102444800,user:{id:'calendar-fixture',email:'calendar@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','calendar-fixture');
  localStorage.setItem('wgc-health-consent-v35:calendar-fixture',JSON.stringify({action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync','personalized_ai']}));
 });
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let value={ok:true};
  if(path.endsWith('/config'))value={ok:true,cloudConfigured:true,aiConfigured:true,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};
  if(path.endsWith('/health-consent'))value={ok:true,receipt:{action:'granted',consentVersion:'2026-08-31-v1',purposes:['account_cloud_sync','personalized_ai']}};
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


export {setup,openImport};
