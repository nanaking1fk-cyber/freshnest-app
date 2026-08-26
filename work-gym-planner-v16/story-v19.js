// Work + Workout 22.0 — day-in-the-life product story, worker carousel and smart capture.
(function workWorkoutStoryV19(){
  'use strict';
  var V=window.WGC19=window.WGC19||{};
  var ASSET='../work-gym-planner-v16/assets/';
  var adTimer=null;
  var adIndex=0;
  var adObserver=null;
  var workerTimer=null;
  var workerIndex=0;
  var workerObserver=null;
  var captureDraft=[];
  var weekdays={sun:0,sunday:0,mon:1,monday:1,tue:2,tues:2,tuesday:2,wed:3,wednesday:3,thu:4,thur:4,thurs:4,thursday:4,fri:5,friday:5,sat:6,saturday:6};
  var dayPattern=/\b(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/gi;
  var dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function safe(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(char){
      return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char];
    });
  }
  function pad(value){return String(value).padStart(2,'0')}
  function keyFromDate(value){return value.getFullYear()+'-'+pad(value.getMonth()+1)+'-'+pad(value.getDate())}
  function dateFromKey(value){var parts=value.split('-').map(Number);return new Date(parts[0],parts[1]-1,parts[2])}
  function addDate(value,days){var copy=new Date(value);copy.setDate(copy.getDate()+days);return copy}
  function friendlyDate(value){
    return dateFromKey(value).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  }
  function time12(value){
    if(!value)return'Any time';
    var parts=value.split(':').map(Number),hour=parts[0],minute=parts[1]||0;
    return(hour%12||12)+':'+pad(minute)+' '+(hour>=12?'PM':'AM');
  }
  function normalizeHour(hour,minute,meridiem){
    hour=Number(hour);minute=Number(minute||0);
    if(meridiem){
      meridiem=meridiem.toLowerCase();
      if(meridiem==='pm'&&hour<12)hour+=12;
      if(meridiem==='am'&&hour===12)hour=0;
    }
    return pad(hour)+':'+pad(minute);
  }
  function parseTimes(text){
    var range=text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if(range){
      var h1=Number(range[1]),h2=Number(range[4]),m1=range[2]||'00',m2=range[5]||'00',a1=range[3],a2=range[6];
      if(!a1&&!a2&&h2<=h1)h2+=12;
      if(!a1&&a2)a1=a2;
      return{start:normalizeHour(h1,m1,a1),end:normalizeHour(h2,m2,a2)};
    }
    var single=text.match(/(?:\bat\b|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    return single?{start:normalizeHour(single[1],single[2],single[3]),end:''}:{start:'',end:''};
  }
  function nextWeekday(index,weekOffset){
    var now=new Date(),delta=(index-now.getDay()+7)%7;
    if(delta===0&&weekOffset===0)delta=0;
    return addDate(now,delta+(weekOffset||0)*7);
  }
  function explicitDate(text){
    if(/\btoday\b/i.test(text))return keyFromDate(new Date());
    if(/\btomorrow\b/i.test(text))return keyFromDate(addDate(new Date(),1));
    var iso=text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if(iso)return keyFromDate(new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3])));
    var slash=text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
    if(slash)return keyFromDate(new Date(Number(slash[3]||new Date().getFullYear()),Number(slash[1])-1,Number(slash[2])));
    var months={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
    var named=text.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i);
    if(named)return keyFromDate(new Date(Number(named[3]||new Date().getFullYear()),months[named[1].toLowerCase()],Number(named[2])));
    return'';
  }
  function expandDayLanguage(text){
    var value=String(text||'')
      .replace(/\bweekdays?\b/gi,'Monday Tuesday Wednesday Thursday Friday')
      .replace(/\bweekends?\b/gi,'Saturday Sunday');
    var token='(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)';
    return value.replace(new RegExp('\\b'+token+'\\s*(?:-|–|—|through|thru)\\s*'+token+'\\b','gi'),function(match,start,end){
      var first=weekdays[start.toLowerCase()],last=weekdays[end.toLowerCase()],names=[dayNames[first]],cursor=first;
      while(cursor!==last&&names.length<7){cursor=(cursor+1)%7;names.push(dayNames[cursor])}
      return names.join(' ');
    });
  }
  function inferredDates(text,kind){
    var exact=explicitDate(text);
    if(exact)return[exact];
    var found=[],match,seen={};
    dayPattern.lastIndex=0;
    while((match=dayPattern.exec(text))){
      var index=weekdays[match[1].toLowerCase()];
      if(!seen[index]){seen[index]=true;found.push(index)}
    }
    if(!found.length)return[keyFromDate(new Date())];
    var recurring=kind==='work'&&(/\bevery\b|\beach\b|\bweekly\b|\bshifts?\b/i.test(text)||found.length>1);
    var dates=[];
    found.forEach(function(index){
      var weeks=recurring?6:1;
      for(var week=0;week<weeks;week++)dates.push(keyFromDate(nextWeekday(index,week+(/\bnext\b/i.test(text)?1:0))));
    });
    return dates.sort();
  }
  function classify(text){
    if(/\b(work|working|shift|job|on call)\b/i.test(text))return'work';
    if(/\b(workout|gym|train|training|run|walk|yoga|lift|cardio)\b/i.test(text))return'workout';
    if(/\b(meal|lunch|dinner|breakfast|grocer|cook|food|prep)\b/i.test(text))return'meal';
    if(/\b(doctor|dentist|appointment|pickup|pick up|meeting|class|church)\b/i.test(text))return'event';
    return'todo';
  }
  function titleFor(text,kind){
    var clean=text.replace(/\b(every|each|weekly|today|tomorrow)\b/gi,'').replace(dayPattern,'').replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi,'').replace(/(?:\bat\b|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi,'').replace(/\s+/g,' ').replace(/^[,.\-\s]+|[,.\-\s]+$/g,'').trim();
    if(kind==='work'){
      var place=text.match(/\b(?:work|working|shift)\s+at\s+([A-Za-z][A-Za-z0-9 '&-]{2,32})/i);
      return place&&place[1]?place[1].trim()+' shift':'Work shift';
    }
    if(kind==='workout'&&clean.length<4)return'Workout';
    if(kind==='meal'&&/\bprep\b/i.test(text))return'Meal prep';
    if(!clean)return kind==='event'?'Appointment':kind==='meal'?'Meal planning':kind==='workout'?'Workout':'To-do';
    return clean.charAt(0).toUpperCase()+clean.slice(1);
  }
  function parseRawInput(raw){
    var segments=String(raw||'').split(/\n+|;\s*/).map(function(value){return value.trim()}).filter(Boolean);
    var entries=[];
    segments.forEach(function(segment){
      var normalized=expandDayLanguage(segment),kind=classify(normalized),times=parseTimes(normalized),hasDate=!!explicitDate(normalized)||dayPattern.test(normalized),dates=inferredDates(normalized,kind),title=titleFor(normalized,kind);dayPattern.lastIndex=0;
      dates.forEach(function(day,index){
        entries.push({
          id:'smart-'+Date.now()+'-'+entries.length,
          kind:kind,date:day,title:title,start:times.start,end:times.end,
          reminder:kind==='work'?60:(kind==='event'||kind==='workout'?30:0),
          source:segment,series:dates.length>1,index:index,needsReview:!hasDate
        });
      });
    });
    return entries;
  }
  function kindLabel(kind){
    return({work:'Work',workout:'Movement',meal:'Meal',event:'Schedule',todo:'To-do'})[kind]||'Plan';
  }

  function workerStoryMarkup(){
    return '<section id="landingWorkers" class="landingSection storyWorkers">'+
      '<div class="storySectionHead"><p>BUILT FOR WORKING PEOPLE</p><h2>The people who keep life moving deserve a plan that moves with them.</h2><span>Healthcare. Roads. Transit. Hospitality. Education. Logistics. One adaptive plan for every demanding day.</span></div>'+
      '<div id="landingWorkerCarousel" class="storyWorkerCarousel" role="region" aria-roledescription="carousel" aria-label="How Work and Workout supports different working lives">'+
        '<div class="storyWorkerViewport" aria-live="off">'+
          '<article class="storyWorkerSlide storyWorkerNurse active" data-worker-slide="0" aria-hidden="false"><img src="'+ASSET+'story-nurse-v19.jpg" alt="A nurse in navy scrubs checking her plan after a hospital shift"><div class="storyWorkerBody"><small>HEALTHCARE · SHIFT PLAN</small><h3>Twelve-hour shift. One plan that protects the person in the scrubs.</h3><p>Meals, training and recovery fit around the work—not the other way around.</p><span>SHIFT · MEALS · RECOVERY</span></div></article>'+
          '<article class="storyWorkerSlide storyWorkerRoad" data-worker-slide="1" aria-hidden="true"><img src="'+ASSET+'story-road-worker-v19.jpg" alt="A road construction worker in safety gear checking his Work and Workout schedule"><div class="storyWorkerBody"><small>CONSTRUCTION · WORKLOAD AWARE</small><h3>Physical work changes what a smart workout looks like.</h3><p>Heavy workdays lower the training load and protect mobility, fuel and recovery.</p><span>WORKLOAD · MOBILITY · RECOVERY</span></div></article>'+
          '<article class="storyWorkerSlide storyWorkerTransit" data-worker-slide="2" aria-hidden="true"><img src="'+ASSET+'story-transit-v19.jpg" alt="A transit driver in uniform using a prepared meal and daily plan"><div class="storyWorkerBody"><small>TRANSIT · ROUTE READY</small><h3>Meals and movement, coordinated between routes.</h3><p>Early starts and small breaks become realistic windows for food, movement and life.</p><span>ROUTES · MEALS · MOVEMENT</span></div></article>'+
          '<article class="storyWorkerSlide storyWorkerChef" data-worker-slide="3" aria-hidden="true"><img src="'+ASSET+'story-chef-v19.jpg" alt="A chef using Work and Workout after a busy service"><div class="storyWorkerBody"><small>HOSPITALITY · LATE SHIFT</small><h3>Care for yourself after serving everyone else.</h3><p>When service runs long, the plan resets dinner, recovery and tomorrow automatically.</p><span>SERVICE · RECOVERY · TOMORROW</span></div></article>'+
          '<article class="storyWorkerSlide storyWorkerTeacher" data-worker-slide="4" aria-hidden="true"><img src="'+ASSET+'story-teacher-v22.jpg" alt="A teacher checking his Work and Workout plan after class with a prepared meal"><div class="storyWorkerBody"><small>EDUCATION · SCHOOL DAY</small><h3>The final bell should not end your energy for the day.</h3><p>Classes, meal prep and training stay coordinated—even when the school day follows you home.</p><span>CLASSES · MEAL PREP · TRAINING</span></div></article>'+
          '<article class="storyWorkerSlide storyWorkerLogistics" data-worker-slide="5" aria-hidden="true"><img src="'+ASSET+'story-logistics-v22.jpg" alt="A logistics worker checking her Work and Workout plan during a shift break"><div class="storyWorkerBody"><small>LOGISTICS · SHIFT CHANGE</small><h3>A demanding shift is already part of the training equation.</h3><p>Workload, hydration, meals and the gym are balanced as one connected day.</p><span>SHIFT LOAD · HYDRATION · GYM</span></div></article>'+
        '</div>'+
        '<div class="storyWorkerNav" role="tablist" aria-label="Choose a worker story">'+
          '<button class="active" type="button" role="tab" aria-label="Healthcare story" aria-selected="true" data-worker-go="0"></button>'+
          '<button type="button" role="tab" aria-label="Construction story" aria-selected="false" data-worker-go="1"></button>'+
          '<button type="button" role="tab" aria-label="Transit story" aria-selected="false" data-worker-go="2"></button>'+
          '<button type="button" role="tab" aria-label="Hospitality story" aria-selected="false" data-worker-go="3"></button>'+
          '<button type="button" role="tab" aria-label="Education story" aria-selected="false" data-worker-go="4"></button>'+
          '<button type="button" role="tab" aria-label="Logistics story" aria-selected="false" data-worker-go="5"></button>'+
        '</div>'+
        '<div class="storyWorkerControls"><button type="button" data-worker-prev aria-label="Previous worker story">&#8592;</button><span id="storyWorkerCount">01 / 06</span><button type="button" data-worker-next aria-label="Next worker story">&#8594;</button></div>'+
      '</div>'+
    '</section>';
  }

  function updateWorkerCarousel(nextIndex){
    var root=document.getElementById('landingWorkerCarousel');
    if(!root)return;
    var slides=root.querySelectorAll('[data-worker-slide]'),tabs=root.querySelectorAll('[data-worker-go]');
    if(!slides.length)return;
    workerIndex=(nextIndex+slides.length)%slides.length;
    slides.forEach(function(slide,index){
      var active=index===workerIndex;
      slide.classList.toggle('active',active);
      slide.setAttribute('aria-hidden',String(!active));
    });
    tabs.forEach(function(tab,index){
      var active=index===workerIndex;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',String(active));
    });
    var count=document.getElementById('storyWorkerCount');
    if(count)count.textContent=pad(workerIndex+1)+' / '+pad(slides.length);
  }
  function stopWorkerCarousel(){clearInterval(workerTimer);workerTimer=null}
  function startWorkerCarousel(){
    var root=document.getElementById('landingWorkerCarousel');
    if(!root||document.hidden||window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    stopWorkerCarousel();
    workerTimer=setInterval(function(){updateWorkerCarousel(workerIndex+1)},6400);
  }
  function bindWorkerCarousel(){
    var root=document.getElementById('landingWorkerCarousel');
    if(!root||root.dataset.bound)return;
    root.dataset.bound='true';
    var previous=root.querySelector('[data-worker-prev]'),next=root.querySelector('[data-worker-next]');
    function choose(index){updateWorkerCarousel(index);startWorkerCarousel()}
    if(previous)previous.onclick=function(){choose(workerIndex-1)};
    if(next)next.onclick=function(){choose(workerIndex+1)};
    root.querySelectorAll('[data-worker-go]').forEach(function(button){button.onclick=function(){choose(Number(button.dataset.workerGo))}});
    root.addEventListener('mouseenter',stopWorkerCarousel);
    root.addEventListener('mouseleave',startWorkerCarousel);
    root.addEventListener('focusin',stopWorkerCarousel);
    root.addEventListener('focusout',function(event){if(!root.contains(event.relatedTarget))startWorkerCarousel()});
    var touchStart=0;
    root.addEventListener('touchstart',function(event){touchStart=event.changedTouches[0].clientX},{passive:true});
    root.addEventListener('touchend',function(event){var distance=event.changedTouches[0].clientX-touchStart;if(Math.abs(distance)>46)choose(workerIndex+(distance<0?1:-1))},{passive:true});
    if('IntersectionObserver'in window){
      workerObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting&&entry.intersectionRatio>.22)startWorkerCarousel();else stopWorkerCarousel()})},{threshold:[0,.22,.6]});
      workerObserver.observe(root);
    }else startWorkerCarousel();
    document.addEventListener('visibilitychange',function(){if(document.hidden)stopWorkerCarousel();else startWorkerCarousel()});
  }
  function landingDemoMarkup(){
    return '<section id="landingRawDemo" class="storyRawDemo">'+
      '<div class="storyRawCopy"><p>GIVE US THE RAW VERSION</p><h2>Your life does not arrive in perfect calendar blocks.</h2><span>Paste shifts, appointments, errands and goals in your own words. Work + Workout turns the mess into a plan you can review.</span></div>'+
      '<div class="storyRawStage">'+
        '<div class="storyRawInput"><label for="landingRawInput">Type or paste your week</label><textarea id="landingRawInput" rows="6">Work every Monday, Wednesday and Friday 7am-7pm\nDentist Tuesday at 10am\nPick up my daughter Tuesday at 4pm\nGroceries and meal prep Sunday at 3pm\nRemind me about my workout Thursday at 6pm</textarea><button class="landingPrimary" id="landingBuildPreview">Turn this into a plan <span>→</span></button></div>'+
        '<div id="landingRawResult" class="storyRawResult" aria-live="polite"><div class="storyRawEmpty"><i>✦</i><b>Your coordinated week will appear here.</b><small>Work, movement, meals and life—together.</small></div></div>'+
      '</div>'+
    '</section>';
  }
  function heroAdMarkup(){
    return '<div id="landingDayAdV21" class="landingDayAdV21" aria-label="A day with Work and Workout">'+
      '<section class="landingAdScene active" data-ad-scene="0" aria-hidden="false">'+
        '<video data-ad-video muted playsinline loop preload="metadata" poster="'+ASSET+'story-nurse-v19.jpg"><source src="'+ASSET+'story-phone-work-v21.mp4" type="video/mp4"></video>'+
        '<div class="adSceneLabel"><small>06:12 · BEFORE WORK</small><b>The plan is ready before the shift begins.</b></div>'+
        '<div class="adProduct adPlanProduct"><header><i>W + W</i><span><b>Good morning, Maya</b><small>Tuesday · Your day is coordinated</small></span><em>84</em></header><div class="adDayStatus"><span>ON TRACK</span><b>Three priorities. Zero guesswork.</b></div><ol><li><time>7:00</time><span><b>Hospital shift</b><small>12 hours · lunch packed</small></span><i class="blue"></i></li><li><time>8:10</time><span><b>Evening Strength</b><small>38 min · after commute</small></span><i class="green"></i></li><li><time>9:05</time><span><b>Dinner + recovery</b><small>Protein target protected</small></span><i class="gold"></i></li></ol><p class="adAppConfirm"><i>✓</i> Plan built around your shift</p></div>'+
      '</section>'+
      '<section class="landingAdScene" data-ad-scene="1" aria-hidden="true">'+
        '<video data-ad-video muted playsinline loop preload="none" poster="'+ASSET+'story-nurse-v19.jpg"><source data-src="'+ASSET+'story-nurse-v20.mp4" type="video/mp4"></video>'+
        '<div class="adSceneLabel"><small>19:31 · SHIFT RAN LATE</small><b>The day changed. The plan changed with it.</b></div>'+
        '<div class="adProduct adAdaptProduct"><header><i>✦</i><span><b>Schedule updated</b><small>Work + Workout adapted automatically</small></span></header><div class="adAdaptLine"><span><s>7:45 PM</s><b>8:10 PM</b></span><div><b>Evening Strength</b><small>Trimmed to 38 min · commute protected</small></div></div><div class="adReminder"><i></i><span><b>Meal reminder moved</b><small>Fuel at 7:40 PM · 30 min before training</small></span></div><p>No rebuilding. No missed day.</p></div>'+
      '</section>'+
      '<section class="landingAdScene" data-ad-scene="2" aria-hidden="true">'+
        '<video data-ad-video muted playsinline loop preload="none"><source data-src="'+ASSET+'story-phone-gym-v21.mp4" type="video/mp4"></video>'+
        '<div class="adSceneLabel"><small>20:14 · AT THE GYM</small><b>Open the workout. Log the work. Keep moving.</b></div>'+
        '<div class="adProduct adWorkoutProduct"><header><i>W</i><span><b>Evening Strength</b><small>28 of 38 min · 3 exercises left</small></span><em>•••</em></header><div class="adExercise"><span>02</span><div><b>Chest-supported row</b><small>45 lb · target 8–10 reps</small></div></div><div class="adSetRow"><span><small>SET 1</small><b>10 reps</b></span><span><small>SET 2</small><b>9 reps</b></span><span class="logging"><small>SET 3</small><b>8 reps</b><i>✓ LOGGED</i></span></div><div class="adCoachCue"><i>✦</i><span><b>Progressive Coach</b><small>Great control. Keep 45 lb next session and aim for 9 reps.</small></span></div></div>'+
      '</section>'+
      '<section class="landingAdScene" data-ad-scene="3" aria-hidden="true">'+
        '<video data-ad-video muted playsinline loop preload="none"><source data-src="'+ASSET+'story-phone-meal-v21.mp4" type="video/mp4"></video>'+
        '<div class="adSceneLabel"><small>21:18 · DINNER + RECOVERY</small><b>The workout ends. The coaching does not.</b></div>'+
        '<div class="adProduct adMealProduct"><header><i>N</i><span><b>Dinner logged</b><small>Chicken bowl · 540 calories</small></span><em>✓</em></header><div class="adMacro"><p><span>Protein</span><b>136 / 160g</b></p><i><b style="width:85%"></b></i><p><span>Energy</span><b>2,110 / 2,350</b></p><i><b style="width:90%"></b></i></div><div class="adCoachCue"><i>✦</i><span><b>Progressive Coach</b><small>You are 24g short on protein. Add Greek yogurt before bed; tomorrow stays unchanged.</small></span></div><p class="adTomorrow"><span>Tomorrow</span><b>Recovery walk · meal prep reminder · 7.5h sleep target</b></p></div>'+
      '</section>'+
      '<div class="landingAdProgress" aria-hidden="true"><i class="active"></i><i></i><i></i><i></i><span id="landingAdCount">01 / 04</span></div>'+
      '<p class="landingAdCredit">Illustrative product story · licensed real-life footage</p>'+
    '</div>';
  }

  function renderLandingPreview(){
    var input=document.getElementById('landingRawInput'),result=document.getElementById('landingRawResult');
    if(!input||!result)return;
    var entries=parseRawInput(input.value);
    result.classList.add('building');
    result.innerHTML='<div class="storyRawThinking"><i></i><b>Finding the strongest openings…</b><small>Protecting work and appointments first</small></div>';
    setTimeout(function(){
      var visible=entries.slice(0,6);
      result.classList.remove('building');
      result.innerHTML='<div class="storyPreviewHead"><span><b>'+entries.length+'</b> plan items found</span><button id="landingPreviewSignup">Use this plan</button></div>'+
        '<div class="storyPreviewList">'+visible.map(function(item){
          return'<div><i class="'+item.kind+'">'+kindLabel(item.kind).charAt(0)+'</i><span><b>'+safe(item.title)+'</b><small>'+friendlyDate(item.date)+(item.start?' · '+time12(item.start):'')+(item.end?'–'+time12(item.end):'')+'</small></span><em>'+kindLabel(item.kind)+'</em></div>';
        }).join('')+(entries.length>visible.length?'<p>+ '+(entries.length-visible.length)+' repeating shifts organized</p>':'')+'</div>';
      var signup=document.getElementById('landingPreviewSignup');
      if(signup)signup.onclick=function(){window.WGC18&&window.WGC18.openAccount&&window.WGC18.openAccount('signup')};
    },850);
  }

  function loadAdVideo(video){
    if(!video)return;
    var source=video.querySelector('source[data-src]');
    if(source){source.src=source.dataset.src;source.removeAttribute('data-src');video.load()}
  }
  function updateAd(){
    var root=document.getElementById('landingDayAdV21');
    if(!root)return;
    root.querySelectorAll('[data-ad-scene]').forEach(function(scene){
      var active=Number(scene.dataset.adScene)===adIndex,video=scene.querySelector('[data-ad-video]');
      scene.classList.toggle('active',active);
      scene.setAttribute('aria-hidden',String(!active));
      if(video){
        if(active){loadAdVideo(video);video.currentTime=0;video.play().catch(function(){})}
        else video.pause();
      }
    });
    root.querySelectorAll('.landingAdProgress i').forEach(function(bar,index){bar.classList.toggle('active',index===adIndex)});
    var count=document.getElementById('landingAdCount');
    if(count)count.textContent=pad(adIndex+1)+' / 04';
  }
  function stopAd(){
    clearInterval(adTimer);adTimer=null;
    document.querySelectorAll('[data-ad-video]').forEach(function(video){video.pause()});
  }
  function startAd(){
    var root=document.getElementById('landingDayAdV21');
    if(!root||document.hidden||window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    clearInterval(adTimer);updateAd();
    adTimer=setInterval(function(){adIndex=(adIndex+1)%4;updateAd()},5600);
  }
  function bindAd(){
    var root=document.getElementById('landingDayAdV21');
    if(!root||root.dataset.bound)return;
    root.dataset.bound='true';
    setTimeout(function(){root.querySelectorAll('[data-ad-video]').forEach(loadAdVideo)},900);
    if('IntersectionObserver'in window){
      adObserver=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){if(entry.isIntersecting&&entry.intersectionRatio>.18)startAd();else stopAd()});
      },{threshold:[0,.18,.55]});
      adObserver.observe(root);
    }else startAd();
    document.addEventListener('visibilitychange',function(){if(document.hidden)stopAd();else startAd()});
  }
  function enhanceLanding(){
    var landing=document.getElementById('premiumLanding');
    if(!landing||landing.dataset.storyV19)return false;
    landing.dataset.storyV19='true';
    var heroMedia=landing.querySelector('.landingHeroImage'),heroImage=heroMedia&&heroMedia.querySelector('img');
    if(heroImage){heroImage.src=ASSET+'story-nurse-v19.jpg';heroImage.alt='A healthcare worker using Work and Workout to coordinate a demanding day'}
    if(heroMedia&&!document.getElementById('landingDayAdV21')){heroMedia.insertAdjacentHTML('beforeend',heroAdMarkup());bindAd()}
    var pill=landing.querySelector('.landingPill');
    if(pill)pill.innerHTML='<i></i> A real workday · coordinated in real time';
    var heading=landing.querySelector('.landingHero h1');
    if(heading)heading.innerHTML='Your day is demanding.<br><em>Your plan is already ready.</em>';
    var intro=landing.querySelector('.landingHeroCopy>p');
    if(intro)intro.textContent='From the first shift to the last meal, Work + Workout plans the day, adapts when work runs late, logs every set and keeps coaching after the gym.';
    var ghost=landing.querySelector('.landingHeroActions .landingGhost');
    if(ghost)ghost.remove();
    landing.querySelectorAll('.landingFloatingCard').forEach(function(card){card.remove()});
    var primary=landing.querySelector('.landingHeroActions [data-landing-auth="signup"]');
    if(primary)primary.innerHTML='Coordinate my week <span>→</span>';
    var proof=landing.querySelector('.landingHeroProof');
    if(proof)proof.innerHTML='<span><b>Plan ready</b><small>Work, training and meals coordinated</small></span><span><b>Adapts live</b><small>Late shifts reshape the plan</small></span><span><b>Coaches progress</b><small>Every log improves the next decision</small></span>';
    var signal=landing.querySelector('.landingSignal');
    if(signal){
      signal.querySelector('p').textContent='Made for real working lives';
      signal.querySelector('div').innerHTML='<span>NURSES</span><i></i><span>BUILDERS</span><i></i><span>DRIVERS</span><i></i><span>TEACHERS</span><i></i><span>HOSPITALITY</span>';
      signal.insertAdjacentHTML('afterend',workerStoryMarkup()+landingDemoMarkup());
      bindWorkerCarousel();
    }
    var nav=landing.querySelector('.landingNav nav');
    if(nav&&!nav.querySelector('[href="#landingWorkers"]'))nav.insertAdjacentHTML('afterbegin','<a href="#landingWorkers">For workers</a>');
    landing.querySelectorAll('a[href^="#"]').forEach(function(link){
      link.onclick=function(event){
        event.preventDefault();
        var target=landing.querySelector(link.getAttribute('href'));
        if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
      };
    });
    var build=document.getElementById('landingBuildPreview');
    if(build)build.onclick=renderLandingPreview;
    return true;
  }

  function captureMarkup(){
    return '<section id="smartCaptureV19" class="smartCaptureV19">'+
      '<div class="smartCaptureIntro"><span>✦</span><div><small>QUICK PLAN</small><h2>Give us the raw version.</h2><p>Paste shifts, appointments, meals and errands. Review what we found, then add everything at once.</p></div><button id="smartCaptureFilm">Use an example</button></div>'+
      '<div class="smartCaptureComposer"><textarea id="smartCaptureInput" rows="4" placeholder="Example: Work every Mon, Wed and Fri 7am–7pm; dentist Tuesday at 10; meal prep Sunday; remind me to train Thursday at 6."></textarea><div><button id="smartCaptureVoice" aria-label="Speak your schedule">Voice</button><button class="primary" id="smartCaptureBuild">Build my plan <span>→</span></button></div></div>'+
      '<div class="smartCaptureExamples"><button data-capture-example="Work every Monday, Wednesday and Friday 7am-7pm">Add repeating shifts</button><button data-capture-example="Groceries and meal prep Sunday at 3pm">Plan meal prep</button><button data-capture-example="Dentist tomorrow at 10am; pick up medication at 12pm">Add appointments</button></div>'+
      '<div id="smartCapturePreview" class="smartCapturePreview" aria-live="polite"></div>'+
    '</section>';
  }
  function inAppWorkersMarkup(){
    return '<section id="inAppWorkersV19" class="inAppWorkersV19"><div><small>BUILT FOR THE PERSON DOING THE WORK</small><h2>Strong at work. Supported outside it.</h2><p>Your plan respects physical shifts, long hours and the responsibility you carry.</p></div><div class="inAppWorkerImages"><span><img src="'+ASSET+'story-road-worker-v19.jpg" alt="Road construction worker in safety uniform"><b>Physical shift</b></span><span><img src="'+ASSET+'story-transit-v19.jpg" alt="Transit driver in work uniform"><b>Early route</b></span><span><img src="'+ASSET+'story-chef-v19.jpg" alt="Chef in professional uniform"><b>Late service</b></span></div></section>';
  }
  function renderCapturePreview(entries){
    captureDraft=entries;
    var root=document.getElementById('smartCapturePreview');
    if(!root)return;
    if(!entries.length){root.innerHTML='<p class="smartCaptureEmpty">Add at least one shift, appointment, meal or to-do.</p>';return}
    var visible=entries.slice(0,10);
    root.innerHTML='<div class="smartPreviewHead"><span><b>'+entries.length+'</b> items found</span><small>Review before anything is saved</small></div>'+
      '<div class="smartPreviewList">'+visible.map(function(item,index){
        return'<label><input type="checkbox" '+(item.needsReview?'':'checked')+' data-capture-item="'+index+'"><i class="'+item.kind+'">'+kindLabel(item.kind).charAt(0)+'</i><span><b>'+safe(item.title)+'</b><small>'+(item.needsReview?'Date needs review (not selected)':' '+friendlyDate(item.date))+(item.start?' · '+time12(item.start):'')+(item.end?'–'+time12(item.end):'')+(item.series?' · repeats':'')+'</small></span><select data-capture-reminder="'+index+'" aria-label="Reminder for '+safe(item.title)+'"><option value="0" '+(!item.reminder?'selected':'')+'>No reminder</option><option value="15" '+(item.reminder===15?'selected':'')+'>15 min before</option><option value="30" '+(item.reminder===30?'selected':'')+'>30 min before</option><option value="60" '+(item.reminder===60?'selected':'')+'>1 hour before</option><option value="720">12 hours before</option></select></label>';
      }).join('')+(entries.length>visible.length?'<p>+ '+(entries.length-visible.length)+' additional repeating shifts will be saved</p>':'')+'</div>'+
      '<div class="smartPreviewActions"><button id="smartPreviewClear">Clear</button><button id="smartPreviewCalendar">Add reminders to device calendar</button><button class="primary" id="smartPreviewSave">Add everything</button></div>';
    document.getElementById('smartPreviewClear').onclick=function(){captureDraft=[];root.innerHTML='';document.getElementById('smartCaptureInput').value=''};
    document.getElementById('smartPreviewSave').onclick=saveCaptureDraft;
    document.getElementById('smartPreviewCalendar').onclick=function(){exportCaptureCalendar(selectedCaptureItems())};
  }
  function selectedCaptureItems(){
    var root=document.getElementById('smartCapturePreview'),selected=[];
    captureDraft.forEach(function(item,index){
      var check=root&&root.querySelector('[data-capture-item="'+index+'"]');
      if(index>=10||check&&check.checked){
        var choice=root&&root.querySelector('[data-capture-reminder="'+index+'"]');
        selected.push(Object.assign({},item,{reminder:choice?Number(choice.value):item.reminder}));
      }
    });
    return selected;
  }
  function saveCaptureDraft(){
    var selected=selectedCaptureItems();
    if(!selected.length)return;
    var items=typeof dayItems==='function'?dayItems():{},workDates=jget(PREFIX+'smart-work-dates',{}),now=new Date().toISOString();
    selected.forEach(function(item){
      if(item.kind==='work'){
        workDates[item.date]={on:true,label:item.title,start:item.start,end:item.end,source:'quick-plan',createdAt:now};
        return;
      }
      items[item.date]=items[item.date]||[];
      var duplicate=items[item.date].some(function(existing){return existing.title===item.title&&existing.time===item.start});
      if(!duplicate)items[item.date].push({id:uid('smart'),title:item.title,time:item.start||'',end:item.end||'',type:item.kind==='event'||item.kind==='workout'?'event':'todo',category:item.kind,done:false,reminderMinutes:item.reminder||0,createdAt:now});
    });
    jset(PREFIX+'smart-work-dates',workDates);
    if(typeof saveDayItems==='function')saveDayItems(items);else jset(PREFIX+'calendar-items',items);
    window.WGC18&&window.WGC18.queueSync&&window.WGC18.queueSync();
    if(typeof renderAll==='function')renderAll();
    if(typeof toast==='function')toast(selected.length+' plan items added');
    captureDraft=[];
    setTimeout(function(){var input=document.getElementById('smartCaptureInput');if(input)input.value='';var preview=document.getElementById('smartCapturePreview');if(preview)preview.innerHTML='<div class="smartCaptureSuccess"><i>✓</i><span><b>Your plan is updated.</b><small>Work shifts now influence workout placement. Calendar items and reminders are ready.</small></span><button id="smartOpenCalendar">Open calendar</button></div>';var open=document.getElementById('smartOpenCalendar');if(open)open.onclick=function(){window.openCalendarDate&&window.openCalendarDate(dkey())}},80);
  }
  function icsText(value){return String(value||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n')}
  function compactDate(day,time){
    var base=day.replace(/-/g,'')+'T'+(time||'09:00').replace(':','')+'00';
    return base;
  }
  function timePlus(time,minutes){
    var parts=String(time||'09:00').split(':'),total=(parseInt(parts[0],10)||0)*60+(parseInt(parts[1],10)||0)+(minutes||60);
    total=((total%1440)+1440)%1440;
    return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
  }
  function exportCaptureCalendar(entries){
    if(!entries.length){if(typeof toast==='function')toast('Select at least one item');return}
    var timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Work and Workout//Smart Plan 23//EN','CALSCALE:GREGORIAN','X-WR-TIMEZONE:'+timezone];
    entries.forEach(function(item,index){
      var eventStart=item.start||'09:00',eventEnd=item.end||timePlus(eventStart,60),start=compactDate(item.date,eventStart),end=compactDate(item.date,eventEnd);
      lines.push('BEGIN:VEVENT','UID:ww-smart-'+Date.now()+'-'+index+'@workandworkout.com','DTSTAMP:'+stamp,'DTSTART;TZID='+timezone+':'+start,'DTEND;TZID='+timezone+':'+end,'SUMMARY:'+icsText(item.title),'DESCRIPTION:'+icsText('Added by Work + Workout Quick Plan'));
      if(item.reminder)lines.push('BEGIN:VALARM','TRIGGER:-PT'+item.reminder+'M','ACTION:DISPLAY','DESCRIPTION:'+icsText(item.title),'END:VALARM');
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    if(typeof downloadBlob==='function')downloadBlob(new Blob([lines.join('\r\n')],{type:'text/calendar'}),'work-and-workout-plan.ics');
  }
  function buildCapture(){
    var input=document.getElementById('smartCaptureInput');
    if(!input)return;
    var button=document.getElementById('smartCaptureBuild');
    if(button){button.disabled=true;button.innerHTML='Organizing your week <i></i>'}
    setTimeout(function(){
      renderCapturePreview(parseRawInput(input.value));
      if(button){button.disabled=false;button.innerHTML='Build my plan <span>→</span>'}
      document.getElementById('smartCapturePreview').scrollIntoView({behavior:'smooth',block:'nearest'});
    },120);
  }
  function reviewRawText(text){var input=document.getElementById('smartCaptureInput');if(!input)return false;input.value=String(text||'').trim();input.scrollIntoView({behavior:'smooth',block:'center'});buildCapture();return true}
  function startVoiceCapture(){
    var Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,input=document.getElementById('smartCaptureInput'),button=document.getElementById('smartCaptureVoice');
    if(!Recognition){if(typeof toast==='function')toast('Voice capture is not supported in this browser');return}
    var recognition=new Recognition();recognition.lang='en-US';recognition.interimResults=false;
    button.classList.add('listening');button.textContent='Listening…';
    recognition.onresult=function(event){input.value+=(input.value?'\n':'')+event.results[0][0].transcript};
    recognition.onend=function(){button.classList.remove('listening');button.textContent='Voice'};
    recognition.onerror=function(){button.classList.remove('listening');button.textContent='Voice'};
    recognition.start();
  }
  function bindCapture(){
    var build=document.getElementById('smartCaptureBuild'),voice=document.getElementById('smartCaptureVoice'),film=document.getElementById('smartCaptureFilm');
    if(build)build.onclick=buildCapture;if(voice)voice.onclick=startVoiceCapture;if(film)film.onclick=function(){var input=document.getElementById('smartCaptureInput');if(!input)return;input.value='Work Monday, Wednesday and Friday 7am-7pm\nGym Tuesday and Thursday at 6pm\nMeal prep Sunday at 3pm\nRemind me to pack lunch before every shift';input.focus()};
    document.querySelectorAll('[data-capture-example]').forEach(function(button){button.onclick=function(){var input=document.getElementById('smartCaptureInput');input.value+=(input.value?'\n':'')+button.dataset.captureExample;input.focus()}});
  }
  function mountInApp(){
    var dash=document.querySelector('.homeDash');
    if(!dash||document.getElementById('smartCaptureV19'))return;
    var summary=dash.querySelector('.homeSummaryGrid');
    if(!summary)return;
    summary.insertAdjacentHTML('afterend',captureMarkup()+inAppWorkersMarkup());
    bindCapture();
    var quick=dash.querySelector('.quickGrid');
    if(quick&&!document.getElementById('quickPlanWeek')){
      quick.insertAdjacentHTML('afterbegin','<button id="quickPlanWeek"><i class="green">✦</i><span>Plan My Week</span></button>');
      document.getElementById('quickPlanWeek').onclick=function(){document.getElementById('smartCaptureV19').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(function(){document.getElementById('smartCaptureInput').focus()},450)};
    }
  }
  function dueReminderCheck(){
    if(!('Notification'in window)||Notification.permission!=='granted'||typeof dayItems!=='function')return;
    var all=dayItems(),now=Date.now(),fired=jget(PREFIX+'smart-reminders-fired',{}),changed=false;
    Object.keys(all).forEach(function(day){
      (all[day]||[]).forEach(function(item){
        if(!item.reminderMinutes||!item.time||item.done||fired[item.id])return;
        var when=dateFromKey(day),parts=item.time.split(':').map(Number);when.setHours(parts[0],parts[1]||0,0,0);
        var alertAt=when.getTime()-item.reminderMinutes*60000;
        if(now>=alertAt&&now-alertAt<15*60000){
          fired[item.id]=new Date().toISOString();changed=true;
          if(typeof showPlannerNotification==='function')showPlannerNotification(item.title,friendlyDate(day)+' · '+time12(item.time));
        }
      });
    });
    if(changed)jset(PREFIX+'smart-reminders-fired',fired);
  }
  function boot(){
    enhanceLanding();mountInApp();dueReminderCheck();
    window.setInterval(dueReminderCheck,60000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)dueReminderCheck()});
    window.addEventListener('online',dueReminderCheck);
    var scheduled=false;
    new MutationObserver(function(){
      if(scheduled)return;scheduled=true;
      requestAnimationFrame(function(){scheduled=false;enhanceLanding();mountInApp()});
    }).observe(document.documentElement,{childList:true,subtree:true});
  }
  V.parseRawInput=parseRawInput;
  V.reviewRawText=reviewRawText;
  V.startAd=startAd;
  V.mountInApp=mountInApp;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
