// Native-only enhancements loaded inside the Capacitor bundle.
(function(){
  const cap=window.Capacitor;
  const isNative=!!cap?.isNativePlatform?.();
  if(!isNative)return;
  document.documentElement.classList.add('native-ios');
  const plugin=n=>cap?.Plugins?.[n];
  const Haptics=plugin('Haptics');
  const LocalNotifications=plugin('LocalNotifications');

  async function impact(style='LIGHT'){try{await Haptics?.impact?.({style})}catch{}}
  async function success(){try{await Haptics?.notification?.({type:'SUCCESS'})}catch{}}
  async function nativeNotificationPermission(){
    try{
      let p=await LocalNotifications?.checkPermissions?.();
      if(p?.display==='prompt'||p?.display==='prompt-with-rationale')p=await LocalNotifications.requestPermissions();
      return p?.display==='granted'?'granted':'denied';
    }catch{return'denied'}
  }
  async function nativeNotify(title,body){
    if(!LocalNotifications||await nativeNotificationPermission()!=='granted')return false;
    try{await LocalNotifications.schedule({notifications:[{id:Math.floor(Date.now()/1000)%2147483647,title,body,schedule:{at:new Date(Date.now()+800)},sound:null,actionTypeId:'',extra:{source:'work-gym-coach'}}]});return true}catch{return false}
  }

  document.addEventListener('click',e=>{if(e.target.closest('button,.result,.completedSessionSummary'))impact('LIGHT')},{passive:true});
  if(typeof completeTraining==='function'){
    const base=completeTraining;
    completeTraining=function(){let r=base.apply(this,arguments);success();return r};
  }
  if(typeof saveBodyCheckin169==='function'){
    const base=saveBodyCheckin169;
    saveBodyCheckin169=function(){let r=base.apply(this,arguments);impact('MEDIUM');return r};
  }
  if(typeof requestNotificationPermission==='function')requestNotificationPermission=nativeNotificationPermission;
  if(typeof showPlannerNotification==='function')showPlannerNotification=nativeNotify;
  if(typeof maybeNotifyOnLaunch==='function'){
    maybeNotifyOnLaunch=async function(){
      let n=notificationSettings(),today=dkey(),notes=[];
      if(n.schedule&&workState(today).kind==='unknown')notes.push(`${profile()?.variable?.name||'Variable work'} is still unknown today.`);
      if(n.workout&&isScheduled(today)&&!completedOn(today))notes.push(`${WORKOUTS[projectedWorkoutIndex(today)].name} is planned today.`);
      if(n.protein){let t=target(today),x=totals(today);if(x.cal>500&&x.p<t.p*.7&&new Date().getHours()>=18)notes.push(`${Math.round(t.p-x.p)} g protein remains today.`)}
      if(notes.length)await nativeNotify('Work + Gym Coach',notes.join(' '));
    };
  }

  // App Store binary must not download executable OCR code after review.
  // The monthly work-schedule review grid remains fully functional. A native
  // Vision framework OCR plugin can replace this no-op in a later native step.
  if(typeof loadTesseract==='function'){
    loadTesseract=async function(){
      let s=document.querySelector('#bScanStatus');
      if(s)s.textContent='Automatic schedule OCR is not enabled in this native build yet. Use the review grid; unknown dates are never assumed off.';
      return false;
    };
  }
  window.WGPNative={isNative:true,impact,success,nativeNotify,nativeNotificationPermission};
})();
