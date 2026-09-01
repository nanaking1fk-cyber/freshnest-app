// Work + Workout v30 — premium signed-in workspace.
(function workWorkoutAppV30(window){
  'use strict';

  var VERSION='30.1.27';
  var scheduled=false;

  function text(node){return (node&&node.textContent||'').trim().toLowerCase()}
  function button(label, className){
    var node=document.createElement('button');
    node.type='button';
    node.className=className;
    node.textContent=label;
    return node;
  }

  function upsertIntro(pageId, eyebrow, title, description){
    var page=document.getElementById(pageId);
    if(!page)return;
    var intro=page.querySelector(':scope > .pageIntroV30');
    if(!intro){
      intro=document.createElement('header');
      intro.className='pageIntroV30';
      page.insertBefore(intro,page.firstChild);
    }
    var markup='<p>'+eyebrow+'</p><h1>'+title+'</h1><span>'+description+'</span>';
    if(intro.innerHTML!==markup)intro.innerHTML=markup;
  }

  function enhancePages(){
    upsertIntro('page-training','Today\'s training','One workout. One clear next step.','Move through the session exercise by exercise. Your deeper trends stay close when you need them.');
    upsertIntro('page-diary','Daily fuel','Eat for the day you actually have.','See today\'s essentials first, then add meals in a few taps.');
    upsertIntro('page-progress','Your progress','The trend matters more than one day.','Check in, follow the direction of travel, and let your plan adapt.');
    upsertIntro('page-more','Your space','Everything else, neatly organized.','Manage your plan, health preferences, account and support from one place.');
    ['page-training','page-diary','page-more'].forEach(function(id){document.querySelector('#'+id+' > .pageIntroV30')?.classList.add('v31QuietIntro')});
    document.querySelectorAll('.pageIntroV29').forEach(function(node){node.classList.add('v30LegacyIntro')});
  }

  function setExerciseState(card, open){
    card.classList.toggle('v30Collapsed',!open);
    card.dataset.v30Open=open?'true':'false';
    var toggle=card.querySelector('.exerciseToggleV30');
    if(toggle){
      toggle.setAttribute('aria-expanded',String(open));
      toggle.innerHTML='<span>'+(open?'Close':'Open')+'</span><i aria-hidden="true">'+(open?'−':'+')+'</i>';
    }
  }

  function enhanceTraining(){
    var root=document.getElementById('trainingRoot');
    if(!root)return;
    var tools=root.querySelector('.trainTools'),nav=root.querySelector('.trainNav'),coach=root.querySelector('.coachCard');
    if(tools&&nav&&!root.querySelector('#trainingToolsToggleV31')){
      var utilities=document.createElement('div');utilities.className='trainingQuickV31';nav.insertAdjacentElement('afterend',utilities);
      var toolsToggle=button('Workout options','trainingToolsToggleV31');
      toolsToggle.id='trainingToolsToggleV31';
      toolsToggle.setAttribute('aria-expanded','false');
      toolsToggle.addEventListener('click',function(){
        var open=root.classList.toggle('v31ToolsOpen');
        toolsToggle.textContent=open?'Hide workout options':'Workout options';
        toolsToggle.setAttribute('aria-expanded',String(open));
      });
      utilities.appendChild(toolsToggle);
      if(coach){
        var coachToggle=button('Coach note','trainingCoachToggleV31');coachToggle.id='trainingCoachToggleV31';coachToggle.setAttribute('aria-expanded','false');
        coachToggle.addEventListener('click',function(){var open=root.classList.toggle('v31CoachOpen');coachToggle.textContent=open?'Hide coach note':'Coach note';coachToggle.setAttribute('aria-expanded',String(open))});
        utilities.appendChild(coachToggle);
      }
    }
    var cards=Array.from(root.querySelectorAll('#trainingSwipe > .exerciseCard'));
    cards.forEach(function(card,index){
      var head=card.querySelector('.exerciseHead');
      if(!head)return;
      if(!card.querySelector('.exerciseIndexV30')){
        var label=document.createElement('small');
        label.className='exerciseIndexV30';
        label.textContent='Exercise '+(index+1)+' of '+cards.length;
        var copy=head.querySelector(':scope > div');
        if(copy)copy.insertBefore(label,copy.firstChild);
      }
      var toggle=card.querySelector('.exerciseToggleV30');
      if(!toggle){
        toggle=button('Open','exerciseToggleV30');
        toggle.addEventListener('click',function(event){
          event.preventDefault();
          var willOpen=card.classList.contains('v30Collapsed');
          if(willOpen)cards.forEach(function(other){if(other!==card)setExerciseState(other,false)});
          setExerciseState(card,willOpen);
          if(willOpen&&window.innerWidth<760)card.scrollIntoView({behavior:'smooth',block:'start'});
        });
        head.appendChild(toggle);
      }
      if(!card.dataset.v30Open)setExerciseState(card,index===0);
    });

    coach=root.querySelector('.coachCard');
    if(coach&&!coach.querySelector('.coachDetailToggleV30')){
      coach.classList.add('v30CoachCompact');
      var coachToggle=button('Why this plan?','coachDetailToggleV30');
      coachToggle.setAttribute('aria-expanded','false');
      coachToggle.addEventListener('click',function(){
        var open=coach.classList.toggle('v30CoachOpen');
        coachToggle.textContent=open?'Show less':'Why this plan?';
        coachToggle.setAttribute('aria-expanded',String(open));
      });
      coach.appendChild(coachToggle);
    }

    var stats=root.querySelector('.trainStats');
    var insights=root.querySelector('#trainingInsightsToggleV30');
    if(stats&&!insights){
      insights=button('View training insights and history','trainingInsightsToggleV30');
      insights.id='trainingInsightsToggleV30';
      insights.setAttribute('aria-expanded','false');
      insights.addEventListener('click',function(){
        var open=root.classList.toggle('v30InsightsOpen');
        insights.textContent=open?'Hide training insights':'View training insights and history';
        insights.setAttribute('aria-expanded',String(open));
      });
      stats.insertAdjacentElement('afterend',insights);
    }
    var actions=root.querySelector('.trainActionGrid');
    if(actions&&stats&&insights){
      if(actions.nextElementSibling!==stats)actions.insertAdjacentElement('afterend',stats);
      if(stats.nextElementSibling!==insights)stats.insertAdjacentElement('afterend',insights);
      var cursor=insights;
      [root.querySelector('.muscleCard'),root.querySelector('#completedWorkoutHistory')].concat(Array.from(root.querySelectorAll('.trainingChartWrap'))).filter(Boolean).forEach(function(node){
        if(cursor.nextElementSibling!==node)cursor.insertAdjacentElement('afterend',node);
        cursor=node;
      });
    }
  }

  function enhanceNutrition(){
    var page=document.getElementById('page-diary');
    if(!page)return;
    var energy=page.querySelector('.energyCard');
    var macroGrid=page.querySelector('#macroGrid');
    if(energy&&macroGrid&&!energy.querySelector('.macroToggleV30')){
      energy.classList.add('v30MacroCompact');
      var macroToggle=button('Show nutrition limits','macroToggleV30');
      macroToggle.setAttribute('aria-expanded','false');
      macroToggle.addEventListener('click',function(){
        var open=energy.classList.toggle('v30MacroOpen');
        macroToggle.textContent=open?'Hide nutrition limits':'Show nutrition limits';
        macroToggle.setAttribute('aria-expanded',String(open));
      });
      energy.appendChild(macroToggle);
    }

    var plan=page.querySelector('#personalNutritionPlan');
    var emptyPlan=plan&&plan.querySelector('.nutritionPlanEmpty');
    if(emptyPlan&&!emptyPlan.dataset.v31Compact){
      emptyPlan.dataset.v31Compact='true';
      var label=emptyPlan.querySelector('b'),copy=emptyPlan.querySelector('span'),action=emptyPlan.querySelector('button');
      if(label)label.textContent='Nutrition plan';
      if(copy)copy.hidden=true;
      if(action)action.textContent='Build plan';
    }
    if(plan&&plan.querySelector('.nutritionPlanHead')&&!plan.querySelector('.nutritionPlanToggleV30')){
      if(!plan.dataset.v30PlanState)plan.dataset.v30PlanState='compact';
      plan.classList.toggle('v30PlanCompact',plan.dataset.v30PlanState!=='open');
      var planToggle=button(plan.dataset.v30PlanState==='open'?'Hide meal template':'View meal template','nutritionPlanToggleV30');
      planToggle.setAttribute('aria-expanded',String(plan.dataset.v30PlanState==='open'));
      plan.querySelector('.nutritionPlanHead').insertAdjacentElement('afterend',planToggle);
      planToggle.addEventListener('click',function(){
        var open=plan.dataset.v30PlanState!=='open';
        plan.dataset.v30PlanState=open?'open':'compact';
        plan.classList.toggle('v30PlanCompact',!open);
        planToggle.textContent=open?'Hide meal template':'View meal template';
        planToggle.setAttribute('aria-expanded',String(open));
      });
    }
  }

  var groups=[
    {key:'plan',title:'Plan & coaching',hint:'Build the system around your real life',matches:['ai coach','workout library','personalized plan','personalize my plan','profile, work','profile & work','import a schedule']},
    {key:'health',title:'Health & progress',hint:'Tune your training, nutrition and recovery',matches:['body stats','nutrition goals','health & recovery','reminders & calendar']},
    {key:'account',title:'Account & data',hint:'Your profile, sync, privacy and backups',matches:['account & sync','account & cloud','account & security','data & backup','about & privacy']},
    {key:'help',title:'Legal & privacy',hint:'Policies, health-data rights, support and system status',matches:['privacy policy','privacy & consumer health data policy','privacy & health data','privacy & terms','terms of use','terms','support','system check']}
  ];

  function setMenuGroupOpen(cards,section,open){
    cards.querySelectorAll('.menuGroupV30').forEach(function(other){
      var active=other===section&&open,items=other.querySelector('.menuGroupItemsV30'),toggle=other.querySelector('.menuGroupToggleV31'),icon=toggle?.querySelector('i');
      other.classList.toggle('v31Open',active);
      if(items)items.hidden=!active;
      if(toggle)toggle.setAttribute('aria-expanded',String(active));
      if(icon)icon.textContent=active?'−':'+';
    });
  }

  function menuGroup(cards,group){
    var section=cards.querySelector('[data-v30-group="'+group.key+'"]');
    if(section){if(!section.classList.contains('v31Open')){var existingItems=section.querySelector('.menuGroupItemsV30');if(existingItems)existingItems.hidden=true}return section}
    section=document.createElement('section');
    section.className='menuGroupV30';
    section.dataset.v30Group=group.key;
    var itemsId='menuGroupItems-'+group.key;
    section.innerHTML='<header><button class="menuGroupToggleV31" type="button" aria-expanded="false" aria-controls="'+itemsId+'"><span><small>'+String(groups.indexOf(group)+1).padStart(2,'0')+'</small><b>'+group.title+'</b><em>'+group.hint+'</em></span><i aria-hidden="true">+</i></button></header><div id="'+itemsId+'" class="menuGroupItemsV30" hidden></div>';
    var toggle=section.querySelector('.menuGroupToggleV31'),items=section.querySelector('.menuGroupItemsV30');
    toggle.onclick=function(){setMenuGroupOpen(cards,section,!section.classList.contains('v31Open'))};
    cards.appendChild(section);
    return section;
  }

  function enhanceMore(){
    var cards=document.querySelector('#page-more .menuCards');
    if(!cards)return;
    cards.classList.add('menuCardsV30');
    var buttons=Array.from(cards.querySelectorAll('button')).filter(function(node){return !node.classList.contains('menuGroupToggleV31')&&(!node.closest('.menuGroupV30')||node.parentElement.classList.contains('menuGroupItemsV30'))});
    var sections={};
    groups.forEach(function(group){sections[group.key]=menuGroup(cards,group).querySelector('.menuGroupItemsV30')});
    buttons.forEach(function(node){
      var label=text(node.querySelector('b'))||text(node);
      var group=groups.find(function(item){return item.matches.some(function(match){return label.includes(match)})})||groups[0];
      if(node.parentElement!==sections[group.key])sections[group.key].appendChild(node);
      if(label.includes('account')){
        var title=node.querySelector('b');
        var subtitle=node.querySelector('small');
        if(title&&title.textContent!=='Account & security')title.textContent='Account & security';
        if(subtitle&&subtitle.textContent!=='Profile, sync, privacy and sign out')subtitle.textContent='Profile, sync, privacy and sign out';
      }
    });
    groups.forEach(function(group){
      var section=sections[group.key].closest('.menuGroupV30');
      section.hidden=!sections[group.key].querySelector('button:not([aria-hidden="true"])');
    });
    if(!cards.dataset.v30LegalShown){
      cards.dataset.v30LegalShown='true';
      var legalSection=sections.help.closest('.menuGroupV30');
      if(!legalSection.hidden)setMenuGroupOpen(cards,legalSection,true);
    }
  }

  function enhanceNavigation(){
    var nav=document.querySelector('.bottomNav');
    if(!nav)return;
    nav.classList.add('bottomNavV30');
    nav.querySelectorAll('button[data-page]').forEach(function(node){
      var label=node.querySelector('small');
      if(node.dataset.page==='diary'&&label&&label.textContent!=='Nutrition')label.textContent='Nutrition';
      node.setAttribute('aria-current',node.classList.contains('active')?'page':'false');
      if(!node.dataset.v30Bound){
        node.dataset.v30Bound='true';
        node.addEventListener('click',function(){window.setTimeout(enhance,40)});
      }
    });
  }

  function ensureStylesLast(){
    var style=document.querySelector('link[href*="app-v30.css"]');
    if(style&&style!==document.head.lastElementChild)document.head.appendChild(style);
  }

  function enhance(){
    scheduled=false;
    window.APP_VERSION=VERSION;
    document.body.classList.add('premiumV30');
    document.body.classList.remove('premiumV28');
    document.title='Work + Workout | Health planned around work';
    ensureStylesLast();
    enhanceNavigation();
    enhancePages();
    enhanceTraining();
    enhanceNutrition();
    enhanceMore();
    var about=document.querySelector('#aboutDialog .card p');
    if(about&&about.innerHTML.includes('Version:')&&about.innerHTML!=='<b>Version:</b> '+VERSION)about.innerHTML='<b>Version:</b> '+VERSION;
  }

  function scheduleEnhance(){
    if(scheduled)return;
    scheduled=true;
    window.requestAnimationFrame(enhance);
  }

  enhance();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});
  new MutationObserver(scheduleEnhance).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('wgc:authchange',function(){window.setTimeout(enhance,40)});
  window.addEventListener('wgc:profile-ready',function(){window.setTimeout(enhance,40)});
  window.setTimeout(enhance,600);
})(window);
