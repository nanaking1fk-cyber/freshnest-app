import {createRequire} from 'node:module';
const require=createRequire(new URL('../../app-store/package.json',import.meta.url));
const {test,expect}=require('@playwright/test');

test('landing tour is lazy, chaptered and mobile safe',async({page})=>{
 await page.setViewportSize({width:405,height:720});
 await page.route('**/api/config',route=>route.fulfill({json:{cloudConfigured:false,aiConfigured:false,apiVersion:18}}));
 await page.goto('/work-gym-planner/');
 const launch=page.locator('#landingProductTourV76');
 await expect(launch).toBeVisible();
 const player=page.locator('#productTourV76 video');
 await expect(player).not.toHaveAttribute('src',/.+/);
 await launch.click();
 await expect(page.locator('#productTourV76')).toBeVisible();
 await expect(player).toHaveAttribute('src',/work-workout-tour-v76\.mp4/);
 await expect(page.locator('[data-tour-time]')).toHaveCount(7);
 const box=await page.locator('.productTourSheetV76').boundingBox();
 expect(box.width).toBeLessThanOrEqual(405);expect(box.height).toBeLessThanOrEqual(720);
 await page.screenshot({path:'/private/tmp/ww-product-tour-v76-mobile.png'});
 await page.keyboard.press('Escape');
 await expect(page.locator('#productTourV76')).toBeHidden();
});

test('tour also opens from the signed-in More menu',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'tour-test',expires_at:4102444800,user:{id:'tour-test',email:'tour@example.test'}}));
  localStorage.setItem('wgc-v18-local-owner','tour-test');
  localStorage.setItem('wgp-v15-profile',JSON.stringify({id:'tour-test',name:'Maya',fixed:{enabled:false},variable:{enabled:false}}));
 });
 await page.route('**/api/config',route=>route.fulfill({json:{cloudConfigured:false,aiConfigured:false,apiVersion:18}}));
 await page.goto('/work-gym-planner/');
 await page.locator('nav [data-page="more"]').click();
 const launch=page.locator('#openProductTourV76');
 await expect(launch).toBeAttached();
 await launch.evaluate(button=>button.click());
 await expect(page.locator('#productTourV76')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Work + Workout in 50 seconds'})).toBeVisible();
 await page.screenshot({path:'/private/tmp/ww-product-tour-v76-desktop.png'});
});
