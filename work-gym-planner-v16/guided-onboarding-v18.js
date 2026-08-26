// Work + Workout 18.4 guided, adaptive onboarding.
(function guidedOnboarding(){
  const A=window.WGC18=window.WGC18||{};
  const DRAFT_KEY='wgc-guided-onboarding-v18';
  const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const safe=window.esc||function(value){return String(value??'').replace(/[&<>"']/g,function(char){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]})};
  let step=0;
  let busy=false;
  let previewReady=false;
  let draft=loadDraft();

  function loadDraft(){
    try{
      const saved=JSON.parse(sessionStorage.getItem(DRAFT_KEY)||'null');
      if(saved&&saved.version===2&&saved.values)return saved;
    }catch{}
    const p=typeof profile==='function'?profile():null;
    const previous=typeof jget==='function'?jget(PREFIX+'onboarding-v18',{})?.answers:null;
    const basics=previous?.basics||{},work=previous?.work||{},training=previous?.training||{},nutrition=previous?.nutrition||{};
    const commitments=(work.commitments||[]).map(function(item){return DAYS[item.day]+' '+item.start+'-'+item.end+' '+(item.label||'Commitment')}).join('\n');
    return{version:2,values:{
      name:basics.name||p?.name||'',
      goal:basics.goal||'recomp',
      age:basics.age||'',
      sex:basics.sex||'neutral',
      heightFt:basics.heightFt||'',
      heightIn:basics.heightIn||'',
      weight:basics.weight||'',
      bodyFat:basics.bodyFat||'',
      activity:basics.activity||'moderate',
      workMode:(work.primaryDays||[]).length||p?.fixed?.enabled?'standard':'none',
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
      trainingDays:String(training.days||p?.trainingDaysPerWeek||3),
      duration:String(training.duration||60),
      experience:training.experience||'intermediate',
      equipment:training.equipment||p?.equipmentMode||'full',
      preferred:training.preferred||'flexible',
      limitations:training.limitations||'',
      foods:(nutrition.foods||[]).join(', '),
      cuisines:(nutrition.cuisines||[]).join(', '),
      restrictions:nutrition.restrictions||'',
      meals:String(nutrition.meals||3),
      budget:nutrition.budget||'moderate',
      cook:nutrition.cook||'moderate'
    },days:{job:(work.primaryDays||[1,2,3,4,5]).slice(),second:(work.secondaryDays||[]).slice()}};
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

  // Six to nine adaptive steps replace the former 19-question flow. Related
  // details stay together so setup feels like a conversation, not a survey.
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
        {value:'none',label:'No work schedule',copy:'Plan mainly from recovery and availability',icon:'—'}
      ],'standard'))}
    },
    {
      id:'workDetails',
      when:function(){return get('workMode')!=='none'},
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
      when:function(){return get('workMode')!=='none'},
      render:function(){return question('calendar','One more schedule check','Do you need to protect another recurring schedule?','Add it only when it is part of your real week.',choices('secondJob',[
        {value:'no',label:'No, one work rhythm',copy:'Keep planning focused on the schedule I already added',icon:'1'},
        {value:'yes',label:'Yes, add another',copy:'Protect another job, class or recurring responsibility',icon:'2'}
      ],'no'))}
    },
    {
      id:'secondDetails',
      when:function(){return get('secondJob')==='yes'},
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
      render:function(){return question('dumbbell','Training that fits','What can you realistically sustain?','Choose a weekly rhythm, session length, experience level, equipment and preferred time.',
        choices('trainingDays',[
        {value:'2',label:'2 sessions',copy:'A focused minimum-effective plan',icon:'2'},
        {value:'3',label:'3 sessions',copy:'Balanced progress and recovery',icon:'3'},
        {value:'4',label:'4 sessions',copy:'More volume when your week supports it',icon:'4'}
        ],'3')+
        '<div class="guidedFieldGrid guidedFieldTop">'+
          selectInput('duration','Session length',[{value:'30',label:'30 minutes'},{value:'45',label:'45 minutes'},{value:'60',label:'60 minutes'},{value:'75',label:'75 minutes'}])+
          selectInput('experience','Experience',[{value:'beginner',label:'Getting started'},{value:'intermediate',label:'Consistent lifter'},{value:'advanced',label:'Highly experienced'}])+
          selectInput('equipment','Equipment',[{value:'full',label:'Full commercial gym'},{value:'basic',label:'Basic gym'},{value:'home',label:'Home or minimal'}])+
          selectInput('preferred','Best energy window',[{value:'morning',label:'Morning'},{value:'afternoon',label:'Afternoon'},{value:'evening',label:'Evening'},{value:'flexible',label:'Flexible'}])+
        '</div><label class="guidedField guidedFieldTop"><span>Limitations or movements to avoid · optional</span><textarea data-answer="limitations" rows="3" placeholder="Example: avoid deep knee flexion; prefer machines for pressing">'+safe(get('limitations'))+'</textarea></label>')}
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
        secondaryName:get('secondName','Additional schedule').trim()||'Additional schedule',
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
    document.getElementById('guidedStatus').textContent='Building your calendar…';
    try{
      const plan=A.buildDeterministicPlan(answers);
      // The local planner is instant and reliable. Save it before any network
      // request so a slow AI refinement can never strand the setup screen.
      A.applyPersonalizedPlan(answers,plan);
      clearDraft();
      window.dispatchEvent(new CustomEvent('wgc:profile-ready'));
      showPreview(answers,plan,true);
      A.pushState?.({quiet:true}).catch(function(){});
      if(A.session&&A.config?.aiConfigured){
        A.authedFetch('onboarding',{method:'POST',body:JSON.stringify({answers:answers,deterministicPlan:plan})})
          .then(function(result){
            if(!result.plan)return;
            A.applyPersonalizedPlan(answers,result.plan);
            if(document.getElementById('guidedOnboarding')?.classList.contains('open'))showPreview(answers,result.plan,false);
            A.pushState?.({quiet:true}).catch(function(){});
          })
          .catch(function(error){window.recordDiagnostic?.('guided-ai-onboarding',error)});
      }
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
    next.textContent='See my calendar';
    next.onclick=function(){
      closeGuided();
      if(window.openCalendarDate)window.openCalendarDate();else window.page?.('calendar');
      window.toast?.('Your work, workouts and commitments are on the calendar');
    };
    document.getElementById('guidedStatus').textContent=refining&&A.session&&A.config?.aiConfigured?'Your plan is ready. Coaching details are refining quietly in the background.':'Your plan is saved. You can edit every choice later.';
  }
  function closeGuided(){
    if(previewReady){try{sessionStorage.removeItem(DRAFT_KEY)}catch{};previewReady=false}
    else syncVisible();
    window.closeModal?.('guidedOnboarding');
  }
  function openGuided(){
    if(A.config?.cloudConfigured&&!A.session){A.openAccount?.('signup');return}
    document.querySelectorAll('.modal.open').forEach(function(open){window.closeModal?.(open.id)});
    previewReady=false;
    draft=loadDraft();
    step=0;
    render();
    window.openModal?.('guidedOnboarding');
  }
  function profileSummaryModal(){
    if(document.getElementById('guidedProfileSummary'))return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="guidedProfileSummary" class="modal guidedProfileSummary" role="dialog" aria-modal="true" aria-labelledby="guidedProfileTitle">'+
        '<div class="sheet guidedProfileSheet"><div class="sheetHandle"></div>'+
          '<div class="guidedProfileHero"><div id="guidedProfileInitial" class="guidedProfileInitial">W</div><div><p class="guidedEyebrow">YOUR PLAN</p><h2 id="guidedProfileTitle">Profile</h2><p id="guidedProfileEmail"></p></div></div>'+
          '<div id="guidedProfileFacts" class="guidedProfileFacts"></div>'+
          '<div class="guidedProfileActions"><button id="guidedProfileClose">Close</button><button id="guidedProfileAccount">Account & sync</button><button id="guidedProfileEdit" class="primary">Edit adaptive plan</button></div>'+
        '</div></div>');
    document.getElementById('guidedProfileClose').onclick=function(){window.closeModal?.('guidedProfileSummary')};
    document.getElementById('guidedProfileAccount').onclick=function(){window.closeModal?.('guidedProfileSummary');A.openAccount?.('account')};
    document.getElementById('guidedProfileEdit').onclick=function(){window.closeModal?.('guidedProfileSummary');openGuided()};
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
  A.onboardingAnswers=collectAnswers;
  modal();
  rerouteProfileEditors();
  new MutationObserver(rerouteProfileEditors).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',rerouteProfileEditors,{once:true});
})();
