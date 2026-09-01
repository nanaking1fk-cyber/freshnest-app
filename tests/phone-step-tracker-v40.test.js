const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));

test('Home and Health expose automatic steps with a browser-safe fallback',()=>{
  const today=read('work-gym-planner-v16/today.js');
  const shell=read('work-gym-planner-v16/shell.js');
  const health=read('work-gym-planner-v16/health.js');
  assert.match(today,/hvStepsPanel/);
  assert.match(today,/homeStepAction/);
  assert.match(today,/stepGoal\(\)/);
  assert.match(shell,/id="nativeStepConnectCard"/);
  assert.match(shell,/Health & steps/);
  assert.match(health,/website cannot read motion or health records/i);
  assert.match(health,/manual entry and file import/i);
  assert.match(health,/wgp-native-resume/);
  assert.match(health,/setupNativeStepTracking/);
});

test('native bridge requests only read access to daily aggregated steps',()=>{
  const bridge=read('app-store/native/native-bridge.js');
  assert.match(bridge,/customPermissions:JSON\.stringify\(\[\{Variable:'STEPS',AccessType:'READ'\}\]\)/);
  assert.match(bridge,/allVariables:inactive/);
  assert.match(bridge,/fitnessVariables:inactive/);
  assert.match(bridge,/healthVariables:inactive/);
  assert.match(bridge,/Variable:'STEPS'/);
  assert.match(bridge,/OperationType:'SUM'/);
  assert.match(bridge,/TimeUnit:'DAY'/);
  assert.match(bridge,/AdvancedQueryResultType:'RAW_DATA'/);
  assert.doesNotMatch(bridge,/AccessType:'WRITE'|setData\(|setBackgroundJob\(|requestLocation/);
});

test('step totals remain compatible with the existing daily health diary',()=>{
  const health=read('work-gym-planner-v16/health.js');
  const init=read('work-gym-planner-v16/init.js');
  assert.match(health,/mergeHealthDay\(dkey\(\),\{steps,stepsSource:source,stepsSyncedAt:/);
  assert.match(health,/hasStepValue/);
  assert.match(init,/healthSteps'\)\.value!==''/);
  assert.match(init,/patch\.stepsSource='manual'/);
  assert.match(health,/source==='apple-health'/);
  assert.match(health,/source==='health-connect'/);
});

test('iOS and Android package read-only step permissions truthfully',()=>{
  const pkg=json('app-store/package.json');
  const android=json('app-store/android/healthfitness.config.json');
  const variables=read('app-store/android/variables.gradle');
  const manifest=read('app-store/android/app/src/main/AndroidManifest.xml');
  const plist=read('app-store/ios/App/App/Info.plist');
  const entitlements=read('app-store/ios/App/App/App.entitlements');
  const project=read('app-store/ios/App/App.xcodeproj/project.pbxproj');
  const swiftPackage=read('app-store/ios/App/CapApp-SPM/Package.swift');
  const capacitorSettings=read('app-store/android/capacitor.settings.gradle');
  assert.equal(pkg.dependencies['@capacitor/health-fitness'],'1.0.1');
  assert.deepEqual(android.permissions,{STEPS:'Read'});
  assert.equal(android.disableBackgroundJobs,true);
  assert.equal(android.disableReadHealthDataHistory,true);
  assert.match(android.privacyPolicyUrl,/privacy\.html#phone-steps$/);
  assert.match(variables,/minSdkVersion = 26/);
  assert.match(manifest,/android\.permission\.health\.READ_STEPS/);
  assert.doesNotMatch(manifest,/WRITE_STEPS|READ_HEALTH_DATA_IN_BACKGROUND|READ_HEALTH_DATA_HISTORY|ACTIVITY_RECOGNITION|FOREGROUND_SERVICE_HEALTH|HIGH_SAMPLING_RATE_SENSORS/);
  assert.match(plist,/NSHealthShareUsageDescription/);
  assert.match(entitlements,/com\.apple\.developer\.healthkit/);
  assert.match(project,/com\.apple\.HealthKit/);
  assert.match(project,/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements/);
  assert.match(swiftPackage,/node_modules\/@capacitor\/health-fitness/);
  assert.match(capacitorSettings,/node_modules\/@capacitor\/health-fitness\/android/);
  assert.doesNotMatch(swiftPackage+capacitorSettings,/node_modules\/\.pnpm/);
});

test('step UI styles stay scoped to Home and the Health dialog',()=>{
  const css=read('work-gym-planner-v16/app-v30.css');
  const rules=css.split('\n').filter(line=>/\.(?:hvStep|nativeStep|stepGoalRow)/.test(line)&&line.includes('{'));
  assert.ok(rules.length>=20);
  for(const rule of rules)assert.match(rule.trim(),/^body\.premiumV30 #(page-home|healthDialog)\b/,rule);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/#healthDialog \.healthStepSheet\{width:100%;height:100dvh;max-height:100dvh/);
});

test('privacy and store disclosures explain phone step handling',()=>{
  const privacy=read('work-gym-planner/privacy.html');
  const apple=read('app-store/APP_STORE_METADATA.md');
  const play=read('app-store/PLAY_STORE_METADATA.md');
  assert.match(privacy,/id="phone-steps"/);
  assert.match(privacy,/read-only access to your daily step total/i);
  assert.match(privacy,/does not request precise location for step tracking/i);
  assert.match(apple,/read-only access to Step Count only/i);
  assert.match(play,/android\.permission\.health\.READ_STEPS/);
  assert.match(play,/does not request write access, exercise routes, location/i);
});
