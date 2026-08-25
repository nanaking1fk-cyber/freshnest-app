// Work + Gym Coach 18.3 guided, adaptive onboarding.
(function guidedOnboarding(){
  const A=window.WGC18=window.WGC18||{};
  const DRAFT_KEY='wgc-guided-onboarding-v18';
  const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const safe=window.esc||function(value){return String(value??'').replace(/[&<>"']/g,function(char){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]})};
  let step=0;
  let busy=false;
  let draft=loadDraft();

  function loadDraft(){
    try{
      const saved=JSON.parse(sessionStorage.getItem(DRAFT_KEY)||'null');
      if(saved&&saved.version===2&&saved.values)return saved;
    }catch{}
    const p=typeof profile==='function'?profile():null;
    return{version:2,values:{
      name:p?.name||'',
      goal:'recomp',
      activity:'moderate',
      workMode:p?.fixed?.enabled?'standard':'standard',
      jobName:p?.fixed?.name||'Work',
      jobStart:p?.fixed?.start||'09:00',
      jobEnd:p?.fixed?.end||'17:00',
      commute:String(p?.fixed?.commuteMin??30),
      secondJob:p?.variable?.enabled?'yes':'no',
      secondName:p?.variable?.name||'Second job',
      secondStart:p?.variable?.start||'',
      secondEnd:p?.variable?.end||'',
      secondCommute:String(p?.variable?.commuteMin??30),
      sleepHours:String(p?.sleepTarget||7.5),
      bedtime:'23:00',
      trainingDays:String(p?.trainingDaysPerWeek||3),
      duration:'60',
      experience:'intermediate',
      equipment:p?.equipmentMode||'full',
      preferred:'flexible',
      meals:'3',
      budget:'moderate',
      cook:'moderate'
    },days:{job:[1,2,3,4,5],second:[]}};
  }
  function saveDraft(){try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify(draft))}catch{}}
  function clearDraft(){try{sessionStorage.removeItem(DRAFT_KEY)}catch{};draft=loadDraft()}
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

  const screens=[
    {
      id:'name',
      render:function(){return question('user','Let’s make it yours','What should we call you?','Your plan and coaching prompts will use this name.',textInput('name','First name','Your name','text','autocomplete="name" autofocus'))},
      validate:function(){return get('name').trim()?'':'Add your name to continue.'}
    },
    {
      id:'goal',
      auto:true,
      render:function(){return question('sparkle','Your north star','What are we working toward, '+personName()+'?','Choose the outcome that matters most right now.',choices('goal',[
        {value:'recomp',label:'Body recomposition',copy:'Build strength while gradually leaning out',icon:'↗'},
        {value:'fat_loss',label:'Lose body fat',copy:'A steady deficit built around your real week',icon:'↓'},
        {value:'muscle_gain',label:'Build muscle',copy:'Progressive training with enough fuel to recover',icon:'＋'},
        {value:'maintain',label:'Maintain & perform',copy:'Keep your weight steady and feel capable',icon:'='}
      ],'recomp'))}
    },
    {
      id:'baseline',
      render:function(){return question('chart','Starting point','What should the plan know about your body?','These details create a starting estimate. Body-fat percentage is optional.',
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
        '</div>')},
      validate:function(){return(+get('age')>=16&&+get('heightFt')>=3&&+get('weight')>=70)?'':'Add your age, height and current weight to continue.'}
    },
    {
      id:'activity',
      auto:true,
      render:function(){return question('heart','Daily movement','Outside training, how active is a typical day?','This adjusts your starting energy target for '+goalName()+'.',choices('activity',[
        {value:'low',label:'Mostly seated',copy:'Desk-based day with light walking',icon:'○'},
        {value:'moderate',label:'Somewhat active',copy:'Regular walking or time on your feet',icon:'◐'},
        {value:'high',label:'Very active',copy:'Physical work or a consistently high step count',icon:'●'}
      ],'moderate'))}
    },
    {
      id:'workMode',
      auto:true,
      render:function(){return question('calendar','Work rhythm','Which description is closest to your work schedule?','We will fit training around work before recommending a session.',choices('workMode',[
        {value:'standard',label:'Consistent weekly schedule',copy:'The same work days repeat most weeks',icon:'7'},
        {value:'rotating',label:'Rotating or shift work',copy:'Days vary, but I can enter my usual pattern',icon:'↻'},
        {value:'none',label:'No work schedule',copy:'Plan mainly from recovery and availability',icon:'—'}
      ],'standard'))}
    },
    {
      id:'workDays',
      when:function(){return get('workMode')!=='none'},
      render:function(){return question('calendar','Primary schedule','Which days do you usually work?','Tap every usual work day. You can adjust individual dates later.',
        textInput('jobName','Job or schedule name','Work')+dayPicker('job'))},
      validate:function(){return(draft.days.job||[]).length?'':'Choose at least one work day.'}
    },
    {
      id:'workHours',
      when:function(){return get('workMode')!=='none'},
      render:function(){return question('clock','Time boundaries','What does a normal work day look like?','Commute time is protected so workouts do not overlap your real travel.',
        '<div class="guidedFieldGrid">'+
          textInput('jobStart','Shift starts','','time')+
          textInput('jobEnd','Shift ends','','time')+
          textInput('commute','Commute each way (min)','','number','min="0" max="240" step="5" inputmode="numeric"')+
        '</div>')},
      validate:function(){return get('jobStart')&&get('jobEnd')?'':'Add your usual shift start and end time.'}
    },
    {
      id:'secondJob',
      auto:true,
      when:function(){return get('workMode')!=='none'},
      render:function(){return question('calendar','One more schedule check','Do you regularly balance a second job?','We only ask for the second schedule when it applies.',choices('secondJob',[
        {value:'no',label:'No, one schedule',copy:'Keep planning focused on my primary work week',icon:'1'},
        {value:'yes',label:'Yes, a second job',copy:'Protect both schedules before placing workouts',icon:'2'}
      ],'no'))}
    },
    {
      id:'secondDetails',
      when:function(){return get('secondJob')==='yes'},
      render:function(){return question('calendar','Second schedule','When does the second job usually happen?','Add the repeating days now; variable dates can still be reviewed in the calendar.',
        textInput('secondName','Second job name','Second job')+
        dayPicker('second')+
        '<div class="guidedFieldGrid">'+
          textInput('secondStart','Shift starts','','time')+
          textInput('secondEnd','Shift ends','','time')+
          textInput('secondCommute','Commute each way (min)','','number','min="0" max="240" step="5" inputmode="numeric"')+
        '</div>')},
      validate:function(){return(draft.days.second||[]).length&&get('secondStart')&&get('secondEnd')?'':'Choose the usual days and hours for your second job.'}
    },
    {
      id:'sleep',
      render:function(){return question('heart','Recovery first','How much sleep do you want to protect?','Work + Workout treats sleep as a fixed commitment, not leftover time.',
        '<div class="guidedFieldGrid">'+
          textInput('sleepHours','Sleep target (hours)','','number','min="5" max="12" step="0.5" inputmode="decimal"')+
          textInput('bedtime','Typical bedtime','','time')+
        '</div>')},
      validate:function(){return +get('sleepHours')>=5&&get('bedtime')?'':'Add a sleep target and typical bedtime.'}
    },
    {
      id:'commitments',
      render:function(){return question('clock','Life outside the plan','What else regularly needs protected time?','Optional. Add one recurring block per line, such as “Tue 18:00-20:00 class”.',
        '<label class="guidedField"><span>Recurring commitments · optional</span><textarea data-answer="commitments" rows="5" placeholder="Tue 18:00-20:00 class&#10;Sun 09:00-12:00 family">'+safe(get('commitments'))+'</textarea></label>')}
    },
    {
      id:'trainingDays',
      auto:true,
      render:function(){return question('dumbbell','Training rhythm','How many strength sessions feel realistic each week?','Consistency wins. The planner will choose the strongest available windows.',choices('trainingDays',[
        {value:'2',label:'2 sessions',copy:'A focused minimum-effective plan',icon:'2'},
        {value:'3',label:'3 sessions',copy:'Balanced progress and recovery',icon:'3'},
        {value:'4',label:'4 sessions',copy:'More volume when your week supports it',icon:'4'}
      ],'3'))}
    },
    {
      id:'duration',
      auto:true,
      render:function(){return question('clock','Session size','How much time can you usually give a workout?','Warm-up and transitions are considered when the plan finds a window.',choices('duration',[
        {value:'30',label:'30 minutes',copy:'Fast, focused sessions',icon:'30'},
        {value:'45',label:'45 minutes',copy:'Efficient full training',icon:'45'},
        {value:'60',label:'60 minutes',copy:'Complete sessions with breathing room',icon:'60'},
        {value:'75',label:'75 minutes',copy:'Longer training with more accessories',icon:'75'}
      ],'60'))}
    },
    {
      id:'experience',
      auto:true,
      render:function(){return question('chart','Training level','How experienced are you with strength training?','This shapes exercise complexity and progression—not your potential.',choices('experience',[
        {value:'beginner',label:'Getting started',copy:'New or returning after a long break',icon:'01'},
        {value:'intermediate',label:'Consistent lifter',copy:'Comfortable with the main movement patterns',icon:'02'},
        {value:'advanced',label:'Highly experienced',copy:'Years of consistent, structured training',icon:'03'}
      ],'intermediate'))}
    },
    {
      id:'equipment',
      auto:true,
      render:function(){return question('dumbbell','Your training space','What equipment can you rely on?','Every session will use movements you can actually perform.',choices('equipment',[
        {value:'full',label:'Full commercial gym',copy:'Racks, machines, cables and free weights',icon:'▦'},
        {value:'basic',label:'Basic gym',copy:'Core machines and a practical free-weight setup',icon:'◇'},
        {value:'home',label:'Home or minimal',copy:'Bodyweight, bands or a few dumbbells',icon:'⌂'}
      ],'full'))}
    },
    {
      id:'preferred',
      auto:true,
      render:function(){return question('clock','Best energy window','When do workouts usually feel best?','We will prefer this time without forcing it onto overloaded days.',choices('preferred',[
        {value:'morning',label:'Morning',copy:'Start the day with training',icon:'☼'},
        {value:'afternoon',label:'Afternoon',copy:'Train between daytime commitments',icon:'◒'},
        {value:'evening',label:'Evening',copy:'Lift after the main work day',icon:'☾'},
        {value:'flexible',label:'Flexible',copy:'Choose the best opening each day',icon:'↔'}
      ],'flexible'))}
    },
    {
      id:'limitations',
      render:function(){return question('shield','Train around your body','Anything the plan should avoid or adapt?','Optional. Mention injuries, painful movements, accessibility needs, or exercises you dislike.',
        '<label class="guidedField"><span>Limitations or movements to avoid · optional</span><textarea data-answer="limitations" rows="5" placeholder="Example: avoid deep knee flexion; prefer machines for pressing">'+safe(get('limitations'))+'</textarea></label>')}
    },
    {
      id:'foods',
      render:function(){return question('apple','Food that feels familiar','What foods and cuisines do you genuinely enjoy?','Your nutrition suggestions should resemble your life—not a generic meal-prep template.',
        '<div class="guidedStack">'+
          textInput('foods','Favorite everyday foods','eggs, oats, jollof rice, chicken, salmon, plantain')+
          textInput('cuisines','Cuisines you enjoy','Ghanaian, West African, Caribbean, Mediterranean')+
        '</div>')}
    },
    {
      id:'nutrition',
      render:function(){return question('bowl','Make nutrition practical','What will make eating well sustainable?','These preferences shape meal ideas, portions, and prep expectations.',
        '<div class="guidedFieldGrid">'+
          selectInput('meals','Meals per day',[
            {value:'2',label:'2 meals'},{value:'3',label:'3 meals'},{value:'4',label:'4 meals'},{value:'5',label:'5 meals'}
          ])+
          selectInput('budget','Food budget',[
            {value:'low',label:'Budget-conscious'},{value:'moderate',label:'Moderate'},{value:'flexible',label:'Flexible'}
          ])+
          selectInput('cook','Cooking time',[
            {value:'low',label:'Very little'},{value:'moderate',label:'Some cooking'},{value:'high',label:'I enjoy cooking'}
          ])+
        '</div>'+
        '<label class="guidedField guidedFieldTop"><span>Restrictions, allergies, or foods to avoid · optional</span><textarea data-answer="restrictions" rows="3">'+safe(get('restrictions'))+'</textarea></label>')}
    }
  ];

  function activeScreens(){return screens.filter(function(screen){return!screen.when||screen.when()})}
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
    });
    document.querySelectorAll('#guidedOnboardingBody [data-day-kind]').forEach(function(input){input.addEventListener('change',syncVisible)});
    document.querySelectorAll('#guidedOnboardingBody [data-choice-field]').forEach(function(button){
      button.addEventListener('click',function(){
        const field=button.dataset.choiceField;
        set(field,button.dataset.choiceValue);
        document.querySelectorAll('[data-choice-field="'+field+'"]').forEach(function(other){other.classList.toggle('selected',other===button)});
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
            '<div class="guidedHead"><div><small id="guidedStepLabel">Question 1</small><h2 id="guidedOnboardingTitle">Build your adaptive plan</h2></div><button id="guidedClose">Finish later</button></div>'+
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
    document.getElementById('guidedStepLabel').textContent='Question '+(step+1)+' of '+state.list.length;
    document.getElementById('guidedProgressFill').style.width=((step+1)/state.list.length*100)+'%';
    document.getElementById('guidedOnboardingBody').innerHTML=state.screen.render();
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
    requestAnimationFrame(function(){document.querySelector('#guidedOnboardingBody input:not([type="hidden"]),#guidedOnboardingBody select,#guidedOnboardingBody textarea')?.focus({preventScroll:true})});
  }
  async function goNext(){
    if(busy)return;
    syncVisible();
    const state=mountedScreen();
    const error=state.screen.validate?.();
    if(error){document.getElementById('guidedStatus').textContent=error;return}
    const refreshed=activeScreens();
    if(step<refreshed.length-1){step++;render();return}
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
  function collectAnswers(){
    const workMode=get('workMode','standard');
    const second=get('secondJob','no')==='yes'&&workMode!=='none';
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
        primaryName:get('jobName','Work').trim()||'Work',
        primaryDays:workMode==='none'?[]:(draft.days.job||[]),
        primaryStart:workMode==='none'?'':get('jobStart','09:00'),
        primaryEnd:workMode==='none'?'':get('jobEnd','17:00'),
        primaryCommute:workMode==='none'?0:(+get('commute')||0),
        secondaryEnabled:second,
        secondaryName:get('secondName','Second job').trim()||'Second job',
        secondaryDays:second?(draft.days.second||[]):[],
        secondaryStart:second?get('secondStart'):'',
        secondaryEnd:second?get('secondEnd'):'',
        secondaryCommute:second?(+get('secondCommute')||0):0,
        commitments:parseCommitments(get('commitments'))
      },
      training:{
        days:+get('trainingDays')||3,
        duration:+get('duration')||60,
        experience:get('experience','intermediate'),
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
    const answers=collectAnswers();
    const next=document.getElementById('guidedNext');
    busy=true;
    next.disabled=true;
    document.getElementById('guidedStatus').textContent='Finding realistic workout windows and building your plan…';
    try{
      let plan=A.buildDeterministicPlan(answers);
      if(A.session&&A.config?.aiConfigured){
        try{
          const result=await A.authedFetch('onboarding',{method:'POST',body:JSON.stringify({answers:answers,deterministicPlan:plan})});
          if(result.plan)plan=result.plan;
        }catch(error){window.recordDiagnostic?.('guided-ai-onboarding',error)}
      }
      showPreview(answers,plan);
    }catch(error){
      document.getElementById('guidedStatus').textContent=error.message||'We could not build the plan yet.';
    }finally{
      busy=false;
      next.disabled=false;
    }
  }
  function showPreview(answers,plan){
    const training=plan.training||{};
    const nutrition=plan.nutrition||{};
    const ai=plan.ai||{};
    document.getElementById('guidedStepLabel').textContent='Your plan preview';
    document.getElementById('guidedProgressFill').style.width='100%';
    document.getElementById('guidedOnboardingBody').innerHTML=
      '<div class="guidedPlanReady">'+
        '<div class="guidedPlanPhoto"><img src="../work-gym-planner-v16/assets/whole-day-system-v18-web.jpg" alt="A balanced day of training, food and planning"></div>'+
        '<p class="guidedEyebrow">READY FOR '+safe(answers.basics.name.toUpperCase())+'</p>'+
        '<h3>Your first week has a rhythm.</h3>'+
        '<p>'+safe(ai.summary||'We protected work, commute and sleep first, then placed training and nutrition around the strongest available windows.')+'</p>'+
      '</div>'+
      '<div class="guidedPreviewGrid">'+
        '<section><span>TRAINING</span><h4>Best workout windows</h4>'+
          ((training.days||[]).map(function(day){return '<div class="guidedPlanRow"><div><b>'+safe(day.dayName)+' · '+safe(day.workout)+'</b><small>'+safe(day.reason||'Best available window')+'</small></div><strong>'+safe(day.start)+'–'+safe(day.end)+'</strong></div>'}).join('')||'<p>No reliable workout windows were found yet. You can adjust availability after setup.</p>')+
        '</section>'+
        '<section><span>NUTRITION</span><h4>Starting daily targets</h4>'+
          '<div class="guidedTargets"><div><b>'+Math.round(nutrition.gymCalories||0)+'</b><small>training kcal</small></div><div><b>'+Math.round(nutrition.recoveryCalories||0)+'</b><small>recovery kcal</small></div><div><b>'+Math.round(nutrition.protein||0)+'g</b><small>protein</small></div></div>'+
          '<p>'+safe(ai.nutrition?.rationale||'Targets begin conservatively and adapt from your real logs and trend.')+'</p>'+
        '</section>'+
      '</div>';
    document.getElementById('guidedBack').classList.add('hidden');
    const next=document.getElementById('guidedNext');
    next.textContent='Use this plan';
    next.onclick=function(){
      A.applyPersonalizedPlan(answers,plan);
      clearDraft();
      closeGuided();
      window.dispatchEvent(new CustomEvent('wgc:profile-ready'));
      window.toast?.('Your personalized plan is ready');
      A.pushState?.({quiet:true}).catch(function(){});
    };
    document.getElementById('guidedStatus').textContent='You can edit every choice later.';
  }
  function closeGuided(){
    syncVisible();
    window.closeModal?.('guidedOnboarding');
  }
  function openGuided(){
    if(A.config?.cloudConfigured&&!A.session){A.openAccount?.('signup');return}
    document.querySelectorAll('.modal.open').forEach(function(open){window.closeModal?.(open.id)});
    step=0;
    render();
    window.openModal?.('guidedOnboarding');
  }
  function rerouteProfileEditors(){
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
      homeProfile.onclick=openGuided;
    }
    const onboardingButton=document.getElementById('openOnboardingV18');
    if(onboardingButton&&!onboardingButton.dataset.guidedProfile){
      onboardingButton.dataset.guidedProfile='true';
      onboardingButton.onclick=openGuided;
    }
  }

  A.openOnboarding=openGuided;
  A.onboardingAnswers=collectAnswers;
  modal();
  rerouteProfileEditors();
  new MutationObserver(rerouteProfileEditors).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',rerouteProfileEditors,{once:true});
})();
