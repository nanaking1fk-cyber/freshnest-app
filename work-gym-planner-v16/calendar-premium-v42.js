// Work + Workout v42 — quiet calendar, guided scheduling, holidays and PDF sharing.
(function calendarPremiumV42(window){
  'use strict';

  var Core=window.WWScheduling;
  if(!Core)return;

  var V=window.WWV25=window.WWV25||{};
  var API=window.WWCalendarV42=window.WWCalendarV42||{};
  var KEY={
    holiday:PREFIX+'calendar-holiday-settings-v42',
    filters:PREFIX+'calendar-filters-v42',
    view:PREFIX+'calendar-view-v42'
  };
  var defaultFilters={work:true,workout:true,holidays:true,overtime:true,timeOff:true,personal:true};
  var flow=null,decorating=false,scheduled=false,pdfUrl='';

  function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]})}
  function read(key,fallback){try{return typeof jget==='function'?jget(key,fallback):JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
  function write(key,value){if(typeof jset==='function')jset(key,value);else localStorage.setItem(key,JSON.stringify(value));window.WGC18?.queueSync?.()}
  function id(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
  function today(){return Core.keyFromDate(new Date())}
  function activeDate(){return typeof selectedDate==='string'&&selectedDate?selectedDate:today()}
  function dateLabel(key,options){return Core.dateFromKey(key).toLocaleDateString(undefined,options||{weekday:'long',month:'long',day:'numeric'})}
  function timeLabel(value){if(!value)return'';var parts=value.split(':').map(Number),hour=parts[0],minute=parts[1]||0;return(hour%12||12)+':'+String(minute).padStart(2,'0')+' '+(hour>=12?'PM':'AM')}
  function rangeKeys(start,end){var values=[];for(var cursor=Core.dateFromKey(start),finish=Core.dateFromKey(end);cursor<=finish;cursor=Core.addDays(cursor,1))values.push(Core.keyFromDate(cursor));return values.slice(0,370)}
  function sources(){return V.sources?.()||[]}
  function events(){return V.events?.()||[]}
  function rotations(){return V.rotations?.()||[]}
  function saveEvents(value){if(V.saveEvents)V.saveEvents(value);else write(PREFIX+'schedule-events-v25',value)}
  function saveRotations(value){if(V.saveRotations)V.saveRotations(value);else write(PREFIX+'schedule-rotations-v25',value)}
  function saveSources(value){if(V.saveSources)V.saveSources(value);else write(PREFIX+'schedule-sources-v25',value)}
  function enabledSources(){return sources().filter(function(source){return source.enabled!==false})}
  function firstSource(){return enabledSources()[0]||sources()[0]||null}
  function sourceOptions(selected){return enabledSources().map(function(source){return'<option value="'+safe(source.id)+'" '+(source.id===selected?'selected':'')+'>'+safe(source.name)+'</option>'}).join('')}
  function ensureSource(sourceId,name){
    var list=sources(),source=list.find(function(item){return item.id===sourceId})||list.find(function(item){return item.name.toLowerCase()===String(name||'').trim().toLowerCase()});
    if(source)return source;
    source={id:id('source'),name:String(name||'Work').trim()||'Work',color:Core.COLORS[list.length%Core.COLORS.length],enabled:true,overtimeThreshold:40,createdAt:new Date().toISOString()};
    saveSources(list.concat(source));write(PREFIX+'schedule-sources-initialized-v25',true);return source;
  }
  function refreshCalendar(){if(typeof renderCalendar==='function')renderCalendar();V.renderWeekSummary?.(activeDate());queueDecorate()}

  function localeRegion(){
    try{return new Intl.Locale(navigator.language||'en-US').region||'US'}catch{return'US'}
  }
  function holidaySettings(){
    var saved=read(KEY.holiday,null);
    return Object.assign({region:localeRegion(),show:true,treatAsOff:false,custom:[]},saved||{});
  }
  function filters(){return Object.assign({},defaultFilters,read(KEY.filters,{}))}
  function calendarView(){return read(KEY.view,'month')==='week'?'week':'month'}
  function dateKey(year,month,day){return Core.keyFromDate(new Date(year,month,day))}
  function nthWeekday(year,month,weekday,nth){var day=new Date(year,month,1),offset=(weekday-day.getDay()+7)%7;return dateKey(year,month,1+offset+(nth-1)*7)}
  function lastWeekday(year,month,weekday){var day=new Date(year,month+1,0);return dateKey(year,month,day.getDate()-((day.getDay()-weekday+7)%7))}
  function easter(year){
    var a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31)-1,day=(h+l-7*m+114)%31+1;
    return new Date(year,month,day);
  }
  function observedFixed(year,month,day){var value=new Date(year,month,day);if(value.getDay()===6)value.setDate(value.getDate()+2);if(value.getDay()===0)value.setDate(value.getDate()+1);return Core.keyFromDate(value)}
  function holidayList(year,region){
    var values=[],add=function(key,name){values.push({date:key,name:name,automatic:true})},east=easter(year),good=Core.keyFromDate(Core.addDays(east,-2)),monday=Core.keyFromDate(Core.addDays(east,1));
    if(region==='GB'){
      add(observedFixed(year,0,1),'New Year\'s Day');add(good,'Good Friday');add(monday,'Easter Monday');add(nthWeekday(year,4,1,1),'Early May bank holiday');add(lastWeekday(year,4,1),'Spring bank holiday');add(lastWeekday(year,7,1),'Summer bank holiday');add(observedFixed(year,11,25),'Christmas Day');add(observedFixed(year,11,26),'Boxing Day');
    }else if(region==='CA'){
      add(observedFixed(year,0,1),'New Year\'s Day');add(good,'Good Friday');var victoria=new Date(year,4,24);while(victoria.getDay()!==1)victoria.setDate(victoria.getDate()-1);add(Core.keyFromDate(victoria),'Victoria Day');add(observedFixed(year,6,1),'Canada Day');add(nthWeekday(year,8,1,1),'Labour Day');add(nthWeekday(year,9,1,2),'Thanksgiving');add(observedFixed(year,10,11),'Remembrance Day');add(observedFixed(year,11,25),'Christmas Day');add(observedFixed(year,11,26),'Boxing Day');
    }else if(region==='EU'){
      add(observedFixed(year,0,1),'New Year\'s Day');add(good,'Good Friday');add(monday,'Easter Monday');add(dateKey(year,4,9),'Europe Day');add(observedFixed(year,11,25),'Christmas Day');add(observedFixed(year,11,26),'Boxing Day');
    }else{
      add(observedFixed(year,0,1),'New Year\'s Day');add(nthWeekday(year,0,1,3),'Martin Luther King Jr. Day');add(nthWeekday(year,1,1,3),'Presidents\' Day');add(lastWeekday(year,4,1),'Memorial Day');add(observedFixed(year,5,19),'Juneteenth');add(observedFixed(year,6,4),'Independence Day');add(nthWeekday(year,8,1,1),'Labor Day');add(nthWeekday(year,9,1,2),'Indigenous Peoples\' Day');add(observedFixed(year,10,11),'Veterans Day');add(nthWeekday(year,10,4,4),'Thanksgiving');add(observedFixed(year,11,25),'Christmas Day');
    }
    return values;
  }
  function holidaysForYear(year,settings){
    settings=settings||holidaySettings();
    var automatic=settings.show===false?[]:holidayList(year,['US','GB','CA','EU'].includes(settings.region)?settings.region:'US');
    return automatic.concat((settings.custom||[]).filter(function(item){return Number(String(item.date).slice(0,4))===year}).map(function(item){return Object.assign({automatic:false},item)}));
  }
  function holidayOn(key){return holidaysForYear(Number(key.slice(0,4)),holidaySettings()).filter(function(item){return item.date===key})}
  function syncHolidayOffEvents(settings){
    var list=events().filter(function(event){return event.provenance?.type!=='holiday-auto'});
    if(settings.show!==false&&settings.treatAsOff){
      var year=new Date().getFullYear(),workSources=enabledSources();
      for(var y=year-1;y<=year+2;y++)holidayList(y,settings.region).forEach(function(holiday){workSources.forEach(function(source){list.push({id:id('holiday-off'),kind:'off',date:holiday.date,title:holiday.name+' · Day off',sourceId:source.id,sourceName:source.name,timeOffType:'holiday',exceptionType:'holiday',provenance:{type:'holiday-auto',region:settings.region},createdAt:new Date().toISOString()})})})
    }
    saveEvents(list);
  }

  function workRows(key){try{return typeof workScheduleRows==='function'?(workScheduleRows(key)||[]):V.workRowsOn?.(key)||[]}catch{return[]}}
  function rawEventForRow(row){return events().find(function(event){return event.id===row.eventId})||null}
  function eventKind(row){var raw=rawEventForRow(row);return raw?.exceptionType||raw?.timeOffType||(row.off?'time_off':row.exception?'extra_shift':'work')}
  function workoutOn(key){try{return!!(completedOn?.(key)||isScheduled?.(key))}catch{return false}}
  function agendaOn(key){try{return typeof agendaItemsOn==='function'?agendaItemsOn(key):[]}catch{return[]}}
  function dayFacts(key){return{work:workRows(key),holiday:holidayOn(key),workout:workoutOn(key),agenda:agendaOn(key)}}
  function markerMarkup(key,facts){
    var state=filters();facts=facts||dayFacts(key);var kinds=facts.work.map(eventKind),values=[];
    if(state.work&&facts.work.some(function(row){return !row.off&&!['overtime','extra_shift','call_in','swap_shift'].includes(eventKind(row))}))values.push('<i class="calendarMarkerV42 work" title="Work"></i>');
    if(state.workout&&facts.workout)values.push('<i class="calendarMarkerV42 workout" title="Workout"></i>');
    if(state.personal&&facts.agenda.length)values.push('<i class="calendarMarkerV42 personal" title="Personal events & tasks"></i>');
    if(state.overtime&&kinds.some(function(kind){return kind==='overtime'}))values.push('<em class="calendarBadgeV42 overtime">OT</em>');
    if(state.overtime&&kinds.some(function(kind){return['extra_shift','call_in','swap_shift'].includes(kind)}))values.push('<em class="calendarBadgeV42 extra">+</em>');
    if(state.timeOff&&facts.work.some(function(row){return row.off&&eventKind(row)!=='holiday'}))values.push('<em class="calendarBadgeV42 timeoff">PTO</em>');
    if(state.holidays&&facts.holiday.length)values.push('<em class="calendarBadgeV42 holiday">H</em>');
    return'<span class="calendarMarkersV42">'+values.join('')+'</span>';
  }
  function visibleCellItems(facts){
    var state=filters(),items=[];
    facts.work.forEach(function(row){var kind=eventKind(row),exception=['overtime','extra_shift','call_in','swap_shift'].includes(kind);if(row.off?!state.timeOff:exception?!state.overtime:!state.work)return;items.push({kind:row.off?'timeoff':exception?'overtime':'work',title:rawEventForRow(row)?.title||row.name||'Work',time:row.time||''})});
    if(state.personal)facts.agenda.forEach(function(item){items.push({kind:'personal',title:item.title,time:item.time?(item.time+(item.end?'–'+item.end:'')):'All day'})});
    if(state.workout&&facts.workout)items.push({kind:'workout',title:'Workout',time:''});
    if(state.holidays)facts.holiday.forEach(function(item){items.push({kind:'holiday',title:item.name,time:''})});
    return items;
  }
  function cellDetailsMarkup(items){
    return'<span class="calendarCellDetailsV47">'+items.slice(0,2).map(function(item){var label=item.kind==='work'?item.title.replace(/\s+shift$/i,''):item.kind==='workout'?'Train':item.title;return'<span class="calendarCellItemV47 '+safe(item.kind)+'" title="'+safe(item.title+(item.time?' · '+item.time:''))+'"><strong>'+safe(label)+'</strong></span>'}).join('')+(items.length>2?'<small class="calendarCellMoreV47">+'+(items.length-2)+' more</small>':'')+'</span>';
  }
  function decorateCells(){
    var pane=document.getElementById('plannerPane-calendar');if(pane)pane.dataset.calendarDensity=calendarDisplayMode();
    document.querySelectorAll('#page-calendar .calDay[data-date],#calendarWeekRailV33 [data-week-date]').forEach(function(button){var key=button.dataset.date||button.dataset.weekDate,facts=dayFacts(key),items=visibleCellItems(facts),markup=markerMarkup(key,facts)+cellDetailsMarkup(items);if(button.dataset.calendarMarkersV42===markup&&button.querySelector('.calendarMarkersV42')&&button.querySelector('.calendarCellDetailsV47'))return;button.querySelectorAll('.calendarMarkersV42,.calendarCellDetailsV47').forEach(function(node){node.remove()});button.insertAdjacentHTML('beforeend',markup);button.dataset.calendarMarkersV42=markup;button.setAttribute('aria-label',dateLabel(key)+'. '+(items.length?items.map(function(item){return item.title+(item.time?' '+item.time:'')}).join('. '):'No visible events')+'. Tap for day details')});
  }
  function iconFor(kind){return({work:'W',overtime:'OT',extra_shift:'+',call_in:'C',swap_shift:'S',time_off:'PTO',vacation:'PTO',sick:'S',holiday:'H',workout:'↗',plan:'•'})[kind]||'•'}
  function dayBriefRow(kind,title,detail){return'<div class="calendarBriefRowV42 '+safe(kind)+'"><span>'+safe(iconFor(kind))+'</span><div><b>'+safe(title)+'</b><small>'+safe(detail||'')+'</small></div></div>'}
  function decorateDayCard(){
    var card=document.getElementById('dayCard');if(!card)return;var key=activeDate(),facts=dayFacts(key),signature=JSON.stringify({key:key,work:facts.work.map(function(row){return[row.eventId,row.rotationId,row.name,row.time,row.done,eventKind(row)]}),holiday:facts.holiday,workout:facts.workout,agenda:facts.agenda.map(function(item){return[item.id,item.title,item.time,item.end,item.done]})});if(card.dataset.calendarV42Signature===signature&&card.querySelector('.calendarDayBriefV42'))return;card.dataset.calendarV42Signature=signature;card.querySelector('.calendarDayBriefV42')?.remove();var rows='';
    facts.work.forEach(function(row){var kind=eventKind(row),raw=rawEventForRow(row),label=row.off?(raw?.timeOffType||'Time off'):kind==='work'?'Work':kind.replace(/_/g,' ');rows+=dayBriefRow(kind,raw?.title||row.name,(row.time||'')+(kind!=='work'?' · '+label.replace(/\b\w/g,function(c){return c.toUpperCase()}):''))});
    facts.holiday.forEach(function(item){rows+=dayBriefRow('holiday',item.name,item.automatic?'Regional holiday':'Workplace holiday')});
    if(facts.workout){var name='Workout';try{name=typeof plannedWorkoutName==='function'?plannedWorkoutName(key):name}catch{}rows+=dayBriefRow('workout',name,'Scheduled training')}
    facts.agenda.slice(0,3).forEach(function(item){rows+=dayBriefRow('plan',item.title,item.time?(item.time+(item.end?'–'+item.end:'')):'All day')});
    if(!rows)rows='<p class="calendarBriefEmptyV42">Nothing scheduled. Keep the day open or add only what matters.</p>';
    var brief='<section class="calendarDayBriefV42"><div class="calendarBriefRowsV42">'+rows+'</div><div class="calendarBriefActionsV42"><button type="button" data-calendar-add-day="'+safe(key)+'"><span>+</span> Add to this day</button><button type="button" data-calendar-manage-day>View details</button></div></section>';
    var head=card.querySelector('.dayCardHeadV33');if(head){head.insertAdjacentHTML('afterend',brief);if(!head.querySelector('.calendarDayCloseV42'))head.insertAdjacentHTML('beforeend','<button class="calendarDayCloseV42" type="button" aria-label="Close day details">×</button>')}
    card.querySelector('[data-calendar-add-day]')?.addEventListener('click',function(){openAdd('',key)});
    card.querySelector('[data-calendar-manage-day]')?.addEventListener('click',function(){var open=card.classList.toggle('v42Expanded');this.textContent=open?'Hide details':'View details'});
    card.querySelector('.calendarDayCloseV42')?.addEventListener('click',closeDaySheet);
    var legacyAdd=card.querySelector('#dayCardAddV33');if(legacyAdd){legacyAdd.hidden=true;legacyAdd.setAttribute('aria-hidden','true')}
  }
  function closeDaySheet(){document.body.classList.remove('calendarDaySheetOpenV42');document.getElementById('dayCard')?.classList.remove('v42Expanded')}
  function openDaySheet(){
    // Selecting several dates must never summon the ordinary single-day sheet.
    if(document.body.classList.contains('calendarShiftPickingV35')){closeDaySheet();return}
    document.body.classList.add('calendarDaySheetOpenV42');queueDecorate();
  }

  function headerMarkup(){return'<div class="calendarTitleV42"><small>YOUR SCHEDULE</small><h1>Calendar</h1></div><div class="calendarHeadActionsV42"><div class="calendarViewToggleV42" role="group" aria-label="Calendar view"><button type="button" data-calendar-view="month">Month</button><button type="button" data-calendar-view="week">Week</button></div><button id="calendarTodayV42" type="button">Today</button><button id="calendarFilterV42" class="calendarIconButtonV42" type="button" aria-label="Filter calendar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v5l-4 2v-7Z"/></svg></button><button id="calendarShareV42" type="button">Share</button><button id="calendarAddV42" class="calendarAddV42" type="button"><span>+</span> Add</button></div>'}
  function setView(view){view=view==='week'?'week':'month';write(KEY.view,view);var pane=document.getElementById('plannerPane-calendar');if(pane)pane.dataset.calendarView=view;document.querySelectorAll('[data-calendar-view]').forEach(function(button){var active=button.dataset.calendarView===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))})}
  function ensurePaneBacks(){
    ['add','tools','sources','rotations','sync'].forEach(function(name){
      var pane=document.getElementById('plannerPane-'+name);if(!pane||pane.querySelector('.calendarPaneBackV42'))return;
      pane.insertAdjacentHTML('afterbegin','<button class="calendarPaneBackV42" type="button"><span>\u2039</span> Back to calendar</button>');
      pane.querySelector('.calendarPaneBackV42').onclick=function(){V.selectTab?.('calendar',true);queueDecorate()};
    });
  }
  function bindCalendarShell(){
    var header=document.querySelector('#plannerWorkspaceV25 .plannerWorkspaceHead');if(!header)return;
    if(!header.dataset.calendarV42){header.dataset.calendarV42='true';header.innerHTML=headerMarkup()}
    if(!document.getElementById('calendarQuickActionsV54')){
      header.insertAdjacentHTML('afterend','<div id="calendarQuickActionsV54" class="calendarQuickActionsV54" role="group" aria-label="Quick calendar actions"><button id="calendarSelectDatesV54" type="button" aria-pressed="false"><span aria-hidden="true">✓</span> <b>Select dates</b></button><button id="calendarWorkSourceV54" type="button"><span aria-hidden="true">+</span> Add work source</button></div>');
      document.getElementById('calendarSelectDatesV54').onclick=function(){closeDaySheet();if(V.isShiftPickerActive?.())V.stopShiftPicker?.();else{setView('month');V.beginShiftPicker?.()}};
      document.getElementById('calendarWorkSourceV54').onclick=openWorkSource;
    }
    var add=document.getElementById('calendarAddV42'),filter=document.getElementById('calendarFilterV42'),share=document.getElementById('calendarShareV42'),todayButton=document.getElementById('calendarTodayV42');
    if(add&&!add.dataset.bound){add.dataset.bound='true';add.onclick=function(){openAdd()}}
    if(filter&&!filter.dataset.bound){filter.dataset.bound='true';filter.onclick=openFilters}
    if(share&&!share.dataset.bound){share.dataset.bound='true';share.onclick=openShare}
    if(todayButton&&!todayButton.dataset.bound){todayButton.dataset.bound='true';todayButton.onclick=function(){selectedDate=today();calView=new Date();refreshCalendar()}}
    document.querySelectorAll('[data-calendar-view]').forEach(function(button){if(button.dataset.bound)return;button.dataset.bound='true';button.onclick=function(){setView(button.dataset.calendarView)}});
    setView(calendarView());
    // Keep everyday actions visible; put display and sharing choices together.
    if(!document.getElementById('calendarOptionsV67')){
      var menu=document.createElement('details');menu.id='calendarOptionsV67';menu.innerHTML='<summary>More <span aria-hidden="true">⌄</span></summary><div class="calendarOptionsBodyV67"></div>';
      header.querySelector('.calendarHeadActionsV42').insertBefore(menu,add);
      var menuBody=menu.querySelector('div');
      [header.querySelector('.calendarViewToggleV42'),filter,share,document.getElementById('calendarWorkSourceV54')].forEach(function(node){if(node)menuBody.appendChild(node)});
      menuBody.addEventListener('click',function(event){if(event.target.closest('button')&&!event.target.closest('.calendarViewToggleV42'))menu.open=false});
    }
    var density=document.querySelector('#page-calendar .calendarDisplayToggleV32'),optionsBody=document.querySelector('#calendarOptionsV67 .calendarOptionsBodyV67');
    if(density&&optionsBody&&density.parentElement!==optionsBody)optionsBody.appendChild(density);
    var grid=document.getElementById('calendarGrid');if(grid&&!grid.dataset.calendarV42){grid.dataset.calendarV42='true';grid.addEventListener('click',function(event){if(event.target.closest('.calDay[data-date]'))openDaySheet()})}
    var rail=document.getElementById('calendarWeekRailV33');if(rail&&!rail.dataset.calendarV42){rail.dataset.calendarV42='true';rail.addEventListener('click',function(event){if(event.target.closest('[data-week-date]'))openDaySheet()})}
    var legacyTabs=document.querySelector('.plannerTabsV25');if(legacyTabs)legacyTabs.setAttribute('aria-hidden','true');
    ensurePaneBacks();
  }
  function decorate(){if(decorating)return;decorating=true;try{bindCalendarShell();decorateCells();decorateDayCard()}finally{decorating=false}}
  function queueDecorate(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;decorate()})}

  function overlay(idValue,label){
    closeOverlay();var root=document.createElement('div');root.id=idValue;root.className='calendarOverlayV42';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',label);root.innerHTML='<div class="calendarSheetV42"><div class="calendarSheetHandleV42"></div><div class="calendarSheetBodyV42"></div></div>';document.body.appendChild(root);root.addEventListener('mousedown',function(event){if(event.target===root)closeOverlay()});return root;
  }
  function closeOverlay(){if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=''}document.querySelectorAll('.calendarOverlayV42').forEach(function(node){node.remove()});flow=null}
  function sheetHead(title,subtitle,back){return'<header class="calendarSheetHeadV42"><button type="button" data-sheet-back aria-label="'+(back?'Go back':'Close')+'">'+(back?'‹':'×')+'</button><div><h2>'+safe(title)+'</h2>'+(subtitle?'<small>'+safe(subtitle)+'</small>':'')+'</div></header>'}
  function bindSheetBack(root,callback){root.querySelector('[data-sheet-back]')?.addEventListener('click',callback||closeOverlay)}

  function openWorkSource(){
    closeDaySheet();var root=overlay('calendarWorkSourceSheetV54','Add work source'),initial=Core.COLORS[sources().length%Core.COLORS.length];
    root.querySelector('.calendarSheetBodyV42').innerHTML=sheetHead('Add work source','Keep each workplace and its shifts separate.',false)+'<form id="calendarWorkSourceFormV54"><section class="calendarFormStepV42"><label>Workplace name<input name="name" required maxlength="60" autocomplete="organization" placeholder="e.g. City Hospital"></label><label>Color<select name="color">'+Core.COLORS.map(function(color,index){return'<option value="'+color+'" '+(color===initial?'selected':'')+'>'+safe(Core.COLOR_NAMES[index])+'</option>'}).join('')+'</select></label><p class="calendarSourcePreviewV54"><i aria-hidden="true"></i><span></span></p><label>Overtime starts after <small>hours per week</small><input name="overtimeThreshold" type="number" min="1" max="100" required value="40"></label></section><footer class="calendarFlowActionsV42"><button type="button" data-source-cancel>Cancel</button><button class="primary" type="submit">Add work source</button></footer></form>';
    var form=root.querySelector('form'),fields=form.elements;
    function preview(){var index=Core.COLORS.indexOf(fields.color.value);root.querySelector('.calendarSourcePreviewV54 i').style.backgroundColor=fields.color.value;root.querySelector('.calendarSourcePreviewV54 span').textContent=Core.COLOR_NAMES[index]+' · '+(fields.name.value.trim()||'Your workplace')}
    form.addEventListener('input',function(){fields.name.setCustomValidity('');preview()});fields.color.onchange=preview;preview();bindSheetBack(root);root.querySelector('[data-source-cancel]').onclick=closeOverlay;
    form.onsubmit=function(event){
      event.preventDefault();var name=fields.name.value.trim();
      if(!name){fields.name.setCustomValidity('Enter a workplace name.');fields.name.reportValidity();return}
      if(sources().some(function(source){return source.name.trim().toLowerCase()===name.toLowerCase()})){fields.name.setCustomValidity('This workplace already exists. Use a different name.');fields.name.reportValidity();return}
      if(!form.reportValidity()||!Core.COLORS.includes(fields.color.value))return;
      var source={id:id('source'),name:name,color:fields.color.value,enabled:true,overtimeThreshold:Number(fields.overtimeThreshold.value),createdAt:new Date().toISOString()};
      saveSources(sources().concat(source));write(PREFIX+'schedule-sources-initialized-v25',true);
      var deletedKey=PREFIX+'schedule-deleted-source-names-v25';write(deletedKey,read(deletedKey,[]).filter(function(value){return String(value).trim().toLowerCase()!==name.toLowerCase()}));
      closeOverlay();V.selectTab?.('calendar',true);refreshCalendar();toast?.('Work source added. Choose it when adding shifts.');
    };
  }

  function chooserMarkup(){
    var choices=[['personal','•','Personal event','Appointments, family plans, birthdays or anything else'],['work','W','Work schedule','Set up your normal repeating work pattern'],['extra','OT','Extra shift','One-off shift, overtime, call-in or swap'],['timeoff','PTO','Time off','Vacation, PTO, sick day or unpaid leave'],['holiday','H','Holiday','Add a workplace holiday or adjust holidays'],['workout','↗','Workout','Schedule a training session']];
    function choiceButton(choice){return'<button type="button" data-add-kind="'+choice[0]+'"><i>'+choice[1]+'</i><span><b>'+choice[2]+'</b><small>'+choice[3]+'</small></span><em>›</em></button>'}
    return sheetHead('Add to calendar','What are you planning?',false)+'<section class="calendarChoiceStepV42"><div class="calendarChoiceListV42">'+choiceButton(['workmenu','W','Work','One shift or your regular schedule'])+choiceButton(['personal','•','Personal event','Appointments, birthdays and plans'])+choiceButton(['timeoff','PTO','Time off','Vacation, sick days or leave'])+'</div><details class="calendarMoreKindsV67"><summary>Workout or holiday</summary><div class="calendarChoiceListV42">'+choices.filter(function(c){return c[0]==='holiday'||c[0]==='workout'}).map(choiceButton).join('')+'</div></details><button class="calendarImportLinkV42" type="button" data-open-import hidden>Import roster</button></section>';
  }
  function newFlow(kind,key){
    var source=firstSource(),selected=key||activeDate();return{kind:kind||'',step:kind?1:0,date:selected,draft:{date:selected,sourceId:source?.id||'',sourceName:source?.name||'Work',name:'Regular shift',start:'09:00',end:'17:00',pattern:'weekdays',anchor:selected,weeks:2,custom:[true,true,false,true,true,true,true,false,true,true,true,true,false,false],exceptionType:'extra_shift',overtimeMode:'extend',timeOffType:'pto',endDate:selected,holidayName:'Workplace holiday'}}
  }
  function openAdd(kind,key){var root=overlay('calendarAddFlowV42','Add to calendar');flow=newFlow(kind,key);renderFlow(root)}
  function renderFlow(root){var body=root.querySelector('.calendarSheetBodyV42');if(!flow.kind||flow.kind==='workmenu'){
    body.innerHTML=flow.kind==='workmenu'?sheetHead('Add work','Choose how to add your shifts.',true)+'<section class="calendarChoiceStepV42"><div class="calendarChoiceListV42"><button type="button" data-add-kind="extra"><i>1</i><span><b>One shift</b><small>Includes extra shifts and overtime</small></span><em>›</em></button><button type="button" data-add-kind="work"><i>↻</i><span><b>Repeating schedule</b><small>Choose a pattern or rotation</small></span><em>›</em></button><button type="button" data-open-import><i>▧</i><span><b>Import my roster</b><small>Photo, PDF or pasted text</small></span><em>›</em></button></div></section>':chooserMarkup();
    bindSheetBack(root,flow.kind==='workmenu'?function(){flow.kind='';renderFlow(root)}:undefined);root.querySelectorAll('[data-add-kind]').forEach(function(button){button.onclick=function(){flow.kind=button.dataset.addKind;flow.step=1;renderFlow(root)}});root.querySelector('[data-open-import]').onclick=function(){closeOverlay();V.selectTab?.('add',true)};return}if(flow.kind==='personal')renderPersonalFlow(root);else if(flow.kind==='work')renderWorkFlow(root);else if(flow.kind==='extra')renderExtraFlow(root);else if(flow.kind==='timeoff')renderTimeOffFlow(root);else if(flow.kind==='holiday')renderHolidayFlow(root);else renderWorkoutFlow(root)}
  function renderPersonalFlow(root){
    var d=flow.draft;
    root.querySelector('.calendarSheetBodyV42').innerHTML=sheetHead('Personal event','Make room for life outside work.',true)+'<form id="calendarPersonalFormV47"><section class="calendarFormStepV42"><label>Event name<input name="title" type="text" required maxlength="100" placeholder="Dinner with friends" value="'+safe(d.personalTitle||'')+'"></label><label>Date<input name="date" type="date" required value="'+safe(d.date)+'"></label><label class="calendarCheckV42"><input name="allDay" type="checkbox" '+(d.allDay?'checked':'')+'><span><b>All day</b><small>No set time</small></span></label><div class="calendarFieldGridV42" data-personal-times '+(d.allDay?'hidden':'')+'><label>Starts<input name="time" type="time" required value="'+safe(d.personalTime||'09:00')+'"></label><label>Ends <small>optional</small><input name="end" type="time" value="'+safe(d.personalEnd||'')+'"></label></div><label>Repeat<select name="frequency">'+[['none','Does not repeat'],['weekly','Every week'],['biweekly','Every 2 weeks'],['monthly','Every month'],['yearly','Every year']].map(function(item){return'<option value="'+item[0]+'" '+((d.frequency||'none')===item[0]?'selected':'')+'>'+item[1]+'</option>'}).join('')+'</select></label></section><footer class="calendarFlowActionsV42"><button type="button" data-personal-cancel>Cancel</button><button class="primary" type="submit">Save event</button></footer></form>';
    var form=root.querySelector('form'),fields=form.elements;
    function remember(){d.personalTitle=fields.title.value;d.date=fields.date.value;d.allDay=fields.allDay.checked;d.personalTime=fields.time.value;d.personalEnd=fields.end.value;d.frequency=fields.frequency.value}
    function updateTimes(){var allDay=fields.allDay.checked;form.querySelector('[data-personal-times]').hidden=allDay;fields.time.disabled=allDay;fields.end.disabled=allDay;fields.end.setCustomValidity('')}
    form.addEventListener('input',function(){remember();fields.end.setCustomValidity('')});fields.allDay.onchange=function(){remember();updateTimes()};updateTimes();
    bindSheetBack(root,function(){remember();flow.kind='';renderFlow(root)});root.querySelector('[data-personal-cancel]').onclick=closeOverlay;
    form.onsubmit=function(event){event.preventDefault();remember();if(!d.personalTitle.trim()){fields.title.setCustomValidity('Give your event a name.');fields.title.reportValidity();fields.title.oninput=function(){this.setCustomValidity('')};return}if(!d.allDay&&d.personalEnd&&d.personalEnd<=d.personalTime){fields.end.setCustomValidity('Choose an end time after the start time.');fields.end.reportValidity();return}if(!form.reportValidity())return;savePersonalEvent(d)};
  }
  function savePersonalEvent(d){
    var item={title:d.personalTitle.trim(),type:'event',category:'event',time:d.allDay?'':d.personalTime,end:d.allDay?'':d.personalEnd,frequency:d.frequency||'none'};
    if(item.frequency==='none')addDayItem(d.date,item);else addRecurringCalendarItem(d.date,item);
    selectedDate=d.date;calView=Core.dateFromKey(d.date);closeOverlay();closeDaySheet();V.selectTab?.('calendar',true);refreshCalendar();toast?.('Personal event added');
  }
  function progress(step){return'<div class="calendarFlowProgressV42">'+['Shift','Pattern','Start'].map(function(label,index){var number=index+1;return'<span class="'+(number===step?'active':number<step?'done':'')+'"><i>'+(number<step?'✓':number)+'</i><small>'+label+'</small></span>'}).join('')+'</div>'}
  function rememberFields(root,names){names.forEach(function(name){var field=root.querySelector('[name="'+name+'"]');if(!field)return;var remember=function(){flow.draft[name]=field.type==='checkbox'?field.checked:field.value};field.addEventListener('input',remember);field.addEventListener('change',remember)})}
  function workStepMarkup(){
    var d=flow.draft;
    if(flow.step===2&&d.pattern==='custom'&&!d.choosingPattern)return sheetHead('Custom rotation','Step 2 of 3',true)+progress(2)+'<section class="calendarFormStepV42"><div class="rotationHeadingV54"><div><h3>Choose your work dates</h3><p>Set the first weeks. We will repeat this pattern.</p></div><button type="button" data-change-pattern>Change pattern</button></div>'+customRotationMarkup(d)+'</section>'+flowActions('Back','Next');
    if(flow.step===1)return sheetHead('Work schedule','Step 1 of 3',true)+progress(1)+'<section class="calendarFormStepV42"><p class="calendarEyebrowV42">SHIFT</p><h3>What is your usual shift?</h3><p>Start with the hours. The pattern comes next.</p><div class="calendarFieldGridV42"><label>Starts<input name="start" type="time" value="'+safe(d.start)+'"></label><label>Ends<input name="end" type="time" value="'+safe(d.end)+'"></label></div><label>Shift name <small>optional</small><input name="name" maxlength="60" value="'+safe(d.name)+'" placeholder="Evening shift"></label>'+(sources().length?'<label>Workplace<select name="sourceId">'+sourceOptions(d.sourceId)+'</select></label>':'<label>Workplace<input name="sourceName" maxlength="60" value="'+safe(d.sourceName)+'"></label>')+'</section>'+flowActions('Cancel','Next');
    if(flow.step===2)return sheetHead('Work schedule','Step 2 of 3',true)+progress(2)+'<section class="calendarFormStepV42"><p class="calendarEyebrowV42">PATTERN</p><h3>When do you usually work?</h3><p>Choose a familiar pattern. Advanced controls only appear for Custom rotation.</p><div class="calendarPatternListV42">'+[['weekdays','Mon – Fri','Monday to Friday'],['weekends','Weekends','Saturday and Sunday'],['alternating','Every other weekend','Work every other Saturday and Sunday'],['fourfour','4 on / 4 off','Four work days, then four days off'],['custom','Custom rotation','Build a 2-, 3- or 4-week pattern']].map(function(item){return'<button type="button" data-pattern="'+item[0]+'" class="'+(d.pattern===item[0]?'selected':'')+'"><span><b>'+item[1]+'</b><small>'+item[2]+'</small></span><i>'+(d.pattern===item[0]?'✓':'')+'</i></button>'}).join('')+'</div>'+'</section>'+flowActions('Back','Next');
    var patternName={weekdays:'Mon – Fri',weekends:'Weekends',alternating:'Every other weekend',fourfour:'4 on / 4 off',custom:d.weeks+'-week custom rotation'}[d.pattern];
    return sheetHead('Work schedule','Step 3 of 3',true)+progress(3)+'<section class="calendarFormStepV42"><p class="calendarEyebrowV42">START</p><h3>'+(d.pattern==='alternating'?'When does the first worked weekend begin?':'When does this pattern begin?')+'</h3><p>Pick one date and Work + Workout will build the schedule forward.</p><label>'+(d.pattern==='alternating'?'First worked weekend':d.pattern==='custom'?'First week begins (Monday)':'Start date')+'<input name="anchor" type="date" value="'+safe(d.anchor)+'"></label><div class="calendarReviewV42"><span>SHIFT</span><b>'+safe(d.name||'Work shift')+'</b><small>'+safe(timeLabel(d.start)+' – '+timeLabel(d.end))+'</small><span>PATTERN</span><b>'+safe(patternName)+'</b>'+(d.pattern==='custom'?'<small class="rotationReviewDatesV54">'+safe(rotationDateRange(rotationStart(d),Core.keyFromDate(Core.addDays(Core.dateFromKey(rotationStart(d)),d.weeks*7-1))))+' · repeats every '+d.weeks+' weeks.</small>':'')+'<small>No end date. One-off changes stay separate.</small></div></section>'+flowActions('Back','Save schedule');
  }
  function customRotationMarkup(d){
    var weeks=customRotationWeeks(d).map(function(week){return'<div class="rotationWeekV42"><b>'+safe(rotationDateRange(week[0].date,week[6].date))+'</b><div>'+week.map(function(day){return'<button type="button" data-rotation-day="'+day.position+'" data-rotation-date="'+day.date+'" aria-pressed="'+day.work+'" aria-label="'+safe(dateLabel(day.date)+', '+(day.work?'Work':'Off'))+'" '+(day.today?'aria-current="date" ':'')+'class="'+(day.work?'work':'off')+'"><small>'+safe(dateLabel(day.date,{weekday:'short'}))+'</small><i>'+Core.dateFromKey(day.date).getDate()+'</i><em>'+(day.work?'Work':'Off')+'</em></button>'}).join('')+'</div></div>'}).join('');
    return'<div class="customRotationV42"><div class="rotationDateNavV54"><button type="button" data-rotation-week="-1" aria-label="Start one week earlier">‹</button><div><b>Your dated rotation</b><button type="button" data-rotation-this-week>This week</button></div><button type="button" data-rotation-week="1" aria-label="Start one week later">›</button></div><label>Rotation length<select name="weeks"><option value="2" '+(d.weeks===2?'selected':'')+'>2 weeks</option><option value="3" '+(d.weeks===3?'selected':'')+'>3 weeks</option><option value="4" '+(d.weeks===4?'selected':'')+'>4 weeks</option></select></label>'+weeks+'<p>Tap a day to switch Work / Off. This '+d.weeks+'-week pattern repeats from '+safe(dateLabel(rotationStart(d),{month:'short',day:'numeric',year:'numeric'}))+'. Today has an outline.</p></div>'
  }
  function rotationStart(d){return Core.startOfWeek(/^\d{4}-\d{2}-\d{2}$/.test(d.anchor||'')?d.anchor:today())}
  function rotationDateRange(start,end){return dateLabel(start,{month:'short',day:'numeric',year:'numeric'})+' – '+dateLabel(end,{month:'short',day:'numeric',year:'numeric'})}
  function customRotationWeeks(d){
    var start=Core.dateFromKey(rotationStart(d)),weeks=[];
    for(var week=0;week<Number(d.weeks);week++){var days=[];for(var index=0;index<7;index++){var position=week*7+index,key=Core.keyFromDate(Core.addDays(start,position));days.push({date:key,position:position,work:d.custom[position]===true,today:key===today()})}weeks.push(days)}
    return weeks;
  }
  function flowActions(back,next){return'<footer class="calendarFlowActionsV42"><button type="button" data-flow-back>'+back+'</button><button class="primary" type="button" data-flow-next>'+next+'</button></footer>'}
  function renderWorkFlow(root){
    root.querySelector('.calendarSheetBodyV42').innerHTML=workStepMarkup();bindSheetBack(root,function(){if(flow.step===1){flow.kind='';flow.step=0}else flow.step--;renderFlow(root)});rememberFields(root,['start','end','name','sourceId','sourceName','anchor','weeks']);
    root.querySelectorAll('[data-pattern]').forEach(function(button){button.onclick=function(){flow.draft.pattern=button.dataset.pattern;flow.draft.choosingPattern=false;if(flow.draft.pattern==='custom'&&!flow.draft.customDated){flow.draft.anchor=Core.startOfWeek(today());flow.draft.customDated=true}renderFlow(root)}});
    root.querySelector('[data-change-pattern]')?.addEventListener('click',function(){flow.draft.choosingPattern=true;renderFlow(root)});
    root.querySelectorAll('[data-rotation-day]').forEach(function(button){button.onclick=function(){var index=Number(button.dataset.rotationDay);flow.draft.custom[index]=flow.draft.custom[index]===false;renderFlow(root)}});
    root.querySelectorAll('[data-rotation-week]').forEach(function(button){button.onclick=function(){flow.draft.anchor=Core.keyFromDate(Core.addDays(Core.dateFromKey(rotationStart(flow.draft)),Number(button.dataset.rotationWeek)*7));renderFlow(root)}});
    root.querySelector('[data-rotation-this-week]')?.addEventListener('click',function(){flow.draft.anchor=Core.startOfWeek(today());renderFlow(root)});
    var anchor=root.querySelector('[name="anchor"]');if(anchor&&flow.draft.pattern==='custom')anchor.onchange=function(){flow.draft.anchor=rotationStart(flow.draft);renderFlow(root)};
    var weeks=root.querySelector('[name="weeks"]');if(weeks)weeks.onchange=function(){flow.draft.weeks=Number(weeks.value);while(flow.draft.custom.length<flow.draft.weeks*7)flow.draft.custom.push(false);renderFlow(root)};
    root.querySelector('[data-flow-back]').onclick=function(){if(flow.step===1)closeOverlay();else{flow.step--;renderFlow(root)}};
    root.querySelector('[data-flow-next]').onclick=function(){if(flow.step===1&&(!flow.draft.start||!flow.draft.end)){toast?.('Choose shift start and end times');return}if(flow.step<3){flow.step++;renderFlow(root)}else if(!flow.draft.anchor){toast?.('Choose a start date')}else saveWorkFlow()};
  }
  function saveWorkFlow(){
    var d=flow.draft,source=ensureSource(d.sourceId,d.sourceName),pattern,anchor=d.anchor,preset='custom',humanPreset=d.pattern;
    if(d.pattern==='weekdays'){pattern=['D','D','D','D','D','O','O'];anchor=Core.startOfWeek(anchor)}
    if(d.pattern==='weekends'){pattern=['O','O','O','O','O','D','D'];anchor=Core.startOfWeek(anchor)}
    if(d.pattern==='alternating'){pattern=Core.patternFromPreset('alternating_weekends');preset='alternating_weekends'}
    if(d.pattern==='fourfour')pattern=Core.patternFromPreset('four_two',{onDays:4,offDays:4});
    if(d.pattern==='custom'){pattern=d.custom.slice(0,d.weeks*7).map(function(on){return on?'D':'O'});anchor=Core.startOfWeek(anchor)}
    var now=new Date().toISOString(),rotation=Core.normalizeRotation({id:id('rotation'),name:d.name.trim()||'Regular shift',sourceId:source.id,preset:preset,humanPreset:humanPreset,anchor:anchor,pattern:pattern,dayStart:d.start,dayEnd:d.end,nightStart:d.start,nightEnd:d.end,exceptions:{},active:true,createdAt:now,updatedAt:now});saveRotations(rotations().concat(rotation));closeOverlay();refreshCalendar();toast?.('Work schedule added. Extra shifts and time off will stay separate.')
  }

  function extraMarkup(){
    var d=flow.draft,existing=workRows(d.date).find(function(row){return!row.off});if(existing&&d.exceptionType==='overtime'&&d.overtimeMode==='extend'&&!d.overtimeSeeded){d.start=existing.end||String(existing.time||'').match(/\d\d:\d\d/g)?.[1]||d.start;d.end=Core.timeAfter(d.start,120);d.overtimeSeeded=true}
    return sheetHead('Add to '+dateLabel(d.date,{month:'short',day:'numeric'}),'One-off changes never rewrite your base schedule.',true)+'<section class="calendarFormStepV42"><p class="calendarEyebrowV42">EXCEPTION</p><h3>What changed?</h3><div class="exceptionKindsV42">'+[['extra_shift','Extra shift'],['overtime','Overtime'],['call_in','Call-in'],['swap_shift','Swap shift']].map(function(item){return'<button type="button" data-exception="'+item[0]+'" class="'+(d.exceptionType===item[0]?'selected':'')+'">'+item[1]+'</button>'}).join('')+'</div>'+(d.exceptionType==='overtime'&&existing?'<div class="overtimeModeV42"><label><input type="radio" name="overtimeMode" value="extend" '+(d.overtimeMode==='extend'?'checked':'')+'> Extend existing shift</label><label><input type="radio" name="overtimeMode" value="separate" '+(d.overtimeMode==='separate'?'checked':'')+'> Separate overtime shift</label></div>':'')+'<label>Date<input name="date" type="date" value="'+safe(d.date)+'"></label><div class="calendarFieldGridV42"><label>Starts<input name="start" type="time" value="'+safe(d.start)+'"></label><label>Ends<input name="end" type="time" value="'+safe(d.end)+'"></label></div><label>Label <small>optional</small><input name="name" maxlength="60" value="'+safe(d.exceptionType==='overtime'?'Overtime':d.name)+'"></label><label>Workplace<select name="sourceId">'+sourceOptions(d.sourceId)+'</select></label></section>'+flowActions('Back','Save to '+dateLabel(d.date,{month:'short',day:'numeric'}));
  }
  function renderExtraFlow(root){root.querySelector('.calendarSheetBodyV42').innerHTML=extraMarkup();bindSheetBack(root,function(){flow.kind='';renderFlow(root)});rememberFields(root,['date','start','end','name','sourceId']);root.querySelectorAll('[data-exception]').forEach(function(button){button.onclick=function(){flow.draft.exceptionType=button.dataset.exception;flow.draft.name={extra_shift:'Extra shift',overtime:'Overtime',call_in:'Call-in',swap_shift:'Swap shift'}[button.dataset.exception];flow.draft.overtimeSeeded=false;renderFlow(root)}});root.querySelectorAll('[name="overtimeMode"]').forEach(function(input){input.onchange=function(){flow.draft.overtimeMode=input.value;flow.draft.overtimeSeeded=false;renderFlow(root)}});root.querySelector('[data-flow-back]').onclick=function(){flow.kind='';renderFlow(root)};root.querySelector('[data-flow-next]').onclick=saveExtra}
  function saveExtra(){var d=flow.draft,source=ensureSource(d.sourceId,d.sourceName),now=new Date().toISOString(),event={id:id('shift'),kind:'work',date:d.date,title:d.name.trim()||d.exceptionType.replace(/_/g,' '),start:d.start,end:d.end,overnight:Core.minutes(d.end)<=Core.minutes(d.start),sourceId:source.id,sourceName:source.name,color:source.color,exception:true,exceptionType:d.exceptionType,overtimeMode:d.exceptionType==='overtime'?d.overtimeMode:'',confidence:{label:'High',score:1,reasons:['Added directly by you']},provenance:{type:'calendar-exception'},createdAt:now,updatedAt:now};saveEvents(events().concat(event));selectedDate=d.date;closeOverlay();refreshCalendar();toast?.('One-off '+d.exceptionType.replace(/_/g,' ')+' added')}

  function timeOffMarkup(){var d=flow.draft;return sheetHead('Time off','This changes selected dates, not the repeating schedule.',true)+'<section class="calendarFormStepV42"><p class="calendarEyebrowV42">TIME OFF</p><h3>Protect time away from work.</h3><div class="exceptionKindsV42">'+[['pto','PTO'],['vacation','Vacation'],['sick','Sick day'],['unpaid','Unpaid leave']].map(function(item){return'<button type="button" data-timeoff="'+item[0]+'" class="'+(d.timeOffType===item[0]?'selected':'')+'">'+item[1]+'</button>'}).join('')+'</div><div class="calendarFieldGridV42"><label>Starts<input name="date" type="date" value="'+safe(d.date)+'"></label><label>Ends<input name="endDate" type="date" value="'+safe(d.endDate)+'"></label></div><label>Workplace<select name="sourceId">'+sourceOptions(d.sourceId)+'</select></label></section>'+flowActions('Back','Save time off')}
  function renderTimeOffFlow(root){root.querySelector('.calendarSheetBodyV42').innerHTML=timeOffMarkup();bindSheetBack(root,function(){flow.kind='';renderFlow(root)});rememberFields(root,['date','endDate','sourceId']);root.querySelectorAll('[data-timeoff]').forEach(function(button){button.onclick=function(){flow.draft.timeOffType=button.dataset.timeoff;renderFlow(root)}});root.querySelector('[data-flow-back]').onclick=function(){flow.kind='';renderFlow(root)};root.querySelector('[data-flow-next]').onclick=saveTimeOff}
  function saveTimeOff(){var d=flow.draft;if(d.endDate<d.date){toast?.('End date must be after the start date');return}var source=ensureSource(d.sourceId,d.sourceName),now=new Date().toISOString(),label={pto:'PTO',vacation:'Vacation',sick:'Sick day',unpaid:'Unpaid leave'}[d.timeOffType];var added=rangeKeys(d.date,d.endDate).map(function(key){return{id:id('off'),kind:'off',date:key,title:label,sourceId:source.id,sourceName:source.name,timeOffType:d.timeOffType,exceptionType:'time_off',exception:true,provenance:{type:'calendar-exception'},createdAt:now,updatedAt:now}});saveEvents(events().concat(added));selectedDate=d.date;closeOverlay();refreshCalendar();toast?.(label+' added without changing your base schedule')}

  function holidayMarkup(){var d=flow.draft,s=holidaySettings();return sheetHead('Holiday','Regional holidays stay subtle and workplace holidays stay flexible.',true)+'<section class="calendarFormStepV42"><p class="calendarEyebrowV42">HOLIDAY SETTINGS</p><h3>Add a workplace holiday.</h3><label>Holiday name<input name="holidayName" maxlength="70" value="'+safe(d.holidayName)+'"></label><label>Date<input name="date" type="date" value="'+safe(d.date)+'"></label><label class="calendarCheckV42"><input name="holidayOff" type="checkbox"><span><b>Treat this as a day off</b><small>Your repeating work pattern remains unchanged.</small></span></label><div class="calendarSettingsCardV42"><label>Regional holidays<select name="region"><option value="US" '+(s.region==='US'?'selected':'')+'>United States</option><option value="GB" '+(s.region==='GB'?'selected':'')+'>United Kingdom</option><option value="CA" '+(s.region==='CA'?'selected':'')+'>Canada</option><option value="EU" '+(s.region==='EU'?'selected':'')+'>European Union · common dates</option></select></label><label class="calendarSwitchV42"><span><b>Show on calendar</b><small>Display regional holidays in yellow.</small></span><input name="showHolidays" type="checkbox" '+(s.show!==false?'checked':'')+'></label><label class="calendarSwitchV42"><span><b>Treat regional holidays as days off</b><small>Useful only if your workplace closes.</small></span><input name="regionalOff" type="checkbox" '+(s.treatAsOff?'checked':'')+'></label></div></section>'+flowActions('Back','Save holiday')}
  function renderHolidayFlow(root){root.querySelector('.calendarSheetBodyV42').innerHTML=holidayMarkup();bindSheetBack(root,function(){flow.kind='';renderFlow(root)});rememberFields(root,['holidayName','date']);root.querySelector('[data-flow-back]').onclick=function(){flow.kind='';renderFlow(root)};root.querySelector('[data-flow-next]').onclick=saveHoliday}
  function saveHoliday(){var d=flow.draft,root=document.getElementById('calendarAddFlowV42'),settings=holidaySettings();settings.region=root.querySelector('[name="region"]').value;settings.show=root.querySelector('[name="showHolidays"]').checked;settings.treatAsOff=root.querySelector('[name="regionalOff"]').checked;settings.custom=(settings.custom||[]).concat({id:id('holiday'),date:d.date,name:d.holidayName.trim()||'Workplace holiday',treatAsOff:root.querySelector('[name="holidayOff"]').checked});write(KEY.holiday,settings);syncHolidayOffEvents(settings);if(root.querySelector('[name="holidayOff"]').checked){var source=firstSource();if(source)saveEvents(events().concat({id:id('off'),kind:'off',date:d.date,title:d.holidayName.trim()||'Workplace holiday',sourceId:source.id,sourceName:source.name,timeOffType:'holiday',exceptionType:'holiday',provenance:{type:'workplace-holiday'},createdAt:new Date().toISOString()}))}selectedDate=d.date;closeOverlay();refreshCalendar();toast?.('Holiday added')}

  function workoutMarkup(){var d=flow.draft;return sheetHead('Schedule workout','Add training to one day.',true)+'<section class="calendarFormStepV42"><p class="calendarEyebrowV42">WORKOUT</p><h3>When do you want to train?</h3><label>Date<input name="date" type="date" value="'+safe(d.date)+'"></label><p class="calendarHelpV42">Work + Workout will place your next planned session on this date and keep it connected to your training plan.</p></section>'+flowActions('Back','Schedule workout')}
  function renderWorkoutFlow(root){root.querySelector('.calendarSheetBodyV42').innerHTML=workoutMarkup();bindSheetBack(root,function(){flow.kind='';renderFlow(root)});rememberFields(root,['date']);root.querySelector('[data-flow-back]').onclick=function(){flow.kind='';renderFlow(root)};root.querySelector('[data-flow-next]').onclick=function(){var d=flow.draft;try{var value=typeof overrides==='function'?overrides():{};value[d.date]={action:'train',createdAt:new Date().toISOString()};if(typeof saveOverrides==='function')saveOverrides(value);else write(PREFIX+'training-overrides',value)}catch{}selectedDate=d.date;closeOverlay();refreshCalendar();toast?.('Workout added to '+dateLabel(d.date,{month:'short',day:'numeric'}))}}

  function openFilters(){
    var root=overlay('calendarFiltersSheetV42','Calendar filters'),state=filters(),settings=holidaySettings();root.querySelector('.calendarSheetBodyV42').innerHTML=sheetHead('Calendar filters','Keep the month quiet. Show only what helps.',false)+'<section class="calendarFilterListV42">'+[['personal','Personal events & tasks','Appointments, family plans and to-dos'],['work','Work','Regular scheduled work'],['workout','Workouts','Training sessions'],['holidays','Holidays','Regional and workplace holidays'],['overtime','Overtime & extra','Unusual shifts and call-ins'],['timeOff','Time off','PTO, vacation and sick days']].map(function(item){return'<label><span><b>'+item[1]+'</b><small>'+item[2]+'</small></span><input name="'+item[0]+'" type="checkbox" '+(state[item[0]]?'checked':'')+'></label>'}).join('')+'<button type="button" data-holiday-settings><span><b>Holiday settings</b><small>'+safe({US:'United States',GB:'United Kingdom',CA:'Canada',EU:'European Union · common dates'}[settings.region]||settings.region)+' · '+(settings.show===false?'hidden':'shown')+'</small></span><i>›</i></button><button type="button" data-calendar-settings><span><b>Calendar settings</b><small>Work sources, rotations and connections</small></span><i>›</i></button></section><footer class="calendarFlowActionsV42"><button type="button" data-sheet-close>Cancel</button><button class="primary" type="button" data-save-filters>Apply filters</button></footer>';bindSheetBack(root);root.querySelector('[data-sheet-close]').onclick=closeOverlay;root.querySelector('[data-save-filters]').onclick=function(){var next={};Object.keys(defaultFilters).forEach(function(key){next[key]=root.querySelector('[name="'+key+'"]').checked});write(KEY.filters,next);closeOverlay();queueDecorate()};root.querySelector('[data-holiday-settings]').onclick=openHolidaySettings;root.querySelector('[data-calendar-settings]').onclick=function(){closeOverlay();V.selectTab?.('tools',true)}
  }

  function openHolidaySettings(){
    var settings=holidaySettings(),root=overlay('calendarHolidaySettingsV42','Holiday settings');root.querySelector('.calendarSheetBodyV42').innerHTML=sheetHead('Holiday settings','Public holidays do not have to mean a day off.',false)+'<section class="calendarFormStepV42"><div class="calendarSettingsCardV42"><label>Region<select name="region"><option value="US" '+(settings.region==='US'?'selected':'')+'>United States</option><option value="GB" '+(settings.region==='GB'?'selected':'')+'>United Kingdom</option><option value="CA" '+(settings.region==='CA'?'selected':'')+'>Canada</option><option value="EU" '+(settings.region==='EU'?'selected':'')+'>European Union · common dates</option></select></label><label class="calendarSwitchV42"><span><b>Show on calendar</b><small>Display holidays as subtle yellow markers.</small></span><input name="showHolidays" type="checkbox" '+(settings.show!==false?'checked':'')+'></label><label class="calendarSwitchV42"><span><b>Treat as days off</b><small>Turn this on only if your workplace closes.</small></span><input name="regionalOff" type="checkbox" '+(settings.treatAsOff?'checked':'')+'></label></div><p class="calendarHelpV42">Healthcare, emergency services and shift workers can keep holidays visible without removing scheduled work.</p></section><footer class="calendarFlowActionsV42"><button type="button" data-sheet-close>Cancel</button><button class="primary" type="button" data-save-holidays>Save settings</button></footer>';bindSheetBack(root);root.querySelector('[data-sheet-close]').onclick=closeOverlay;root.querySelector('[data-save-holidays]').onclick=function(){settings.region=root.querySelector('[name="region"]').value;settings.show=root.querySelector('[name="showHolidays"]').checked;settings.treatAsOff=root.querySelector('[name="regionalOff"]').checked;write(KEY.holiday,settings);syncHolidayOffEvents(settings);closeOverlay();refreshCalendar();toast?.('Holiday settings saved')}
  }

  function monthRange(offset){var base=new Date(calView instanceof Date?calView:new Date()),start=new Date(base.getFullYear(),base.getMonth()+offset,1),end=new Date(base.getFullYear(),base.getMonth()+offset+1,0);return{start:Core.keyFromDate(start),end:Core.keyFromDate(end)}}
  function shareState(root){var range=root.querySelector('[name="range"]:checked')?.value||'this',dates=range==='next'?monthRange(1):monthRange(0);if(range==='custom'){dates={start:root.querySelector('[name="shareStart"]').value,end:root.querySelector('[name="shareEnd"]').value}}var include={};['work','overtime','daysOff','holidays','workouts','notes'].forEach(function(key){include[key]=root.querySelector('[name="include-'+key+'"]').checked});return{range:dates,include:include}}
  function shareRows(state){
    var rows=[];rangeKeys(state.range.start,state.range.end).forEach(function(key){var facts=dayFacts(key),items=[];facts.work.forEach(function(row){var kind=eventKind(row);if(row.off&&state.include.daysOff)items.push((rawEventForRow(row)?.title||'Day off'));else if(kind!=='work'&&state.include.overtime)items.push((rawEventForRow(row)?.title||kind.replace(/_/g,' '))+' '+row.time);else if(kind==='work'&&state.include.work)items.push((row.name||'Work')+' '+row.time)});if(state.include.holidays)facts.holiday.forEach(function(item){items.push(item.name)});if(state.include.workouts&&facts.workout)items.push('Workout');if(state.include.notes)facts.agenda.forEach(function(item){items.push(item.title+(item.time?' '+item.time:''))});if(items.length)rows.push({date:key,items:items})});return rows;
  }
  function previewMarkup(state){var rows=shareRows(state);return'<div class="calendarPdfPreviewV42"><header><span>WORK + WORKOUT</span><h3>'+safe(dateLabel(state.range.start,{month:'long',year:'numeric'}))+' work schedule</h3><small>'+safe(dateLabel(state.range.start,{month:'short',day:'numeric'}))+' – '+safe(dateLabel(state.range.end,{month:'short',day:'numeric',year:'numeric'}))+'</small></header><div>'+rows.map(function(row){return'<article><time>'+safe(dateLabel(row.date,{weekday:'short',month:'short',day:'numeric'}))+'</time><p>'+row.items.map(function(item){return'<span>'+safe(item)+'</span>'}).join('')+'</p></article>'}).join('')+(rows.length?'':'<p class="calendarBriefEmptyV42">No selected calendar items in this range.</p>')+'</div><footer>Shared from Work + Workout · '+new Date().toLocaleDateString()+'</footer></div>'}
  function pdfPlain(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'-')}
  function pdfText(value){return pdfPlain(value).replace(/([\\()])/g,'\\$1')}
  function pdfLines(value){
    var remaining=pdfPlain(value),lines=[];
    while(remaining.length>90){var cut=remaining.lastIndexOf(' ',90);if(cut<30)cut=90;lines.push(remaining.slice(0,cut));remaining='  '+remaining.slice(cut).trimStart()}
    lines.push(remaining);return lines;
  }
  function buildPdf(state){
    var rows=shareRows(state),title=dateLabel(state.range.start,{month:'long',year:'numeric'})+' Work Schedule',range=dateLabel(state.range.start,{month:'short',day:'numeric'})+' - '+dateLabel(state.range.end,{month:'short',day:'numeric',year:'numeric'}),groups=[];
    rows.forEach(function(row){var lines=[dateLabel(row.date,{weekday:'short',month:'short',day:'numeric'})];row.items.forEach(function(item){lines.push(...pdfLines('  '+item))});lines.push('');groups.push(lines)});if(!rows.length)groups.push(['No selected calendar items in this range.']);
    var pages=[],pending=[];groups.forEach(function(group){if(pending.length&&pending.length+group.length>44){pages.push(pending);pending=[]}var heading=group[0];while(group.length>44){pages.push(group.slice(0,44));group=[heading+' (continued)',...group.slice(44)]}pending.push(...group)});if(pending.length)pages.push(pending);
    var pageIds=pages.map(function(_,i){return 5+i*2}),objects={1:'<< /Type /Catalog /Pages 2 0 R >>',2:'<< /Type /Pages /Kids ['+pageIds.map(function(value){return value+' 0 R'}).join(' ')+'] /Count '+pages.length+' >>',3:'<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',4:'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'};
    pages.forEach(function(page,i){var pageId=5+i*2,contentId=pageId+1,content='BT /F2 16 Tf 46 752 Td ('+pdfText(title)+') Tj /F1 9 Tf 0 -22 Td ('+pdfText(range)+') Tj ET 0.7 G 46 716 m 566 716 l S 0 g BT /F1 9 Tf 46 696 Td 14 TL '+page.map(function(line){return'('+pdfText(line)+') Tj T*'}).join(' ')+' ET BT /F1 8 Tf 46 32 Td (Shared from Work + Workout - '+(i+1)+' / '+pages.length+') Tj ET';objects[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentId+' 0 R >>';objects[contentId]='<< /Length '+new TextEncoder().encode(content).length+' >>\nstream\n'+content+'\nendstream'});
    var max=Math.max.apply(null,Object.keys(objects).map(Number)),output='%PDF-1.4\n%WW\n',offsets=[0];for(var n=1;n<=max;n++){offsets[n]=new TextEncoder().encode(output).length;output+=n+' 0 obj\n'+objects[n]+'\nendobj\n'}var xref=new TextEncoder().encode(output).length;output+='xref\n0 '+(max+1)+'\n0000000000 65535 f \n';for(var o=1;o<=max;o++)output+=String(offsets[o]).padStart(10,'0')+' 00000 n \n';output+='trailer\n<< /Size '+(max+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';return new Blob([output],{type:'application/pdf'})
  }
  function openShare(){
    var current=monthRange(0),root=overlay('calendarShareSheetV42','Share calendar');root.querySelector('.calendarSheetBodyV42').innerHTML=sheetHead('Share calendar','Create a PDF for anyone, even without the app.',false)+'<section class="calendarShareFormV42"><div><p class="calendarEyebrowV42">1. CHOOSE DATE RANGE</p><div class="shareRangesV42"><label><input type="radio" name="range" value="this" checked><span>This month</span></label><label><input type="radio" name="range" value="next"><span>Next month</span></label><label><input type="radio" name="range" value="custom"><span>Custom</span></label></div><div class="shareCustomDatesV42" hidden><input name="shareStart" type="date" aria-label="First day to share" value="'+current.start+'"><input name="shareEnd" type="date" aria-label="Last day to share" value="'+current.end+'"></div></div><div><p class="calendarEyebrowV42">2. INCLUDE</p><div class="shareIncludesV42">'+[['work','Work shifts',true],['overtime','Overtime / extra shifts',true],['daysOff','Days off',true],['holidays','Holidays',true],['workouts','Workouts',false],['notes','Notes',false]].map(function(item){return'<label><span>'+item[1]+'</span><input name="include-'+item[0]+'" type="checkbox" '+(item[2]?'checked':'')+'></label>'}).join('')+'</div></div><div id="calendarPdfPreviewV42"></div></section><footer class="calendarFlowActionsV42"><button type="button" data-sheet-close>Cancel</button><button class="primary" type="button" data-preview-pdf>Preview PDF</button></footer>';bindSheetBack(root);root.querySelector('[data-sheet-close]').onclick=closeOverlay;root.querySelectorAll('[name="range"]').forEach(function(input){input.onchange=function(){root.querySelector('.shareCustomDatesV42').hidden=input.value!=='custom'}});var previewButton=root.querySelector('[data-preview-pdf]');function preview(){var state=shareState(root);if(!state.range.start||!state.range.end||state.range.end<state.range.start){toast?.('Choose a valid date range');return}root.querySelector('#calendarPdfPreviewV42').innerHTML=previewMarkup(state);previewButton.textContent='Share PDF';previewButton.dataset.shareReady='true';previewButton.onclick=function(){sharePdf(state)}}function invalidatePreview(){root.querySelector('#calendarPdfPreviewV42').replaceChildren();previewButton.textContent='Preview PDF';delete previewButton.dataset.shareReady;previewButton.onclick=preview}root.addEventListener('input',invalidatePreview);root.addEventListener('change',invalidatePreview);previewButton.onclick=preview
  }
  async function sharePdf(state){
    var blob=buildPdf(state),fileName='work-and-workout-calendar-'+state.range.start+'-to-'+state.range.end+'.pdf',file=new File([blob],fileName,{type:'application/pdf'});
    try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'My Work + Workout calendar',text:'My work schedule',files:[file]});return}}catch(error){if(error?.name==='AbortError')return}
    pdfUrl=URL.createObjectURL(blob);var link=document.createElement('a');link.href=pdfUrl;link.download=fileName;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=''}},30000);toast?.('PDF saved. Share it from your downloads.')
  }

  function keyHandler(event){if(event.key!=='Escape')return;if(document.querySelector('.calendarOverlayV42'))closeOverlay();else closeDaySheet()}
  function outsideDayHandler(event){if(!document.body.classList.contains('calendarDaySheetOpenV42'))return;if(event.target.closest('#dayCard,.calDay[data-date],[data-week-date]'))return;closeDaySheet()}
  function watchCalendarRenders(){
    var calendar=document.getElementById('page-calendar');if(!calendar)return;
    new MutationObserver(function(records){
      var needsDecorate=records.some(function(record){
        var target=record.target.nodeType===1?record.target:record.target.parentElement;
        if(!target?.closest?.('#calendarGrid,#dayCard,#calendarWeekRailV33'))return false;
        var nodes=Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).filter(function(node){return node.nodeType===1});
        return nodes.some(function(node){return !node.matches?.('.calendarMarkersV42,.calendarCellDetailsV47,.calendarDayBriefV42,.calendarDayCloseV42')});
      });
      if(needsDecorate)queueDecorate();
    }).observe(calendar,{subtree:true,childList:true});
  }
  function boot(){
    decorate();watchCalendarRenders();document.addEventListener('keydown',keyHandler);document.addEventListener('click',outsideDayHandler);window.addEventListener('wgc:authchange',function(){setTimeout(decorate,80)});window.addEventListener('wgc:profile-ready',function(){setTimeout(decorate,80)})
  }
  API.closeDaySheet=closeDaySheet;
  API.openAdd=openAdd;API.openShare=openShare;API.openFilters=openFilters;API.openHolidaySettings=openHolidaySettings;API.holidaysForYear=holidaysForYear;API.buildPdf=buildPdf;API.shareRows=shareRows;API.refresh=refreshCalendar;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
