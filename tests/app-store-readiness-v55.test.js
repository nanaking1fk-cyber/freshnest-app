const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function storage(initial={}){
 const values=new Map(Object.entries(initial));
 return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
function nativeHarness({platform='ios',launchUrl,session=storage(),local=storage(),browserFails=false}={}){
 const listeners={},replaced=[],assigned=[],logs=[];let reloads=0,closed=0;
 const location={href:'capacitor://localhost/index.html',origin:'capacitor://localhost',replace:url=>replaced.push(url),assign:url=>assigned.push(url),reload:()=>reloads++};
 const App={addListener:(name,fn)=>{listeners[name]=fn},getLaunchUrl:async()=>({url:launchUrl})};
 const Browser={close:async()=>closed++,open:async()=>{if(browserFails)throw Error('Browser unavailable')}};
 const window={Capacitor:{getPlatform:()=>platform,Plugins:{App,Browser}},dispatchEvent:()=>{},toast:()=>{}};
 const context={window,location,document:{documentElement:{classList:{add(){}}},addEventListener(){},querySelector(){return null}},
  console:{warn:(...args)=>logs.push(args)},localStorage:local,sessionStorage:session,URL,TextEncoder,Uint8Array,
  btoa:value=>Buffer.from(value,'binary').toString('base64'),crypto:{subtle:{digest:async(_algorithm,value)=>new Uint8Array(createHash('sha256').update(value).digest()).buffer}},
  CustomEvent:function(){},history:{back(){}}};
 vm.runInNewContext(read('app-store/native/native-bridge.js'),context);
 return {window,listeners,replaced,assigned,logs,session,local,get reloads(){return reloads},get closed(){return closed},
  async flush(){for(let i=0;i<12;i++)await Promise.resolve()}};
}

test('iOS includes a no-tracking privacy manifest with health, account and diagnostics disclosures',()=>{
 const privacy=read('app-store/ios/App/App/PrivacyInfo.xcprivacy');
 const project=read('app-store/ios/App/App.xcodeproj/project.pbxproj');
 assert.match(project,/PrivacyInfo\.xcprivacy in Resources/);
 assert.match(privacy,/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
 assert.match(privacy,/NSPrivacyAccessedAPICategoryFileTimestamp/);
 assert.match(privacy,/<string>C617\.1<\/string>/);
 assert.match(privacy,/NSPrivacyAccessedAPICategoryUserDefaults/);
 assert.match(privacy,/<string>CA92\.1<\/string>/);
 for(const type of ['Health','Fitness','EmailAddress','UserID','PhotosorVideos','CustomerSupport','CrashData','OtherDiagnosticData'])assert.ok(privacy.includes('NSPrivacyCollectedDataType'+type),type);
 const declarations=privacy.match(/<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<false\/>/g)||[];
 assert.equal(declarations.length,(privacy.match(/<key>NSPrivacyCollectedDataType<\/key>/g)||[]).length);
});

test('local health storage is preserved but excluded from automatic backup before the WebView opens',()=>{
 const storageSource=read('app-store/ios/App/App/AppDataPrivacy.swift');
 const delegate=read('app-store/ios/App/App/AppDelegate.swift');
 const scene=read('app-store/ios/App/App/SceneDelegate.swift');
 assert.match(storageSource,/\["WebKit", "Application Support"\]/);
 assert.match(storageSource,/isExcludedFromBackup = true/);
 assert.doesNotMatch(storageSource,/removeItem|removePersistentDomain|delete|erase/);
 assert.match(delegate,/AppDataPrivacy\.preparePrivateStorage\(\)/);
 assert.ok(scene.indexOf('AppDataPrivacy.preparePrivateStorage()')<scene.indexOf('WorkWorkoutBridgeViewController()'));
 assert.match(scene,/sceneDidEnterBackground/);
 assert.match(read('app-store/ios/App/App.xcodeproj/project.pbxproj'),/AppDataPrivacy\.swift in Sources/);
});

test('iOS permission descriptions cover actual optional capture and step features',()=>{
 const info=read('app-store/ios/App/App/Info.plist');
 for(const key of ['NSCameraUsageDescription','NSPhotoLibraryUsageDescription','NSMicrophoneUsageDescription','NSSpeechRecognitionUsageDescription','NSHealthShareUsageDescription'])assert.ok(info.includes(key),key);
 assert.match(info,/meal, roster, equipment or barcode photo/);
 assert.match(info,/personalized AI/);
 assert.match(info,/workandworkout/);
 assert.match(read('app-store/android/app/src/main/AndroidManifest.xml'),/android:host="auth-callback"/);
});

test('native external-browser failure never replaces the installed app with remote code',async()=>{
 const native=nativeHarness({browserFails:true});
 assert.equal(await native.window.WGPNative.openExternal('https://www.workandworkout.com/work-gym-planner/privacy.html'),false);
 assert.deepEqual(native.assigned,[]);
 assert.equal(await native.window.WGPNative.openExternal('javascript:alert(1)'),false);
 const web=nativeHarness({platform:'web',browserFails:true});
 assert.equal(await web.window.WGPNative.openExternal('https://example.com/'),true);
 assert.deepEqual(web.assigned,['https://example.com/']);
});

test('native email callbacks return to the packaged app without changing PKCE or diary storage',async()=>{
 for(const purpose of ['signup','recovery']){
  const local=storage({verifier:'private-pkce',diary:'existing-diary'}),h=nativeHarness({local});
  assert.equal(h.window.WGPNative.authRedirectUrl(purpose),'workandworkout://auth-callback?auth='+purpose);
  const url='workandworkout://auth-callback?auth='+purpose+'&code=one-time-code-123';
  assert.equal(await h.listeners.appUrlOpen({url}),true);
  assert.deepEqual(h.replaced,['capacitor://localhost/index.html?auth='+purpose+'&code=one-time-code-123']);
  assert.equal(h.closed,1);
  assert.deepEqual([...local.values],[['verifier','private-pkce'],['diary','existing-diary']]);
  assert.doesNotMatch(JSON.stringify([...h.session.values])+JSON.stringify(h.logs),/one-time-code|private-pkce/);
  assert.equal(await h.listeners.appUrlOpen({url}),false);
  assert.equal(h.replaced.length,1);
 }
});

test('cold email launch is handled once, including after a document reload',async()=>{
 const launchUrl='workandworkout://auth-callback?auth=recovery&code=cold-launch-code-123',session=storage();
 const first=nativeHarness({launchUrl,session});await first.flush();
 assert.equal(first.replaced.length,1);
 const reloaded=nativeHarness({launchUrl,session});await reloaded.flush();
 assert.equal(reloaded.replaced.length,0);
 assert.equal(await reloaded.listeners.appUrlOpen({url:'workandworkout://auth-callback?auth=signup&code=another-code-456'}),true);
});

test('native email return rejects foreign, ambiguous, token and oversized links',async()=>{
 const h=nativeHarness();
 const invalid=[
  'https://auth-callback?auth=signup&code=12345678',
  'workandworkout://auth-callback.evil?auth=signup&code=12345678',
  'workandworkout://user@auth-callback?auth=signup&code=12345678',
  'workandworkout://auth-callback:1234?auth=signup&code=12345678',
  'workandworkout://auth-callback/elsewhere?auth=signup&code=12345678',
  'workandworkout://auth-callback?auth=signup&auth=recovery&code=12345678',
  'workandworkout://auth-callback?auth=signup&code=12345678&code=87654321',
  'workandworkout://auth-callback?auth=signup&access_token=secret',
  'workandworkout://auth-callback?auth=recovery&code=12345678#access_token=secret',
  'workandworkout://auth-callback?auth=recovery&code=short',
  'workandworkout://auth-callback?auth=recovery&code='+ 'a'.repeat(2049),
  'workandworkout://auth-callback?auth=recovery&error='+ 'a'.repeat(4100),
  'workandworkout://auth-callback?auth=signup',
  'workandworkout://auth-callback?auth=admin&code=12345678',
  'workandworkout://calendar-connected?next=https://evil.example'
 ];
 for(const url of invalid)assert.equal(await h.listeners.appUrlOpen({url}),false,url.slice(0,100));
 assert.deepEqual(h.replaced,[]);assert.equal(h.reloads,0);assert.equal(h.session.values.size,0);
 assert.equal(await h.listeners.appUrlOpen({url:'workandworkout://auth-callback?auth=signup&error=access_denied&error_code=otp_expired'}),true);
 assert.match(h.replaced[0],/error_code=otp_expired/);
});

test('calendar callbacks cannot reload-loop and later reconnections still work',async()=>{
 const session=storage(),url='workandworkout://calendar-connected';
 const h=nativeHarness({launchUrl:url,session});await h.flush();assert.equal(h.reloads,0);
 assert.equal(await h.listeners.appUrlOpen({url}),true);assert.equal(h.reloads,1);
 assert.equal(await h.listeners.appUrlOpen({url}),false);
 const reloaded=nativeHarness({launchUrl:url,session});await reloaded.flush();assert.equal(reloaded.reloads,0);
 assert.equal(await reloaded.listeners.appUrlOpen({url}),true);assert.equal(reloaded.reloads,1);
});

test('native bundle rewrites email redirects while website PKCE exchange remains protected',()=>{
 const build=read('app-store/scripts/build-web.mjs'),account=read('work-gym-planner-v16/accounts-v18.js');
 assert.match(build,/if\(window\.WGPNative\?\.isNative&&purpose!=='recovery'\)return window\.WGPNative\.authRedirectUrl\(purpose\)/);
 assert.ok(account.includes("function authRedirectUrl(purpose='signup'){let url=new URL('/work-gym-planner/shell.html','https://www.workandworkout.com');"));
 assert.match(account,/grant_type=pkce/);
 assert.match(account,/PKCE_VERIFIER_KEY/);
 assert.match(account,/else if\(A\.passwordRecovery\)\{[\s\S]*?openAccount\('signin'\)[\s\S]*?return;\s*\}else await afterAuth\(\)/);
 assert.match(read('app-store/scripts/audit-bundle.mjs'),/Native email confirmation\/password recovery return handling is incomplete/);
});

test('support offers a private channel before a public issue report',()=>{
 const support=read('work-gym-planner/support.html');
 assert.match(support,/mailto:info@bibiniifarms\.com\?subject=Work%20%2B%20Workout%20Support/);
 assert.match(support,/Do not send passwords, confirmation links, payment details or health records/);
 assert.ok(support.indexOf('Email support')<support.indexOf('public issue tracker</a>'));
});

test('submission preflight explicitly blocks the incomplete payment/signing release',()=>{
 const result=spawnSync(process.execPath,['app-store/scripts/audit-submission.mjs'],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,1);
 assert.match(result.stderr,/NOT READY FOR APP STORE SUBMISSION/);
 assert.match(result.stderr,/Real Apple product/);
 // A selected development team does not satisfy the distribution-signing gate.
 assert.match(result.stderr,/signed distribution archive/);
 assert.doesNotMatch(result.stderr,/privacy manifest|permission explanation|return handling is incomplete|backup protection is missing/);
 assert.match(result.stdout,/Supabase native redirect allowlist/);
});
