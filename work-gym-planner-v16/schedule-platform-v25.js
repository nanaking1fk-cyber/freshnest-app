// Work + Workout 25.0 — trusted schedule review, rotations, sources and calendar sync UI.
(function schedulePlatformV25(){
  'use strict';
  var Core=window.WWScheduling;
  var Roster=window.WWRoster;
  if(!Core)return;
  var V=window.WWV25=window.WWV25||{};
  var Capture=window.WGC19=window.WGC19||{};
  var KEY={sources:PREFIX+'schedule-sources-v25',events:PREFIX+'schedule-events-v25',rotations:PREFIX+'schedule-rotations-v25'};
  var legacyWorkRows=window.workScheduleRows,legacyVariableCode=window.variableCode;
  var proposals=[],proposalConflicts={},rosterReview=null,proposalParseNotice='',mounting=false,sourceEditId='';

  function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]})}
  function sources(){var value=jget(KEY.sources,[]);return Array.isArray(value)?value:[]}
  function events(){var value=jget(KEY.events,[]);return Array.isArray(value)?value:[]}
  function rotations(){var value=jget(KEY.rotations,[]);return Array.isArray(value)?value:[]}
  function saveSources(value){jset(KEY.sources,value);window.WGC18?.queueSync?.()}
  function saveEvents(value){jset(KEY.events,value);window.WGC18?.queueSync?.()}
  function saveRotations(value){jset(KEY.rotations,value);window.WGC18?.queueSync?.()}
  function makeId(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
  function sourceById(id){return sources().find(function(source){return source.id===id})||sources()[0]||null}
  function enabledSources(){return sources().filter(function(source){return source.enabled!==false})}
  function ensureSources(){
    if(sources().length)return;
    var p=typeof profile==='function'?profile():null,list=[];
    if(p?.fixed?.enabled)list.push({id:'primary-work',name:p.fixed.name||'Primary work',color:Core.COLORS[0],enabled:true,overtimeThreshold:40,createdAt:new Date().toISOString()});
    if(p?.variable?.enabled)list.push({id:'additional-work',name:p.variable.name||'Additional work',color:Core.COLORS[2],enabled:true,overtimeThreshold:40,createdAt:new Date().toISOString()});
    if(!list.length)list.push({id:'work',name:'Work',color:Core.COLORS[0],enabled:true,overtimeThreshold:40,createdAt:new Date().toISOString()});
    saveSources(list);
  }
  function sourceOptions(selected){return enabledSources().map(function(source){return'<option value="'+safe(source.id)+'" '+(source.id===selected?'selected':'')+'>'+safe(source.name)+'</option>'}).join('')}
  function sourceDatalistOptions(){return sources().map(function(source){return'<option value="'+safe(source.name)+'"></option>'}).join('')}
  function captureSource(){
    var input=document.getElementById('captureSourceNameV25'),id=input?.dataset.sourceId||'',name=String(input?.value||'').trim(),list=sources();
    var matched=list.find(function(source){return source.id===id})||list.find(function(source){return source.name.trim().toLowerCase()===name.toLowerCase()});
    return matched||enabledSources()[0]||list[0]||{id:'work',name:'Work',color:Core.COLORS[0]};
  }
  function resolveCaptureSource(){
    var input=document.getElementById('captureSourceNameV25'),name=String(input?.value||'').trim(),list=sources();
    if(!name)return captureSource();
    var matched=list.find(function(source){return source.name.trim().toLowerCase()===name.toLowerCase()});
    if(!matched){
      matched={id:makeId('source'),name:name,color:Core.COLORS[list.length%Core.COLORS.length],enabled:true,overtimeThreshold:40,createdAt:new Date().toISOString()};
      list.push(matched);saveSources(list);
    }else if(matched.enabled===false){
      matched=Object.assign({},matched,{enabled:true,updatedAt:new Date().toISOString()});saveSources(list.map(function(source){return source.id===matched.id?matched:source}));
    }
    if(input){input.value=matched.name;input.dataset.sourceId=matched.id}
    return matched;
  }
  function timeLabel(start,end){if(!start)return'Scheduled work';return formatTime(start)+(end?'–'+formatTime(end):'')}
  function formatTime(value){
    if(!value)return'';
    var parts=value.split(':').map(Number),hour=parts[0],minute=parts[1]||0;
    return(hour%12||12)+':'+String(minute).padStart(2,'0')+' '+(hour>=12?'PM':'AM');
  }
  function friendlyDate(value){return Core.dateFromKey(value).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}
  function rangeAroundToday(){var now=new Date(),start=Core.keyFromDate(Core.addDays(now,-14)),end=Core.keyFromDate(Core.addDays(now,120));return{start:start,end:end}}
  function v25WorkEvents(start,end){
    var range=start&&end?{start:start,end:end}:rangeAroundToday(),active=enabledSources(),activeIds=new Set(active.map(function(source){return source.id}));
    return Core.eventsForRange({events:events().filter(function(event){return event.kind==='work'&&activeIds.has(event.sourceId)}),rotations:rotations().filter(function(rotation){return activeIds.has(rotation.sourceId)}),sources:active},range.start,range.end)
  }
  function workEventsOn(key){return v25WorkEvents(key,key)}
  function originalRowsOn(key){try{return typeof legacyWorkRows==='function'?(legacyWorkRows(key)||[]):[]}catch{return[]}}
  function workRowsOn(key){
    var generated=workEventsOn(key).map(function(event){var source=sourceById(event.sourceId)||{};return{name:event.title||source.name||'Work shift',time:timeLabel(event.start,event.end)+(event.overnight?' · overnight':''),start:event.start,end:event.end,color:source.color||event.color||Core.COLORS[0],sourceId:event.sourceId,eventId:event.id,rotationId:event.rotationId,exception:event.exception}});
    originalRowsOn(key).forEach(function(row,index){var matched=sources().find(function(source){return source.name===row.name});if(matched?.enabled===false)return;if(!generated.some(function(item){return item.name===row.name&&item.time===row.time}))generated.push(Object.assign({},row,{color:matched?.color||Core.COLORS[(generated.length+index)%Core.COLORS.length],sourceId:matched?.id||'',legacy:true}))});
    return generated;
  }
  function personalExisting(start,end){
    var all=typeof dayItems==='function'?dayItems():jget(PREFIX+'calendar-items',{}),values=[];
    Object.keys(all||{}).forEach(function(key){if(key<start||key>end)return;(all[key]||[]).forEach(function(item){values.push({id:item.id,kind:item.category==='workout'?'workout':(item.type||'event'),date:key,title:item.title,start:item.time||'',end:item.end||'',storage:'personal',updatedAt:item.updatedAt||item.createdAt||'',externalId:item.externalId||'',provider:item.provider||''})})});
    return values;
  }
  function legacyExisting(start,end){
    var values=[],cursor=Core.dateFromKey(start),finish=Core.dateFromKey(end);
    while(cursor<=finish){
      var key=Core.keyFromDate(cursor);
      originalRowsOn(key).forEach(function(row,index){values.push({id:'legacy:'+key+':'+index,kind:'work',date:key,title:row.name,start:parseDisplayTime(row.time,0),end:parseDisplayTime(row.time,1),storage:'legacy'})});
      cursor=Core.addDays(cursor,1);
    }
    return values;
  }
  function allWorkForRange(start,end){
    var values=v25WorkEvents(start,end).slice(),fallback=enabledSources()[0]||{id:'work',name:'Work',color:Core.COLORS[0]},cursor=Core.dateFromKey(start),finish=Core.dateFromKey(end);
    while(cursor<=finish){
      var key=Core.keyFromDate(cursor);
      originalRowsOn(key).forEach(function(row,index){
        var matched=sources().find(function(item){return item.name===row.name});if(matched?.enabled===false)return;
        var source=matched||enabledSources()[index]||fallback,event={id:'legacy-summary:'+key+':'+index,kind:'work',date:key,title:row.name||source.name,start:parseDisplayTime(row.time,0),end:parseDisplayTime(row.time,1),sourceId:source.id,sourceName:source.name,color:source.color};
        if(event.start&&event.end&&!values.some(function(item){return Core.sameEvent(item,event)&&item.sourceId===event.sourceId}))values.push(event);
      });
      cursor=Core.addDays(cursor,1);
    }
    return values;
  }
  function parseDisplayTime(value,index){
    var matches=String(value||'').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi)||[],match=matches[index];if(!match)return'';
    var parsed=Core.parseTimes('at '+match);return parsed.start;
  }
  function existingForReview(){var range=rangeAroundToday(),work=v25WorkEvents(range.start,range.end).map(function(event){return Object.assign({storage:'v25'},event)});return work.concat(personalExisting(range.start,range.end),legacyExisting(range.start,range.end))}

  function workspaceMarkup(){
    return'<section id="plannerWorkspaceV25" class="plannerWorkspaceV25">'+
      '<header class="plannerWorkspaceHead"><div><small>YOUR PLAN</small><h1>Calendar</h1><p id="plannerWorkspaceStatus">Your commitments, workouts and personal plans in one view.</p></div><div class="plannerWorkspaceToolsV25"><div class="calendarDisplayToggleV32" role="group" aria-label="Calendar display"><button type="button" data-calendar-display="details" aria-pressed="true">Details</button><button type="button" data-calendar-display="compact" aria-pressed="false">Compact</button></div><button id="calendarQuickAddV31" class="primary" type="button">Add <span>+</span></button><button id="calendarClearWorkspaceV25" type="button" aria-label="Clear your Work and Workout calendar">Clear</button><div id="plannerWeekPulse" class="plannerWeekPulse"></div></div></header>'+
      '<div class="plannerTabsV25" role="tablist" aria-label="Calendar views">'+
        '<button id="plannerTab-calendar" class="active" data-planner-tab="calendar" role="tab" aria-selected="true" aria-controls="plannerPane-calendar" tabindex="0"><span>Calendar</span><small>Your week</small></button>'+
        '<button id="plannerTab-add" data-planner-tab="add" role="tab" aria-selected="false" aria-controls="plannerPane-add" tabindex="-1"><span>Add</span><small>Schedule or task</small></button>'+
        '<button id="plannerTab-tools" data-planner-tab="tools" role="tab" aria-selected="false" aria-controls="plannerPane-tools" tabindex="-1"><span>Manage</span><small>Sources, rotations &amp; sync</small></button>'+
      '</div>'+
      '<div id="plannerPane-calendar" class="plannerPaneV25 active" role="tabpanel" aria-labelledby="plannerTab-calendar"></div>'+
      '<div id="plannerPane-add" class="plannerPaneV25" role="tabpanel" aria-labelledby="plannerTab-add" hidden></div>'+
      '<div id="plannerPane-tools" class="plannerPaneV25" role="tabpanel" aria-labelledby="plannerTab-tools" hidden><section class="plannerToolsMenuV31"><small>CALENDAR SETTINGS</small><h2>Manage your calendar</h2><p>Only open the tools you need. Your calendar stays the calm, everyday view.</p><button data-planner-open="sources"><span>◉</span><div><b>Work sources</b><small>Add or edit an employer, color and overtime limit.</small></div><i>›</i></button><button data-planner-open="rotations"><span>↻</span><div><b>Recurring rotations</b><small>Set a work pattern and keep exceptions separate.</small></div><i>›</i></button><button data-planner-open="sync"><span>↗</span><div><b>Calendar connections</b><small>Connect Google Calendar or Outlook when you are ready.</small></div><i>›</i></button></section></div>'+
      '<div id="plannerPane-rotations" class="plannerPaneV25" role="region" aria-label="Recurring rotations" hidden><div id="rotationManagerV25"></div></div>'+
      '<div id="plannerPane-sources" class="plannerPaneV25" role="region" aria-label="Work sources" hidden><div id="sourceManagerV25"></div></div>'+
      '<div id="plannerPane-sync" class="plannerPaneV25" role="region" aria-label="Calendar connections" hidden><div id="calendarSyncV25"></div></div>'+
    '</section>';
  }
  function selectTab(name,focus){
    var root=document.getElementById('plannerWorkspaceV25');if(!root)return;
    root.querySelectorAll('[data-planner-tab]').forEach(function(button){var active=button.dataset.plannerTab===name;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1});
    root.querySelectorAll('.plannerPaneV25').forEach(function(pane){var active=pane.id==='plannerPane-'+name;pane.classList.toggle('active',active);pane.hidden=!active});
    sessionStorage.setItem('ww-planner-tab',name);
    if(name==='sources')renderSources();if(name==='rotations')renderRotations();if(name==='sync')renderSync();if(name==='calendar')renderWeekPulse(selectedDate||dkey());
    if(focus)root.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function captureMarkup(){
    return'<section id="smartCaptureV19" class="smartCaptureV19" aria-labelledby="smartCaptureTitle">'+
      '<div class="smartCaptureIntro"><span aria-hidden="true">✦</span><div><small>EFFORTLESS INPUT</small><h2 id="smartCaptureTitle">Tell us the week in your own words.</h2><p>Paste a roster, speak it, or upload what your employer sent. Work, appointments, errands and workouts are organized together.</p></div><button id="smartCaptureFilm" type="button">Use an example</button></div>'+
      '<div class="smartCaptureComposer"><label class="srOnly" for="smartCaptureInput">Describe your work schedule, tasks, appointments and workouts</label><textarea id="smartCaptureInput" rows="5" placeholder="Try: I work Mon–Thu 7am–7pm. Dentist Tuesday at 2. Buy groceries before Friday. Gym three times this week."></textarea><div><button id="smartCaptureVoice" type="button" aria-label="Speak your schedule">Speak</button><button class="primary" id="smartCaptureBuild" type="button">Review my plan <span>→</span></button></div></div>'+
      '<div class="smartCaptureExamples" aria-label="Schedule examples"><button type="button" data-capture-example="Work every Monday, Wednesday and Friday 7am–7pm">Repeating shifts</button><button type="button" data-capture-example="Dentist Tuesday at 2pm; buy groceries before Friday">Appointments &amp; tasks</button><button type="button" data-capture-example="Gym three times this week">Flexible workouts</button></div>'+
      '<div id="smartCapturePreview" class="smartCapturePreview" aria-live="polite"></div>'+
    '</section>';
  }
  function ensureCapture(){
    var capture=document.getElementById('smartCaptureV19'),addPane=document.getElementById('plannerPane-add');
    if(!capture&&addPane){addPane.insertAdjacentHTML('beforeend',captureMarkup());capture=document.getElementById('smartCaptureV19');window.WGC24?.mount?.()}
    return capture;
  }
  function arrangeWorkspace(){
    var calendar=document.getElementById('page-calendar'),root=document.getElementById('plannerWorkspaceV25');if(!calendar||!root)return;
    var calendarPane=document.getElementById('plannerPane-calendar'),addPane=document.getElementById('plannerPane-add');
    var capture=ensureCapture();if(capture&&capture.parentElement!==addPane)addPane.appendChild(capture);
    ['.legend','#calendarActionBarV24','.monthbar','.weekdays','#calendarGrid','#dayCard'].forEach(function(selector){var element=calendar.querySelector(selector);if(element&&element.parentElement!==calendarPane)calendarPane.appendChild(element)});
    var hero=document.getElementById('calendarUtilityV24');if(hero)hero.hidden=true;
    var action=document.getElementById('calendarImportV24');if(action)action.onclick=function(){selectTab('add',true);setTimeout(function(){document.getElementById('smartCaptureInput')?.focus()},250)};
    var todo=document.getElementById('calendarTodoV24');if(todo)todo.onclick=function(){window.openCalendarDate?.(selectedDate||dkey());setTimeout(function(){document.querySelector('[data-agenda-form] input[name="title"]')?.focus()},120)};
  }
  function bindTabs(){document.querySelectorAll('[data-planner-tab]').forEach(function(button){if(button.dataset.v25Bound)return;button.dataset.v25Bound='true';button.onclick=function(){selectTab(button.dataset.plannerTab,false)};button.onkeydown=function(event){var tabs=[...button.parentElement.querySelectorAll('[data-planner-tab]')],index=tabs.indexOf(button),next=null;if(event.key==='ArrowRight')next=tabs[(index+1)%tabs.length];if(event.key==='ArrowLeft')next=tabs[(index-1+tabs.length)%tabs.length];if(event.key==='Home')next=tabs[0];if(event.key==='End')next=tabs[tabs.length-1];if(next){event.preventDefault();next.click();next.focus()}}});document.querySelectorAll('[data-planner-open]').forEach(function(button){if(button.dataset.v25Bound)return;button.dataset.v25Bound='true';button.onclick=function(){selectTab(button.dataset.plannerOpen,true)}});document.querySelectorAll('[data-calendar-display]').forEach(function(button){if(button.dataset.v25Bound)return;button.dataset.v25Bound='true';button.onclick=function(){window.setCalendarDisplayMode?.(button.dataset.calendarDisplay)}});var quick=document.getElementById('calendarQuickAddV31');if(quick&&!quick.dataset.v25Bound){quick.dataset.v25Bound='true';quick.onclick=function(){selectTab('add',true);setTimeout(function(){document.getElementById('smartCaptureInput')?.focus()},250)}}}

  function captureSourceControl(){
    var composer=document.querySelector('#smartCaptureV19 .smartCaptureComposer'),existing=document.getElementById('captureSourceNameV25');
    if(existing){var value=existing.value,source=captureSource();document.getElementById('captureSourceListV25').innerHTML=sourceDatalistOptions();existing.value=value||source.name;return}
    if(!composer)return;
    var source=captureSource();
    composer.insertAdjacentHTML('beforebegin','<div class="captureContextV25"><label for="captureSourceNameV25">Work source or employer<input id="captureSourceNameV25" list="captureSourceListV25" data-source-id="'+safe(source.id)+'" value="'+safe(source.name)+'" placeholder="e.g. Bellevue Hospital" autocomplete="organization"></label><datalist id="captureSourceListV25">'+sourceDatalistOptions()+'</datalist><p>Type a new employer or choose a saved one. Work shifts use its color; appointments, tasks and workouts stay personal.</p></div>');
    document.getElementById('captureSourceNameV25').oninput=function(){this.dataset.sourceId=''};
  }
  function bindTrustedCapture(){
    var build=document.getElementById('smartCaptureBuild');if(build)build.onclick=buildTrustedProposal;
    var film=document.getElementById('smartCaptureFilm');if(film)film.onclick=function(){var input=document.getElementById('smartCaptureInput');if(input){input.value='Work Monday–Thursday 7 AM–7 PM. Dentist Tuesday at 2. Buy groceries before Friday. Gym three times this week.';input.focus()}};
    var voice=document.getElementById('smartCaptureVoice');if(voice)voice.onclick=startVoiceCapture;
    document.querySelectorAll('[data-capture-example]').forEach(function(button){button.onclick=function(){var input=document.getElementById('smartCaptureInput');if(!input)return;input.value+=(input.value?'\n':'')+button.dataset.captureExample;input.focus()}});
    captureSourceControl();
    Capture.reviewRawText=function(text,meta){rosterReview=null;selectTab('add',true);var input=document.getElementById('smartCaptureInput');if(!input)return false;input.value=String(text||'').trim();input.dataset.sourceType=meta?.sourceType||'ocr';buildTrustedProposal();return true};
    Capture.reviewRosterText=reviewRosterText;
  }

  function currentRosterIdentity(){var p=typeof profile==='function'?profile():null;return String(document.getElementById('rosterIdentityV31')?.value||p?.rosterIdentity||p?.name||'').trim()}
  function rememberRosterIdentity(identity){var p=typeof profile==='function'?profile():null;if(p&&identity&&p.rosterIdentity!==identity&&typeof saveProfileObj==='function')saveProfileObj(Object.assign({},p,{rosterIdentity:identity}))}
  function rosterOptions(identity){var p=typeof profile==='function'?profile():null,source=captureSource()||{};return{identity:identity,aliases:[p?.name,p?.rosterIdentity].filter(Boolean),title:(source.name||'Work')+' shift',dayStart:p?.fixed?.start||'07:00',dayEnd:p?.fixed?.end||'19:00',nightStart:'19:00',nightEnd:'07:00',now:new Date()}}
  function reviewRosterText(text,meta){
    if(!Roster)return false;
    selectTab('add',true);var identity=String(meta?.identity||currentRosterIdentity()).trim(),analysis=Roster.analyze(text,rosterOptions(identity));
    rosterReview={rawText:String(text||''),meta:meta||{},analysis:analysis,identity:identity};
    if(analysis.status!=='matched'&&analysis.status!=='no_shifts'){renderRosterIdentityPrompt();return true}
    rememberRosterIdentity(identity);var input=document.getElementById('smartCaptureInput');if(!input)return false;input.value=analysis.normalizedText||analysis.personalText||'';input.dataset.sourceType='roster';input.dataset.aiRoster='true';buildTrustedProposal();return true;
  }
  function escapeRegex(value){return String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
  function rosterTextForAI(){
    var analysis=rosterReview?.analysis||{},personal=String(analysis.personalText||'');
    [analysis.identity?.matched,rosterReview?.identity].filter(Boolean).forEach(function(identity){personal=personal.replace(new RegExp(escapeRegex(identity),'gi'),'[account holder]')});
    var headers=(analysis.headers||[]).map(function(header){return header.date||''}).filter(Boolean).join(', '),local=String(analysis.normalizedText||'');
    return('MATCHED ROSTER EXCERPT — contains only the account holder\'s row; no other employee should be inferred.\n'+personal+'\n\nDATE HEADERS: '+headers+'\n\nLOCAL EXTRACTION TO VERIFY:\n'+local).slice(0,12000);
  }
  function renderRosterIdentityPrompt(){
    var root=document.getElementById('smartCapturePreview');if(!root||!rosterReview)return;var analysis=rosterReview.analysis||{},identity=rosterReview.identity||currentRosterIdentity();
    root.innerHTML='<section class="rosterIdentityReviewV31"><small>ROSTER IDENTITY CHECK</small><h3>Which row belongs to you?</h3><p>'+safe(analysis.message||'Enter your name or employee ID exactly as it appears on the roster.')+'</p><label>Name, initials or employee ID<input id="rosterRetryIdentityV31" value="'+safe(identity)+'" autocomplete="name"></label><button class="primary" id="rosterRetryV31" type="button">Find only my shifts</button><div><b>Privacy safeguard</b><span>The full roster stays in memory only while you review it. Other employees’ rows are not added to your plan or saved with your account.</span></div></section>';
    document.getElementById('rosterRetryV31').onclick=function(){var value=document.getElementById('rosterRetryIdentityV31').value.trim();if(!value){document.getElementById('rosterRetryIdentityV31').focus();return}reviewRosterText(rosterReview.rawText,Object.assign({},rosterReview.meta,{identity:value}))};
    root.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function startVoiceCapture(){
    var Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,input=document.getElementById('smartCaptureInput'),button=document.getElementById('smartCaptureVoice');
    if(!Recognition||!input||!button){toast('Voice input is not supported in this browser');return}
    var recognition=new Recognition();recognition.lang='en-US';recognition.interimResults=false;button.disabled=true;button.textContent='Listening…';
    recognition.onresult=function(event){input.value+=(input.value?'\n':'')+event.results[0][0].transcript};
    recognition.onend=function(){button.disabled=false;button.textContent='Speak'};
    recognition.onerror=function(){button.disabled=false;button.textContent='Speak';toast('Voice input stopped. You can paste or type instead.')};
    recognition.start();
  }
  function aiProposalItems(items,source){
    return (items||[]).map(function(item){
      return {id:makeId('proposal'),kind:item.kind,date:item.date,title:item.title,start:item.start||'',end:item.end||'',overnight:!!(item.start&&item.end&&Core.minutes(item.end)<=Core.minutes(item.start)),reminder:item.kind==='todo'?30:0,sourceText:item.sourceText||'',sourceType:'ai',sourceId:item.kind==='work'?source.id:'',seriesId:makeId('series'),series:false,needsReview:!!item.needsReview,confidence:item.confidence||{label:'Low',score:0,reasons:['AI result needs review']}};
    });
  }
  function markAIConsistency(item,reason){
    var prior=item.confidence||{},reasons=(prior.reasons||[]).concat(reason).filter(function(value,index,list){return list.indexOf(value)===index}).slice(0,4),score=Math.min(.52,Math.max(.2,Number(prior.score)||.45));
    return Object.assign({},item,{needsReview:true,confidence:{score:score,label:'Low',reasons:reasons}});
  }
  function crossCheckAIProposal(items,localItems){
    var work=(localItems||[]).filter(function(item){return item.kind==='work'}),flagged=0,checked=(items||[]).map(function(item){
      if(item.kind!=='work')return item;
      var sameText=work.filter(function(local){return local.sourceText&&local.sourceText===item.sourceText}),sameDay=sameText.filter(function(local){return local.date===item.date});
      // A deterministic reader is not allowed to overwrite AI. It is only a
      // second set of eyes: disagreements become explicit confirmations.
      if(sameText.length===1&&(sameText[0].date!==item.date||sameText[0].start!==item.start||sameText[0].end!==item.end)){flagged++;return markAIConsistency(item,'AI and local date reader disagree — confirm this shift')}
      if(sameDay.length&&!(sameDay.some(function(local){return local.start===item.start&&local.end===item.end}))){flagged++;return markAIConsistency(item,'AI and local time reader disagree — confirm this shift')}
      return item;
    });
    return{items:checked,flagged:flagged};
  }
  async function readTypedScheduleWithAI(text,source,sourceType){
    var account=window.WGC18;
    if(!account?.session)return{unavailable:true,reason:'Sign in to use the AI schedule reader.'};
    if(!account?.config?.aiConfigured)return{unavailable:true,reason:'AI schedule reading is not enabled on this deployment.'};
    if(typeof account.accessToken!=='function')return{unavailable:true,reason:'Your sign-in session needs to be refreshed before AI can read this schedule.'};
    var token=await account.accessToken();if(!token)return{unavailable:true,reason:'Your sign-in session needs to be refreshed before AI can read this schedule.'};
    var response=await fetch('/api/v25/schedule',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({text:text,sourceType:sourceType||'text',referenceDate:Core.keyFromDate(new Date()),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'})});
    var body=await response.json().catch(function(){return{}});if(!response.ok||body.ok===false)throw Error(body.error||'AI schedule reading is unavailable.');
    return body;
  }
  async function buildTrustedProposal(){
    var input=document.getElementById('smartCaptureInput'),button=document.getElementById('smartCaptureBuild');if(!input)return;
    if(button){button.disabled=true;button.textContent='Reading your schedule…'}
    var source=resolveCaptureSource(),sourceId=source.id||enabledSources()[0]?.id||'work',sourceType=input.dataset.sourceType||'text',parsed,existing=existingForReview(),localParsed=Core.parseNaturalLanguage(input.value,{sourceId:sourceId,sourceType:sourceType,weeks:8});
    proposalParseNotice='';
    try{
      // A roster first goes through local identity matching. AI is optional and
      // receives only that matched row plus its date headers, never the upload.
      if(sourceType==='text'||sourceType==='roster'&&input.dataset.aiRoster==='true'){
        var aiText=sourceType==='roster'?rosterTextForAI():input.value,ai=await readTypedScheduleWithAI(aiText,source,sourceType);
        if(ai?.items?.length){var checked=crossCheckAIProposal(aiProposalItems(ai.items,source),localParsed);parsed=checked.items;proposalParseNotice=sourceType==='roster'?'AI double-checked your locally matched roster row. Review the calendar and any marked items before saving.':'AI interpreted your typed schedule. Review the calendar and any marked items before saving.';if(checked.flagged)proposalParseNotice+=' '+checked.flagged+' shift'+(checked.flagged===1?' needs':'s need')+' confirmation because the independent date reader disagreed.';if(ai.assumptions?.length)proposalParseNotice+=' Assumptions: '+ai.assumptions.join(' · ')}else if(ai?.unavailable){proposalParseNotice=ai.reason+' This is a local draft only, so every date should be confirmed before saving.'}
      }
    }catch(error){
      proposalParseNotice='AI schedule reading could not finish this note, so this is a local draft only. Review every date before saving.';
    }
    if(!parsed){parsed=localParsed;if(proposalParseNotice)parsed=parsed.map(function(item){return markAIConsistency(item,'AI accuracy check was unavailable — confirm this date before saving')})}
    proposals=Core.placeFlexibleEntries(parsed,existing,{now:new Date()});proposalConflicts=Core.detectConflicts(proposals,existing);
    if(sourceType==='roster'&&rosterReview?.analysis?.shifts)proposals=proposals.map(function(item){var matched=rosterReview.analysis.shifts.find(function(shift){return shift.date===item.date&&shift.start===item.start&&shift.end===item.end});return matched?Object.assign({},item,{sourceType:'roster',sourceText:matched.sourceText,confidence:matched.confidence,rosterIdentity:rosterReview.identity}):item});
    renderTrustedReview();
    if(button){button.disabled=false;button.innerHTML='Review my plan <span>→</span>'}
    input.dataset.sourceType='text';
  }
  function confidenceMarkup(item){var value=item.confidence||{label:'Low',score:0};return'<span class="confidenceV25 '+value.label.toLowerCase()+'" title="'+safe((value.reasons||[]).join(', '))+'">'+safe(value.label)+' · '+Math.round(value.score*100)+'%</span>'}
  function conflictsMarkup(item){
    var conflicts=proposalConflicts[item.id]||[];if(!conflicts.length)return'';
    var duplicate=conflicts.every(function(conflict){return conflict.type==='duplicate'}),messages=[...new Set(conflicts.map(function(conflict){return conflict.message}))];
    return'<div class="proposalConflictV25"><b>Conflict</b><span>'+messages.map(safe).join(' · ')+'</span><label>Choose what happens<select data-resolution="'+safe(item.id)+'"><option value="">Choose…</option><option value="keep">Keep both</option><option value="replace">Replace the existing item</option><option value="skip" '+(duplicate?'selected':'')+'>Skip this suggestion</option></select></label></div>';
  }
  function rosterSummaryMarkup(){
    if(!rosterReview||rosterReview.analysis?.status!=='matched')return'';var analysis=rosterReview.analysis,rotation=analysis.rotation,score=Math.round((analysis.identity?.confidence||0)*100);
    return'<section class="rosterSummaryV31"><header><span aria-hidden="true">✓</span><div><small>IDENTITY MATCHED · '+score+'%</small><h3>'+safe(analysis.identity?.requested||rosterReview.identity)+'</h3><p>'+analysis.shifts.length+' personal shifts found. Other employee rows were ignored.</p></div></header>'+(rotation?'<label class="rosterRotationV31"><input id="rosterRotationV31" type="checkbox" '+(rotation.confidence>=.82?'checked':'')+'><span><b>Continue the detected pattern</b><small>'+safe(rotation.label)+' · '+safe(rotation.pattern.join(' '))+' · '+Math.round(rotation.confidence*100)+'% confidence</small><em>When approved, this rotation continues automatically. Uploaded dates will not be duplicated.</em></span></label>':'<p class="rosterNoRotationV31">No reliable repeating pattern was assumed. Only the dated shifts below will be added.</p>')+'<p class="rosterPrivacyV31">The calendar proposal contains only your matched row. The original roster is not stored.</p></section>';
  }
  function renderTrustedReview(){
    var root=document.getElementById('smartCapturePreview');if(!root)return;
    if(!proposals.length){root.innerHTML='<p class="smartCaptureEmpty">Tell us at least one shift, appointment, workout or task.</p>';return}
    var groups={};proposals.forEach(function(item){(groups[item.seriesId]||(groups[item.seriesId]=[])).push(item)});
    var conflictCount=Object.keys(proposalConflicts).length,low=proposals.filter(function(item){return item.confidence?.label==='Low'}).length;
    root.innerHTML=rosterSummaryMarkup()+'<div class="trustReviewV25"><header><div><small>TRUSTED REVIEW</small><h3>See your proposed week before saving.</h3><p>Nothing changes until you approve it. Every date is individually selectable in the calendar below.</p>'+(proposalParseNotice?'<p class="proposalParseNoticeV25">'+safe(proposalParseNotice)+'</p>':'')+'</div><div class="reviewSignalsV25"><span><b>'+proposals.length+'</b> proposed</span><span class="'+(conflictCount?'warn':'')+'"><b>'+conflictCount+'</b> conflicts</span><span class="'+(low?'warn':'')+'"><b>'+low+'</b> low confidence</span></div></header>'+
      '<div class="proposalCalendarIntroV25"><div><b>Calendar preview</b><small>'+Object.values(groups).map(function(group){var first=group[0];return safe(first.title)+(group.length>1?' · '+group.length+' dates':'')}).join(' &nbsp;•&nbsp; ')+'</small></div><span>Tap a card to include or remove it</span></div>'+proposalCalendarMarkup()+proposalAttentionMarkup()+
      '<footer><button id="proposalClearV25">Clear</button><button id="proposalCalendarV25">Export selected</button><button class="primary" id="proposalSaveV25">Approve selected items</button></footer><p id="proposalStatusV25" role="status"></p></div>';
    document.getElementById('proposalClearV25').onclick=function(){proposals=[];proposalConflicts={};rosterReview=null;proposalParseNotice='';root.innerHTML='';document.getElementById('smartCaptureInput').value=''};
    document.getElementById('proposalSaveV25').onclick=saveTrustedProposal;
    document.getElementById('proposalCalendarV25').onclick=function(){exportSelectedCalendar(selectedProposalValues())};
    root.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function monthLabel(date){return date.toLocaleDateString(undefined,{month:'long',year:'numeric'})}
  function proposalCalendarMarkup(){
    var byMonth={};proposals.filter(function(item){return item.date&&!item.needsReview}).forEach(function(item){var date=Core.dateFromKey(item.date),key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');(byMonth[key]||(byMonth[key]=[])).push(item)});
    var keys=Object.keys(byMonth).sort();if(!keys.length)return'';
    return'<div class="proposalCalendarV25">'+keys.map(function(key){var parts=key.split('-').map(Number),month=new Date(parts[0],parts[1]-1,1),offset=month.getDay(),days=new Date(parts[0],parts[1],0).getDate(),items=byMonth[key];return'<section class="proposalMonthV25"><h4>'+monthLabel(month)+'</h4><div class="proposalWeekdaysV25"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="proposalMonthGridV25">'+Array.from({length:offset},function(){return'<div class="proposalDayV25 blank"></div>'}).join('')+Array.from({length:days},function(_,day){var date=Core.keyFromDate(new Date(parts[0],parts[1]-1,day)),dayItems=items.filter(function(item){return item.date===date});return'<div class="proposalDayV25 '+(dayItems.length?'hasItems':'')+'"><time datetime="'+date+'">'+day+'</time>'+dayItems.map(proposalCalendarChip).join('')+'</div>'}).join('')+'</div></section>'}).join('')+'</div>';
  }
  function proposalCalendarChip(item){
    var source=sourceById(item.sourceId)||{},time=item.start?(formatTime(item.start)+(item.end?'–'+formatTime(item.end):'')):'Any time',workSource=item.kind==='work'?'<input type="hidden" value="'+safe(item.sourceId)+'" data-proposal-source="'+safe(item.id)+'">':'';
    return'<label class="proposalCalendarChipV25 '+safe(item.kind)+' '+(proposalConflicts[item.id]?'hasConflict':'')+'" style="--proposal-color:'+safe(source.color||Core.COLORS[0])+'"><input type="checkbox" checked data-proposal-check="'+safe(item.id)+'" aria-label="Include '+safe(item.title)+' on '+friendlyDate(item.date)+'"><span><b>'+safe(item.title)+'</b><small>'+safe(time)+(proposalConflicts[item.id]?' · conflict':'')+'</small></span>'+workSource+'<input type="hidden" value="'+safe(item.date)+'" data-proposal-date="'+safe(item.id)+'"></label>';
  }
  function proposalAttentionMarkup(){
    var needsDate=proposals.filter(function(item){return item.needsReview}),conflicts=proposals.filter(function(item){return proposalConflicts[item.id]?.length});if(!needsDate.length&&!conflicts.length)return'';
    return'<section class="proposalAttentionV25"><h4>Needs your attention</h4>'+(needsDate.length?'<div class="proposalUnknownDatesV25">'+needsDate.map(function(item){var source=item.kind==='work'?'<input type="hidden" value="'+safe(item.sourceId)+'" data-proposal-source="'+safe(item.id)+'">':'',warning=item.confidence?.reasons?.includes('weekday and calendar date disagree')?'The weekday and calendar date disagree. Choose the correct date before saving.':(item.sourceText||'We could not confirm the date.');return'<label class="proposalUnknownDateV25"><input type="checkbox" data-proposal-check="'+safe(item.id)+'" aria-label="Include '+safe(item.title)+'"><span><b>'+safe(item.title)+'</b><small>'+safe(warning)+'</small></span><input type="date" value="'+safe(item.date)+'" data-proposal-date="'+safe(item.id)+'" aria-label="Confirm date for '+safe(item.title)+'">'+source+'</label>'}).join('')+'</div>':'')+(conflicts.length?'<div class="proposalConflictListV25">'+conflicts.map(function(item){return'<article><div><b>'+safe(item.title)+'</b><small>'+friendlyDate(item.date)+'</small></div>'+conflictsMarkup(item)+'</article>'}).join('')+'</div>':'')+'</section>';
  }
  function proposalRow(item){
    var source=item.kind==='work'?'<select data-proposal-source="'+safe(item.id)+'" aria-label="Work source">'+sourceOptions(item.sourceId)+'</select>':'';
    return'<article class="proposalRowV25 '+(proposalConflicts[item.id]?'hasConflict':'')+'"><div class="proposalMainV25"><input type="checkbox" '+(item.needsReview?'':'checked')+' data-proposal-check="'+safe(item.id)+'" aria-label="Select '+safe(item.title)+'"><i class="'+safe(item.kind)+'">'+safe(item.kind.charAt(0).toUpperCase())+'</i><span><b>'+safe(item.title)+'</b><small>'+friendlyDate(item.date)+(item.start?' · '+formatTime(item.start):'')+(item.end?'–'+formatTime(item.end):'')+(item.overnight?' · overnight':'')+(item.suggestion?' · '+safe(item.suggestion):'')+'</small></span>'+confidenceMarkup(item)+source+'</div>'+(item.needsReview?'<label class="reviewDateV25">Confirm date<input type="date" value="'+safe(item.date)+'" data-proposal-date="'+safe(item.id)+'"></label>':'<input type="hidden" value="'+safe(item.date)+'" data-proposal-date="'+safe(item.id)+'">')+conflictsMarkup(item)+'</article>';
  }
  function selectedProposalValues(){
    var root=document.getElementById('smartCapturePreview');return proposals.map(function(item){var check=root.querySelector('[data-proposal-check="'+item.id+'"]');if(!check?.checked)return null;return Object.assign({},item,{date:root.querySelector('[data-proposal-date="'+item.id+'"]')?.value||item.date,sourceId:root.querySelector('[data-proposal-source="'+item.id+'"]')?.value||item.sourceId,resolution:root.querySelector('[data-resolution="'+item.id+'"]')?.value||''})}).filter(Boolean)
  }
  function icsStamp(date,time){return String(date||'').replaceAll('-','')+'T'+String(time||'09:00').replace(':','')+'00'}
  function icsText(value){return String(value||'').replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\n','\\n')}
  function exportSelectedCalendar(items){
    if(!items.length){toast('Select at least one item to export');return}
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Work and Workout//Planner v25//EN','CALSCALE:GREGORIAN'];
    items.forEach(function(item){var endDate=item.overnight?Core.keyFromDate(Core.addDays(Core.dateFromKey(item.date),1)):item.date,end=item.end||item.start||'09:30';lines.push('BEGIN:VEVENT','UID:'+icsText(item.id)+'@workandworkout.com','DTSTAMP:'+new Date().toISOString().replaceAll('-','').replaceAll(':','').replace(/\.\d{3}Z$/,'Z'),'DTSTART:'+icsStamp(item.date,item.start||'09:00'),'DTEND:'+icsStamp(endDate,end),'SUMMARY:'+icsText(item.title),'DESCRIPTION:'+icsText('Proposed by Work + Workout. Review before importing.'),'END:VEVENT')});
    lines.push('END:VCALENDAR');
    var url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='work-and-workout-plan.ics';link.click();setTimeout(function(){URL.revokeObjectURL(url)},1000);toast(items.length+' items exported for your calendar')
  }
  function removeConflictTargets(item,allEvents,allItems,allRotations){
    (proposalConflicts[item.id]||[]).forEach(function(conflict){var target=conflict.event;if(target.storage==='v25'||String(target.id).startsWith('event-')||String(target.id).startsWith('remote-'))allEvents=allEvents.filter(function(event){return event.id!==target.id});else if(target.storage==='personal'){if(allItems[target.date])allItems[target.date]=allItems[target.date].filter(function(entry){return entry.id!==target.id})}else if(target.rotationId){allRotations=allRotations.map(function(rotation){if(rotation.id!==target.rotationId)return rotation;var copy=Object.assign({},rotation,{exceptions:Object.assign({},rotation.exceptions)});copy.exceptions[target.date]={action:'skip',createdAt:new Date().toISOString()};return copy})}else if(target.storage==='legacy'){var legacy=jget(PREFIX+'smart-work-dates',{});delete legacy[target.date];jset(PREFIX+'smart-work-dates',legacy)}});
    return{allEvents:allEvents,allItems:allItems,allRotations:allRotations};
  }
  function saveTrustedProposal(){
    var selected=selectedProposalValues(),status=document.getElementById('proposalStatusV25');if(!selected.length){if(status)status.textContent='Select at least one item.';return}
    var unresolved=selected.filter(function(item){return proposalConflicts[item.id]?.length&&!item.resolution});
    if(unresolved.length){if(status){status.textContent='Choose Keep, Replace or Skip for every conflict.';status.classList.add('bad')}document.querySelector('[data-resolution="'+unresolved[0].id+'"]')?.focus();return}
    var useRosterRotation=!!(rosterReview?.analysis?.rotation&&document.getElementById('rosterRotationV31')?.checked),rosterWork=proposals.filter(function(item){return item.sourceType==='roster'&&item.kind==='work'}),selectedRosterWork=selected.filter(function(item){return item.sourceType==='roster'&&item.kind==='work'});
    if(useRosterRotation&&selectedRosterWork.length!==rosterWork.length){if(status){status.textContent='Select every extracted roster shift to continue the full pattern, or turn off “Continue the detected pattern”.';status.classList.add('bad')}return}
    var allEvents=events(),allItems=typeof dayItems==='function'?dayItems():jget(PREFIX+'calendar-items',{}),allRotations=rotations(),now=new Date().toISOString(),saved=0,rotationSaved=false;
    if(useRosterRotation){
      var inferred=rosterReview.analysis.rotation,rotationSource=sourceById(selectedRosterWork[0]?.sourceId)||enabledSources()[0]||{id:'work',name:'Work'},rotationExceptions={};selectedRosterWork.forEach(function(item){if(item.resolution==='replace'){var removed=removeConflictTargets(item,allEvents,allItems,allRotations);allEvents=removed.allEvents;allItems=removed.allItems;allRotations=removed.allRotations}else if(item.resolution==='skip')rotationExceptions[item.date]={action:'skip',createdAt:now}});var sameRotation=allRotations.some(function(rotation){return rotation.sourceId===rotationSource.id&&rotation.anchor===inferred.anchor&&Core.parsePattern(rotation.pattern).join('')===inferred.pattern.join('')});
      if(!sameRotation){allRotations.push(Core.normalizeRotation({id:makeId('rotation'),name:(rotationSource.name||'Work')+' roster rotation',sourceId:rotationSource.id,preset:'custom',anchor:inferred.anchor,pattern:inferred.pattern,dayStart:inferred.dayStart,dayEnd:inferred.dayEnd,nightStart:inferred.nightStart,nightEnd:inferred.nightEnd,exceptions:rotationExceptions,active:true,confidence:{label:inferred.confidence>=.85?'High':'Medium',score:inferred.confidence,reasons:['Repeated pattern detected in uploaded roster']},provenance:{type:'roster',fileName:rosterReview.meta?.fileName||'',identity:rosterReview.identity,sourceDates:inferred.sourceDates},createdAt:now,updatedAt:now}));rotationSaved=true;saved++}
    }
    selected.forEach(function(item){
      if(item.resolution==='skip')return;
      if(useRosterRotation&&item.sourceType==='roster'&&item.kind==='work')return;
      if(item.resolution==='replace'){var removed=removeConflictTargets(item,allEvents,allItems,allRotations);allEvents=removed.allEvents;allItems=removed.allItems;allRotations=removed.allRotations}
      if(item.kind==='work'){
        var source=sourceById(item.sourceId)||{};
        if(!allEvents.some(function(existing){return Core.sameEvent(existing,item)&&existing.sourceId===item.sourceId}))allEvents.push({id:makeId('event'),kind:'work',date:item.date,title:item.title,start:item.start,end:item.end,overnight:item.overnight,sourceId:item.sourceId,sourceName:source.name||'Work',color:source.color||Core.COLORS[0],externalId:item.externalId||'',provider:item.provider||'',confidence:item.confidence,provenance:{type:item.sourceType||'text',raw:item.sourceText||''},createdAt:now,updatedAt:now});
      }else{
        allItems[item.date]=allItems[item.date]||[];
        if(!allItems[item.date].some(function(existing){return existing.title===item.title&&existing.time===item.start}))allItems[item.date].push({id:makeId('agenda'),title:item.title,time:item.start||'',end:item.end||'',type:item.kind==='event'||item.kind==='workout'?'event':'todo',category:item.kind,reminderMinutes:item.reminder||0,done:false,externalId:item.externalId||'',provider:item.provider||'',confidence:item.confidence,provenance:{type:item.sourceType||'text',raw:item.sourceText||''},createdAt:now,updatedAt:now});
      }
      saved++;
    });
    saveEvents(allEvents);saveRotations(allRotations);if(typeof saveDayItems==='function')saveDayItems(allItems);else jset(PREFIX+'calendar-items',allItems);
    proposals=[];proposalConflicts={};rosterReview=null;if(typeof renderAll==='function')renderAll();renderWeekPulse(selectedDate||dkey());
    var input=document.getElementById('smartCaptureInput');if(input)input.value='';
    document.getElementById('smartCapturePreview').innerHTML='<div class="smartCaptureSuccess"><i>✓</i><span><b>'+(rotationSaved?'Roster pattern approved.':saved+' items approved.')+'</b><small>'+(rotationSaved?'Your work rotation now populates future calendar dates automatically.':'Your schedule was updated without silently replacing anything.')+'</small></span><button id="trustedOpenCalendarV25">Open calendar</button></div>';
    document.getElementById('trustedOpenCalendarV25').onclick=function(){selectTab('calendar',true)};toast(rotationSaved?'Work rotation added to your calendar':saved+' calendar items added');
  }

  function renderSources(){
    var root=document.getElementById('sourceManagerV25');if(!root)return;var list=sources();
    root.innerHTML='<div class="managerHeadV25"><div><small>WORK SOURCES</small><h2>Only show the work you actually have.</h2><p>Add one employer or several. Every source gets its own color, hours and overtime threshold.</p></div><span>'+list.filter(function(item){return item.enabled!==false}).length+' active</span></div><div class="sourceGridV25">'+list.map(function(source){var used=events().filter(function(event){return event.sourceId===source.id}).length,ruleCount=rotations().filter(function(rotation){return rotation.sourceId===source.id}).length;return'<article><i style="background:'+safe(source.color)+'"></i><div><b>'+safe(source.name)+'</b><small>'+used+' saved shifts · '+ruleCount+' rotation'+(ruleCount===1?'':'s')+' · overtime after '+(source.overtimeThreshold||40)+'h</small></div><span class="sourceActionsV25"><button data-source-toggle="'+safe(source.id)+'">'+(source.enabled===false?'Enable':'Disable')+'</button><button data-source-edit="'+safe(source.id)+'">Edit</button></span></article>'}).join('')+'</div><form id="sourceFormV25" class="managerFormV25"><h3>'+(sourceEditId?'Edit work source':'Add a work source')+'</h3><label>Name<input id="sourceNameV25" maxlength="60" required placeholder="Hospital, construction crew, school…"></label><label>Color<select id="sourceColorV25">'+Core.COLORS.map(function(color,index){return'<option value="'+color+'">Color '+(index+1)+'</option>'}).join('')+'</select></label><label>Overtime threshold<input id="sourceOvertimeV25" type="number" min="1" max="100" value="40"></label><button class="primary" type="submit">'+(sourceEditId?'Save changes':'Add source')+'</button>'+(sourceEditId?'<button type="button" id="sourceCancelV25">Cancel</button>':'')+'</form>';
    root.querySelectorAll('[data-source-toggle]').forEach(function(button){button.onclick=function(){saveSources(sources().map(function(source){return source.id===button.dataset.sourceToggle?Object.assign({},source,{enabled:source.enabled===false,updatedAt:new Date().toISOString()}):source}));renderSources();renderCalendar()}});
    root.querySelectorAll('[data-source-edit]').forEach(function(button){button.onclick=function(){sourceEditId=button.dataset.sourceEdit;renderSources();var source=sourceById(sourceEditId);document.getElementById('sourceNameV25').value=source.name;document.getElementById('sourceColorV25').value=source.color;document.getElementById('sourceOvertimeV25').value=source.overtimeThreshold||40;document.getElementById('sourceNameV25').focus()}});
    document.getElementById('sourceFormV25').onsubmit=function(event){event.preventDefault();var name=document.getElementById('sourceNameV25').value.trim(),color=document.getElementById('sourceColorV25').value,threshold=Math.max(1,Number(document.getElementById('sourceOvertimeV25').value)||40),list=sources();if(sourceEditId)list=list.map(function(source){return source.id===sourceEditId?Object.assign({},source,{name:name,color:color,overtimeThreshold:threshold,updatedAt:new Date().toISOString()}):source});else list.push({id:makeId('source'),name:name,color:color,overtimeThreshold:threshold,enabled:true,createdAt:new Date().toISOString()});sourceEditId='';saveSources(list);renderSources();captureSourceControl();renderCalendar()};
    document.getElementById('sourceCancelV25')?.addEventListener('click',function(){sourceEditId='';renderSources()});
  }

  function renderRotations(){
    var root=document.getElementById('rotationManagerV25');if(!root)return;var list=rotations();
    root.innerHTML='<div class="managerHeadV25"><div><small>ROTATION ENGINE</small><h2>Set the pattern once. Exceptions stay exceptions.</h2><p>Rotations have no end date. The calendar computes future shifts as needed and never rewrites the base pattern for a one-off change.</p></div><span>'+list.filter(function(item){return item.active!==false}).length+' active</span></div><div class="rotationGridV25">'+list.map(rotationCard).join('')+'</div>'+rotationFormMarkup()+exceptionFormMarkup();
    root.querySelectorAll('[data-rotation-toggle]').forEach(function(button){button.onclick=function(){saveRotations(rotations().map(function(rotation){return rotation.id===button.dataset.rotationToggle?Object.assign({},rotation,{active:rotation.active===false,updatedAt:new Date().toISOString()}):rotation}));renderRotations();renderCalendar()}});
    root.querySelectorAll('[data-rotation-delete]').forEach(function(button){button.onclick=function(){if(!confirm('Delete this rotation? Saved one-off shifts will stay.'))return;saveRotations(rotations().filter(function(rotation){return rotation.id!==button.dataset.rotationDelete}));renderRotations();renderCalendar()}});
    var preset=document.getElementById('rotationPresetV25');preset.onchange=function(){document.getElementById('customPatternWrapV25').hidden=preset.value!=='custom';document.getElementById('nightTimesWrapV25').hidden=preset.value!=='rotating_nights'&&preset.value!=='custom'};
    document.getElementById('rotationFormV25').onsubmit=saveRotationFromForm;
    document.getElementById('exceptionFormV25').onsubmit=saveExceptionFromForm;
  }
  function rotationCard(rotation){var source=sourceById(rotation.sourceId)||{},pattern=Core.parsePattern(rotation.pattern),next=Core.projectRotation(rotation,Core.keyFromDate(new Date()),Core.keyFromDate(Core.addDays(new Date(),27)),source);return'<article><header><i style="background:'+safe(source.color||Core.COLORS[0])+'"></i><div><b>'+safe(rotation.name)+'</b><small>'+safe(source.name||'Work')+' · '+pattern.join(' ')+'</small></div></header><p><b>'+next.length+'</b> shifts in the next 4 weeks · '+Object.keys(rotation.exceptions||{}).length+' exceptions</p><div><button data-rotation-toggle="'+safe(rotation.id)+'">'+(rotation.active===false?'Enable':'Pause')+'</button><button class="dangerText" data-rotation-delete="'+safe(rotation.id)+'">Delete</button></div></article>'}
  function rotationFormMarkup(){return'<form id="rotationFormV25" class="managerFormV25 rotationFormV25"><h3>Add a recurring rotation</h3><label>Work source<select id="rotationSourceV25">'+sourceOptions(enabledSources()[0]?.id)+'</select></label><label>Rotation name<input id="rotationNameV25" required maxlength="60" placeholder="Day shift rotation"></label><label>Pattern<select id="rotationPresetV25"><option value="four_two">4 on / 2 off</option><option value="alternating_weekends">Alternating weekends</option><option value="rotating_nights">Rotating days and nights</option><option value="custom">Custom cycle</option></select></label><label>Cycle starts<input id="rotationAnchorV25" type="date" value="'+Core.keyFromDate(new Date())+'" required></label><label>Day shift starts<input id="rotationDayStartV25" type="time" value="07:00" required></label><label>Day shift ends<input id="rotationDayEndV25" type="time" value="19:00" required></label><div id="nightTimesWrapV25" class="formSubgridV25" hidden><label>Night starts<input id="rotationNightStartV25" type="time" value="19:00"></label><label>Night ends<input id="rotationNightEndV25" type="time" value="07:00"></label></div><label id="customPatternWrapV25" class="wideLabelV25" hidden>Custom cycle (D = day, N = night, O = off)<input id="rotationPatternV25" placeholder="D,D,D,D,O,O,N,N,N,N,O,O"></label><button class="primary" type="submit">Save rotation</button></form>'}
  function exceptionFormMarkup(){return'<form id="exceptionFormV25" class="managerFormV25"><h3>Add a one-off exception</h3><label>Rotation<select id="exceptionRotationV25">'+rotations().map(function(rotation){return'<option value="'+safe(rotation.id)+'">'+safe(rotation.name)+'</option>'}).join('')+'</select></label><label>Date<input id="exceptionDateV25" type="date" required></label><label>Change<select id="exceptionActionV25"><option value="skip">Not working this date</option><option value="replace">Different shift time</option></select></label><label>Replacement starts<input id="exceptionStartV25" type="time"></label><label>Replacement ends<input id="exceptionEndV25" type="time"></label><button type="submit">Save exception</button></form>'}
  function saveRotationFromForm(event){event.preventDefault();var preset=document.getElementById('rotationPresetV25').value,custom=document.getElementById('rotationPatternV25').value,pattern=preset==='custom'?Core.parsePattern(custom):Core.patternFromPreset(preset);if(!pattern.length){toast('Add at least one D, N or O to the custom cycle');return}var now=new Date().toISOString(),rotation=Core.normalizeRotation({id:makeId('rotation'),name:document.getElementById('rotationNameV25').value.trim(),sourceId:document.getElementById('rotationSourceV25').value,preset:preset,anchor:document.getElementById('rotationAnchorV25').value,pattern:pattern,dayStart:document.getElementById('rotationDayStartV25').value,dayEnd:document.getElementById('rotationDayEndV25').value,nightStart:document.getElementById('rotationNightStartV25').value,nightEnd:document.getElementById('rotationNightEndV25').value,exceptions:{},active:true,createdAt:now,updatedAt:now});saveRotations(rotations().concat(rotation));renderRotations();renderCalendar();toast('Rotation saved with no end date')}
  function saveExceptionFromForm(event){event.preventDefault();var id=document.getElementById('exceptionRotationV25').value,date=document.getElementById('exceptionDateV25').value,action=document.getElementById('exceptionActionV25').value;if(!id||!date){toast('Choose a rotation and date');return}saveRotations(rotations().map(function(rotation){if(rotation.id!==id)return rotation;var exceptions=Object.assign({},rotation.exceptions);exceptions[date]={action:action,start:document.getElementById('exceptionStartV25').value,end:document.getElementById('exceptionEndV25').value,createdAt:new Date().toISOString()};return Object.assign({},rotation,{exceptions:exceptions,updatedAt:new Date().toISOString()})}));renderRotations();renderCalendar();toast('Exception saved without changing the rotation')}

  function renderWeekPulse(key){
    var root=document.getElementById('plannerWeekPulse');if(!root)return;var start=Core.startOfWeek(key||dkey()),end=Core.keyFromDate(Core.addDays(Core.dateFromKey(start),6)),current=allWorkForRange(start,end),summary=Core.weeklySummary(current,key||dkey(),sources());
    root.innerHTML='<span><b>'+summary.totalHours+'h</b><small>work this week</small></span><span class="'+(summary.conflicts.length?'warn':'')+'"><b>'+summary.conflicts.length+'</b><small>shift conflicts</small></span><span><b>'+enabledSources().length+'</b><small>work source'+(enabledSources().length===1?'':'s')+'</small></span>';
    var status=document.getElementById('plannerWorkspaceStatus');if(status)status.textContent=summary.conflicts.length?'Review overlapping work before committing to the week.':'Your current week has no overlapping work shifts.';
  }
  function weekSummaryMarkup(key){var start=Core.startOfWeek(key),end=Core.keyFromDate(Core.addDays(Core.dateFromKey(start),6)),current=allWorkForRange(start,end),summary=Core.weeklySummary(current,key,sources());return'<section class="weekSummaryV25"><header><div><small>WEEK OF '+safe(friendlyDate(start).toUpperCase())+'</small><h2>'+summary.totalHours+' work hours</h2></div><div class="weekSummaryActionsV25"><span class="'+(summary.conflicts.length?'warn':'good')+'">'+(summary.conflicts.length?summary.conflicts.length+' conflicts':'No shift conflicts')+'</span><button id="calendarClearV25" type="button">Clear calendar</button></div></header><div>'+summary.totals.map(function(total){return'<article><i style="background:'+safe(total.source.color||Core.COLORS[0])+'"></i><span><b>'+safe(total.source.name)+'</b><small>'+total.hours+'h scheduled</small></span><em class="'+(total.overtime?'warn':'')+'">'+(total.overtime?total.overtime+'h overtime':'Within '+(total.source.overtimeThreshold||40)+'h')+'</em></article>'}).join('')+'</div></section>'}
  function clearCalendarContent(){
    if(!confirm('Clear this calendar? This removes work shifts, rotations, tasks, appointments and recurring commitments from Work + Workout. It keeps your account, saved employer names, workout history, nutrition and any Google or Outlook events.'))return;
    saveEvents([]);saveRotations([]);
    if(typeof saveDayItems==='function')saveDayItems({});else jset(PREFIX+'calendar-items',{});
    jset(PREFIX+'smart-work-dates',{});
    if(typeof saveOverrides==='function')saveOverrides({});
    var onboarding=jget(PREFIX+'onboarding-v18',null);
    if(onboarding?.answers?.work){var answers=Object.assign({},onboarding.answers,{work:Object.assign({},onboarding.answers.work,{commitments:[],secondaryDays:[]})});jset(PREFIX+'onboarding-v18',Object.assign({},onboarding,{answers:answers}))}
    var current=typeof profile==='function'?profile():null;
    if(current&&typeof saveProfileObj==='function')saveProfileObj(Object.assign({},current,{fixed:Object.assign({},current.fixed,{enabled:false}),variable:Object.assign({},current.variable,{enabled:false})}));
    proposals=[];proposalConflicts={};rosterReview=null;window.WGC18?.queueSync?.();renderCalendar();renderWeekSummary(selectedDate||dkey());toast('Calendar cleared. Your account and health history are unchanged.');
  }
  function renderWeekSummary(key){var pane=document.getElementById('plannerPane-calendar');if(!pane)return;var existing=document.getElementById('weekSummaryV25');if(existing)existing.remove();pane.insertAdjacentHTML('afterbegin',weekSummaryMarkup(key||selectedDate||dkey()).replace('class="weekSummaryV25"','id="weekSummaryV25" class="weekSummaryV25"'));document.getElementById('calendarClearV25').onclick=clearCalendarContent;renderWeekPulse(key||selectedDate||dkey())}
  function bindCalendarClearActions(){document.querySelectorAll('#calendarClearV25,#calendarClearWorkspaceV25').forEach(function(button){button.onclick=clearCalendarContent})}
  function legendMarkup(){return enabledSources().map(function(source){return'<span><i class="dot" style="background:'+safe(source.color)+'"></i>'+safe(source.name)+'</span>'}).join('')+'<span><i class="dot green"></i>Training</span><span><i class="dot purple"></i>Plans</span>'}
  function workDots(rows){return rows.slice(0,3).map(function(row){return'<i class="dot" style="background:'+safe(row.color||Core.COLORS[0])+'"></i>'}).join('')}

  function apiFetch(action,options){
    var session=window.WGC18?.session||null,headers=Object.assign({'Content-Type':'application/json'},options?.headers||{});if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
    return fetch('/api/v25/calendar?action='+encodeURIComponent(action),Object.assign({},options,{headers:headers})).then(async function(response){var body=await response.json().catch(function(){return{}});if(!response.ok)throw Error(body.error||'Calendar request failed');return body});
  }
  function renderSync(){
    var root=document.getElementById('calendarSyncV25');if(!root)return;
    root.innerHTML='<div class="managerHeadV25"><div><small>CALENDAR SYNC</small><h2>Your work plan and personal calendar, together.</h2><p>Connections use provider OAuth. Tokens stay encrypted on the server and are never stored in this browser.</p></div><span id="syncReadinessV25">Checking…</span></div><div id="syncProvidersV25" class="syncProvidersV25"><article><i class="googleMarkV25">G</i><div><b>Google Calendar</b><small>Two-way event changes with review before import</small></div><button disabled>Checking…</button></article><article><i class="outlookMarkV25">O</i><div><b>Outlook Calendar</b><small>Microsoft 365 and Outlook.com</small></div><button disabled>Checking…</button></article></div><div class="syncTrustV25"><b>How trust works</b><p>Local changes are pushed only after you approve them. Remote additions and edit collisions return to the same trusted review—nothing silently replaces your plan.</p></div><p id="syncStatusV25" role="status"></p>';
    apiFetch('status',{method:'GET'}).then(renderSyncStatus).catch(function(error){document.getElementById('syncReadinessV25').textContent='Sign in required';document.getElementById('syncStatusV25').textContent=error.message});
  }
  function renderSyncStatus(result){
    var ready=document.getElementById('syncReadinessV25'),root=document.getElementById('syncProvidersV25');if(!root)return;ready.textContent=result.configuredCount?result.configuredCount+' provider'+(result.configuredCount===1?'':'s')+' ready':'OAuth setup required';
    root.innerHTML=['google','microsoft'].map(function(provider){var label=provider==='google'?'Google Calendar':'Outlook Calendar',configured=result.providers?.[provider]?.configured,connection=(result.connections||[]).find(function(item){return item.provider===provider}),connected=connection?.status==='active';return'<article><i class="'+provider+'MarkV25">'+(provider==='google'?'G':'O')+'</i><div><b>'+label+'</b><small>'+(connected?'Connected'+(connection.lastSyncedAt?' · synced '+new Date(connection.lastSyncedAt).toLocaleString():''):configured?'Ready to connect':'Provider credentials not configured yet')+'</small></div>'+(connected?'<span class="syncButtonsV25"><button class="primary" data-sync-now="'+provider+'">Sync now</button><button data-sync-disconnect="'+provider+'">Disconnect</button></span>':'<button '+(configured?'':'disabled')+' data-sync-connect="'+provider+'">Connect</button>')+'</article>'}).join('');
    root.querySelectorAll('[data-sync-connect]').forEach(function(button){button.onclick=function(){beginConnect(button.dataset.syncConnect)}});root.querySelectorAll('[data-sync-now]').forEach(function(button){button.onclick=function(){syncNow(button.dataset.syncNow)}});root.querySelectorAll('[data-sync-disconnect]').forEach(function(button){button.onclick=function(){disconnectCalendar(button.dataset.syncDisconnect)}});
  }
  function beginConnect(provider){var status=document.getElementById('syncStatusV25');status.textContent='Opening secure '+provider+' authorization…';apiFetch('connect',{method:'POST',body:JSON.stringify({provider:provider,returnTo:location.origin+'/'})}).then(function(result){location.assign(result.authorizationUrl)}).catch(function(error){status.textContent=error.message})}
  function exportSyncEvents(){
    var start=Core.keyFromDate(Core.addDays(new Date(),-30)),end=Core.keyFromDate(Core.addDays(new Date(),180)),work=Core.eventsForRange({events:events(),rotations:rotations(),sources:sources()},start,end),personal=personalExisting(start,end);
    return work.concat(personal).filter(function(item){return item.start&&item.end}).map(function(item){return{id:item.id,kind:item.kind,title:item.title,date:item.date,start:item.start,end:item.end,updatedAt:item.updatedAt||item.createdAt||new Date().toISOString(),sourceId:item.sourceId||'',sourceName:sourceById(item.sourceId)?.name||'',externalId:item.externalId||'',provider:item.provider||''}})
  }
  function syncNow(provider){var status=document.getElementById('syncStatusV25');status.textContent='Comparing both calendars safely…';apiFetch('sync',{method:'POST',body:JSON.stringify({provider:provider,events:exportSyncEvents(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'})}).then(function(result){status.textContent=result.message||'Sync complete';if(result.proposals?.length){proposals=result.proposals;var existing=existingForReview();proposalConflicts=Core.detectConflicts(proposals,existing);proposals.forEach(function(proposal){if(!proposal.conflictTargetId)return;var target=existing.find(function(item){return item.id===proposal.conflictTargetId});if(target)(proposalConflicts[proposal.id]||(proposalConflicts[proposal.id]=[])).push({type:'external-update',event:target,message:proposal.conflictMessage||'Changed in both calendars'})});selectTab('add',true);renderTrustedReview()}else renderSync()}).catch(function(error){status.textContent=error.message})}
  function disconnectCalendar(provider){if(!confirm('Disconnect this calendar? Existing events stay in both calendars.'))return;apiFetch('disconnect',{method:'POST',body:JSON.stringify({provider:provider})}).then(function(){renderSync();toast('Calendar disconnected')}).catch(function(error){document.getElementById('syncStatusV25').textContent=error.message})}

  function patchCalendarModel(){
    window.workScheduleRows=workRowsOn;
    window.variableCode=function(key){return workEventsOn(key).length?'X':(typeof legacyVariableCode==='function'?legacyVariableCode(key):'D')};
  }
  function handleOAuthReturn(){var query=new URLSearchParams(location.search);if(query.get('calendar')==='connected'){sessionStorage.setItem('ww-planner-tab','sync');history.replaceState({},'',location.pathname+location.hash);setTimeout(function(){selectTab('sync',true);toast('Calendar connected')},500)}}
  function mount(){
    if(mounting)return;mounting=true;
    try{
      ensureSources();patchCalendarModel();var calendar=document.getElementById('page-calendar');if(!calendar)return;
      var firstMount=!document.getElementById('plannerWorkspaceV25');
      if(firstMount)calendar.insertAdjacentHTML('afterbegin',workspaceMarkup());
      arrangeWorkspace();bindTabs();bindTrustedCapture();bindCalendarClearActions();
      if(firstMount){renderSources();renderRotations();renderWeekSummary(selectedDate||dkey());var saved=sessionStorage.getItem('ww-planner-tab')||'calendar';selectTab(saved,false)}
      document.body.classList.add('schedulePlatformV25');
    }finally{mounting=false}
  }
  function boot(){mount();handleOAuthReturn();var queued=false;new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;mount()})}).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('wgc:authchange',function(){setTimeout(mount,80)})}

  V.sources=sources;V.events=events;V.rotations=rotations;V.workEventsOn=workEventsOn;V.workRowsOn=workRowsOn;V.legendMarkup=legendMarkup;V.workDots=workDots;V.renderWeekSummary=renderWeekSummary;V.clearCalendarContent=clearCalendarContent;V.selectTab=selectTab;V.renderTrustedReview=renderTrustedReview;V.reviewRosterText=reviewRosterText;V.exportSyncEvents=exportSyncEvents;V.mount=mount;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
