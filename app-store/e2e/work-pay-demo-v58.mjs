import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const savedProfile={id:'calendar-fixture',name:'Calendar sample',sleepTarget:7.5,heightIn:68,trainingDaysPerWeek:3,singleJobTraining:true,equipmentMode:'full',fixed:{enabled:true,name:'Work',anchor:'2026-08-31',pattern:[0,0,0,0,0,0,0],start:'07:00',end:'19:00',commuteMin:20},variable:{enabled:false,name:'Extra work',start:'',end:'',commuteMin:20}};
const source={id:'old-source',name:'Existing workplace',enabled:true,color:'#58a6ff',overtimeThreshold:40};
const oldShift={id:'old-shift',kind:'work',date:'2026-09-02',start:'07:00',end:'15:00',sourceId:'old-source',title:'Saved shift'};
const oldRotation={id:'old-rotation',sourceId:'old-source',name:'Paused saved rotation',active:false,anchor:'2026-08-31',pattern:['D','O'],dayStart:'07:00',dayEnd:'15:00'};
const fixtures=new Map(),serverErrors=[];let server,base,sequence=0;
fixtures.set('hours-demo',{writes:0,revision:'2026-09-03T12:00:00.000Z',state:{storage:{'wgp-v15-profile':JSON.stringify(savedProfile),'wgp-v15-schedule-sources-v25':JSON.stringify([source]),'wgp-v15-schedule-events-v25':JSON.stringify([oldShift]),'wgp-v15-schedule-rotations-v25':JSON.stringify([oldRotation]),'wgp-v15-schedule-sources-initialized-v25':'true'}}});
const body=async req=>{let value='';for await(const chunk of req)value+=chunk;return value?JSON.parse(value):{}};
(async()=>{
 server=createServer((req,res)=>serve(req,res).catch(error=>{if(!req.aborted&&error.code!=='ECONNRESET')serverErrors.push(error.message);res.destroy()}));
 async function serve(req,res){
  const url=new URL(req.url,'http://localhost'),json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value))};
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'");
  if(url.pathname==='/hours-demo-seed.js'){res.setHeader('Content-Type','text/javascript');return res.end("localStorage.setItem('wgc-v18-session',JSON.stringify({access_token:'hours-demo',expires_at:4102444800,user:{id:'calendar-fixture',email:'demo@example.test'}}));localStorage.setItem('wgc-v18-local-owner','calendar-fixture');")}
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.endsWith('/config'))return json({ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:base,supabaseAnonKey:'fixture'});
   const fixture=fixtures.get((req.headers.authorization||'').replace(/^Bearer /,''));
   if(url.pathname.endsWith('/client-error')){serverErrors.push('Unexpected app diagnostic: '+(await body(req)).errorName);return json({ok:true})}
   if(!fixture)return json({ok:false},401);
   if(url.pathname.endsWith('/health-consent'))return json({ok:true,receipt:{action:'granted',consentVersion:'2026-08-31-v1',policyVersion:'1.5',purposes:['account_cloud_sync']}});
   if(url.pathname.endsWith('/state')){
    if(req.method==='PUT'){const sent=await body(req);if(sent.baseUpdatedAt!==fixture.revision)return json({ok:false,code:'STATE_CONFLICT'},409);fixture.state=sent.state;fixture.writes++;fixture.revision=new Date(Date.parse(fixture.revision)+1000).toISOString()}
    return json({ok:true,state:fixture.state,updatedAt:fixture.revision});
   }
   return json({ok:true});
  }
  if(url.pathname.startsWith('/_vercel/')){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('')}
  if(['/work-gym-planner/','/work-gym-planner/index.html'].includes(url.pathname)){res.writeHead(307,{Location:'/work-gym-planner/shell.html'+url.search});return res.end()}
  const file=resolve(root,'.'+url.pathname);if(!file.startsWith(root+'/')){res.writeHead(403);return res.end()}
  try{res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(file.endsWith('/shell.html')?String(await readFile(file)).replace('<head>','<head><script src="/hours-demo-seed.js"></script>'):await readFile(file))}catch{res.writeHead(404);res.end('Not found')}
 }
 await new Promise(resolve=>server.listen(Number(process.env.HOURS_DEMO_PORT||8858),'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;console.log('Synthetic hours demo: '+base+'/work-gym-planner/');
})();
