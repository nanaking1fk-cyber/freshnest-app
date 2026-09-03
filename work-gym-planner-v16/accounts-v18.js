// v18 accounts, cloud migration, restore and account lifecycle ----------------
APP_VERSION='30.1.31';
window.WGC18=window.WGC18||{};
(function(A){
 const SESSION_KEY='wgc-v18-session',LAST_SYNC_KEY='wgc-v18-last-sync',OWNER_KEY='wgc-v18-local-owner',UNCLAIMED_KEY='wgc-v18-unclaimed-device-state',USER_CACHE_PREFIX='wgc-v18-user-cache:',AUTH_EVENT_KEY='wgc-v59-auth-event',PKCE_VERIFIER_KEY='wgc-v25-pkce-verifier',PKCE_PURPOSE_KEY='wgc-v25-pkce-purpose',RECOVERY_KEY='wgc-v25-password-recovery',RECOVERY_COOLDOWN_KEY='wgc-v43-recovery-cooldown',LEGACY_AUTH_FRAGMENT=legacyAuthFragment(location.hash);
 if(LEGACY_AUTH_FRAGMENT)window.history.replaceState(null,'',location.pathname+location.search);
 // Only bearer-token fragments from the retired implicit flow are rejected.
 // In-page anchors such as #landingFeatures must keep working.
 function legacyAuthFragment(hash){
  const core=window.WGC23Core;
  if(core&&typeof core.isLegacyAuthFragment==='function')return core.isLegacyAuthFragment(hash);
  const raw=String(hash==null?'':hash).replace(/^#/,'').trim();
  if(!raw||raw.indexOf('=')<0)return false;
  return /(?:^|&)(?:access_token|refresh_token|provider_token|provider_refresh_token|id_token)=[^&]/.test(raw);
 }
 A.config={loaded:false,cloudConfigured:false,aiConfigured:false,supabaseUrl:null,supabaseAnonKey:null,apiVersion:18};
 A.session=null;A.apiBase='';A.syncTimer=null;A.authBusy=false;A.passwordRecovery=sessionStorage.getItem(RECOVERY_KEY)==='1';
 A.accountState='checking';A.cloudStateReady=false;A.cloudStateOwner=null;A.cloudRevision=null;
 let accountLoad=null,sessionRefresh=null;
 const BASELINE_PREFIX='wgc-v44-cloud-revision:',PROTECTED_PREFIX='wgc-v44-protected-copy:';
 const accountModulesReady=new Promise(resolve=>{if(document.readyState==='complete')resolve();else document.addEventListener('DOMContentLoaded',resolve,{once:true})});
 A.canStartOnboarding=()=>!A.deviceStorageBlocked&&(!A.session||A.accountState==='ready'||A.accountState==='local');
 function blockDeviceData(blocked){A.deviceStorageBlocked=!!blocked;document.body?.classList?.toggle('accountDataLocked',!!blocked);if(blocked){A.cloudStateReady=false;A.cloudStateOwner=null;clearTimeout(A.syncTimer);clearTimeout(A._syncTimer)}renderDeviceGuard()}
 function renderDeviceGuard(){
  if(!document.body?.insertAdjacentHTML)return;
  if(!$('#deviceDataGuard'))document.body.insertAdjacentHTML('beforeend','<section id="deviceDataGuard" aria-labelledby="deviceDataGuardTitle"><div><h1 id="deviceDataGuardTitle">Your records are protected</h1><p>This device could not save a recovery copy. Your records are still here, but hidden until you sign in to their original account.</p><button id="unlockDeviceData" class="primary">Sign in to the original account</button><p>Then export a backup before freeing up space. Do not clear this app’s storage.</p></div></section>');
  const button=$('#unlockDeviceData');if(button)button.onclick=()=>{clearRecoveryFlag();saveSession(null);openAccount('signin')};
 }
 function setAccountState(value){A.accountState=value;A.cloudStateReady=value==='ready';if(!A.cloudStateReady)A.cloudStateOwner=null;renderAccountUI();window.renderTodayDashboard?.()}
 function absoluteApiBase(){return '/api/v18'}
 A.api=function(path=''){let b=A.apiBase||absoluteApiBase();return b?b+('/'+String(path).replace(/^\//,'')):''};
 function status(t,bad=false){let el=$('#accountStatus');if(el){el.textContent=t||'';el.classList.toggle('bad',!!bad)}}
 function saveSession(s){let previous=A.session?.user?.id;A.session=s||null;if(previous!==A.session?.user?.id){A.accountState='checking';A.cloudStateReady=false;A.cloudStateOwner=null;A.cloudRevision=null}if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);renderAccountUI();window.dispatchEvent(new CustomEvent('wgc:authchange',{detail:{signedIn:!!A.session}}))}
 // A recovery session that is abandoned must not leave the "choose a new
 // password" panel armed for the next account signed in on this tab.
 function clearRecoveryFlag(){try{sessionStorage.removeItem(RECOVERY_KEY)}catch{}A.passwordRecovery=false}
 function loadSession(){try{A.session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{A.session=null}}
 function sessionExpired(s=A.session){if(!s?.access_token)return true;let exp=+s.expires_at||0;return exp&&Date.now()/1000>exp-60}
 async function requestText(url,opt={},shouldContinue){
  // Small, already-authorized autosaves may finish while this page closes.
  // Larger states retain the normal retry/restore path (keepalive has a 64 KiB cap).
  if(document.visibilityState==='hidden'&&opt.method==='PUT'&&/\/state(?:\?|$)/.test(url)&&typeof opt.body==='string'&&typeof TextEncoder!=='undefined'&&new TextEncoder().encode(opt.body).byteLength<60000)opt={...opt,keepalive:true};
  if(window.WWObservability?.request){
   const reading=['GET','HEAD'].includes(String(opt.method||'GET').toUpperCase()),scan=/\/(?:meal-scan|coach|onboarding)(?:\?|$)/.test(url);
   return window.WWObservability.request(url,opt,{readText:true,retries:reading?1:0,timeoutMs:scan?75000:reading?15000:25000,shouldContinue});
  }
  const response=await fetch(url,opt);return{response,text:await response.text()};
 }
 async function raw(url,opt={}){let {response:r,text:txt}=await requestText(url,opt),j={};if(txt){try{j=JSON.parse(txt)}catch{j={error:txt}}}if(!r.ok){let error=Error(j.error_description||j.msg||j.error||j.message||`Request failed (${r.status})`);error.status=r.status;error.code=j.error_code||j.code||null;error.retryAfter=Math.max(0,Number(r.headers.get('retry-after'))||0);throw error}return j}
 function base64Url(bytes){let binary='';bytes.forEach(value=>binary+=String.fromCharCode(value));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
 async function beginPkce(purpose){let bytes=new Uint8Array(48);crypto.getRandomValues(bytes);let verifier=base64Url(bytes),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));localStorage.setItem(PKCE_VERIFIER_KEY,verifier);localStorage.setItem(PKCE_PURPOSE_KEY,purpose);return base64Url(new Uint8Array(digest))}
 function passwordStrong(value){return String(value||'').length>=12&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/\d/.test(value)&&/[^A-Za-z0-9]/.test(value)}
 function recoveryCooldown(){try{return Math.max(0,Number(localStorage.getItem(RECOVERY_COOLDOWN_KEY)||0)-Date.now())}catch{return 0}}
 function setRecoveryCooldown(seconds){try{localStorage.setItem(RECOVERY_COOLDOWN_KEY,String(Date.now()+Math.max(1,Number(seconds)||60)*1000))}catch{}}
 function restorePkce(verifier,purpose){if(verifier)localStorage.setItem(PKCE_VERIFIER_KEY,verifier);else localStorage.removeItem(PKCE_VERIFIER_KEY);if(purpose)localStorage.setItem(PKCE_PURPOSE_KEY,purpose);else localStorage.removeItem(PKCE_PURPOSE_KEY)}
 function friendlyRecoveryError(error){
  if(error?.code==='over_email_send_rate_limit'||error?.status===429){setRecoveryCooldown(error.retryAfter||3600);let friendly=Error('Reset emails are temporarily at capacity. If an email already arrived, use the newest one. Otherwise, try again in about an hour.');friendly.code=error.code||'over_email_send_rate_limit';friendly.status=429;return friendly}
  return error;
 }
 function runRecoveryCountdown(button){
  if(!button)return;
  clearInterval(button._recoveryTimer);
  var update=function(){var seconds=Math.ceil(recoveryCooldown()/1000);button.disabled=seconds>0||A.authBusy;button.textContent=seconds>0?'Resend in '+(seconds>=60?Math.ceil(seconds/60)+' min':seconds+' sec'):'Forgot password?';if(!seconds){clearInterval(button._recoveryTimer);button._recoveryTimer=null}};
  update();if(recoveryCooldown()>0)button._recoveryTimer=setInterval(update,1000);
 }
 async function loadConfig(){A.apiBase=absoluteApiBase();if(!A.apiBase){A.config.loaded=true;renderAccountUI();return A.config}try{let j=await raw(A.api('config'));A.config={...A.config,...j,loaded:true};return A.config}catch(e){A.config.loaded=true;A.config.error=e.message;return A.config}finally{renderAccountUI()}}
 function refreshSession(){
  const s=A.session;if(!s?.refresh_token||!A.config.supabaseUrl)return Promise.resolve(null);
  if(sessionRefresh?.token===s.refresh_token)return sessionRefresh.promise;
  const task={token:s.refresh_token};
  task.promise=(async()=>{
   try{
    const j=await raw(`${A.config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
    if(A.session?.refresh_token!==s.refresh_token)return A.session;
    saveSession(j);return j;
   }catch(error){
    // A network outage is not a sign-out. Nor may an old request sign out a new login.
    if(A.session?.refresh_token===s.refresh_token&&[400,401,403].includes(error.status)){lockPlannerForLoggedOut();saveSession(null)}
    throw error;
   }finally{if(sessionRefresh===task)sessionRefresh=null}
  })();sessionRefresh=task;return task.promise;
 }
 A.accessToken=async function(){if(!A.session)return null;if(sessionExpired())await refreshSession();return A.session?.access_token||null};
 A.authedFetch=async function(path,opt={},retry=true){
  const uid=A.session?.user?.id,token=await A.accessToken();
  if(!token||A.session?.user?.id!==uid)throw Error('Sign in again to continue.');
  const headers={...(opt.headers||{}),Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const {response:r,text:txt}=await requestText(A.api(path),{...opt,headers},()=>A.session?.user?.id===uid);let j={};if(txt){try{j=JSON.parse(txt)}catch{j={error:'The account service returned an unexpected response.'}}}
  if(A.session?.user?.id!==uid)throw Error('Your account changed. Please try again.');
  if(r.status===401&&retry&&A.session?.refresh_token){if(A.session.access_token===token)await refreshSession();return A.authedFetch(path,opt,false)}
  if(r.status===401){lockPlannerForLoggedOut();saveSession(null)}
  if(!r.ok||j.ok===false){const error=Error(j.error||j.message||`Request failed (${r.status})`);error.code=j.code||null;error.status=r.status;error.requestId=r.headers?.get?.('x-request-id')||null;throw error}
  return j;
 };
 async function signIn(email,password){if(!A.config.cloudConfigured)throw Error('Account server is not configured yet.');let j=await raw(`${A.config.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});clearRecoveryFlag();saveSession(j);await afterAuth();return j}
 // Use the direct shell: older installed workers may have cached the folder
 // URL after a redirect, which Safari cannot replay when opening an email.
 function authRedirectUrl(purpose='signup'){let url=new URL('/work-gym-planner/shell.html','https://www.workandworkout.com');url.searchParams.set('auth',purpose==='recovery'?'recovery':'signup');return url.href}
 async function signUp(name,email,password){
  if(!A.config.cloudConfigured)throw Error('Account server is not configured yet.');if(!passwordStrong(password))throw Error('Use 12+ characters with uppercase, lowercase, a number and a symbol.');
  const previousVerifier=localStorage.getItem(PKCE_VERIFIER_KEY),previousPurpose=localStorage.getItem(PKCE_PURPOSE_KEY),target=encodeURIComponent(authRedirectUrl('signup')),challenge=await beginPkce('signup');let j;
  try{j=await raw(`${A.config.supabaseUrl}/auth/v1/signup?redirect_to=${target}`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{display_name:name||''},code_challenge:challenge,code_challenge_method:'s256'})})}catch(error){if(error?.status)restorePkce(previousVerifier,previousPurpose);throw error}
  if(j.access_token){saveSession(j);await afterAuth()}else lockPlannerForLoggedOut();return j;
 }
 async function recover(email){
  if(!A.config.cloudConfigured)throw Error('Account server is not configured yet.');
  var remaining=recoveryCooldown();if(remaining){let wait=Error('A reset email was already requested. Use the newest email, or wait before sending another.');wait.code='recovery_cooldown';wait.retryAfter=Math.ceil(remaining/1000);throw wait}
  var previousVerifier=localStorage.getItem(PKCE_VERIFIER_KEY),previousPurpose=localStorage.getItem(PKCE_PURPOSE_KEY),target=encodeURIComponent(authRedirectUrl('recovery')),challenge=await beginPkce('recovery');
  try{await raw(`${A.config.supabaseUrl}/auth/v1/recover?redirect_to=${target}`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email,code_challenge:challenge,code_challenge_method:'s256'})});setRecoveryCooldown(60)}catch(error){if(error?.status)restorePkce(previousVerifier,previousPurpose);throw friendlyRecoveryError(error)}
 }
 function isPlannerKey(k){return !!k&&(k.startsWith(PREFIX)||LEGACY_EXPORT_KEYS?.includes?.(k)||LEGACY_EXPORT_PREFIXES?.some?.(p=>k.startsWith(p)))}
 function clearLocalPlanner(){let keys=[];for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(isPlannerKey(k))keys.push(k)}keys.forEach(k=>localStorage.removeItem(k));return keys.length}
 function cacheKey(uid){return USER_CACHE_PREFIX+uid}
 function meaningfulState(state){return Object.entries(state?.storage||{}).some(([key,value])=>/profile$|training-history|training-drafts|food-diary-|body-log$|health-log$|my-foods$|recipes$|schedule-events-v25$|schedule-rotations-v25$|schedule-overrides$|bellevue-|plan-snapshots$|onboarding-v18$/.test(key)&&value&&!['null','{}','[]',''].includes(String(value)))}
 function protectCopy(uid,state){if(!uid||!meaningfulState(state))return;const key=PROTECTED_PREFIX+uid;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state))}
 function stashForUser(uid){if(!uid)return;let current=A.captureLocalState?.()||captureLocalState(),previous=cachedForUser(uid);if(previous&&stateFingerprint(previous)!==stateFingerprint(current))protectCopy(uid,previous);if(meaningfulState(current)||!previous)localStorage.setItem(cacheKey(uid),JSON.stringify(current))}
 function cachedForUser(uid){try{return JSON.parse(localStorage.getItem(cacheKey(uid))||'null')}catch{return null}}
 function lockPlannerForLoggedOut(){
  try{
  const owner=localStorage.getItem(OWNER_KEY),hasVisibleData=localDataCount()>0;
  if(hasVisibleData){
   if(owner)stashForUser(owner);
   else localStorage.setItem(UNCLAIMED_KEY,JSON.stringify(A.captureLocalState?.()||captureLocalState()));
  }
  clearLocalPlanner();
  localStorage.removeItem(OWNER_KEY);blockDeviceData(false);return true;
  }catch(error){blockDeviceData(true);A.accountState='storage-blocked';status('Device storage is full or unavailable. Your records were kept and hidden. Sign in to their original account to export a backup.',true);window.WWObservability?.capture?.('account_storage',error,{name:'StorageRecoveryError',message:'Device recovery copy could not be saved'});return false}
 }
 async function signOut(){
  let uid=A.session?.user?.id;
  clearRecoveryFlag();
  try{if(A.session)await A.pushState({quiet:true})}catch(e){recordDiagnostic?.('signout-sync',e)}
  try{stashForUser(uid)}catch(error){status('We could not save a device recovery copy. Export a backup before signing out; your records have not changed.',true);return false}
  clearLocalPlanner();
  localStorage.removeItem(OWNER_KEY);
  try{let t=await A.accessToken();if(t&&A.config.supabaseUrl)await fetch(`${A.config.supabaseUrl}/auth/v1/logout?scope=global`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,Authorization:`Bearer ${t}`}})}catch{}
  saveSession(null);
  status('Signed out. Planner data for this account is no longer visible on this device.');
  setTimeout(()=>location.reload(),250)
 }
 function captureLocalState(){let storage={};for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(isPlannerKey(k))storage[k]=localStorage.getItem(k)}return{schemaVersion:23,appVersion:APP_VERSION,capturedAt:new Date().toISOString(),storage}}
 function localDataCount(){return Object.keys(captureLocalState().storage).length}
 function restoreCloudState(state,{snapshot=true}={}){if(!state?.storage||typeof state.storage!=='object'||Array.isArray(state.storage))throw Error('No compatible cloud data found.');if(snapshot)createRecoverySnapshot?.('before-cloud-restore');let count=window.WGC23Core.applyPlannerStorage(localStorage,state.storage,{prefix:PREFIX,replace:true});localStorage.removeItem(K.migrated);return count}
 A.pushState=async function({quiet=false}={}){if(!A.session)return false;if(!A.cloudStateReady){if(quiet)return false;await A.resumeAccount?.();if(!A.cloudStateReady)return false}A.assertCloudReady();if(!await A.ensureHealthConsent?.({interactive:!quiet,purpose:'account_cloud_sync'}))return false;let state=A.captureLocalState(),j=await A.authedFetch('state',{method:'PUT',body:JSON.stringify({state,baseUpdatedAt:A.cloudRevision})});A.acceptCloudRevision(j.updatedAt);localStorage.setItem(LAST_SYNC_KEY,j.updatedAt||new Date().toISOString());if(!quiet){status('Your account is synced.');toast('Account sync complete')}renderAccountUI();return true};
 A.pullState=async function(){
  // A restore clicked while a consent/login check is finishing must still perform its own read.
  if(accountLoad)await accountLoad;
  const result=await afterAuth({forceCloud:true});
  if(!result?.ok)throw Error(result?.message||'Your cloud account has not been loaded. Nothing has been overwritten.');
  if(result.empty)throw Error('There is no saved planner in this cloud account yet. Your device data has not been replaced.');
  toast('Your saved planner has been restored.');return localDataCount();
 };
 A.queueSync=function(){if(!A.session)return;clearTimeout(A.syncTimer);A.syncTimer=setTimeout(()=>A.pushState({quiet:true}).catch(e=>recordDiagnostic?.('account-sync',e)),1500)};
 function stateFingerprint(state){return JSON.stringify(Object.entries(state?.storage||{}).filter(([key])=>window.WGC23Core?.isPlannerKey(key,PREFIX)!==false&&![K.migrated,K.recovery,K.diagnostics].includes(key)).sort(([a],[b])=>a.localeCompare(b)))}
 function finishAccountLoad(remote){
  const uid=A.session?.user?.id;if(!uid)return;
  A.cloudRevision=remote?.updatedAt||null;A.cloudStateOwner=uid;A.accountState='ready';A.cloudStateReady=true;
  try{localStorage.setItem(BASELINE_PREFIX+uid,JSON.stringify(A.cloudRevision))}catch{}
  renderAccountUI();window.renderAll?.();
  if(profile())window.dispatchEvent(new CustomEvent('wgc:profile-ready'));
  else setTimeout(()=>{if(!profile()&&A.canStartOnboarding()&&!A.passwordRecovery)A.openOnboarding?.({auto:true})},150);
 }
 async function afterAuth({forceCloud=false}={}){
  if(accountLoad)return accountLoad;
  accountLoad=(async()=>{
   const uid=A.session?.user?.id;if(!uid)return;
   setAccountState('checking');
   try{
   const owner=localStorage.getItem(OWNER_KEY),current=A.captureLocalState?.()||captureLocalState();
   if(owner&&owner!==uid){blockDeviceData(true);stashForUser(owner);clearLocalPlanner()}
   else if(!owner&&meaningfulState(current)){
    blockDeviceData(true);
    const unclaimed=localStorage.getItem(UNCLAIMED_KEY);
    if(unclaimed&&unclaimed!==JSON.stringify(current))localStorage.setItem(UNCLAIMED_KEY+':latest',JSON.stringify(current));
    else if(!unclaimed)localStorage.setItem(UNCLAIMED_KEY,JSON.stringify(current));
    clearLocalPlanner();
   }
   localStorage.setItem(OWNER_KEY,uid);
   blockDeviceData(false);
   const cached=cachedForUser(uid);
   if(!meaningfulState(A.captureLocalState?.()||captureLocalState())&&meaningfulState(cached))restoreCloudState(cached,{snapshot:false});
    const privacy=!forceCloud&&A.reviewPrivacyForOnboarding?await A.reviewPrivacyForOnboarding():{cloudAllowed:await A.ensureHealthConsent?.({interactive:true,purpose:'account_cloud_sync'})};
    if(A.session?.user?.id!==uid)return;
    if(!privacy.cloudAllowed){
     if(privacy.deviceOnly&&!forceCloud){useDeviceOnly();return{ok:true,local:true}}
     setAccountState('needs-consent');openAccount('signin');status('Your saved account has not been changed. Choose Load saved account when you are ready.');return;
    }
    const remote=await A.authedFetch('state');
    if(A.session?.user?.id!==uid)return;
    if(!remote||!Object.prototype.hasOwnProperty.call(remote,'state')||(remote.state!==null&&(!remote.state?.storage||typeof remote.state.storage!=='object'||Array.isArray(remote.state.storage)||!remote.updatedAt)))throw Error('The saved-account response was incomplete.');
    const local=A.captureLocalState?.()||captureLocalState();
    if(forceCloud&&!meaningfulState(remote.state)){
     setAccountState('choice');
     const message='There is no saved planner in this cloud account yet. Your device data has not been replaced.';
     status(message,true);return {ok:false,empty:true,message};
    }
    let baseline;try{baseline=JSON.parse(localStorage.getItem(BASELINE_PREFIX+uid)||'null')}catch{}
    if(remote.state){
     if(!forceCloud&&meaningfulState(local)&&stateFingerprint(local)!==stateFingerprint(remote.state)&&baseline!==remote.updatedAt){
      protectCopy(uid,local);setAccountState('choice');openAccount('signin');status('A saved account and an on-device copy were found. Neither has been overwritten.');return;
     }
     if(forceCloud||!meaningfulState(local)||baseline!==remote.updatedAt){
      protectCopy(uid,local);stashForUser(uid);restoreCloudState(remote.state);
     }
    }
    finishAccountLoad(remote);
    status(meaningfulState(remote.state)?'Your saved planner is ready.':'Your account was checked. No saved planner was found.');
    return {ok:true,empty:!meaningfulState(remote.state)};
   }catch(error){
    if(A.session?.user?.id!==uid)return;
    const message=error.name==='QuotaExceededError'?'This device needs space for a recovery copy. Export a backup before trying again; your saved account is unchanged.':error.status===401?'Please sign in again, then choose Restore from account.':error.code==='HEALTH_CONSENT_REQUIRED'?'Turn on Sync across devices in Privacy choices, then try again.':'We could not load your saved account. Nothing has been overwritten. Check your connection and try again.';
    setAccountState('unavailable');openAccount('signin');status(message,true);
    window.WWObservability?.capture?.('account_restore',error,{name:'AccountRestoreError',message:'Account restore failed'});
    return {ok:false,message};
   }
  })().finally(()=>{accountLoad=null});
  return accountLoad;
 }
 function accountSafetyHTML(){
  if(A.cloudStateReady||A.passwordRecovery)return'';
  const checking=A.accountState==='checking',local=A.accountState==='local',choice=A.accountState==='choice';
  return '<div class="accountUnavailable" id="accountRestoreGuard"><b>'+(checking?'Checking your saved account…':local?'Using this device only':choice?'Choose your saved copy':'Your saved account is protected')+'</b><p>'+(checking?'Sync and new-account setup stay paused until your saved account is checked.':local?'Cloud sync is off. Your saved online account will not be changed.':choice?'Your cloud plan and device copy are different. Loading your cloud plan keeps a protected device recovery copy.':'Your account has not been loaded yet. This does not mean your account is empty.')+'</p>'+(checking?'':'<button id="loadSavedAccount" class="primary wideBtn">'+(choice?'Load saved cloud account':'Load saved account')+'</button><button id="useDeviceOnly" class="wideBtn">Use this device only</button>')+'</div>';
 }
 function bindAccountSafety(){
  $('#loadSavedAccount')?.addEventListener('click',()=>afterAuth({forceCloud:true}));
  $('#useDeviceOnly')?.addEventListener('click',useDeviceOnly);
 }
 function useDeviceOnly(){if(A.deviceStorageBlocked||localStorage.getItem(OWNER_KEY)!==A.session?.user?.id){status('This device copy could not be safely separated. Sign in to its original account and export a backup first.',true);return}setAccountState('local');closeModal('accountDialog');window.renderAll?.();if(!profile())A.openOnboarding?.({auto:true})}
 A.resumeAccount=afterAuth;
 window.addEventListener?.('online',()=>{if(A.session&&A.accountState==='unavailable')A.resumeAccount?.()});
 A.assertCloudReady=function(){if(A.deletingAccount||!A.cloudStateReady||A.cloudStateOwner!==A.session?.user?.id||localStorage.getItem(OWNER_KEY)!==A.session?.user?.id)throw Object.assign(Error('Load your saved account before syncing. Your cloud copy has not been changed.'),{code:'CLOUD_STATE_NOT_READY'})};
 A.acceptCloudRevision=function(updatedAt,uid=A.session?.user?.id){if(uid!==A.session?.user?.id||uid!==A.cloudStateOwner)return;A.cloudRevision=updatedAt||null;try{localStorage.setItem(BASELINE_PREFIX+uid,JSON.stringify(A.cloudRevision))}catch{}};
 A.pauseCloudSync=function(){setAccountState('choice');status('Your saved account changed on another device. Load it before syncing; both copies are protected.',true)};
 async function consumeAuthRedirect(){
  if(LEGACY_AUTH_FRAGMENT){status('For your security, this older confirmation link can no longer be accepted. Request a new email and try again.',true);return false}
  const params=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.slice(1)),code=params.get('code');
  if(params.has('error')||params.has('error_code')||fragment.has('error')||fragment.has('error_code')){
   window.history.replaceState(null,'',location.pathname);clearRecoveryFlag();openAccount('signin');
   status(params.get('auth')==='recovery'?'This password reset link has expired or was already used. Request a new reset email.':'This email link has expired or was already used. Try signing in with your email and password first. You do not need to create another account.',true);return true;
  }
  if(!code)return false;
  const requestedPurpose=params.get('auth'),storedPurpose=localStorage.getItem(PKCE_PURPOSE_KEY);
  const purpose=['signup','recovery'].includes(storedPurpose)?storedPurpose:(['signup','recovery'].includes(requestedPurpose)?requestedPurpose:'signup');
  window.history.replaceState(null,'',location.pathname);
  const verifier=localStorage.getItem(PKCE_VERIFIER_KEY);
  if(!verifier){openAccount('signin');status(purpose==='recovery'?'This reset link must be opened in the same browser where you requested it. Enter your email and request a new link here.':'This link opened in a different browser. Sign in with the email and password you used to create your account to continue.',true);return true}
  try{
   const session=await raw(`${A.config.supabaseUrl}/auth/v1/token?grant_type=pkce`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({auth_code:code,code_verifier:verifier})});
   localStorage.removeItem(PKCE_VERIFIER_KEY);localStorage.removeItem(PKCE_PURPOSE_KEY);
   saveSession(session);
   if(purpose==='recovery'){
    sessionStorage.setItem(RECOVERY_KEY,'1');A.passwordRecovery=true;renderAccountUI();openAccount('signin');status('Choose a new password to finish recovery.');toast('Choose a new password to finish recovery.');return true
   }
   await afterAuth();
   toast('Email confirmed. Your private plan is ready to build.');
   return true
  }catch(e){localStorage.removeItem(PKCE_VERIFIER_KEY);localStorage.removeItem(PKCE_PURPOSE_KEY);clearRecoveryFlag();openAccount('signin');status(purpose==='recovery'?'This password reset link is invalid or expired. Enter your email and request a new link.':'The confirmation link could not be completed. Request a new email in this browser.',true);return false}
 }
 A.signIn=signIn;A.signUp=signUp;A.signOut=signOut;A.recover=recover;A.captureLocalState=captureLocalState;A.restoreCloudState=restoreCloudState;
 function clearDeletedAccountLocally(uid){
  clearTimeout(A.syncTimer);clearTimeout(A._syncTimer);
  clearLocalPlanner();localStorage.removeItem(OWNER_KEY);localStorage.removeItem(LAST_SYNC_KEY);
  for(const key of [cacheKey(uid),PROTECTED_PREFIX+uid,BASELINE_PREFIX+uid,'wgc-health-consent-v35:'+uid,'ww-workpay-v58:'+uid])localStorage.removeItem(key);
  clearRecoveryFlag()
 }
 A.deleteAccount=async function(confirmation,expectedUserId){
  const uid=A.session?.user?.id;
  if(confirmation!=='DELETE ACCOUNT'||!uid||expectedUserId!==uid)throw Error('Confirm deletion for the account currently signed in.');
  if(A.deletingAccount)return false;
  A.deletingAccount=true;clearTimeout(A.syncTimer);clearTimeout(A._syncTimer);
  try{
   await A.waitForPendingSync?.();
   if(A.session?.user?.id!==uid)throw Error('Your account changed. Please try again.');
   const result=await A.authedFetch('account',{method:'DELETE',body:JSON.stringify({confirmation,expectedUserId:uid})});
   if(result?.deleted!==true||result?.verified!==true)throw Error('Deletion was not confirmed. Your device data has been kept.');
   if(A.session?.user?.id!==uid)return true;
   clearDeletedAccountLocally(uid);saveSession(null);
   try{localStorage.setItem(AUTH_EVENT_KEY,JSON.stringify({type:'account-deleted',uid,at:Date.now()}))}catch{}
   return true;
  }finally{A.deletingAccount=false}
 };
 window.addEventListener?.('storage',event=>{
  if(event.key!==AUTH_EVENT_KEY||!event.newValue)return;
  let message;try{message=JSON.parse(event.newValue)}catch{return}
  const uid=A.session?.user?.id;
  if(message?.type!=='account-deleted'||!uid||message.uid!==uid)return;
  clearDeletedAccountLocally(uid);saveSession(null);
  status('This account was permanently deleted in another tab.');
  setTimeout(()=>location.reload(),250)
 });
 function accountAction(kind){
  const uid=A.session?.user?.id;if(!uid)return openAccount('signin');
  const deleting=kind==='delete';
  let modal=$('#accountActionDialog');
  if(!modal){document.body.insertAdjacentHTML('beforeend','<div id="accountActionDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="accountActionTitle"><div class="sheet largeSheet"><h2 id="accountActionTitle"></h2><div id="accountActionBody"></div></div></div>');modal=$('#accountActionDialog')}
  $('#accountActionTitle').textContent=deleting?'Delete your account?':'Restore your saved planner?';
  $('#accountActionBody').innerHTML=`<p>${deleting?'This permanently deletes your account and its saved cloud data. It cannot be undone.':'Load the planner saved to your account. We will keep a recovery copy of this device first. If the cloud copy is empty, we will not replace your data.'}</p><p><b>${esc(accountEmail())}</b></p>${deleting?'<label>Type DELETE ACCOUNT to confirm<input id="accountDeleteConfirm" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>':''}<p id="accountActionStatus" role="status" aria-live="polite"></p><div class="sheetActions"><button id="accountActionCancel">Cancel</button><button id="accountActionConfirm" class="${deleting?'danger':'primary'}" ${deleting?'disabled':''}>${deleting?'Delete account permanently':'Restore planner'}</button></div>`;
  let busy=false;
  const cancel=()=>{if(!busy){closeModal('accountActionDialog');openAccount('signin')}};
  $('#accountActionCancel').onclick=cancel;
  modal.onclick=event=>{if(event.target===modal)cancel()};
  modal.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();cancel()}};
  const input=$('#accountDeleteConfirm'),button=$('#accountActionConfirm');
  if(input)input.oninput=()=>{button.disabled=input.value.trim()!=='DELETE ACCOUNT'};
  button.onclick=async()=>{
   if(busy)return;if(A.session?.user?.id!==uid)return cancel();
   busy=true;button.disabled=true;$('#accountActionCancel').disabled=true;
   $('#accountActionStatus').textContent=deleting?'Deleting your account…':'Loading your saved planner…';
   try{
    if(deleting){await A.deleteAccount(input.value.trim(),uid);closeModal('accountActionDialog');status('Your account and its local planner copy were deleted.');toast('Account deleted');setTimeout(()=>location.reload(),250)}
    else{await A.pullState();closeModal('accountActionDialog');closeModal('accountDialog')}
   }catch(error){
    $('#accountActionStatus').textContent=error.message||'We could not finish. Please try again.';
    window.WWObservability?.capture?.(deleting?'account_delete':'account_restore',error,{name:deleting?'AccountDeleteError':'AccountRestoreError',message:deleting?'Account deletion failed':'Account restore failed'});
   }finally{busy=false;button.disabled=deleting&&input.value.trim()!=='DELETE ACCOUNT';$('#accountActionCancel').disabled=false}
  };
  closeModal('accountDialog');openModal('accountActionDialog');
 }
 function accountEmail(){return A.session?.user?.email||A.session?.user?.user_metadata?.email||''}
 function renderAccountUI(){let signed=!!A.session?.access_token,body=$('#accountBody'),chip=$('#accountChip');$('#signOutQuick')?.remove();if(chip){chip.textContent=signed?(accountEmail()||'Account'):'Sign in';chip.classList.toggle('signed',signed)}if(!body)return;if(!A.config.loaded){body.innerHTML='<p class="muted">Checking account service…</p>';return}if(!A.config.cloudConfigured){body.innerHTML='<div class="accountUnavailable"><b>Cloud accounts are temporarily unavailable.</b><p>The secure account service is not configured on this deployment. No alternate API destination can receive your sign-in token.</p></div>';return}if(!signed){body.innerHTML=`<div class="authTabs"><button type="button" data-auth-tab="signin" class="active">Sign in</button><button type="button" data-auth-tab="signup">Create account</button></div><form id="signinPane" class="authPane" autocomplete="on"><label>Email<input id="loginEmail" name="username" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label>Password<input id="loginPassword" name="password" type="password" autocomplete="current-password" required></label><button id="loginBtn" type="submit" class="primary wideBtn">Sign in</button><button id="recoverBtn" type="button" class="linkBtn">Forgot password?</button></form><form id="signupPane" class="authPane hidden" autocomplete="on"><label>Name<input id="signupName" name="name" autocomplete="name" required maxlength="80"></label><label>Email<input id="signupEmail" name="username" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label>Password<input id="signupPassword" name="new-password" type="password" minlength="12" autocomplete="new-password" required></label><small>Use 12+ characters with uppercase, lowercase, a number and a symbol.</small><button id="signupBtn" type="submit" class="primary wideBtn">Create account</button><p class="muted">Next: choose your privacy settings, then build your plan. Cloud backup and AI features are optional.</p></form>`;$$('[data-auth-tab]').forEach(b=>b.onclick=()=>{$$('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#signinPane').classList.toggle('hidden',b.dataset.authTab!=='signin');$('#signupPane').classList.toggle('hidden',b.dataset.authTab!=='signup')});$('#signinPane').onsubmit=async event=>{event.preventDefault();if(A.authBusy)return;let email=$('#loginEmail'),password=$('#loginPassword');if(!email.checkValidity()||!password.value)return status('Enter a valid email and password.',true);A.authBusy=true;status('Signing in…');try{await signIn(email.value.trim(),password.value);if(A.canStartOnboarding())closeModal('accountDialog');toast('Signed in')}catch(e){status(e.message,true)}finally{A.authBusy=false}};$('#signupPane').onsubmit=async event=>{event.preventDefault();if(A.authBusy)return;let name=$('#signupName'),email=$('#signupEmail'),password=$('#signupPassword');if(!name.value.trim())return status('Enter your name.',true);if(!email.checkValidity())return status('Enter a valid email address.',true);if(!passwordStrong(password.value))return status('Use 12+ characters with uppercase, lowercase, a number and a symbol.',true);A.authBusy=true;status('Creating account…');try{let j=await signUp(name.value.trim(),email.value.trim(),password.value);if(!j.access_token)status('Account created. Open the confirmation email in this browser to finish securely.');else{closeModal('accountDialog');toast('Account created')}}catch(e){status(e.message,true)}finally{A.authBusy=false}};let recoverButton=$('#recoverBtn');runRecoveryCountdown(recoverButton);recoverButton.onclick=async()=>{let email=$('#loginEmail');if(A.authBusy||recoveryCooldown())return runRecoveryCountdown(recoverButton);if(!email.checkValidity())return status('Enter a valid email first.',true);A.authBusy=true;recoverButton.disabled=true;recoverButton.textContent='Sending reset email…';try{await recover(email.value.trim());status('Password reset email sent. Open the newest email in this browser to continue securely.')}catch(e){status(e.message,true)}finally{A.authBusy=false;runRecoveryCountdown(recoverButton)}};return}
 let last=localStorage.getItem(LAST_SYNC_KEY),when=last?new Date(last).toLocaleString():'Never';
 body.innerHTML=`${A.passwordRecovery?`<form id="recoveryPasswordForm" class="accountUnavailable authPane" autocomplete="on"><b>Choose a new password</b><p>Use 12+ characters with uppercase, lowercase, a number and a symbol.</p><label>Email<input id="recoveryEmail" name="username" type="email" value="${esc(accountEmail())}" autocomplete="username" readonly></label><label>New password<input id="recoveryNewPassword" name="new-password" type="password" minlength="12" autocomplete="new-password" required></label><button id="saveRecoveredPassword" type="submit" class="primary wideBtn">Set new password</button></form>`:''}<div class="signedAccount"><div class="accountIdentity"><span>${esc((accountEmail()||'?')[0].toUpperCase())}</span><div><b>${esc(accountEmail()||'Signed in')}</b><small>Last sync: ${esc(when)}</small></div><button id="signOutAccount">Sign out</button></div><div class="accountMenu"><details class="accountMenuSection" ${A.cloudStateReady?'':'open'}><summary><span>Cloud backup &amp; restore<small>Sync, restore and device protection</small></span><i>⌄</i></summary><div class="accountMenuBody">${accountSafetyHTML()}<div class="accountActions"><button id="migrateDevice" class="primary"><b>Sync this device</b><small>Upload only this account's planner, training and nutrition records</small></button><button id="restoreAccount"><b>Restore from account</b><small>Replace this device with the private cloud copy</small></button><button id="syncAccount"><b>Sync now</b><small>Update your account with this device</small></button></div></div></details><details class="accountMenuSection"><summary><span>Plan settings<small>Work, workouts, recovery and nutrition</small></span><i>⌄</i></summary><div class="accountMenuBody"><div class="accountActions"><button id="startOnboardingAccount"><b>Edit adaptive plan</b><small>Update your planning preferences</small></button></div></div></details><details class="accountMenuSection"><summary><span>Privacy &amp; account<small>Optional features and permanent deletion</small></span><i>⌄</i></summary><div class="accountMenuBody">${A.healthConsentPanelHTML?.()||''}<div class="dangerZone"><b>Delete cloud account</b><p>This removes your login and saved cloud data. It is different from deleting only this device's copy.</p><button id="deleteCloudAccount" class="danger">Delete account permanently</button></div></div></details></div></div>`;
 A.bindHealthConsentPanel?.();bindAccountSafety();
 for(const id of ['migrateDevice','syncAccount']){const button=$('#'+id);if(button)button.disabled=!A.cloudStateReady}
 if($('#startOnboardingAccount'))$('#startOnboardingAccount').disabled=!A.canStartOnboarding();
 $('#recoveryPasswordForm')?.addEventListener('submit',async event=>{event.preventDefault();let value=$('#recoveryNewPassword').value;if(!passwordStrong(value))return status('Use 12+ characters with uppercase, lowercase, a number and a symbol.',true);try{let token=await A.accessToken();await raw(`${A.config.supabaseUrl}/auth/v1/user`,{method:'PUT',headers:{apikey:A.config.supabaseAnonKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({password:value})});sessionStorage.removeItem(RECOVERY_KEY);A.passwordRecovery=false;status('Password updated.');renderAccountUI();toast('Password updated securely');await afterAuth()}catch(e){status(e.message,true)}});
 $('#migrateDevice').onclick=async()=>{if(!confirm(`Upload this device's ${localDataCount()} planner records to your signed-in account?`))return;status('Migrating this device…');try{await A.pushState()}catch(e){status(e.message,true)}};
 $('#restoreAccount').onclick=()=>accountAction('restore');
 $('#syncAccount').onclick=async()=>{status('Syncing…');try{await A.pushState()}catch(e){status(e.message,true)}};
 $('#startOnboardingAccount').onclick=()=>{closeModal('accountDialog');window.WGC18?.openOnboarding?.()};
 $('#signOutAccount').onclick=signOut;
 $('#deleteCloudAccount').onclick=()=>accountAction('delete');
 }
 function openAccount(mode='signin'){renderAccountUI();if(location.protocol==='file:'){let body=$('#accountBody');if(body)body.innerHTML='<div class="accountUnavailable"><b>This is a local preview.</b><p>Accounts and private cloud sync only work on the secure live website.</p><a class="primary wideBtn accountLiveLink" href="https://www.workandworkout.com/">Open the secure website</a></div>';openModal('accountDialog');return}openModal('accountDialog');let tries=0,timer=setInterval(()=>{let tab=$(`[data-auth-tab="${mode}"]`);if(tab){tab.click();clearInterval(timer)}else if(++tries>8)clearInterval(timer)},100)}
 A.openAccount=openAccount;A.renderAccountUI=renderAccountUI;
 function injectUI(){let cards=$('#page-more .menuCards');if(cards&&!$('#openAccountV18')){let b=document.createElement('button');b.id='openAccountV18';b.innerHTML='<span>👤</span><div><b>Account & sync</b><small id="accountMenuText">Profile, privacy, sync and sign out</small></div><i>›</i>';cards.insertBefore(b,cards.firstChild);b.onclick=()=>openAccount('signin')}let home=$('#todayDashboard');if(home&&!$('#accountChip')){let chip=document.createElement('button');chip.id='accountChip';chip.className='accountChip';chip.onclick=()=>openAccount('signin');home.parentElement?.insertBefore(chip,home)}$('#signOutQuick')?.remove();if(!$('#accountDialog'))document.body.insertAdjacentHTML('beforeend',`<div id="accountDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="accountTitle"><div class="sheet largeSheet premiumAccountSheet"><div class="sheetHandle"></div><div class="sheetHead"><h2 id="accountTitle">Your Work + Workout account</h2><button data-close="accountDialog">Done</button></div><div id="accountBody"></div><p id="accountStatus" class="statusText"></p></div></div>`);let close=$('#accountDialog [data-close]');if(close)close.onclick=()=>closeModal('accountDialog');$('#accountDialog')?.addEventListener('click',e=>{if(e.target.id==='accountDialog')closeModal('accountDialog')});renderAccountUI()}
 function hookSync(){for(const name of ['saveProfileObj','saveNutritionObj','saveHistory','saveDrafts','saveOverrides','saveSnapshots','saveBodyLog','saveDiary','mergeHealthDay','saveBMonth']){let fn=window[name];if(typeof fn!=='function'||fn.__wgc18sync)continue;let wrapped=function(...args){let r=fn.apply(this,args);Promise.resolve(r).finally(()=>A.queueSync());return r};wrapped.__wgc18sync=true;window[name]=wrapped}document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')A.queueSync()})}
 loadSession();if(!A.session)lockPlannerForLoggedOut();injectUI();hookSync();loadConfig().then(async()=>{
    await accountModulesReady;if(await consumeAuthRedirect())return;
    if(A.session&&sessionExpired())await refreshSession().catch(()=>{});
    if(!A.session){clearRecoveryFlag();lockPlannerForLoggedOut()}
    else if(A.passwordRecovery){
      // Resume the unfinished password change before cloud restore or optional consent.
      renderAccountUI();openAccount('signin');status('Choose a new password to finish recovery.');return;
    }else await afterAuth();
    renderAccountUI();
  });document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{injectUI();hookSync();renderAccountUI()},80));
})(window.WGC18);
(function(){let st=document.createElement('style');st.textContent=`.accountChip{position:fixed;right:16px;top:max(12px,env(safe-area-inset-top));z-index:35;border:1px solid rgba(255,255,255,.13);background:#101b2a;color:#dbe6f3;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:900;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.accountChip.signed{color:#5ce179;border-color:rgba(54,212,91,.28)}.signOutQuick{position:fixed;right:16px;top:max(48px,calc(env(safe-area-inset-top) + 44px));z-index:35;border:1px solid rgba(255,255,255,.13);background:#101b2a;color:#dbe6f3;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:850}.authTabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}.authTabs button{border-radius:10px}.authTabs button.active{background:#2563eb;color:#fff}.authPane{display:grid;gap:9px}.authPane label{font-size:9px;color:var(--muted)}.authPane input{width:100%;margin-top:4px}.linkBtn{background:transparent!important;border:0!important;color:#60a5fa!important}.accountIdentity{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:12px}.accountIdentity>span{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#243247;font-weight:900}.accountIdentity>div{min-width:0;flex:1}.accountIdentity>button{white-space:nowrap}.accountIdentity b,.accountIdentity small{display:block}.accountIdentity small{color:var(--muted);font-size:8px;margin-top:3px}.accountActions{display:grid;gap:8px;margin-top:12px}.accountActions button{text-align:left;padding:11px}.accountActions button b,.accountActions button small{display:block}.accountActions button small{font-size:8px;color:var(--muted);margin-top:3px}.accountActions .primary small{color:#dbeafe}.signedAccount .dangerZone{display:flex;gap:8px;margin-top:14px}.accountUnavailable{padding:12px;border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.06);border-radius:12px;margin-bottom:12px}.accountUnavailable p{font-size:9px;color:var(--muted);line-height:1.5}.statusText.bad{color:#f97066}`;document.head.appendChild(st)})();
(function(){let st=document.createElement('style');st.textContent=`.accountLiveLink{display:flex;align-items:center;justify-content:center;text-decoration:none}
/* Account isolation applies to every theme, including dialogs left open before expiry. */
#deviceDataGuard{display:none}
body.accountDataLocked> :not(#deviceDataGuard):not(#accountDialog):not(style):not(script){display:none!important}
body.accountDataLocked #deviceDataGuard{position:fixed;inset:0;z-index:50;display:grid;place-items:center;overflow:auto;padding:max(24px,env(safe-area-inset-top)) 24px;background:#0c1117;color:#f2f6f8}
body.accountDataLocked #deviceDataGuard>div{width:min(100%,440px);line-height:1.6}
body.accountDataLocked #deviceDataGuard h1{font-size:clamp(24px,6vw,32px);line-height:1.2}
body.accountDataLocked #deviceDataGuard button{min-height:48px;width:100%;white-space:normal}
body.accountDataLocked #deviceDataGuard p{font-size:16px;color:#bec7cc}
body.accountDataLocked #accountDialog{z-index:10001}`;document.head.appendChild(st)})();
