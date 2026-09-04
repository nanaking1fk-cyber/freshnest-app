// AI allowances are read from the account, never granted from local storage.
(function(A){
 'use strict';
 let state=null,owner=null,pending=null,product=null,busy=false,listener=null;
 const costs={coach:1,equipment:10,meal:10,roster:20,schedule:20,plan:20};
 const $=id=>document.getElementById(id);
 function store(){return window.WGPNative?.platform==='ios'?window.Capacitor?.Plugins?.ApplePurchases:null}
 function emit(){window.dispatchEvent(new CustomEvent('wgc:aicredits'));render()}
 function message(value){if($('aiPlanStatus'))$('aiPlanStatus').textContent=value||''}
 async function refresh(){
  const uid=A.session?.user?.id;
  if(!uid){state=null;owner=null;emit();return null}
  if(pending?.uid===uid)return pending.promise;
  const task={uid};pending=task;
  task.promise=(async()=>{try{const result=await A.authedFetch('subscription');if(A.session?.user?.id!==uid)return null;state=result;owner=uid;emit();return state}finally{if(pending===task)pending=null}})();
  return task.promise;
 }
 async function deliver(transaction){
  if(!transaction?.signedTransaction||!A.session)throw Error('Sign in to the account used for this purchase, then restore it.');
  const uid=A.session.user.id;
  const result=await A.authedFetch('subscription',{method:'POST',body:JSON.stringify({signedTransaction:transaction.signedTransaction})});
  if(A.session?.user?.id!==uid)throw Error('Your account changed. Restore purchases after signing in.');
  state=result;owner=uid;emit();
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
    if(result.status==='pending'){message('Waiting for Apple approval. Your credits will update when approved.');return}
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
  if($('aiPlanBalance'))$('aiPlanBalance').textContent=current?`${current.remaining} of ${current.credits} credits left`:'10 free AI credits each month';
  if($('aiPlanRenewal'))$('aiPlanRenewal').textContent=current?`${current.tier==='plus'?'AI Plus · Period ends':'Free · Resets'} ${new Date(current.resetsAt).toLocaleDateString()}`:'Sign in to see your allowance.';
  const buy=$('aiSubscribeV56');
  if(buy){buy.hidden=!store()||current?.tier==='plus';buy.disabled=busy||!product?.available||!current?.purchaseAvailable;buy.textContent=product?.available?`Subscribe · ${product.displayPrice} / month`:'Apple subscription not available yet'}
  if($('aiRestoreV56')){$('aiRestoreV56').hidden=!store();$('aiRestoreV56').disabled=busy}
  if($('aiManageV56'))$('aiManageV56').hidden=current?.tier!=='plus'&&!store();
  if($('aiPlanAvailability'))$('aiPlanAvailability').textContent=!current?.purchaseAvailable?'AI Plus is not available to buy yet. AI scans stay locked until subscriptions launch. Manual entry and barcode lookup are free.':store()?'Apple handles payment and cancellation.':'Subscribe in the iPhone app. Existing subscribers can use their credits here by signing in to the same account.';
 }
 function mount(){
  if(!$('aiPlanDialogV56')){
   const dialog=document.createElement('div');dialog.id='aiPlanDialogV56';dialog.className='modal';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','aiPlanTitle');
   dialog.innerHTML=`<div class="sheet aiPlanSheetV56"><header><div><small>FREE TO START</small><h2 id="aiPlanTitle">AI, when you need it</h2></div><button type="button" id="aiPlanClose" aria-label="Close AI plans">✕</button></header><p>Calendar, workouts, food logging and progress tracking stay free. AI is optional.</p><section class="aiBalanceV56"><strong id="aiPlanBalance"></strong><span id="aiPlanRenewal"></span></section><div class="aiPlansV56"><section><h3>Free</h3><b>10 credits / month</b><p>10 Coach questions. No payment needed. AI scans require Plus.</p></section><section><h3>AI Plus</h3><b>100 credits / monthly billing period</b><p>AI scans, schedule reading and more coaching. No rollover.</p></section></div><details><summary>How credits work</summary><dl><div><dt>Coach question</dt><dd>1 credit</dd></div><div><dt>Meal or equipment photo</dt><dd>10 credits</dd></div><div><dt>Roster photo, AI schedule reading or plan refinement</dt><dd>20 credits</dd></div></dl><p>Credits are used when AI processing starts, including photos it cannot read. Rejected requests before processing use no credits. Daily service capacity also applies. Free credits reset at the start of each calendar month (UTC); Plus credits reset on renewal.</p></details><p id="aiPlanAvailability"></p><p class="aiRenewalV56">AI Plus is an auto-renewing monthly subscription. Apple shows your local price before you confirm. Payment is charged to your Apple Account. Cancel at least 24 hours before renewal in Settings → your name → Subscriptions. Deleting the app or your account does not cancel it. Cancelling keeps paid access until the end of the paid period, unless refunded or revoked.</p><p id="aiPlanStatus" role="status" aria-live="polite"></p><footer><button type="button" id="aiSubscribeV56" class="primary" disabled>Apple subscription not available yet</button><div><button type="button" id="aiRestoreV56">Restore Purchases</button><button type="button" id="aiManageV56">Manage Subscription</button></div><p><a id="aiTermsV56" target="_blank" rel="noopener">Terms of Use</a> · <a id="aiPrivacyV56" target="_blank" rel="noopener">Privacy Policy</a></p></footer></div>`;
   document.body.appendChild(dialog);
   $('aiPlanClose').onclick=()=>window.closeModal?.('aiPlanDialogV56');
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
  if(cards&&!$('openAIPlanV56')){const button=document.createElement('button');button.id='openAIPlanV56';button.innerHTML='<span>✦</span><div><b>AI credits & subscription</b><small>See your allowance, restore or manage Apple purchases</small></div><i>›</i>';button.onclick=A.openAIPlan;cards.appendChild(button)}
  render();
 }
 A.openAIPlan=async()=>{mount();window.openModal?.('aiPlanDialogV56');$('aiPlanClose')?.focus();message('Checking your allowance…');try{await refresh();if(store())product=await store().products();render();message('')}catch(error){message(error.message)}};
 A.aiCredits=()=>owner===A.session?.user?.id?state:null;
 A.refreshAICredits=refresh;
 A.ensureAICredits=async feature=>{
  if(!A.session){window.openModal?.('accountDialog');return false}
  const current=await refresh();
  if(!current)return false;
  if(!costs[feature])throw Error('This AI tool is unavailable.');
  if(feature!=='coach'&&current.tier!=='plus'){await A.openAIPlan();message('This AI tool requires AI Plus. Manual entry and barcode lookup stay free.');return false}
  if(current.remaining<costs[feature]){await A.openAIPlan();message(`This tool uses ${costs[feature]} credits; you have ${current.remaining} left. Manual entry stays free.`);return false}
  return true;
 };
 window.addEventListener('wgc:authchange',()=>{state=null;owner=null;pending=null;emit();reconcile().catch(()=>{})});
 async function reconcile(){
  if(!A.session||!store())return;
  try{const result=await store().entitlements();for(const transaction of result.transactions||[])await deliver(transaction)}catch{/* Leave unfinished transactions for the visible Restore flow. */}
 }
 async function listen(){if(listener||!store())return;listener=true;listener=await store().addListener('transactionsChanged',async event=>{if(A.session)try{await deliver(event.transaction)}catch{message('Your purchase is waiting to be restored. Sign in to the purchasing account and tap Restore Purchases.')}});await reconcile()}
 document.addEventListener('DOMContentLoaded',()=>{mount();listen().catch(()=>{})});mount();listen().catch(()=>{});
 const style=document.createElement('style');style.textContent=`body.premiumV30 #aiPlanDialogV56 .aiPlanSheetV56{max-width:540px;max-height:90dvh;overflow-y:auto;padding:24px;overscroll-behavior:contain;background:#10171b;color:#f4f7f0;border:1px solid rgba(255,255,255,.15);--muted:#adb6ba;--line:rgba(255,255,255,.14);--chip:rgba(255,255,255,.05)}body.premiumV30 #aiPlanDialogV56 header{display:flex;align-items:center;justify-content:space-between;gap:12px}body.premiumV30 #aiPlanDialogV56 p{font-size:14px;line-height:1.5;color:var(--muted)}body.premiumV30 #aiPlanDialogV56 .aiBalanceV56{padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--chip);display:grid;gap:8px;margin:20px 0}body.premiumV30 #aiPlanDialogV56 .aiBalanceV56 strong{font-size:25px}body.premiumV30 #aiPlanDialogV56 .aiBalanceV56 span{font-size:13px;color:var(--muted)}body.premiumV30 #aiPlanDialogV56 .aiPlansV56{display:grid;grid-template-columns:1fr 1fr;gap:14px}body.premiumV30 #aiPlanDialogV56 .aiPlansV56 section{padding:15px;border:1px solid var(--line);border-radius:16px}body.premiumV30 #aiPlanDialogV56 h3{margin:0 0 10px}body.premiumV30 #aiPlanDialogV56 summary{padding:18px 0;cursor:pointer;font-weight:700}body.premiumV30 #aiPlanDialogV56 dl div{display:flex;justify-content:space-between;gap:20px;margin:12px 0;font-size:14px}body.premiumV30 #aiPlanDialogV56 dd{white-space:nowrap}body.premiumV30 #aiPlanDialogV56 footer{margin-top:18px}body.premiumV30 #aiPlanDialogV56 footer>button{width:100%;min-height:50px}body.premiumV30 #aiPlanDialogV56 footer>div{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}body.premiumV30 #aiPlanDialogV56 button{min-height:44px;background:#1b272e;color:#f4f7f0;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px 14px}body.premiumV30 #aiPlanDialogV56 button.primary{background:#c1f53f;color:#142009;font-weight:750}body.premiumV30 #aiPlanDialogV56 a{color:#c1f53f}body.premiumV30 #aiPlanDialogV56 .aiRenewalV56{font-size:12px}body.premiumV30 #aiPlanDialogV56 [hidden]{display:none!important}@media(max-width:390px){body.premiumV30 #aiPlanDialogV56 .aiPlansV56{grid-template-columns:1fr}body.premiumV30 #aiPlanDialogV56 .aiPlanSheetV56{padding:18px}}`;document.head.appendChild(style);
})(window.WGC18=window.WGC18||{});
