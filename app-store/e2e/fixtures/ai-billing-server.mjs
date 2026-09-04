// Local UI fixture only. No Apple, OpenAI, Supabase or production requests.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../..',import.meta.url)).replace(/\/$/,'');
export async function startBillingFixture(port=0){
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/'){
   res.setHeader('Content-Type','text/html');
   return res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/work-gym-planner-v15/base.css"><link rel="stylesheet" href="/work-gym-planner-v16/app-v30.css"><title>AI allowance — local test only</title></head><body class="premiumV30"><main id="page-more"><h1>Local subscription preview</h1><p>Calendar and manual food logging remain free.</p><div class="menuCards"></div></main><script>
    const query=new URLSearchParams(location.search);window.fixtureCalls=[];window.fixtureOffline=false;
    const controls=document.createElement('section');controls.id='photoFixture';controls.innerHTML='<button id="foodMealScanTool">Meal scan</button>'+['mealScanPhoto','aiPhotoInput','scheduleCameraV24','schedulePhotoV70','scheduleFileV24','barcodePhotoFixture'].map(id=>'<label id="label-'+id+'">'+id+'<input id="'+id+'" type="file" style="display:none"></label>').join('')+'<div id="accountDialog" class="modal">Sign in</div>';document.body.appendChild(controls);document.getElementById('foodMealScanTool').onclick=()=>fixtureCalls.push('meal-pane');
    const mode=query.get('mode')||'purchased';let tier=query.get('tier')||'free';
    window.openModal=id=>document.getElementById(id).classList.add('open');window.closeModal=id=>document.getElementById(id).classList.remove('open');
    window.WGPNative={platform:query.get('platform')==='web'?'web':'ios'};
    window.Capacitor={Plugins:{ApplePurchases:{
     products:async()=>({available:mode!=='unavailable',displayPrice:'$1.99'}),
     purchase:async()=>({status:mode==='cancelled'?'cancelled':mode==='pending'?'pending':'purchased',transaction:{id:'fixture-transaction',signedTransaction:'synthetic-not-an-Apple-receipt'}}),
     restore:async()=>({transactions:[{id:'fixture-transaction',signedTransaction:'synthetic-not-an-Apple-receipt'}]}),
     entitlements:async()=>({transactions:[]}),addListener:async()=>({remove(){}}),
     finish:async()=>fixtureCalls.push('finish'),manage:async()=>fixtureCalls.push('manage')
    }}};
    window.WGC18={session:{user:{id:'fixture-account'}},authedFetch:async(path,opt={})=>{
     if(window.fixtureOffline)throw Error('Fixture subscription check unavailable');
     if(opt.method==='POST'){fixtureCalls.push('verify');if(mode==='rejected')throw Error('This purchase does not match this account.');tier='plus'}
     return {ok:true,tier,remaining:mode==='exhausted'?0:tier==='plus'?100:10,credits:tier==='plus'?100:10,resetsAt:new Date(Date.now()+(mode==='expired'?-86400000:30*86400000)).toISOString(),appAccountToken:'00000000-0000-4000-8000-000000000056',purchaseAvailable:mode!=='unavailable',...(opt.method==='POST'?{purchase:{transactionId:'fixture-transaction'}}:{})};
    }};
   </script><script src="/work-gym-planner-v16/ai-subscription-v56.js"></script><script>WGC18.openAIPlan()</script></body></html>`);
  }
  const file=resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+'/')||!/^\/(work-gym-planner-v15|work-gym-planner-v16|work-gym-planner)\//.test(url.pathname)){res.writeHead(404);return res.end()}
  const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};
  try{const contents=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(contents)}catch{res.writeHead(404);res.end('Not found')}
 });
 await new Promise(done=>server.listen(port,'127.0.0.1',done));
 return {url:'http://127.0.0.1:'+server.address().port,close:async()=>{server.closeAllConnections();await new Promise(done=>server.close(done))}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const fixture=await startBillingFixture(Number(process.argv[2])||43656);console.log(fixture.url)}
