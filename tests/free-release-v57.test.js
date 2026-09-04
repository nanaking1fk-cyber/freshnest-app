const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('reload resumes password recovery before consent, cloud restore or onboarding',async()=>{
 const source=read('work-gym-planner-v16/accounts-v18.js');
 const start=source.indexOf(' function initializeAccount()');
 const startup=source.slice(start,source.indexOf(' loadSession();',start))+'\ninitializeAccount()';
 for(const signedIn of [true,false]){
  const events=[],A={session:signedIn?{user:{id:'fixture'}}:null,passwordRecovery:true,config:{cloudConfigured:true}};
  await vm.runInNewContext(startup,{A,accountStartup:null,loadConfig:async()=>{},accountModulesReady:Promise.resolve(),consumeAuthRedirect:async()=>false,sessionExpired:()=>false,refreshSession:async()=>{},clearRecoveryFlag:()=>{A.passwordRecovery=false;events.push('clear')},lockPlannerForLoggedOut:()=>events.push('locked'),renderAccountUI:()=>events.push('render'),openAccount:()=>events.push('password-form'),status:()=>{},afterAuth:async()=>events.push('cloud')});
  assert.ok(!events.includes('cloud'));
  if(signedIn)assert.ok(events.includes('password-form'));
  else{assert.equal(A.passwordRecovery,false);assert.ok(events.includes('locked'))}
 }
});

test('legacy onboarding builds its initial plan without making an AI request',async()=>{
 const source=read('work-gym-planner-v16/onboarding-v18.js');
 const next=source.slice(source.indexOf('async function next()'),source.indexOf(' function showPlan('));
 const plan={training:{days:[]}},elements={},shown=[];
 await vm.runInNewContext('('+next+')()',{preserve(){},step:0,screens:[{}],answers:()=>({basics:{name:'Fixture',weight:70,heightFt:5}}),$:id=>elements[id]??={},buildPlan:()=>plan,lastPlan:null,showPlan:(answers,result)=>shown.push(result),A:{session:{},config:{aiConfigured:true},authedFetch:()=>assert.fail('unexpected AI request')}});
 assert.equal(shown[0],plan);assert.equal(elements['#obNext'].disabled,false);
});

test('the onboarding endpoint refines only on explicit request and keeps its existing quota',async()=>{
 for(const refineWithAI of [undefined,false,true]){
  let aiCalls=0,quotaCalls=0,saved;
  const lib={cors:()=>false,json:(res,status,body)=>({status,body}),verifyUser:async()=>({id:'fixture',authorization:'fixture'}),requireHealthConsent:async()=>{},saveOnboarding:async()=>{},savePlan:async p=>saved=p,countAI:async()=>quotaCalls++,openAI:async()=>{aiCalls++;return{text:'{}'}},parseAIJson:JSON.parse,errorResponse:(res,error)=>{throw error}};
  const context={module:{exports:{}},require:name=>{
   if(name==='../../server/ai-access-v56')return{run:async()=>{quotaCalls++;return lib.openAI()}};
   assert.equal(name,'../../server/v18-lib');return lib;
  },process:{env:{OPENAI_API_KEY:'fixture-not-a-key'}}};
  vm.runInNewContext(read('api/v18/onboarding.js'),context);
  const result=await context.module.exports({method:'POST',body:{answers:{},deterministicPlan:{name:'Fixture'},refineWithAI}},{});
  assert.equal(result.status,200);assert.equal(saved.name,'Fixture');
  assert.equal(aiCalls,refineWithAI===true?1:0);assert.equal(quotaCalls,aiCalls);
 }
});
