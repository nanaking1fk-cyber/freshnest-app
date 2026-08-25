// v18 product integration: accounts, AI, library and personalized onboarding
APP_VERSION='19.0.0';
(function(){
 function upgrade(){
  document.title='Work + Workout';
  let about=$('#aboutDialog .card');if(about)about.innerHTML='<p><b>Version:</b> 19.0 Worker Edition</p><p>A worker-first landing story, authentic occupational visuals, interactive product film, natural-language Quick Plan, contextual reminders, private per-account data, adaptive work and workout calendars, nutrition and multimodal AI Coach.</p><p>Your account data is isolated per user. Equipment photos are used for the requested AI answer and are not stored in the app chat history.</p>';
  let title=$('.topbar h1');if(title)title.textContent='Work + Workout';
  let intro=$('#onboardingIntro');if(intro&&!profile()){let b=intro.querySelector('b'),p=intro.querySelector('p');if(b)b.textContent='Build a plan around your real life.';if(p)p.textContent='Create an account, answer a few questions about work, commute, sleep, commitments, training and familiar foods, and Work + Workout will build your starting plan.'}
  let cards=$('#page-more .menuCards');if(cards){let old=[...cards.querySelectorAll('button')].find(x=>x.dataset.open==='cloud');if(old){old.style.display='none';old.setAttribute('aria-hidden','true')}}
  if(!profile()&&window.WGC18?.session&&localStorage.getItem(PREFIX+'onboarding-v18')==null)setTimeout(()=>window.WGC18.openOnboarding?.(),500);
 }
 upgrade();document.addEventListener('DOMContentLoaded',()=>setTimeout(upgrade,180));
})();
