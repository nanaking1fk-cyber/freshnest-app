const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../work-gym-planner-v16/accounts-v18.js'),'utf8');
function storage(initial={}){const data=new Map(Object.entries(initial));return{get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}}
function harness({purpose='recovery',query='?auth=recovery&code=fixture',hash='',session=null,failure=false}={}){
 const events=[],calls=[],localStorage=storage({'wgc-v25-pkce-verifier':'fixture-verifier','wgc-v25-pkce-purpose':purpose,...(session?{'wgc-v18-session':JSON.stringify(session)}:{})});
 const c={localStorage,sessionStorage:storage(),document:{readyState:'complete',addEventListener(){}},location:{hash:'',pathname:'/work-gym-planner/shell.html',search:query,protocol:'https:'},URL,URLSearchParams,TextEncoder,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},APP_VERSION:'test',PREFIX:'wgp-v15-',LEGACY_EXPORT_KEYS:[],LEGACY_EXPORT_PREFIXES:[],K:{},$:()=>null,$$:()=>[],openModal(){},closeModal(){},toast(){},profile:()=>null,history:{replaceState(){}}};
 c.window=c;c.dispatchEvent=e=>events.push({type:e.type,recovery:c.WGC18.passwordRecovery,pending:c.WGC18.session?.passwordRecoveryPending});
 c.fetch=async(url,options)=>{calls.push({url,options});return{ok:!failure,status:failure?400:200,headers:{get:()=>null},text:async()=>JSON.stringify(failure?{error:'Expired'}:{access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:4102444800,user:{id:'fixture',email:'test@example.test'}})}};
 c.location.hash=hash;
 vm.createContext(c);
 vm.runInContext(source.slice(0,source.indexOf(' loadSession();if(!A.session)'))+'A.testCallback=consumeAuthRedirect;A.testVerifyRecovery=verifyRecoveryEmail;A.testLoadSession=loadSession;A.testRefreshSession=refreshSession;})(window.WGC18);',c);
 const A=c.WGC18;A.config={loaded:true,cloudConfigured:true,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};A.ensureHealthConsent=async()=>false;
 return {A,c,calls,events,localStorage};
}
test('a recovery callback wins over a stale signup purpose before auth listeners run',async()=>{
 const h=harness({purpose:'signup'});assert.equal(await h.A.testCallback(),true);
 assert.equal(h.A.passwordRecovery,true);assert.equal(h.A.session.passwordRecoveryPending,true);
 assert.deepEqual(h.events.filter(x=>x.type==='wgc:authchange'),[{type:'wgc:authchange',recovery:true,pending:true}]);
 assert.equal(h.calls.length,1);assert.match(h.calls[0].url,/grant_type=pkce/);
 assert.deepEqual(JSON.parse(h.calls[0].options.body),{auth_code:'fixture',code_verifier:'fixture-verifier'});
});
test('stored recovery purpose survives providers that omit the redirect purpose',async()=>{
 const h=harness({query:'?code=fixture'});await h.A.testCallback();assert.equal(h.A.passwordRecovery,true);
});
test('normal signup confirmation is still a normal sign-in',async()=>{
 const h=harness({purpose:'signup',query:'?auth=signup&code=fixture'});await h.A.testCallback();
 assert.equal(h.A.passwordRecovery,false);assert.equal(h.A.session.passwordRecoveryPending,undefined);
});
test('recovery survives tab recreation and token renewal without touching planner records',async()=>{
 const h=harness({session:{access_token:'old',refresh_token:'old-refresh',user:{id:'fixture'},passwordRecoveryPending:true}});
 h.localStorage.setItem('wgp-v15-food-diary-sample','existing-food');
 h.A.testLoadSession();assert.equal(h.A.passwordRecovery,true);
 await h.A.testRefreshSession();assert.equal(h.A.session.passwordRecoveryPending,true);
 assert.equal(JSON.parse(h.localStorage.getItem('wgc-v18-session')).passwordRecoveryPending,true);
 assert.equal(h.localStorage.getItem('wgp-v15-food-diary-sample'),'existing-food');
});
test('a rejected code terminates callback handling instead of falling through to account restore',async()=>{
 const h=harness({failure:true});assert.equal(await h.A.testCallback(),true);
 assert.equal(h.A.session,null);assert.match(h.A.authLinkError,/invalid or expired/);assert.equal(h.events.length,0);
});
test('email proof works in a fresh browser and is not consumed until the user continues',async()=>{
 const h=harness({query:'?auth=recovery',hash:'#recovery_token=email-proof'});
 h.localStorage.removeItem('wgc-v25-pkce-verifier');h.localStorage.removeItem('wgc-v25-pkce-purpose');
 h.localStorage.setItem('wgp-v15-food-diary-sample','existing-food');
 assert.equal(await h.A.testCallback(),true);assert.equal(h.calls.length,0);assert.equal(h.A.recoveryLinkPending,true);
 await h.A.testVerifyRecovery();
 assert.equal(h.calls.length,1);assert.match(h.calls[0].url,/\/auth\/v1\/verify$/);
 assert.deepEqual(JSON.parse(h.calls[0].options.body),{token_hash:'email-proof',type:'recovery'});
 assert.equal(h.A.passwordRecovery,true);assert.equal(h.A.session.passwordRecoveryPending,true);
 assert.equal(h.localStorage.getItem('wgp-v15-food-diary-sample'),'existing-food');
 assert.deepEqual(h.events.filter(x=>x.type==='wgc:authchange'),[{type:'wgc:authchange',recovery:true,pending:true}]);
 await h.A.testVerifyRecovery();assert.equal(h.calls.length,1);
});
test('rejected email proof cannot create a recovery session',async()=>{
 const h=harness({query:'?auth=recovery',hash:'#recovery_token=expired-proof',failure:true});
 await h.A.testCallback();await h.A.testVerifyRecovery();
 assert.equal(h.A.session,null);assert.match(h.A.authLinkError,/expired or was already used/);assert.equal(h.events.length,0);
});
