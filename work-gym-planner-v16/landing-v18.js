// Work + Workout 18.3 premium landing experience and editorial app visuals.
(function premiumLanding(){
  const A=window.WGC18=window.WGC18||{};
  const safe=window.esc||function(value){return String(value??'').replace(/[&<>"']/g,function(char){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]})};
  const featureCopy={
    plan:{
      eyebrow:'YOUR WEEK, COORDINATED',
      title:'A schedule that makes room for progress.',
      copy:'Work shifts, commute, commitments and sleep are protected first. Training moves into the windows that can actually survive your week.',
      visual:'<div class="landingWeek">'+
        '<div><span>MON</span><i class="work">Work</i><i class="train">Upper</i></div>'+
        '<div><span>TUE</span><i class="work">Work</i><i class="recover">Recover</i></div>'+
        '<div><span>WED</span><i class="work">Work</i><i class="train">Lower</i></div>'+
        '<div><span>THU</span><i class="work">Work</i><i class="recover">Mobility</i></div>'+
        '<div><span>FRI</span><i class="work">Work</i><i class="train">Full body</i></div>'+
        '<div><span>SAT</span><i class="free">Open</i><i class="walk">Steps</i></div>'+
        '<div><span>SUN</span><i class="free">Reset</i><i class="prep">Plan</i></div>'+
      '</div>'
    },
    train:{
      eyebrow:'TRAIN WITH INTENT',
      title:'Know what to do—and when to push.',
      copy:'Schedule-aware sessions, equipment alternatives, RIR guidance and training history turn the next workout into a clear decision.',
      visual:'<div class="landingWorkout">'+
        '<div class="landingWorkoutTop"><span>UPPER STRENGTH</span><b>48 min</b></div>'+
        '<div class="landingExercise"><i>01</i><span><b>Incline press</b><small>3 sets · 6–8 reps · RIR 2</small></span><strong>Ready</strong></div>'+
        '<div class="landingExercise"><i>02</i><span><b>Chest-supported row</b><small>3 sets · 8–10 reps · RIR 2</small></span><strong>Next</strong></div>'+
        '<div class="landingExercise"><i>03</i><span><b>Machine shoulder press</b><small>2 sets · 10–12 reps · RIR 3</small></span><strong>Later</strong></div>'+
      '</div>'
    },
    eat:{
      eyebrow:'EAT LIKE YOURSELF',
      title:'Nutrition built from familiar food.',
      copy:'Set realistic energy and protein targets, log meals quickly, and get ideas that respect your culture, budget, schedule and cooking time.',
      visual:'<div class="landingNutrition">'+
        '<div class="landingNutritionRing"><span><b>72%</b><small>today</small></span></div>'+
        '<div class="landingMacroList"><p><span>Protein</span><b>126 / 165g</b></p><i><b style="width:76%"></b></i><p><span>Energy</span><b>1,720 / 2,350</b></p><i><b style="width:73%"></b></i><p><span>Fiber</span><b>22 / 30g</b></p><i><b style="width:73%"></b></i></div>'+
      '</div>'
    },
    recover:{
      eyebrow:'RECOVER ON PURPOSE',
      title:'A plan that knows when life is heavy.',
      copy:'Sleep, work load, steps and completed sessions shape readiness so a difficult day becomes a smarter recommendation—not a failed plan.',
      visual:'<div class="landingRecovery">'+
        '<div class="landingRecoveryRing"><span><b>84%</b><small>Ready</small></span></div>'+
        '<div><h4>Strong day to train</h4><p>Your sleep target is on track and today has one work shift.</p><div class="landingRecoveryMetrics"><span><b>7.8h</b><small>Sleep</small></span><span><b>1 job</b><small>Workload</small></span><span><b>Upper</b><small>Session</small></span></div></div>'+
      '</div>'
    }
  };

  function brandMark(){
    return '<span class="landingBrandMark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 11v10M9 8v16m4-8h6m0-8v16m4-13v10m4-7v4M9 16h14"/><path d="m11 24 4-4 3 3 5-7"/></svg></span>';
  }
  function landingMarkup(){
    return '<div id="premiumLanding" class="premiumLanding" hidden>'+
      '<header class="landingNav">'+
        '<a class="landingBrand" href="#landingTop">'+brandMark()+'<span><b>WORK + WORKOUT</b><small>ADAPTIVE COACH</small></span></a>'+
        '<nav aria-label="Landing page">'+
          '<a href="#landingFeatures">Features</a><a href="#landingHow">How it works</a><a href="#landingPrivacy">Privacy</a>'+
        '</nav>'+
        '<div class="landingNavActions"><button data-landing-auth="signin">Sign in</button><button class="landingPrimary" data-landing-auth="signup">Create your plan</button></div>'+
      '</header>'+
      '<main id="landingTop">'+
        '<section class="landingHero">'+
          '<div class="landingHeroImage"><img src="../work-gym-planner-v16/assets/landing-hero-v18-web.jpg" alt="A professional balancing focused work and strength training in a calm home environment"></div>'+
          '<div class="landingHeroShade"></div>'+
          '<div class="landingHeroCopy">'+
            '<div class="landingPill"><i></i> One intelligent plan for real life</div>'+
            '<h1>Work hard.<br><em>Train intelligently.</em></h1>'+
            '<p>Work + Workout coordinates your schedule, training, nutrition and recovery—then adapts the plan when your week changes.</p>'+
            '<div class="landingHeroActions"><button class="landingPrimary landingLarge" data-landing-auth="signup">Build my plan <span>→</span></button><button class="landingGhost landingLarge" data-landing-scroll="landingHow">See the walkthrough</button></div>'+
            '<div class="landingHeroProof"><span><b>Schedule-aware</b><small>Built around shifts and commute</small></span><span><b>Adaptive</b><small>Responds to recovery and progress</small></span><span><b>Personal</b><small>Uses food and training you know</small></span></div>'+
          '</div>'+
          '<div class="landingFloatingCard landingFloatSchedule"><span>TODAY · 6:15 PM</span><b>Upper Strength</b><small>Best window after work · 52 min</small><i><b style="width:82%"></b></i></div>'+
          '<div class="landingFloatingCard landingFloatReady"><div class="landingMiniRing"><b>84</b></div><span><b>Ready to train</b><small>Sleep and workload look good</small></span></div>'+
        '</section>'+

        '<section class="landingSignal" aria-label="Product benefits">'+
          '<p>Designed for demanding weeks</p>'+
          '<div><span>SHIFT WORK</span><i></i><span>STRENGTH</span><i></i><span>NUTRITION</span><i></i><span>RECOVERY</span><i></i><span>AI COACHING</span></div>'+
        '</section>'+

        '<section id="landingFeatures" class="landingSection landingFeatureSection">'+
          '<div class="landingSectionHead"><p>ONE CONNECTED SYSTEM</p><h2>Your day makes more sense when every part talks to the others.</h2><span>Explore the product</span></div>'+
          '<div class="landingFeatureTabs" role="tablist" aria-label="Product features">'+
            '<button class="active" role="tab" aria-selected="true" data-feature="plan">Plan</button>'+
            '<button role="tab" aria-selected="false" data-feature="train">Train</button>'+
            '<button role="tab" aria-selected="false" data-feature="eat">Eat</button>'+
            '<button role="tab" aria-selected="false" data-feature="recover">Recover</button>'+
          '</div>'+
          '<div class="landingFeatureStage">'+
            '<div class="landingFeatureCopy"><p id="landingFeatureEyebrow"></p><h3 id="landingFeatureTitle"></h3><div id="landingFeatureCopy"></div><ul><li>Personalized from your answers</li><li>Easy to revise as life changes</li><li>Clear next actions, not information overload</li></ul></div>'+
            '<div id="landingFeatureVisual" class="landingFeatureVisual" aria-live="polite"></div>'+
          '</div>'+
        '</section>'+

        '<section class="landingEditorial">'+
          '<div class="landingEditorialImage"><img src="../work-gym-planner-v16/assets/whole-day-system-v18-web.jpg" alt="Healthy food, a weekly planner, smartwatch and training equipment arranged for a balanced day"></div>'+
          '<div class="landingEditorialCopy"><p>WHOLE-DAY COACHING</p><h2>Not another workout list. A system for the person doing the work.</h2><div class="landingEditorialPoints"><article><span>01</span><div><h3>Protect the non-negotiables</h3><p>Sleep, work, commute and personal commitments become real boundaries.</p></div></article><article><span>02</span><div><h3>Choose the strongest opening</h3><p>Training goes where your time and recovery support it.</p></div></article><article><span>03</span><div><h3>Learn from what happened</h3><p>Logs and trends make tomorrow’s recommendation more useful.</p></div></article></div></div>'+
        '</section>'+

        '<section id="landingHow" class="landingSection landingHow">'+
          '<div class="landingSectionHead"><p>A PREMIUM WALKTHROUGH</p><h2>From a busy calendar to a plan you can trust.</h2><span>Three calm steps</span></div>'+
          '<div class="landingHowGrid">'+
            '<article><div class="landingStepVisual"><span class="landingStepNumber">01</span><div class="landingConversation"><p>What are we working toward?</p><div><i>↗</i><span><b>Body recomposition</b><small>Build strength while gradually leaning out</small></span></div></div></div><h3>Answer one clear question</h3><p>Setup feels like a conversation. The next question adapts to your last answer.</p></article>'+
            '<article><div class="landingStepVisual"><span class="landingStepNumber">02</span><div class="landingTimeline"><i></i><span class="work">Work · 9–5</span><span class="train">Train · 6:15</span><span class="sleep">Sleep · 11:00</span></div></div><h3>Let the week assemble itself</h3><p>The engine protects real commitments before it chooses workout windows.</p></article>'+
            '<article><div class="landingStepVisual"><span class="landingStepNumber">03</span><div class="landingCoachBubble"><span>✦</span><p><b>Today’s adjustment</b>Your sleep was shorter than planned. Keep the session, reduce one accessory set, and finish on time.</p></div></div><h3>Adapt without starting over</h3><p>A hard day changes the recommendation—not the goal.</p></article>'+
          '</div>'+
          '<div class="landingCenterAction"><button class="landingPrimary landingLarge" data-landing-auth="signup">Start the guided setup <span>→</span></button><small>No long profile form. Your answers save as you go.</small></div>'+
        '</section>'+

        '<section id="landingPrivacy" class="landingTrust">'+
          '<div><p>BUILT WITH TRUST IN MIND</p><h2>Your health routine is personal. Your account should be, too.</h2><span>Account data is isolated per user, synced through authenticated requests, and recoverable across your devices.</span></div>'+
          '<div class="landingTrustGrid"><article><span>'+((A.premiumIcons||{}).shield||'✓')+'</span><h3>Private by design</h3><p>Each account can access only its own cloud planner state.</p></article><article><span>'+((A.premiumIcons||{}).cloud||'↥')+'</span><h3>Portable</h3><p>Sign in on another device and restore your schedule and history.</p></article><article><span>'+((A.premiumIcons||{}).sparkle||'✦')+'</span><h3>AI with context</h3><p>Coaching uses the plan you provide instead of generic assumptions.</p></article></div>'+
        '</section>'+

        '<section class="landingFaq landingSection">'+
          '<div class="landingSectionHead"><p>GOOD TO KNOW</p><h2>A few practical answers.</h2></div>'+
          '<div class="landingFaqGrid">'+
            '<details open><summary>Does it work for shift schedules?</summary><p>Yes. Add usual work days and hours during setup, then review changing dates in the calendar.</p></details>'+
            '<details><summary>Can I change the plan later?</summary><p>Yes. Reopen Personalized plan & profile to update answers through the same guided experience.</p></details>'+
            '<details><summary>Do I need a full gym?</summary><p>No. Choose commercial gym, basic gym, or home/minimal equipment and the plan adapts its exercise options.</p></details>'+
            '<details><summary>Will it tell me exactly what to eat?</summary><p>It starts with energy and protein targets and uses familiar foods, cuisines, restrictions, budget, and cooking time to shape practical ideas.</p></details>'+
          '</div>'+
        '</section>'+

        '<section class="landingFinalCta">'+
          '<div><p>YOUR WEEK IS ALREADY FULL.</p><h2>Make the plan fit anyway.</h2><span>Start with one question. Finish with a coordinated training and nutrition plan.</span></div>'+
          '<button class="landingPrimary landingLarge" data-landing-auth="signup">Create your account <span>→</span></button>'+
        '</section>'+
      '</main>'+
      '<footer class="landingFooter"><div class="landingBrand">'+brandMark()+'<span><b>WORK + WORKOUT</b><small>ADAPTIVE COACH</small></span></div><p>Schedule-aware training, nutrition and recovery for real life.</p><div><button data-landing-auth="signin">Sign in</button><span>© '+new Date().getFullYear()+' Work + Workout</span></div></footer>'+
    '</div>';
  }
  function shouldShow(){return!(typeof profile==='function'&&profile())&&!A.session}
  function closeBackgroundModals(){document.querySelectorAll('.modal.open').forEach(function(modal){window.closeModal?.(modal.id)})}
  function showLanding(){
    const landing=document.getElementById('premiumLanding');
    if(!landing)return;
    closeBackgroundModals();
    landing.hidden=false;
    document.body.classList.add('landingActive');
    landing.scrollTop=0;
  }
  function hideLanding(){
    const landing=document.getElementById('premiumLanding');
    if(landing)landing.hidden=true;
    document.body.classList.remove('landingActive');
  }
  function openAuth(mode){
    A.openAccount?.(mode);
  }
  function activateFeature(name){
    const data=featureCopy[name]||featureCopy.plan;
    document.querySelectorAll('[data-feature]').forEach(function(tab){
      const active=tab.dataset.feature===name;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',String(active));
    });
    document.getElementById('landingFeatureEyebrow').textContent=data.eyebrow;
    document.getElementById('landingFeatureTitle').textContent=data.title;
    document.getElementById('landingFeatureCopy').textContent=data.copy;
    const visual=document.getElementById('landingFeatureVisual');
    visual.innerHTML=data.visual;
    visual.dataset.feature=name;
  }
  function bindLanding(){
    document.querySelectorAll('[data-landing-auth]').forEach(function(button){button.onclick=function(){openAuth(button.dataset.landingAuth)}});
    document.querySelectorAll('[data-landing-scroll]').forEach(function(button){button.onclick=function(){document.getElementById(button.dataset.landingScroll)?.scrollIntoView({behavior:'smooth'})}});
    document.querySelectorAll('[data-feature]').forEach(function(button){button.onclick=function(){activateFeature(button.dataset.feature)}});
    activateFeature('plan');
  }
  function mount(){
    if(!document.getElementById('premiumLanding')){
      document.body.insertAdjacentHTML('beforeend',landingMarkup());
      bindLanding();
    }
    if(shouldShow())showLanding();else hideLanding();
  }
  function addInAppVisual(){
    const grid=document.querySelector('.homeSummaryGrid');
    if(!grid||document.getElementById('premiumDayVisual'))return;
    const card=document.createElement('section');
    card.id='premiumDayVisual';
    card.className='premiumDayVisual';
    const p=typeof profile==='function'?profile():null;
    card.innerHTML=
      '<img src="../work-gym-planner-v16/assets/whole-day-system-v18-web.jpg" alt="A visual of balanced planning, training and nutrition">'+
      '<div class="premiumDayVisualShade"></div>'+
      '<div class="premiumDayVisualCopy"><p>YOUR WHOLE DAY</p><h2>'+safe(p?.name?personGreeting(p.name):'Plan the whole person.')+'</h2><span>Training, nutrition and recovery stay connected to the schedule you actually live.</span><div><button id="premiumVisualTraining">Open training</button><button id="premiumVisualNutrition">Add a meal</button></div></div>';
    grid.insertAdjacentElement('afterend',card);
    document.getElementById('premiumVisualTraining').onclick=function(){window.page?.('training')};
    document.getElementById('premiumVisualNutrition').onclick=function(){window.page?.('diary')};
  }
  function personGreeting(name){
    const hour=new Date().getHours();
    return(hour<12?'Own the morning, ':hour<18?'Keep the day moving, ':'Finish the day well, ')+name+'.';
  }
  function keepEnhanced(){
    if(typeof profile==='function'&&profile())addInAppVisual();
  }

  mount();
  keepEnhanced();
  window.addEventListener('wgc:authchange',function(event){if(event.detail?.signedIn)hideLanding();else if(shouldShow())showLanding()});
  window.addEventListener('wgc:profile-ready',function(){hideLanding();setTimeout(keepEnhanced,80)});
  new MutationObserver(keepEnhanced).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',function(){mount();keepEnhanced()},{once:true});
})();
