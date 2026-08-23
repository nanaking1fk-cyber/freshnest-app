import {readFile,readdir,stat} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..','www');
const required=['index.html','privacy.html','support.html','terms.html','v16/commercial-v17.js','v16/training-history-v1610.js','vendor/html5-qrcode.min.js','vendor/tesseract/tesseract.min.js'];
let errors=[];
for(const f of required){try{if(!(await stat(join(root,f))).size)errors.push(`Empty required file: ${f}`)}catch{errors.push(`Missing required file: ${f}`)}}
async function walk(dir){let out=[];for(const n of await readdir(dir)){let p=join(dir,n),s=await stat(p);if(s.isDirectory())out.push(...await walk(p));else out.push(p)}return out}
for(const f of await walk(root)){if(!/\.(?:html|js)$/.test(f))continue;let t=await readFile(f,'utf8');if(/<script[^>]+src=["']https?:\/\//i.test(t))errors.push(`Remote executable script tag: ${f}`);if(/(?:cdn\.jsdelivr\.net|unpkg\.com)[^'"\s]*\.js/i.test(t))errors.push(`Remote executable JavaScript URL: ${f}`)}
let index=await readFile(join(root,'index.html'),'utf8');if(!/Work \+ Gym Coach/.test(index))errors.push('Commercial product name missing from native index');
if(errors.length){console.error('Native bundle audit FAILED\n- '+errors.join('\n- '));process.exit(1)}
console.log('Native bundle audit passed. Required commercial assets are present and no remote executable JavaScript URLs were detected.');
