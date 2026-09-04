import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');
const config={cloudConfigured:true,aiConfigured:false,supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};
const session={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_at:4102444800,user:{id:'reset-fixture',email:'reset@example.test'}};
async function setup(page,{purpose='recovery'}={}){
 const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;calls.push(path);return r.fulfill({json:path.endsWith('/config')?config:{ok:true,state:null,receipt:null}})});
 await page.route('https://example.test/**',r=>{calls.push(new URL(r.request().url()).pathname);return r.fulfill({json:r.request().method()==='PUT'?session.user:session})});
 await page.addInitScript(purpose=>{if(!sessionStorage.getItem('reset-test-initialized')){localStorage.setItem('wgc-v25-pkce-verifier','fixture-verifier');localStorage.setItem('wgc-v25-pkce-purpose',purpose);sessionStorage.setItem('reset-test-initialized','1')}},purpose);
 return {errors,calls};
}
test('valid reset callback keeps password form visible, without account menus',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {errors,calls}=await setup(page);
 await page.goto('/work-gym-planner/shell.html?auth=recovery&code=fixture-code',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#recoveryPasswordForm')).toBeVisible();
 await expect(page.locator('#accountBody .signedAccount')).toHaveCount(0);
 expect(calls.some(x=>x.endsWith('/state'))).toBe(false);
 await expect(page.locator('#healthConsentDialog.open')).toHaveCount(0);
 await page.screenshot({path:'/private/tmp/ww-reset64-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('explicit reset link is not misclassified by an old signup marker',async({page})=>{
 await setup(page,{purpose:'signup'});
 await page.goto('/work-gym-planner/shell.html?auth=recovery&code=fixture-code',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#recoveryPasswordForm')).toBeVisible();
});
test('password entry survives account refreshes and the reset resumes in another tab',async({page,context})=>{
 await setup(page);await page.goto('/work-gym-planner/shell.html?auth=recovery&code=fixture-code');
 await expect(page.locator('#recoveryPasswordForm')).toBeVisible();
 await page.locator('#recoveryNewPassword').fill('Test-only-New-Password-64!');
 await page.evaluate(()=>WGC18.renderAccountUI());
 await expect(page.locator('#recoveryNewPassword')).toHaveValue('Test-only-New-Password-64!');
 const other=await context.newPage();const {calls}=await setup(other);
 await other.goto('/work-gym-planner/shell.html');
 await expect(other.locator('#recoveryPasswordForm')).toBeVisible();
 expect(calls.some(x=>x.endsWith('/state'))).toBe(false);
 await page.reload();await expect(page.locator('#recoveryPasswordForm')).toBeVisible();
 await other.close();
});
test('saving updates the password once, keeps recovery on failure, and clears it only on success',async({page})=>{
 const {errors}=await setup(page);let writes=0,fail=true,release;
 await page.route('https://example.test/auth/v1/user',async r=>{
  expect(r.request().method()).toBe('PUT');writes++;
  expect(r.request().postDataJSON()).toEqual({password:'Test-only-New-Password-64!'});
  if(fail)return r.fulfill({status:422,json:{code:'weak_password',msg:'Weak password'}});
  await new Promise(resolve=>release=resolve);return r.fulfill({json:session.user});
 });
 await page.goto('/work-gym-planner/shell.html?auth=recovery&code=fixture-code');
 await page.locator('#recoveryNewPassword').fill('Test-only-New-Password-64!');
 await page.locator('#saveRecoveredPassword').click();await expect(page.locator('#accountStatus')).toContainText('stronger password');
 await expect(page.locator('#recoveryNewPassword')).toHaveValue('Test-only-New-Password-64!');
 expect(await page.evaluate(()=>WGC18.passwordRecovery)).toBe(true);
 fail=false;await page.locator('#saveRecoveredPassword').click();await expect(page.locator('#saveRecoveredPassword')).toBeDisabled();
 await page.evaluate(()=>document.querySelector('#recoveryPasswordForm').dispatchEvent(new Event('submit',{cancelable:true})));
 await expect.poll(()=>writes).toBe(2);release();
 await expect.poll(()=>page.evaluate(()=>WGC18.passwordRecovery)).toBe(false);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wgc-v18-session')).passwordRecoveryPending)).toBeUndefined();
 expect(await page.evaluate(()=>sessionStorage.getItem('wgc-v25-password-recovery'))).toBeNull();
 expect(errors).toEqual([]);
});
test('expired reset links show recovery help, including when already signed in',async({page})=>{
 await setup(page);await page.addInitScript(session=>localStorage.setItem('wgc-v18-session',JSON.stringify(session)),session);
 await page.goto('/work-gym-planner/shell.html?auth=recovery#error=access_denied&error_code=otp_expired');
 await expect(page.locator('#authLinkError')).toBeVisible();
 await expect(page.locator('#authLinkError')).toContainText('expired or was already used');
 await expect(page.locator('#accountBody .signedAccount')).toHaveCount(0);
 expect(new URL(page.url()).hash).toBe('');
});
test('cross-browser links never silently use an existing login',async({page})=>{
 await setup(page);await page.addInitScript(session=>{localStorage.removeItem('wgc-v25-pkce-verifier');localStorage.setItem('wgc-v18-session',JSON.stringify(session))},session);
 await page.goto('/work-gym-planner/shell.html?auth=recovery&code=fixture-code');
 await expect(page.locator('#authLinkError')).toBeVisible();await expect(page.locator('#authLinkError')).toContainText('older reset link');
 await expect(page.locator('#recoveryPasswordForm')).toHaveCount(0);
});
test('older token-fragment links are rejected visibly without accepting their tokens',async({page})=>{
 await setup(page);
 await page.goto('/work-gym-planner/shell.html#access_token=untrusted-fixture&refresh_token=untrusted-fixture&type=recovery');
 await expect(page.locator('#authLinkError')).toBeVisible();
 expect(await page.evaluate(()=>WGC18.session)).toBeNull();
 expect(new URL(page.url()).hash).toBe('');
});
test('forgot-password sends one securely bound email request and prevents immediate resends',async({page})=>{
 await setup(page);let request,count=0;
 await page.route('https://example.test/auth/v1/recover**',r=>{request=r.request();count++;return r.fulfill({json:{}})});
 await page.goto('/work-gym-planner/shell.html');
 await expect(page.locator('#wwLanding')).toBeVisible();
 await page.locator('[data-ww29="signin"]').first().click();
 await page.locator('#loginEmail').fill('reset@example.test');await page.locator('#recoverBtn').click();
 await expect(page.locator('#accountStatus')).toContainText('reset email sent');
 const data=request.postDataJSON(),verifier=await page.evaluate(()=>localStorage.getItem('wgc-v25-pkce-verifier'));
 expect(data.email).toBe('reset@example.test');expect(data.code_challenge_method).toBe('s256');
 expect(data.code_challenge).toBe(require('node:crypto').createHash('sha256').update(verifier).digest('base64url'));
 expect(new URL(request.url()).searchParams.get('redirect_to')).toBe('https://www.workandworkout.com/work-gym-planner/shell.html?auth=recovery');
 await expect(page.locator('#recoverBtn')).toBeDisabled();expect(count).toBe(1);
});
test('a reset route with a missing code cannot fall through to a signed-in account',async({page})=>{
 await setup(page);await page.addInitScript(session=>localStorage.setItem('wgc-v18-session',JSON.stringify(session)),session);
 await page.goto('/work-gym-planner/shell.html?auth=recovery');
 await expect(page.locator('#authLinkError')).toBeVisible();await expect(page.locator('#authLinkError')).toContainText('incomplete');
});
