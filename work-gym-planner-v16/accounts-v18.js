// v18 accounts, cloud migration, restore and account lifecycle ----------------
APP_VERSION='30.1.20';
window.WGC18=window.WGC18||{};
(function(A){
 const SESSION_KEY='wgc-v18-session',LAST_SYNC_KEY='wgc-v18-last-sync',OWNER_KEY='wgc-v18-local-owner',UNCLAIMED_KEY='wgc-v18-unclaimed-device-state',USER_CACHE_PREFIX='wgc-v18-user-cache:',PKCE_VERIFIER_KEY='wgc-v25-pkce-verifier',PKCE_PURPOSE_KEY='wgc-v25-pkce-purpose',RECOVERY_KEY='wgc-v25-password-recovery',LEGACY_AUTH_FRAGMENT=legacyAuthFragment(location.hash);
 if(LEGACY_AUTH_FRAGMENT)history.replaceState(null,'',location.pathname+location.search);
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
 function absoluteApiBase(){return '/api/v18'}
 A.api=function(path=''){let b=A.apiBase||absoluteApiBase();return b?b+('/'+String(path).replace(/^\//,'')):''};
 function status(t,bad=false){let el=$('#accountStatus');if(el){el.textContent=t||'';el.classList.toggle('bad',!!bad)}}
 function saveSession(s){A.session=s||null;if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);renderAccountUI();window.dispatchEvent(new CustomEvent('wgc:authchange',{detail:{signedIn:!!A.session}}))}
 // A recovery session that is abandoned must not leave the "choose a new
 // password" panel armed for the next account signed in on this tab.
 function clearRecoveryFlag(){try{sessionStorage.removeItem(RECOVERY_KEY)}catch{}A.passwordRecovery=false}
 function loadSession(){try{A.session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{A.session=null}}
 function sessionExpired(s=A.session){if(!s?.access_token)return true;let exp=+s.expires_at||0;return exp&&Date.now()/1000>exp-60}
 async function raw(url,opt={}){let r=await fetch(url,opt),txt=await r.text(),j={};if(txt){try{j=JSON.parse(txt)}catch{j={error:txt}}}if(!r.ok)throw Error(j.error_description||j.msg||j.error||j.message||`Request failed (${r.status})`);return j}
 function base64Url(bytes){let binary='';bytes.forEach(value=>binary+=String.fromCharCode(value));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
 async function beginPkce(purpose){let bytes=new Uint8Array(48);crypto.getRandomValues(bytes);let verifier=base64Url(bytes),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));localStorage.setItem(PKCE_VERIFIER_KEY,verifier);localStorage.setItem(PKCE_PURPOSE_KEY,purpose);return base64Url(new Uint8Array(digest))}
 function passwordStrong(value){return String(value||'').length>=12&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/\d/.test(value)&&/[^A-Za-z0-9]/.test(value)}
 async function loadConfig(){A.apiBase=absoluteApiBase();if(!A.apiBase){A.config.loaded=true;renderAccountUI();return A.config}try{let j=await raw(A.api('config'));A.config={...A.config,...j,loaded:true};return A.config}catch(e){A.config.loaded=true;A.config.error=e.message;return A.config}finally{renderAccountUI()}}
 async function refreshSession(){let s=A.session;if(!s?.refresh_token||!A.config.supabaseUrl)return null;try{let j=await raw(`${A.config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});saveSession(j);return j}catch(e){lockPlannerForLoggedOut();saveSession(null);throw e}}
 A.accessToken=async function(){if(!A.session)return null;if(sessionExpired())await refreshSession();return A.session?.access_token||null};
 A.authedFetch=async function(path,opt={},retry=true){let token=await A.accessToken();if(!token)throw Error('Sign in required.');let headers={...(opt.headers||{}),Authorization:`Bearer ${token}`,'Content-Type':'application/json'};let r=await fetch(A.api(path),{...opt,headers}),txt=await r.text(),j={};if(txt){try{j=JSON.parse(txt)}catch{j={error:txt}}}if((r.status===401||r.status===403)&&retry&&A.session?.refresh_token){try{await refreshSession()}catch(e){lockPlannerForLoggedOut();saveSession(null);throw e}return A.authedFetch(path,opt,false)}if((r.status===401||r.status===403)&&!retry){lockPlannerForLoggedOut();saveSession(null)}if(!r.ok||j.ok===false)throw Error(j.error||j.message||`Request failed (${r.status})`);return j};
 async function signIn(email,password){if(!A.config.cloudConfigured)throw Error('Account server is not configured yet.');let j=await raw(`${A.config.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});clearRecoveryFlag();saveSession(j);await afterAuth();return j}
 function authRedirectUrl(){return 'https://www.workandworkout.com/'}
 async function signUp(name,email,password){if(!A.config.cloudConfigured)throw Error('Account server is not configured yet.');if(!passwordStrong(password))throw Error('Use 12+ characters with uppercase, lowercase, a number and a symbol.');let target=encodeURIComponent(authRedirectUrl()),challenge=await beginPkce('signup'),j=await raw(`${A.config.supabaseUrl}/auth/v1/signup?redirect_to=${target}`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{display_name:name||''},code_challenge:challenge,code_challenge_method:'s256'})});if(j.access_token){saveSession(j);await afterAuth()}else lockPlannerForLoggedOut();return j}
 async function recover(email){if(!A.config.cloudConfigured)throw Error('Account server is not configured yet.');let target=encodeURIComponent(authRedirectUrl()),challenge=await beginPkce('recovery');await raw(`${A.config.supabaseUrl}/auth/v1/recover?redirect_to=${target}`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email,code_challenge:challenge,code_challenge_method:'s256'})})}
 function isPlannerKey(k){return !!k&&(k.startsWith(PREFIX)||LEGACY_EXPORT_KEYS?.includes?.(k)||LEGACY_EXPORT_PREFIXES?.some?.(p=>k.startsWith(p)))}
 function clearLocalPlanner(){let keys=[];for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(isPlannerKey(k))keys.push(k)}keys.forEach(k=>localStorage.removeItem(k));return keys.length}
 function cacheKey(uid){return USER_CACHE_PREFIX+uid}
 function stashForUser(uid){if(!uid||!localDataCount())return;try{localStorage.setItem(cacheKey(uid),JSON.stringify(captureLocalState()))}catch{}}
 function cachedForUser(uid){try{return JSON.parse(localStorage.getItem(cacheKey(uid))||'null')}catch{return null}}
 function lockPlannerForLoggedOut(){
  const owner=localStorage.getItem(OWNER_KEY),hasVisibleData=localDataCount()>0;
  if(hasVisibleData){
   if(owner)stashForUser(owner);
   else try{localStorage.setItem(UNCLAIMED_KEY,JSON.stringify(captureLocalState()))}catch{}
  }
  clearLocalPlanner();
  localStorage.removeItem(OWNER_KEY)
 }
 async function signOut(){
  let uid=A.session?.user?.id;
  clearRecoveryFlag();
  try{if(A.session)await A.pushState({quiet:true})}catch(e){recordDiagnostic?.('signout-sync',e)}
  stashForUser(uid);
  clearLocalPlanner();
  localStorage.removeItem(OWNER_KEY);
  try{let t=await A.accessToken();if(t&&A.config.supabaseUrl)await fetch(`${A.config.supabaseUrl}/auth/v1/logout?scope=global`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,Authorization:`Bearer ${t}`}})}catch{}
  saveSession(null);
  status('Signed out. Planner data for this account is no longer visible on this device.');
  setTimeout(()=>location.reload(),250)
 }
 function captureLocalState(){let storage={};for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(isPlannerKey(k))storage[k]=localStorage.getItem(k)}return{schemaVersion:23,appVersion:APP_VERSION,capturedAt:new Date().toISOString(),storage}}
 function localDataCount(){return Object.keys(captureLocalState().storage).length}
 function restoreCloudState(state,{snapshot=true}={}){if(!state?.storage||typeof state.storage!=='object')throw Error('No compatible cloud data found.');let recovery=null;if(snapshot){createRecoverySnapshot?.('before-cloud-restore');recovery=localStorage.getItem(K.recovery)}clearLocalPlanner();let count=0;for(const [k,v] of Object.entries(state.storage)){if(isPlannerKey(k)){localStorage.setItem(k,String(v));count++}}if(recovery)localStorage.setItem(K.recovery,recovery);localStorage.removeItem(K.migrated);return count}
 A.pushState=async function({quiet=false}={}){if(!A.session)return false;let state=captureLocalState(),j=await A.authedFetch('state',{method:'PUT',body:JSON.stringify({state})});localStorage.setItem(LAST_SYNC_KEY,j.updatedAt||new Date().toISOString());if(!quiet){status(`Synced ${Object.keys(state.storage).length} local records to your account.`);toast('Account sync complete')}renderAccountUI();return true};
 A.pullState=async function({reload=true}={}){let j=await A.authedFetch('state');if(!j.state)throw Error('This account does not have saved app data yet.');let count=restoreCloudState(j.state);localStorage.setItem(LAST_SYNC_KEY,j.updatedAt||new Date().toISOString());status(`Restored ${count} records from your account.`);if(reload)setTimeout(()=>location.reload(),500);else renderAll?.();return count};
 A.queueSync=function(){if(!A.session)return;clearTimeout(A.syncTimer);A.syncTimer=setTimeout(()=>A.pushState({quiet:true}).catch(e=>recordDiagnostic?.('account-sync',e)),1500)};
 async function afterAuth(){
  renderAccountUI();
  const uid=A.session?.user?.id;
  if(!uid)throw Error('The account session is missing a user id.');
  let remote=null;try{remote=await A.authedFetch('state')}catch{}
  const owner=localStorage.getItem(OWNER_KEY),hasVisibleData=localDataCount()>0;
  if(owner&&owner!==uid){stashForUser(owner);clearLocalPlanner()}
  else if(!owner&&hasVisibleData){
   try{localStorage.setItem(UNCLAIMED_KEY,JSON.stringify(captureLocalState()))}catch{}
   clearLocalPlanner()
  }
  localStorage.setItem(OWNER_KEY,uid);
  if(remote?.state){
   restoreCloudState(remote.state,{snapshot:false});
   localStorage.setItem(LAST_SYNC_KEY,remote.updatedAt||new Date().toISOString());
   location.reload();return
  }
  const cached=cachedForUser(uid);
  if(cached?.storage){restoreCloudState(cached,{snapshot:false});location.reload();return}
  if(!profile()){
   status('Signed in. Build a private plan for this account.');
   setTimeout(()=>window.WGC18?.openOnboarding?.(),150)
  }else status(`Signed in. ${localDataCount()} records belong to this account.`)
 }
 async function consumeAuthRedirect(){
  if(LEGACY_AUTH_FRAGMENT){status('For your security, this older confirmation link can no longer be accepted. Request a new email and try again.',true);return false}
  const params=new URLSearchParams(location.search),code=params.get('code');if(!code)return false;
  const verifier=localStorage.getItem(PKCE_VERIFIER_KEY),purpose=localStorage.getItem(PKCE_PURPOSE_KEY)||'signup';
  history.replaceState(null,'',location.pathname);
  if(!verifier){status('This confirmation must be completed in the same browser where it was requested. Start again here.',true);return false}
  try{
   const session=await raw(`${A.config.supabaseUrl}/auth/v1/token?grant_type=pkce`,{method:'POST',headers:{apikey:A.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({auth_code:code,code_verifier:verifier})});
   localStorage.removeItem(PKCE_VERIFIER_KEY);localStorage.removeItem(PKCE_PURPOSE_KEY);
   saveSession(session);
   if(purpose==='recovery'){sessionStorage.setItem(RECOVERY_KEY,'1');A.passwordRecovery=true}
   await afterAuth();
   if(purpose==='recovery'){openAccount('signin');toast('Choose a new password to finish recovery.')}else toast('Email confirmed. Your private plan is ready to build.');
   return true
  }catch(e){localStorage.removeItem(PKCE_VERIFIER_KEY);localStorage.removeItem(PKCE_PURPOSE_KEY);clearRecoveryFlag();status('The confirmation link could not be completed. Request a new email in this browser.',true);return false}
 }
 A.signIn=signIn;A.signUp=signUp;A.signOut=signOut;A.recover=recover;A.captureLocalState=captureLocalState;A.restoreCloudState=restoreCloudState;
 function accountEmail(){return A.session?.user?.email||A.session?.user?.user_metadata?.email||''}
 function renderAccountUI(){let signed=!!A.session?.access_token,body=$('#accountBody'),chip=$('#accountChip');$('#signOutQuick')?.remove();if(chip){chip.textContent=signed?(accountEmail()||'Account'):'Sign in';chip.classList.toggle('signed',signed)}if(!body)return;if(!A.config.loaded){body.innerHTML='<p class="muted">Checking account service…</p>';return}if(!A.config.cloudConfigured){body.innerHTML='<div class="accountUnavailable"><b>Cloud accounts are temporarily unavailable.</b><p>The secure account service is not configured on this deployment. No alternate API destination can receive your sign-in token.</p></div>';return}if(!signed){body.innerHTML=`<div class="authTabs"><button data-auth-tab="signin" class="active">Sign in</button><button data-auth-tab="signup">Create account</button></div><div id="signinPane" class="authPane"><label>Email<input id="loginEmail" type="email" autocomplete="email" required></label><label>Password<input id="loginPassword" type="password" autocomplete="current-password" required></label><button id="loginBtn" class="primary wideBtn">Sign in</button><button id="recoverBtn" class="linkBtn">Forgot password?</button></div><div id="signupPane" class="authPane hidden"><label>Name<input id="signupName" autocomplete="name" required maxlength="80"></label><label>Email<input id="signupEmail" type="email" autocomplete="email" required></label><label>Password<input id="signupPassword" type="password" minlength="12" autocomplete="new-password" required></label><small>Use 12+ characters with uppercase, lowercase, a number and a symbol.</small><button id="signupBtn" class="primary wideBtn">Create account</button><p class="muted">Your one-time PKCE confirmation code returns only to workandworkout.com. Every account starts with a private, empty planner.</p></div>`;$$('[data-auth-tab]').forEach(b=>b.onclick=()=>{$$('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#signinPane').classList.toggle('hidden',b.dataset.authTab!=='signin');$('#signupPane').classList.toggle('hidden',b.dataset.authTab!=='signup')});$('#loginBtn').onclick=async()=>{if(A.authBusy)return;let email=$('#loginEmail'),password=$('#loginPassword');if(!email.checkValidity()||!password.value)return status('Enter a valid email and password.',true);A.authBusy=true;status('Signing in…');try{await signIn(email.value.trim(),password.value);closeModal('accountDialog');toast('Signed in')}catch(e){status(e.message,true)}finally{A.authBusy=false}};$('#signupBtn').onclick=async()=>{if(A.authBusy)return;let name=$('#signupName'),email=$('#signupEmail'),password=$('#signupPassword');if(!name.value.trim())return status('Enter your name.',true);if(!email.checkValidity())return status('Enter a valid email address.',true);if(!passwordStrong(password.value))return status('Use 12+ characters with uppercase, lowercase, a number and a symbol.',true);A.authBusy=true;status('Creating account…');try{let j=await signUp(name.value.trim(),email.value.trim(),password.value);if(!j.access_token)status('Account created. Open the confirmation email in this browser to finish securely.');else{closeModal('accountDialog');toast('Account created')}}catch(e){status(e.message,true)}finally{A.authBusy=false}};$('#recoverBtn').onclick=async()=>{let email=$('#loginEmail');if(!email.checkValidity())return status('Enter a valid email first.',true);try{await recover(email.value.trim());status('Password reset email sent. Open it in this browser to continue securely.')}catch(e){status(e.message,true)}};return}
 let last=localStorage.getItem(LAST_SYNC_KEY),when=last?new Date(last).toLocaleString():'Never';
 body.innerHTML=`${A.passwordRecovery?'<div class="accountUnavailable"><b>Choose a new password</b><p>Use 12+ characters with uppercase, lowercase, a number and a symbol.</p><label>New password<input id="recoveryNewPassword" type="password" minlength="12" autocomplete="new-password"></label><button id="saveRecoveredPassword" class="primary wideBtn">Set new password</button></div>':''}<div class="signedAccount"><div class="accountIdentity"><span>${esc((accountEmail()||'?')[0].toUpperCase())}</span><div><b>${esc(accountEmail()||'Signed in')}</b><small>Last sync: ${esc(when)}</small></div><button id="signOutAccount">Sign out</button></div><div class="accountActions"><button id="migrateDevice" class="primary"><b>Sync this device</b><small>Upload only this account's planner, training and nutrition records</small></button><button id="restoreAccount"><b>Restore from account</b><small>Replace this device with the private cloud copy</small></button><button id="syncAccount"><b>Sync now</b><small>Update your account with this device</small></button><button id="startOnboardingAccount"><b>Edit adaptive plan</b><small>Update your work, workouts, recovery and nutrition preferences</small></button></div><div class="dangerZone"><button id="deleteCloudAccount" class="danger">Delete account permanently</button></div></div>`;
 $('#saveRecoveredPassword')?.addEventListener('click',async()=>{let value=$('#recoveryNewPassword').value;if(!passwordStrong(value))return status('Use 12+ characters with uppercase, lowercase, a number and a symbol.',true);try{let token=await A.accessToken();await raw(`${A.config.supabaseUrl}/auth/v1/user`,{method:'PUT',headers:{apikey:A.config.supabaseAnonKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({password:value})});sessionStorage.removeItem(RECOVERY_KEY);A.passwordRecovery=false;status('Password updated.');renderAccountUI();toast('Password updated securely')}catch(e){status(e.message,true)}});
 $('#migrateDevice').onclick=async()=>{if(!confirm(`Upload this device's ${localDataCount()} planner records to your signed-in account?`))return;status('Migrating this device…');try{await A.pushState()}catch(e){status(e.message,true)}};
 $('#restoreAccount').onclick=async()=>{if(!confirm('Replace this device planner data with the cloud copy? A recovery snapshot will be made first.'))return;status('Restoring…');try{await A.pullState()}catch(e){status(e.message,true)}};
 $('#syncAccount').onclick=async()=>{status('Syncing…');try{await A.pushState()}catch(e){status(e.message,true)}};
 $('#startOnboardingAccount').onclick=()=>{closeModal('accountDialog');window.WGC18?.openOnboarding?.()};
 $('#signOutAccount').onclick=signOut;
 $('#deleteCloudAccount').onclick=async()=>{
  if(prompt('Type DELETE ACCOUNT to permanently delete your cloud account:')!=='DELETE ACCOUNT')return;
  const uid=A.session?.user?.id;
  try{await A.authedFetch('account',{method:'DELETE'});clearLocalPlanner();localStorage.removeItem(OWNER_KEY);if(uid)localStorage.removeItem(cacheKey(uid));saveSession(null);status('Account and its local planner copy were deleted.');toast('Account deleted');setTimeout(()=>location.reload(),250)}catch(e){status(e.message,true)}
 }
 }
 function openAccount(mode='signin'){renderAccountUI();if(location.protocol==='file:'){let body=$('#accountBody');if(body)body.innerHTML='<div class="accountUnavailable"><b>This is a local preview.</b><p>Accounts and private cloud sync only work on the secure live website.</p><a class="primary wideBtn accountLiveLink" href="https://www.workandworkout.com/">Open the secure website</a></div>';openModal('accountDialog');return}openModal('accountDialog');let tries=0,timer=setInterval(()=>{let tab=$(`[data-auth-tab="${mode}"]`);if(tab){tab.click();clearInterval(timer)}else if(++tries>8)clearInterval(timer)},100)}
 A.openAccount=openAccount;
 function injectUI(){let cards=$('#page-more .menuCards');if(cards&&!$('#openAccountV18')){let b=document.createElement('button');b.id='openAccountV18';b.innerHTML='<span>👤</span><div><b>Account & sync</b><small id="accountMenuText">Profile, privacy, sync and sign out</small></div><i>›</i>';cards.insertBefore(b,cards.firstChild);b.onclick=()=>openAccount('signin')}let home=$('#todayDashboard');if(home&&!$('#accountChip')){let chip=document.createElement('button');chip.id='accountChip';chip.className='accountChip';chip.onclick=()=>openAccount('signin');home.parentElement?.insertBefore(chip,home)}$('#signOutQuick')?.remove();if(!$('#accountDialog'))document.body.insertAdjacentHTML('beforeend',`<div id="accountDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="accountTitle"><div class="sheet largeSheet premiumAccountSheet"><div class="sheetHandle"></div><div class="sheetHead"><h2 id="accountTitle">Your Work + Workout account</h2><button data-close="accountDialog">Done</button></div><div id="accountBody"></div><p id="accountStatus" class="statusText"></p></div></div>`);let close=$('#accountDialog [data-close]');if(close)close.onclick=()=>closeModal('accountDialog');$('#accountDialog')?.addEventListener('click',e=>{if(e.target.id==='accountDialog')closeModal('accountDialog')});renderAccountUI()}
 function hookSync(){for(const name of ['saveProfileObj','saveNutritionObj','saveHistory','saveDrafts','saveOverrides','saveSnapshots','saveBodyLog','saveDiary','mergeHealthDay','saveBMonth']){let fn=window[name];if(typeof fn!=='function'||fn.__wgc18sync)continue;let wrapped=function(...args){let r=fn.apply(this,args);Promise.resolve(r).finally(()=>A.queueSync());return r};wrapped.__wgc18sync=true;window[name]=wrapped}document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')A.queueSync()})}
 loadSession();if(!A.session)lockPlannerForLoggedOut();injectUI();hookSync();loadConfig().then(async()=>{if(await consumeAuthRedirect())return;if(A.session&&sessionExpired())await refreshSession().catch(()=>{});if(!A.session)lockPlannerForLoggedOut();renderAccountUI()});document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{injectUI();hookSync();renderAccountUI()},80));
})(window.WGC18);
(function(){let st=document.createElement('style');st.textContent=`.accountChip{position:fixed;right:16px;top:max(12px,env(safe-area-inset-top));z-index:35;border:1px solid rgba(255,255,255,.13);background:#101b2a;color:#dbe6f3;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:900;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.accountChip.signed{color:#5ce179;border-color:rgba(54,212,91,.28)}.signOutQuick{position:fixed;right:16px;top:max(48px,calc(env(safe-area-inset-top) + 44px));z-index:35;border:1px solid rgba(255,255,255,.13);background:#101b2a;color:#dbe6f3;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:850}.authTabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}.authTabs button{border-radius:10px}.authTabs button.active{background:#2563eb;color:#fff}.authPane{display:grid;gap:9px}.authPane label{font-size:9px;color:var(--muted)}.authPane input{width:100%;margin-top:4px}.linkBtn{background:transparent!important;border:0!important;color:#60a5fa!important}.accountIdentity{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:12px}.accountIdentity>span{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#243247;font-weight:900}.accountIdentity>div{min-width:0;flex:1}.accountIdentity>button{white-space:nowrap}.accountIdentity b,.accountIdentity small{display:block}.accountIdentity small{color:var(--muted);font-size:8px;margin-top:3px}.accountActions{display:grid;gap:8px;margin-top:12px}.accountActions button{text-align:left;padding:11px}.accountActions button b,.accountActions button small{display:block}.accountActions button small{font-size:8px;color:var(--muted);margin-top:3px}.accountActions .primary small{color:#dbeafe}.signedAccount .dangerZone{display:flex;gap:8px;margin-top:14px}.accountUnavailable{padding:12px;border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.06);border-radius:12px;margin-bottom:12px}.accountUnavailable p{font-size:9px;color:var(--muted);line-height:1.5}.statusText.bad{color:#f97066}`;document.head.appendChild(st)})();
(function(){let st=document.createElement('style');st.textContent='.accountLiveLink{display:flex;align-items:center;justify-content:center;text-decoration:none}';document.head.appendChild(st)})();
