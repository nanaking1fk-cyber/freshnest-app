// Work + Workout v76 — reusable, lazily loaded product tour.
(function workWorkoutProductTourV76(window){
  'use strict';

  var ID='productTourV76';
  var VIDEO='../work-gym-planner-v16/assets/work-workout-tour-v76.mp4';
  var POSTER='../work-gym-planner-v16/assets/work-workout-tour-v76-poster.jpg';
  var chapters=[
    {time:3.1,label:'Today',copy:'Your shift, workout, meals and recovery'},
    {time:8,label:'Calendar',copy:'Plan shifts and keep variations color-coded'},
    {time:18.8,label:'Training',copy:'Follow a session and log each set'},
    {time:24,label:'Nutrition',copy:'Add foods, scan meals and reuse favorites'},
    {time:32.7,label:'Steps & recovery',copy:'See movement, sleep and readiness'},
    {time:36.8,label:'Hours & pay',copy:'Estimate hours, overtime and take-home pay'},
    {time:43.3,label:'Your space',copy:'Find settings, account controls and support'}
  ];
  var returnFocus=null;

  function chapterMarkup(){
    return chapters.map(function(chapter,index){
      return '<button type="button" data-tour-time="'+chapter.time+'" aria-label="Play '+chapter.label+' chapter"><span>'+String(index+1).padStart(2,'0')+'</span><b>'+chapter.label+'</b><small>'+chapter.copy+'</small><i aria-hidden="true">›</i></button>';
    }).join('');
  }

  function markup(){
    return '<div id="'+ID+'" class="productTourV76" role="dialog" aria-modal="true" aria-labelledby="productTourTitleV76" hidden>'+
      '<button type="button" class="productTourBackdropV76" data-tour-close aria-label="Close app tour"></button>'+
      '<section class="productTourSheetV76" tabindex="-1">'+
        '<header class="productTourHeadV76"><div><p>GET TO KNOW THE APP</p><h2 id="productTourTitleV76">Work + Workout in 50 seconds</h2><span>Watch it all or jump to what you need.</span></div><button type="button" class="productTourCloseV76" data-tour-close aria-label="Close app tour">×</button></header>'+
        '<div class="productTourBodyV76">'+
          '<div class="productTourPlayerV76"><div class="productTourFrameV76"><video controls playsinline preload="none" poster="'+POSTER+'" aria-label="Work + Workout app demonstration"></video></div><p><span aria-hidden="true">●</span> Captions included · Sound optional</p></div>'+
          '<div class="productTourGuideV76"><div class="productTourGuideHeadV76"><small>CHAPTERS</small><span>0:50</span></div><nav class="productTourChaptersV76" aria-label="Video chapters">'+chapterMarkup()+'</nav>'+
            '<details class="productTourTranscriptV76"><summary>Read the tour</summary><ol>'+chapters.map(function(chapter){return '<li><b>'+chapter.label+':</b> '+chapter.copy+'.</li>'}).join('')+'</ol></details>'+
          '</div>'+
        '</div>'+
      '</section>'+
    '</div>';
  }

  function root(){return document.getElementById(ID)}
  function video(){return root()?.querySelector('video')}

  function setActive(time){
    var buttons=root()?.querySelectorAll('[data-tour-time]')||[];
    var active=0;
    chapters.forEach(function(chapter,index){if(time>=chapter.time-.15)active=index});
    buttons.forEach(function(button,index){button.classList.toggle('active',index===active);button.setAttribute('aria-current',index===active?'true':'false')});
  }

  function loadVideo(){
    var player=video();
    if(!player||player.dataset.loaded)return player;
    player.dataset.loaded='true';
    player.src=VIDEO;
    player.load();
    return player;
  }

  function openTour(chapterTime){
    var modal=root();
    if(!modal)return;
    returnFocus=document.activeElement;
    modal.hidden=false;
    document.body.classList.add('productTourOpenV76');
    var player=loadVideo();
    var start=Number(chapterTime)||0;
    var play=function(){if(start)player.currentTime=start;else if(player.ended)player.currentTime=0;setActive(player.currentTime||start);player.play().catch(function(){})};
    if(player.readyState>=1)play();else player.addEventListener('loadedmetadata',play,{once:true});
    window.requestAnimationFrame(function(){modal.classList.add('open');modal.querySelector('.productTourSheetV76')?.focus()});
  }

  function closeTour(){
    var modal=root();
    if(!modal||modal.hidden)return;
    video()?.pause();
    modal.classList.remove('open');
    document.body.classList.remove('productTourOpenV76');
    window.setTimeout(function(){modal.hidden=true;returnFocus?.focus?.();returnFocus=null},180);
  }

  function addEntryPoints(){
    var actions=document.querySelector('#wwLanding .ww29HeroActions');
    if(actions&&!document.getElementById('landingProductTourV76')){
      var landing=document.createElement('button');
      landing.type='button';landing.id='landingProductTourV76';landing.className='ww29Secondary productTourLaunchV76';
      landing.innerHTML='<span aria-hidden="true">▶</span> Watch 50-second tour';
      actions.appendChild(landing);
    }
    var cards=document.querySelector('#page-more .menuCards');
    if(cards&&!document.getElementById('openProductTourV76')){
      var more=document.createElement('button');
      more.type='button';more.id='openProductTourV76';more.className='productTourLaunchV76';
      more.innerHTML='<span aria-hidden="true">▶</span><div><b>App tour</b><small>See the essentials in 50 seconds</small></div><i aria-hidden="true">›</i>';
      cards.appendChild(more);
    }
  }

  function mount(){
    if(!root()){
      document.body.insertAdjacentHTML('beforeend',markup());
      var modal=root(),player=video();
      modal.querySelectorAll('[data-tour-close]').forEach(function(button){button.addEventListener('click',closeTour)});
      modal.querySelectorAll('[data-tour-time]').forEach(function(button){button.addEventListener('click',function(){
        var target=Number(button.dataset.tourTime)||0,media=loadVideo();
        var seek=function(){media.currentTime=target;setActive(target);media.play().catch(function(){})};
        if(media.readyState>=1)seek();else media.addEventListener('loadedmetadata',seek,{once:true});
      })});
      player.addEventListener('timeupdate',function(){setActive(player.currentTime)});
      setActive(0);
    }
    addEntryPoints();
  }

  document.addEventListener('click',function(event){
    if(event.target.closest('#landingProductTourV76,#openProductTourV76'))openTour();
  });
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!root()?.hidden)closeTour()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  new MutationObserver(addEntryPoints).observe(document.documentElement,{subtree:true,childList:true});
  window.WWProductTour={open:openTour,close:closeTour,chapters:chapters.slice()};
})(window);
