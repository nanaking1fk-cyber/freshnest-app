import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const require=createRequire(new URL('../app-store/package.json',import.meta.url));
const {chromium}=require('playwright');
const baseUrl=process.env.DEMO_BASE_URL||'https://www.workandworkout.com';
const outputDir=process.env.DEMO_OUTPUT_DIR||'/private/tmp/ww-product-tour-v76';
const day='2026-09-04';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const food=(id,name,meal,grams,per100)=>({
  id,name,meal,grams,servingSize:grams,servings:1,nutritionUnit:'g',per100,
  source:'Demonstration food'
});

const diary=[
  food('oats','Oatmeal with cinnamon','Breakfast',234,{cal:71,p:2.5,c:12,f:1.5,fiber:1.7,satFat:.3,sodium:49}),
  food('yogurt','Greek yogurt','Breakfast',200,{cal:59,p:10.3,c:3.6,f:.4,fiber:0,satFat:.1,sodium:36}),
  food('berries','Mixed berries','Breakfast',140,{cal:50,p:.8,c:12,f:.3,fiber:3.6,satFat:0,sodium:1}),
  food('chicken','Grilled chicken breast','Lunch',170,{cal:165,p:31,c:0,f:3.6,fiber:0,satFat:1,sodium:74}),
  food('rice','Brown rice, cooked','Lunch',195,{cal:123,p:2.7,c:25.6,f:1,fiber:1.6,satFat:.2,sodium:4}),
  food('broccoli','Roasted broccoli','Lunch',120,{cal:35,p:2.4,c:7.2,f:.4,fiber:3.3,satFat:.1,sodium:41})
];

const work=(id,date,start,end,variant,label,color)=>({
  id,kind:'work',date,start,end,overnight:end<=start,sourceId:'hospital',sourceName:'City Hospital',
  shiftVariantId:variant,shiftLabel:label,title:label,color
});

const schedule=[
  work('s1','2026-09-01','07:00','15:00','day','Day shift','#58a6ff'),
  work('s2','2026-09-02','07:00','15:00','day','Day shift','#58a6ff'),
  work('s3','2026-09-03','15:00','23:00','evening','Evening shift','#f59e0b'),
  work('s4',day,'15:00','23:00','evening','Evening shift','#f59e0b'),
  work('s5','2026-09-06','23:00','07:00','night','Night shift','#a78bfa'),
  work('s6','2026-09-07','23:00','07:00','night','Night shift','#a78bfa'),
  work('s7','2026-09-10','07:00','15:00','day','Day shift','#58a6ff'),
  work('s8','2026-09-11','07:00','15:00','day','Day shift','#58a6ff'),
  work('s9','2026-09-14','15:00','23:00','evening','Evening shift','#f59e0b'),
  work('s10','2026-09-15','15:00','23:00','evening','Evening shift','#f59e0b'),
  work('s11','2026-09-18','23:00','07:00','night','Night shift','#a78bfa'),
  {id:'pto',kind:'timeoff',date:'2026-09-21',title:'PTO',start:'',end:'',color:'#f472b6'},
  {id:'dentist',kind:'personal',date:'2026-09-09',title:'Dentist',start:'10:00',end:'11:00',color:'#22d3ee'},
  {id:'training1',kind:'workout',date:day,title:'Upper-body strength',start:'11:30',end:'12:15',color:'#b8f34a'},
  {id:'training2',kind:'workout',date:'2026-09-08',title:'Lower-body strength',start:'10:00',end:'10:45',color:'#b8f34a'}
];

const profile={
  id:'tour-profile',name:'Maya',sleepTarget:7.5,trainingDaysPerWeek:3,trainingDuration:45,
  singleJobTraining:true,equipmentMode:'full',trainingMode:'generated',
  fixed:{enabled:false,name:'City Hospital',anchor:day,pattern:[0,0,0,0,0,0,0],start:'',end:'',commuteMin:25},
  variable:{enabled:false,name:'',start:'',end:'',commuteMin:20},createdAt:'2026-08-01T12:00:00Z'
};

const pay={
  version:1,revision:0,timer:null,payslips:{},records:{},
  rules:{hospital:{rate:34.5,currency:'USD',period:'weekly',anchor:'2026-08-31',timeZone:'America/New_York',
    weeklyAfter:40,dailyAfter:null,doubleAfter:null,otMultiplier:1.5,doubleMultiplier:2,
    holidayMultiplier:1,stack:'highest',nightDifferential:2.5,weekendDifferential:0,
    differentialPremium:false,breakMinutes:30,withholdingPercent:22,
    deductions:[{name:'Retirement',mode:'percent',timing:'pre',amount:4}]}}
};

const demoStorage={
  'wgc-v18-session':JSON.stringify({access_token:'tour-only',expires_at:4102444800,user:{id:'tour-user',email:'maya@example.test',user_metadata:{display_name:'Maya'}}}),
  'wgc-v18-local-owner':'tour-user',
  'wgp-v15-profile':JSON.stringify(profile),
  'wgp-v15-nutrition-settings':JSON.stringify({gymCal:2350,restCal:2100,protein:160,fat:72,fiber:30,sodium:2300,satFat:20,water:96,goalWeight:0,goalBf:0,planStart:'2026-08-01'}),
  [`wgp-v15-food-diary-${day}`]:JSON.stringify(diary),
  [`wgp-v15-water-${day}`]:'72',
  'wgp-v15-health-log':JSON.stringify({
    '2026-09-03':{sleepHours:7.7,steps:10422,restingHr:61,stepsSource:'apple-health'},
    [day]:{sleepHours:7.9,steps:6842,restingHr:60,stepsSource:'apple-health',stepsSyncedAt:'2026-09-04T15:58:00-04:00'}
  }),
  'wgp-v15-step-settings-v1':JSON.stringify({goal:8000}),
  'wgp-v15-schedule-sources-v25':JSON.stringify([{id:'hospital',name:'City Hospital',enabled:true,color:'#58a6ff',overtimeThreshold:40}]),
  'wgp-v15-schedule-sources-initialized-v25':'true',
  'wgp-v15-schedule-events-v25':JSON.stringify(schedule),
  'wgp-v15-schedule-rotations-v25':'[]',
  'wgp-v15-schedule-overrides':JSON.stringify({[day]:{action:'train',customStart:'11:30',customWorkoutName:'Upper-body strength'}}),
  'wgp-v15-training-history':JSON.stringify([
    {id:'h1',date:'2026-08-24',workoutIndex:0,completed:true,completedAt:'2026-08-24T18:00:00Z',exercises:[]},
    {id:'h2',date:'2026-08-28',workoutIndex:1,completed:true,completedAt:'2026-08-28T18:00:00Z',exercises:[]}
  ]),
  'ww-workpay-v58:tour-user':JSON.stringify(pay)
};

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:405,height:720},screen:{width:405,height:720},deviceScaleFactor:1,
  colorScheme:'dark',locale:'en-US',timezoneId:'America/New_York',serviceWorkers:'block',
  recordVideo:{dir:outputDir,size:{width:405,height:720}}
});
const page=await context.newPage();
const pageOpenedAt=Date.now();
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
await page.clock.setFixedTime(new Date('2026-09-04T16:00:00-04:00'));
await page.route('**/api/**',route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname.endsWith('/config'))return route.fulfill({json:{cloudConfigured:false,aiConfigured:false,apiVersion:18}});
  return route.fulfill({json:{ok:true}});
});
await page.route('**/_vercel/**',route=>route.fulfill({body:''}));
await page.addInitScript(storage=>{
  for(const [key,value] of Object.entries(storage))localStorage.setItem(key,value);
},demoStorage);
await page.goto(`${baseUrl}/work-gym-planner/`,{waitUntil:'domcontentloaded'});
await page.waitForSelector('#todayDashboard .homeDashV27',{timeout:30_000});
await page.evaluate(()=>{
  document.getElementById('wwLanding')?.setAttribute('hidden','');
  document.body.classList.remove('landingActive');
  window.renderAll?.();
});
await page.waitForSelector('nav [data-page="calendar"]');

await page.addStyleTag({content:`
  #tourCaptionV76{position:fixed;left:12px;right:12px;bottom:82px;z-index:2147483645;padding:14px 16px;border:1px solid rgba(193,247,71,.38);border-radius:17px;background:linear-gradient(135deg,rgba(11,17,18,.96),rgba(22,33,29,.94));box-shadow:0 18px 46px rgba(0,0,0,.42);color:#f7faf3;font-family:Arial,sans-serif;pointer-events:none;opacity:0;transform:translateY(14px);transition:.32s ease}
  #tourCaptionV76.show{opacity:1;transform:none}#tourCaptionV76 small{display:block;color:#bff346;font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:5px}#tourCaptionV76 b{display:block;font-size:18px;line-height:1.08;letter-spacing:-.4px}#tourCaptionV76 span{display:block;margin-top:6px;color:#c8d0ca;font-size:11px;line-height:1.35}
  #tourTapV76{position:fixed;z-index:2147483646;width:34px;height:34px;margin:-17px 0 0 -17px;border:2px solid #c1f747;border-radius:50%;box-shadow:0 0 0 8px rgba(193,247,71,.14);pointer-events:none;opacity:0;transform:scale(.6);transition:left .32s ease,top .32s ease,opacity .18s ease,transform .18s ease}#tourTapV76.on{opacity:1;transform:scale(1)}
  #tourCardV76{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:34px;background:radial-gradient(circle at 80% 15%,rgba(193,247,71,.18),transparent 34%),linear-gradient(155deg,#0a1012,#15231d);color:white;font-family:Arial,sans-serif;text-align:left;opacity:0;pointer-events:none;transition:.4s ease}#tourCardV76.show{opacity:1}#tourCardV76>div{width:100%}#tourCardV76 img{width:72px;height:72px;margin-bottom:34px}#tourCardV76 small{display:block;color:#c1f747;font-size:11px;font-weight:800;letter-spacing:.18em;margin-bottom:13px}#tourCardV76 h1{margin:0;font-size:43px;line-height:.95;letter-spacing:-2px}#tourCardV76 p{margin:20px 0 0;color:#cbd4ce;font-size:16px;line-height:1.5}#tourCardV76 em{display:block;margin-top:42px;color:#c1f747;font-size:12px;font-style:normal;font-weight:800}
`});
await page.evaluate(()=>{
  document.body.insertAdjacentHTML('beforeend','<aside id="tourCaptionV76"><small></small><b></b><span></span></aside><i id="tourTapV76"></i><section id="tourCardV76"><div><img src="/work-gym-planner-v16/icons/brand-mark.svg" alt=""><small></small><h1></h1><p></p><em></em></div></section>');
});

const markers={};
let captureStart=0;
const mark=name=>{markers[name]=Number(((Date.now()-captureStart)/1000).toFixed(2))};
async function caption(kicker,title,copy){
  await page.evaluate(({kicker,title,copy})=>{const box=document.getElementById('tourCaptionV76');box.classList.remove('show');box.querySelector('small').textContent=kicker;box.querySelector('b').textContent=title;box.querySelector('span').textContent=copy;requestAnimationFrame(()=>box.classList.add('show'))},{kicker,title,copy});
}
async function card(kicker,title,copy,footer){
  await page.evaluate(({kicker,title,copy,footer})=>{const box=document.getElementById('tourCardV76');box.querySelector('small').textContent=kicker;box.querySelector('h1').innerHTML=title;box.querySelector('p').textContent=copy;box.querySelector('em').textContent=footer;box.classList.add('show')},{kicker,title,copy,footer});
}
async function hideCard(){await page.evaluate(()=>document.getElementById('tourCardV76').classList.remove('show'));await wait(500)}
async function tap(selector){
  const locator=page.locator(`${selector}:visible`).first();
  await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();
  if(box)await page.evaluate(({x,y})=>{const tap=document.getElementById('tourTapV76');tap.style.left=x+'px';tap.style.top=y+'px';tap.classList.add('on')},{x:box.x+box.width/2,y:box.y+box.height/2});
  await wait(420);await locator.click();await wait(280);await page.evaluate(()=>document.getElementById('tourTapV76').classList.remove('on'));
}

captureStart=Date.now();
mark('intro');
await card('WORK + WORKOUT','One app.<br>Built around your shift.','Plan work, training and nutrition—then keep track of the life happening around them.','50-SECOND APP TOUR');
await wait(2600);await hideCard();

mark('today');
await caption('01 · TODAY','Know what matters now.','See today’s shift, workout, meals, steps and recovery in one calm view.');
await page.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));await wait(2600);
await page.locator('.hvStepsPanel').scrollIntoViewIfNeeded();await wait(2300);

mark('calendar');
await tap('nav [data-page="calendar"]');
await caption('02 · CALENDAR','Every shift. One workplace.','Day, evening and night shifts stay color-coded—without creating duplicate jobs.');
await page.waitForSelector('#calendarAddV42');await wait(2200);
await tap('#calendarAddV42');await tap('[data-add-kind="workmenu"]');await tap('[data-add-kind="work"]');
await page.waitForSelector('[data-shift-variant="evening"]');await tap('[data-shift-variant="evening"]');await wait(2500);
await tap('[data-sheet-back]');await tap('[data-sheet-back]');

mark('training');
await tap('nav [data-page="training"]');
await caption('03 · TRAINING','A workout that fits the day.','Open the session, log weight and reps, and let progress guide what comes next.');
await page.waitForSelector('#trainingRoot .exerciseCard');await wait(1800);
const first=page.locator('#trainingRoot .exerciseCard').first();
await first.locator('input[data-f="w"]').first().fill('45');await first.locator('input[data-f="r"]').first().fill('10');await first.locator('input[data-f="rir"]').first().fill('2');
await tap('#saveTrain');await wait(1800);

mark('nutrition');
await tap('nav [data-page="diary"]');
await caption('04 · NUTRITION','Log a full meal in one visit.','Search foods, scan a barcode or meal, and reuse meals from History, My Meals, Recipes or My Foods.');
await page.waitForSelector('[data-add-food="Breakfast"]');await wait(1800);await tap('[data-add-food="Breakfast"]');
await page.waitForSelector('#foodSearchInput');await page.locator('#foodSearchInput').fill('banana');await wait(650);
await page.waitForSelector('#foodSearchResults [data-quick-add-index]');await tap('#foodSearchResults [data-quick-add-index="0"]');await wait(1500);
await tap('#saveFoodEntry');await wait(1700);

mark('steps');
await tap('nav [data-page="home"]');
await page.locator('.hvStepsPanel').scrollIntoViewIfNeeded();
await caption('05 · STEPS & RECOVERY','Your phone keeps the count.','Daily steps, sleep and recovery help the plan respond to how your body is doing.');await wait(3200);

mark('pay');
await tap('nav [data-page="calendar"]');await page.waitForSelector('#calendarWorkPayV58');await tap('#calendarWorkPayV58');
await page.waitForSelector('#workPayDialogV58.open');
await caption('06 · HOURS & PAY','Make every hour visible.','Review regular hours, overtime, estimated taxes, deductions and take-home pay by pay period.');await wait(3600);
await tap('#wpCloseV58');

mark('more');
await tap('nav [data-page="more"]');
await caption('07 · YOUR SPACE','The details stay out of the way.','Open plan settings, health tools, account controls and support only when you need them.');await wait(3000);

mark('outro');
await page.evaluate(()=>document.getElementById('tourCaptionV76').classList.remove('show'));
await card('WORK + WORKOUT','Your work.<br>Your health.<br><span style="color:#c1f747">Room for both.</span>','Start free. Build the plan around the life you actually work.','WORKANDWORKOUT.COM');
await wait(3600);

const duration=Number(((Date.now()-captureStart)/1000).toFixed(2));
const trimStart=Number(((captureStart-pageOpenedAt)/1000).toFixed(2));
const video=page.video();
await context.close();
const rawPath=await video.path();
await browser.close();
const manifest={rawPath,trimStart,duration,markers,pageErrors,baseUrl,createdAt:new Date().toISOString()};
const manifestPath=path.join(outputDir,'manifest.json');
await writeFile(manifestPath,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({...manifest,manifestPath},null,2));
if(pageErrors.length)process.exitCode=1;
