// Work + Workout v27 — the landing page.
// One module owns the whole signed-out experience. Replaces the interleaved
// landing-v18 markup + story-v19 DOM rewriting that preceded it.
(function wwLandingV27(window){
  'use strict';
  var A=window.WGC18=window.WGC18||{};
  var ID='wwLanding';

  function row(kind,time,title,note,flag){
    return '<div class="wwRow '+kind+'">'+
      '<time>'+time+'</time><i class="wwTick"></i>'+
      '<span class="wwWhat"><b>'+title+'</b><small>'+note+'</small></span>'+
      '<span class="wwFlag">'+flag+'</span>'+
    '</div>';
  }
  function day(name,blocks){
    return '<div class="wwDay"><span class="code">'+name+'</span>'+blocks.map(function(b){
      return '<div class="wwBlk '+b[0]+'"><b>'+b[1]+'</b><time>'+b[2]+'</time></div>';
    }).join('')+'</div>';
  }

  function markup(){
    return '<div id="'+ID+'" hidden>'+

    '<header class="wwNav"><div class="wwNavIn">'+
      '<button class="wwMark" data-ww="top"><b>Work + Workout</b><span>Shift-aware</span></button>'+
      '<nav class="wwNavLinks" aria-label="Landing">'+
        '<a href="#wwHow">How it works</a><a href="#wwWeek">Your week</a><a href="#wwPlan">Quick plan</a>'+
      '</nav>'+
      '<div class="wwNavRight">'+
        '<button class="wwQuiet" data-ww="signin">Sign in</button>'+
        '<button class="wwBtn" data-ww="signup">Create your plan</button>'+
      '</div>'+
    '</div></header>'+

    '<main id="wwTop">'+

    '<section class="wwHero"><div class="shell wwHeroGrid">'+
      '<div>'+
        '<p class="code live">● Shift-aware planning</p>'+
        '<h1>Your week already has a shape.<br><em>We plan around it.</em></h1>'+
        '<p class="wwHeroCopy">Tell it when you work. It protects your shifts, your commute and your sleep first — then puts training, meals and recovery in the hours that are actually left.</p>'+
        '<div class="wwHeroActs">'+
          '<button class="wwBtn lg" data-ww="signup">Create your plan</button>'+
          '<a class="wwQuiet" href="#wwHow">See how it works</a>'+
        '</div>'+
        '<p class="wwHeroNote">Free to start · No card · Works offline</p>'+
      '</div>'+
      '<div class="wwRoster" aria-label="An example planned day">'+
        '<div class="wwRosterTop"><b>A day that already worked</b><span class="code">Example</span></div>'+
        '<div class="wwRows">'+
          row('w','07:30–15:30','Day shift','8 hours · commute both ways','Protected')+
          row('m','15:50','Packed lunch','42g protein','On target')+
          row('t','16:20–17:00','Lower body','38 min · trimmed for the commute','Adjusted')+
          row('m','18:15','Dinner','Chicken, rice, greens','Planned')+
          row('r','22:40','Wind down','7h 20m before the alarm','Protected')+
        '</div>'+
        '<div class="wwRosterFoot"><i class="wwDot"></i>'+
          '<span>The shift ran 40 minutes late. The session moved, the day held.</span></div>'+
      '</div>'+
    '</div></section>'+

    '<section class="wwSec" id="wwHow"><div class="shell">'+
      '<div class="wwHead">'+
        '<div><p class="code">What it actually does</p><h2>Three jobs. Nothing else.</h2></div>'+
        '<p>Most fitness apps assume your day is empty and yours to fill. This one starts from the shift you cannot move.</p>'+
      '</div>'+
      '<div class="wwJobs">'+
        '<div><p class="code">01</p><h3>Blocks what can’t move</h3><p>Shifts, commute, sleep and commitments go in first and stay put.</p></div>'+
        '<div><p class="code">02</p><h3>Fills what’s left</h3><p>Training, meals and recovery are placed only in the hours that survive.</p></div>'+
        '<div><p class="code">03</p><h3>Re-plans when the day breaks</h3><p>A late finish moves the session. It doesn’t scrap the week.</p></div>'+
      '</div>'+
      '<div class="wwProof">'+
        '<span><b>2–4</b><small>sessions a week, not six</small></span>'+
        '<span><b>&lt;60s</b><small>to a first plan</small></span>'+
        '<span><b>0</b><small>meals you’ve never heard of</small></span>'+
      '</div>'+
    '</div></section>'+

    '<section class="wwSec" id="wwWeek"><div class="shell">'+
      '<div class="wwHead">'+
        '<div><p class="code">A real week</p><h2>Four twelves, one early, two off.</h2></div>'+
        '<p>The week a generic plan breaks on. Training lands where the week has room, not where a template says it should.</p>'+
      '</div>'+
      '<div class="wwBoard">'+
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
      '</div>'+
    '</div></section>'+

    '<section class="wwSec" id="wwPlan"><div class="shell">'+
      '<div class="wwHead">'+
        '<div><p class="code">Quick plan</p><h2>Type your week the way you’d say it.</h2></div>'+
        '<p>No forms. Paste your roster, your appointments, your errands. You review everything before a single thing is saved.</p>'+
      '</div>'+
      '<div class="wwCap">'+
        '<div class="wwPaste"><span class="code">You type</span>'+
          '<pre>work mon–thu 7:30 to 7:30\ndentist tuesday 10am\npick up Amara tuesday 4pm\nmeal prep sunday at 3\nremind me to train thursday</pre>'+
        '</div>'+
        '<div>'+
          '<div class="wwArrow code"><hr>Reviewed before saving<hr></div>'+
          '<div class="wwParsed"><div class="wwRows">'+
            row('w','Mon–Thu','Work','07:30–19:30 · repeats weekly','Shift')+
            row('r','Tue 10:00','Dentist','Reminder 30 min before','Appt')+
            row('r','Tue 16:00','Pick up Amara','Blocks the window','Commit')+
            row('m','Sun 15:00','Meal prep','Two hours held','Food')+
            row('t','Thu 16:20','Lower body','Placed after the shift','Training')+
          '</div>'+
          '<div class="wwRosterFoot"><i class="wwDot"></i>'+
            '<span>5 items found. Nothing saved until you confirm.</span></div></div>'+
        '</div>'+
      '</div>'+
    '</div></section>'+

    '<section class="wwClose"><div class="shell">'+
      '<div class="wwCloseIn">'+
        '<div><p class="code">Built for the shift you’re already working</p><h2>Start with one question.</h2></div>'+
        '<button class="wwBtn lg" data-ww="signup">Create your plan</button>'+
      '</div>'+
      '<div class="wwFoot">'+
        '<span class="code">Work + Workout · 2026</span>'+
        '<a href="./privacy.html">Privacy</a>'+
        '<a href="./terms.html">Terms</a>'+
        '<a href="./support.html">Support</a>'+
        '<button data-ww="signin">Sign in</button>'+
      '</div>'+
    '</div></section>'+

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
