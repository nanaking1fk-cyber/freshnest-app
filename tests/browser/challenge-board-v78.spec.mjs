import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');

const id='00000000-0000-4000-8000-000000000078';
function member(displayName,rank,isYou,totalValue=7){return{displayName,rank,isYou,totalValue,todayValue:totalValue,daysCompleted:0,daysExpected:1,progressPercent:70}}
function board(members=[member('Maya',1,true)]){return{id,title:'Hydration team',metric:'custom',unitLabel:'glasses',targetValue:10,cadence:'total',startsOn:'2026-09-04',endsOn:'2026-09-17',inviteCode:'ABCD2345',isOwner:true,status:'active',members}}

async function start(page,url='/work-gym-planner/'){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.setFixedTime(new Date('2026-09-04T15:00:00Z'));
 await page.addInitScript(()=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'challenge-test',expires_at:4102444800,user:{id:'challenge-test',email:'maya@example.test',user_metadata:{display_name:'Maya'}}}));
  localStorage.setItem('wgc-v18-local-owner','challenge-test');
  localStorage.setItem('wgp-v15-profile',JSON.stringify({id:'challenge-test',name:'Maya',fixed:{enabled:false},variable:{enabled:false}}));
  navigator.share=async()=>{};
 });
 await page.route('**/api/config',route=>route.fulfill({json:{cloudConfigured:false,aiConfigured:false,apiVersion:18}}));
 await page.route('**/_vercel/**',route=>route.fulfill({body:''}));
 await page.goto(url,{waitUntil:'domcontentloaded'});
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
 const sheet=await page.locator('.challengeSheetV78').boundingBox();expect(sheet.width).toBeLessThanOrEqual(390);expect(sheet.height).toBeLessThanOrEqual(844);
 expect(await page.locator('.challengeSheetV78').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
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
