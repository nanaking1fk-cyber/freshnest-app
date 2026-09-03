// Work + Workout 18.4 guided, adaptive onboarding.
(function guidedOnboarding(){
  const A=window.WGC18=window.WGC18||{};
  const DRAFT_KEY=PREFIX+'guided-onboarding-draft-v30';
  const LEGACY_DRAFT_KEY='wgc-guided-onboarding-v18';
  const PAUSED_SESSION_PREFIX='wgp-v18-guided-paused-';
  const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const safe=window.esc||function(value){return String(value??'').replace(/[&<>"']/g,function(char){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]})};
  let step=0;
  let busy=false;
  let previewReady=false;
  let detailedSetup=false;
  let draft=loadDraft();

  function pausedSessionKey(){return PAUSED_SESSION_PREFIX+(A.session?.user?.id||'local')}

  function loadDraft(){
    try{
      const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
      if(saved&&saved.version===2&&saved.values)return saved;
    }catch{}
    try{
      const legacy=JSON.parse(sessionStorage.getItem(LEGACY_DRAFT_KEY)||'null');
      if(legacy&&legacy.version===2&&legacy.values){localStorage.setItem(DRAFT_KEY,JSON.stringify(legacy));sessionStorage.removeItem(LEGACY_DRAFT_KEY);return legacy}
    }catch{}
    const p=typeof profile==='function'?profile():null;
    const previous=typeof jget==='function'?jget(PREFIX+'onboarding-v18',{})?.answers:null;
    const basics=previous?.basics||{},work=previous?.work||{},training=previous?.training||{},nutrition=previous?.nutrition||{};
    const commitments=(work.commitments||[]).map(function(item){return DAYS[item.day]+' '+item.start+'-'+item.end+' '+(item.label||'Commitment')}).join('\n');
    return{version:2,flow:'quick-v49',step:0,values:{
      name:basics.name||p?.name||'',
      goal:basics.goal||'recomp',
      age:basics.age||'',
      sex:basics.sex||'neutral',
      heightFt:basics.heightFt||(p?.heightIn?Math.floor(p.heightIn/12):''),
      heightIn:basics.heightIn??(p?.heightIn?p.heightIn%12:''),
      weight:basics.weight||'',
      bodyFat:basics.bodyFat||'',
      activity:basics.activity||'moderate',
      workMode:work.scheduleDeferred?'calendar':(work.primaryDays||[]).length||p?.fixed?.enabled?'standard':p?'none':'calendar',
      jobName:work.primaryName||p?.fixed?.name||'Work',
      jobStart:work.primaryStart||p?.fixed?.start||'09:00',
      jobEnd:work.primaryEnd||p?.fixed?.end||'17:00',
      commute:String(work.primaryCommute??p?.fixed?.commuteMin??30),
      secondJob:work.secondaryEnabled||p?.variable?.enabled?'yes':'no',
      secondName:work.secondaryName||p?.variable?.name||'Additional schedule',
      secondStart:work.secondaryStart||p?.variable?.start||'',
      secondEnd:work.secondaryEnd||p?.variable?.end||'',
      secondCommute:String(work.secondaryCommute??p?.variable?.commuteMin??30),
      sleepHours:String(basics.sleepHours||p?.sleepTarget||7.5),
      bedtime:basics.bedtime||'23:00',
      commitments:commitments,
      trainingMode:training.mode||p?.trainingMode||'adaptive',
      existingRoutine:training.existingRoutineText||p?.existingRoutineText||(p?.existingRoutine||[]).map(function(item){return DAYS[item.weekday]+' '+(item.start||'18:00')+' '+(item.name||'Workout')}).join('\n'),
      trainingDays:String(training.days||p?.trainingDaysPerWeek||3),
      duration:String(training.duration||p?.trainingDuration||60),
      experience:training.experience||p?.trainingExperience||'beginner',
      equipment:training.equipment||p?.equipmentMode||'full',
      preferred:training.preferred||p?.trainingPreferred||'flexible',
      limitations:training.limitations||p?.trainingLimitations||'',
      foods:(nutrition.foods||[]).join(', '),
      cuisines:(nutrition.cuisines||[]).join(', '),
      restrictions:nutrition.restrictions||'',
      meals:String(nutrition.meals||3),
      budget:nutrition.budget||'moderate',
      cook:nutrition.cook||'moderate'
    },days:{job:(work.primaryDays||[1,2,3,4,5]).slice(),second:(work.secondaryDays||[]).slice()}};
  }
  function saveDraft(){draft.step=step;draft.flow=detailedSetup?'details-v49':'quick-v49';draft.screenId=activeScreens()[step]?.id;try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draft))}catch{}}
  function clearDraft(){try{localStorage.removeItem(DRAFT_KEY);sessionStorage.removeItem(LEGACY_DRAFT_KEY)}catch{};draft=loadDraft()}
  function get(key,fallback=''){const value=draft.values[key];return value===undefined||value===null?fallback:value}
  function set(key,value){draft.values[key]=value;saveDraft()}
  function icon(name){
    const icons=A.premiumIcons||{};
    return icons[name]||'<span aria-hidden="true">✦</span>';
  }
  function question(iconName,eyebrow,title,description,content){
    return '<div class="guidedQuestion">'+
      '<div class="guidedQuestionIcon">'+icon(iconName)+'</div>'+
      '<p class="guidedEyebrow">'+safe(eyebrow)+'</p>'+
      '<h3>'+safe(title)+'</h3>'+
      '<p class="guidedPrompt">'+safe(description)+'</p>'+
      '<div class="guidedAnswer">'+content+'</div>'+
    '</div>';
  }
  function choices(field,options,fallback){
    if(!get(field)&&fallback)set(field,fallback);
    const selected=get(field,fallback);
    return '<div class="guidedChoices">'+options.map(function(option){
      return '<button type="button" class="guidedChoice '+(selected===option.value?'selected':'')+'" data-choice-field="'+field+'" data-choice-value="'+option.value+'">'+
        '<span class="guidedChoiceMark">'+(option.icon||'')+'</span>'+
        '<span><b>'+safe(option.label)+'</b><small>'+safe(option.copy)+'</small></span>'+
        '<i aria-hidden="true">✓</i>'+
      '</button>';
    }).join('')+'</div>';
  }
  function textInput(field,label,placeholder,type,attrs){
    return '<label class="guidedField"><span>'+safe(label)+'</span><input data-answer="'+field+'" type="'+(type||'text')+'" value="'+safe(get(field))+'" placeholder="'+safe(placeholder||'')+'" '+(attrs||'')+'></label>';
  }
  function selectInput(field,label,options){
    return '<label class="guidedField"><span>'+safe(label)+'</span><select data-answer="'+field+'">'+options.map(function(option){
      return '<option value="'+option.value+'" '+(get(field)===option.value?'selected':'')+'>'+safe(option.label)+'</option>';
    }).join('')+'</select></label>';
  }
  function dayPicker(kind){
    const selected=draft.days[kind]||[];
    return '<div class="guidedDays" role="group" aria-label="Work days">'+DAYS.map(function(day,index){
      return '<label><input type="checkbox" data-day-kind="'+kind+'" value="'+index+'" '+(selected.includes(index)?'checked':'')+'><span>'+day+'</span></label>';
    }).join('')+'</div>';
  }
  function goalName(){
    return({fat_loss:'fat loss',recomp:'body recomposition',muscle_gain:'muscle gain',maintain:'maintenance'})[get('goal','recomp')]||'your goal';
  }
  function personName(){return get('name').trim()||'there'}

  // Detailed preferences remain available from Profile → More plan settings.
  // They are never a required part of the three-step quick start below.
  const screens=[
    {
      id:'identity',
      render:function(){return question('sparkle','Let’s make it yours','What are we building together?','Add your name and choose the outcome that matters most right now.',
        textInput('name','First name','Your name','text','autocomplete="name"')+
        '<div class="guidedFieldTop">'+choices('goal',[
        {value:'recomp',label:'Body recomposition',copy:'Build strength while gradually leaning out',icon:'↗'},
        {value:'fat_loss',label:'Lose body fat',copy:'A steady deficit built around your real week',icon:'↓'},
        {value:'muscle_gain',label:'Build muscle',copy:'Progressive training with enough fuel to recover',icon:'＋'},
        {value:'maintain',label:'Maintain & perform',copy:'Keep your weight steady and feel capable',icon:'='}
        ],'recomp')+'</div>')},
      validate:function(){return get('name').trim()?'':'Add your name to continue.'}
    },
    {
      id:'baseline',
      render:function(){return question('chart','Starting point','What should the plan know about '+personName()+'?','These details create a starting estimate. Body-fat percentage is optional.',
        '<div class="guidedFieldGrid">'+
          textInput('age','Age','','number','min="16" max="100" inputmode="numeric"')+
          selectInput('sex','Calorie estimate',[
            {value:'neutral',label:'Neutral estimate'},
            {value:'female',label:'Female equation'},
            {value:'male',label:'Male equation'}
          ])+
          textInput('heightFt','Height (ft)','','number','min="3" max="8" inputmode="numeric"')+
          textInput('heightIn','Height (in)','','number','min="0" max="11.9" step="0.1" inputmode="decimal"')+
          textInput('weight','Current weight (lb)','','number','min="70" max="600" step="0.1" inputmode="decimal"')+
          textInput('bodyFat','Body fat % · optional','','number','min="3" max="60" step="0.1" inputmode="decimal"')+
        '</div><div class="guidedFieldTop">'+choices('activity',[
          {value:'low',label:'Mostly seated',copy:'Desk-based day with light walking',icon:'○'},
          {value:'moderate',label:'Somewhat active',copy:'Regular walking or time on your feet',icon:'◐'},
          {value:'high',label:'Very active',copy:'Physical work or a consistently high step count',icon:'●'}
        ],'moderate')+'</div>')},
      validate:function(){return(+get('age')>=16&&+get('heightFt')>=3&&+get('weight')>=70)?'':'Add your age, height and current weight to continue.'}
    },
    {
      id:'workMode',
      auto:true,
      render:function(){return question('calendar','Work rhythm','Which description is closest to your work schedule?','We will fit training around work before recommending a session.',choices('workMode',[
        {value:'standard',label:'Consistent weekly schedule',copy:'The same work days repeat most weeks',icon:'7'},
        {value:'rotating',label:'Rotating or shift work',copy:'Days vary, but I can enter my usual pattern',icon:'↻'},
        {value:'calendar',label:'Add in Calendar later',copy:'Use rotations, individual shifts or a roster photo',icon:'+'},
        {value:'none',label:'No work schedule',copy:'Plan mainly from recovery and availability',icon:'—'}
      ],'standard'))}
    },
    {
      id:'workDetails',
      when:function(){return get('workMode')!=='none'&&get('workMode')!=='calendar'},
      render:function(){return question('calendar','Primary schedule','When does work need protected time?','Choose the usual days and hours. Commute time is protected automatically.',
        textInput('jobName','Job or schedule name','Work')+dayPicker('job')+
        '<div class="guidedFieldGrid">'+
          textInput('jobStart','Shift starts','','time')+
          textInput('jobEnd','Shift ends','','time')+
          textInput('commute','Commute each way (min)','','number','min="0" max="240" step="5" inputmode="numeric"')+
        '</div>')},
      validate:function(){return(draft.days.job||[]).length&&get('jobStart')&&get('jobEnd')?'':'Choose your usual work days and hours.'}
    },
    {
      id:'secondJob',
      auto:true,
      when:function(){return get('workMode')!=='none'&&get('workMode')!=='calendar'},
      render:function(){return question('calendar','One more schedule check','Do you need to protect another recurring schedule?','Add it only when it is part of your real week.',choices('secondJob',[
        {value:'no',label:'No, one work rhythm',copy:'Keep planning focused on the schedule I already added',icon:'1'},
        {value:'yes',label:'Yes, add another',copy:'Protect another job, class or recurring responsibility',icon:'2'}
      ],'no'))}
    },
    {
      id:'secondDetails',
      when:function(){return get('secondJob')==='yes'&&get('workMode')!=='none'&&get('workMode')!=='calendar'},
      render:function(){return question('calendar','Additional schedule','When does this other commitment usually happen?','Add the repeating days now; changing dates can still be imported or reviewed in the calendar.',
        textInput('secondName','Schedule name','Additional schedule')+
        dayPicker('second')+
        '<div class="guidedFieldGrid">'+
          textInput('secondStart','Shift starts','','time')+
          textInput('secondEnd','Shift ends','','time')+
          textInput('secondCommute','Commute each way (min)','','number','min="0" max="240" step="5" inputmode="numeric"')+
        '</div>')},
      validate:function(){return(draft.days.second||[]).length&&get('secondStart')&&get('secondEnd')?'':'Choose the usual days and hours for this schedule.'}
    },
    {
      id:'recovery',
      render:function(){return question('heart','Recovery and real life','What else needs protected time?','Sleep is a fixed commitment. Recurring blocks are optional and appear automatically in your calendar.',
        '<div class="guidedFieldGrid">'+
          textInput('sleepHours','Sleep target (hours)','','number','min="5" max="12" step="0.5" inputmode="decimal"')+
          textInput('bedtime','Typical bedtime','','time')+
        '</div><label class="guidedField guidedFieldTop"><span>Recurring commitments · optional</span><textarea data-answer="commitments" rows="3" placeholder="Tue 18:00-20:00 class&#10;Sun 09:00-12:00 family">'+safe(get('commitments'))+'</textarea></label>')},
      validate:function(){return +get('sleepHours')>=5&&get('bedtime')?'':'Add a sleep target and typical bedtime.'}
    },
    {
      id:'training',
      dynamic:true,
      render:function(){const own=get('trainingMode','adaptive')==='existing';return question('dumbbell','Your training, your choice','How should Work + Workout handle your workouts?','Use our adaptive program, or keep the routine you already follow and let us protect its place in your week.',
        choices('trainingMode',[
          {value:'adaptive',label:'Build a program for me',copy:'Choose realistic days and provide a progressive routine',icon:'↗'},
          {value:'existing',label:'I already have a routine',copy:'Keep my workout names, days and times exactly as entered',icon:'✓'}
        ],'adaptive')+
        (own?'<label class="guidedField guidedFieldTop"><span>Paste your weekly workout schedule</span><textarea data-answer="existingRoutine" rows="5" placeholder="Mon 18:00 Push\nWed 18:00 Pull\nFri 17:30 Legs">'+safe(get('existingRoutine'))+'</textarea><small>One workout per line: day, time, then your workout name. We schedule and track it—we do not replace it.</small></label>':choices('trainingDays',[
        {value:'2',label:'2 sessions',copy:'A focused minimum-effective plan',icon:'2'},
        {value:'3',label:'3 sessions',copy:'Balanced progress and recovery',icon:'3'},
        {value:'4',label:'4 sessions',copy:'More volume when your week supports it',icon:'4'}
        ],'3')+
        '<div class="guidedFieldGrid guidedFieldTop">'+
          selectInput('duration','Session length',[{value:'30',label:'30 minutes'},{value:'45',label:'45 minutes'},{value:'60',label:'60 minutes'},{value:'75',label:'75 minutes'}])+
          selectInput('experience','Experience',[{value:'beginner',label:'Getting started'},{value:'intermediate',label:'Consistent lifter'},{value:'advanced',label:'Highly experienced'}])+
          selectInput('equipment','Equipment',[{value:'full',label:'Full commercial gym'},{value:'basic',label:'Basic gym'},{value:'home',label:'Home or minimal'}])+
          selectInput('preferred','Best energy window',[{value:'morning',label:'Morning'},{value:'afternoon',label:'Afternoon'},{value:'evening',label:'Evening'},{value:'flexible',label:'Flexible'}])+
        '</div><label class="guidedField guidedFieldTop"><span>Limitations or movements to avoid · optional</span><textarea data-answer="limitations" rows="3" placeholder="Example: avoid deep knee flexion; prefer machines for pressing">'+safe(get('limitations'))+'</textarea></label>'))},
      validate:function(){return get('trainingMode','adaptive')==='existing'&&!parseTrainingRoutine(get('existingRoutine'),+get('duration')||60).length?'Add at least one workout like “Mon 18:00 Push”.':''}
    },
    {
      id:'nutrition',
      render:function(){return question('apple','Nutrition that feels familiar','What will make eating well sustainable?','Favorite foods, practical portions and realistic prep shape the plan.',
        '<div class="guidedStack">'+
          textInput('foods','Favorite everyday foods','eggs, oats, jollof rice, chicken, salmon, plantain')+
          textInput('cuisines','Cuisines you enjoy','Ghanaian, West African, Caribbean, Mediterranean')+
        '</div><div class="guidedFieldGrid guidedFieldTop">'+
          selectInput('meals','Meals per day',[
            {value:'2',label:'2 meals'},{value:'3',label:'3 meals'},{value:'4',label:'4 meals'},{value:'5',label:'5 meals'}
          ])+
          selectInput('budget','Food budget',[
            {value:'low',label:'Budget-conscious'},{value:'moderate',label:'Moderate'},{value:'flexible',label:'Flexible'}
          ])+
          selectInput('cook','Cooking time',[
            {value:'low',label:'Very little'},{value:'moderate',label:'Some cooking'},{value:'high',label:'I enjoy cooking'}
          ])+
        '</div><label class="guidedField guidedFieldTop"><span>Restrictions, allergies, or foods to avoid · optional</span><textarea data-answer="restrictions" rows="3">'+safe(get('restrictions'))+'</textarea></label>')}
    }
  ];

  const quickScreens=[
    {
      id:'quick-basics',
      render:function(){return question('sparkle','1 · Your starting point','What are you working toward?','Just the basics for your starting targets. Fine-tune the details later.',
        '<div class="guidedFieldGrid">'+textInput('name','First name','Your name','text','autocomplete="given-name"')+
        selectInput('goal','Main goal',[{value:'recomp',label:'Build muscle & lose fat'},{value:'fat_loss',label:'Lose body fat'},{value:'muscle_gain',label:'Build muscle'},{value:'maintain',label:'Maintain & feel stronger'}])+
        textInput('age','Age','','number','min="16" max="100" inputmode="numeric"')+
        textInput('weight','Weight (lb)','','number','min="70" max="600" step="0.1" inputmode="decimal"')+
        textInput('heightFt','Height (ft)','','number','min="3" max="8" inputmode="numeric"')+
        textInput('heightIn','Height (in) · optional','0','number','min="0" max="11.9" step="0.1" inputmode="decimal"')+'</div>')},
      validate:function(){
        if(!get('name').trim())return 'Add your name to continue.';
        return +get('age')>=16&&+get('age')<=100&&+get('heightFt')>=3&&+get('heightFt')<=8&&+get('heightIn')>=0&&+get('heightIn')<12&&+get('weight')>=70&&+get('weight')<=600?'':'Check your age, height and weight to continue.';
      }
    },
    {
      id:'quick-work',
      render:function(){const weekly=['standard','rotating'].includes(get('workMode'));return question('calendar','2 · Your work','When do you work?','Add a regular week now, or use the Calendar for shifts, rotations and roster photos later.',
        selectInput('workMode','Work schedule',[{value:'calendar',label:'Add my shifts in Calendar later'},{value:'standard',label:'The same days each week'},...(get('workMode')==='rotating'?[{value:'rotating',label:'Keep my saved shift pattern'}]:[]),{value:'none',label:'No work schedule'}])+
        (weekly?'<div class="guidedFieldTop">'+dayPicker('job')+'</div><div class="guidedFieldGrid">'+textInput('jobStart','Shift starts','','time')+textInput('jobEnd','Shift ends','','time')+'</div><p class="guidedQuickNoteV49">Commute time, extra jobs and time off can be adjusted in plan settings or Calendar.</p>':'<p class="guidedQuickNoteV49">'+(get('workMode')==='calendar'?'No work shifts will be guessed or added. Add your schedule in Calendar before relying on workout times.':'You can add a work schedule whenever you need one.')+'</p>'))},
      validate:function(){return !['standard','rotating'].includes(get('workMode'))||(draft.days.job||[]).length&&get('jobStart')&&get('jobEnd')?'':'Choose your work days and shift times.'}
    },
    {
      id:'quick-training',dynamic:true,
      render:function(){const own=get('trainingMode','adaptive')==='existing';return question('dumbbell','3 · Your training','How would you like to train?','Start simple. Session length, recovery and food preferences can be changed in plan settings.',
        choices('trainingMode',[{value:'adaptive',label:'Build a program for me',copy:'A simple starting routine that fits your week',icon:'↗'},{value:'existing',label:'I already have a routine',copy:'Keep my own workout days and times',icon:'✓'}],'adaptive')+
        (own?'<label class="guidedField guidedFieldTop"><span>Your weekly routine</span><textarea data-answer="existingRoutine" rows="3" placeholder="Mon 18:00 Push&#10;Wed 18:00 Pull&#10;Fri 17:30 Legs">'+safe(get('existingRoutine'))+'</textarea><small>We schedule and track it—we do not replace it.</small></label>':'<div class="guidedFieldGrid guidedFieldTop">'+selectInput('trainingDays','Workouts per week',[{value:'2',label:'2 workouts'},{value:'3',label:'3 workouts'},{value:'4',label:'4 workouts'}])+selectInput('equipment','Where you train',[{value:'full',label:'Full gym'},{value:'basic',label:'Basic gym'},{value:'home',label:'Home / minimal equipment'}])+'</div>')+
        '<p class="guidedQuickNoteV49">You can add food restrictions, movement limitations and other preferences in More plan settings.</p>')},
      validate:function(){return get('trainingMode','adaptive')==='existing'&&!parseTrainingRoutine(get('existingRoutine'),+get('duration')||60).length?'Add at least one workout like “Mon 18:00 Push”.':''}
    }
  ];
  function activeScreens(){return detailedSetup?screens.filter(function(screen){return!screen.when||screen.when()}):quickScreens}
  function migrateDraftFlow(){
    const target=detailedSetup?'details-v49':'quick-v49';if(draft.flow===target)return;
    const legacy=screens.filter(function(screen){return!screen.when||screen.when()});
    const prior=draft.screenId||(draft.flow==='quick-v49'?quickScreens:legacy)[Math.max(0,+draft.step||0)]?.id||'identity';
    if(detailedSetup){const id=({'quick-basics':'identity','quick-work':'workMode','quick-training':'training'})[prior]||prior;draft.step=Math.max(0,legacy.findIndex(function(screen){return screen.id===id}))}
    else draft.step=['identity','baseline','quick-basics'].includes(prior)?0:['workMode','workDetails','secondJob','secondDetails','quick-work'].includes(prior)?1:2;
    draft.flow=target;
  }
  function mountedScreen(){const list=activeScreens();step=Math.max(0,Math.min(step,list.length-1));return{list:list,screen:list[step]}}
  function syncVisible(){
    document.querySelectorAll('#guidedOnboardingBody [data-answer]').forEach(function(input){set(input.dataset.answer,input.value)});
    ['job','second'].forEach(function(kind){
      const boxes=[...document.querySelectorAll('#guidedOnboardingBody [data-day-kind="'+kind+'"]')];
      if(boxes.length)draft.days[kind]=boxes.filter(function(box){return box.checked}).map(function(box){return+box.value});
    });
    saveDraft();
  }
  function bindAnswers(screen){
    document.querySelectorAll('#guidedOnboardingBody [data-answer]').forEach(function(input){
      input.addEventListener('input',function(){set(input.dataset.answer,input.value)});
      input.addEventListener('change',function(){set(input.dataset.answer,input.value)});
      if(screen.id==='quick-work'&&input.dataset.answer==='workMode')input.addEventListener('change',function(){syncVisible();render()});
    });
    document.querySelectorAll('#guidedOnboardingBody [data-day-kind]').forEach(function(input){input.addEventListener('change',syncVisible)});
    document.querySelectorAll('#guidedOnboardingBody [data-choice-field]').forEach(function(button){
      button.addEventListener('click',function(){
        const field=button.dataset.choiceField;
        set(field,button.dataset.choiceValue);
        document.querySelectorAll('[data-choice-field="'+field+'"]').forEach(function(other){other.classList.toggle('selected',other===button)});
        if(screen.dynamic){setTimeout(function(){render()},80);return}
        if(screen.auto)setTimeout(function(){goNext()},230);
      });
    });
  }
  function modal(){
    if(document.getElementById('guidedOnboarding'))return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="guidedOnboarding" class="modal guidedOnboarding" role="dialog" aria-modal="true" aria-labelledby="guidedOnboardingTitle">'+
        '<div class="sheet guidedOnboardingSheet">'+
          '<aside class="guidedVisualRail" aria-hidden="true">'+
            '<img src="../work-gym-planner-v16/assets/whole-day-system-v18-web.jpg" alt="">'+
            '<div><span>WORK + WORKOUT</span><b>A plan made from your actual life.</b><small>Schedule · Training · Nutrition · Recovery</small></div>'+
          '</aside>'+
          '<div class="guidedJourney">'+
            '<div class="sheetHandle"></div>'+
            '<div class="guidedHead"><div><small id="guidedStepLabel">Step 1 of 3</small><h2 id="guidedOnboardingTitle">Your plan in 3 quick steps</h2></div><button id="guidedClose">Finish later</button></div>'+
            '<div class="guidedProgress"><i id="guidedProgressFill"></i></div>'+
            '<div id="guidedOnboardingBody"></div>'+
            '<p id="guidedStatus" class="statusText" role="status"></p>'+
            '<div class="guidedActions"><button id="guidedBack">Back</button><button id="guidedNext" class="primary">Continue</button></div>'+
          '</div>'+
        '</div>'+
      '</div>');
    document.getElementById('guidedClose').onclick=closeGuided;
    document.getElementById('guidedBack').onclick=function(){syncVisible();step=Math.max(0,step-1);render()};
    document.getElementById('guidedNext').onclick=goNext;
  }
  function render(){
    modal();
    const state=mountedScreen();
    saveDraft();
    document.getElementById('guidedOnboarding').classList.toggle('guidedQuickV49',!detailedSetup);
    document.getElementById('guidedStepLabel').textContent=(detailedSetup?'Settings section ':'Step ')+(step+1)+' of '+state.list.length;
    document.getElementById('guidedOnboardingTitle').textContent=detailedSetup?'More plan settings':'Your plan in 3 quick steps';
    document.getElementById('guidedProgressFill').style.width=((step+1)/state.list.length*100)+'%';
    document.getElementById('guidedOnboardingBody').innerHTML=state.screen.render();
    document.getElementById('guidedOnboardingBody').scrollTop=0;
    document.getElementById('guidedStatus').textContent='';
    const back=document.getElementById('guidedBack');
    const next=document.getElementById('guidedNext');
    back.disabled=step===0;
    back.classList.toggle('hidden',false);
    next.classList.remove('hidden');
    next.disabled=false;
    next.textContent=step===state.list.length-1?'Build my plan':'Continue';
    next.onclick=goNext;
    bindAnswers(state.screen);
    if(window.matchMedia('(min-width: 641px)').matches){
      requestAnimationFrame(function(){document.querySelector('#guidedOnboardingBody input:not([type="hidden"]),#guidedOnboardingBody select,#guidedOnboardingBody textarea')?.focus({preventScroll:true})});
    }
  }
  async function goNext(){
    if(busy)return;
    syncVisible();
    const state=mountedScreen();
    const error=state.screen.validate?.();
    if(error){document.getElementById('guidedStatus').textContent=error;return}
    const refreshed=activeScreens();
    if(step<refreshed.length-1){step++;render();return}
    // Resumed older drafts must still contain the essentials; never substitute
    // guessed body measurements merely because they resumed at the last step.
    if(!detailedSetup){const invalid=quickScreens.findIndex(function(screen){return !!screen.validate?.()});if(invalid>=0){step=invalid;render();document.getElementById('guidedStatus').textContent=quickScreens[invalid].validate();return}}
    await buildPlan();
  }
  function parseCommitments(text){
    const out=[];
    String(text||'').split(/\n+/).forEach(function(raw){
      const match=raw.trim().match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day)?\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})(?:\s+(.+))?$/i);
      if(!match)return;
      const day=DAYS.findIndex(function(value){return value.toLowerCase()===match[1].slice(0,3).toLowerCase()});
      out.push({day:day,start:match[2],end:match[3],label:match[4]||'Commitment'});
    });
    return out;
  }
  function parseTrainingRoutine(text,duration){
    const byDay=new Map();
    String(text||'').split(/\n+/).forEach(function(raw){
      const match=raw.trim().match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\s+(.+)$/i);
      if(!match)return;
      const weekday=DAYS.findIndex(function(value){return value.toLowerCase()===match[1].slice(0,3).toLowerCase()});
      function minutes(hour,minute,period){let h=+hour,m=+minute||0;if(period){h%=12;if(period.toLowerCase()==='pm')h+=12}return h>=0&&h<24&&m>=0&&m<60?h*60+m:null}
      const startMinutes=minutes(match[2],match[3],match[4]);
      if(startMinutes==null)return;
      let endMinutes=match[5]?minutes(match[5],match[6],match[7]):startMinutes+(+duration||60);
      if(endMinutes==null)return;if(endMinutes<=startMinutes)endMinutes+=1440;
      const clock=function(value){value=((value%1440)+1440)%1440;return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0')};
      byDay.set(weekday,{weekday:weekday,dayName:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][weekday],start:clock(startMinutes),end:clock(endMinutes),duration:endMinutes-startMinutes,name:match[8].trim().slice(0,80)||'Workout'});
    });
    return[...byDay.values()].sort(function(a,b){return a.weekday-b.weekday});
  }
  function collectAnswers(){
    const workMode=get('workMode','standard');
    const hasWork=workMode!=='none'&&workMode!=='calendar';
    const second=get('secondJob','no')==='yes'&&hasWork;
    return{
      basics:{
        name:get('name').trim(),
        age:+get('age')||35,
        sex:get('sex','neutral'),
        heightFt:+get('heightFt')||5,
        heightIn:+get('heightIn')||0,
        weight:+get('weight')||170,
        bodyFat:+get('bodyFat')||0,
        goal:get('goal','recomp'),
        goalWeight:0,
        goalBodyFat:0,
        activity:get('activity','moderate'),
        sleepHours:+get('sleepHours')||7.5,
        bedtime:get('bedtime','23:00')
      },
      work:{
        scheduleDeferred:workMode==='calendar',
        primaryName:get('jobName','Work').trim()||'Work',
        primaryDays:hasWork?(draft.days.job||[]):[],
        primaryStart:hasWork?get('jobStart','09:00'):'',
        primaryEnd:hasWork?get('jobEnd','17:00'):'',
        primaryCommute:hasWork?(+get('commute')||0):0,
        secondaryEnabled:second,
        secondaryName:get('secondName','Additional schedule').trim()||'Additional schedule',
        secondaryDays:second?(draft.days.second||[]):[],
        secondaryStart:second?get('secondStart'):'',
        secondaryEnd:second?get('secondEnd'):'',
        secondaryCommute:second?(+get('secondCommute')||0):0,
        commitments:parseCommitments(get('commitments'))
      },
      training:{
        mode:get('trainingMode','adaptive'),
        existingRoutineText:get('existingRoutine').trim(),
        existingRoutine:parseTrainingRoutine(get('existingRoutine'),+get('duration')||60),
        days:get('trainingMode','adaptive')==='existing'?Math.max(1,parseTrainingRoutine(get('existingRoutine'),+get('duration')||60).length):(+get('trainingDays')||3),
        duration:+get('duration')||60,
        experience:get('experience','beginner'),
        equipment:get('equipment','full'),
        preferred:get('preferred','flexible'),
        limitations:get('limitations').trim()
      },
      nutrition:{
        foods:get('foods').split(',').map(function(value){return value.trim()}).filter(Boolean).slice(0,30),
        cuisines:get('cuisines').split(',').map(function(value){return value.trim()}).filter(Boolean).slice(0,20),
        restrictions:get('restrictions').trim(),
        meals:+get('meals')||3,
        budget:get('budget','moderate'),
        cook:get('cook','moderate')
      }
    };
  }
  async function buildPlan(){
    if(A.session&&A.canStartOnboarding?.()===false){A.openAccount?.('signin');return}
    const answers=collectAnswers();
    const next=document.getElementById('guidedNext');
    busy=true;
    next.disabled=true;
    document.getElementById('guidedStatus').textContent='Building your calendar…';
    try{
      const plan=A.buildDeterministicPlan(answers);
      // Initial setup stays local; cloud sync follows only when already allowed.
      A.applyPersonalizedPlan(answers,plan);
      clearDraft();
      window.dispatchEvent(new CustomEvent('wgc:profile-ready'));
      showPreview(answers,plan,false);
      A.pushState?.({quiet:true}).catch(function(){});
    }catch(error){
      document.getElementById('guidedStatus').textContent=error.message||'We could not build the plan yet.';
    }finally{
      busy=false;
      next.disabled=false;
    }
  }
  function showPreview(answers,plan,refining){
    previewReady=true;
    const training=plan.training||{};
    const nutrition=plan.nutrition||{};
    const ai=plan.ai||{};
    document.getElementById('guidedStepLabel').textContent='Your plan preview';
    document.getElementById('guidedProgressFill').style.width='100%';
    document.getElementById('guidedOnboardingBody').innerHTML=
      '<div class="guidedPlanReady">'+
        '<div class="guidedPlanPhoto"><img src="../work-gym-planner-v16/assets/whole-day-system-v18-web.jpg" alt="A balanced day of training, food and planning"></div>'+
        '<p class="guidedEyebrow">READY FOR '+safe(answers.basics.name.toUpperCase())+'</p>'+
        '<h3>'+(answers.training.mode==='existing'?'Your routine stays yours.':'Your first week has a rhythm.')+'</h3>'+
        '<p>'+safe(ai.summary||(answers.training.mode==='existing'?'We kept your workout names, days and times, then placed work, nutrition and recovery around them.':'We protected work, commute and sleep first, then placed training and nutrition around the strongest available windows.'))+'</p>'+
      '</div>'+
      '<div class="guidedPreviewGrid">'+
        '<section><span>TRAINING</span><h4>'+(answers.training.mode==='existing'?'Your existing schedule':'Best workout windows')+'</h4>'+
          ((training.days||[]).map(function(day){return '<div class="guidedPlanRow"><div><b>'+safe(day.dayName)+' · '+safe(day.workout)+'</b><small>'+safe(day.reason||'Best available window')+'</small></div><strong>'+safe(day.start)+'–'+safe(day.end)+'</strong></div>'}).join('')||'<p>No reliable workout windows were found yet. You can adjust availability after setup.</p>')+
        '</section>'+
        '<section><span>NUTRITION</span><h4>Starting daily targets</h4>'+
          '<div class="guidedTargets"><div><b>'+Math.round(nutrition.gymCalories||0)+'</b><small>training kcal</small></div><div><b>'+Math.round(nutrition.recoveryCalories||0)+'</b><small>recovery kcal</small></div><div><b>'+Math.round(nutrition.protein||0)+'g</b><small>protein</small></div></div>'+
          '<p>'+safe(ai.nutrition?.rationale||'Targets begin conservatively and adapt from your real logs and trend.')+'</p>'+
        '</section>'+
      '</div>';
    document.getElementById('guidedBack').classList.add('hidden');
    const next=document.getElementById('guidedNext');
    next.textContent='See my calendar';
    next.onclick=function(){
      closeGuided();
      if(window.openCalendarDate)window.openCalendarDate();else window.page?.('calendar');
      window.toast?.('Your work, workouts and commitments are on the calendar');
    };
    document.getElementById('guidedStatus').textContent=refining&&A.session&&A.config?.aiConfigured?'Your plan is ready. Coaching details are refining quietly in the background.':'Your plan is saved. You can edit every choice later.';
    if(answers.work.scheduleDeferred)document.getElementById('guidedStatus').textContent='Your starting plan is saved. Add your work schedule in Calendar before relying on workout times.';
  }
  function closeGuided(){
    const paused=!previewReady&&!(typeof profile==='function'&&profile());
    if(paused)try{sessionStorage.setItem(pausedSessionKey(),'1')}catch{}
    if(previewReady){try{localStorage.removeItem(DRAFT_KEY);sessionStorage.removeItem(LEGACY_DRAFT_KEY)}catch{};previewReady=false}
    else{syncVisible();A.queueSync?.()}
    window.closeModal?.('guidedOnboarding');
    if(paused){window.page?.('home');window.renderTodayDashboard?.();window.toast?.('Setup saved. Resume whenever you are ready.')}
  }
  async function openGuided(options){
    if(A.passwordRecovery){A.openAccount?.('signin');return}
    if(A.session&&A.canStartOnboarding?.()===false){if(!options?.auto)A.openAccount?.('signin');return}
    const automatic=!!(options&&options.auto);
    if(automatic&&typeof profile==='function'&&profile())return;
    if(automatic&&document.getElementById('guidedOnboarding')?.classList.contains('open'))return;
    if(automatic){try{if(sessionStorage.getItem(pausedSessionKey())==='1')return}catch{}}
    else try{sessionStorage.removeItem(pausedSessionKey())}catch{}
    if(A.config?.cloudConfigured&&!A.session){A.openAccount?.('signup');return}
    if(!A.hasAppAgreement?.()&&A.reviewPrivacyForOnboarding){
      const uid=A.session?.user?.id;
      try{const choice=await A.reviewPrivacyForOnboarding();if(!choice?.completed||uid!==A.session?.user?.id)return}
      catch{window.toast?.('Reconnect to save your terms and privacy choices.');return}
    }
    document.querySelectorAll('.modal.open').forEach(function(open){window.closeModal?.(open.id)});
    previewReady=false;
    detailedSetup=!!options?.details;
    draft=loadDraft();
    migrateDraftFlow();
    step=Math.max(0,+draft.step||0);
    render();
    window.openModal?.('guidedOnboarding');
  }
  function profileSummaryModal(){
    if(document.getElementById('guidedProfileSummary'))return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="guidedProfileSummary" class="modal guidedProfileSummary" role="dialog" aria-modal="true" aria-labelledby="guidedProfileTitle">'+
        '<div class="sheet guidedProfileSheet"><div class="sheetHandle"></div>'+
          '<div class="guidedProfileHero"><div id="guidedProfileInitial" class="guidedProfileInitial">W</div><div><p class="guidedEyebrow">YOUR PLAN</p><h2 id="guidedProfileTitle">Profile</h2><p id="guidedProfileEmail"></p></div></div>'+
          '<details class="guidedProfileAtGlance"><summary>At a glance <i>⌄</i></summary><div id="guidedProfileFacts" class="guidedProfileFacts"></div></details>'+
          '<div class="guidedProfileMenu">'+
            '<button id="guidedProfileEdit"><span>Personal plan<small>Goals, preferences and weekly setup</small></span><i>›</i></button>'+
            '<button id="guidedProfileCalendar"><span>Work calendar<small>Schedules, shifts, rotations and time off</small></span><i>›</i></button>'+
            '<button id="guidedProfileNutrition"><span>Nutrition goals<small>Calories, macros and body goals</small></span><i>›</i></button>'+
            '<button id="guidedProfileProgress"><span>Body &amp; progress<small>Check-ins, measurements and trends</small></span><i>›</i></button>'+
            '<button id="guidedProfileAccount"><span>Account &amp; privacy<small>Backup, consent, sign out and deletion</small></span><i>›</i></button>'+
            '<button id="guidedProfileDetails"><span>More plan settings<small>Food preferences, recovery and extra jobs</small></span><i>›</i></button>'+
          '</div><div class="guidedProfileActions"><button id="guidedProfileClose">Close</button></div>'+
        '</div></div>');
    document.getElementById('guidedProfileClose').onclick=function(){window.closeModal?.('guidedProfileSummary')};
    document.getElementById('guidedProfileAccount').onclick=function(){window.closeModal?.('guidedProfileSummary');A.openAccount?.('account')};
    document.getElementById('guidedProfileEdit').onclick=function(){window.closeModal?.('guidedProfileSummary');openGuided()};
    document.getElementById('guidedProfileDetails').onclick=function(){window.closeModal?.('guidedProfileSummary');openGuided({details:true})};
    document.getElementById('guidedProfileCalendar').onclick=function(){window.closeModal?.('guidedProfileSummary');window.page?.('calendar');window.renderCalendar?.()};
    document.getElementById('guidedProfileNutrition').onclick=function(){window.closeModal?.('guidedProfileSummary');window.fillNutritionForm?.();window.openModal?.('nutritionDialog')};
    document.getElementById('guidedProfileProgress').onclick=function(){window.closeModal?.('guidedProfileSummary');window.page?.('progress')};
  }
  function openProfileSummary(){
    const p=typeof profile==='function'?profile():null;
    if(!p){openGuided();return}
    profileSummaryModal();
    const name=p.name||'Your profile';
    const work=p.fixed?.enabled?(p.fixed.name||'Work')+' · '+(p.fixed.start||'09:00')+'–'+(p.fixed.end||'17:00'):'No repeating work schedule';
    const training=(p.trainingDaysPerWeek||3)+' days/week · '+(p.trainingDuration||60)+' min';
    document.getElementById('guidedProfileInitial').textContent=name.trim().charAt(0).toUpperCase()||'W';
    document.getElementById('guidedProfileTitle').textContent=name;
    document.getElementById('guidedProfileEmail').textContent=A.session?.user?.email||'Saved on this device';
    document.getElementById('guidedProfileFacts').innerHTML=
      '<section><span>'+icon('calendar')+'</span><div><small>WORK RHYTHM</small><b>'+safe(work)+'</b></div></section>'+
      '<section><span>'+icon('dumbbell')+'</span><div><small>TRAINING</small><b>'+safe(training)+'</b></div></section>'+
      '<section><span>'+icon('heart')+'</span><div><small>RECOVERY</small><b>'+safe(p.sleepTarget||7.5)+' hours of sleep</b></div></section>';
    window.openModal?.('guidedProfileSummary');
  }
  function rerouteProfileEditors(){
    // The current home avatar opens Account; keep optional preferences there
    // as well as in the older profile-summary entry point.
    const accountPlan=document.getElementById('startOnboardingAccount');
    if(accountPlan&&typeof profile==='function'&&profile()){
      if(!document.getElementById('morePlanSettingsV49')){
        accountPlan.insertAdjacentHTML('afterend','<button id="morePlanSettingsV49"><b>More plan settings</b><small>Food preferences, recovery, extra jobs and other details</small></button>');
        document.getElementById('morePlanSettingsV49').onclick=function(){openGuided({details:true})};
      }
      document.getElementById('morePlanSettingsV49').disabled=!!A.passwordRecovery||A.canStartOnboarding?.()===false;
    }
    const profileButton=document.querySelector('[data-open="profile"]');
    if(profileButton){
      if(!profileButton.dataset.guidedProfile){
        profileButton.dataset.guidedProfile='true';
        profileButton.onclick=openGuided;
      }
      profileButton.classList.add('hidden');
    }
    const homeProfile=document.getElementById('homeProfileBtn');
    if(homeProfile&&!homeProfile.dataset.guidedProfile){
      homeProfile.dataset.guidedProfile='true';
      homeProfile.onclick=openProfileSummary;
    }
    const onboardingButton=document.getElementById('openOnboardingV18');
    if(onboardingButton&&!onboardingButton.dataset.guidedProfile){
      onboardingButton.dataset.guidedProfile='true';
      onboardingButton.onclick=openGuided;
    }
  }

  A.openOnboarding=openGuided;
  A.openProfileMenu=openProfileSummary;
  A.openPlanSettings=function(){openGuided({details:true})};
  A.onboardingAnswers=collectAnswers;
  modal();
  rerouteProfileEditors();
  new MutationObserver(rerouteProfileEditors).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',rerouteProfileEditors,{once:true});
})();
