import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const errors=[];
const requireMatch=(value,pattern,message)=>{if(!pattern.test(value))errors.push(message)};

const pkg=JSON.parse(read('package.json'));
const version=pkg.version;

for(const file of ['README.md','TAKEOVER.md']){
  if(!read(file).includes(version))errors.push(`${file} does not name the current ${version} release`);
}

if(!existsSync(join(root,'app-store/package-lock.json')))errors.push('Canonical app-store package-lock.json is missing');
if(!existsSync(join(root,'.github/workflows/quality.yml')))errors.push('GitHub quality workflow is missing');
if(!existsSync(join(root,'.github/dependabot.yml')))errors.push('Dependabot configuration is missing');

const serverFiles=[...readdirSync(join(root,'api/v18')).map(name=>`api/v18/${name}`),...readdirSync(join(root,'api/v25')).map(name=>`api/v25/${name}`),'server/v18-lib.js','server/calendar-v25.js'];
for(const file of serverFiles){
  const source=read(file);
  if(/\burl\.parse\s*\(/.test(source)||/\breq\.query\b/.test(source))errors.push(`${file} uses a legacy URL parser`);
}

for(const name of readdirSync(join(root,'supabase/migrations')).filter(name=>name.endsWith('.sql'))){
  const file=`supabase/migrations/${name}`,sql=read(file);
  const tables=[...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi)].map(match=>match[1]);
  for(const table of tables){
    const escaped=table.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    requireMatch(sql,new RegExp(`alter\\s+table\\s+public\\.${escaped}\\s+enable\\s+row\\s+level\\s+security`,'i'),`${file}: ${table} must enable RLS`);
    requireMatch(sql,new RegExp(`(?:grant|revoke)\\s+[\\s\\S]*?on\\s+(?:table\\s+)?public\\.${escaped}\\s+`,'i'),`${file}: ${table} must declare explicit Data API grants or revokes`);
  }
}

if(errors.length){
  console.error('Release audit failed:\n- '+errors.join('\n- '));
  process.exit(1);
}

console.log(`Release audit passed: ${version}, CI/lockfiles present, server URLs use WHATWG parsing, and new Supabase tables declare RLS plus explicit grants.`);
