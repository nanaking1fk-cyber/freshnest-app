// v35 explicit, granular health-data consent for cloud and AI features.
window.WGC18=window.WGC18||{};
(function(A){
 const CONSENT_VERSION='2026-08-31-v1';
 const POLICY_VERSION='1.2';
 const LOCAL_PREFIX='wgc-health-consent-v35:';
 const STATEMENT='I explicitly consent to each selected use of my health and wellness data. I understand that I can withdraw consent at any time without affecting processing that was lawful before withdrawal.';
 const PURPOSES={
  account_cloud_sync:{title:'Private account cloud sync',detail:'Send planner, schedule, training, nutrition, body and recovery records through Vercel to your private Supabase account.'},
  encrypted_webdav_sync:{title:'Encrypted WebDAV sync',detail:'Send an AES-GCM encrypted planner backup directly to the HTTPS WebDAV provider you choose.'},
  personalized_ai:{title:'Personalized AI',detail:'Send your request and relevant schedule, training, nutrition, body and recovery context through Vercel to OpenAI for AI Coach or onboarding.'}
 };
 let receipt=null,loadedOwner=null,pending=null,requestedPurpose=null;
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
  const resolve=pending?.resolve;
  pending=null;
  resolve?.(result)
 }
 function updateAgree(){
  const selected=[...document.querySelectorAll('#healthConsentPurposes input[type="checkbox"]:checked')].length;
  const confirmed=$('#healthConsentConfirm')?.checked;
  const button=$('#healthConsentAgree');
  if(button)button.disabled=!(selected&&confirmed)
 }
 function renderDialog(purpose){
  const activeNow=activePurposes();
  $('#healthConsentPurposes').innerHTML=Object.entries(PURPOSES).map(([id,item])=>{
   const already=activeNow.includes(id),requested=id===purpose;
   return`<label class="healthPurpose ${requested?'requested':''} ${already?'active':''}"><input type="checkbox" value="${id}" ${already?'checked disabled':''}><span><b>${esc(item.title)}${already?' · On':''}</b><small>${esc(item.detail)}</small></span></label>`
  }).join('');
  $('#healthConsentConfirm').checked=false;
  $('#healthConsentStatus').textContent=activeNow.length?'Your existing choices stay on. Select any additional use you want to allow.':'Nothing is uploaded or sent to AI unless you opt in below.';
  $('#healthConsentStatus').classList.remove('bad');
  $('#healthConsentPurposes').querySelectorAll('input').forEach(input=>input.onchange=updateAgree);
  $('#healthConsentConfirm').onchange=updateAgree;
  updateAgree()
 }
 function openChoice(purpose){
  inject();
  requestedPurpose=PURPOSES[purpose]?purpose:'account_cloud_sync';
  renderDialog(requestedPurpose);
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
  return openChoice(purpose)
 }
 async function withdraw(){
  if(!activePurposes().length)return true;
  if(!confirm('Withdraw health-data consent? Future account sync, encrypted WebDAV sync and personalized AI will stop. Existing cloud records are not automatically deleted.'))return false;
  try{
   await record('withdrawn',[]);
   toast('Health-data consent withdrawn. Local planning still works.');
   return true
  }catch(error){
   const status=$('#accountStatus');if(status){status.textContent=error.message;status.classList.add('bad')}
   return false
  }
 }
 function panelHTML(){
  const activeNow=activePurposes(),on=activeNow.length>0;
  const labels=activeNow.map(id=>PURPOSES[id].title.replace('Private ','')).join(' · ');
  return`<div id="healthConsentPanel" class="healthConsentPanel ${on?'on':'local'}"><div><b>${on?'Health-data choices':'Local-only privacy mode'}</b><small>${on?esc(labels):'Account sync, encrypted WebDAV and personalized AI stay off until you choose them.'}</small></div><button id="manageHealthConsent">${on?'Manage':'Review choices'}</button>${on?'<button id="withdrawHealthConsent" class="danger">Withdraw all</button>':''}<a href="${esc(legalPage('privacy.html','#health'))}" target="_blank" rel="noopener noreferrer">Privacy &amp; Consumer Health Data Policy</a></div>`
 }
 function bindPanel(){
  $('#manageHealthConsent')?.addEventListener('click',()=>ensure({interactive:true,purpose:'account_cloud_sync',force:true}));
  $('#withdrawHealthConsent')?.addEventListener('click',withdraw)
 }
 function inject(){
  if($('#healthConsentDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="healthConsentDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="healthConsentTitle"><div class="sheet largeSheet healthConsentSheet"><div class="sheetHandle"></div><div class="sheetHead"><div><small>Optional and separate from account terms</small><h2 id="healthConsentTitle">Choose how health data is used</h2></div></div><div class="healthConsentIntro"><b>Your planner works on this device without consent.</b><p>Health and wellness data can include nutrition and meals, workouts and activity, height, weight and body composition, sleep, steps, heart rate, recovery, schedule information and wellness inferences.</p></div><div id="healthConsentPurposes" class="healthConsentPurposes"></div><label class="healthConsentConfirm"><input id="healthConsentConfirm" type="checkbox"><span>${esc(STATEMENT)}</span></label><p class="healthConsentLegal">These choices are available globally and are designed to meet explicit-consent standards in the EEA and UK. See the <a href="${esc(legalPage('privacy.html','#international'))}" target="_blank" rel="noopener noreferrer">Privacy &amp; Consumer Health Data Policy</a> for providers, transfers, retention and rights.</p><p id="healthConsentStatus" class="statusText" aria-live="polite"></p><div class="sheetActions healthConsentActions"><button id="healthConsentLocal">Keep data on this device</button><button id="healthConsentAgree" class="primary" disabled>Agree to selected uses</button></div></div></div>`);
  $('#healthConsentLocal').onclick=()=>closeChoice(false);
  $('#healthConsentAgree').onclick=async()=>{
   const selected=[...document.querySelectorAll('#healthConsentPurposes input[type="checkbox"]:checked')].map(input=>input.value);
   if(!selected.length||!$('#healthConsentConfirm').checked)return;
   const button=$('#healthConsentAgree');button.disabled=true;
   $('#healthConsentStatus').textContent='Saving your choices…';
   try{await record('granted',selected);const requestedWasGranted=selected.includes(requestedPurpose);closeChoice(requestedWasGranted);toast('Health-data choices saved.')}catch(error){$('#healthConsentStatus').textContent=error.message;$('#healthConsentStatus').classList.add('bad');updateAgree()}
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
