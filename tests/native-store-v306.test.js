const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));

test('canonical store package targets iOS and Android with the production identity',()=>{
  const config=json('app-store/capacitor.config.json');
  const pkg=json('app-store/package.json');
  assert.equal(config.appId,'com.bibiniifarms.workandworkout');
  assert.equal(config.appName,'Work + Workout');
  assert.equal(config.webDir,'www');
  assert.equal(Object.hasOwn(config,'server'),false,'store app must not be a remote website wrapper');
  for(const dependency of ['@capacitor/android','@capacitor/ios','@capacitor/app','@capacitor/browser','@capacitor/filesystem','@capacitor/haptics','@capacitor/health-fitness','@capacitor/local-notifications','@capacitor/share','@capacitor/splash-screen','@capacitor/status-bar'])assert.ok(pkg.dependencies[dependency],dependency);
  assert.ok(fs.existsSync(path.join(root,'app-store/ios/App/App.xcodeproj/project.pbxproj')));
  assert.ok(fs.existsSync(path.join(root,'app-store/android/app/build.gradle')));
});

test('native build packages current production and routes authenticated APIs safely',()=>{
  const build=read('app-store/scripts/build-web.mjs');
  const bridge=read('app-store/native/native-bridge.js');
  assert.match(build,/30\.1\.30/);
  assert.match(build,/disable legacy service worker/);
  assert.match(build,/account API base/);
  assert.match(build,/AI schedule API base/);
  assert.match(build,/calendar OAuth browser/);
  assert.match(bridge,/https:\/\/www\.workandworkout\.com/);
  assert.match(bridge,/workandworkout:\/\/calendar-connected/);
  assert.match(bridge,/LocalNotifications/);
  assert.match(bridge,/Filesystem/);
  assert.match(bridge,/Share/);
  assert.match(bridge,/Haptics/);
  assert.doesNotMatch(JSON.stringify(json('app-store/capacitor.config.json')),/"url"\s*:/);
});

test('iOS package includes requested-use descriptions and a valid opaque App Store icon',()=>{
  const plist=read('app-store/ios/App/App/Info.plist');
  const project=read('app-store/ios/App/App.xcodeproj/project.pbxproj');
  assert.match(plist,/NSCameraUsageDescription/);
  assert.match(plist,/NSPhotoLibraryUsageDescription/);
  assert.match(plist,/ITSAppUsesNonExemptEncryption/);
  assert.match(plist,/<string>workandworkout<\/string>/);
  assert.match(project,/PRODUCT_BUNDLE_IDENTIFIER = com\.bibiniifarms\.workandworkout/);
  assert.match(project,/MARKETING_VERSION = 1\.0\.0/);
  assert.match(project,/AppDiagnosticsReporter\.swift in Sources/);
  const reporter=read('app-store/ios/App/App/AppDiagnosticsReporter.swift');
  assert.match(reporter,/MXMetricManagerSubscriber/);
  assert.match(reporter,/native_crash/);
  assert.match(reporter,/native_hang/);
  const png=fs.readFileSync(path.join(root,'app-store/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
  assert.equal(png.readUInt8(25),2,'iOS icon must be RGB without an alpha channel');
});

test('Android package targets API 36 and avoids unnecessary device-data exposure',()=>{
  const variables=read('app-store/android/variables.gradle');
  const manifest=read('app-store/android/app/src/main/AndroidManifest.xml');
  const gradle=read('app-store/android/app/build.gradle');
  assert.match(variables,/compileSdkVersion = 36/);
  assert.match(variables,/targetSdkVersion = 36/);
  assert.match(manifest,/android\.permission\.CAMERA/);
  assert.match(manifest,/android\.permission\.POST_NOTIFICATIONS/);
  assert.match(manifest,/android:required="false"/);
  assert.match(manifest,/android:allowBackup="false"/);
  assert.match(manifest,/android:usesCleartextTraffic="false"/);
  assert.match(manifest,/android:scheme="workandworkout" android:host="calendar-connected"/);
  assert.match(gradle,/versionName "1\.0\.0"/);
  const activity=read('app-store/android/app/src/main/java/com/bibiniifarms/workandworkout/MainActivity.java');
  const reporter=read('app-store/android/app/src/main/java/com/bibiniifarms/workandworkout/AppCrashReporter.java');
  assert.match(activity,/AppCrashReporter\.install\(this\)/);
  assert.match(reporter,/Thread\.setDefaultUncaughtExceptionHandler/);
  assert.match(reporter,/X-Work-Workout-Native/);
  assert.doesNotMatch(reporter,/getMessage\(\)/);
  assert.ok(fs.existsSync(path.join(root,'app-store/android/app/src/main/res/drawable/ic_stat_work_and_workout.xml')));
});

test('both stores have truthful metadata and a public account deletion path',()=>{
  const apple=read('app-store/APP_STORE_METADATA.md');
  const play=read('app-store/PLAY_STORE_METADATA.md');
  const deletion=read('work-gym-planner/delete-account.html');
  for(const metadata of [apple,play]){
    assert.match(metadata,/Work \+ Workout/);
    assert.match(metadata,/https:\/\/www\.workandworkout\.com\/work-gym-planner\/privacy\.html/);
    assert.match(metadata,/https:\/\/www\.workandworkout\.com\/work-gym-planner\/delete-account\.html/);
    assert.match(metadata,/not a medical device/i);
  }
  assert.match(deletion,/Delete account permanently/);
  assert.match(deletion,/cloud records associated with it/);
});

test('Apple submission metadata declares sensitive-data practices and required ratings',()=>{
  const apple=read('app-store/APP_STORE_METADATA.md');
  assert.match(apple,/User Privacy Choices: https:\/\/www\.workandworkout\.com\/work-gym-planner\/privacy\.html#rights/);
  for(const disclosure of ['Health & Fitness — Health','Health & Fitness — Fitness','User Content — Photos or Videos','Identifiers — User ID','Diagnostics — Performance Data','Diagnostics — Crash Data','Diagnostics — Other Diagnostic Data'])assert.match(apple,new RegExp(disclosure));
  assert.match(apple,/\*\*Tracking:\*\* No/);
  assert.match(apple,/\*\*Regulated Medical Devices:\*\* No/);
  assert.match(apple,/Override to Higher Age Rating: 18\+/);
  assert.match(apple,/\*\*Made for Kids:\*\* No/);
  assert.match(apple,/ITSAppUsesNonExemptEncryption/);
});
