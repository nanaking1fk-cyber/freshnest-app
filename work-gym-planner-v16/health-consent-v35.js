// v35 explicit, granular health-data consent for cloud and AI features.
window.WGC18=window.WGC18||{};
(function(A){
 const CONSENT_VERSION='2026-08-31-v1';
 const POLICY_VERSION='1.5';
 const LOCAL_PREFIX='wgc-health-consent-v35:';
 const STATEMENT='I agree to the selected uses of my health and wellness data. I can change my mind at any time.';
 const PURPOSES={
  account_cloud_sync:{title:'Sync across devices',question:'Turn on account backup?',allow:'Turn on backup',detail:'Save your planner privately to your Work + Workout account so you can restore it or use another device.'},
  encrypted_webdav_sync:{title:'Private backup service',question:'Use your private backup service?',allow:'Allow private backup',detail:'Send an encrypted planner backup to the private storage service you set up.'},
  personalized_ai:{title:'Personalized AI help',question:'Use personalized AI help?',allow:'Allow AI help',detail:'Share only the parts of your plan needed to answer your question when you use an AI feature.'},
  meal_scan_ai:{title:'Meal Scan',question:'Use Meal Scan?',allow:'Allow Meal Scan',detail:'Send only the meal photo you choose to our AI service to estimate foods and portions. We do not keep the photo.'}
 };
 let receipt=null,loadedOwner=null,pending=null,requestedPurpose=null,showAllChoices=false;
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function owner(){return A.session?.user?.id||'device'}
 function key(){return LOCAL_PREFIX+owner()}
 function readLocal(){try{return JSON.parse(localStorage.getItem(key())||'null')}catch{return null}}
 function writeLocal(value){receipt=value||null;loadedOwner=owner();try{value?localStorage.setItem(key(),JSON.stringify(value)):localStorage.removeItem(key())}catch{}}
 function active(purpose,value=receipt){return !!value&&value.action==='granted'&&value.consentVersion===CONSENT_VERSION&&Array.isArray(value.purposes)&&value.purposes.includes(purpose)}
 function activePurposes(){return Object.keys(PURPOSES).filter(purpose=>active(purpose))}
 function legalPage(file,hash=''){let url;try{url=typeof window.productPage==='function'?window.productPage(file):new URL(`./${file}`,location.href).href}catch{url=`./${file}`}return`${url}${hash}`}
 function localReceipt(action,purposes=[]){return{action,consentVersion:CONSENT_VERSION,policyVersion:POLICY_VERSION,purposes,statement:STATEMENT,locale:navigator.language||null,region:'global',createdAt:new Date().toISOString()}}
 function refreshAccountUI(){A.renderAccountUI?.();window.dispatchEvent(new CustomEvent('wgc:health-consent-change',{detail:{activePurposes:activePurposes()}}))}
 async function refresh({render=true}={}){
  if(!A.session){writeLocal(readLocal());if(render)refreshAccountUI();return receipt}
  const response=await A.authedFetch('health-consent');
  writeLocal(response.receipt||null);
  if(render)refreshAccountUI();
  return receipt
 }
 async function record(action,purposes=[]){
  let value;
  if(A.session){
   const response=await A.authedFetch('health-consent',{method:'POST',body:JSON.stringify({action:action==='granted'?'grant':'withdraw',confirmed:action==='granted',purposes,consentVersion:CONSENT_VERSION,locale:navigator.language||null})});
   value=response.receipt
  }else value=localReceipt(action,purposes);
  writeLocal(value);
  refreshAccountUI();
  return value
 }
 function closeChoice(result=false){
  closeModal('healthConsentDialog');
  requestedPurpose=null;
  showAllChoices=false;
  const resolve=pending?.resolve;
  pending=null;
  resolve?.(result)
 }
 function updateAgree(){
  const selected=showAllChoices?[...document.querySelectorAll('#healthConsentPurposes input[type="checkbox"]:checked')].length:1;
  const confirmed=$('#healthConsentConfirm')?.checked;
  const button=$('#healthConsentAgree');
  if(button)button.disabled=!(selected&&confirmed)
 }
 function renderDialog(purpose,{showAll=false}={}){
  showAllChoices=showAll;
  const activeNow=activePurposes();
  const entries=showAll?Object.entries(PURPOSES):[[purpose,PURPOSES[purpose]]];
  $('#healthConsentDialog .healthConsentSheet').classList.toggle('compactConsent',!showAll);
  $('#healthConsentTitle').textContent=showAll?'Your privacy choices':PURPOSES[purpose].question;
  $('#healthConsentEyebrow').textContent=showAll?'Optional features':'Your choice';
  $('#healthConsentIntroTitle').textContent=showAll?'Choose only what you want.':purpose==='meal_scan_ai'?'Your photo is used only for this scan.':'You are in control.';
  $('#healthConsentIntroCopy').textContent=showAll?'Your planner still works if you leave everything off. You can change these choices later.':'This is optional. Choose Not now to keep using the planner without it.';
  $('#healthConsentConfirmText').textContent=showAll?STATEMENT:`I agree to use ${PURPOSES[purpose].title}. I can turn it off later.`;
  $('#healthConsentAgree').textContent=showAll?'Save my choices':PURPOSES[purpose].allow;
  $('#healthConsentPurposes').innerHTML=entries.map(([id,item])=>{
   const already=activeNow.includes(id),requested=id===purpose;
   if(!showAll)return`<div class="healthPurpose requested"><span><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></span></div>`;
   return`<label class="healthPurpose ${requested?'requested':''} ${already?'active':''}"><input type="checkbox" value="${id}" ${already?'checked disabled':''}><span><b>${esc(item.title)}${already?' · On':''}</b><small>${esc(item.detail)}</small></span></label>`
  }).join('');
  $('#healthConsentConfirm').checked=false;
  $('#healthConsentStatus').textContent=showAll&&activeNow.length?'Your current choices stay on. Select anything else you want to allow.':'';
  $('#healthConsentStatus').classList.remove('bad');
  $('#healthConsentPurposes').querySelectorAll('input').forEach(input=>input.onchange=updateAgree);
  $('#healthConsentConfirm').onchange=updateAgree;
  updateAgree()
 }
 function openChoice(purpose,{showAll=false}={}){
  inject();
  requestedPurpose=PURPOSES[purpose]?purpose:'account_cloud_sync';
  renderDialog(requestedPurpose,{showAll});
  openModal('healthConsentDialog');
  const promise=new Promise(resolve=>{pending={resolve}});
  pending.promise=promise;
  return promise
 }
 async function ensure({interactive=false,purpose='account_cloud_sync',force=false}={}){
  if(!PURPOSES[purpose])throw Error('Unknown health-data consent purpose.');
  if(loadedOwner!==owner()){
   receipt=readLocal();loadedOwner=owner();
   if(A.session){try{await refresh({render:false})}catch(error){if(!interactive)throw error}}
  }
  if(active(purpose)&&!force)return true;
  if(!interactive)return false;
  if(pending)return pending.promise;
  return openChoice(purpose,{showAll:force})
 }
 async function withdraw(){
  if(!activePurposes().length)return true;
  if(!confirm('Turn off these optional features? Cloud backup, private backup, AI help and Meal Scan will stop. Your on-device planner will keep working. This does not delete anything already saved online.'))return false;
  try{
   await record('withdrawn',[]);
   toast('Optional features turned off. Local planning still works.');
   return true
  }catch(error){
   const status=$('#accountStatus');if(status){status.textContent='We could not update your choices. Please try again.';status.classList.add('bad')}
   window.WWObservability?.capture?.('health_consent_withdraw',error,{name:'HealthConsentWithdrawError',message:'Consent choices could not be withdrawn'});
   return false
  }
 }
 function panelHTML(){
  const activeNow=activePurposes(),on=activeNow.length>0;
  const labels=activeNow.map(id=>PURPOSES[id].title.replace('Private ','')).join(' · ');
  return`<div id="healthConsentPanel" class="healthConsentPanel ${on?'on':'local'}"><div><b>${on?'Privacy choices':'On-device only'}</b><small>${on?esc(labels):'Cloud backup and AI features stay off until you choose them.'}</small></div><button id="manageHealthConsent">${on?'Manage':'Review choices'}</button>${on?'<button id="withdrawHealthConsent" class="danger">Turn off all</button>':''}<a href="${esc(legalPage('privacy.html','#health'))}" target="_blank" rel="noopener noreferrer">Privacy &amp; health data</a></div>`
 }
 function bindPanel(){
  $('#manageHealthConsent')?.addEventListener('click',()=>ensure({interactive:true,purpose:'account_cloud_sync',force:true}));
  $('#withdrawHealthConsent')?.addEventListener('click',withdraw)
 }
 function inject(){
  if($('#healthConsentDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="healthConsentDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="healthConsentTitle"><div class="sheet largeSheet healthConsentSheet"><div class="sheetHandle"></div><div class="sheetHead"><div><small id="healthConsentEyebrow">Your choice</small><h2 id="healthConsentTitle">Privacy choice</h2></div></div><div class="healthConsentIntro"><b id="healthConsentIntroTitle">You are in control.</b><p id="healthConsentIntroCopy">Choose only what you want to use.</p></div><div id="healthConsentPurposes" class="healthConsentPurposes"></div><label class="healthConsentConfirm"><input id="healthConsentConfirm" type="checkbox"><span id="healthConsentConfirmText">${esc(STATEMENT)}</span></label><p class="healthConsentLegal">You can change this anytime in Account &amp; sync. <a href="${esc(legalPage('privacy.html','#health'))}" target="_blank" rel="noopener noreferrer">Privacy &amp; health data</a></p><p id="healthConsentStatus" class="statusText" aria-live="polite"></p><div class="sheetActions healthConsentActions"><button id="healthConsentLocal">Not now</button><button id="healthConsentAgree" class="primary" disabled>Continue</button></div></div></div>`);
  $('#healthConsentLocal').onclick=()=>closeChoice(false);
  $('#healthConsentAgree').onclick=async()=>{
   const selected=showAllChoices?[...document.querySelectorAll('#healthConsentPurposes input[type="checkbox"]:checked')].map(input=>input.value):[...new Set([...activePurposes(),requestedPurpose])];
   if(!selected.length||!$('#healthConsentConfirm').checked)return;
   const button=$('#healthConsentAgree');button.disabled=true;
   $('#healthConsentStatus').textContent='Saving your choices…';
   try{await record('granted',selected);const requestedWasGranted=selected.includes(requestedPurpose);closeChoice(requestedWasGranted);toast('Your choice was saved.')}catch(error){$('#healthConsentStatus').textContent='We could not save your choice. Please try again.';$('#healthConsentStatus').classList.add('bad');window.WWObservability?.capture?.('health_consent_save',error,{name:'HealthConsentSaveError',message:'Consent choice could not be saved'});updateAgree()}
  };
  $('#healthConsentDialog').addEventListener('click',event=>{if(event.target.id==='healthConsentDialog')closeChoice(false)})
 }
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#healthConsentDialog')?.classList.contains('open'))closeChoice(false)},true);
 window.addEventListener('wgc:authchange',()=>{receipt=null;loadedOwner=null;setTimeout(()=>refresh().catch(()=>refreshAccountUI()),0)});
 A.healthConsentVersion=CONSENT_VERSION;
 A.ensureHealthConsent=ensure;
 A.ensureHealthConsentForCloud=options=>ensure({...options,purpose:options?.purpose||'account_cloud_sync'});
 A.hasHealthConsent=active;
 A.refreshHealthConsent=refresh;
 A.withdrawHealthConsent=withdraw;
 A.healthConsentPanelHTML=panelHTML;
 A.bindHealthConsentPanel=bindPanel;
 const authenticatedFetch=A.authedFetch.bind(A);
 A.authedFetch=async function(path,options={},retry=true){
  const healthPurpose=path==='coach'||path==='onboarding'?'personalized_ai':null;
  if(healthPurpose&&!await ensure({interactive:true,purpose:healthPurpose}))throw Error('Personalized AI remains off. Your local plan is still available.');
  try{return await authenticatedFetch(path,options,retry)}catch(error){
   if(error.code==='HEALTH_CONSENT_REQUIRED'){writeLocal(null);refreshAccountUI()}
   throw error
  }
 };
 inject();
 receipt=readLocal();loadedOwner=owner();
 setTimeout(()=>{A.session?refresh().catch(()=>refreshAccountUI()):refreshAccountUI()},0)
})(window.WGC18);
