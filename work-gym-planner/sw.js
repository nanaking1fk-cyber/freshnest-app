const CACHE='wgp-stable-v24.0.1';
const SHELL=[
 './','./index.html','./manifest.webmanifest',
 '../work-gym-planner-v16/v16.css','../work-gym-planner-v16/adaptive-planner-v24.css','../work-gym-planner-v16/base-patch.js','../work-gym-planner-v16/workout-plan.js','../work-gym-planner-v16/nutrition-core.js','../work-gym-planner-v16/health.js','../work-gym-planner-v16/coach.js','../work-gym-planner-v16/today.js','../work-gym-planner-v16/calendar.js','../work-gym-planner-v16/training-a.js','../work-gym-planner-v16/training-b.js','../work-gym-planner-v16/diary-a.js','../work-gym-planner-v16/diary-b.js','../work-gym-planner-v16/progress.js','../work-gym-planner-v16/schedule.js','../work-gym-planner-v16/data.js','../work-gym-planner-v16/cloud.js','../work-gym-planner-v16/notifications.js','../work-gym-planner-v16/pwa-patch.js','../work-gym-planner-v16/shell.js','../work-gym-planner-v16/init.js','../work-gym-planner-v16/adaptive-planner-v24.js','../work-gym-planner-v16/icons/icon-180.png','../work-gym-planner-v16/icons/icon.svg',
 '../work-gym-planner-v15/index.html','../work-gym-planner-v15/base.css','../work-gym-planner-v15/training.css','../work-gym-planner-v15/responsive.css','../work-gym-planner-v15/base.js','../work-gym-planner-v15/work-model.js','../work-gym-planner-v15/profile.js','../work-gym-planner-v15/nutrition-ui.js','../work-gym-planner-v15/ui.js','../work-gym-planner-v15/pwa.js'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(SHELL.map(url=>c.add(url)))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){let q=r.clone();caches.open(CACHE).then(c=>c.put(e.request,q)).catch(()=>{})}return r}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./index.html'):undefined))));
});
