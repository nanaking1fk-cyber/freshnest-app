import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../..',import.meta.url));
const read=async file=>{try{return await readFile(resolve(root,file),'utf8')}catch{return ''}};
const codeOnly=process.argv.includes('--code-only');
const code=[],release=[];
const [project,privacy,info,bridge,build,storage,coach,server]=await Promise.all([
  'app-store/ios/App/App.xcodeproj/project.pbxproj','app-store/ios/App/App/PrivacyInfo.xcprivacy',
  'app-store/ios/App/App/Info.plist','app-store/native/native-bridge.js',
  'app-store/scripts/build-web.mjs','app-store/ios/App/App/AppDataPrivacy.swift',
  'work-gym-planner-v16/ai-coach-v18.js','server/v18-lib.js'
].map(read));
if(!project.includes('PrivacyInfo.xcprivacy in Resources'))code.push('The app privacy manifest is not included in the iOS target.');
for(const [category,reason] of [['FileTimestamp','C617.1'],['UserDefaults','CA92.1']]){
  if(!privacy.includes('NSPrivacyAccessedAPICategory'+category)||!privacy.includes(reason))code.push(`Missing required-reason privacy declaration: ${category}.`);
}
if(!/<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(privacy))code.push('Reconcile the app tracking declaration with the no-tracking launch policy.');
if(!project.includes('AppDataPrivacy.swift in Sources')||!storage.includes('isExcludedFromBackup = true'))code.push('Local health-data backup protection is missing from the iOS target.');
for(const key of ['NSCameraUsageDescription','NSPhotoLibraryUsageDescription','NSHealthShareUsageDescription','NSMicrophoneUsageDescription','NSSpeechRecognitionUsageDescription'])if(!info.includes(key))code.push(`Missing iOS permission explanation: ${key}.`);
if(!bridge.includes('auth-callback')||!bridge.includes('App.getLaunchUrl')||!bridge.includes('appUrlOpen')||!build.includes('WGPNative.authRedirectUrl(purpose)'))code.push('Native email-auth return handling is incomplete.');
for(const file of ['privacy.html','terms.html','support.html','delete-account.html'])if(!(await read('work-gym-planner/'+file)).includes('<title>'))code.push(`Missing usable public page: ${file}.`);
if(/six-step/i.test(await read('app-store/APP_STORE_METADATA.md')))code.push('Review notes describe obsolete onboarding.');

// A successful asset build is not evidence of functioning commerce or an
// approved archive. Never read or print production signing/payment secrets.
if(/Continued (?:AI Coach access|coaching) requires a paid plan/.test(coach+server))release.push('The legacy lifetime AI trial still ends in an unavailable paid plan. Finish the approved monthly allowance and Apple purchase/restore flow.');
const purchases=await read('app-store/ios/App/App/ApplePurchasesPlugin.swift');
const verification=await read('server/apple-subscriptions-v56.js');
if(!purchases.includes('Transaction.updates')||!purchases.includes('transaction.finish()')||!verification.includes('SignedDataVerifier')||!verification.includes('getAllSubscriptionStatuses'))release.push('Apple purchase/restore flow is not integrated into this release candidate.');
if(!/DEVELOPMENT_TEAM\s*=\s*"?[A-Z0-9]{10}/.test(project))release.push('Select the active Apple Developer team and distribution signing configuration.');

const gates={
  appleAccount:'Active organization membership, correct seller, agreements, tax/banking and EU trader status',
  commerce:'Real Apple product, verified server configuration, allowance migration and purchase/renewal/refund/restore tests',
  signedArchive:'Xcode 26+ signed distribution archive, validation, privacy report and encryption declaration',
  nativeAccountFlows:'Supabase native redirect allowlist; real-device confirmation, reset, restore and permanent deletion',
  deviceQuality:'iPhone/iPad TestFlight matrix, camera/Health/notifications/PDF/offline and accessibility tests',
  storeListing:'Accurate screenshots, 18+ questionnaire, privacy labels, support URLs and private review credentials',
  legalAndRights:'Operator identity, global health-data legal review, processor contracts, retention and content rights',
  operations:'SMTP delivery, abuse prevention, cost alerts, crash triage and tested backups/incident response'
};
let evidence={};try{evidence=JSON.parse(await read('app-store/release-evidence.json'))}catch{release.push('Release evidence is missing or invalid JSON.')}
let revision='unknown';try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}catch{}
if(evidence.commit!==revision)release.push('Release evidence must name the exact audited commit; evidence from another build is not reusable.');
// Evidence is filled in after the candidate commit exists. It may be retained
// as a release record without changing the commit whose build was tested.
try{execFileSync('git',['diff','--quiet','HEAD','--','.',':(exclude)app-store/release-evidence.json'],{cwd:root,stdio:'ignore'})}catch{release.push('Tracked changes remain uncommitted; verify and freeze the exact candidate before submission.')}
try{
  const untracked=execFileSync('git',['ls-files','--others','--exclude-standard','--','.',':(exclude)app-store/release-evidence.json'],{cwd:root,encoding:'utf8'}).trim();
  if(untracked)release.push('Untracked files remain outside the candidate commit; account for them before accepting release evidence.');
}catch{release.push('Could not verify untracked release files.')}
for(const [key,label] of Object.entries(gates)){
  const entry=evidence.gates?.[key];
  if(entry?.status!=='verified'||!entry.evidence?.trim()||!Number.isFinite(Date.parse(entry.checkedAt||'')))release.push(label+'.');
}
const failures=codeOnly?code:[...code,...release];
if(failures.length){console.error((codeOnly?'NATIVE CODE PREFLIGHT FAILED':'NOT READY FOR APP STORE SUBMISSION')+'\n- '+failures.join('\n- '));process.exitCode=1}
else console.log(codeOnly?'Native code preflight passed. This is NOT App Store submission approval.':'Recorded submission gates passed. Apple still makes the final review decision.');
console.log('Manual release gates: '+Object.values(gates).join('; ')+'. See app-store/COMMERCIAL_READINESS_AUDIT.md.');
