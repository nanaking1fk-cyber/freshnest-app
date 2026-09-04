// AI allowances are read from the account, never granted from local storage.
(function(A){
 'use strict';
 let state=null,owner=null,pending=null,product=null,busy=false,listener=null,checkedAt=0,photoCheck=false,authRevision=0,sessionOwner=A.session?.user?.id||null,refreshFailures=0,nextRefresh=0;
 const costs={coach:1,equipment:10,meal:10,roster:20,schedule:20,plan:20};
 const $=id=>document.getElementById(id);
 function store(){return window.WGPNative?.platform==='ios'?window.Capacitor?.Plugins?.ApplePurchases:null}
 function emit(){window.dispatchEvent(new CustomEvent('wgc:aicredits'));render()}
 function message(value){if($('aiPlanStatus'))$('aiPlanStatus').textContent=value||''}
 async function refresh(){
  const uid=A.session?.user?.id;
  if(!uid){state=null;owner=null;checkedAt=0;emit();return null}
  if(pending?.uid===uid)return pending.promise;
  if(Date.now()<nextRefresh)throw Object.assign(Error('Subscription check is resting after a connection problem. Please try again shortly.'),{code:'SUBSCRIPTION_BACKOFF'});
  const task={uid,revision:authRevision};pending=task;
  task.promise=(async()=>{try{const result=await A.authedFetch('subscription');if(A.session?.user?.id!==uid||task.revision!==authRevision)return null;state=result;owner=uid;checkedAt=Date.now();refreshFailures=0;nextRefresh=0;emit();return state}catch(error){if(A.session?.user?.id===uid&&task.revision===authRevision){state=null;owner=null;checkedAt=0;refreshFailures++;nextRefresh=Date.now()+([401,403].includes(error?.status)?5*60*1000:Math.min(10*60*1000,30000*Math.pow(2,Math.min(refreshFailures-1,4))));emit()}throw error}finally{if(pending===task)pending=null}})();
  return task.promise;
 }
 async function deliver(transaction){
  if(!transaction?.signedTransaction||!A.session)throw Error('Sign in to the account used for this purchase, then restore it.');
  const uid=A.session.user.id;
  const result=await A.authedFetch('subscription',{method:'POST',body:JSON.stringify({signedTransaction:transaction.signedTransaction})});
  if(A.session?.user?.id!==uid)throw Error('Your account changed. Restore purchases after signing in.');
  state=result;owner=uid;checkedAt=Date.now();emit();
  // Never finish an unverified or unpersisted purchase, including a failed restore.
  if(result.purchase?.transactionId===transaction.id)await store().finish({transactionId:transaction.id});
  return result;
 }
 async function transact(action){
  if(busy)return;
  if(!A.session){window.openModal?.('accountDialog');return}
  busy=true;render();message(action==='purchase'?'Opening Apple…':'Restoring your Apple purchases…');
  try{
   const current=await refresh(),native=store();
   if(!native||!current?.purchaseAvailable)throw Error('Apple subscriptions are not available yet. You can keep using the free app.');
   if(action==='purchase'){
    const result=await native.purchase({appAccountToken:current.appAccountToken});
    if(result.status==='cancelled'){message('Purchase cancelled. Your free plan is unchanged.');return}
    if(result.status==='pending'){message('Waiting for Apple approval. AI Plus will unlock when approved.');return}
    const delivered=await deliver(result.transaction);message(delivered.tier==='plus'?'AI Plus is ready.':'Purchase checked. No active subscription was found.');
   }else{
    const result=await native.restore();
    for(const transaction of result.transactions||[])await deliver(transaction);
    const updated=await refresh();message(updated?.tier==='plus'?'Your subscription is restored.':'No active purchase was found for this account.');
   }
  }catch(error){message(error.message||'The purchase could not be checked. Please try Restore Purchases.')}finally{busy=false;render()}
 }
 async function manage(){try{if(store())await store().manage();else if(window.WGPNative?.openExternal)await window.WGPNative.openExternal('https://apps.apple.com/account/subscriptions');else window.open('https://apps.apple.com/account/subscriptions','_blank','noopener')}catch{message('Open iPhone Settings → your name → Subscriptions.')}finally{refresh().catch(()=>{})}}
 function render(){
  const current=owner===A.session?.user?.id?state:null;
  if($('aiPlanBalance'))$('aiPlanBalance').textContent=current?.tier==='plus'?'AI Plus is active':'Make more time for you';
  if($('aiPlanRenewal'))$('aiPlanRenewal').textContent=current?.tier==='plus'?`Current period ends ${new Date(current.resetsAt).toLocaleDateString()}`:'Scan meals, read rosters and get more from your coach.';
  const buy=$('aiSubscribeV56');
  if(buy){buy.hidden=!store()||current?.tier==='plus';buy.disabled=busy||!product?.available||!current?.purchaseAvailable;buy.textContent=product?.available?`Subscribe · ${product.displayPrice} / month`:'Apple subscription not available yet'}
  if($('aiRestoreV56')){$('aiRestoreV56').hidden=!store();$('aiRestoreV56').disabled=busy}
  if($('aiManageV56'))$('aiManageV56').hidden=current?.tier!=='plus'&&!store();
  if($('aiPlanAvailability'))$('aiPlanAvailability').textContent=!current?.purchaseAvailable?'AI Plus is not available to buy yet. Manual entry and barcode scanning are free.':store()?'Monthly subscription. Cancel anytime in Apple Settings.':'Subscribe in the iPhone app. Already subscribed? Sign in to the same account.';
 }
 function mount(){
  if(!$('aiPlanDialogV56')){
   const dialog=document.createElement('div');dialog.id='aiPlanDialogV56';dialog.className='modal';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','aiPlanTitle');
   dialog.innerHTML=`<div class="sheet aiPlanSheetV56"><header><div><small>WORK + WORKOUT</small><h2 id="aiPlanTitle">AI Plus</h2></div><button type="button" id="aiPlanClose" aria-label="Close AI plans">✕</button></header><section class="aiBalanceV56"><strong id="aiPlanBalance"></strong><span id="aiPlanRenewal"></span></section><p>Meal photos · Roster photos · Equipment help · More coaching</p><p>Monthly usage limit applies. <a href="#aiPlanDetailsV70" id="aiPlanDetailsLinkV70">Plan details</a></p><details id="aiPlanDetailsV70"><summary>What's included</summary><p>AI Plus includes a shared monthly allowance: up to 10 meal or equipment scans, 5 roster or schedule reads, or 100 Coach questions when used alone. Mixing tools uses the same allowance; plan refinement counts like a roster read. Unused allowance does not roll over.</p><p>Attempts count once AI processing starts, including unreadable photos. Requests rejected before processing do not count. Daily service capacity also applies.</p><p>The free plan includes 10 Coach questions each calendar month (UTC). Calendar, workouts, manual food logging and barcode lookup stay free.</p><p>Apple charges your account on confirmation. Cancel at least 24 hours before renewal in Settings → your name → Subscriptions. Deleting the app or your account does not cancel the subscription. Cancelling keeps access until the paid period ends, unless refunded or revoked.</p></details><p id="aiPlanAvailability"></p><p class="aiRenewalV56">Renews monthly until cancelled. Apple shows your local price before you confirm.</p><p id="aiPlanStatus" role="status" aria-live="polite"></p><footer><button type="button" id="aiSubscribeV56" class="primary" disabled>Apple subscription not available yet</button><div><button type="button" id="aiRestoreV56">Restore Purchases</button><button type="button" id="aiManageV56">Manage Subscription</button></div><p><a id="aiTermsV56" target="_blank" rel="noopener">Terms of Use</a> · <a id="aiPrivacyV56" target="_blank" rel="noopener">Privacy Policy</a></p></footer></div>`;
   document.body.appendChild(dialog);
   $('aiPlanClose').onclick=()=>window.closeModal?.('aiPlanDialogV56');$('aiPlanDetailsLinkV70').onclick=event=>{event.preventDefault();$('aiPlanDetailsV70').open=true;$('aiPlanDetailsV70').querySelector('summary').focus()};
   dialog.addEventListener('click',event=>{if(event.target===dialog)window.closeModal?.('aiPlanDialogV56')});
   dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();window.closeModal?.('aiPlanDialogV56');return}
    if(event.key!=='Tab')return;
    const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],summary')].filter(el=>el.getClientRects().length&&!el.hidden);
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
   });
   $('aiSubscribeV56').onclick=()=>transact('purchase');$('aiRestoreV56').onclick=()=>transact('restore');$('aiManageV56').onclick=manage;
   for(const [id,file] of [['aiTermsV56','terms.html'],['aiPrivacyV56','privacy.html']])$(id).href=typeof window.productPage==='function'?window.productPage(file):new URL('../work-gym-planner/'+file,location.href).href;
  }
  const cards=document.querySelector('#page-more .menuCards');
  if(cards&&!$('openAIPlanV56')){const button=document.createElement('button');button.id='openAIPlanV56';button.innerHTML='<span>✦</span><div><b>AI Plus</b><small>Subscribe or manage your plan</small></div><i>›</i>';button.onclick=A.openAIPlan;cards.appendChild(button)}
  render();
 }
 A.openAIPlan=async(options={})=>{mount();window.openModal?.('aiPlanDialogV56');$('aiPlanClose')?.focus();message('Checking your plan…');try{if(options.refresh!==false)await refresh();if(store())product=await store().products();render();message('')}catch{message('We could not check your subscription. Please try again. No photo has been sent.')}};
 A.aiCredits=()=>owner===A.session?.user?.id?state:null;
 A.refreshAICredits=refresh;
 A.ensureAICredits=async feature=>{
  if(!A.session){window.openModal?.('accountDialog');return false}
  let current;try{current=await refresh()}catch{await A.openAIPlan({refresh:false});message('We could not check your subscription. Please try again. No photo has been sent.');return false}
  if(!current)return false;
  if(!costs[feature])throw Error('This AI tool is unavailable.');
  if(feature!=='coach'&&current.tier!=='plus'){await A.openAIPlan({refresh:false});message('This AI tool requires AI Plus. Manual entry and barcode lookup stay free.');return false}
  if(current.remaining<costs[feature]){await A.openAIPlan({refresh:false});message('Your monthly AI allowance has been used. It renews on '+new Date(current.resetsAt).toLocaleDateString()+'. Manual entry stays free.');return false}
  return true;
 };
 // Keep file-picker activation synchronous for Safari. Refresh on tool entry;
 // an unknown, expired or different-account entitlement never opens a camera.
 A.canUseAIPhoto=feature=>!!A.session&&owner===A.session.user.id&&state?.tier==='plus'&&state.remaining>=costs[feature]&&Date.now()-checkedAt<60000&&Date.parse(state.resetsAt)>Date.now();
 document.addEventListener('click',event=>{
  const target=event.target?.closest?.('#foodMealScanTool,input[type="file"]');
  const feature={foodMealScanTool:'meal',mealScanPhoto:'meal',aiPhotoInput:'equipment',scheduleCameraV24:'roster',schedulePhotoV70:'roster'}[target?.id];
  if(!feature||A.canUseAIPhoto(feature))return;
  event.preventDefault();event.stopImmediatePropagation();if(photoCheck)return;photoCheck=true;
  A.ensureAICredits(feature).then(allowed=>{if(!allowed||!target.isConnected||!A.canUseAIPhoto(feature))return;if(target.id==='foodMealScanTool')target.click();else window.toast?.('AI Plus is ready. Tap the photo button again to continue.');}).catch(()=>{A.openAIPlan()}).finally(()=>{photoCheck=false});
 },true);
 window.addEventListener('wgc:authchange',event=>{const uid=A.session?.user?.id||null;if(uid===sessionOwner){if(event.detail?.tokenChanged){refreshFailures=0;nextRefresh=0}return}sessionOwner=uid;authRevision++;state=null;owner=null;pending=null;checkedAt=0;refreshFailures=0;nextRefresh=0;emit();if(uid)reconcile().catch(()=>{})});
 async function reconcile(){
  if(!A.session||!store())return;
  try{const result=await store().entitlements();for(const transaction of result.transactions||[])await deliver(transaction)}catch{/* Leave unfinished transactions for the visible Restore flow. */}
 }
 async function listen(){if(listener||!store())return;listener=true;listener=await store().addListener('transactionsChanged',async event=>{if(A.session)try{await deliver(event.transaction)}catch{message('Your purchase is waiting to be restored. Sign in to the purchasing account and tap Restore Purchases.')}});await reconcile()}
 document.addEventListener('DOMContentLoaded',()=>{mount();listen().catch(()=>{})});mount();listen().catch(()=>{});
 const style=document.createElement('style');style.textContent=`body.premiumV30 #aiPlanDialogV56 .aiPlanSheetV56{max-width:540px;max-height:90dvh;overflow-y:auto;padding:24px;overscroll-behavior:contain;background:#10171b;color:#f4f7f0;border:1px solid rgba(255,255,255,.15);--muted:#adb6ba;--line:rgba(255,255,255,.14);--chip:rgba(255,255,255,.05)}body.premiumV30 #aiPlanDialogV56 header{display:flex;align-items:center;justify-content:space-between;gap:12px}body.premiumV30 #aiPlanDialogV56 p{font-size:14px;line-height:1.5;color:var(--muted)}body.premiumV30 #aiPlanDialogV56 .aiBalanceV56{padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--chip);display:grid;gap:8px;margin:20px 0}body.premiumV30 #aiPlanDialogV56 .aiBalanceV56 strong{font-size:25px}body.premiumV30 #aiPlanDialogV56 .aiBalanceV56 span{font-size:13px;color:var(--muted)}body.premiumV30 #aiPlanDialogV56 .aiPlansV56{display:grid;grid-template-columns:1fr 1fr;gap:14px}body.premiumV30 #aiPlanDialogV56 .aiPlansV56 section{padding:15px;border:1px solid var(--line);border-radius:16px}body.premiumV30 #aiPlanDialogV56 h3{margin:0 0 10px}body.premiumV30 #aiPlanDialogV56 summary{padding:18px 0;cursor:pointer;font-weight:700}body.premiumV30 #aiPlanDialogV56 dl div{display:flex;justify-content:space-between;gap:20px;margin:12px 0;font-size:14px}body.premiumV30 #aiPlanDialogV56 dd{white-space:nowrap}body.premiumV30 #aiPlanDialogV56 footer{margin-top:18px}body.premiumV30 #aiPlanDialogV56 footer>button{width:100%;min-height:50px}body.premiumV30 #aiPlanDialogV56 footer>div{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}body.premiumV30 #aiPlanDialogV56 button{min-height:44px;background:#1b272e;color:#f4f7f0;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px 14px}body.premiumV30 #aiPlanDialogV56 button.primary{background:#c1f53f;color:#142009;font-weight:750}body.premiumV30 #aiPlanDialogV56 a{color:#c1f53f}body.premiumV30 #aiPlanDialogV56 .aiRenewalV56{font-size:12px}body.premiumV30 #aiPlanDialogV56 [hidden]{display:none!important}@media(max-width:390px){body.premiumV30 #aiPlanDialogV56 .aiPlansV56{grid-template-columns:1fr}body.premiumV30 #aiPlanDialogV56 .aiPlanSheetV56{padding:18px}}`;document.head.appendChild(style);
})(window.WGC18=window.WGC18||{});
