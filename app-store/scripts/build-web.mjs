import {cp, readFile, writeFile, mkdir, rm, stat} from 'node:fs/promises';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const appStore=resolve(here,'..');
const repo=resolve(appStore,'..');
const out=join(appStore,'www');
const source={
  wrapper:join(repo,'work-gym-planner','index.html'),
  stable:join(repo,'work-gym-planner'),
  v15:join(repo,'work-gym-planner-v15'),
  v16:join(repo,'work-gym-planner-v16'),
  shared:join(repo,'shared')
};

async function copyTree(from,to){await cp(from,to,{recursive:true,force:true})}
function rewrite(source,find,replacement,label){
  if(!source.includes(find))throw new Error(`Native bundle rewrite failed (${label}): source no longer contains ${JSON.stringify(find)}`);
  return source.split(find).join(replacement);
}

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await Promise.all([
  copyTree(source.v15,join(out,'work-gym-planner-v15')),
  copyTree(source.v16,join(out,'work-gym-planner-v16')),
  copyTree(source.shared,join(out,'shared')),
  copyTree(join(appStore,'native'),join(out,'native'))
]);

// Public legal pages are available both at the app root and underneath the
// v15 base path used by the assembled production document.
const legal=['privacy.html','support.html','terms.html','delete-account.html'];
for(const file of legal){
  await cp(join(source.stable,file),join(out,file),{force:true});
  await cp(join(source.stable,file),join(out,'work-gym-planner-v15',file),{force:true});
}

let html=await readFile(source.wrapper,'utf8');
html=rewrite(
  html,
  "const remove=['workout-plan.js','nutrition-core.js','calendar.js','training.js','diary.js','progress.js','schedule.js','data.js','init.js'];",
  "const remove=['workout-plan.js','nutrition-core.js','calendar.js','training.js','diary.js','progress.js','schedule.js','data.js','init.js','pwa.js'];",
  'disable legacy service worker'
);
html=rewrite(
  html,
  "h=h.replace('<head>','<head><base href=\"../work-gym-planner-v15/\">');",
  "h=h.replace('<head>','<head><base href=\"../work-gym-planner-v15/\"><scr'+'ipt defer src=\"../native/native-bridge.js?v=30.1.15\"></scr'+'ipt>');",
  'load native bridge first'
);
html=html.replace("'pwa-patch.js',",'');
html=html.replace("h=h.replace('<link rel=\"manifest\" href=\"./manifest.webmanifest\">','<link rel=\"manifest\" href=\"../work-gym-planner/manifest.webmanifest?v=30.1.15\">');","h=h.replace(/<link rel=\"manifest\"[^>]*>/g,'');");
await writeFile(join(out,'index.html'),html);

// Native WebViews have their own localhost origin. Keep all authenticated API
// traffic on the production hostname and never place server secrets in the app.
const accountPath=join(out,'work-gym-planner-v16','accounts-v18.js');
let account=await readFile(accountPath,'utf8');
account=rewrite(
  account,
  "function absoluteApiBase(){return '/api/v18'}",
  "function absoluteApiBase(){return((window.WGPNative&&window.WGPNative.apiBase)||'https://www.workandworkout.com')+'/api/v18'}",
  'account API base'
);
await writeFile(accountPath,account);

const platformSchedulePath=join(out,'work-gym-planner-v16','schedule-platform-v25.js');
let platformSchedule=await readFile(platformSchedulePath,'utf8');
platformSchedule=rewrite(
  platformSchedule,
  "return fetch('/api/v25/calendar?action='+encodeURIComponent(action)",
  "return fetch(((window.WGPNative&&window.WGPNative.apiBase)||'')+'/api/v25/calendar?action='+encodeURIComponent(action)",
  'calendar API base'
);
platformSchedule=rewrite(
  platformSchedule,
  "var response=await fetch('/api/v25/schedule'",
  "var response=await fetch(((window.WGPNative&&window.WGPNative.apiBase)||'')+'/api/v25/schedule'",
  'AI schedule API base'
);
platformSchedule=rewrite(
  platformSchedule,
  "returnTo:location.origin+'/'",
  "returnTo:(window.WGPNative&&window.WGPNative.returnUrl)||location.origin+'/'",
  'calendar OAuth return URL'
);
platformSchedule=rewrite(
  platformSchedule,
  "location.assign(result.authorizationUrl)",
  "window.WGPNative&&window.WGPNative.openExternal?window.WGPNative.openExternal(result.authorizationUrl):location.assign(result.authorizationUrl)",
  'calendar OAuth browser'
);
await writeFile(platformSchedulePath,platformSchedule);

// OCR/barcode loaders are dynamic, so make their native paths explicit rather
// than relying on WebView handling of web-root absolute URLs.
const legacySchedulePath=join(out,'work-gym-planner-v16','schedule.js');
let schedule=await readFile(legacySchedulePath,'utf8');
schedule=rewrite(schedule,"workerPath:'/work-gym-planner-v16/vendor/tesseract/worker.min.js',corePath:'/work-gym-planner-v16/vendor/tesseract-core'","workerPath:'../work-gym-planner-v16/vendor/tesseract/worker.min.js',corePath:'../work-gym-planner-v16/vendor/tesseract-core'",'schedule OCR paths');
schedule=rewrite(schedule,"langPath:'/work-gym-planner-v16/vendor/tessdata'","langPath:'../work-gym-planner-v16/vendor/tessdata'",'schedule OCR language path');
schedule=rewrite(schedule,"s.src='/work-gym-planner-v16/vendor/tesseract/tesseract.min.js'","s.src='../work-gym-planner-v16/vendor/tesseract/tesseract.min.js'",'schedule OCR loader');
await writeFile(legacySchedulePath,schedule);

const diaryPath=join(out,'work-gym-planner-v16','diary-b.js');
let diary=await readFile(diaryPath,'utf8');
if(!/const SCANNER_URL='[^']+';/.test(diary))throw new Error('Native bundle rewrite failed (barcode scanner URL)');
diary=diary.replace(/const SCANNER_URL='[^']+';/,"const SCANNER_URL='../work-gym-planner-v16/vendor/html5-qrcode/html5-qrcode.min.js';");
await writeFile(diaryPath,diary);

const adaptivePath=join(out,'work-gym-planner-v16','adaptive-planner-v24.js');
let adaptive=await readFile(adaptivePath,'utf8');
adaptive=rewrite(adaptive,"var PDF_MODULE='/work-gym-planner-v16/vendor/pdfjs/pdf.min.mjs';","var PDF_MODULE='../work-gym-planner-v16/vendor/pdfjs/pdf.min.mjs';",'adaptive PDF module');
adaptive=rewrite(adaptive,"var PDF_WORKER='/work-gym-planner-v16/vendor/pdfjs/pdf.worker.min.mjs';","var PDF_WORKER='../work-gym-planner-v16/vendor/pdfjs/pdf.worker.min.mjs';",'adaptive PDF worker');
await writeFile(adaptivePath,adaptive);

const required=[
  'index.html','privacy.html','support.html','terms.html','delete-account.html',
  'native/native-bridge.js','work-gym-planner-v15/index.html',
  'work-gym-planner-v16/app-v30.js','work-gym-planner-v16/app-v30.css',
  'work-gym-planner-v16/accounts-v18.js','work-gym-planner-v16/schedule-platform-v25.js',
  'work-gym-planner-v16/vendor/pdfjs/pdf.min.mjs',
  'work-gym-planner-v16/vendor/tesseract/tesseract.min.js',
  'work-gym-planner-v16/vendor/tesseract-core/tesseract-core-lstm.wasm.js',
  'work-gym-planner-v16/vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js',
  'work-gym-planner-v16/vendor/tessdata/eng.traineddata.gz',
  'work-gym-planner-v16/vendor/html5-qrcode/html5-qrcode.min.js'
];
for(const file of required){
  const info=await stat(join(out,file));
  if(!info.size)throw new Error(`Native bundle check failed: ${file}`);
}

console.log(`Built Work + Workout 30.1.15 native web bundle: ${out}`);
