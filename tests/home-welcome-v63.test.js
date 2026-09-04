const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const accounts=read('work-gym-planner-v16/accounts-v18.js');
function configHarness(raw){
 const A={config:{loaded:false,cloudConfigured:false},api:path=>'/api/v18/'+path};
 const context={A,configLoad:null,raw,absoluteApiBase:()=>'/api/v18',renderAccountUI:()=>{},$:()=>null,$$:()=>[]};
 vm.createContext(context);vm.runInContext(accounts.slice(accounts.indexOf(' function loadConfig()'),accounts.indexOf(' function refreshSession()')),context);
 return context;
}
test('account connection retry clears a temporary failure and deduplicates requests',async()=>{
 let calls=0,finish;const h=configHarness(async()=>{calls++;if(calls===1)throw Error('Timed out');return new Promise(resolve=>finish=resolve)});
 await h.loadConfig();assert.equal(h.A.config.error,'Timed out');assert.equal(h.A.config.cloudConfigured,false);
 const first=h.loadConfig(),second=h.loadConfig();assert.equal(first,second);assert.equal(calls,2);
 finish({cloudConfigured:true});await first;
 assert.equal(h.A.config.error,null);assert.equal(h.A.config.loaded,true);assert.equal(h.A.config.cloudConfigured,true);
});
test('an incomplete response remains retryable instead of declaring the account unavailable',async()=>{
 const h=configHarness(async()=>({ok:true}));await h.loadConfig();assert.ok(h.A.config.error);assert.equal(h.A.config.cloudConfigured,false);
});
test('startup does not consume email callbacks when the connection fails',async()=>{
 let consumed=0;
 const start=accounts.indexOf(' function initializeAccount()'),source=accounts.slice(start,accounts.indexOf(' loadSession();',start));
 const context={A:{config:{error:'Timed out',cloudConfigured:false}},accountStartup:null,loadConfig:async()=>{},consumeAuthRedirect:()=>{consumed++;return true}};
 vm.createContext(context);vm.runInContext(source,context);await context.initializeAccount();assert.equal(consumed,0);
 context.A.config={cloudConfigured:true};context.accountModulesReady=Promise.resolve();await context.initializeAccount();assert.equal(consumed,1);
});
test('first-paint colors do not depend on a stylesheet request',()=>{
 const root=read('index.html'),shell=read('work-gym-planner/shell.html'),boot=read('work-gym-planner/boot.js');
 for(const file of [root,shell])assert.match(file,/<style[^>]*>html,body\{[^}]*background:#070a0d/);
 assert.ok(boot.includes("getElementById('wwBootCritical')"));
 assert.ok(root.includes('Opening your space…'));
 assert.ok(!root.includes('>Open Work + Workout</a>'));
});
test('Home puts the real plan before optional health details',()=>{
 const today=read('work-gym-planner-v16/today.js');
 assert.ok(today.indexOf('>Today</h2>')<today.indexOf('>Fuel</h2>'));
 assert.ok(today.includes('<details class="hvMore" data-home-detail="checkins">'));
 assert.ok(today.includes('<details class="hvMore hvNutritionDetails" data-home-detail="nutrition">'));
 assert.ok(today.includes('window.WWV25?.workRowsOn?.(k)'));
 assert.ok(today.includes('for(const key of openDetails)'));
});
test('modern calendar work does not invent a second shift from disabled legacy jobs',()=>{
 const calendar=read('work-gym-planner-v16/calendar.js');
 const source=calendar.slice(calendar.indexOf('function workScheduleRows('),calendar.indexOf('function calendarCellDetails('));
 const p={fixed:{enabled:false},variable:{enabled:false}};
 const context={profile:()=>p,workState:()=>({fixed:true,variable:true,kind:'one'}),smartWork:()=>null};
 vm.createContext(context);vm.runInContext(source,context);
 assert.equal(context.workScheduleRows('2026-09-03').length,0);
 p.fixed={enabled:true,name:'Legacy shift',start:'07:00',end:'15:00'};
 const rows=context.workScheduleRows('2026-09-03');assert.equal(rows.length,1);assert.equal(rows[0].name,'Legacy shift');
});
