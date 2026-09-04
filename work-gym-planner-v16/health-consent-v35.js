// v35 explicit, granular health-data consent for cloud and AI features.
window.WGC18=window.WGC18||{};
(function(A){
 const CONSENT_VERSION='2026-08-31-v1';
 const POLICY_VERSION='1.6';
 const TERMS_VERSION='1.2';
 const AGREEMENT_STATEMENT='I agree to the Terms of Use and acknowledge the Privacy & Consumer Health Data Policy.';
 const LOCAL_PREFIX='wgc-health-consent-v35:';
 const STATEMENT='I agree to the selected uses of my health and wellness data. I can change my mind at any time.';
 const PURPOSES={
  account_cloud_sync:{title:'Sync across devices',question:'Turn on account backup?',allow:'Turn on backup',detail:'Save your planner privately to your Work + Workout account so you can restore it or use another device.'},
  encrypted_webdav_sync:{title:'Private backup service',question:'Use your private backup service?',allow:'Allow private backup',detail:'Send an encrypted planner backup to the private storage service you set up.'},
  personalized_ai:{title:'AI tools',question:'Turn on AI tools?',allow:'Turn on AI tools',detail:'Use AI Coach, Meal Scan and roster reading when you choose them. Only your selected question, photo and needed plan details are sent to OpenAI. Scan photos are not kept by Work + Workout.'},
  // Kept for receipts created by the earlier separate Meal Scan choice. New
  // choices use the single AI-tools purpose so users are not asked again for
  // every AI feature.
  meal_scan_ai:{title:'Meal Scan (previous choice)',question:'Turn on AI tools?',allow:'Turn on AI tools',detail:'Your earlier Meal Scan approval remains valid.'}
 };
 let receipt=null,loadedOwner=null,pending=null,requestedPurpose=null,showAllChoices=false,onboardingChoice=false,receiptRevision=0,refreshSequence=0,refreshTask=null;
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function owner(){return A.session?.user?.id||'device'}
 function key(){return LOCAL_PREFIX+owner()}
 function readLocal(){try{return JSON.parse(localStorage.getItem(key())||'null')}catch{return null}}
 function writeLocal(value){receipt=value||null;loadedOwner=owner();try{value?localStorage.setItem(key(),JSON.stringify(value)):localStorage.removeItem(key());return true}catch{return false}}
 function agreementCurrent(value=receipt){return !!value?.agreement?.acceptedAt&&value.agreement.termsVersion===TERMS_VERSION}
 function choicesSaved(value=receipt){return !!value&&value.consentVersion===CONSENT_VERSION&&['granted','withdrawn'].includes(value.action)}
 function active(purpose,value=receipt){return !!value&&value.action==='granted'&&value.consentVersion===CONSENT_VERSION&&Array.isArray(value.purposes)&&value.purposes.includes(purpose)}
 function activeFor(purpose,value=receipt){return purpose==='meal_scan_ai'?active('personalized_ai',value)||active('meal_scan_ai',value):active(purpose,value)}
 function activePurposes(){return Object.keys(PURPOSES).filter(purpose=>active(purpose))}
 function legalPage(file,hash=''){let url;try{url=typeof window.productPage==='function'?window.productPage(file):new URL(`./${file}`,location.href).href}catch{url=`./${file}`}return`${url}${hash}`}
 function localReceipt(action,purposes=[],termsConfirmed=false){return{action,consentVersion:CONSENT_VERSION,policyVersion:POLICY_VERSION,purposes,statement:STATEMENT,locale:navigator.language||null,region:'global',createdAt:new Date().toISOString(),agreement:termsConfirmed&&!agreementCurrent()?{termsVersion:TERMS_VERSION,privacyVersion:POLICY_VERSION,acceptedAt:new Date().toISOString(),statement:AGREEMENT_STATEMENT}:receipt?.agreement||null}}
 function refreshAccountUI(){A.renderAccountUI?.();window.dispatchEvent(new CustomEvent('wgc:health-consent-change',{detail:{activePurposes:activePurposes()}}))}
 async function refresh({render=true}={}){
  if(!A.session){writeLocal(readLocal());if(render)refreshAccountUI();return receipt}
  const uid=owner(),revision=receiptRevision;
  let task=refreshTask;
  // Startup and account loading can request the same receipt together. Both
  // must await its result, not mistake an in-flight newer read for no consent.
  if(!task||task.uid!==uid||task.revision!==revision){
   task={uid,revision,sequence:++refreshSequence};
   task.promise=(async()=>{
    const response=await A.authedFetch('health-consent');
    if(uid!==owner()||revision!==receiptRevision||task.sequence!==refreshSequence)return receipt;
    writeLocal(response.receipt||null);
    return receipt
   })().finally(()=>{if(refreshTask===task)refreshTask=null});
   refreshTask=task;
  }
  const value=await task.promise;
  if(render)refreshAccountUI();
  return value
 }
 async function record(action,purposes=[],{termsConfirmed=false}={}){
  let value;const uid=owner(),previous=receipt;receiptRevision++;
  if(A.session){
   const response=await A.authedFetch('health-consent',{method:'POST',body:JSON.stringify({action:action==='granted'?'grant':'withdraw',confirmed:action==='granted',purposes,consentVersion:CONSENT_VERSION,locale:navigator.language||null,termsConfirmed,termsVersion:TERMS_VERSION})});
   value=response.receipt
  }else value=localReceipt(action,purposes,termsConfirmed);
  if(uid!==owner())throw Error('Your account changed. Please review your choices again.');
  if(!value||!choicesSaved(value)||(termsConfirmed&&!agreementCurrent(value)))throw Error('Your saved choices were not confirmed. Please try again.');
  receiptRevision++;const stored=writeLocal(value);
  if(!A.session&&!stored){receipt=previous;throw Error('This device could not save your choices. Check your browser storage settings.')}
  refreshAccountUI();
  return value
 }
 function closeChoice(result=false,force=false){
  if(pending?.saving&&!force)return;
  closeModal('healthConsentDialog');
  requestedPurpose=null;
  showAllChoices=false;
  onboardingChoice=false;
  const choice=pending;
  pending=null;
  choice?.resolve(choice.onboarding?{cloudAllowed:result===true,deviceOnly:result==='device-only',completed:result===true||result==='device-only'}:result===true)
 }
 function updateAgree(){
  const confirmed=$('#healthConsentConfirm')?.checked;
  const button=$('#healthConsentAgree');
  if(button)button.disabled=!!pending?.saving||!confirmed;
  if(onboardingChoice){
   const cloudSelected=!!$('#healthConsentPurposes input[value="account_cloud_sync"]')?.checked;
   button.textContent=cloudSelected?'Agree & continue':'Agree & continue on device';
   $('#healthConsentDeviceNotice').hidden=cloudSelected;
  }
 }
 function renderDialog(purpose,{showAll=false,onboarding=false}={}){
  showAllChoices=showAll;
  onboardingChoice=onboarding;
  const activeNow=activePurposes();
  const entries=showAll?Object.entries(PURPOSES).filter(([id])=>id!=='meal_scan_ai'||active('meal_scan_ai')&&!active('personalized_ai')):[[purpose,PURPOSES[purpose]]];
  $('#healthConsentDialog .healthConsentSheet').classList.toggle('compactConsent',!showAll);
  $('#healthConsentDialog .healthConsentSheet').classList.toggle('onboardingConsent',onboarding);
  $('#healthConsentTitle').textContent=showAll?'Your privacy choices':PURPOSES[purpose].question;
  $('#healthConsentEyebrow').textContent=showAll?'Optional features':'Your choice';
  $('#healthConsentIntroTitle').textContent=showAll?'Choose only what you want.':purpose==='personalized_ai'?'One choice for the AI tools you use.':'You are in control.';
  $('#healthConsentIntroCopy').textContent=showAll?'Your planner still works if you leave everything off. You can change these choices later.':'This is optional. Choose Not now to keep using the planner without it.';
  $('#healthConsentConfirmText').innerHTML=`I agree to the <a href="${esc(legalPage('terms.html'))}" target="_blank" rel="noopener noreferrer">Terms of Use</a> and acknowledge the <a href="${esc(legalPage('privacy.html'))}" target="_blank" rel="noopener noreferrer">Privacy &amp; Consumer Health Data Policy</a>.`;
  $('#healthConsentOptionalStatement').textContent=STATEMENT+' Leave a switch off if you do not want that use.';
  $('#healthConsentAgree').textContent=showAll?'Save my choices':PURPOSES[purpose].allow;
  $('#healthConsentLocal').textContent=onboarding?'Back':'Cancel';
  $('#healthConsentLocal').disabled=false;
  $('#healthConsentDeviceNotice').hidden=true;
  if(onboarding){
   $('#healthConsentTitle').textContent='Terms & privacy';
   $('#healthConsentEyebrow').textContent='WELCOME TO WORK + WORKOUT';
   $('#healthConsentIntroTitle').textContent='One quick step, then you are ready.';
   $('#healthConsentIntroCopy').textContent='Agree to the terms and choose any optional features below. We remember both on and off choices, so you will not be asked every time you open the app or use a tool.';
  }
  const card=([id,item])=>{
   const already=activeNow.includes(id),requested=id===purpose;
   if(!showAll)return`<div class="healthPurpose requested"><span><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></span></div>`;
   return`<label class="healthPurpose ${already?'active':''}"><input type="checkbox" value="${id}" ${already?'checked':''}><span><b>${esc(item.title)}</b><small>I allow this optional use. ${esc(item.detail)}</small></span></label>`
  };
  $('#healthConsentPurposes').innerHTML=onboarding?entries.filter(([id])=>id!=='encrypted_webdav_sync').map(card).join('')+'<details class="healthConsentMore"><summary>Other backup options</summary>'+card(['encrypted_webdav_sync',PURPOSES.encrypted_webdav_sync])+'</details>':entries.map(card).join('');
  $('#healthConsentConfirm').checked=agreementCurrent();
  $('#healthConsentTerms').hidden=agreementCurrent();
  $('#healthConsentSavedAgreement').hidden=!agreementCurrent();
  $('#healthConsentConfirm').disabled=false;
  $('#healthConsentStatus').textContent=choicesSaved()?'Your saved choices are shown. Change only what you want.':'';
  $('#healthConsentStatus').classList.remove('bad');
  $('#healthConsentPurposes').querySelectorAll('input').forEach(input=>input.onchange=updateAgree);
  $('#healthConsentConfirm').onchange=updateAgree;
  updateAgree()
 }
 function openChoice(purpose,{showAll=false,onboarding=false}={}){
  inject();
  requestedPurpose=PURPOSES[purpose]?purpose:'account_cloud_sync';
  renderDialog(requestedPurpose,{showAll,onboarding});
  openModal('healthConsentDialog');
  const promise=new Promise(resolve=>{pending={resolve,onboarding}});
  pending.promise=promise;
  return promise
 }
 // First sign-in offers the feature choices together, before any planner read
 // or setup. A dismissal is not permission to treat a saved account as empty.
 async function reviewForOnboarding(){
  if(pending){const choice=pending,result=await choice.promise;return choice.onboarding?result:{cloudAllowed:active('account_cloud_sync'),deviceOnly:false}}
  const uid=owner();
  if(A.session){
   if(loadedOwner!==uid)writeLocal(readLocal());
   try{await refresh({render:false})}catch(error){if(uid===owner()&&agreementCurrent()&&choicesSaved())return{cloudAllowed:false,deviceOnly:true,completed:true,offline:true};throw error}
  }else writeLocal(readLocal());
  if(uid!==owner())return{cloudAllowed:false,deviceOnly:false};
  if(agreementCurrent()&&choicesSaved())return{cloudAllowed:active('account_cloud_sync'),deviceOnly:!active('account_cloud_sync'),completed:true};
  if(pending){const choice=pending,result=await choice.promise;return choice.onboarding?result:{cloudAllowed:active('account_cloud_sync'),deviceOnly:false}}
  return openChoice('account_cloud_sync',{showAll:true,onboarding:true})
 }
 async function ensure({interactive=false,purpose='account_cloud_sync',force=false}={}){
  if(!PURPOSES[purpose])throw Error('Unknown health-data consent purpose.');
  if(loadedOwner!==owner()){
   receipt=readLocal();loadedOwner=owner();
   if(A.session){try{await refresh({render:false})}catch(error){if(!interactive)throw error;toast('Reconnect to check your saved choices.');return false}}
  }
  if(activeFor(purpose)&&!force)return true;
  if(!interactive)return false;
  if(pending){await pending.promise;return activeFor(purpose)}
  // An off choice is a decision, not a missing form. Only the user's explicit
  // Manage action may reopen the choices after onboarding is complete.
  if(choicesSaved()&&!force){toast(`${PURPOSES[purpose==='meal_scan_ai'?'personalized_ai':purpose].title} is off. Change it in Profile → Account & privacy.`);return false}
  if(force)return openChoice('account_cloud_sync',{showAll:true});
  await reviewForOnboarding();return activeFor(purpose)
 }
 async function withdraw(){
  if(!activePurposes().length)return true;
  if(!confirm('Turn off these optional features? Cloud backup, private backup and AI tools will stop. Your on-device planner will keep working. This does not delete anything already saved online.'))return false;
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
  $('#manageHealthConsent')?.addEventListener('click',async()=>{const allowed=await ensure({interactive:true,purpose:'account_cloud_sync',force:true});if(allowed&&A.session&&!A.cloudStateReady)await A.resumeAccount?.()});
  $('#withdrawHealthConsent')?.addEventListener('click',withdraw)
 }
 function inject(){
  if($('#healthConsentDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="healthConsentDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="healthConsentTitle"><div class="sheet largeSheet healthConsentSheet"><div class="sheetHandle"></div><div class="sheetHead"><div><small id="healthConsentEyebrow">Your choice</small><h2 id="healthConsentTitle">Privacy choice</h2></div></div><div class="healthConsentBody"><div class="healthConsentIntro"><b id="healthConsentIntroTitle">You are in control.</b><p id="healthConsentIntroCopy">Choose only what you want to use.</p></div><label id="healthConsentTerms" class="healthConsentConfirm"><input id="healthConsentConfirm" type="checkbox"><span id="healthConsentConfirmText">${esc(AGREEMENT_STATEMENT)}</span></label><p id="healthConsentSavedAgreement" class="healthConsentLegal" hidden>Terms accepted. Your acknowledgment is saved.</p><h3 class="healthConsentOptionalTitle">Optional features · your choice</h3><p id="healthConsentOptionalStatement" class="healthConsentLegal">${esc(STATEMENT)}</p><div id="healthConsentPurposes" class="healthConsentPurposes"></div><p class="healthConsentLegal">Your choices stay saved until you change them. Find them in Profile → Account &amp; privacy. <a href="${esc(legalPage('privacy.html'))}" target="_blank" rel="noopener noreferrer">Privacy policy</a> · <a href="${esc(legalPage('privacy.html','#health'))}" target="_blank" rel="noopener noreferrer">Health data</a> · <a href="${esc(legalPage('terms.html'))}" target="_blank" rel="noopener noreferrer">Terms of use</a></p><p id="healthConsentDeviceNotice" class="healthConsentLegal" hidden>With cloud backup off, your plan stays on this device. Any saved online plan is left unchanged.</p><p id="healthConsentStatus" class="statusText" aria-live="polite"></p></div><div class="sheetActions healthConsentActions"><button id="healthConsentLocal">Back</button><button id="healthConsentAgree" class="primary" disabled>Continue</button></div></div></div>`);
  $('#healthConsentLocal').onclick=()=>closeChoice(false);
  $('#healthConsentAgree').onclick=async()=>{
   const choice=pending;if(!choice||choice.saving)return;
   const selected=showAllChoices?[...document.querySelectorAll('#healthConsentPurposes input[type="checkbox"]:checked')].map(input=>input.value):[...new Set([...activePurposes(),requestedPurpose])];
   if(!$('#healthConsentConfirm').checked)return;
   const button=$('#healthConsentAgree');choice.saving=true;button.disabled=true;$('#healthConsentLocal').disabled=true;$('#healthConsentConfirm').disabled=true;
   $('#healthConsentPurposes').querySelectorAll('input').forEach(input=>input.disabled=true);
   $('#healthConsentStatus').textContent='Saving your choices…';
   try{await record(selected.length?'granted':'withdrawn',selected,{termsConfirmed:!agreementCurrent()});if(pending!==choice)return;choice.saving=false;const requestedWasGranted=activeFor(requestedPurpose);closeChoice(choice.onboarding&&!requestedWasGranted?'device-only':requestedWasGranted);toast('Your choices are saved. You will not be asked each time.')}catch(error){if(pending!==choice)return;choice.saving=false;$('#healthConsentLocal').disabled=false;$('#healthConsentConfirm').disabled=false;$('#healthConsentPurposes').querySelectorAll('input').forEach(input=>input.disabled=false);$('#healthConsentStatus').textContent='We could not save your choice. Please try again.';$('#healthConsentStatus').classList.add('bad');window.WWObservability?.capture?.('health_consent_save',error,{name:'HealthConsentSaveError',message:'Consent choice could not be saved'});updateAgree()}
  };
  $('#healthConsentDialog').addEventListener('click',event=>{if(event.target.id==='healthConsentDialog'){event.stopImmediatePropagation();closeChoice(false)}},true)
 }
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#healthConsentDialog')?.classList.contains('open')){event.preventDefault();event.stopImmediatePropagation();closeChoice(false)}},true);
 window.addEventListener('wgc:authchange',()=>{
  if(loadedOwner===owner())return; // Refreshing a token is not a different account.
  receiptRevision++;receipt=null;loadedOwner=null;
  if(pending)closeChoice(false,true);
  setTimeout(()=>refresh().catch(()=>refreshAccountUI()),0)
 });
 A.healthConsentVersion=CONSENT_VERSION;
 A.hasAppAgreement=agreementCurrent;
 A.ensureHealthConsent=ensure;
 A.reviewPrivacyForOnboarding=reviewForOnboarding;
 A.ensureHealthConsentForCloud=options=>ensure({...options,purpose:options?.purpose||'account_cloud_sync'});
 A.hasHealthConsent=activeFor;
 A.refreshHealthConsent=refresh;
 A.withdrawHealthConsent=withdraw;
 A.healthConsentPanelHTML=panelHTML;
 A.bindHealthConsentPanel=bindPanel;
 const authenticatedFetch=A.authedFetch.bind(A);
 A.authedFetch=async function(path,options={},retry=true){
  const requestOwner=A.session?.user?.id;
  const healthPurpose=path==='coach'||path==='onboarding'?'personalized_ai':null;
  if(healthPurpose&&!await ensure({interactive:true,purpose:healthPurpose}))throw Error('Personalized AI remains off. Your local plan is still available.');
  if(A.session?.user?.id!==requestOwner)throw Error('Your account changed. Please try again.');
  try{return await authenticatedFetch(path,options,retry)}catch(error){
   if(error.code==='HEALTH_CONSENT_REQUIRED'){
    try{await refresh({render:false})}catch{writeLocal(receipt?{...receipt,action:'withdrawn',purposes:[]}:null)}
    refreshAccountUI()
   }
   throw error
  }
 };
 window.addEventListener('storage',event=>{
  if(event.key!==key())return;
  receiptRevision++;writeLocal(readLocal());
  if(pending&&!pending.saving&&agreementCurrent()&&choicesSaved())closeChoice(active('account_cloud_sync')?true:'device-only',true);
  refreshAccountUI();
 });
 inject();
 receipt=readLocal();loadedOwner=owner();
 setTimeout(()=>{A.session?refresh().catch(()=>refreshAccountUI()):refreshAccountUI()},0)
})(window.WGC18);
