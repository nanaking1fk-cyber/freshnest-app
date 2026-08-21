const CACHE='wgp-v15.0.0';
const SHELL=['./','./index.html','./base.css','./training.css','./responsive.css','./base.js','./work-model.js','./workout-plan.js','./nutrition-core.js','./calendar.js','./training.js','./diary.js','./progress.js','./profile.js','./schedule.js','./nutrition-ui.js','./data.js','./ui.js','./pwa.js','./init.js','./manifest.webmanifest','./icons/icon.svg','./icons/maskable.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin===location.origin){e.respondWith(fetch(e.request).then(r=>{let q=r.clone();caches.open(CACHE).then(c=>c.put(e.request,q));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));return}
 e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
