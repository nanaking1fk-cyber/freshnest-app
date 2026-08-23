import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const appstore=path.resolve(here,'..');
const root=path.resolve(appstore,'..');
const v15=path.join(root,'work-gym-planner-v15');
const v16=path.join(root,'work-gym-planner-v16');
const stable=path.join(root,'work-gym-planner');
const out=path.join(appstore,'www');

async function exists(p){try{await fs.access(p);return true}catch{return false}}
async function copy(src,dst){await fs.mkdir(path.dirname(dst),{recursive:true});await fs.copyFile(src,dst)}
async function copyIf(src,dst){if(await exists(src))await copy(src,dst)}

await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(path.join(out,'legacy'),{recursive:true});
await fs.mkdir(path.join(out,'app'),{recursive:true});
await fs.mkdir(path.join(out,'icons'),{recursive:true});
await fs.mkdir(path.join(out,'vendor'),{recursive:true});

for(const f of ['base.css','training.css','responsive.css','base.js','work-model.js','profile.js','nutrition-ui.js','ui.js'])await copy(path.join(v15,f),path.join(out,'legacy',f));
const appFiles=['base-patch.js','workout-plan.js','nutrition-core.js','health.js','coach.js','today.js','calendar.js','training-a.js','training-b.js','alternatives.js','diary-a.js','diary-b.js','progress.js','schedule.js','data.js','cloud.js','notifications.js','pwa-patch.js','shell.js','audit-v169.js','singlejob-ui-v169.js','body-bmr-v169.js','training-history-v1610.js','commercial-v17.js','commercial-legal-v17.js','commercial-polish-v17.js','commercial-cyclefix-v17.js','init.js'];
for(const f of appFiles){
  let txt=await fs.readFile(path.join(v16,f),'utf8');
  if(f==='diary-b.js')txt=txt.replace(/const SCANNER_URL='[^']+';/,"const SCANNER_URL='./vendor/html5-qrcode.min.js';");
  if(f==='schedule.js')txt=txt.replace(/s\.src='https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js@[^']+';/,"s.src='./vendor/tesseract-disabled.js';");
  await fs.writeFile(path.join(out,'app',f),txt);
}
await copy(path.join(appstore,'native-bridge.js'),path.join(out,'app','native-bridge.js'));
await copy(path.join(v16,'v16.css'),path.join(out,'app','app.css'));
for(const f of ['privacy.html','terms.html','support.html'])await copy(path.join(stable,f),path.join(out,f));
for(const f of ['home-180-v167.png','home-192-v167.png'])await copyIf(path.join(stable,'icons',f),path.join(out,'icons',f));
await fs.writeFile(path.join(out,'vendor','tesseract-disabled.js'),'// Native build intentionally uses manual schedule review until Vision OCR is wired.\n');

const scannerCandidates=[
 path.join(appstore,'node_modules','html5-qrcode','html5-qrcode.min.js'),
 path.join(appstore,'node_modules','html5-qrcode','minified','html5-qrcode.min.js')
];
let scanner=null;
for(const p of scannerCandidates){if(await exists(p)){scanner=p;break}}
if(!scanner)throw new Error('html5-qrcode.min.js not found. Run npm install in appstore/.');
await copy(scanner,path.join(out,'vendor','html5-qrcode.min.js'));

let html=await fs.readFile(path.join(v15,'index.html'),'utf8');
html=html.replace(/<link rel="manifest"[^>]*>\s*/g,'')
 .replace(/<link rel="icon"[^>]*>\s*/g,'')
 .replace(/<link rel="apple-touch-icon"[^>]*>\s*/g,'')
 .replace(/<script\s+defer\s+src="\.\/[^\"]+"><\/script>\s*/g,'')
 .replace(/href="\.\/base\.css"/g,'href="./legacy/base.css"')
 .replace(/href="\.\/training\.css"/g,'href="./legacy/training.css"')
 .replace(/href="\.\/responsive\.css"/g,'href="./legacy/responsive.css"')
 .replace(/<title>Work \+ Gym Planner<\/title>/,'<title>Work + Gym Coach</title>')
 .replace('</head>','<link rel="stylesheet" href="./app/app.css"></head>');
const scripts=[
 './legacy/base.js','./legacy/work-model.js','./legacy/profile.js','./legacy/nutrition-ui.js','./legacy/ui.js',
 ...appFiles.map(f=>'./app/'+f).filter(x=>!x.endsWith('/init.js')),
 './app/native-bridge.js','./app/init.js'
].map(src=>`<script defer src="${src}"></script>`).join('\n');
html=html.replace('</body>',scripts+'\n</body>');
await fs.writeFile(path.join(out,'index.html'),html);

const allJs=[...(await fs.readdir(path.join(out,'app')))].filter(x=>x.endsWith('.js'));
for(const f of allJs){
  const txt=await fs.readFile(path.join(out,'app',f),'utf8');
  if(/cdn\.jsdelivr\.net|unpkg\.com/.test(txt))throw new Error(`Runtime executable CDN reference remains in ${f}`);
}
console.log(`Built self-contained native web bundle at ${out}`);
