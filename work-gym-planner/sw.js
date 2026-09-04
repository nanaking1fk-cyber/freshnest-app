const CACHE='wgp-stable-v30.1.31-home63';
const SHELL=[
 './','./shell.html','./index.html','./boot.css','./boot.js','./manifest.webmanifest',
 '../shared/observability.js','../shared/usage-counts-v45.js','../shared/v23-core.js','../shared/v25-scheduling.js','../shared/v31-roster.js',
 '../work-gym-planner-v16/v16.css','../work-gym-planner-v16/premium-v18.css','../work-gym-planner-v16/landing-v29.css','../work-gym-planner-v16/home-v27.css','../work-gym-planner-v16/nutrition-v27.css','../work-gym-planner-v16/adaptive-planner-v24.css','../work-gym-planner-v16/schedule-platform-v25.css','../work-gym-planner-v16/app-v29.css','../work-gym-planner-v16/app-v30.css','../work-gym-planner-v16/calendar-premium-v42.css',
 '../work-gym-planner-v16/base-patch.js','../work-gym-planner-v16/workout-plan.js','../work-gym-planner-v16/nutrition-core.js','../work-gym-planner-v16/food-portions-v50.js','../work-gym-planner-v16/health.js','../work-gym-planner-v16/coach.js','../work-gym-planner-v16/today.js','../work-gym-planner-v16/calendar.js','../work-gym-planner-v16/training-a.js','../work-gym-planner-v16/training-b.js','../work-gym-planner-v16/alternatives.js','../work-gym-planner-v16/diary-a.js','../work-gym-planner-v16/diary-b.js','../work-gym-planner-v16/progress.js','../work-gym-planner-v16/schedule.js','../work-gym-planner-v16/data.js','../work-gym-planner-v16/cloud.js','../work-gym-planner-v16/notifications.js','../work-gym-planner-v16/pwa-patch.js','../work-gym-planner-v16/shell.js','../work-gym-planner-v16/audit-v169.js','../work-gym-planner-v16/singlejob-ui-v169.js','../work-gym-planner-v16/body-bmr-v169.js','../work-gym-planner-v16/training-history-v1610.js','../work-gym-planner-v16/commercial-v17.js','../work-gym-planner-v16/commercial-legal-v17.js','../work-gym-planner-v16/commercial-polish-v17.js','../work-gym-planner-v16/commercial-cyclefix-v17.js','../work-gym-planner-v16/accounts-v18.js','../work-gym-planner-v16/account-security-v18.js','../work-gym-planner-v16/sync-v18.js','../work-gym-planner-v16/onboarding-v18.js','../work-gym-planner-v16/onboarding-accountfix-v18.js','../work-gym-planner-v16/exercise-library-v18.js','../work-gym-planner-v16/ai-coach-v18.js','../work-gym-planner-v16/nutrition-plan-v18.js','../work-gym-planner-v16/training-guides-v18.js','../work-gym-planner-v16/v18-integration.js','../work-gym-planner-v16/init.js','../work-gym-planner-v16/premium-ui-v18.js','../work-gym-planner-v16/guided-onboarding-v18.js','../work-gym-planner-v16/landing-v29.js','../work-gym-planner-v16/adaptive-planner-v24.js','../work-gym-planner-v16/schedule-platform-v25.js','../work-gym-planner-v16/app-v29.js','../work-gym-planner-v16/app-v30.js','../work-gym-planner-v16/calendar-premium-v42.js',
 '../work-gym-planner-v16/vendor/fonts/instrument-sans-latin-400-normal.woff2','../work-gym-planner-v16/vendor/fonts/instrument-sans-latin-500-normal.woff2','../work-gym-planner-v16/vendor/fonts/instrument-sans-latin-600-normal.woff2','../work-gym-planner-v16/vendor/fonts/instrument-sans-latin-700-normal.woff2','../work-gym-planner-v16/vendor/fonts/instrument-serif-latin-400-normal.woff2','../work-gym-planner-v16/vendor/fonts/instrument-serif-latin-400-italic.woff2','../work-gym-planner-v16/vendor/fonts/ibm-plex-mono-latin-400-normal.woff2','../work-gym-planner-v16/vendor/fonts/ibm-plex-mono-latin-500-normal.woff2','../work-gym-planner-v16/icons/icon-180.png','../work-gym-planner-v16/icons/icon.svg','../work-gym-planner-v16/icons/brand-mark.svg','../work-gym-planner-v16/vendor/pdfjs/pdf.min.mjs','../work-gym-planner-v16/vendor/pdfjs/pdf.worker.min.mjs','../work-gym-planner-v16/vendor/tesseract/tesseract.min.js','../work-gym-planner-v16/vendor/tesseract/worker.min.js','../work-gym-planner-v16/vendor/tesseract-core/tesseract-core-lstm.js','../work-gym-planner-v16/vendor/tesseract-core/tesseract-core-lstm.wasm','../work-gym-planner-v16/vendor/tesseract-core/tesseract-core-simd-lstm.js','../work-gym-planner-v16/vendor/tesseract-core/tesseract-core-simd-lstm.wasm','../work-gym-planner-v16/vendor/html5-qrcode/html5-qrcode.min.js',
 '../work-gym-planner-v15/index.html','../work-gym-planner-v15/base.css','../work-gym-planner-v15/training.css','../work-gym-planner-v15/responsive.css','../work-gym-planner-v15/base.js','../work-gym-planner-v15/work-model.js','../work-gym-planner-v15/profile.js','../work-gym-planner-v15/nutrition-ui.js','../work-gym-planner-v15/ui.js','../work-gym-planner-v15/pwa.js'
];
SHELL.push('../work-gym-planner-v16/health-consent-v35.js');
SHELL.push('../work-gym-planner-v16/roster-scan-v48.js','../work-gym-planner-v16/roster-scan-v48.css');
SHELL.push('../shared/work-pay-v58.js','../work-gym-planner-v16/work-pay-v58.js','../work-gym-planner-v16/work-pay-v58.css');
const OPTIONAL_SHELL=SHELL.filter(url=>url.includes('/vendor/'));
const REQUIRED_SHELL=SHELL.filter(url=>!OPTIONAL_SHELL.includes(url));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(async c=>{
 await c.addAll(REQUIRED_SHELL);
}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
async function cacheMatch(request){
 const cache=await caches.open(CACHE);
 const response=(await cache.match(request))||(await cache.match(request,{ignoreSearch:true}));
 return navigationSafeResponse(response);
}
// Safari rejects a followed redirect replayed from Cache Storage for a
// navigation. Keep the body/security headers, without its redirect history.
function navigationSafeResponse(response){
 return response?.redirected&&response.ok?new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers}):response;
}
function isAuthCallback(url){return ['auth','code','token_hash','access_token','refresh_token','error','error_code','error_description'].some(key=>url.searchParams.has(key))}
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==location.origin||u.pathname.startsWith('/api/')||e.request.headers.has('Authorization'))return;
 // Let the browser load one-time links directly; never cache their URLs or
 // replace an auth callback with an unrelated cached navigation.
 if(isAuthCallback(u))return;
 e.respondWith((async()=>{
  const cached=await cacheMatch(e.request);
  if(cached)return cached;
  try{
   const r=navigationSafeResponse(await fetch(e.request));
   if(r.ok){const copy=r.clone();await caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}
   return r;
  }catch(error){
   if(e.request.mode==='navigate'){const shell=await cacheMatch('./shell.html');if(shell)return shell}
   throw error;
  }
 })());
});
