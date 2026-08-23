// v16.9: make optional single-job workouts explicit throughout the calendar UI.
const _renderCalendarSingleUI169=renderCalendar;
renderCalendar=function(){
 _renderCalendarSingleUI169();
 let legend=document.querySelector('#page-calendar .legend');
 if(legend&&!legend.querySelector('.singleJobLegend'))legend.insertAdjacentHTML('beforeend','<span class="singleJobLegend"><i class="dot blue"></i>Workout available</span>');
};
const _renderDayCardSingleUI169=renderDayCard;
renderDayCard=function(){
 _renderDayCardSingleUI169();let k=selectedDate;
 if(singleJobWorkoutAvailable(k)&&!isScheduled(k)){
  let pills=$$('#dayCard .dayPills .pill'),name=singleJobWorkoutName(k);
  if(pills[1]){pills[1].textContent='Workout available · '+name;pills[1].classList.add('good')}
  let btn=$('#dayCard [data-traintoday]');if(btn){btn.textContent='Open '+name;btn.classList.remove('secondary');btn.classList.add('primary')}
 }
};
