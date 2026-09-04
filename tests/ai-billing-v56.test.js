const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const policy=require('../server/ai-policy-v56');
const apple=require('../server/apple-subscriptions-v56');
const lib=require('../server/v18-lib');
const access=require('../server/ai-access-v56');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
let db;
const user='00000000-0000-4000-8000-000000000056';
const other='00000000-0000-4000-8000-000000000057';
test.before(async()=>{
 db=new PGlite();
 await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(read('supabase/migrations/20260904133929_apple_ai_credits_v56.sql'));
});
test.after(async()=>db?.close());
test.beforeEach(async()=>{await db.exec('delete from auth.users; delete from public.ai_credit_days;');await db.query('insert into auth.users values ($1),($2)',[user,other])});
async function allowance(id=user,feature=null,reservation=crypto.randomUUID(),limit=100){return (await db.query('select public.ai_allowance_v56($1,$2,$3,$4) as value',[id,feature,reservation,limit])).rows[0].value}
async function grant(id=user,transaction='100056',changes={}){
 const state=await allowance(id),now=Date.now();
 const value={purchase:new Date(now-3600000).toISOString(),expiry:new Date(now+30*86400000).toISOString(),signature:new Date(now).toISOString(),active:true,...changes};
 await db.query('select public.record_apple_ai_subscription_v56($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,state.appAccountToken,'Production','900056',transaction,value.purchase,value.expiry,value.signature,value.active]);
 return value;
}
test('free allowance allows ten requests, rejects concurrent excess, and never trusts client metadata',async()=>{
 const results=await Promise.all(Array.from({length:13},()=>allowance(user,'coach')));
 assert.equal(results.filter(x=>x.allowed).length,10);assert.equal((await allowance()).remaining,0);
 assert.equal((await db.query('select count(*)::int as n from public.ai_credit_requests')).rows[0].n,10);
 assert.equal(results.filter(x=>!x.allowed)[0].reason,'credits');
});
test('every AI scan requires Plus even with a full free balance; denials never debit',async()=>{
 for(const feature of ['meal','equipment','roster','schedule','plan']){
  const result=await allowance(user,feature);
  assert.equal(result.allowed,false);assert.equal(result.reason,'subscription');assert.equal(result.remaining,10);
  assert.equal(policy.publicPolicy().features[feature].subscriptionRequired,true);
 }
 assert.equal((await db.query('select count(*)::int as n from public.ai_credit_requests')).rows[0].n,0);
 await grant();
 for(const feature of ['meal','equipment','roster','schedule','plan'])assert.equal((await allowance(user,feature)).allowed,true);
 assert.equal((await allowance()).remaining,20);
});
test('paid subscription gets 100 credits and duplicate restore does not refill them',async()=>{
 const dates=await grant();
 for(let i=0;i<5;i++)assert.equal((await allowance(user,'roster')).allowed,true);
 assert.equal((await allowance(user,'coach')).allowed,false);
 await grant(user,'100056',dates);
 assert.equal((await allowance()).remaining,0);
 assert.equal((await allowance()).tier,'plus');
 await grant(user,'100057',{...dates,signature:new Date(Date.now()+1000).toISOString()});
 assert.equal((await allowance()).remaining,100);
});
test('expired, revoked and stale verified purchases cannot provide paid access',async()=>{
 const dates=await grant();assert.equal((await allowance()).tier,'plus');
 await grant(user,'100056',{...dates,active:false,signature:new Date(Date.now()+1000).toISOString()});
 assert.equal((await allowance()).tier,'free');
 await grant(user,'100057',{purchase:new Date(Date.now()-86400000).toISOString(),expiry:new Date(Date.now()-1000).toISOString(),signature:new Date(Date.now()+2000).toISOString()});
 assert.equal((await allowance()).tier,'free');
 await grant(user,'100058',{signature:new Date(Date.now()+3000).toISOString()});
 await db.exec("update public.apple_ai_subscriptions set verified_at=now()-interval '11 minutes'");
 assert.equal((await allowance()).tier,'free');
});
test('receipt ownership, stale updates and duplicate request IDs are enforced by the database',async()=>{
 const dates=await grant();
 await assert.rejects(grant(other,'100056',dates),/Purchase update rejected/);
 await assert.rejects(grant(user,'100055',{...dates,signature:new Date(Date.now()-100000).toISOString()}),/Purchase update rejected/);
 const id=crypto.randomUUID();assert.equal((await allowance(user,'coach',id)).allowed,true);
 assert.equal((await allowance(user,'coach',id)).reason,'duplicate');
 assert.equal((await allowance()).remaining,99);
});
test('global capacity rejects before debit and account deletion cascades without cancelling Apple externally',async()=>{
 await allowance(user,'coach',crypto.randomUUID(),1);
 assert.equal((await allowance(other,'coach',crypto.randomUUID(),1)).reason,'capacity');
 assert.equal((await allowance(other)).remaining,10);
 await grant();
 await db.query('delete from auth.users where id=$1',[user]);
 for(const table of ['ai_billing_accounts','apple_ai_subscriptions','ai_credit_periods','ai_credit_requests'])assert.equal((await db.query(`select count(*)::int as n from public.${table} where user_id=$1`,[user])).rows[0].n,0);
});
test('billing tables and allowance RPC are unavailable to ordinary authenticated users',async()=>{
 await db.exec('set role authenticated');
 try{
  await assert.rejects(db.query('select * from public.apple_ai_subscriptions'),/permission denied/);
  await assert.rejects(allowance(),/permission denied/);
 }finally{await db.exec('reset role')}
});
test('model, byte, token and image caps fit the per-credit spend reservation',()=>{
 for(const [name,p] of Object.entries(policy.FEATURES)){
  const imageTokens=p.image?(p.detail==='original'?Math.ceil(8192*1.2):3001):0;
  // Includes a conservative 2,048 token protocol overhead and 25% cache-write
  // input uplift. No favorable cache, batch or Apple commission assumptions.
  const inputRate=p.model==='gpt-5.6-luna'?.2:2,outputRate=p.model==='gpt-5.6-luna'?1.2:12;
  const micros=(p.inputBytes+2048+imageTokens)*inputRate*1.25+p.output*outputRate;
  assert.ok(micros<=p.credits*policy.CREDIT_MICROS,`${name}: ${micros}`);
 }
 const request=policy.boundedRequest('coach',{text:'hello',model:'expensive-client-model',maxOutputTokens:999999});
 assert.equal(request.model,'gpt-5.6-luna');assert.equal(request.maxOutputTokens,1200);
 assert.throws(()=>policy.boundedRequest('coach',{text:'💪'.repeat(5000)}),error=>error.status===413);
 assert.throws(()=>policy.boundedRequest('coach',{text:'x',imageDataUrl:'https://example.com/photo'}));
 assert.throws(()=>policy.boundedRequest('meal',{text:'x',imageDataUrl:'data:image/jpeg;base64,AAAA'}));
});
test('Apple transaction validation rejects wrong app, product, owner, family sharing and future signatures',()=>{
 const token=crypto.randomUUID(),now=Date.now();
 const good={bundleId:policy.BUNDLE_ID,productId:policy.PRODUCT_ID,environment:'Production',type:'Auto-Renewable Subscription',inAppOwnershipType:'PURCHASED',quantity:1,appAccountToken:token,transactionId:'123',originalTransactionId:'123',purchaseDate:now-1000,expiresDate:now+86400000,signedDate:now};
 assert.equal(apple.validateTransaction(good,token,'Production'),good);
 for(const change of [{bundleId:'evil.app'},{productId:'other'},{environment:'Sandbox'},{appAccountToken:crypto.randomUUID()},{inAppOwnershipType:'FAMILY_SHARED'},{signedDate:now+1000000},{expiresDate:now-2000}])assert.throws(()=>apple.validateTransaction({...good,...change},token,'Production'));
});
test('forged Apple transaction and notification signatures never save an entitlement',async()=>{
 const keys=['APPLE_IAP_ENABLED','APPLE_APP_ID','APPLE_ISSUER_ID','APPLE_KEY_ID','APPLE_PRIVATE_KEY','APPLE_SANDBOX_USER_IDS'];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]])),originalFetch=lib.serviceFetch,network=global.fetch;
 const testKey=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({type:'pkcs8',format:'pem'});
 Object.assign(process.env,{APPLE_IAP_ENABLED:'true',APPLE_APP_ID:'123456789',APPLE_ISSUER_ID:crypto.randomUUID(),APPLE_KEY_ID:'TESTKEY123',APPLE_PRIVATE_KEY:testKey,APPLE_SANDBOX_USER_IDS:user});
 let saved=0,requests=0;
 lib.serviceFetch=async route=>{if(route==='rpc/ai_allowance_v56')return{appAccountToken:crypto.randomUUID()};saved++;throw Error('Unexpected entitlement write')};
 global.fetch=async()=>{requests++;throw Error('A forged signature must not reach Apple')};
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const forged=[encode({alg:'ES256',x5c:[]}),encode({bundleId:policy.BUNDLE_ID,productId:policy.PRODUCT_ID,environment:'Production',transactionId:'123456789'}),Buffer.alloc(64).toString('base64url')].join('.');
 try{
  await assert.rejects(apple.verifyPurchase(user,forged),error=>error.code==='APPLE_INVALID');
  await assert.rejects(apple.notification(forged),error=>error.code==='APPLE_INVALID');
  assert.equal(saved,0);assert.equal(requests,0);
 }finally{lib.serviceFetch=originalFetch;global.fetch=network;for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
});
test('image dimensions are bounded and only read matching JPEG, PNG and WebP headers',()=>{
 const {imageDimensions}=require('../server/image-dimensions-v56');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hEAAAAAASUVORK5CYII=','base64');
 assert.deepEqual(imageDimensions(png,'png'),{width:1,height:1,type:'png'});
 const jpeg=Buffer.from([0xff,0xd8,0xff,0xc0,0,8,8,0,4,0,8,1,0xff,0xd9]);
 assert.deepEqual(imageDimensions(jpeg,'jpeg'),{width:8,height:4,type:'jpg'});
 const webp=Buffer.alloc(30);webp.write('RIFF');webp.writeUInt32LE(22,4);webp.write('WEBPVP8X',8);webp.writeUInt32LE(10,16);webp.writeUIntLE(99,24,3);webp.writeUIntLE(49,27,3);
 assert.deepEqual(imageDimensions(webp,'webp'),{width:100,height:50,type:'webp'});
 webp[20]=2;assert.throws(()=>imageDimensions(webp,'webp'));webp[20]=0;
 for(const [bytes,mime] of [[png,'jpeg'],[jpeg,'png'],[webp.subarray(0,25),'webp'],[Buffer.from('icns00000000'),'jpeg'],[Buffer.from([0xff,0xd8,0xff,0xe1,0,0,0,0,0,0,0,0]),'jpeg']])assert.throws(()=>imageDimensions(bytes,mime));
 const large=Buffer.from(png);large.writeUInt32BE(4000,16);large.writeUInt32BE(4000,20);
 assert.throws(()=>policy.boundedRequest('roster',{imageDataUrl:'data:image/png;base64,'+large.toString('base64')}),error=>error.status===413);
 for(let i=0;i<200;i++){
  const bytes=crypto.randomBytes(128);bytes.writeUInt16BE(0xffd8);
  // Random bytes can occasionally form a legal size header. Either a bounded
  // result or an explicit format error is valid; never an out-of-bounds read.
  try{const size=imageDimensions(bytes,'jpeg');assert.ok(size.width>0&&size.height>0)}catch(error){assert.match(error.message,/JPEG|dimensions/)}
 }
});
test('no provider call is made after a denied reservation or invalid request',async()=>{
 const originalFetch=lib.serviceFetch,originalAI=lib.openAI,originalKey=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='synthetic-test-only';let called=0;
 lib.serviceFetch=async path=>path.startsWith('apple_ai_subscriptions')?[]:{allowed:false,reason:'credits',remaining:0,resetsAt:'2026-10-01T00:00:00Z'};
 lib.openAI=async()=>{called++;return{text:'bad'}};
 try{await assert.rejects(access.run({id:user,app_metadata:{plan:'premium'}},'coach',{text:'hello'}),error=>error.code==='AI_CREDITS_REQUIRED');assert.equal(called,0)}
 finally{lib.serviceFetch=originalFetch;lib.openAI=originalAI;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey}
});
test('every paid AI endpoint goes through the shared allowance and free onboarding does not spend automatically',()=>{
 for(const file of ['api/v18/coach.js','api/v18/meal-scan.js','api/v18/onboarding.js','api/v25/schedule.js','api/v25/roster-scan.js']){
  const source=read(file);assert.match(source,/access\.run\(user,/);assert.doesNotMatch(source,/await (?:lib\.)?openAI\(/);
 }
 assert.match(read('api/v18/onboarding.js'),/refineWithAI===true/);
 assert.match(read('work-gym-planner-v16/onboarding-v18.js'),/Refine with AI Plus/);
 assert.doesNotMatch(read('work-gym-planner-v16/ai-coach-v18.js'),/TRIAL_KEY|paid plan required|one free question/i);
 for(const file of ['work-gym-planner/index.html','work-gym-planner/boot.js','work-gym-planner/sw.js','work-gym-planner-v16/sw.js'])assert.match(read(file),/ai-subscription-v56\.js/);
 const config=JSON.parse(read('vercel.json'));
 for(const route of ['api/v18/*.js','api/v25/*.js'])assert.equal(config.functions[route].includeFiles,'server/apple-certs/*.cer');
 assert.match(read('.github/workflows/quality.yml'),/Install server and regression-test dependencies\s+run: npm ci/);
});

test('subscription rejection reaches the client without sending a photo to the AI provider',async()=>{
 const originalFetch=lib.serviceFetch,originalAI=lib.openAI,originalKey=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='synthetic-test-only';let called=0;
 lib.serviceFetch=async route=>route.startsWith('apple_ai_subscriptions')?[]:{allowed:false,reason:'subscription',tier:'free',remaining:10};
 lib.openAI=async()=>{called++;return{text:'unexpected'}};
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hEAAAAAASUVORK5CYII=';
 try{await assert.rejects(access.run({id:user},'meal',{imageDataUrl:image,text:'meal'}),error=>error.status===402&&error.code==='AI_SUBSCRIPTION_REQUIRED');assert.equal(called,0)}
 finally{lib.serviceFetch=originalFetch;lib.openAI=originalAI;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey}
});
