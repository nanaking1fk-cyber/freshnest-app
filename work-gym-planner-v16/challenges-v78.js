// Work + Workout v78 — private, invite-only healthy challenge boards.
(function workWorkoutChallengesV78(window){
 'use strict';
 var A=window.WGC18=window.WGC18||{};
 var ID='challengeDialogV78',boards=[],view='list',selectedId=null,busy=false,pollTimer=null,returnFocus=null,reopenAfterAuth=false,syncing=false;
 var METRICS={
  steps:{label:'Steps',icon:'↟',unit:'steps',suggested:12000,title:'12,000 steps'},
  workouts:{label:'Completed workouts',icon:'✓',unit:'workouts',suggested:5,title:'Workout streak'},
  calories_burned:{label:'Calories burned',icon:'◌',unit:'kcal burned',suggested:2500,title:'Movement challenge'},
  custom:{label:'Custom number',icon:'＋',unit:'points',suggested:10,title:'Team challenge'}
 };

 function root(){return document.getElementById(ID)}
 function safe(value){return typeof esc==='function'?esc(value):String(value||'').replace(/[&<>'"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]})}
 function today(){return typeof dkey==='function'?dkey():new Date().toISOString().slice(0,10)}
 function plusDays(day,count){if(typeof addDays==='function')return addDays(day,count);var date=new Date(day+'T12:00:00');date.setDate(date.getDate()+count);return date.toISOString().slice(0,10)}
 function displayName(){
  var stored=typeof profile==='function'?profile():null;
  return String(stored?.name||A.session?.user?.user_metadata?.display_name||'').trim().slice(0,30);
 }
 function prettyCode(value){var code=String(value||'').replace(/[^A-Z2-9]/gi,'').toUpperCase();return code.length===8?code.slice(0,4)+'-'+code.slice(4):code}
 function metric(board){return METRICS[board?.metric]||METRICS.custom}
 function number(value){var n=Number(value)||0;return Number.isInteger(n)?n.toLocaleString():n.toLocaleString(undefined,{maximumFractionDigits:1})}
 function dateLabel(value){try{return new Date(value+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}catch{return value}}
 function statusText(board){if(board.status==='ended')return'Ended';if(board.status==='finished')return'Finished';if(board.status==='upcoming')return'Starts '+dateLabel(board.startsOn);return'Active now'}
 function me(board){return (board.members||[]).find(function(member){return member.isYou})||null}
 function progressCopy(board,member){
  if(!member)return'Waiting for your first score';
  return board.cadence==='daily'?number(member.daysCompleted)+' of '+number(member.daysExpected)+' days completed':number(member.totalValue)+' of '+number(board.targetValue)+' '+safe(board.unitLabel);
 }
 function api(options){return A.authedFetch('challenges'+(options?.method==='GET'?'?date='+encodeURIComponent(today()):''),options)}
 function setStatus(message,error){var node=root()?.querySelector('#challengeStatusV78');if(node){node.textContent=message||'';node.classList.toggle('bad',!!error)}}
 function header(title,copy,back){return '<header class="challengeHeadV78">'+(back?'<button type="button" data-challenge-view="'+back+'" aria-label="Back">←</button>':'<span></span>')+'<div><p>CHALLENGE BOARD</p><h2 id="challengeTitleV78">'+safe(title)+'</h2><small>'+safe(copy)+'</small></div><button type="button" data-challenge-close aria-label="Close challenges">×</button></header>'}
 function privacyNote(){return '<details class="challengePrivacyV78"><summary>What coworkers can see</summary><p>Only the display name you choose and your challenge score. Your email, account ID, meals, workout details and health records stay private.</p></details>'}

 function signedOutHTML(){return header('Healthy challenges','Friendly competition, private by design.')+'<main class="challengeSignedOutV78"><span aria-hidden="true">♜</span><h3>Sign in to join your team</h3><p>Challenge boards sync across phones. Your private planner and health history are never shown.</p><button type="button" class="primary" data-challenge-signin>Sign in or create account</button>'+privacyNote()+'</main>'}
 function emptyHTML(){return '<section class="challengeEmptyV78"><div class="challengeEmptyMarkV78" aria-hidden="true"><i>1</i><i>2</i><i>3</i></div><h3>Start something healthy together</h3><p>Create a goal, invite coworkers with one private link, and watch the board update.</p><div><span>12K steps</span><span>Workout streak</span><span>Custom goal</span></div></section>'}
 function boardCard(board){
  var mine=me(board),info=metric(board),percent=Math.max(0,Math.min(100,Number(mine?.progressPercent)||0));
  return '<button type="button" class="challengeCardV78" data-challenge-board="'+safe(board.id)+'"><span class="challengeMetricV78" aria-hidden="true">'+info.icon+'</span><div><small>'+safe(statusText(board))+' · '+(board.members||[]).length+' participant'+((board.members||[]).length===1?'':'s')+'</small><h3>'+safe(board.title)+'</h3><p>'+safe(progressCopy(board,mine))+'</p><i><em style="width:'+percent+'%"></em></i></div><b aria-label="Rank">'+(mine?'#'+number(mine.rank):'→')+'</b></button>';
 }
 function listHTML(){
  var active=boards.filter(function(board){return board.status==='active'||board.status==='upcoming'}),past=boards.filter(function(board){return board.status!=='active'&&board.status!=='upcoming'});
  return header('Challenges','Build momentum with coworkers and friends.')+'<main class="challengeListV78"><section class="challengeHeroV78"><div><p>MOVE TOGETHER</p><h3>A little friendly competition goes a long way.</h3><span>Invite-only boards. No health history shared.</span></div><span aria-hidden="true">🏆</span></section><div class="challengePrimaryActionsV78"><button type="button" class="primary" data-challenge-view="create">Create challenge</button><button type="button" data-challenge-view="join">Join with code</button></div>'+(active.length?'<section class="challengeSectionV78"><header><h3>Your boards</h3><span>'+active.length+' active</span></header>'+active.map(boardCard).join('')+'</section>':emptyHTML())+(past.length?'<details class="challengePastV78"><summary>Past challenges ('+past.length+')</summary>'+past.map(boardCard).join('')+'</details>':'')+privacyNote()+'</main>';
 }
 function metricChoices(){return Object.entries(METRICS).map(function(entry,index){var key=entry[0],item=entry[1];return '<label class="challengeMetricChoiceV78"><input type="radio" name="challengeMetricV78" value="'+key+'" '+(index===0?'checked':'')+'><span aria-hidden="true">'+item.icon+'</span><b>'+item.label+'</b></label>'}).join('')}
 function createHTML(){var start=today(),end=plusDays(start,13),name=displayName();return header('Create a challenge','One goal. One private board.','list')+'<form id="challengeCreateV78" class="challengeFormV78"><fieldset><legend>What will you track?</legend><div class="challengeMetricChoicesV78">'+metricChoices()+'</div></fieldset><label>Challenge name<input name="title" maxlength="60" value="12,000 steps" required></label><div class="challengeGoalRowV78"><label>Goal<input name="targetValue" type="number" min="1" max="100000000" step="1" value="12000" required></label><label>How it counts<select name="cadence"><option value="daily">Each day</option><option value="total">Total by the end</option></select></label></div><label class="challengeCustomUnitV78" hidden>Unit<input name="unitLabel" maxlength="24" value="points" placeholder="points, miles, servings"></label><div class="challengeGoalRowV78"><label>Starts<input name="startsOn" type="date" value="'+start+'" required></label><label>Ends<input name="endsOn" type="date" value="'+end+'" required></label></div><label>Your board name<input name="displayName" maxlength="30" value="'+safe(name)+'" placeholder="How coworkers will see you" required></label><div class="challengeShareNoticeV78"><b>Shared on this board</b><p>Your chosen name and score only—not your email or health details.</p></div><button type="submit" class="primary">Create &amp; get invite link</button>'+privacyNote()+'</form>'}
 function joinHTML(){var name=displayName(),query=new URLSearchParams(location.search).get('challenge')||'';return header('Join a challenge','Use the private code a teammate shared.','list')+'<form id="challengeJoinV78" class="challengeFormV78"><div class="challengeJoinMarkV78" aria-hidden="true">↗</div><label>Invite code<input name="inviteCode" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="9" value="'+safe(prettyCode(query))+'" placeholder="ABCD-EFGH" required></label><label>Your board name<input name="displayName" maxlength="30" value="'+safe(name)+'" placeholder="How coworkers will see you" required></label><div class="challengeShareNoticeV78"><b>Before you join</b><p>People on this board will see this name and your score. Nothing else from your account is shared.</p></div><button type="submit" class="primary">Join &amp; share my score</button>'+privacyNote()+'</form>'}
 function participantRow(board,member){var pct=Math.max(0,Math.min(100,Number(member.progressPercent)||0));return '<li class="challengePersonV78 '+(member.isYou?'isYou':'')+'"><b>'+number(member.rank)+'</b><span class="challengeAvatarV78">'+safe((member.displayName||'?').slice(0,1).toUpperCase())+'</span><div><h4>'+safe(member.displayName)+(member.isYou?' <small>YOU</small>':'')+'</h4><p>'+safe(progressCopy(board,member))+'</p><i><em style="width:'+pct+'%"></em></i></div><strong>'+number(board.cadence==='daily'?member.daysCompleted:member.totalValue)+'</strong></li>'}
 function boardHTML(board){
  if(!board)return listHTML();var info=metric(board),mine=me(board),active=board.status==='active';
  var goal=board.cadence==='daily'?number(board.targetValue)+' '+board.unitLabel+' each day':number(board.targetValue)+' '+board.unitLabel+' total';
  var entry=(board.metric==='calories_burned'||board.metric==='custom')&&active?'<form id="challengeScoreV78" class="challengeScoreV78"><label>Today\'s '+safe(board.unitLabel)+'<input name="value" type="number" min="0" max="100000000" step="0.01" value="'+safe(mine?.todayValue||'')+'" placeholder="0" required></label><button type="submit" class="primary">Update score</button></form>':active?'<button type="button" class="challengeSyncV78" data-challenge-sync>Sync today\'s '+safe(info.label.toLowerCase())+'</button>':'';
  return header(board.title,goal,'list')+'<main class="challengeBoardV78"><section class="challengeBoardHeroV78"><div class="challengeBoardIconV78">'+info.icon+'</div><div><span>'+safe(statusText(board))+'</span><h3>'+safe(goal)+'</h3><p>'+dateLabel(board.startsOn)+' – '+dateLabel(board.endsOn)+'</p></div><button type="button" data-challenge-share aria-label="Share invite">Share</button></section><section class="challengeYourProgressV78"><span>Your progress</span><b>'+(mine?'#'+number(mine.rank):'—')+'</b><strong>'+safe(progressCopy(board,mine))+'</strong><i><em style="width:'+Math.max(0,Math.min(100,Number(mine?.progressPercent)||0))+'%"></em></i></section>'+entry+'<section class="challengeLeaderboardV78"><header><h3>Leaderboard</h3><span>'+(board.members||[]).length+' participant'+((board.members||[]).length===1?'':'s')+'</span></header><ol>'+(board.members||[]).map(function(member){return participantRow(board,member)}).join('')+'</ol></section><section class="challengeInviteV78"><div><span>INVITE CODE</span><b>'+safe(prettyCode(board.inviteCode))+'</b></div><button type="button" data-challenge-share>Invite people</button></section><details class="challengeOptionsV78"><summary>Challenge options</summary><p>Leaving removes your name and scores from this board immediately.</p><button type="button" class="danger" data-challenge-'+(board.isOwner?'archive':'leave')+'>'+(board.isOwner?'End challenge':'Leave challenge')+'</button></details>'+privacyNote()+'</main>';
 }
 function shellHTML(content){return '<button type="button" class="challengeBackdropV78" data-challenge-close aria-label="Close challenges"></button><section class="challengeSheetV78" tabindex="-1">'+content+'<p id="challengeStatusV78" class="challengeStatusV78" role="status" aria-live="polite"></p></section>'}
 function render(){
  var modal=root();if(!modal)return;
  var content=!A.session?.access_token?signedOutHTML():view==='create'?createHTML():view==='join'?joinHTML():view==='board'?boardHTML(boards.find(function(board){return board.id===selectedId})):listHTML();
  modal.innerHTML=shellHTML(content);bindCurrent();
 }
 async function load(options){
  if(!A.session?.access_token){boards=[];render();return}
  if(!options?.quiet)setStatus('Refreshing board…');
  try{var result=await api({method:'GET'});boards=result.boards||[];render();if(options?.sync!==false)await syncAutomatic()}
  catch(error){render();setStatus(error.message||'Could not load challenges.',true)}
 }
 function automaticValue(board){
  if(board.metric==='steps'){var day=typeof healthDay==='function'?healthDay(today()):{};return Object.prototype.hasOwnProperty.call(day||{},'steps')?Math.max(0,Math.round(Number(day.steps)||0)):null}
  if(board.metric==='workouts'){var history=typeof workoutHistory==='function'?workoutHistory():[];return history.filter(function(session){return session?.completed&&session.date===today()}).length}
  return null;
 }
 async function syncAutomatic(one,announce){
  if(syncing||!A.session?.access_token)return;syncing=true;
  try{
   var candidates=one?[one]:boards;
   for(var board of candidates){
    if(board.status!=='active'||(board.metric!=='steps'&&board.metric!=='workouts'))continue;
    var value=automaticValue(board),mineNow=me(board);if(value==null||Number(mineNow?.todayValue)===value)continue;
    var result=await api({method:'POST',body:JSON.stringify({action:'score',challengeId:board.id,metric:board.metric,date:today(),value:value,source:board.metric})});boards=result.boards||boards;
   }
   render();if(announce)window.toast?.('Challenge score updated');
  }catch(error){setStatus(error.message||'Could not sync today\'s score.',true)}finally{syncing=false}
 }
 async function submitCreate(form){
  var data=new FormData(form),metricName=String(data.get('challengeMetricV78')||'steps');
  return mutate({action:'create',title:data.get('title'),metric:metricName,unitLabel:data.get('unitLabel'),targetValue:Number(data.get('targetValue')),cadence:data.get('cadence'),startsOn:data.get('startsOn'),endsOn:data.get('endsOn'),displayName:data.get('displayName'),sharingConfirmed:true},function(result){selectedId=result.challengeId||null;view=selectedId?'board':'list'});
 }
 async function submitJoin(form){var data=new FormData(form);return mutate({action:'join',inviteCode:data.get('inviteCode'),displayName:data.get('displayName'),sharingConfirmed:true},function(result){var code=String(data.get('inviteCode')||'').replace(/[^A-Z2-9]/gi,'').toUpperCase();var board=(result.boards||[]).find(function(item){return item.inviteCode===code});selectedId=board?.id||null;view=selectedId?'board':'list';clearChallengeQuery()})}
 async function submitScore(form){var board=boards.find(function(item){return item.id===selectedId}),data=new FormData(form);if(!board)return;return mutate({action:'score',challengeId:board.id,metric:board.metric,date:today(),value:Number(data.get('value')),source:board.metric==='calories_burned'?'calories':'manual'})}
 async function mutate(body,after){
  if(busy)return;busy=true;root()?.classList.add('busy');setStatus('Saving…');
  try{var result=await api({method:'POST',body:JSON.stringify({...body,localDate:today()})});boards=result.boards||boards;after?.(result);render();await syncAutomatic();return result}
  catch(error){setStatus(error.message||'Could not update the challenge.',true)}finally{busy=false;root()?.classList.remove('busy')}
 }
 function clearChallengeQuery(){try{var url=new URL(location.href);url.searchParams.delete('challenge');history.replaceState(null,'',url.pathname+url.search+url.hash)}catch{}}
 async function shareBoard(){
  var board=boards.find(function(item){return item.id===selectedId});if(!board)return;
  var url=new URL('/work-gym-planner/','https://www.workandworkout.com');url.searchParams.set('challenge',board.inviteCode);
  var text='Join “'+board.title+'” on Work + Workout. Invite code: '+prettyCode(board.inviteCode);
  try{if(navigator.share)await navigator.share({title:board.title,text:text,url:url.href});else{await navigator.clipboard.writeText(text+' '+url.href);window.toast?.('Invite link copied')}}catch(error){if(error?.name!=='AbortError')setStatus('Could not share. Copy the invite code instead.',true)}
 }
 function updateMetricForm(form){var selected=form.elements.challengeMetricV78?.value||'steps',item=METRICS[selected];form.elements.title.value=item.title;form.elements.targetValue.value=item.suggested;var unit=form.querySelector('.challengeCustomUnitV78');if(unit)unit.hidden=selected!=='custom'}
 function bindCurrent(){
  var modal=root();if(!modal)return;
  modal.querySelectorAll('[data-challenge-close]').forEach(function(button){button.onclick=closeChallenges});
  modal.querySelectorAll('[data-challenge-view]').forEach(function(button){button.onclick=function(){view=button.dataset.challengeView;render()}});
  modal.querySelectorAll('[data-challenge-board]').forEach(function(button){button.onclick=function(){selectedId=button.dataset.challengeBoard;view='board';render()}});
  modal.querySelector('[data-challenge-signin]')?.addEventListener('click',function(){reopenAfterAuth=true;closeChallenges();A.openAccount?.('signin')});
  var createForm=modal.querySelector('#challengeCreateV78');if(createForm){createForm.onchange=function(event){if(event.target.name==='challengeMetricV78')updateMetricForm(createForm)};createForm.onsubmit=function(event){event.preventDefault();submitCreate(createForm)}}
  var joinForm=modal.querySelector('#challengeJoinV78');if(joinForm){joinForm.elements.inviteCode.oninput=function(){var code=this.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,8);this.value=code.length>4?code.slice(0,4)+'-'+code.slice(4):code};joinForm.onsubmit=function(event){event.preventDefault();submitJoin(joinForm)}}
  var scoreForm=modal.querySelector('#challengeScoreV78');if(scoreForm)scoreForm.onsubmit=function(event){event.preventDefault();submitScore(scoreForm)};
  modal.querySelectorAll('[data-challenge-share]').forEach(function(button){button.onclick=shareBoard});
  modal.querySelector('[data-challenge-sync]')?.addEventListener('click',async function(){var board=boards.find(function(item){return item.id===selectedId});if(board?.metric==='steps'&&typeof syncNativeSteps==='function')await syncNativeSteps({announce:false});await syncAutomatic(board,true)});
  modal.querySelector('[data-challenge-leave]')?.addEventListener('click',function(){if(confirm('Leave this challenge? Your name and scores will be removed from the board.'))mutate({action:'leave',challengeId:selectedId},function(){selectedId=null;view='list'})});
  modal.querySelector('[data-challenge-archive]')?.addEventListener('click',function(){if(confirm('End this challenge? The final board will stay visible to participants.'))mutate({action:'archive',challengeId:selectedId})});
 }
 function openChallenges(options){
  var modal=root();if(!modal)return;returnFocus=document.activeElement;
  var code=options?.inviteCode||new URLSearchParams(location.search).get('challenge');if(code)view='join';else if(view!=='board'&&view!=='create')view='list';
  modal.hidden=false;document.body.classList.add('challengeOpenV78');requestAnimationFrame(function(){modal.classList.add('open');modal.querySelector('.challengeSheetV78')?.focus()});
  startPolling();load();
 }
 function closeChallenges(){var modal=root();if(!modal||modal.hidden)return;modal.classList.remove('open');document.body.classList.remove('challengeOpenV78');stopPolling();setTimeout(function(){modal.hidden=true;returnFocus?.focus?.();returnFocus=null},180)}
 function startPolling(){stopPolling();pollTimer=setInterval(function(){if(!root()?.hidden&&document.visibilityState!=='hidden')load({quiet:true,sync:false})},30000)}
 function stopPolling(){if(pollTimer){clearInterval(pollTimer);pollTimer=null}}
 function addEntryPoint(){var cards=document.querySelector('#page-more .menuCards');if(cards&&!document.getElementById('openChallengesV78')){var button=document.createElement('button');button.type='button';button.id='openChallengesV78';button.className='challengeLaunchV78';button.innerHTML='<span aria-hidden="true">🏆</span><div><b>Challenges</b><small>Compete with coworkers and friends</small></div><i aria-hidden="true">›</i>';cards.appendChild(button)}}
 function mount(){if(!root()){var modal=document.createElement('div');modal.id=ID;modal.className='challengeDialogV78';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','challengeTitleV78');modal.hidden=true;document.body.appendChild(modal)}addEntryPoint();render();if(new URLSearchParams(location.search).get('challenge'))setTimeout(function(){openChallenges()},500)}
 document.addEventListener('click',function(event){if(event.target.closest('#openChallengesV78'))openChallenges()});
 document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!root()?.hidden)closeChallenges()});
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&!root()?.hidden)load({quiet:true})});
 window.addEventListener('wgp-native-resume',function(){if(!root()?.hidden)setTimeout(function(){syncAutomatic()},1500)});
 window.addEventListener('wgc:authchange',function(){if(reopenAfterAuth&&A.session?.access_token){reopenAfterAuth=false;setTimeout(function(){openChallenges()},200)}else if(!root()?.hidden)load()});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 new MutationObserver(addEntryPoint).observe(document.documentElement,{subtree:true,childList:true});
 window.WWChallenges={open:openChallenges,close:closeChallenges,refresh:load,metric:METRICS};
})(window);
