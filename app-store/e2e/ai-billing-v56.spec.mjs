import {test,expect} from '@playwright/test';
import {startBillingFixture} from './fixtures/ai-billing-server.mjs';
test.use({browserName:process.env.E2E_BROWSER||'chromium'});
let fixture;
test.beforeAll(async()=>{fixture=await startBillingFixture()});
test.afterAll(async()=>fixture?.close());

test('free accounts cannot use any AI scan even with ten credits remaining',async({page})=>{
 await page.goto(fixture.url);
 for(const feature of ['meal','equipment','roster','schedule','plan']){
  expect(await page.evaluate(feature=>WGC18.ensureAICredits(feature),feature)).toBe(false);
  await expect(page.locator('#aiPlanStatus')).toContainText('requires AI Plus');
  await expect(page.locator('#aiPlanBalance')).toHaveText('Make more time for you');
 }
 expect(await page.evaluate(()=>WGC18.ensureAICredits('coach'))).toBe(true);
 expect(await page.evaluate(()=>fixtureCalls)).toEqual([]);
});

test('Plus unlocks the scan tools and signing out removes cached access',async({page})=>{
 await page.goto(fixture.url+'?tier=plus');
 for(const feature of ['meal','equipment','roster','schedule','plan'])expect(await page.evaluate(feature=>WGC18.ensureAICredits(feature),feature)).toBe(true);
 await page.evaluate(()=>{WGC18.session=null;window.dispatchEvent(new Event('wgc:authchange'))});
 expect(await page.evaluate(()=>WGC18.aiCredits())).toBe(null);
});
for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
 test(`AI plan shows clear allowance, legal links and local Apple price at ${viewport.width}px`,async({page},info)=>{
  await page.setViewportSize(viewport);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(fixture.url);await expect(page.locator('#aiPlanBalance')).toHaveText('Make more time for you');
  await expect(page.locator('#aiSubscribeV56')).toHaveText('Subscribe · $1.99 / month');
  await expect(page.locator('#aiSubscribeV56')).toBeEnabled();
  await expect(page.locator('#aiPlanDetailsV70')).not.toHaveAttribute('open');await expect(page.locator('.aiPlanSheetV56')).toContainText('Monthly usage limit applies.');await page.locator('summary').click();await expect(page.locator('details')).toContainText('up to 10 meal or equipment scans');
  await page.locator('#aiSubscribeV56').scrollIntoViewIfNeeded();
  const bounds=await page.locator('#aiSubscribeV56').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);
  await expect(page.locator('#aiTermsV56')).toHaveAttribute('href',/terms.html$/);await expect(page.locator('#aiPrivacyV56')).toHaveAttribute('href',/privacy.html$/);
  await page.screenshot({path:info.outputPath('ai-plan.png')});expect(errors).toEqual([]);
 });
}
test('purchase finishes only after server verification; restore does not invent extra credits',async({page})=>{
 await page.goto(fixture.url);await page.locator('#aiSubscribeV56').click();
 await expect(page.locator('#aiPlanBalance')).toHaveText('AI Plus is active');
 expect(await page.evaluate(()=>WGC18.aiCredits().remaining)).toBe(100);
 expect(await page.evaluate(()=>fixtureCalls)).toEqual(['verify','finish']);
 await page.locator('#aiRestoreV56').click();await expect(page.locator('#aiPlanStatus')).toHaveText('Your subscription is restored.');
 await expect(page.locator('#aiPlanBalance')).toHaveText('AI Plus is active');
 await page.locator('#aiManageV56').click();expect(await page.evaluate(()=>fixtureCalls)).toContain('manage');
});
test('cancelled, pending and failed purchases do not finish or unlock access',async({page})=>{
 for(const mode of ['cancelled','pending','rejected']){
  await page.goto(fixture.url+'?mode='+mode);await page.locator('#aiSubscribeV56').click();
  await expect(page.locator('#aiPlanStatus')).toContainText(mode==='cancelled'?'cancelled':mode==='pending'?'approval':'does not match');
  expect(await page.evaluate(()=>fixtureCalls)).not.toContain('finish');
  await expect(page.locator('#aiPlanBalance')).toHaveText('Make more time for you');
 }
});
test('unconfigured Apple products cannot be bought and web never advertises a web checkout',async({page})=>{
 await page.goto(fixture.url+'?mode=unavailable');await expect(page.locator('#aiSubscribeV56')).toBeDisabled();
 await page.goto(fixture.url+'?platform=web');await expect(page.locator('#aiSubscribeV56')).toBeHidden();await expect(page.locator('#aiRestoreV56')).toBeHidden();
 await expect(page.locator('#aiPlanAvailability')).toContainText('iPhone app');
});
test('keyboard focus stays in the plan and Escape closes it',async({page})=>{
 await page.goto(fixture.url);await page.locator('#aiPlanClose').focus();await page.keyboard.press('Shift+Tab');
 await expect(page.locator('#aiPrivacyV56')).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('#aiPlanClose')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#aiPlanDialogV56')).not.toHaveClass(/open/);await expect(page.locator('#aiPlanDialogV56')).toBeHidden();
});

test('free accounts see subscription before meal entry or any AI photo picker',async({page})=>{
 await page.goto(fixture.url);await expect(page.locator('#aiSubscribeV56')).toBeEnabled();
 const choosers=[];page.on('filechooser',chooser=>choosers.push(chooser));
 for(const selector of ['#foodMealScanTool','#label-mealScanPhoto','#label-aiPhotoInput','#label-scheduleCameraV24','#label-schedulePhotoV70']){
  await page.locator('#aiPlanClose').click();await page.locator(selector).click();
  await expect(page.locator('#aiPlanStatus')).toContainText('requires AI Plus');
  expect(choosers).toHaveLength(0);expect(await page.evaluate(()=>fixtureCalls)).toEqual([]);
 }
 await expect(page.locator('.aiPlanSheetV56')).not.toContainText(/credits?/i);
});

test('verified Plus opens every AI photo picker; PDF and barcode pickers stay free',async({page})=>{
 await page.goto(fixture.url+'?tier=plus');await expect(page.locator('#aiPlanBalance')).toHaveText('AI Plus is active');await page.locator('#aiPlanClose').click();
 for(const id of ['mealScanPhoto','aiPhotoInput','scheduleCameraV24','schedulePhotoV70']){
  const chooser=page.waitForEvent('filechooser');await page.locator('#label-'+id).click();await chooser;
 }
 await page.locator('#foodMealScanTool').click();expect(await page.evaluate(()=>fixtureCalls)).toEqual(['meal-pane']);
 await page.goto(fixture.url);await expect(page.locator('#aiSubscribeV56')).toBeEnabled();await page.locator('#aiPlanClose').click();
 for(const id of ['scheduleFileV24','barcodePhotoFixture']){const chooser=page.waitForEvent('filechooser');await page.locator('#label-'+id).click();await chooser}
});

test('unknown, expired, exhausted, signed-out and offline states cannot open an AI camera',async({page})=>{
 const choosers=[];page.on('filechooser',chooser=>choosers.push(chooser));
 for(const mode of ['expired','exhausted']){
  await page.goto(fixture.url+'?tier=plus&mode='+mode);await expect(page.locator('#aiPlanBalance')).toHaveText('AI Plus is active');await page.locator('#aiPlanClose').click();
  expect(await page.evaluate(()=>WGC18.canUseAIPhoto('meal'))).toBe(false);
  await page.locator('#label-mealScanPhoto').click();expect(choosers).toHaveLength(0);
 }
 await page.goto(fixture.url+'?tier=plus');await expect(page.locator('#aiPlanBalance')).toHaveText('AI Plus is active');await page.locator('#aiPlanClose').click();
 await page.evaluate(()=>{fixtureOffline=true;const now=Date.now();Date.now=()=>now+61000});
 await page.locator('#label-mealScanPhoto').click();await expect(page.locator('#aiPlanStatus')).toContainText('could not check');
 expect(await page.evaluate(()=>WGC18.aiCredits())).toBe(null);expect(choosers).toHaveLength(0);
 await page.locator('#aiPlanClose').click();await page.evaluate(()=>{WGC18.session=null;window.dispatchEvent(new Event('wgc:authchange'))});
 await page.locator('#label-aiPhotoInput').click();await expect(page.locator('#accountDialog')).toBeVisible();expect(choosers).toHaveLength(0);
});

test('a late entitlement response cannot restore access after the account changes',async({page})=>{
 await page.goto(fixture.url+'?tier=plus');await expect(page.locator('#aiPlanBalance')).toHaveText('AI Plus is active');
 await page.evaluate(()=>{const value=WGC18.aiCredits();WGC18.authedFetch=()=>new Promise(resolve=>{window.completeFixture=()=>resolve(value)});window.pendingFixture=WGC18.refreshAICredits()});
 await page.evaluate(()=>{WGC18.session=null;window.dispatchEvent(new Event('wgc:authchange'));WGC18.session={user:{id:'fixture-account'}};window.dispatchEvent(new Event('wgc:authchange'));completeFixture()});
 await page.evaluate(()=>pendingFixture);expect(await page.evaluate(()=>WGC18.canUseAIPhoto('meal'))).toBe(false);
});
