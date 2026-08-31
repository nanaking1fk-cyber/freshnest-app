// Work + Workout v29 — cinematic, product-first landing experience.
(function workWorkoutLandingV29(window){
  'use strict';
  var A=window.WGC18=window.WGC18||{};
  var ID='wwLanding';
  var ASSET='../work-gym-planner-v16/assets/';
  var BRAND_MARK='../work-gym-planner-v16/icons/brand-mark.svg';

  function brandMark(){return '<span class="ww29BrandMark" aria-hidden="true"><img src="'+BRAND_MARK+'" alt=""></span>'}
  function pageUrl(file){try{return typeof window.productPage==='function'?window.productPage(file):new URL('./'+file,location.href).href}catch{return'./'+file}}

  function cta(label,extra){
    return '<button class="ww29Button'+(extra?' '+extra:'')+'" data-ww29="signup">'+(label||'Build my week')+'<span aria-hidden="true">↗</span></button>';
  }
  function signal(kind,label,value,note){
    return '<div class="ww29Signal '+kind+'"><i></i><span><small>'+label+'</small><b>'+value+'</b><em>'+note+'</em></span></div>';
  }
  function timeline(kind,time,title,note){
    return '<div class="ww29Time '+kind+'"><time>'+time+'</time><i></i><span><b>'+title+'</b><small>'+note+'</small></span></div>';
  }
  function source(icon,title,note){
    return '<div class="ww29Source"><i aria-hidden="true">'+icon+'</i><span><b>'+title+'</b><small>'+note+'</small></span><em>Ready</em></div>';
  }

  function markup(){
    return '<div id="'+ID+'" class="ww29" hidden>'+
      '<header class="ww29Nav"><div class="ww29NavIn">'+
        '<button class="ww29Brand" data-ww29="top" aria-label="Work + Workout home">'+brandMark()+'<b>Work + Workout</b></button>'+
        '<nav aria-label="Landing page"><a href="#ww29System">How it works</a><a href="#ww29Day">What it plans</a><a href="#ww29Workers">Who it is for</a></nav>'+
        '<div class="ww29NavActions"><button class="ww29SignIn" data-ww29="signin">Sign in</button>'+cta('Build my week','small')+'</div>'+
      '</div></header>'+

      '<main class="ww29Main">'+
        '<section class="ww29Hero">'+
          '<div class="ww29HeroCopy">'+
            '<p class="ww29Eyebrow"><span></span>The health planner built around the hours you actually work</p>'+
            '<h1>Add your work schedule.<br><em>Plan workouts, meals, recovery and life around it.</em></h1>'+
            '<p class="ww29Lead">Upload a photo or PDF, or paste your shifts. Keep the workout routine you already follow or let Work + Workout build one—then fit meals, recovery, tasks and reminders around your real availability. Every change is shown for your approval.</p>'+
            '<div class="ww29HeroActions">'+cta('Build my week')+'<a href="#ww29Day">Watch it work <span>↓</span></a></div>'+
            '<div class="ww29Trust"><span>Free to start</span><span>Nothing saves without your approval</span><span>Your plan stays private</span></div>'+
          '</div>'+

          '<div class="ww29Cinema" aria-label="A day planned with Work + Workout">'+
            '<div class="ww29Film" data-scene="work">'+
              '<video class="active" data-film="work" muted autoplay loop playsinline preload="metadata" poster="'+ASSET+'story-logistics-v22.jpg"><source src="'+ASSET+'story-phone-work-v21.mp4" type="video/mp4"></video>'+
              '<video data-film="train" muted loop playsinline preload="metadata"><source src="'+ASSET+'story-phone-gym-v21.mp4" type="video/mp4"></video>'+
              '<video data-film="fuel" muted loop playsinline preload="metadata"><source src="'+ASSET+'story-phone-meal-v21.mp4" type="video/mp4"></video>'+
              '<div class="ww29FilmShade"></div>'+
              '<div class="ww29FilmTop"><span>Thursday</span><b>Plan active</b></div>'+
              '<div class="ww29FilmCaption"><p data-scene-label>07:00 · Shift added</p><h2 data-scene-title>Work goes in first. Your week is planned around it.</h2></div>'+
              '<div class="ww29FilmSteps" role="tablist" aria-label="Day scenes">'+
                '<button class="active" data-scene="work" role="tab"><i></i><span>Work</span></button>'+
                '<button data-scene="train" role="tab"><i></i><span>Train</span></button>'+
                '<button data-scene="fuel" role="tab"><i></i><span>Fuel</span></button>'+
              '</div>'+
            '</div>'+
            '<div class="ww29LiveCard">'+
              '<div class="ww29LiveHead"><span><i></i>Today’s plan</span><em>Updated 2m ago</em></div>'+
              timeline('work','07:00','Hospital shift','Imported from work schedule')+
              timeline('train','19:45','Strength workout · 42 min','Moved after a late handoff')+
              timeline('fuel','21:00','Post-workout dinner','38g protein · meal ready')+
              '<p class="ww29Adapt"><b>Schedule changed.</b> Workout and dinner moved automatically.</p>'+
            '</div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Proof" aria-label="Product principles"><div><b>01</b><span><strong>Add your schedule easily</strong><small>Use a photo, PDF, text or work rotation.</small></span></div><div><b>02</b><span><strong>Review before it is saved</strong><small>Approve shifts and resolve conflicts first.</small></span></div><div><b>03</b><span><strong>Get one realistic plan</strong><small>Work, workouts, meals, tasks and recovery.</small></span></div></section>'+

        '<section class="ww29Section ww29System" id="ww29System">'+
          '<div class="ww29SectionHead"><p class="ww29Kicker">How Work + Workout works</p><h2>One schedule becomes your complete weekly plan.</h2><p>Your work hours, workouts, meals, personal tasks and recovery share one calendar. When a shift changes, the rest of the plan can move with it.</p></div>'+
          '<div class="ww29Tabs" role="tablist" aria-label="Connected planning features">'+
            '<button class="active" data-feature="work" role="tab" aria-selected="true"><span>01</span>Work</button><button data-feature="train" role="tab" aria-selected="false"><span>02</span>Train</button><button data-feature="fuel" role="tab" aria-selected="false"><span>03</span>Fuel</button><button data-feature="recover" role="tab" aria-selected="false"><span>04</span>Recover</button>'+
          '</div>'+
          '<div class="ww29FeatureStage">'+
            '<div class="ww29FeatureCopy">'+
              '<p class="ww29Kicker" data-feature-kicker>Step 1 · Add work</p><h3 data-feature-title>Add your work schedule in seconds.</h3><p data-feature-copy>Upload a schedule photo or PDF, paste a list of shifts, or enter a repeating rotation. The app extracts every shift and lets you review confidence and conflicts before saving.</p>'+cta('Add my schedule','dark')+
            '</div>'+
            '<div class="ww29Product" data-feature-panel="work">'+
              '<div class="ww29ProductTop"><span>Schedule intake</span><em>Review required</em></div>'+
              source('⌁','Roster_August.pdf','12 shifts detected')+source('Aa','Pasted note','3 personal items detected')+
              '<div class="ww29ReviewHead"><b>Review before adding</b><span>High confidence</span></div>'+
              signal('work','MON–THU','07:00–19:00','Repeats 4 weeks')+signal('life','TUE','Dentist · 14:00','Conflict found')+
              '<button class="ww29Confirm">Confirm 13 entries</button>'+
            '</div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Day" id="ww29Day">'+
          '<div class="ww29DayCopy"><p class="ww29Kicker">Your entire day in one place</p><h2>See exactly what to do—and when it fits.</h2><p>Your shift, workout, meals, personal tasks and recovery appear on one timeline. If work runs late, the plan adjusts the flexible parts instead of letting the whole day fall apart.</p></div>'+
          '<div class="ww29DayBoard">'+
            '<div class="ww29Date"><small>THU · AUG 27</small><b>Today is handled.</b><span>Readiness 82 <i></i></span></div>'+
            '<div class="ww29DayLine">'+
              timeline('recover','05:45','Wake + hydrate','7h 24m sleep')+
              timeline('fuel','06:20','Breakfast packed','Protein target protected')+
              timeline('work','07:00','Day shift','12 hours · locked')+
              timeline('train','19:45','Full body strength','42 min · adapted')+
              timeline('fuel','21:00','Dinner','Fast recovery meal')+
              timeline('recover','22:35','Wind down','Tomorrow starts here')+
            '</div>'+
            '<div class="ww29CoachNote"><span>✦</span><p><b>Adaptive Coach</b>Your shift ended 25 minutes late, so your workout is shorter and dinner moved later. Your main strength work and sleep target are still protected.</p><button>Why?</button></div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Section ww29Capture">'+
          '<div class="ww29SectionHead"><p class="ww29Kicker">Plan with ordinary language</p><h2>Type your week the way you would text it.</h2><p>Paste a rough list, speak it, or upload your schedule. Work + Workout turns it into a proposed calendar, finds conflicts, and places workouts and tasks into realistic open times. You approve everything before it is saved.</p></div>'+
          '<div class="ww29CaptureGrid">'+
            '<div class="ww29Raw"><div class="ww29RawTop"><span>Quick plan</span><em>Paste · speak · upload</em></div><p>Work Monday–Thursday 7 AM–7 PM. Dentist Tuesday at 2. Buy groceries before Friday. Gym three times this week.</p><div><button>＋ Photo or PDF</button><button>⌁ Voice</button><button class="send">↑</button></div></div>'+
            '<div class="ww29Arrow" aria-hidden="true">→</div>'+
            '<div class="ww29Proposal"><div class="ww29ProposalTop"><span>Proposed week</span><em>Nothing saved yet</em></div>'+signal('work','4 SHIFTS','Mon–Thu · 07:00','48 hours total')+signal('life','1 CONFLICT','Dentist · Tue 14:00','Choose a resolution')+signal('train','3 SESSIONS','Wed · Fri · Sun','Placed in free time')+signal('fuel','1 TASK','Groceries · Thu 19:45','Reminder set')+'<button class="ww29Confirm">Review and confirm</button></div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Workers" id="ww29Workers">'+
          '<div class="ww29SectionHead"><p class="ww29Kicker">Made for real work schedules</p><h2>Day shifts, night shifts, rotating weeks and more.</h2><p>Whether your schedule is regular, overnight, physically demanding or always changing, the app plans your health and personal life around the hours you actually work.</p></div>'+
          '<div class="ww29WorkerStage">'+
            '<article class="active" data-worker="0"><img src="'+ASSET+'story-nurse-v19.jpg" alt="Healthcare worker in scrubs checking her phone"><div><small>Healthcare</small><h3>Stay healthy around<br>twelve-hour shifts.</h3><p>Workouts, meals and recovery planned around long days and changing handoffs.</p></div></article>'+
            '<article data-worker="1"><img src="'+ASSET+'story-road-worker-v19.jpg" alt="Road construction worker during a shift"><div><small>Construction</small><h3>Train without ignoring<br>a physically demanding job.</h3><p>Workout intensity and recovery adjusted for the work your body already does.</p></div></article>'+
            '<article data-worker="2"><img src="'+ASSET+'story-logistics-v22.jpg" alt="Logistics worker using a phone"><div><small>Logistics</small><h3>Keep a plan through<br>rotating and overnight shifts.</h3><p>Your calendar, workouts and meals follow the roster whenever it changes.</p></div></article>'+
            '<article data-worker="3"><img src="'+ASSET+'story-chef-v19.jpg" alt="Chef working in a professional kitchen"><div><small>Hospitality</small><h3>Fit meals and training<br>around service hours.</h3><p>Practical timing for early starts, late finishes and unpredictable breaks.</p></div></article>'+
            '<div class="ww29WorkerControls"><button data-worker-prev aria-label="Previous worker">←</button><span><i></i><i></i><i></i><i></i></span><button data-worker-next aria-label="Next worker">→</button></div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Close"><div><p class="ww29Kicker">Start with the schedule you already have</p><h2>Put in your work hours. Get back a healthier week.</h2><p>Work + Workout finds realistic times for training, meals, recovery, tasks and reminders—then keeps the plan updated when life changes.</p>'+cta('Create my free plan')+'<button class="ww29SignIn closeSign" data-ww29="signin">Already have an account? Sign in</button></div></section>'+

        '<footer class="ww29Footer"><div class="ww29Brand">'+brandMark()+'<b>Work + Workout</b></div><p>Your work, workouts, meals, tasks and recovery—in one plan.</p><nav><a href="'+pageUrl('privacy.html')+'">Privacy &amp; health data</a><a href="'+pageUrl('terms.html')+'">Terms</a><a href="'+pageUrl('support.html')+'">Support</a></nav><small>© 2026 Work + Workout</small></footer>'+
      '</main>'+
    '</div>';
  }

  var featureContent={
    work:{kicker:'Step 1 · Add work',title:'Add your work schedule in seconds.',copy:'Upload a schedule photo or PDF, paste a list of shifts, or enter a repeating rotation. The app extracts every shift and lets you review confidence and conflicts before saving.'},
    train:{kicker:'Step 2 · Plan workouts',title:'Get workouts placed where they actually fit.',copy:'Choose your goal, experience and available equipment. The app builds progressive workouts in realistic free times, then shortens or moves them when work changes.'},
    fuel:{kicker:'Step 3 · Plan meals',title:'Know what and when to eat around your shift.',copy:'Get daily calorie and protein targets, meal ideas based on foods you enjoy, and practical meal timing around breaks, commutes, workouts and late finishes.'},
    recover:{kicker:'Step 4 · Keep adapting',title:'Let sleep, fatigue and schedule changes update the plan.',copy:'Log sleep, workload and completed training. The app adjusts upcoming workouts, meal timing and recovery so the plan remains realistic instead of becoming another abandoned routine.'}
  };
  var sceneContent={
    work:['07:00 · Shift added','Work goes in first. Your week is planned around it.'],
    train:['19:45 · Workout adjusted','The workout moves when your workday runs late.'],
    fuel:['21:00 · Dinner planned','Meals and nutrition targets fit the day you actually had.']
  };

  function showScene(root,key){
    root.querySelectorAll('[data-film]').forEach(function(video){
      var on=video.dataset.film===key;video.classList.toggle('active',on);
      if(on&&video.paused)video.play().catch(function(){});else if(!on)video.pause();
    });
    root.querySelectorAll('.ww29FilmSteps [data-scene]').forEach(function(button){var on=button.dataset.scene===key;button.classList.toggle('active',on);button.setAttribute('aria-selected',String(on))});
    var content=sceneContent[key];root.querySelector('[data-scene-label]').textContent=content[0];root.querySelector('[data-scene-title]').textContent=content[1];
  }
  function showFeature(root,key){
    var content=featureContent[key]||featureContent.work;
    root.querySelectorAll('.ww29Tabs [data-feature]').forEach(function(button){var on=button.dataset.feature===key;button.classList.toggle('active',on);button.setAttribute('aria-selected',String(on))});
    root.querySelector('[data-feature-kicker]').textContent=content.kicker;
    root.querySelector('[data-feature-title]').textContent=content.title;
    root.querySelector('[data-feature-copy]').textContent=content.copy;
    var panel=root.querySelector('[data-feature-panel]');panel.dataset.featurePanel=key;
    var labels={work:['Roster_August.pdf','12 shifts detected','MON–THU','07:00–19:00'],train:['This week','3 sessions planned','TONIGHT','Full body · 42 min'],fuel:['Today’s target','2,360 kcal · 172g protein','DINNER','Recovery bowl · 38g'],recover:['Readiness input','Sleep + workload checked','TODAY','82 · Ready to train']};
    var v=labels[key]||labels.work;
    var sources=panel.querySelectorAll('.ww29Source');
    if(sources[0]){sources[0].querySelector('b').textContent=v[0];sources[0].querySelector('small').textContent=v[1]}
    var signals=panel.querySelectorAll('.ww29Signal');
    if(signals[0]){signals[0].querySelector('small').textContent=v[2];signals[0].querySelector('b').textContent=v[3]}
  }
  function worker(root,index){
    var cards=Array.from(root.querySelectorAll('[data-worker]'));if(!cards.length)return 0;
    index=(index+cards.length)%cards.length;
    cards.forEach(function(card,i){card.classList.toggle('active',i===index)});
    root.querySelectorAll('.ww29WorkerControls i').forEach(function(dot,i){dot.classList.toggle('active',i===index)});
    root.dataset.workerIndex=String(index);return index;
  }
  function auth(mode){if(A.openAccount)A.openAccount(mode)}
  function bind(root){
    root.querySelectorAll('[data-ww29]').forEach(function(button){button.onclick=function(){button.dataset.ww29==='top'?root.scrollTo({top:0,behavior:'smooth'}):auth(button.dataset.ww29==='signup'?'signup':'signin')}});
    root.querySelectorAll('a[href^="#ww29"]').forEach(function(link){link.onclick=function(event){var target=root.querySelector(link.getAttribute('href'));if(target){event.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'})}}});
    root.querySelectorAll('.ww29FilmSteps [data-scene]').forEach(function(button){button.onclick=function(){showScene(root,button.dataset.scene)}});
    root.querySelectorAll('.ww29Tabs [data-feature]').forEach(function(button){button.onclick=function(){showFeature(root,button.dataset.feature)}});
    root.querySelector('[data-worker-prev]').onclick=function(){worker(root,Number(root.dataset.workerIndex||0)-1)};
    root.querySelector('[data-worker-next]').onclick=function(){worker(root,Number(root.dataset.workerIndex||0)+1)};
    worker(root,0);
    var cinema=root.querySelector('.ww29Cinema');
    var workerStage=root.querySelector('.ww29WorkerStage');
    root.dataset.cinemaVisible='true';root.dataset.workerVisible='false';
    if('IntersectionObserver' in window){
      var visibilityObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){
        if(entry.target===cinema){
          root.dataset.cinemaVisible=String(entry.isIntersecting);
          cinema.querySelectorAll('video').forEach(function(video){
            if(!entry.isIntersecting)video.pause();else if(video.classList.contains('active'))video.play().catch(function(){});
          });
        }
        if(entry.target===workerStage)root.dataset.workerVisible=String(entry.isIntersecting);
      })},{root:null,rootMargin:'120px 0px',threshold:.01});
      if(cinema)visibilityObserver.observe(cinema);if(workerStage)visibilityObserver.observe(workerStage);
    }
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      var scenes=['work','train','fuel'],sceneIndex=0;
      window.setInterval(function(){if(!root.hidden&&root.dataset.cinemaVisible!=='false'){sceneIndex=(sceneIndex+1)%scenes.length;showScene(root,scenes[sceneIndex])}},6500);
      window.setInterval(function(){if(!root.hidden&&root.dataset.workerVisible!=='false')worker(root,Number(root.dataset.workerIndex||0)+1)},7200);
    }
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
