// Work + Workout v29 — final visual shell and brand normalization.
(function workWorkoutAppV29(window){
  'use strict';
  window.APP_VERSION='30.1.10';
  var A=window.WGC18=window.WGC18||{};
  var icons={
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v3M19 4v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12H4V7a1 1 0 0 1 1-1Z"/><path d="M8 13h3v3H8z"/></svg>',
    diary:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c5-3 7-7 7-11-4 0-7 1-9 4-1.5 2.2-1.5 4.5-1 6.5"/><path d="M5 4c3 1 5 3 6 6M5 4c-1 5 .3 8 4 10"/></svg>',
    training:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6m3-8v10m3-5h6m0-5v10m3-8v6m3-4v2M6 12h12"/></svg>',
    progress:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9m5 10V5m6 14v-7m5 7V3"/></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>'
  };
  function normalizeBrand(){
    document.title='Work + Workout | Plan your week around work';
    var apple=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(apple)apple.content='Work + Workout';
    document.querySelectorAll('h1,h2,h3,p,small,b,span,button,label').forEach(function(node){
      if(node.children.length)return;
      var text=node.textContent;
      if(text&&text.includes('Work + Gym Coach'))node.textContent=text.replaceAll('Work + Gym Coach','Work + Workout');
      else if(text&&text.includes('Work + Gym Planner'))node.textContent=text.replaceAll('Work + Gym Planner','Work + Workout');
    });
    var about=document.querySelector('#aboutDialog .card p');if(about&&about.innerHTML.includes('Version:'))about.innerHTML='<b>Version:</b> 30.1.10';
  }
  function enhanceNavigation(){
    var nav=document.querySelector('.bottomNav');if(!nav||nav.dataset.v29)return;nav.dataset.v29='true';
    nav.querySelectorAll('[data-page]').forEach(function(button){
      var key=button.dataset.page,span=button.querySelector('span');
      if(span&&icons[key]){span.className='navIconV29';span.innerHTML=icons[key]}
      button.setAttribute('aria-label',button.querySelector('small')?.textContent||key);
      button.setAttribute('aria-current',button.classList.contains('active')?'page':'false');
      button.addEventListener('click',function(){nav.querySelectorAll('button').forEach(function(item){item.setAttribute('aria-current',item===button?'page':'false')});document.body.dataset.activePage=key});
    });
    var active=nav.querySelector('.active[data-page]');if(active)document.body.dataset.activePage=active.dataset.page;
  }
  function enhancePages(){
    var progress=document.getElementById('page-progress');
    if(progress&&!progress.querySelector('.pageIntroV29')){
      progress.insertAdjacentHTML('afterbegin','<header class="pageIntroV29"><p>Progress signal</p><h1>Patterns, not noise.</h1><span>Track the trend. Let the plan respond.</span></header>');
      var legacy=progress.querySelector(':scope > #progressHeading');if(legacy)legacy.classList.add('srOnly');
    }
    var diary=document.getElementById('page-diary');
    if(diary&&!diary.querySelector('.pageIntroV29'))diary.insertAdjacentHTML('afterbegin','<header class="pageIntroV29"><p>Fuel signal</p><h1>Eat for the day you have.</h1><span>Targets and meals that understand the shift.</span></header>');
    var more=document.getElementById('page-more');
    if(more&&!more.querySelector('.pageIntroV29')){
      more.insertAdjacentHTML('afterbegin','<header class="pageIntroV29"><p>Your system</p><h1>Account &amp; settings.</h1><span>Adjust the plan without rebuilding your life.</span></header>');
      var moreHeading=more.querySelector(':scope > #moreHeading');if(moreHeading)moreHeading.classList.add('srOnly');
    }
  }
  function accountFromAvatar(event){
    var avatar=event.target.closest&&event.target.closest('#homeProfileBtn,#accountChip');if(!avatar)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(A.openAccount)A.openAccount('signin');
  }
  function polish(){document.body.classList.add('premiumV29');normalizeBrand();enhanceNavigation();enhancePages()}
  document.addEventListener('click',accountFromAvatar,true);
  polish();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish,{once:true});
  window.addEventListener('wgc:authchange',function(){window.setTimeout(polish,30)});
  window.addEventListener('wgc:profile-ready',function(){window.setTimeout(polish,30)});
  window.setTimeout(polish,500);
})(window);
