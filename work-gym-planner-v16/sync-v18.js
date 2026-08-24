// v18 lightweight account autosync. Keeps local-first writes responsive.
window.WGC18=window.WGC18||{};
(function(A){
 let timer=null,pushing=false,dirty=false,lastPush=0;
 async function push(){if(pushing||!dirty||!A.session||typeof A.pushState!=='function')return;pushing=true;try{await A.pushState({quiet:true});dirty=false;lastPush=Date.now()}catch(e){console.warn('Account autosync deferred:',e.message)}finally{pushing=false}}
 A.queueSync=function(){if(!A.session)return;dirty=true;clearTimeout(timer);timer=setTimeout(push,2500)};
 const oldSet=window.jset;
 if(typeof oldSet==='function'&&!oldSet.__sync18){let wrapped=function(key,val){let r=oldSet(key,val);if(A.session&&!/(?:wgc-v18-session|wgc-v18-last-sync)/.test(key))A.queueSync();return r};wrapped.__sync18=true;window.jset=wrapped}
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty)push()});
 window.addEventListener('online',()=>{if(dirty)push()});
 setInterval(()=>{if(dirty&&Date.now()-lastPush>30000)push()},30000);
})(window.WGC18);
