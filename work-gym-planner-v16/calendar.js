// App state -----------------------------------------------------------------
let calView=new Date(),selectedDate=dkey(),trainingDate=null,foodState={editId:null,base:null,meal:'Breakfast'},bDraft=null,bConfidence={},bPhotoFile=null,bRotation=0,barcodeScanner=null,lastFocus=null;

function renderAll(){renderHeader();renderTodayDashboard?.();renderHealthSummary?.();renderCalendar();renderDiary();renderProgress();renderMore();if(document.querySelector('#page-training.active'))renderTraining()}
function renderHeader(){let p=profile();$('profileLine').textContent=p?`${p.name||'Profile'} · Your adaptive plan`:'Set up your profile';let menu=$('variableJobMenu');if(menu)menu.textContent='Import a schedule'}

// Calendar ------------------------------------------------------------------
const DAY_ITEMS_KEY=PREFIX+'calendar-items';
const CALENDAR_DISPLAY_KEY=PREFIX+'calendar-display';
const RECURRING_CALENDAR_ITEMS_KEY=PREFIX+'recurring-calendar-items';
function calendarDisplayMode(){return jget(CALENDAR_DISPLAY_KEY,'details')==='compact'?'compact':'details'}
function setCalendarDisplayMode(mode){jset(CALENDAR_DISPLAY_KEY,mode==='compact'?'compact':'details');renderCalendar()}
function dayItems(){return jget(DAY_ITEMS_KEY,{})}
function saveDayItems(items){jset(DAY_ITEMS_KEY,items);window.WGC18?.queueSync?.()}
function recurringCalendarItems(){let items=jget(RECURRING_CALENDAR_ITEMS_KEY,[]);return Array.isArray(items)?items.filter(item=>item?.id&&item?.title&&item?.startDate):[]}
function saveRecurringCalendarItems(items){jset(RECURRING_CALENDAR_ITEMS_KEY,items);window.WGC18?.queueSync?.()}
function recurrenceLabel(frequency){return({weekly:'Repeats weekly',biweekly:'Repeats every 2 weeks',monthly:'Repeats monthly',yearly:'Repeats yearly'})[frequency]||'Repeats'}
function recurrenceMatches(item,k){
 if((item.excludedDates||[]).includes(k))return false;
 let start=date(item.startDate),current=date(k);if(!start||!current||current<start)return false;
 let days=Math.floor((current-start)/86400000),frequency=item.frequency||'monthly';
 if(frequency==='weekly')return days%7===0;
 if(frequency==='biweekly')return days%14===0;
 if(frequency==='yearly')return current.getMonth()===start.getMonth()&&current.getDate()===start.getDate();
 if(frequency==='monthly'){let last=new Date(current.getFullYear(),current.getMonth()+1,0).getDate();return current.getDate()===Math.min(start.getDate(),last)}
 return false
}
function recurringCalendarItemsOn(k){return recurringCalendarItems().filter(item=>recurrenceMatches(item,k)).map(item=>({id:`recurring-calendar-${item.id}-${k}`,seriesId:item.id,title:item.title,time:item.time||'',end:item.end||'',type:item.type||'event',category:item.category||'event',reminderMinutes:+item.reminderMinutes||0,recurring:true,sourceRecurring:'calendar',frequency:item.frequency,done:(item.completedDates||[]).includes(k)}))}
function addRecurringCalendarItem(k,item){let now=new Date().toISOString(),all=recurringCalendarItems();all.push({id:uid('recurring'),title:item.title.trim(),time:item.time||'',end:item.end||'',type:item.type==='todo'?'todo':'event',category:item.category||item.type||'event',reminderMinutes:+item.reminderMinutes||0,frequency:item.frequency||'monthly',startDate:k,createdAt:now,updatedAt:now});saveRecurringCalendarItems(all)}
function patchRecurringCalendarItem(id,patch){saveRecurringCalendarItems(recurringCalendarItems().map(item=>item.id===id?{...item,...patch,updatedAt:new Date().toISOString()}:item))}
function deleteRecurringCalendarItem(id){saveRecurringCalendarItems(recurringCalendarItems().filter(item=>item.id!==id))}
function skipRecurringCalendarItem(id,k){saveRecurringCalendarItems(recurringCalendarItems().map(item=>item.id===id?{...item,excludedDates:[...new Set([...(item.excludedDates||[]),k])],updatedAt:new Date().toISOString()}:item))}
function toggleRecurringCalendarItem(id,k){let done=false;saveRecurringCalendarItems(recurringCalendarItems().map(item=>{if(item.id!==id)return item;let dates=item.completedDates||[];done=!dates.includes(k);return{...item,completedDates:done?[...dates,k]:dates.filter(value=>value!==k),updatedAt:new Date().toISOString()}}));return done}
function recurringItemsOn(k){
 let saved=jget(PREFIX+'onboarding-v18',{}),commitments=saved?.answers?.work?.commitments||[],weekday=date(k).getDay();
 return commitments.filter(x=>x.day===weekday).map((x,index)=>({id:`recurring-${weekday}-${index}`,title:x.label||'Recurring commitment',time:x.start&&x.end?`${x.start}–${x.end}`:(x.start||''),type:'event',recurring:true,sourceRecurring:'commitment',done:false}))
}
function personalItemsOn(k){return (dayItems()[k]||[]).slice().sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'))}
function agendaItemsOn(k){return [...recurringItemsOn(k),...recurringCalendarItemsOn(k),...personalItemsOn(k)].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'))}
function addDayItem(k,item){let all=dayItems();all[k]=[...(all[k]||[]),{id:uid('agenda'),title:item.title.trim(),time:item.time||'',end:item.end||'',type:item.type==='event'?'event':'todo',category:item.category||item.type||'todo',reminderMinutes:+item.reminderMinutes||0,done:false,createdAt:new Date().toISOString()}];saveDayItems(all)}
function patchDayItem(k,id,patch){let all=dayItems();all[k]=(all[k]||[]).map(item=>item.id===id?{...item,...patch}:item);saveDayItems(all)}
function deleteDayItem(k,id){let all=dayItems();all[k]=(all[k]||[]).filter(item=>item.id!==id);if(!all[k].length)delete all[k];saveDayItems(all)}
function workScheduleRows(k){
 let p=profile(),s=workState(k),smart=typeof smartWork==='function'?smartWork(k):null,rows=[];
 if(s.fixed&&p?.fixed)rows.push({name:p.fixed.name||'Work shift',time:p.fixed.start&&p.fixed.end?`${p.fixed.start}–${p.fixed.end}`:'Scheduled work'});
 if(smart&&s.variable===true)rows.push({name:smart.label||p?.variable?.name||'Work shift',time:smart.start&&smart.end?`${smart.start}–${smart.end}`:(smart.start||'Scheduled work')});
 else if(s.variable===true&&p?.variable)rows.push({name:p.variable.name||'Work shift',time:p.variable.start&&p.variable.end?`${p.variable.start}–${p.variable.end}`:'Scheduled work'});
 if(s.kind==='unknown'&&p?.variable?.enabled)rows.push({name:p.variable.name||'Work schedule',time:'Date needs review',unknown:true});
 return rows
}
function calendarCellDetails(workRows,agenda,gym,k){
 let entries=[];
 if(workRows.length){let row=workRows.find(item=>!item.unknown)||workRows[0];entries.push(`<span class="dayDetail work" style="--detail-color:${esc(row.color||'#58a6ff')}" title="${esc(row.name)}">${esc(row.name)}</span>`)}
 if(agenda.length){let item=agenda[0];entries.push(`<span class="dayDetail plan" title="${esc(item.title)}">${esc(item.title)}</span>`)}
 else if(gym){let label=typeof plannedWorkoutName==='function'?plannedWorkoutName(k):'Training';entries.push(`<span class="dayDetail training" title="${esc(label)}">${esc(label)}</span>`)}
 return entries.slice(0,2).join('')
}
function renderCalendarWeekRail(){
 let root=$('calendarWeekRailV33');if(!root)return;
 let anchor=date(selectedDate),offset=(anchor.getDay()+6)%7,start=new Date(anchor);start.setDate(anchor.getDate()-offset);let h='';
 for(let i=0;i<7;i++){
  let current=new Date(start);current.setDate(start.getDate()+i);let k=dkey(current),work=workScheduleRows(k).some(row=>!row.unknown),plans=agendaItemsOn(k).length,training=isScheduled(k)||!!completedOn(k);
  h+=`<button type="button" data-week-date="${k}" class="${k===selectedDate?'selected ':''}${k===dkey()?'today':''}" aria-label="${esc(fmt(k))}"><small>${current.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2)}</small><b>${current.getDate()}</b><span>${work?'<i class="work"></i>':''}${training?'<i class="training"></i>':''}${plans?'<i class="plan"></i>':''}</span></button>`
 }
 root.innerHTML=h;
 root.querySelectorAll('[data-week-date]').forEach(button=>button.onclick=()=>{selectedDate=button.dataset.weekDate;calView=date(selectedDate);renderCalendar()})
}
function renderCalendar(){
 let y=calView.getFullYear(),m=calView.getMonth(),ym=`${y}-${String(m+1).padStart(2,'0')}`;
 let display=calendarDisplayMode();
 let legend=document.querySelector('#page-calendar .legend');if(legend)legend.innerHTML=window.WWV25?.legendMarkup?.()||'<span><i class="dot blue"></i>Work</span><span><i class="dot green"></i>Training</span><span><i class="dot purple"></i>Plans &amp; to-do</span><span><i class="dot gray"></i>Needs review</span>';
 $('calendarHeading').textContent=new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
 let days=new Date(y,m+1,0).getDate(),first=(new Date(y,m,1).getDay()+6)%7,h='';
 for(let i=0;i<first;i++)h+='<button class="calDay empty" aria-hidden="true"></button>';
 for(let n=1;n<=days;n++){
  let k=`${ym}-${String(n).padStart(2,'0')}`,s=workState(k),comp=completedOn(k),gym=!!comp||isScheduled(k),agenda=agendaItemsOn(k),workRows=workScheduleRows(k),classes=['calDay'];
  if(s.kind==='unknown')classes.push('unknown');if(agenda.length)classes.push('hasAgenda');if(k===selectedDate)classes.push('selected');if(k===dkey())classes.push('today');if(window.WWV25?.isShiftPickerDate?.(k))classes.push('shiftPickV35');
  let workDots=window.WWV25?.workDots?.(workRows)||((workRows.some(row=>!row.unknown)?'<i class="dot blue"></i>':'')),dots='<span class="dayDots">'+workDots+(gym?'<i class="dot green"></i>':'')+(agenda.length?'<i class="dot purple"></i>':'')+(s.kind==='unknown'?'<i class="dot gray"></i>':'')+'</span>',details=calendarCellDetails(workRows,agenda,gym,k);
  let tr=gym?(typeof plannedWorkoutName==='function'?plannedWorkoutName(k,comp?.workoutIndex??projectedWorkoutIndex(k)):(comp?WORKOUTS[comp.workoutIndex].name:WORKOUTS[projectedWorkoutIndex(k)].name)):'No training planned',aria=`${fmt(k)}. ${workRows.length?workRows.map(row=>`${row.name} ${row.time}`).join('. '):'No work added'}. Training: ${tr}. ${agenda.length} plan ${agenda.length===1?'item':'items'}.${s.kind==='unknown'?' Work schedule needs review.':''}`;
  h+=`<button class="${classes.join(' ')}" data-date="${k}" role="gridcell" aria-label="${esc(aria)}"><span class="dayNum">${n}</span>${dots}${details?`<span class="dayDetails">${details}</span>`:''}${agenda.length?`<span class="agendaCount">${agenda.length}</span>`:''}${s.kind==='unknown'?'<span class="unknownMark">?</span>':''}</button>`
 }
 $('calendarGrid').innerHTML=h;
 $('calendarGrid').dataset.display=display;
 $$('[data-calendar-display]').forEach(button=>{let active=button.dataset.calendarDisplay===display;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
 $$('.calDay[data-date]').forEach(b=>b.onclick=()=>{if(window.WWV25?.handleCalendarDateTap?.(b.dataset.date))return;selectedDate=b.dataset.date;renderCalendar()});
 renderCalendarWeekRail();renderDayCard();window.WWV25?.renderWeekSummary?.(selectedDate);window.WWV25?.renderShiftPicker?.()
}
function renderDayCard(){
 let k=selectedDate,s=workState(k),comp=completedOn(k),scheduled=isScheduled(k),wi=comp?comp.workoutIndex:(scheduled?projectedWorkoutIndex(k):null),t=target(k),unknown=s.kind==='unknown',agenda=agendaItemsOn(k),workRows=workScheduleRows(k);
 let tr=wi!=null?(typeof plannedWorkoutName==='function'?plannedWorkoutName(k,wi):WORKOUTS[wi].name):'Recovery / no planned lifting';
 let workCount=workRows.filter(row=>!row.unknown).length,workLabel=workCount?`${workCount} work block${workCount===1?'':'s'}`:(unknown?'Work needs review':'No work added');
 let badges=`<div class="dayPills"><span class="pill ${unknown?'warn':''}"><small>Work</small><b>${workLabel}</b></span><span class="pill ${wi!=null?'good':''}"><small>Training</small><b>${esc(tr)}</b></span><span class="pill"><small>Fuel</small><b>${t.cal} kcal · ${t.p}g protein</b></span></div>`;
 let schedule=`<section class="daySchedule"><div class="daySectionHead"><div><small>DAY PLAN</small><h3>Timeline</h3></div></div>${workRows.map((row,index)=>`<div class="dayScheduleRow ${row.unknown?'unknown':''} ${row.done?'done':''}" ${row.color?`style="--source-color:${esc(row.color)}"`:''}><span aria-hidden="true">${row.unknown?'?':(row.done?'✓':'W')}</span><div><b>${esc(row.name)}</b><small>${esc(row.time)}${row.done?' · completed':''}</small></div>${!row.unknown?`<span class="dayItemActionsV34"><button type="button" data-work-toggle="${index}" aria-label="${row.done?'Mark incomplete':'Mark complete'} ${esc(row.name)}">${row.done?'Undo':'Done'}</button><button type="button" data-work-delete="${index}" aria-label="Remove ${esc(row.name)} from ${esc(fmt(k))}">Remove</button></span>`:''}</div>`).join('')||'<div class="dayScheduleEmpty">No work scheduled.</div>'}${wi!=null?`<div class="dayScheduleRow workout"><span aria-hidden="true">↗</span><div><b>${esc(tr)}</b><small>${comp?'Completed':profile()?.trainingMode==='existing'?`${plannedWorkoutTime(k)||'Time flexible'} · your routine`:'Planned around your workday'}</small></div></div>`:'<div class="dayScheduleRow recovery"><span aria-hidden="true">○</span><div><b>Recovery</b><small>No training planned</small></div></div>'}</section>`;
 let agendaRows=agenda.map(item=>{let canEdit=!item.recurring||item.sourceRecurring==='calendar',canComplete=!item.recurring||item.sourceRecurring==='calendar',repeatText=item.sourceRecurring==='calendar'?` · ${recurrenceLabel(item.frequency)}`:(item.recurring?' · repeats weekly':'');return`<div class="dayAgendaRow ${item.done?'done':''} ${item.recurring?'recurring':''}">${canComplete?`<button class="agendaCheck" data-agenda-toggle="${esc(item.id)}" aria-label="${item.done?'Mark incomplete':'Mark complete'}">${item.done?'✓':''}</button>`:`<span class="agendaEvent" aria-hidden="true">↻</span>`}<div><b>${esc(item.title)}</b><small>${esc(item.time?item.time+(item.end?'–'+item.end:''):(item.type==='todo'?'Any time':'Scheduled item'))}${item.reminderMinutes?` · reminder ${item.reminderMinutes} min before`:''}${repeatText}</small></div>${canEdit?`<span class="agendaActions"><button class="agendaEdit" data-agenda-edit="${esc(item.id)}" aria-label="Edit ${esc(item.title)}">Edit</button><button class="agendaDelete" data-agenda-delete="${esc(item.id)}" aria-label="Remove ${esc(item.title)}">Remove</button></span>`:''}</div>`}).join('');
 let agendaSection=`<section class="dayAgenda"><div class="daySectionHead"><div><small>PERSONAL</small><h3>Plans &amp; tasks</h3></div><span>${agenda.length}</span></div><div class="dayAgendaList">${agendaRows||'<p class="dayScheduleEmpty">No personal plans yet.</p>'}</div><button id="dayAddToggleV33" class="dayAddToggleV33" type="button"><span>+</span> Add item</button><form class="dayAgendaForm" data-agenda-form hidden><input name="editId" type="hidden"><div class="dayAgendaPrimaryV33"><select name="type" aria-label="Item type"><option value="todo">To-do</option><option value="event">Event</option></select><input name="title" type="text" required maxlength="100" placeholder="What needs to happen?" aria-label="Item title"></div><div class="dayAgendaMetaV33"><input name="time" type="time" aria-label="Item time"><select name="reminderMinutes" aria-label="Reminder"><option value="0">No reminder</option><option value="15">15 min reminder</option><option value="30">30 min reminder</option><option value="60">1 hour reminder</option><option value="720">12 hour reminder</option></select><select name="repeat" aria-label="Repeat"><option value="none">Does not repeat</option><option value="weekly">Every week</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Every month</option><option value="yearly">Every year</option></select></div><div class="dayAgendaSubmitV33"><button name="cancelEdit" type="button">Cancel</button><button class="primary" type="submit">Add</button></div></form></section>`;
 let action=wi!=null?`<button class="primary wideBtn openWorkout" data-openwork="${k}">Open workout</button>`:(!unknown?`<button class="secondary wideBtn openWorkout" data-traintoday="${k}">Train on this day</button>`:'');
 $('dayCard').innerHTML=`<header class="dayCardHeadV33"><div><small>SELECTED DAY</small><h2>${fmt(k)}</h2></div><button id="dayCardAddV33" type="button" aria-label="Add a plan to ${esc(fmt(k))}">+</button></header>${badges}${schedule}${agendaSection}${unknown?'<p><b>This work date needs review.</b> Confirm it before automatic training placement.</p>':''}${comp?'<p>This completed session is protected in your history.</p>':''}${action}`;
 let ow=$('[data-openwork]');if(ow)ow.onclick=()=>openTrainingDate(k);
 let td=$('[data-traintoday]');if(td)td.onclick=()=>{let o=overrides();o[k]={action:'train',createdAt:new Date().toISOString()};saveOverrides(o);renderCalendar();openTrainingDate(k)};
 $$('[data-work-toggle]').forEach(button=>button.onclick=()=>{let row=workRows[+button.dataset.workToggle];if(!row)return;let done=window.WWV25?.toggleWorkItemDone?.(row,k);toast(done?'Work item completed':'Work item reopened');renderCalendar()});
 $$('[data-work-delete]').forEach(button=>button.onclick=()=>{let row=workRows[+button.dataset.workDelete];if(!row||!confirm(`Remove “${row.name}” from ${fmt(k)}?`))return;if(window.WWV25?.removeWorkItem?.(row,k)){toast(row.rotationId?'This date was removed; the rotation is unchanged':'Work item removed');renderCalendar()}});
 $$('[data-agenda-toggle]').forEach(button=>button.onclick=()=>{let item=agendaItemsOn(k).find(x=>x.id===button.dataset.agendaToggle);if(!item)return;if(item.sourceRecurring==='calendar')toggleRecurringCalendarItem(item.seriesId,k);else patchDayItem(k,item.id,{done:!item.done});renderCalendar()});
 $$('[data-agenda-delete]').forEach(button=>button.onclick=()=>{let item=agendaItemsOn(k).find(x=>x.id===button.dataset.agendaDelete);if(!item)return;if(item.sourceRecurring==='calendar'){skipRecurringCalendarItem(item.seriesId,k);toast('Removed from this date; the repeat schedule is unchanged')}else{deleteDayItem(k,item.id);toast('Calendar item removed')}renderCalendar()});
 let form=$('[data-agenda-form]');if(form){let reveal=()=>{form.hidden=false;$('dayAddToggleV33').hidden=true;requestAnimationFrame(()=>form.elements.title.focus())};$('dayAddToggleV33').onclick=reveal;$('dayCardAddV33').onclick=reveal;$$('[data-agenda-edit]').forEach(button=>button.onclick=()=>{let item=agendaItemsOn(k).find(x=>x.id===button.dataset.agendaEdit);if(!item)return;reveal();form.elements.editId.value=item.sourceRecurring==='calendar'?`recurring:${item.seriesId}`:item.id;form.elements.type.value=item.type||'todo';form.elements.title.value=item.title||'';form.elements.time.value=item.time||'';form.elements.reminderMinutes.value=String(item.reminderMinutes||0);form.elements.repeat.value=item.sourceRecurring==='calendar'?(item.frequency||'monthly'):'none';form.querySelector('[type="submit"]').textContent='Save'});form.elements.cancelEdit.onclick=()=>renderCalendar();form.onsubmit=event=>{event.preventDefault();let title=form.elements.title.value.trim();if(!title)return;let payload={title,type:form.elements.type.value,time:form.elements.time.value,reminderMinutes:+form.elements.reminderMinutes.value||0,frequency:form.elements.repeat.value},editId=form.elements.editId.value,isRecurring=editId.startsWith('recurring:');if(isRecurring){let id=editId.slice('recurring:'.length);if(payload.frequency==='none'){deleteRecurringCalendarItem(id);addDayItem(k,payload);toast('Repeating event changed to a one-time item')}else{patchRecurringCalendarItem(id,payload);toast('Repeating event updated')}}else if(editId){if(payload.frequency==='none'){patchDayItem(k,editId,payload);toast('Calendar item updated')}else{deleteDayItem(k,editId);addRecurringCalendarItem(k,payload);toast('Calendar item now repeats')}}else if(payload.frequency!=='none'){addRecurringCalendarItem(k,payload);toast(`${recurrenceLabel(payload.frequency)} added to your calendar`)}else{addDayItem(k,payload);toast('Added to your calendar')}renderCalendar()}}
}
window.openCalendarDate=function(k=dkey()){
 selectedDate=k;calView=date(k);
 let button=document.querySelector('.bottomNav [data-page="calendar"]');
 if(button)button.click();else window.page?.('calendar');
 renderCalendar()
};
window.setCalendarDisplayMode=setCalendarDisplayMode;
