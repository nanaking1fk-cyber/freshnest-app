// App state -----------------------------------------------------------------
let calView=new Date(),selectedDate=dkey(),trainingDate=null,foodState={editId:null,base:null,meal:'Breakfast'},bDraft=null,bConfidence={},bPhotoFile=null,bRotation=0,barcodeScanner=null,lastFocus=null;

function renderAll(){renderHeader();renderTodayDashboard?.();renderHealthSummary?.();renderCalendar();renderDiary();renderProgress();renderMore();if(document.querySelector('#page-training.active'))renderTraining()}
function renderHeader(){let p=profile(),jobs=[];if(p?.fixed?.enabled)jobs.push(p.fixed.name||'Fixed job');if(p?.variable?.enabled)jobs.push(p.variable.name||'Variable job');$('profileLine').textContent=p?`${p.name||'Profile'}${jobs.length?' · '+jobs.join(' + '):''}`:'Set up your profile';$('variableJobMenu').textContent=(p?.variable?.name||'Variable schedule')+' schedule'}

// Calendar ------------------------------------------------------------------
const DAY_ITEMS_KEY=PREFIX+'calendar-items';
function dayItems(){return jget(DAY_ITEMS_KEY,{})}
function saveDayItems(items){jset(DAY_ITEMS_KEY,items);window.WGC18?.queueSync?.()}
function recurringItemsOn(k){
 let saved=jget(PREFIX+'onboarding-v18',{}),commitments=saved?.answers?.work?.commitments||[],weekday=date(k).getDay();
 return commitments.filter(x=>x.day===weekday).map((x,index)=>({id:`recurring-${weekday}-${index}`,title:x.label||'Recurring commitment',time:x.start&&x.end?`${x.start}–${x.end}`:(x.start||''),type:'event',recurring:true,done:false}))
}
function personalItemsOn(k){return (dayItems()[k]||[]).slice().sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'))}
function agendaItemsOn(k){return [...recurringItemsOn(k),...personalItemsOn(k)]}
function addDayItem(k,item){let all=dayItems();all[k]=[...(all[k]||[]),{id:uid('agenda'),title:item.title.trim(),time:item.time||'',end:item.end||'',type:item.type==='event'?'event':'todo',category:item.category||item.type||'todo',reminderMinutes:+item.reminderMinutes||0,done:false,createdAt:new Date().toISOString()}];saveDayItems(all)}
function patchDayItem(k,id,patch){let all=dayItems();all[k]=(all[k]||[]).map(item=>item.id===id?{...item,...patch}:item);saveDayItems(all)}
function deleteDayItem(k,id){let all=dayItems();all[k]=(all[k]||[]).filter(item=>item.id!==id);if(!all[k].length)delete all[k];saveDayItems(all)}
function workScheduleRows(k){
 let p=profile(),s=workState(k),smart=typeof smartWork==='function'?smartWork(k):null,rows=[];
 if(s.fixed&&p?.fixed)rows.push({name:p.fixed.name||'Primary job',time:p.fixed.start&&p.fixed.end?`${p.fixed.start}–${p.fixed.end}`:'Scheduled work'});
 if(smart&&s.variable===true)rows.push({name:smart.label||p?.variable?.name||'Work shift',time:smart.start&&smart.end?`${smart.start}–${smart.end}`:(smart.start||'Scheduled work')});
 else if(s.variable===true&&p?.variable)rows.push({name:p.variable.name||'Secondary job',time:p.variable.start&&p.variable.end?`${p.variable.start}–${p.variable.end}`:'Scheduled work'});
 if(s.kind==='unknown'&&p?.variable?.enabled)rows.push({name:p.variable.name||'Secondary job',time:'Schedule not reviewed',unknown:true});
 return rows
}
function renderCalendar(){
 let y=calView.getFullYear(),m=calView.getMonth(),ym=`${y}-${String(m+1).padStart(2,'0')}`;
 let legend=document.querySelector('#page-calendar .legend');if(legend&&!legend.querySelector('.agendaLegend'))legend.insertAdjacentHTML('beforeend','<span class="agendaLegend"><i class="dot purple"></i>Schedule / to-do</span>');
 $('calendarHeading').textContent=new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
 let days=new Date(y,m+1,0).getDate(),first=(new Date(y,m,1).getDay()+6)%7,h='';
 for(let i=0;i<first;i++)h+='<button class="calDay empty" aria-hidden="true"></button>';
 for(let n=1;n<=days;n++){
  let k=`${ym}-${String(n).padStart(2,'0')}`,s=workState(k),comp=completedOn(k),gym=!!comp||isScheduled(k),ow=fixedOffWeekend(k),t=target(k),agenda=agendaItemsOn(k),classes=['calDay'];
  if(s.kind==='both')classes.push('both');if(ow)classes.push('offwk');if(s.kind==='unknown')classes.push('unknown');if(agenda.length)classes.push('hasAgenda');if(k===selectedDate)classes.push('selected');if(k===dkey())classes.push('today');
  let dots=`<span class="dayDots"><i class="dot ${s.kind==='both'?'red':'gray'}"></i>${gym?'<i class="dot green"></i>':''}${agenda.length?'<i class="dot purple"></i>':''}${ow?'<i class="dot yellow"></i>':''}</span>`;
  let tr=gym?(comp?WORKOUTS[comp.workoutIndex].name:WORKOUTS[projectedWorkoutIndex(k)].name):'No planned lifting',aria=`${fmt(k)}. Work: ${workText(k)}. Training: ${tr}. ${agenda.length} calendar ${agenda.length===1?'item':'items'}. ${t.cal} calories.${s.kind==='unknown'?' Variable work schedule unknown.':''}`;
  h+=`<button class="${classes.join(' ')}" data-date="${k}" role="gridcell" aria-label="${esc(aria)}"><span class="dayNum">${n}</span>${dots}<span class="dayKcal">${t.cal}</span>${agenda.length?`<span class="agendaCount">${agenda.length}</span>`:''}${s.kind==='unknown'?'<span class="unknownMark">?</span>':''}</button>`
 }
 $('calendarGrid').innerHTML=h;
 $$('.calDay[data-date]').forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;renderCalendar()});
 renderDayCard()
}
function renderDayCard(){
 let k=selectedDate,s=workState(k),comp=completedOn(k),scheduled=isScheduled(k),wi=comp?comp.workoutIndex:(scheduled?projectedWorkoutIndex(k):null),t=target(k),unknown=s.kind==='unknown',agenda=agendaItemsOn(k),workRows=workScheduleRows(k);
 let tr=wi!=null?WORKOUTS[wi].name:'Recovery / no planned lifting';
 let badges=`<div class="dayPills"><span class="pill ${unknown?'warn':''}">${esc(workText(k))}</span><span class="pill ${wi!=null?'good':''}">${esc(tr)}</span><span class="pill">${t.cal} kcal · ${t.p}g protein</span></div>`;
 let schedule=`<section class="daySchedule"><div class="daySectionHead"><div><small>YOUR DAY</small><h3>Work & workout</h3></div></div>${workRows.map(row=>`<div class="dayScheduleRow ${row.unknown?'unknown':''}"><span aria-hidden="true">${row.unknown?'?':'W'}</span><div><b>${esc(row.name)}</b><small>${esc(row.time)}</small></div></div>`).join('')||'<div class="dayScheduleEmpty">No work shift scheduled.</div>'}${wi!=null?`<div class="dayScheduleRow workout"><span aria-hidden="true">↗</span><div><b>${esc(tr)}</b><small>${comp?'Completed workout':'Adaptive workout scheduled'}</small></div></div>`:'<div class="dayScheduleRow recovery"><span aria-hidden="true">○</span><div><b>Recovery day</b><small>No lifting session scheduled</small></div></div>'}</section>`;
 let agendaRows=agenda.map(item=>`<div class="dayAgendaRow ${item.done?'done':''} ${item.recurring?'recurring':''}">${item.type==='todo'&&!item.recurring?`<button class="agendaCheck" data-agenda-toggle="${esc(item.id)}" aria-label="${item.done?'Mark incomplete':'Mark complete'}">${item.done?'✓':''}</button>`:`<span class="agendaEvent" aria-hidden="true">${item.recurring?'↻':'•'}</span>`}<div><b>${esc(item.title)}</b><small>${esc(item.time?item.time+(item.end?'–'+item.end:''):(item.type==='todo'?'Any time':'Scheduled item'))}${item.reminderMinutes?` · reminder ${item.reminderMinutes} min before`:''}${item.recurring?' · repeats weekly':''}</small></div>${item.recurring?'':`<span class="agendaActions"><button class="agendaEdit" data-agenda-edit="${esc(item.id)}" aria-label="Edit ${esc(item.title)}">Edit</button><button class="agendaDelete" data-agenda-delete="${esc(item.id)}" aria-label="Delete ${esc(item.title)}">×</button></span>`}</div>`).join('');
 let agendaSection=`<section class="dayAgenda"><div class="daySectionHead"><div><small>AGENDA</small><h3>Schedule & to-do</h3></div><span>${agenda.length}</span></div><div class="dayAgendaList">${agendaRows||'<p class="dayScheduleEmpty">Nothing else planned. Add a to-do or schedule item below.</p>'}</div><form class="dayAgendaForm" data-agenda-form><input name="editId" type="hidden"><select name="type" aria-label="Item type"><option value="todo">To-do</option><option value="event">Schedule</option></select><input name="title" type="text" required maxlength="100" placeholder="What needs to happen?" aria-label="Item title"><input name="time" type="time" aria-label="Item time"><select name="reminderMinutes" aria-label="Reminder"><option value="0">No reminder</option><option value="15">15 min reminder</option><option value="30">30 min reminder</option><option value="60">1 hour reminder</option><option value="720">12 hour reminder</option></select><button class="primary" type="submit">Add</button><button name="cancelEdit" type="button" hidden>Cancel</button></form></section>`;
 let action=wi!=null?`<button class="primary wideBtn openWorkout" data-openwork="${k}">Open workout</button>`:(!unknown?`<button class="secondary wideBtn openWorkout" data-traintoday="${k}">Train on this day</button>`:'');
 $('dayCard').innerHTML=`<h2>${fmt(k)}</h2>${badges}${schedule}${agendaSection}${unknown?`<p><b>${esc(profile()?.variable?.name||'Variable job')} is UNKNOWN.</b> Review this date before automatic workout scheduling.</p>`:''}${comp?'<p>This completed workout is frozen in history. Future schedule changes will not rewrite it.</p>':''}${action}`;
 let ow=$('[data-openwork]');if(ow)ow.onclick=()=>openTrainingDate(k);
 let td=$('[data-traintoday]');if(td)td.onclick=()=>{let o=overrides();o[k]={action:'train',createdAt:new Date().toISOString()};saveOverrides(o);renderCalendar();openTrainingDate(k)};
 $$('[data-agenda-toggle]').forEach(button=>button.onclick=()=>{let item=personalItemsOn(k).find(x=>x.id===button.dataset.agendaToggle);if(item){patchDayItem(k,item.id,{done:!item.done});renderCalendar()}});
 $$('[data-agenda-delete]').forEach(button=>button.onclick=()=>{deleteDayItem(k,button.dataset.agendaDelete);renderCalendar()});
 let form=$('[data-agenda-form]');if(form){$$('[data-agenda-edit]').forEach(button=>button.onclick=()=>{let item=personalItemsOn(k).find(x=>x.id===button.dataset.agendaEdit);if(!item)return;form.elements.editId.value=item.id;form.elements.type.value=item.type||'todo';form.elements.title.value=item.title||'';form.elements.time.value=item.time||'';form.elements.reminderMinutes.value=String(item.reminderMinutes||0);form.querySelector('[type="submit"]').textContent='Save';form.elements.cancelEdit.hidden=false;form.elements.title.focus()});form.elements.cancelEdit.onclick=()=>renderCalendar();form.onsubmit=event=>{event.preventDefault();let title=form.elements.title.value.trim();if(!title)return;let payload={title,type:form.elements.type.value,time:form.elements.time.value,reminderMinutes:+form.elements.reminderMinutes.value||0},editId=form.elements.editId.value;if(editId){patchDayItem(k,editId,payload);toast('Calendar item updated')}else{addDayItem(k,payload);toast('Added to your calendar')}renderCalendar()}}
}
window.openCalendarDate=function(k=dkey()){
 selectedDate=k;calView=date(k);
 let button=document.querySelector('.bottomNav [data-page="calendar"]');
 if(button)button.click();else window.page?.('calendar');
 renderCalendar()
};
