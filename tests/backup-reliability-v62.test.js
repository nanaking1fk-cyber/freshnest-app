const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../shared/v23-core');
const PROFILE='wgp-v15-profile',RECOVERY='wgp-v15-recovery-snapshots';
function storage(initial={}){const data=new Map(Object.entries(initial));return{data,get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}}
function harness(initial={}){
 const localStorage=storage(initial),c={localStorage,Blob,File,TextEncoder,TextDecoder,Uint8Array,crypto:require('node:crypto').webcrypto,APP_VERSION:'test',PREFIX:'wgp-v15-',K:{recovery:RECOVERY,diagnostics:'wgp-v15-diagnostics',sync:'wgp-v15-sync-settings'},WGC23Core:core,btoa:v=>Buffer.from(v,'binary').toString('base64'),atob:v=>Buffer.from(v,'base64').toString('binary'),location:{origin:'https://example.test'},dkey:()=> '2026-09-03',jget:(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),jset:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),addEventListener(){}};
 c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../work-gym-planner-v16/data.js'),'utf8'),c);return c;
}
test('recovery snapshots never contain older snapshots or private credentials',()=>{
 const c=harness({[PROFILE]:'first','wgp-v15-sync-settings':'private','wgc-v18-session':'secret'});
 for(let i=0;i<10;i++){c.localStorage.setItem(PROFILE,'version-'+i);assert.equal(c.createRecoverySnapshot('manual'),true)}
 const snapshots=JSON.parse(c.localStorage.getItem(RECOVERY));assert.equal(snapshots.length,3);
 assert.deepEqual(snapshots.map(x=>x.data[PROFILE]),['version-9','version-8','version-7']);
 assert.ok(snapshots.every(x=>!x.data[RECOVERY]&&!x.data['wgp-v15-sync-settings']));assert.ok(c.localStorage.getItem(RECOVERY).length<1000);
});
test('legacy nested recovery copies shrink while keeping each retained planner version',()=>{
 const old=[{date:'2026-09-03',reason:'auto',data:{[PROFILE]:'latest',[RECOVERY]:'nested'.repeat(10000),'wgp-v15-sync-settings':'secret'}},{data:{[PROFILE]:'older'}}];
 const c=harness({[PROFILE]:'active',[RECOVERY]:JSON.stringify(old)});c.createRecoverySnapshot('auto');
 const snapshots=JSON.parse(c.localStorage.getItem(RECOVERY));assert.equal(snapshots.length,2);assert.equal(snapshots[1].data[PROFILE],'older');assert.equal(c.localStorage.getItem(PROFILE),'active');assert.ok(c.localStorage.getItem(RECOVERY).length<500);
});
test('large encrypted backup round-trips without exceeding the JavaScript argument limit',async()=>{
 const payload=JSON.stringify({name:'Sample',notes:'x'.repeat(600000)}),c=harness({[PROFILE]:payload});
 const file=await c.encryptedBackupBlob('Strong sample passphrase');const restored=await c.decodeImportedPack(file,'Strong sample passphrase');
 assert.equal(restored.data[PROFILE],payload);assert.equal(restored.data[RECOVERY],undefined);
 await assert.rejects(c.decodeImportedPack(file,'Wrong passphrase'),/passphrase did not unlock/);assert.equal(c.localStorage.getItem(PROFILE),payload);
});
test('cloud sanitization strips historical recovery containers as well as session data',()=>{
 const clean=core.sanitizePlannerState({storage:{[PROFILE]:'keep',[RECOVERY]:JSON.stringify([{data:{'wgp-v15-sync-settings':'secret'}}]),'wgc-v18-session':'secret'}});
 assert.deepEqual(clean.storage,{[PROFILE]:'keep'});
});
test('atomic import preserves every old value on a quota failure after a successful write',()=>{
 const s=storage({[PROFILE]:'old','wgp-v15-calendar-items':'calendar'}),write=s.setItem;
 s.setItem=(key,value)=>{if(key==='wgp-v15-new')throw Object.assign(Error('full'),{name:'QuotaExceededError'});return write(key,value)};
 assert.throws(()=>core.applyPlannerStorage(s,{[PROFILE]:'new','wgp-v15-new':'large'},{replace:true}));assert.equal(s.getItem(PROFILE),'old');assert.equal(s.getItem('wgp-v15-calendar-items'),'calendar');assert.equal(s.getItem('wgp-v15-new'),null);
});
test('a denied first write never deletes its unchanged original value',()=>{
 const s=storage({[PROFILE]:'old'});s.setItem=()=>{throw Object.assign(Error('blocked'),{name:'SecurityError'})};
 assert.throws(()=>core.applyPlannerStorage(s,{[PROFILE]:'new'}));assert.equal(s.getItem(PROFILE),'old');
});
test('replacement restores already removed planner keys if a later removal is denied',()=>{
 const s=storage({[PROFILE]:'old','wgp-v15-first':'first','wgp-v15-second':'second'}),remove=s.removeItem;
 s.removeItem=key=>{if(key==='wgp-v15-second')throw Error('blocked');return remove(key)};
 assert.throws(()=>core.applyPlannerStorage(s,{[PROFILE]:'new'},{replace:true}));
 assert.equal(s.getItem(PROFILE),'old');assert.equal(s.getItem('wgp-v15-first'),'first');assert.equal(s.getItem('wgp-v15-second'),'second');
});
test('successful restore replaces only planner values and cannot import account credentials',()=>{
 const s=storage({[PROFILE]:'old','wgp-v15-calendar-items':'calendar','wgc-v18-session':'original','wgp-v15-sync-settings':'private'});
 assert.equal(core.applyPlannerStorage(s,{[PROFILE]:'new','wgc-v18-session':'attacker','wgp-v15-sync-settings':'attacker'},{replace:true}),1);
 assert.equal(s.getItem(PROFILE),'new');assert.equal(s.getItem('wgp-v15-calendar-items'),null);assert.equal(s.getItem('wgc-v18-session'),'original');assert.equal(s.getItem('wgp-v15-sync-settings'),'private');
});
