// Work + Workout — a lively, lightweight welcome with an optional example.
(function workWorkoutLandingV29(window){
  'use strict';
  var A=window.WGC18=window.WGC18||{};
  var ID='wwLanding';
  var BRAND_MARK='../work-gym-planner-v16/icons/brand-mark.svg';
  var examples={
    day:{title:'A little more balance.',lead:'A workday with room left for you.',rows:[['Morning shift','7:00 AM – 3:00 PM'],['Time to move','4:30 PM · 30 min workout'],['Dinner, logged','Your food diary, made simple']],foot:'Off the clock. Back to you.'},
    night:{title:'Different hours. Still you.',lead:'Your routine doesn’t need a nine-to-five.',rows:[['Night shift','7:00 PM – 7:00 AM'],['Move before your shift','3:30 PM · 20 min workout'],['Meals, ready to go','Save your favourites for next time']],foot:'A little structure for the late hours.'},
    off:{title:'A day to make your own.',lead:'More room to move, eat well and reset.',rows:[['Room to recharge','No work scheduled'],['Make time for strength','10:00 AM · 45 min workout'],['Your favourites, on repeat','Quickly log a saved meal']],foot:'Your time, on your terms.'}
  };
  function icon(kind){var paths={work:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M9 7V4h6v3M4 12h16M10 12v3h4v-3"/>',train:'<path d="M7 5v14M4 8v8M17 5v14M20 8v8M7 12h10"/>',fuel:'<path d="M19 4c-8 0-14 3-14 9a6 6 0 0 0 6 6c6 0 8-7 8-15ZM5 20l9-9"/>'};return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[kind]+'</svg>'}
  function brandMark(){return '<span class="ww29BrandMark" aria-hidden="true"><img src="'+BRAND_MARK+'" alt=""></span>'}
  function pageUrl(file){try{return typeof window.productPage==='function'?window.productPage(file):new URL('./'+file,location.href).href}catch{return'./'+file}}
  function markup(){
    return '<div id="'+ID+'" class="ww29" hidden>'+
      '<div class="ww72Atmosphere" aria-hidden="true"><i></i><i></i><span></span></div>'+
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
          '<div class="ww29Preview" data-example="day" role="region" aria-label="Example day, not your saved schedule">'+
            '<div class="ww29PreviewHead"><span>YOUR DAY, AT A GLANCE</span><small>Example</small></div>'+
            '<div class="ww72Scenarios" role="group" aria-label="Explore example schedules"><button type="button" data-ww72-day="day" aria-pressed="true" aria-controls="ww72DayExample">Day shift</button><button type="button" data-ww72-day="night" aria-pressed="false" aria-controls="ww72DayExample">Night shift</button><button type="button" data-ww72-day="off" aria-pressed="false" aria-controls="ww72DayExample">Day off</button></div>'+
            '<div id="ww72DayExample" aria-live="polite" aria-atomic="true">'+
              '<h2 data-ww72-title>'+examples.day.title+'</h2><p class="ww72ExampleLead" data-ww72-lead>'+examples.day.lead+'</p>'+
              '<div class="ww72DayTrack" aria-hidden="true"><span></span><span></span><span></span></div>'+
              ['work','train','fuel'].map(function(kind,index){return '<div class="ww29PreviewRow '+kind+'"><i>'+icon(kind)+'</i><span><b data-ww72-row-title="'+index+'">'+examples.day.rows[index][0]+'</b><small data-ww72-row-detail="'+index+'">'+examples.day.rows[index][1]+'</small></span><em>'+['Work','Train','Fuel'][index]+'</em></div>'}).join('')+
              '<div class="ww29PreviewFoot"><span aria-hidden="true">✓</span><span data-ww72-foot>'+examples.day.foot+'</span></div>'+
            '</div>'+
          '</div>'+
        '</section>'+
        '<section class="ww29Essentials" aria-label="What you can do">'+
          '<article><div class="ww72FeatureIcon">'+icon('work')+'</div><span>01 / PLAN</span><h2>Your shifts, organized.</h2><p>Add work, rotations and time off. Track hours and share your calendar.</p></article>'+
          '<article><div class="ww72FeatureIcon">'+icon('train')+'</div><span>02 / MOVE</span><h2>Training that fits.</h2><p>Keep your routine or build a plan around the time you have.</p></article>'+
          '<article><div class="ww72FeatureIcon">'+icon('fuel')+'</div><span>03 / FUEL</span><h2>Food logging, simplified.</h2><p>Log meals, reuse favorites and follow your daily nutrition.</p></article>'+
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
    root.querySelectorAll('[data-ww72-day]').forEach(function(button){
      button.onclick=function(){
        var choice=button.dataset.ww72Day,example=examples[choice],preview=root.querySelector('.ww29Preview'),panel=root.querySelector('#ww72DayExample');
        if(!example||preview.dataset.example===choice)return;
        preview.dataset.example=choice;
        root.querySelectorAll('[data-ww72-day]').forEach(function(item){item.setAttribute('aria-pressed',String(item===button))});
        root.querySelector('[data-ww72-title]').textContent=example.title;root.querySelector('[data-ww72-lead]').textContent=example.lead;root.querySelector('[data-ww72-foot]').textContent=example.foot;
        example.rows.forEach(function(row,index){root.querySelector('[data-ww72-row-title="'+index+'"]').textContent=row[0];root.querySelector('[data-ww72-row-detail="'+index+'"]').textContent=row[1]});
        if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&panel.animate){panel.getAnimations?.().forEach(function(animation){animation.cancel()});panel.animate([{opacity:.5,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'})}
      };
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
