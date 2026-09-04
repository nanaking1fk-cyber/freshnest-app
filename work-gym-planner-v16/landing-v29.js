// Work + Workout — a quiet welcome, with explicit account entry points.
(function workWorkoutLandingV29(window){
  'use strict';
  var A=window.WGC18=window.WGC18||{};
  var ID='wwLanding';
  var BRAND_MARK='../work-gym-planner-v16/icons/brand-mark.svg';
  function brandMark(){return '<span class="ww29BrandMark" aria-hidden="true"><img src="'+BRAND_MARK+'" alt=""></span>'}
  function pageUrl(file){try{return typeof window.productPage==='function'?window.productPage(file):new URL('./'+file,location.href).href}catch{return'./'+file}}
  function markup(){
    return '<div id="'+ID+'" class="ww29" hidden>'+
      '<header class="ww29Nav"><div class="ww29NavIn">'+
        '<a class="ww29Brand" href="#wwWelcome">'+brandMark()+'<b>Work + Workout</b></a>'+
        '<button class="ww29SignIn" data-ww29="signin">Sign in <span aria-hidden="true">↗</span></button>'+
      '</div></header>'+
      '<main class="ww29Main" id="wwWelcome">'+
        '<section class="ww29Hero" aria-labelledby="wwWelcomeTitle">'+
          '<div class="ww29HeroCopy">'+
            '<p class="ww29Eyebrow"><span></span>MADE FOR LIFE AROUND SHIFTS</p>'+
            '<h1 id="wwWelcomeTitle">Your work.<br>Your health.<br><em>Room for both.</em></h1>'+
            '<p class="ww29Lead">A calmer way to plan your shifts, workouts and meals. All together, around your real life.</p>'+
            '<div class="ww29HeroActions"><button class="ww29Button" data-ww29="signup">Create account <span aria-hidden="true">→</span></button><button class="ww29Secondary" data-ww29="signin">Sign in</button></div>'+
            '<p class="ww29Trust">Free to start. No card needed.</p>'+
          '</div>'+
          '<div class="ww29Preview" aria-label="Example day, not your saved schedule">'+
            '<div class="ww29PreviewHead"><span>YOUR DAY, AT A GLANCE</span><small>Example</small></div>'+
            '<h2>A little more balance.</h2><p>One place for what matters today.</p>'+
            '<div class="ww29PreviewRow work"><i aria-hidden="true">01</i><span><b>Morning shift</b><small>7:00 AM – 3:00 PM</small></span><em>Work</em></div>'+
            '<div class="ww29PreviewRow train"><i aria-hidden="true">02</i><span><b>Time to move</b><small>4:30 PM · 30 min workout</small></span><em>Train</em></div>'+
            '<div class="ww29PreviewRow fuel"><i aria-hidden="true">03</i><span><b>Dinner, logged</b><small>Your food diary, made simple</small></span><em>Fuel</em></div>'+
            '<div class="ww29PreviewFoot"><span aria-hidden="true">✓</span> A plan you can make your own</div>'+
          '</div>'+
        '</section>'+
        '<section class="ww29Essentials" aria-label="What you can do">'+
          '<article><span>01 / PLAN</span><h2>Your shifts, organized.</h2><p>Add work, rotations and time off. Track hours and share your calendar.</p></article>'+
          '<article><span>02 / MOVE</span><h2>Training that fits.</h2><p>Keep your routine or build a plan around the time you have.</p></article>'+
          '<article><span>03 / FUEL</span><h2>Food logging, simplified.</h2><p>Log meals, reuse favorites and follow your daily nutrition.</p></article>'+
        '</section>'+
        '<details class="ww29How"><summary>How do I get started?<span aria-hidden="true">+</span></summary><div><p>Create your account, choose your privacy settings, then add your schedule. You review changes before they are saved.</p><p>Cloud backup and AI tools are optional. AI use has a monthly limit, shown in the app.</p></div></details>'+
      '</main>'+
      '<footer class="ww29Footer"><span>Work + Workout</span><nav aria-label="Help and policies"><a href="'+pageUrl('privacy.html')+'">Privacy &amp; health data</a><a href="'+pageUrl('terms.html')+'">Terms</a><a href="'+pageUrl('support.html')+'">Support</a></nav><small>© 2026 Work + Workout</small></footer>'+
    '</div>';
  }
  function bind(root){
    root.querySelectorAll('[data-ww29]').forEach(function(button){
      button.onclick=function(){A.openAccount?.(button.dataset.ww29==='signup'?'signup':'signin')};
    });
  }
  function shouldShow(){return !A.session}
  function finishBoot(){var boot=document.getElementById('wwBoot');if(!boot)return;boot.classList.add('done');window.setTimeout(function(){boot.remove();document.getElementById('wwBootStyle')?.remove()},260)}
  function show(){var root=document.getElementById(ID);if(!root)return;document.querySelectorAll('.modal.open').forEach(function(modal){window.closeModal&&window.closeModal(modal.id)});root.hidden=false;document.body.classList.add('landingActive','premiumV29');window.scrollTo(0,0);finishBoot()}
  function hide(){var root=document.getElementById(ID);if(root)root.hidden=true;document.body.classList.remove('landingActive');window.scrollTo(0,0);window.renderTodayDashboard?.();finishBoot()}
  function mount(){var root=document.getElementById(ID);if(!root){document.body.insertAdjacentHTML('beforeend',markup());root=document.getElementById(ID);bind(root)}if(shouldShow())show();else hide()}
  mount();
  window.addEventListener('wgc:authchange',function(event){if(event.detail&&event.detail.signedIn)hide();else if(shouldShow())show()});
  window.addEventListener('wgc:profile-ready',hide);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})(window);
