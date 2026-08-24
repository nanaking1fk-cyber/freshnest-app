import {readFile,writeFile,mkdir,rm,copyFile,readdir,stat} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const appStore=resolve(here,'..');
const repo=resolve(appStore,'..');
const v15=join(repo,'work-gym-planner-v15');
const v16=join(repo,'work-gym-planner-v16');
const stable=join(repo,'work-gym-planner');
const out=join(appStore,'www');

await rm(out,{recursive:true,force:true});
await mkdir(join(out,'v15'),{recursive:true});
await mkdir(join(out,'v16'),{recursive:true});
await mkdir(join(out,'icons'),{recursive:true});
await mkdir(join(out,'vendor','tesseract'),{recursive:true});
await mkdir(join(out,'vendor','tesseract-core'),{recursive:true});

const v15Files=['base.css','training.css','responsive.css','base.js','work-model.js','profile.js','nutrition-ui.js','ui.js'];
for(const f of v15Files)await copyFile(join(v15,f),join(out,'v15',f));
const v16Files=['v16.css','base-patch.js','workout-plan.js','nutrition-core.js','health.js','coach.js','today.js','calendar.js','training-a.js','training-b.js','alternatives.js','diary-a.js','diary-b.js','progress.js','schedule.js','data.js','cloud.js','notifications.js','pwa-patch.js','shell.js','audit-v169.js','singlejob-ui-v169.js','body-bmr-v169.js','training-history-v1610.js','commercial-v17.js','commercial-legal-v17.js','commercial-polish-v17.js','commercial-cyclefix-v17.js','accounts-v18.js','account-security-v18.js','onboarding-v18.js','onboarding-accountfix-v18.js','exercise-library-v18.js','ai-coach-v18.js','nutrition-plan-v18.js','training-guides-v18.js','v18-integration.js','init.js'];
for(const f of v16Files)await copyFile(join(v16,f),join(out,'v16',f));

for(const f of ['privacy.html','support.html','terms.html'])await copyFile(join(stable,f),join(out,f));
for(const f of ['home-180-v167.png','home-192-v167.png','home-512-v167.png'])await copyFile(join(stable,'icons',f),join(out,'icons',f));

await copyFile(join(appStore,'node_modules','html5-qrcode','html5-qrcode.min.js'),join(out,'vendor','html5-qrcode.min.js'));
await copyFile(join(appStore,'node_modules','tesseract.js','dist','tesseract.min.js'),join(out,'vendor','tesseract','tesseract.min.js'));
await copyFile(join(appStore,'node_modules','tesseract.js','dist','worker.min.js'),join(out,'vendor','tesseract','worker.min.js'));
for(const f of await readdir(join(appStore,'node_modules','tesseract.js-core'))){if(/^tesseract-core.*\.(?:js|wasm)$/.test(f))await copyFile(join(appStore,'node_modules','tesseract.js-core',f),join(out,'vendor','tesseract-core',f))}

let diaryB=await readFile(join(out,'v16','diary-b.js'),'utf8');
diaryB=diaryB.replace(/const SCANNER_URL='[^']+';/,"const SCANNER_URL='./vendor/html5-qrcode.min.js';");
await writeFile(join(out,'v16','diary-b.js'),diaryB);
let schedule=await readFile(join(out,'v16','schedule.js'),'utf8');
schedule=schedule.replace("s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'","s.src='./vendor/tesseract/tesseract.min.js'");
schedule=schedule.replace("Tesseract.recognize(blob,'eng',{logger:","Tesseract.recognize(blob,'eng',{workerPath:'./vendor/tesseract/worker.min.js',corePath:'./vendor/tesseract-core',langPath:'https://tessdata.projectnaptha.com/4.0.0',logger:");
await writeFile(join(out,'v16','schedule.js'),schedule);

let html=await readFile(join(v15,'index.html'),'utf8');
html=html.replace(/<link rel="manifest"[^>]*>/g,'');
html=html.replace('<link rel="icon" href="./icons/icon-192.png" type="image/png">','<link rel="icon" type="image/png" sizes="192x192" href="./icons/home-192-v167.png">');
html=html.replace('<link rel="apple-touch-icon" sizes="180x180" href="./icons/icon-180.png">','<link rel="apple-touch-icon" sizes="180x180" href="./icons/home-180-v167.png">');
html=html.replace('<link rel="stylesheet" href="./base.css">','<link rel="stylesheet" href="./v15/base.css">');
html=html.replace('<link rel="stylesheet" href="./training.css">','<link rel="stylesheet" href="./v15/training.css">');
html=html.replace('<link rel="stylesheet" href="./responsive.css">','<link rel="stylesheet" href="./v15/responsive.css"><link rel="stylesheet" href="./v16/v16.css">');
html=html.replace('<title>Work + Gym Planner</title>','<title>Work + Gym Coach</title>');
html=html.replace(/<script defer src="\.\/[^\"]+"><\/script>/g,'');
const scripts=[...v15Files.filter(f=>f.endsWith('.js')).map(f=>'./v15/'+f),...v16Files.filter(f=>f.endsWith('.js')).map(f=>'./v16/'+f)];
const apiBase=(process.env.WGC_API_BASE||'').replace(/\/$/,'');
const apiBootstrap=apiBase?`<script>localStorage.setItem('wgc-v18-api-base',${JSON.stringify(apiBase)});</script>`:'';
html=html.replace('</body>',apiBootstrap+scripts.map(src=>`<script defer src="${src}"></script>`).join('')+'</body>');
await writeFile(join(out,'index.html'),html);

const checks=['index.html','v15/base.js','v16/init.js','v16/commercial-v17.js','v16/accounts-v18.js','v16/onboarding-v18.js','v16/exercise-library-v18.js','v16/ai-coach-v18.js','v16/nutrition-plan-v18.js','v16/v18-integration.js','v16/training-history-v1610.js','vendor/html5-qrcode.min.js','vendor/tesseract/tesseract.min.js','privacy.html'];
for(const f of checks){const s=await stat(join(out,f));if(!s.size)throw new Error(`Native bundle check failed: ${f}`)}
console.log(`Built Work + Gym Coach v18 native web bundle: ${out}`);
if(!apiBase)console.warn('WGC_API_BASE is not set; native account/AI features will remain unconfigured until a secure API base is supplied.');
