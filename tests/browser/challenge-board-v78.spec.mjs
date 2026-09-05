import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');

const id='00000000-0000-4000-8000-000000000078';
function member(displayName,rank,isYou,totalValue=7){return{displayName,rank,isYou,totalValue,todayValue:totalValue,daysCompleted:0,daysExpected:1,progressPercent:70}}
function board(members=[member('Maya',1,true)],overrides={}){return{id,title:'Hydration team',metric:'custom',unitLabel:'glasses',targetValue:10,cadence:'total',startsOn:'2026-09-04',endsOn:'2026-09-17',inviteCode:'ABCD2345',isOwner:true,status:'active',members,...overrides}}

async function start(page,url='/work-gym-planner/'){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.setFixedTime(new Date('2026-09-04T15:00:00Z'));
 await page.addInitScript(()=>{
 localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'challenge-test',expires_at:4102444800,user:{id:'challenge-test',email:'maya@example.test',user_metadata:{display_name:'Maya'}}}));
 localStorage.setItem('wgc-v18-local-owner','challenge-test');
 localStorage.setItem('wgp-v15-profile',JSON.stringify({id:'challenge-test',name:'Maya',fixed:{enabled:false},variable:{enabled:false}}));
  localStorage.setItem('wgc-health-consent-v35:challenge-test',JSON.stringify({action:'withdrawn',consentVersion:'2026-08-31-v1',policyVersion:'1.7',purposes:[],agreement:{termsVersion:'1.2',privacyVersion:'1.7',acceptedAt:'2026-09-04T15:00:00Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'}}));
  navigator.share=async()=>{};
 });
 await page.route('**/api/v18/config',route=>route.fulfill({json:{cloudConfigured:true,aiConfigured:false,apiVersion:18}}));
 await page.route('**/api/v18/health-consent**',route=>route.fulfill({json:{ok:true,receipt:{
  action:'withdrawn',consentVersion:'2026-08-31-v1',policyVersion:'1.7',purposes:[],
  agreement:{termsVersion:'1.2',privacyVersion:'1.7',acceptedAt:'2026-09-04T15:00:00Z',statement:'I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.'}
 }}}));
 await page.route('**/_vercel/**',route=>route.fulfill({body:''}));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.WWChallenges?.open==='function');
 return errors;
}

test('coworker can create a private custom challenge from More on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 let createdBody=null,currentBoards=[];
 await page.route('**/api/v18/challenges**',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{ok:true,boards:currentBoards}});
  createdBody=route.request().postDataJSON();currentBoards=[board()];
  return route.fulfill({json:{ok:true,challengeId:id,boards:currentBoards}});
 });
 const errors=await start(page);
 await page.locator('nav [data-page="more"]').click();
 await page.getByRole('button',{name:/Plan & coaching/}).click();
 const launch=page.locator('#openChallengesV78');await expect(launch).toBeVisible();await launch.click();
 await expect(page.getByRole('heading',{name:'Challenges'})).toBeVisible();
 await page.getByRole('button',{name:'Create challenge'}).click();
 await page.getByText('Custom number',{exact:true}).click();
 await page.locator('#challengeCreateV78 [name="title"]').fill('Hydration team');
 await page.locator('#challengeCreateV78 [name="targetValue"]').fill('10');
 await page.locator('#challengeCreateV78 [name="unitLabel"]').fill('glasses');
 await page.getByRole('button',{name:'Create & get invite link'}).click();
 await expect(page.getByRole('heading',{name:'Hydration team'})).toBeVisible();
 await expect(page.getByText('ABCD-2345')).toBeVisible();
 await expect(page.locator('.challengePersonV78 h4')).toContainText('Maya');
 expect(createdBody).toMatchObject({action:'create',metric:'custom',unitLabel:'glasses',displayName:'Maya',sharingConfirmed:true,localDate:'2026-09-04'});
 const sheet=await page.locator('.challengeSheetV78').boundingBox();expect(sheet.x).toBe(0);expect(sheet.y).toBe(0);expect(sheet.width).toBe(390);expect(sheet.height).toBe(844);
 expect(await page.locator('.challengeSheetV78').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 await expect(page.locator('.challengeBackdropV78')).toBeHidden();
 await page.screenshot({path:'/private/tmp/ww-challenge-v78-mobile.png'});
 expect(errors).toEqual([]);
});

test('private invite link opens the join flow and removes the code after joining',async({page})=>{
 await page.setViewportSize({width:1280,height:820});
 let joinedBody=null;
 const joinedBoard=board([member('Jordan',1,false,9),member('Maya',2,true,7)]);
 await page.route('**/api/v18/challenges**',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{ok:true,boards:[]}});
  joinedBody=route.request().postDataJSON();return route.fulfill({json:{ok:true,challengeId:id,boards:[joinedBoard]}});
 });
 const errors=await start(page,'/work-gym-planner/?challenge=ABCD2345');
 await expect(page.getByRole('heading',{name:'Join a challenge'})).toBeVisible();
 await expect(page.locator('#challengeJoinV78 [name="inviteCode"]')).toHaveValue('ABCD-2345');
 await page.getByRole('button',{name:'Join & share my score'}).click();
 await expect(page.getByRole('heading',{name:'Hydration team'})).toBeVisible();
 await expect(page.locator('.challengePersonV78')).toHaveCount(2);
 await expect(page.getByText('Jordan')).toBeVisible();
 expect(joinedBody).toMatchObject({action:'join',inviteCode:'ABCD-2345',displayName:'Maya',sharingConfirmed:true});
 expect(new URL(page.url()).searchParams.has('challenge')).toBe(false);
 await page.screenshot({path:'/private/tmp/ww-challenge-v78-desktop.png'});
 expect(errors).toEqual([]);
});

test('website step challenges accept today’s phone total without claiming an automatic sync',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 let scoreBody=null,currentBoards=[board([member('Maya',1,true,0)],{title:'12,000 steps',metric:'steps',unitLabel:'steps',targetValue:12000,cadence:'daily'})];
 await page.route('**/api/v18/challenges**',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{ok:true,boards:currentBoards}});
  scoreBody=route.request().postDataJSON();currentBoards=[board([member('Maya',1,true,6500)],{title:'12,000 steps',metric:'steps',unitLabel:'steps',targetValue:12000,cadence:'daily'})];
  return route.fulfill({json:{ok:true,boards:currentBoards}});
 });
 const errors=await start(page);
 await page.evaluate(()=>window.WWChallenges.open());
 await page.getByRole('button',{name:/12,000 steps/}).click();
 await expect(page.getByLabel('Enter today’s steps')).toBeVisible();
 await expect(page.locator('[data-challenge-sync]')).toHaveCount(0);
 await page.getByLabel('Enter today’s steps').fill('6500');
 await page.getByRole('button',{name:'Update steps'}).click();
 await expect(page.locator('.challengeYourProgressV78 strong')).toContainText('6,500 / 12,000 steps today');
 expect(scoreBody).toMatchObject({action:'score',metric:'steps',value:6500,source:'steps',date:'2026-09-04'});
 expect(errors).toEqual([]);
});

test('iPhone step challenges connect Apple Health before sending today’s total',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 let scoreBody=null,currentBoards=[board([member('Maya',1,true,0)],{title:'12,000 steps',metric:'steps',unitLabel:'steps',targetValue:12000,cadence:'daily'})];
 await page.addInitScript(()=>{
  window.__challengeHealthConnected=false;
  window.WGPNative={steps:{available:true,provider:'Apple Health',enabled:()=>window.__challengeHealthConnected,connect:async()=>{window.__challengeHealthConnected=true;return{steps:4321,platform:'ios',syncedAt:'2026-09-04T15:00:00Z'}},read:async()=>({steps:4321,platform:'ios',syncedAt:'2026-09-04T15:00:00Z'})}};
 });
 await page.route('**/api/v18/challenges**',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{ok:true,boards:currentBoards}});
  scoreBody=route.request().postDataJSON();currentBoards=[board([member('Maya',1,true,4321)],{title:'12,000 steps',metric:'steps',unitLabel:'steps',targetValue:12000,cadence:'daily'})];
  return route.fulfill({json:{ok:true,boards:currentBoards}});
 });
 const errors=await start(page);
 await page.evaluate(()=>window.WWChallenges.open());
 await page.getByRole('button',{name:/12,000 steps/}).click();
 await expect(page.getByText('Enter steps manually')).toBeVisible();
 await page.getByRole('button',{name:'Connect Apple Health & sync'}).click();
 await expect(page.locator('.challengeYourProgressV78 strong')).toContainText('4,321 / 12,000 steps today');
 expect(scoreBody).toMatchObject({action:'score',metric:'steps',value:4321,source:'steps',date:'2026-09-04'});
 expect(errors).toEqual([]);
});
