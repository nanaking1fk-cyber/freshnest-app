// Work + Workout v27 — the landing page.
// One module owns the whole signed-out experience. Replaces the interleaved
// landing-v18 markup + story-v19 DOM rewriting that preceded it.
//
// The page is a light ground and the product is the only dark object on it:
// the app is shown in a device rather than described in paragraphs.
(function wwLandingV27(window){
  'use strict';
  var A=window.WGC18=window.WGC18||{};
  var ID='wwLanding';
  var CTA='Get started free';

  function row(kind,time,title,note){
    return '<div class="wwRow '+kind+'">'+
      '<time>'+time+'</time><i class="wwTick"></i>'+
      '<span><b>'+title+'</b><small>'+note+'</small></span>'+
    '</div>';
  }
  function day(name,blocks){
    return '<div class="wwDay"><span class="code">'+name+'</span>'+blocks.map(function(b){
      return '<div class="wwBlk '+b[0]+'"><b>'+b[1]+'</b><time>'+b[2]+'</time></div>';
    }).join('')+'</div>';
  }
  function chip(kind,letter,value,note){
    return '<div class="wwChip '+kind+'"><i>'+letter+'</i><b>'+value+'</b><span>· '+note+'</span></div>';
  }
  function note(title,body){
    return '<div class="wwNote"><b>'+title+'</b><p>'+body+'</p></div>';
  }
  function cta(size){
    return '<button class="wwBtn'+(size?' lg':'')+'" data-ww="signup">'+CTA+'</button>';
  }

  function markup(){
    return '<div id="'+ID+'" hidden>'+

    '<div class="wwWash" aria-hidden="true"><i></i><i></i><i></i></div>'+

    '<header class="wwNav"><div class="wwNavIn">'+
      '<button class="wwMark" data-ww="top"><span class="wwGlyph">W</span><b>Work + Workout</b></button>'+
      '<nav class="wwNavLinks" aria-label="Landing">'+
        '<a href="#wwHow">How it works</a><a href="#wwWeek">Your week</a><a href="#wwPlan">Quick plan</a>'+
      '</nav>'+
      '<div class="wwNavRight">'+
        '<button class="wwQuiet" data-ww="signin">Sign in</button>'+cta()+
      '</div>'+
    '</div></header>'+

    '<main class="wwMain" id="wwTop">'+

    '<section class="wwHero"><div class="shell">'+
      '<h1>The shift planner that plans everything else too</h1>'+
      '<p class="wwHeroCopy">Tell it when you work. Your shifts, commute and sleep go in first — then '+
        'training, meals and recovery are placed in the hours that are actually left.</p>'+
      '<div class="wwHeroActs">'+cta(1)+'<a class="wwQuiet" href="#wwHow">See how it works →</a></div>'+
      '<p class="wwHeroNote">Free to start · No card · Works offline</p>'+
    '</div>'+
    '<div class="wwDeviceWrap"><div class="wwDevice"><div class="wwScreen" aria-label="An example planned day">'+
      '<div class="wwStatus"><span>9:41</span><span>▮▮▮</span></div>'+
      '<div class="wwScrTop"><p class="code">Thursday · on track</p><b>Your day is set</b></div>'+
      '<div class="wwRows">'+
        row('w','07:30','Day shift','8 hours · protected')+
        row('m','15:50','Packed lunch','42g protein')+
        row('t','16:20','Lower body','38 min · trimmed')+
        row('m','18:15','Dinner','Chicken, rice, greens')+
        row('r','22:40','Wind down','7h 20m before the alarm')+
      '</div>'+
      '<div class="wwScrFoot"><i class="wwDot"></i><span>Shift ran late. The session moved.</span></div>'+
      '<div class="wwScrNav"><span class="on">Today</span><span>Week</span><span>Train</span><span>Food</span></div>'+
    '</div></div></div></section>'+

    '<section class="wwPin shell" id="wwHow"><div class="wwPinGrid">'+
      '<div class="wwPinCol">'+
        chip('w','W','07:30–19:30','locked')+
        note('It starts from what can’t move.',
             'Shifts, commute, sleep and commitments go in first. Nothing gets scheduled over them.')+
        chip('r','R','7h 20m','sleep protected')+
      '</div>'+
      '<div class="wwSticky"><div class="wwDevice sm"><div class="wwScreen">'+
        '<div class="wwStatus"><span>17:04</span><span>▮▮▮</span></div>'+
        '<div class="wwScrTop"><p class="code">Shift ran 40 min late</p><b>Re-planned</b></div>'+
        '<div class="wwRows">'+
          row('t','17:20','Lower body','38 min instead of 52')+
          row('m','18:40','Dinner moved','Same targets')+
          row('r','22:40','Wind down','Unchanged')+
        '</div>'+
        '<div class="wwScrFoot"><i class="wwDot"></i><span>The week still works.</span></div>'+
      '</div></div></div>'+
      '<div class="wwPinCol">'+
        chip('t','T','38 min','trimmed to fit')+
        note('A bad day changes the session, not the goal.',
             'A late finish moves training into the window that survived. It doesn’t scrap the week and start again.')+
        chip('m','M','42g protein','still on target')+
      '</div>'+
    '</div></section>'+

    '<section class="wwSec shell"><div class="wwHead">'+
      '<p class="code">What it actually does</p><h2>Three jobs. Nothing else.</h2>'+
      '<p>Most fitness apps assume your day is empty and yours to fill. This one starts from the shift you cannot move.</p>'+
    '</div><div class="wwJobs">'+
      '<div class="wwJob w"><i></i><h3>Blocks what can’t move</h3><p>Shifts, commute, sleep and commitments go in first and stay put.</p></div>'+
      '<div class="wwJob t"><i></i><h3>Fills what’s left</h3><p>Training, meals and recovery are placed only in the hours that survive.</p></div>'+
      '<div class="wwJob r"><i></i><h3>Re-plans when the day breaks</h3><p>A late finish moves the session. It doesn’t scrap the week.</p></div>'+
    '</div></section>'+

    '<section class="wwSec shell" id="wwWeek"><div class="wwHead">'+
      '<p class="code">A real week</p><h2>Four twelves, one early, two off.</h2>'+
      '<p>The week a generic plan breaks on. Training lands where the week has room, not where a template says it should.</p>'+
    '</div><div class="wwBoard">'+
      day('Mon',[['w','Day shift','07:30–19:30'],['r','Steps only','Recovery']])+
      day('Tue',[['w','Day shift','07:30–19:30'],['r','Sleep debt','Protected']])+
      day('Wed',[['t','Full body','09:00–09:50'],['m','Meal prep','16:00']])+
      day('Thu',[['w','Day shift','07:30–15:30'],['t','Lower body','16:20–17:00']])+
      day('Fri',[['w','Early','06:00–14:00'],['t','Upper body','15:10–16:00']])+
      day('Sat',[['r','Off','No session'],['m','Eating out','Budgeted']])+
      day('Sun',[['t','Full body','10:00–10:55'],['m','Prep for Monday','15:00']])+
    '</div>'+
    '<div class="wwLegend code">'+
      '<span><i style="background:var(--work)"></i>Work</span>'+
      '<span><i style="background:var(--train)"></i>Training</span>'+
      '<span><i style="background:var(--meal)"></i>Food</span>'+
      '<span><i style="background:var(--rest)"></i>Recovery</span>'+
    '</div></section>'+

    '<section class="wwSec shell" id="wwPlan"><div class="wwHead">'+
      '<p class="code">Quick plan</p><h2>Type your week the way you’d say it.</h2>'+
      '<p>No forms. Paste your roster, your appointments, your errands — then review everything before a single thing is saved.</p>'+
    '</div><div class="wwJobs wwCap">'+
      '<div class="wwJob wwPasteCard"><p class="code">You type</p>'+
        '<pre>work mon–thu 7:30 to 7:30\ndentist tuesday 10am\npick up Amara tuesday 4pm\nmeal prep sunday at 3</pre>'+
      '</div>'+
      '<div class="wwJob wwParsed">'+
        '<div class="wwParsedTop"><p class="code">It finds · you confirm</p></div>'+
        '<div class="wwRows">'+
          row('w','Mon–Thu','Work','07:30–19:30 · weekly')+
          row('r','Tue 10:00','Dentist','Reminder 30 min before')+
          row('r','Tue 16:00','Pick up Amara','Blocks the window')+
          row('m','Sun 15:00','Meal prep','Two hours held')+
        '</div>'+
      '</div>'+
    '</div></section>'+

    '<div class="shell"><section class="wwClose"><div class="wwCloseIn">'+
      '<p class="code">Built for the shift you’re already working</p>'+
      '<h2>Start with one question.</h2>'+
      '<p>Answer what you do for work, and the first plan is ready in under a minute.</p>'+
      cta(1)+
    '</div></section></div>'+

    '<footer class="wwFoot">'+
      '<span class="code">Work + Workout · 2026</span>'+
      '<a href="./privacy.html">Privacy</a>'+
      '<a href="./terms.html">Terms</a>'+
      '<a href="./support.html">Support</a>'+
      '<button data-ww="signin">Sign in</button>'+
    '</footer>'+

    '</main></div>';
  }

  function el(){return document.getElementById(ID)}
  function shouldShow(){return !A.session}

  function show(){
    var node=el();
    if(!node)return;
    document.querySelectorAll('.modal.open').forEach(function(m){window.closeModal&&window.closeModal(m.id)});
    node.hidden=false;
    document.body.classList.add('landingActive');
    node.scrollTop=0;
  }
  function hide(){
    var node=el();
    if(node)node.hidden=true;
    document.body.classList.remove('landingActive');
  }

  function bind(node){
    node.querySelectorAll('[data-ww]').forEach(function(btn){
      btn.onclick=function(){
        var what=btn.dataset.ww;
        if(what==='top'){node.scrollTop=0;return}
        if(A.openAccount)A.openAccount(what==='signup'?'signup':'signin');
      };
    });
    node.querySelectorAll('.wwNavLinks a, a[href^="#ww"]').forEach(function(link){
      link.onclick=function(event){
        var target=document.getElementById(link.getAttribute('href').slice(1));
        if(!target)return;
        event.preventDefault();
        target.scrollIntoView({behavior:'smooth',block:'start'});
      };
    });
  }

  function mount(){
    if(!el()){
      document.body.insertAdjacentHTML('beforeend',markup());
      bind(el());
    }
    if(shouldShow())show();else hide();
  }

  mount();
  window.addEventListener('wgc:authchange',function(event){
    if(event.detail&&event.detail.signedIn)hide();else if(shouldShow())show();
  });
  window.addEventListener('wgc:profile-ready',hide);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})(window);
