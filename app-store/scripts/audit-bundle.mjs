import {readFile, stat} from 'node:fs/promises';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..','www');
const required=[
  'index.html','privacy.html','support.html','terms.html','delete-account.html',
  'native/native-bridge.js','shared/v23-core.js','shared/v25-scheduling.js','shared/v31-roster.js',
  'work-gym-planner-v16/app-v30.js','work-gym-planner-v16/app-v30.css',
  'work-gym-planner-v16/landing-v29.js','work-gym-planner-v16/landing-v29.css',
  'work-gym-planner-v16/accounts-v18.js','work-gym-planner-v16/account-security-v18.js',
  'work-gym-planner-v16/onboarding-v18.js','work-gym-planner-v16/schedule-platform-v25.js',
  'work-gym-planner-v16/adaptive-planner-v24.js','work-gym-planner-v16/ai-coach-v18.js',
  'work-gym-planner-v16/nutrition-plan-v18.js','work-gym-planner-v16/training-guides-v18.js',
  'work-gym-planner-v16/vendor/pdfjs/pdf.min.mjs',
  'work-gym-planner-v16/vendor/tesseract/tesseract.min.js',
  'work-gym-planner-v16/vendor/tesseract-core/tesseract-core-lstm.wasm.js',
  'work-gym-planner-v16/vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js',
  'work-gym-planner-v16/vendor/tessdata/eng.traineddata.gz',
  'work-gym-planner-v16/vendor/html5-qrcode/html5-qrcode.min.js'
];
const errors=[];
for(const file of required){
  try{if(!(await stat(join(root,file))).size)errors.push(`Empty required file: ${file}`)}
  catch{errors.push(`Missing required file: ${file}`)}
}

const index=await readFile(join(root,'index.html'),'utf8');
const account=await readFile(join(root,'work-gym-planner-v16','accounts-v18.js'),'utf8');
const calendar=await readFile(join(root,'work-gym-planner-v16','schedule-platform-v25.js'),'utf8');
const schedule=await readFile(join(root,'work-gym-planner-v16','schedule.js'),'utf8');
const diary=await readFile(join(root,'work-gym-planner-v16','diary-b.js'),'utf8');
const adaptive=await readFile(join(root,'work-gym-planner-v16','adaptive-planner-v24.js'),'utf8');
const bridge=await readFile(join(root,'native','native-bridge.js'),'utf8');
const runtime=[index,account,calendar,schedule,diary,adaptive,bridge].join('\n');

if(!/Work \+ Workout/.test(index))errors.push('Current product name missing from native index');
if(!/30\.1\.20/.test(index))errors.push('Current production version missing from native index');
if(!index.includes('native/native-bridge.js'))errors.push('Native bridge is not loaded');
if(index.includes("'pwa-patch.js'"))errors.push('Service-worker patch is loaded in the native app');
if(!index.includes("'pwa.js'"))errors.push('Legacy PWA script is not explicitly removed');
if(!account.includes('https://www.workandworkout.com')||account.includes("function absoluteApiBase(){return '/api/v18'}"))errors.push('Native account API does not use the production HTTPS origin');
if(!calendar.includes('WGPNative.apiBase')||!calendar.includes('WGPNative.openExternal'))errors.push('Native calendar API/OAuth bridge is incomplete');
if(/<script[^>]+src=["']https?:\/\//i.test(runtime))errors.push('Remote executable script tag found in native runtime');
if(/["'(]\/work-gym-planner-v1[56]\//.test(runtime))errors.push('Web-only absolute asset path leaked into native runtime');
if(/SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY\s*=\s*["'][^"']+/i.test(runtime)||/OPENAI_API_KEY\s*=\s*["'][^"']+/i.test(runtime))errors.push('Possible server secret embedded in native runtime');
for(const capability of ['LocalNotifications','Filesystem','Share','Haptics','StatusBar','SplashScreen','Browser'])if(!bridge.includes(capability))errors.push(`Native ${capability} integration is missing`);

if(errors.length){
  console.error('Native bundle audit FAILED\n- '+errors.join('\n- '));
  process.exit(1);
}
console.log('Native bundle audit passed: v30.1.20 is self-contained, the stale PWA runtime is disabled, production APIs are explicit, native capabilities are present, and no server secrets were detected.');
