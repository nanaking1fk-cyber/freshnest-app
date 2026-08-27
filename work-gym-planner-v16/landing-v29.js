// Work + Workout v29 — cinematic, product-first landing experience.
(function workWorkoutLandingV29(window){
  'use strict';
  var A=window.WGC18=window.WGC18||{};
  var ID='wwLanding';
  var ASSET='../work-gym-planner-v16/assets/';

  function cta(label,extra){
    return '<button class="ww29Button'+(extra?' '+extra:'')+'" data-ww29="signup">'+(label||'Build my plan')+'<span aria-hidden="true">↗</span></button>';
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
        '<button class="ww29Brand" data-ww29="top" aria-label="Work + Workout home"><span>W<span>+</span>W</span><b>Work + Workout</b></button>'+
        '<nav aria-label="Landing page"><a href="#ww29System">How it adapts</a><a href="#ww29Day">The full day</a><a href="#ww29Workers">Built for work</a></nav>'+
        '<div class="ww29NavActions"><button class="ww29SignIn" data-ww29="signin">Sign in</button>'+cta('Start free','small')+'</div>'+
      '</div></header>'+

      '<main class="ww29Main">'+
        '<section class="ww29Hero">'+
          '<div class="ww29HeroCopy">'+
            '<p class="ww29Eyebrow"><span></span>The adaptive health planner for working lives</p>'+
            '<h1>Your shift is fixed.<br><em>Your health plan shouldn’t be.</em></h1>'+
            '<p class="ww29Lead">Work goes in first. Then Work + Workout finds the real openings for training, meals, recovery, and everything else your day needs.</p>'+
            '<div class="ww29HeroActions">'+cta('Build my plan')+'<a href="#ww29Day">See a day in motion <span>↓</span></a></div>'+
            '<div class="ww29Trust"><span>No card required</span><span>Review before saving</span><span>Your own private plan</span></div>'+
          '</div>'+

          '<div class="ww29Cinema" aria-label="A day planned with Work + Workout">'+
            '<div class="ww29Film" data-scene="work">'+
              '<video class="active" data-film="work" muted autoplay loop playsinline preload="metadata" poster="'+ASSET+'story-logistics-v22.jpg"><source src="'+ASSET+'story-phone-work-v21.mp4" type="video/mp4"></video>'+
              '<video data-film="train" muted loop playsinline preload="metadata"><source src="'+ASSET+'story-phone-gym-v21.mp4" type="video/mp4"></video>'+
              '<video data-film="fuel" muted loop playsinline preload="metadata"><source src="'+ASSET+'story-phone-meal-v21.mp4" type="video/mp4"></video>'+
              '<div class="ww29FilmShade"></div>'+
              '<div class="ww29FilmTop"><span>Thursday</span><b>Plan active</b></div>'+
              '<div class="ww29FilmCaption"><p data-scene-label>07:00 · Work protected</p><h2 data-scene-title>The plan already knows the day.</h2></div>'+
              '<div class="ww29FilmSteps" role="tablist" aria-label="Day scenes">'+
                '<button class="active" data-scene="work" role="tab"><i></i><span>Work</span></button>'+
                '<button data-scene="train" role="tab"><i></i><span>Train</span></button>'+
                '<button data-scene="fuel" role="tab"><i></i><span>Fuel</span></button>'+
              '</div>'+
            '</div>'+
            '<div class="ww29LiveCard">'+
              '<div class="ww29LiveHead"><span><i></i>Live plan</span><em>Adjusted 2m ago</em></div>'+
              timeline('work','07:00','Hospital shift','Protected until 19:00')+
              timeline('train','19:45','Strength · 42 min','Moved after late handoff')+
              timeline('fuel','21:00','Recovery dinner','38g protein · ready')+
              '<p class="ww29Adapt"><b>Plan adapted.</b> Sleep target remains protected.</p>'+
            '</div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Proof" aria-label="Product principles"><div><b>01</b><span><strong>Shift first</strong><small>The immovable parts lead.</small></span></div><div><b>02</b><span><strong>Nothing saved silently</strong><small>You approve what the app finds.</small></span></div><div><b>03</b><span><strong>One connected day</strong><small>Work, training, food, recovery.</small></span></div></section>'+

        '<section class="ww29Section ww29System" id="ww29System">'+
          '<div class="ww29SectionHead"><p class="ww29Kicker">One system · four signals</p><h2>Your life isn’t split into apps.<br>Why should your plan be?</h2><p>Every recommendation sees the same day, so a longer shift can change tonight’s workout, meal timing, and recovery target together.</p></div>'+
          '<div class="ww29Tabs" role="tablist" aria-label="Connected planning features">'+
            '<button class="active" data-feature="work"><span>01</span>Work</button><button data-feature="train"><span>02</span>Train</button><button data-feature="fuel"><span>03</span>Fuel</button><button data-feature="recover"><span>04</span>Recover</button>'+
          '</div>'+
          '<div class="ww29FeatureStage">'+
            '<div class="ww29FeatureCopy">'+
              '<p class="ww29Kicker" data-feature-kicker>Work signal</p><h3 data-feature-title>Bring the roster. Leave the forms.</h3><p data-feature-copy>Upload a photo or PDF, paste raw text, or describe your rotation. Every detected shift is shown with confidence and conflicts before it reaches your calendar.</p>'+cta('Plan around my work','dark')+
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
          '<div class="ww29DayCopy"><p class="ww29Kicker">A full day, not a fitness fantasy</p><h2>Built around the hours you actually have.</h2><p>Before work, between shifts, or after the kids are asleep—the plan protects what matters and uses what remains.</p></div>'+
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
            '<div class="ww29CoachNote"><span>✦</span><p><b>Progressive Coach</b>Your handoff ran 25 minutes late, so I trimmed accessory work—not the strength progression.</p><button>Why?</button></div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Section ww29Capture">'+
          '<div class="ww29SectionHead"><p class="ww29Kicker">Effortless utility planner</p><h2>Give it the messy version.<br>Get back a clear week.</h2></div>'+
          '<div class="ww29CaptureGrid">'+
            '<div class="ww29Raw"><div class="ww29RawTop"><span>Quick plan</span><em>Paste · speak · upload</em></div><p>Work Monday–Thursday 7 AM–7 PM. Dentist Tuesday at 2. Buy groceries before Friday. Gym three times this week.</p><div><button>＋ Photo or PDF</button><button>⌁ Voice</button><button class="send">↑</button></div></div>'+
            '<div class="ww29Arrow" aria-hidden="true">→</div>'+
            '<div class="ww29Proposal"><div class="ww29ProposalTop"><span>Proposed week</span><em>Nothing saved yet</em></div>'+signal('work','4 SHIFTS','Mon–Thu · 07:00','48 hours total')+signal('life','1 CONFLICT','Dentist · Tue 14:00','Choose a resolution')+signal('train','3 SESSIONS','Wed · Fri · Sun','Placed in free time')+signal('fuel','1 TASK','Groceries · Thu 19:45','Reminder set')+'<button class="ww29Confirm">Review and confirm</button></div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Workers" id="ww29Workers">'+
          '<div class="ww29SectionHead"><p class="ww29Kicker">Every working rhythm</p><h2>The job changes.<br>The promise doesn’t.</h2><p>The app adapts to the person behind the uniform—from twelve-hour clinical shifts to rotating nights and early starts.</p></div>'+
          '<div class="ww29WorkerStage">'+
            '<article class="active" data-worker="0"><img src="'+ASSET+'story-nurse-v19.jpg" alt="Healthcare worker in scrubs checking her phone"><div><small>Healthcare</small><h3>Protect the person<br>inside the scrubs.</h3><p>Recovery and meals shaped around twelve-hour care.</p></div></article>'+
            '<article data-worker="1"><img src="'+ASSET+'story-road-worker-v19.jpg" alt="Road construction worker during a shift"><div><small>Construction</small><h3>Strength for the work<br>and life after it.</h3><p>Training scaled to physically demanding days.</p></div></article>'+
            '<article data-worker="2"><img src="'+ASSET+'story-logistics-v22.jpg" alt="Logistics worker using a phone"><div><small>Logistics</small><h3>Rotating hours.<br>One steady system.</h3><p>A plan that follows the roster as it changes.</p></div></article>'+
            '<article data-worker="3"><img src="'+ASSET+'story-chef-v19.jpg" alt="Chef working in a professional kitchen"><div><small>Hospitality</small><h3>When everyone else eats,<br>your plan still works.</h3><p>Meal timing and training built around service.</p></div></article>'+
            '<div class="ww29WorkerControls"><button data-worker-prev aria-label="Previous worker">←</button><span><i></i><i></i><i></i><i></i></span><button data-worker-next aria-label="Next worker">→</button></div>'+
          '</div>'+
        '</section>'+

        '<section class="ww29Close"><div><p class="ww29Kicker">Your work already has a plan</p><h2>Now your health does too.</h2><p>Start with your schedule. Review the week Work + Workout creates. Keep adapting from there.</p>'+cta('Build my first week')+'<button class="ww29SignIn closeSign" data-ww29="signin">Already have an account? Sign in</button></div></section>'+

        '<footer class="ww29Footer"><div class="ww29Brand"><span>W<span>+</span>W</span><b>Work + Workout</b></div><p>Health that works around your work.</p><nav><a href="./privacy.html">Privacy</a><a href="./terms.html">Terms</a><a href="./support.html">Support</a></nav><small>© 2026 Work + Workout</small></footer>'+
      '</main>'+
    '</div>';
  }

  var featureContent={
    work:{kicker:'Work signal',title:'Bring the roster. Leave the forms.',copy:'Upload a photo or PDF, paste raw text, or describe your rotation. Every detected shift is shown with confidence and conflicts before it reaches your calendar.'},
    train:{kicker:'Training signal',title:'Progressive training that knows your load.',copy:'The plan progresses your lifts, then adjusts the session when work, sleep, or time changes—without losing the goal of the week.'},
    fuel:{kicker:'Fuel signal',title:'Meals that fit the shift—not an ideal day.',copy:'Get calorie and protein targets, familiar-food ideas, and meal timing that works around breaks, commutes, and late finishes.'},
    recover:{kicker:'Recovery signal',title:'Protect tomorrow while planning today.',copy:'Sleep, fatigue, workload, and completed training shape the next recommendation so hard days do not quietly become burnout.'}
  };
  var sceneContent={
    work:['07:00 · Work protected','The plan already knows the day.'],
    train:['19:45 · Workout adapted','Progress continues—even when work runs late.'],
    fuel:['21:00 · Recovery meal','The right target at a realistic time.']
  };

  function showScene(root,key){
    root.querySelectorAll('[data-film]').forEach(function(video){
      var on=video.dataset.film===key;video.classList.toggle('active',on);
      if(on&&video.paused)video.play().catch(function(){});else if(!on)video.pause();
    });
    root.querySelectorAll('.ww29FilmSteps [data-scene]').forEach(function(button){button.classList.toggle('active',button.dataset.scene===key)});
    var content=sceneContent[key];root.querySelector('[data-scene-label]').textContent=content[0];root.querySelector('[data-scene-title]').textContent=content[1];
  }
  function showFeature(root,key){
    var content=featureContent[key]||featureContent.work;
    root.querySelectorAll('.ww29Tabs [data-feature]').forEach(function(button){button.classList.toggle('active',button.dataset.feature===key)});
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
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      var scenes=['work','train','fuel'],sceneIndex=0;
      window.setInterval(function(){if(!root.hidden){sceneIndex=(sceneIndex+1)%scenes.length;showScene(root,scenes[sceneIndex])}},6500);
      window.setInterval(function(){if(!root.hidden)worker(root,Number(root.dataset.workerIndex||0)+1)},7200);
    }
  }
  function shouldShow(){return !A.session}
  function show(){var root=document.getElementById(ID);if(!root)return;document.querySelectorAll('.modal.open').forEach(function(modal){window.closeModal&&window.closeModal(modal.id)});root.hidden=false;document.body.classList.add('landingActive','premiumV29');root.scrollTop=0}
  function hide(){var root=document.getElementById(ID);if(root)root.hidden=true;document.body.classList.remove('landingActive')}
  function mount(){var root=document.getElementById(ID);if(!root){document.body.insertAdjacentHTML('beforeend',markup());root=document.getElementById(ID);bind(root)}if(shouldShow())show();else hide()}

  mount();
  window.addEventListener('wgc:authchange',function(event){if(event.detail&&event.detail.signedIn)hide();else if(shouldShow())show()});
  window.addEventListener('wgc:profile-ready',hide);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})(window);
