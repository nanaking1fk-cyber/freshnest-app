const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('native candidate retains the current calendar and cross-browser password reset',()=>{
 assert.match(read('work-gym-planner-v16/calendar-premium-v42.js'),/cellDetailsMarkup/);
 assert.match(read('work-gym-planner-v16/guided-onboarding-v18.js'),/Add my work schedule/);
 assert.match(read('work-gym-planner-v16/accounts-v18.js'),/recovery_token/);
 assert.match(read('app-store/scripts/build-web.mjs'),/purpose!=='recovery'/);
 assert.match(read('app-store/ios/App/App/SceneDelegate.swift'),/WorkWorkoutBridgeViewController/);
 assert.match(read('app-store/ios/App/App.xcodeproj/project.pbxproj'),/ApplePurchasesPlugin.swift in Sources/);
});
test('adult onboarding and subscription deletion disclosures are consistent',()=>{
 const guided=read('work-gym-planner-v16/guided-onboarding-v18.js');
 assert.doesNotMatch(guided,/min="16"|get\('age'\)>=16/);
 assert.match(guided,/get\('age'\)>=18/);
 assert.match(read('work-gym-planner-v16/accounts-v18.js'),/deleting your account does not cancel that subscription/);
 assert.match(read('work-gym-planner/privacy.html'),/Apple subscription and AI allowance/);
 assert.match(read('app-store/ios/App/App/PrivacyInfo.xcprivacy'),/NSPrivacyCollectedDataTypePurchaseHistory/);
});
