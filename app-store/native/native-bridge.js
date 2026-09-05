(function(){
  'use strict';

  var Capacitor=window.Capacitor||{};
  var Plugins=Capacitor.Plugins||{};
  var platform=typeof Capacitor.getPlatform==='function'?Capacitor.getPlatform():'web';
  var isNative=platform==='ios'||platform==='android';
  var apiBase='https://www.workandworkout.com';
  var STEP_ACCESS_KEY='wgp-native-step-access-v1';
  var ACTIVE_CALORIE_ACCESS_KEY='wgp-native-active-calorie-access-v1';
  var calendarReturnInProgress=false;

  function report(label,error){
    console.warn('[native] '+label,error&&error.message?error.message:error);
    window.WWObservability?.capture?.('native_bridge',error||label,{name:'NativeBridgeError',message:String(label||'native capability')});
  }
  function plugin(name){return Plugins[name]||null}
  async function openExternal(url){
    if(!/^https:\/\//i.test(String(url||'')))return false;
    try{
      var Browser=plugin('Browser');
      if(Browser&&Browser.open){await Browser.open({url:String(url),presentationStyle:'popover'});return true}
    }catch(error){report('browser',error)}
    // Never replace the packaged app with a remotely hosted executable page.
    if(isNative){if(typeof window.toast==='function')window.toast('Could not open this link. Please try again.');return false}
    location.assign(String(url));
    return true;
  }

  window.WGPNative={
    isNative:isNative,
    platform:platform,
    apiBase:apiBase,
    returnUrl:'workandworkout://calendar-connected',
    authRedirectUrl:function(purpose){return'workandworkout://auth-callback?auth='+(purpose==='recovery'?'recovery':'signup')},
    openExternal:openExternal
  };
  // The web build registers a service worker at the end of initialization.
  // Native assets are already packaged and updated through store releases.
  window.setupPWA=function(){};
  document.documentElement.classList.add('native-app','native-'+platform);

  function bytesToBase64(bytes){
    var binary='',step=32768;
    for(var offset=0;offset<bytes.length;offset+=step)binary+=String.fromCharCode.apply(null,bytes.subarray(offset,Math.min(offset+step,bytes.length)));
    return btoa(binary);
  }
  async function shareBlob(blob,name){
    var Filesystem=plugin('Filesystem'),Share=plugin('Share');
    if(!Filesystem||!Share)throw Error('Native sharing is unavailable.');
    var safe=String(name||'work-and-workout-export').replace(/[^a-z0-9._-]+/gi,'-');
    var data=bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
    var saved=await Filesystem.writeFile({path:safe,data:data,directory:'CACHE',recursive:true});
    await Share.share({title:'Work + Workout export',text:'Your Work + Workout file',url:saved.uri,dialogTitle:'Save or share '+safe});
    return true;
  }
  async function requestLocalNotificationPermission(){
    try{
      var LocalNotifications=plugin('LocalNotifications');
      if(!LocalNotifications)return'unsupported';
      var current=await LocalNotifications.checkPermissions();
      if(current.display==='prompt'||current.display==='prompt-with-rationale')current=await LocalNotifications.requestPermissions();
      return current.display==='granted'?'granted':'denied';
    }catch(error){report('notification permission',error);return'denied'}
  }
  async function showLocalNotification(title,body){
    var LocalNotifications=plugin('LocalNotifications');
    if(!LocalNotifications||await requestLocalNotificationPermission()!=='granted')return false;
    await LocalNotifications.schedule({notifications:[{
      id:Math.max(1,Math.floor(Date.now()/1000)%2147483646),
      title:String(title||'Work + Workout'),
      body:String(body||''),
      schedule:{at:new Date(Date.now()+800)},
      extra:{source:'work-and-workout'}
    }]});
    return true;
  }

  function stepProvider(){return platform==='ios'?'Apple Health':platform==='android'?'Health Connect':'Phone health data'}
  function metricAccessEnabled(key){try{return localStorage.getItem(key)==='1'}catch{return false}}
  function setMetricAccess(key,enabled){try{if(enabled)localStorage.setItem(key,'1');else localStorage.removeItem(key)}catch{}}
  function stepAccessEnabled(){return metricAccessEnabled(STEP_ACCESS_KEY)}
  function activeCalorieAccessEnabled(){return metricAccessEnabled(ACTIVE_CALORIE_ACCESS_KEY)}
  function healthPermissionOptions(variable){
    var inactive=JSON.stringify({IsActive:false,AccessType:'READ'});
    return{
      customPermissions:JSON.stringify([{Variable:variable,AccessType:'READ'}]),
      allVariables:inactive,
      fitnessVariables:inactive,
      healthVariables:inactive,
      profileVariables:inactive,
      workoutVariables:inactive
    };
  }
  function healthQueryDate(date){return date.toISOString().split('.')[0]+'Z'}
  function healthBlocks(result){
    var parsed={};
    try{parsed=JSON.parse(result&&result.results||'{}')}catch(error){throw Error('The phone returned unreadable activity data.')}
    return Array.isArray(parsed)?parsed:Array.isArray(parsed.results)?parsed.results:[];
  }
  async function readDailyHealthTotal(variable){
    var HealthFitness=plugin('HealthFitness');
    if(!isNative||!HealthFitness||!HealthFitness.getData)throw Error('Phone health activity is unavailable on this device.');
    var start=new Date(),end;
    start.setHours(0,0,0,0);end=new Date(start);end.setDate(end.getDate()+1);
    var result=await HealthFitness.getData({parameters:JSON.stringify({
      Variable:variable,StartDate:healthQueryDate(start),EndDate:healthQueryDate(end),
      TimeUnit:'DAY',OperationType:'SUM',TimeUnitLength:1,
      AdvancedQueryReturnType:'ALL_DATA',AdvancedQueryResultType:'RAW_DATA'
    })});
    return healthBlocks(result).reduce(function(total,block){
      return total+(Array.isArray(block&&block.values)?block.values.reduce(function(sum,value){value=Number(value);return sum+(Number.isFinite(value)?value:0)},0):0);
    },0);
  }
  async function readPhoneSteps(){
    var steps=await readDailyHealthTotal('STEPS');
    return{steps:Math.max(0,Math.round(steps)),provider:stepProvider(),platform:platform,syncedAt:new Date().toISOString()};
  }
  async function readPhoneActiveCalories(){
    var activeCalories=await readDailyHealthTotal('CALORIES_BURNED');
    return{activeCalories:Math.max(0,Math.round(activeCalories)),provider:stepProvider(),platform:platform,syncedAt:new Date().toISOString()};
  }
  async function connectPhoneSteps(){
    var HealthFitness=plugin('HealthFitness');
    if(!isNative||!HealthFitness||!HealthFitness.requestHealthPermissions)throw Error('Automatic step tracking is unavailable on this device.');
    await HealthFitness.requestHealthPermissions(healthPermissionOptions('STEPS'));
    setMetricAccess(STEP_ACCESS_KEY,true);
    try{return await readPhoneSteps()}catch(error){setMetricAccess(STEP_ACCESS_KEY,false);throw error}
  }
  async function connectPhoneActiveCalories(){
    var HealthFitness=plugin('HealthFitness');
    if(!isNative||!HealthFitness||!HealthFitness.requestHealthPermissions)throw Error('Phone activity calories are unavailable on this device.');
    await HealthFitness.requestHealthPermissions(healthPermissionOptions('CALORIES_BURNED'));
    setMetricAccess(ACTIVE_CALORIE_ACCESS_KEY,true);
    try{return await readPhoneActiveCalories()}catch(error){setMetricAccess(ACTIVE_CALORIE_ACCESS_KEY,false);throw error}
  }
  async function disconnectPhoneSteps(){
    setMetricAccess(STEP_ACCESS_KEY,false);
    var HealthFitness=plugin('HealthFitness');
    if(platform==='android'&&HealthFitness&&HealthFitness.disconnectFromHealthConnect){
      try{await HealthFitness.disconnectFromHealthConnect();setMetricAccess(ACTIVE_CALORIE_ACCESS_KEY,false)}catch(error){report('health disconnect',error)}
    }
    return true;
  }
  async function openPhoneHealthSettings(){
    var HealthFitness=plugin('HealthFitness');
    if(platform==='android'&&HealthFitness&&HealthFitness.openHealthConnect){await HealthFitness.openHealthConnect();return true}
    return false;
  }

  async function configureNativeChrome(){
    if(!isNative)return;
    try{var StatusBar=plugin('StatusBar');if(StatusBar){await StatusBar.setOverlaysWebView({overlay:false});await StatusBar.setStyle({style:'LIGHT'});if(platform==='android')await StatusBar.setBackgroundColor({color:'#070a0d'})}}catch(error){report('status bar',error)}
    try{var SplashScreen=plugin('SplashScreen');if(SplashScreen)await SplashScreen.hide({fadeOutDuration:250})}catch(error){report('splash screen',error)}
  }
  function dismissTopLayer(){
    var layer=document.querySelector('[role="dialog"]:not(.hidden),.modal:not(.hidden),.sheet:not(.hidden),.drawer.open,.overlay.open');
    if(!layer)return false;
    var close=layer.querySelector('[data-close],.close,[aria-label*="close" i],button[id*="close" i]');
    if(close){close.click();return true}
    return false;
  }
  function installBackButton(){
    var App=plugin('App');if(!isNative||!App||!App.addListener)return;
    App.addListener('appUrlOpen',function(event){
      return handleNativeReturn(event&&event.url,false).catch(function(){report('account return',new Error('Could not return to the app.'))});
    });
    // Handles email links that launch a terminated app, not just a running one.
    if(App.getLaunchUrl)Promise.resolve(App.getLaunchUrl()).then(function(event){return handleNativeReturn(event&&event.url,true)}).catch(function(){report('launch return',new Error('Could not open the app link.'))});
    App.addListener('backButton',function(event){
      if(dismissTopLayer())return;
      if(event&&event.canGoBack){history.back();return}
      if(platform==='android'&&App.minimizeApp)App.minimizeApp();
    });
    App.addListener('appStateChange',function(event){
      if(event&&event.isActive)window.dispatchEvent(new CustomEvent('wgp-native-resume'));
    });
  }
  async function handleNativeReturn(value,fromLaunch){
    if(!value)return false;
    var url;try{url=new URL(String(value))}catch{return false}
    if(url.protocol!=='workandworkout:'||url.username||url.password||url.port||!['','/'].includes(url.pathname)||url.hash)return false;
    if(!['calendar-connected','auth-callback'].includes(url.hostname))return false;
    var Browser=plugin('Browser');
    if(url.hostname==='calendar-connected'){
      // A cold launch already loads the latest calendar. Do not replay its
      // constant URL after a reload, or block a later legitimate connection.
      if(fromLaunch||url.search||calendarReturnInProgress)return false;
      calendarReturnInProgress=true;
      if(Browser&&Browser.close)try{await Browser.close()}catch{}
      location.reload();return true;
    }
    if(url.hostname==='auth-callback'){
      var allowed=['auth','code','error','error_code','error_description'];
      if([...url.searchParams.keys()].some(function(key){return!allowed.includes(key)||url.searchParams.getAll(key).length!==1}))return false;
      if(!['signup','recovery'].includes(url.searchParams.get('auth')))return false;
      var code=url.searchParams.get('code');
      if(code&&!/^[A-Za-z0-9._~-]{8,2048}$/.test(code))return false;
      if(!code&&!url.searchParams.has('error')&&!url.searchParams.has('error_code'))return false;
      if(url.search.length>4096)return false;
    }
    // Remember only a digest, never the one-time code. Capacitor may deliver the
    // same launch URL again after the packaged document reloads.
    var digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url.href));
    var fingerprint=bytesToBase64(new Uint8Array(digest)),key='wgc-native-return-seen-v55';
    if(sessionStorage.getItem(key)===fingerprint)return false;
    sessionStorage.setItem(key,fingerprint);
    if(Browser&&Browser.close)try{await Browser.close()}catch{}
    // Only return to the packaged app. The existing account module exchanges
    // this code using its private, locally stored PKCE verifier.
    var destination=new URL(location.href);destination.pathname='/index.html';destination.search=url.search;destination.hash='';
    location.replace(destination.href);
    return true;
  }
  function installExternalLinks(){
    document.addEventListener('click',function(event){
      var anchor=event.target&&event.target.closest?event.target.closest('a[href]'):null;
      if(!anchor)return;
      var url;try{url=new URL(anchor.href,location.href)}catch{return}
      if(/^https?:$/.test(url.protocol)&&url.origin!==location.origin){event.preventDefault();openExternal(url.href)}
    },true);
  }
  function installHaptics(){
    var Haptics=plugin('Haptics');if(!isNative||!Haptics)return;
    document.addEventListener('click',function(event){
      if(!event.target.closest('button,a,[role="button"],input[type="checkbox"],input[type="radio"]'))return;
      Promise.resolve(Haptics.impact({style:'LIGHT'})).catch(function(error){report('haptics',error)});
    },{passive:true});
  }
  function installAppOverrides(){
    if(!isNative)return;
    window.requestNotificationPermission=requestLocalNotificationPermission;
    window.showPlannerNotification=showLocalNotification;
    window.downloadBlob=function(blob,name){shareBlob(blob,name).catch(function(error){report('share',error);if(typeof window.toast==='function')window.toast('Could not open the share sheet')})};
  }

  window.WGPNative.steps={
    available:isNative&&!!plugin('HealthFitness'),
    provider:stepProvider(),
    enabled:stepAccessEnabled,
    connect:connectPhoneSteps,
    read:readPhoneSteps,
    disconnect:disconnectPhoneSteps,
    openSettings:openPhoneHealthSettings
  };
  window.WGPNative.activityCalories={
    available:isNative&&!!plugin('HealthFitness'),
    provider:stepProvider(),
    enabled:activeCalorieAccessEnabled,
    connect:connectPhoneActiveCalories,
    read:readPhoneActiveCalories,
    openSettings:openPhoneHealthSettings
  };

  configureNativeChrome();
  installBackButton();
  installExternalLinks();
  installHaptics();
  document.addEventListener('DOMContentLoaded',function(){
    installAppOverrides();
    document.body.classList.add('native-ready');
  });
})();
