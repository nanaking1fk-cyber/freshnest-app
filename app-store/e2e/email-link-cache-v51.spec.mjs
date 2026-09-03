import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Real browser service workers + HTTP redirects, but no real accounts, emails,
// health records or third-party requests. Run with E2E_BROWSER=webkit for Safari.
test.use({browserName:process.env.E2E_BROWSER||'chromium'});
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
let server,base,exchanges=[];
const contentTypes={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
test.beforeAll(async()=>{
 server=createServer(async(req,res)=>{
  const url=new URL(req.url,base||'http://localhost');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'");
  const json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};
  if(url.pathname==='/auth/v1/token'){
   let body='';for await(const chunk of req)body+=chunk;exchanges.push(JSON.parse(body));
   return json({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:4102444800,user:{id:'email-fixture',email:'new@example.test'}});
  }
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.endsWith('/config'))return json({ok:true,cloudConfigured:true,aiConfigured:false,supabaseUrl:base,supabaseAnonKey:'fixture'});
   if(url.pathname.endsWith('/state'))return json({ok:true,state:null,updatedAt:null});
   return json({ok:true});
  }
  if(url.pathname.startsWith('/_vercel/')){res.setHeader('Content-Type','text/javascript');return res.end('')}
  if(url.pathname==='/redirected-shell'){res.writeHead(302,{Location:'/work-gym-planner/shell.html'});return res.end()}
  if(url.pathname==='/legacy-worker.js'){
   res.setHeader('Content-Type','text/javascript');res.setHeader('Service-Worker-Allowed','/work-gym-planner/');
   return res.end(`self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode!=='navigate')return;e.respondWith(caches.open('legacy-crash53-fixture').then(async c=>(await c.match(e.request,{ignoreSearch:true}))||fetch(e.request)))});`);
  }
  if(['/work-gym-planner/','/work-gym-planner/index.html'].includes(url.pathname)){
   res.writeHead(307,{Location:'/work-gym-planner/shell.html'+url.search});return res.end();
  }
  let pathname=url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+'/')){res.writeHead(403);return res.end()}
  try{const data=await readFile(file);res.setHeader('Content-Type',contentTypes[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data)}catch{res.writeHead(404);res.end('Not found')}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))});
async function load(page){
 await page.goto(base+'/work-gym-planner/shell.html');
 await expect.poll(()=>page.evaluate(()=>!!window.WGC18?.config.loaded)).toBe(true);
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}))});
}
async function seedRedirectedCache(page){
 return page.evaluate(async()=>{
  const names=await caches.keys(),name=names.find(x=>x.startsWith('wgp-stable-'));const cache=await caches.open(name);
  // The repaired worker strips redirect history. Bypass it to deliberately
  // seed the old bad response, then test that a navigation repairs the entry.
  const response=await fetch('/redirected-shell?code=fixture-seed');if(!response.redirected)throw Error('fixture did not redirect');
  await cache.put('/work-gym-planner/',response);return name;
 });
}
for(const width of [390,1440])test.describe(`${width}px confirmation with offline cache`,()=>{
 test.use({viewport:{width,height:900}});
 test('cached redirected pages load; signup and reset links bypass cache and finish their own flow',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await load(page);const cacheName=await seedRedirectedCache(page);
  await page.goto(base+'/work-gym-planner/');await expect.poll(()=>page.evaluate(()=>!!window.WGC18?.config.loaded)).toBe(true);
  await page.evaluate(()=>{localStorage.setItem('wgc-v25-pkce-verifier','signup-verifier');localStorage.setItem('wgc-v25-pkce-purpose','signup')});
  const before=exchanges.length,response=await page.goto(base+'/work-gym-planner/?auth=signup&code=sample-signup');
  expect(response.status()).toBe(200);expect(response.fromServiceWorker()).toBe(false);
  await expect.poll(()=>page.evaluate(()=>window.WGC18?.session?.user?.id)).toBe('email-fixture');
  expect(exchanges.slice(before)).toEqual([{auth_code:'sample-signup',code_verifier:'signup-verifier'}]);expect(page.url()).not.toContain('code=');
  await page.evaluate(()=>{localStorage.setItem('wgc-v25-pkce-verifier','reset-verifier');localStorage.setItem('wgc-v25-pkce-purpose','recovery')});
  const reset=await page.goto(base+'/work-gym-planner/shell.html?auth=recovery&code=sample-reset');expect(reset.fromServiceWorker()).toBe(false);
  await expect(page.locator('#recoveryPasswordForm')).toBeVisible();await page.screenshot({path:info.outputPath('email-return.png')});
  const cachedUrls=await page.evaluate(async()=>{const names=await caches.keys();return(await Promise.all(names.map(async name=>(await(await caches.open(name)).keys()).map(r=>r.url)))).flat()});
  expect(cachedUrls.some(url=>/[?&](?:code|auth)=/.test(url))).toBe(false);expect(cacheName).toContain('crash53');expect(errors).toEqual([]);
 });
});
test('expired and cross-browser links show sign-in help, never a blank page or new account',async({page})=>{
 await load(page);
 await page.goto(base+'/work-gym-planner/shell.html?auth=signup#error=access_denied&error_code=otp_expired');
 await expect(page.locator('#accountDialog')).toHaveClass(/open/);await expect(page.locator('#accountStatus')).toContainText('expired or was already used');await expect(page.locator('#loginEmail')).toBeVisible();expect(page.url()).not.toContain('error=');
 const before=exchanges.length;await page.goto(base+'/work-gym-planner/shell.html?auth=signup&code=different-browser');
 await expect(page.locator('#accountStatus')).toContainText('different browser');await expect(page.locator('#loginEmail')).toBeVisible();expect(exchanges.length).toBe(before);expect(await page.evaluate(()=>WGC18.session)).toBe(null);
});
test('new direct-shell links still open when an older worker has the broken folder response',async({page})=>{
 await load(page);
 await page.evaluate(async()=>{
  // Model the previous production worker, including its redirect-marked cache.
  await navigator.serviceWorker.register('/legacy-worker.js',{scope:'/work-gym-planner/'});
  if(!navigator.serviceWorker.controller?.scriptURL.includes('legacy-worker'))await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
  const cache=await caches.open('legacy-crash53-fixture');await cache.put('/work-gym-planner/',await fetch('/redirected-shell'));await cache.put('/work-gym-planner/shell.html',await fetch('/work-gym-planner/shell.html'));
  localStorage.setItem('wgc-v25-pkce-verifier','legacy-verifier');localStorage.setItem('wgc-v25-pkce-purpose','signup');
 });
 const response=await page.goto(base+'/work-gym-planner/shell.html?auth=signup&code=legacy-safe');expect(response.status()).toBe(200);
 await expect.poll(()=>page.evaluate(()=>window.WGC18?.session?.user?.id)).toBe('email-fixture');expect(exchanges.at(-1)).toEqual({auth_code:'legacy-safe',code_verifier:'legacy-verifier'});
});
