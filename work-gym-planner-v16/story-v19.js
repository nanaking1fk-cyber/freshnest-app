// Work + Workout 19.0 — worker-first story, interactive product film and smart capture.
(function workWorkoutStoryV19(){
  'use strict';
  var V=window.WGC19=window.WGC19||{};
  var ASSET='../work-gym-planner-v16/assets/';
  var filmTimer=null;
  var filmIndex=0;
  var captureDraft=[];
  var weekdays={sun:0,sunday:0,mon:1,monday:1,tue:2,tues:2,tuesday:2,wed:3,wednesday:3,thu:4,thur:4,thurs:4,thursday:4,fri:5,friday:5,sat:6,saturday:6};
  var dayPattern=/\b(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/gi;

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
    return'';
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
      for(var week=0;week<weeks;week++)dates.push(keyFromDate(nextWeekday(index,week)));
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
      var kind=classify(segment),times=parseTimes(segment),dates=inferredDates(segment,kind),title=titleFor(segment,kind);
      dates.forEach(function(day,index){
        entries.push({
          id:'smart-'+Date.now()+'-'+entries.length,
          kind:kind,date:day,title:title,start:times.start,end:times.end,
          reminder:kind==='work'?60:(kind==='event'||kind==='workout'?30:0),
          source:segment,series:dates.length>1,index:index
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
      '<div class="storySectionHead"><p>BUILT FOR WORKING PEOPLE</p><h2>The people who keep life moving deserve a plan that moves with them.</h2><span>Healthcare. Roads. Transit. Hospitality. Every demanding day.</span></div>'+
      '<div class="storyWorkerGrid">'+
        '<article class="storyWorker storyWorkerNurse"><img src="'+ASSET+'story-nurse-v19.jpg" alt="A nurse in navy scrubs checking her plan after a hospital shift"><div><small>HEALTHCARE</small><h3>Twelve-hour shift. One plan that protects the person in the scrubs.</h3><p>Meals, training and recovery fit around the work—not the other way around.</p></div></article>'+
        '<article class="storyWorker"><img src="'+ASSET+'story-road-worker-v19.jpg" alt="A road construction worker in safety gear checking his schedule"><div><small>CONSTRUCTION</small><h3>Physical work changes the workout.</h3><p>Heavy days call for smarter training and better recovery.</p></div></article>'+
        '<article class="storyWorker"><img src="'+ASSET+'story-transit-v19.jpg" alt="A transit driver in uniform with a prepared meal"><div><small>TRANSIT</small><h3>Meals and movement between routes.</h3><p>Small windows become useful, realistic actions.</p></div></article>'+
        '<article class="storyWorker"><img src="'+ASSET+'story-chef-v19.jpg" alt="A chef in uniform planning around a busy service"><div><small>HOSPITALITY</small><h3>Care for yourself after serving everyone else.</h3><p>The plan resets when the shift runs long.</p></div></article>'+
      '</div>'+
    '</section>';
  }
  function landingDemoMarkup(){
    return '<section id="landingRawDemo" class="storyRawDemo">'+
      '<div class="storyRawCopy"><p>GIVE US THE RAW VERSION</p><h2>Your life does not arrive in perfect calendar blocks.</h2><span>Paste shifts, appointments, errands and goals in your own words. Work + Workout turns the mess into a plan you can review.</span><button class="landingPrimary landingLarge" id="storyWatchFilm">Watch the 30-second story <b>▶</b></button></div>'+
      '<div class="storyRawStage">'+
        '<div class="storyRawInput"><label for="landingRawInput">Type or paste your week</label><textarea id="landingRawInput" rows="6">Work every Monday, Wednesday and Friday 7am-7pm\nDentist Tuesday at 10am\nPick up my daughter Tuesday at 4pm\nGroceries and meal prep Sunday at 3pm\nRemind me about my workout Thursday at 6pm</textarea><button class="landingPrimary" id="landingBuildPreview">Turn this into a plan <span>→</span></button></div>'+
        '<div id="landingRawResult" class="storyRawResult" aria-live="polite"><div class="storyRawEmpty"><i>✦</i><b>Your coordinated week will appear here.</b><small>Work, movement, meals and life—together.</small></div></div>'+
      '</div>'+
    '</section>';
  }
  function filmMarkup(){
    return '<div id="storyFilm" class="storyFilm" hidden role="dialog" aria-modal="true" aria-labelledby="storyFilmTitle">'+
      '<div class="storyFilmShell">'+
        '<button id="storyFilmClose" class="storyFilmClose" aria-label="Close product story">×</button>'+
        '<div class="storyFilmBrand"><span>W + W</span><p>AN INTERACTIVE PRODUCT STORY</p></div>'+
        '<div class="storyFilmScenes">'+
          '<section class="filmScene active" data-film-scene="0"><img src="'+ASSET+'story-nurse-v19.jpg" alt=""><div class="filmShade"></div><div class="filmCopy"><small>01 · REAL LIFE FIRST</small><h2 id="storyFilmTitle">The shift is fixed.<br>Your health plan should adapt.</h2><p>Work + Workout begins with the life you actually have.</p></div></section>'+
          '<section class="filmScene" data-film-scene="1"><div class="filmCapture"><small>DROP IN THE MESSY VERSION</small><p>“Work Mon, Wed, Fri 7–7.<br>Dentist Tuesday. Groceries Sunday.<br>I still want three workouts.”</p><i><b></b></i><span>Reading work · appointments · priorities</span></div><div class="filmCopy filmCopyBottom"><small>02 · UNDERSTAND</small><h2>One input. Every responsibility recognized.</h2></div></section>'+
          '<section class="filmScene" data-film-scene="2"><div class="filmWeek"><span>MON <b class="blue">Work 7–7</b><b class="soft">Recovery</b></span><span>TUE <b class="gold">Dentist 10</b><b class="green">Strength 6</b></span><span>WED <b class="blue">Work 7–7</b><b class="soft">Pack lunch</b></span><span>THU <b class="green">Movement 6</b><b class="purple">Pickup 4</b></span><span>FRI <b class="blue">Work 7–7</b><b class="soft">Early sleep</b></span></div><div class="filmCopy filmCopyBottom"><small>03 · COORDINATE</small><h2>Your week assembles around what cannot move.</h2></div></section>'+
          '<section class="filmScene" data-film-scene="3"><div class="filmPeople"><img src="'+ASSET+'story-road-worker-v19.jpg" alt=""><img src="'+ASSET+'story-transit-v19.jpg" alt=""><img src="'+ASSET+'story-chef-v19.jpg" alt=""></div><div class="filmCopy filmCopyBottom"><small>04 · KEEP GOING</small><h2>Work hard. Live well.</h2><p>For every person whose calendar never really slows down.</p><button class="landingPrimary" id="storyFilmSignup">Build my week <span>→</span></button></div></section>'+
        '</div>'+
        '<div class="storyFilmControls"><button id="storyFilmToggle" aria-label="Pause product story">Ⅱ</button><div class="storyFilmProgress"><i class="active"></i><i></i><i></i><i></i></div><span id="storyFilmCount">01 / 04</span></div>'+
      '</div>'+
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

  function updateFilm(){
    document.querySelectorAll('[data-film-scene]').forEach(function(scene){
      scene.classList.toggle('active',Number(scene.dataset.filmScene)===filmIndex);
    });
    document.querySelectorAll('.storyFilmProgress i').forEach(function(bar,index){bar.classList.toggle('active',index===filmIndex)});
    var count=document.getElementById('storyFilmCount');
    if(count)count.textContent=pad(filmIndex+1)+' / 04';
  }
  function startFilm(){
    clearInterval(filmTimer);
    filmTimer=setInterval(function(){filmIndex=(filmIndex+1)%4;updateFilm()},5200);
    var toggle=document.getElementById('storyFilmToggle');
    if(toggle){toggle.textContent='Ⅱ';toggle.setAttribute('aria-label','Pause product story');toggle.dataset.playing='true'}
  }
  function openFilm(){
    var film=document.getElementById('storyFilm');
    if(!film)return;
    film.hidden=false;requestAnimationFrame(function(){film.classList.add('open')});
    document.body.classList.add('storyFilmOpen');
    filmIndex=0;updateFilm();startFilm();
  }
  function closeFilm(){
    var film=document.getElementById('storyFilm');
    if(!film)return;
    clearInterval(filmTimer);film.classList.remove('open');document.body.classList.remove('storyFilmOpen');
    setTimeout(function(){film.hidden=true},220);
  }
  function bindFilm(){
    var close=document.getElementById('storyFilmClose'),toggle=document.getElementById('storyFilmToggle'),signup=document.getElementById('storyFilmSignup');
    if(close)close.onclick=closeFilm;
    if(toggle)toggle.onclick=function(){
      if(toggle.dataset.playing==='true'){clearInterval(filmTimer);toggle.dataset.playing='false';toggle.textContent='▶';toggle.setAttribute('aria-label','Play product story')}
      else startFilm();
    };
    if(signup)signup.onclick=function(){closeFilm();window.WGC18&&window.WGC18.openAccount&&window.WGC18.openAccount('signup')};
    document.getElementById('storyFilm').addEventListener('click',function(event){if(event.target.id==='storyFilm')closeFilm()});
  }
  function enhanceLanding(){
    var landing=document.getElementById('premiumLanding');
    if(!landing||landing.dataset.storyV19)return false;
    landing.dataset.storyV19='true';
    var heroImage=landing.querySelector('.landingHeroImage img');
    if(heroImage){heroImage.src=ASSET+'story-nurse-v19.jpg';heroImage.alt='A nurse in scrubs checking her plan after a hospital shift'}
    var pill=landing.querySelector('.landingPill');
    if(pill)pill.innerHTML='<i></i> Built for people with demanding schedules';
    var heading=landing.querySelector('.landingHero h1');
    if(heading)heading.innerHTML='Health that works<br><em>around your work.</em>';
    var intro=landing.querySelector('.landingHeroCopy>p');
    if(intro)intro.textContent='Drop in your shifts, appointments and responsibilities. Work + Workout coordinates your meals, movement, recovery and to-dos around the life you already have.';
    var ghost=landing.querySelector('.landingHeroActions .landingGhost');
    if(ghost){ghost.textContent='Watch the story';ghost.removeAttribute('data-landing-scroll');ghost.onclick=openFilm}
    var proof=landing.querySelector('.landingHeroProof');
    if(proof)proof.innerHTML='<span><b>Work first</b><small>Shifts and commute become real boundaries</small></span><span><b>Whole-day health</b><small>Meals, movement and recovery connect</small></span><span><b>Life organized</b><small>To-dos and reminders live in one plan</small></span>';
    var signal=landing.querySelector('.landingSignal');
    if(signal){
      signal.querySelector('p').textContent='Made for real working lives';
      signal.querySelector('div').innerHTML='<span>NURSES</span><i></i><span>BUILDERS</span><i></i><span>DRIVERS</span><i></i><span>TEACHERS</span><i></i><span>HOSPITALITY</span>';
      signal.insertAdjacentHTML('afterend',workerStoryMarkup()+landingDemoMarkup());
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
    var build=document.getElementById('landingBuildPreview'),watch=document.getElementById('storyWatchFilm');
    if(build)build.onclick=renderLandingPreview;
    if(watch)watch.onclick=openFilm;
    return true;
  }

  function captureMarkup(){
    return '<section id="smartCaptureV19" class="smartCaptureV19">'+
      '<div class="smartCaptureIntro"><span>✦</span><div><small>QUICK PLAN</small><h2>Give us the raw version.</h2><p>Paste shifts, appointments, meals and errands. Review what we found, then add everything at once.</p></div><button id="smartCaptureFilm">See how it works</button></div>'+
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
        return'<label><input type="checkbox" checked data-capture-item="'+index+'"><i class="'+item.kind+'">'+kindLabel(item.kind).charAt(0)+'</i><span><b>'+safe(item.title)+'</b><small>'+friendlyDate(item.date)+(item.start?' · '+time12(item.start):'')+(item.end?'–'+time12(item.end):'')+(item.series?' · repeats':'')+'</small></span><select data-capture-reminder="'+index+'" aria-label="Reminder for '+safe(item.title)+'"><option value="0" '+(!item.reminder?'selected':'')+'>No reminder</option><option value="15" '+(item.reminder===15?'selected':'')+'>15 min before</option><option value="30" '+(item.reminder===30?'selected':'')+'>30 min before</option><option value="60" '+(item.reminder===60?'selected':'')+'>1 hour before</option><option value="720">12 hours before</option></select></label>';
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
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Work and Workout//Smart Plan 19//EN','CALSCALE:GREGORIAN'];
    entries.forEach(function(item,index){
      var eventStart=item.start||'09:00',eventEnd=item.end||timePlus(eventStart,60),start=compactDate(item.date,eventStart),end=compactDate(item.date,eventEnd);
      lines.push('BEGIN:VEVENT','UID:ww-smart-'+Date.now()+'-'+index+'@workandworkout.com','DTSTART:'+start,'DTEND:'+end,'SUMMARY:'+icsText(item.title),'DESCRIPTION:'+icsText('Added by Work + Workout Quick Plan'));
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
    },520);
  }
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
    if(build)build.onclick=buildCapture;if(voice)voice.onclick=startVoiceCapture;if(film)film.onclick=openFilm;
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
    if(!document.getElementById('storyFilm')){document.body.insertAdjacentHTML('beforeend',filmMarkup());bindFilm()}
    enhanceLanding();mountInApp();dueReminderCheck();
    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&document.getElementById('storyFilm')&&!document.getElementById('storyFilm').hidden)closeFilm()});
    var scheduled=false;
    new MutationObserver(function(){
      if(scheduled)return;scheduled=true;
      requestAnimationFrame(function(){scheduled=false;enhanceLanding();mountInApp()});
    }).observe(document.documentElement,{childList:true,subtree:true});
  }
  V.parseRawInput=parseRawInput;
  V.openFilm=openFilm;
  V.mountInApp=mountInApp;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
