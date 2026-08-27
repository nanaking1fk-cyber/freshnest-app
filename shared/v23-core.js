(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WGC23Core=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DEFAULT_PREFIX='wgp-v15-';
  const LEGACY_KEYS=new Set([
    'training-history-v14',
    'nutrition-settings',
    'my-foods',
    'recent-foods',
    'wgp-exercise-alternative-prefs-v1'
  ]);
  const LEGACY_PREFIXES=['bellevue-','b-','food-diary-','water-','nutrition-log-','training-draft-v14-'];
  const PRIVATE_PLANNER_KEYS=new Set([
    DEFAULT_PREFIX+'sync-settings',
    DEFAULT_PREFIX+'diagnostics',
    DEFAULT_PREFIX+'ai-chat-local-v18'
  ]);

  function isPlannerKey(key,prefix=DEFAULT_PREFIX){
    if(typeof key!=='string'||!key)return false;
    if(PRIVATE_PLANNER_KEYS.has(key))return false;
    return key.startsWith(prefix)||LEGACY_KEYS.has(key)||LEGACY_PREFIXES.some(value=>key.startsWith(value));
  }

  function sanitizePlannerState(input,{prefix=DEFAULT_PREFIX,appVersion='23.0.0'}={}){
    const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
    const raw=source.storage&&typeof source.storage==='object'&&!Array.isArray(source.storage)?source.storage:{};
    const storage={};
    for(const [key,value] of Object.entries(raw)){
      if(!isPlannerKey(key,prefix))continue;
      if(typeof value==='string')storage[key]=value;
      else if(value!=null)storage[key]=JSON.stringify(value);
    }
    return{
      schemaVersion:23,
      appVersion:String(source.appVersion||appVersion),
      capturedAt:String(source.capturedAt||new Date().toISOString()),
      storage
    };
  }

  // Legacy Supabase implicit-flow responses put bearer tokens in the URL fragment.
  // Only those fragments may be rejected as legacy auth; ordinary in-page
  // anchors (for example #landingFeatures) must survive untouched.
  const LEGACY_AUTH_FRAGMENT_KEYS=['access_token','refresh_token','provider_token','provider_refresh_token','id_token'];

  function isLegacyAuthFragment(hash){
    const raw=String(hash==null?'':hash).replace(/^#/,'').trim();
    if(!raw||raw.indexOf('=')<0)return false;
    let params;
    try{params=new URLSearchParams(raw)}catch{return false}
    return LEGACY_AUTH_FRAGMENT_KEYS.some(key=>{
      const value=params.get(key);
      return typeof value==='string'&&value.length>0;
    });
  }

  function restrictionTokens(value){
    const stop=new Set(['avoid','allergy','allergies','allergic','intolerance','intolerant','no','none','and','or','the','food','foods']);
    return String(value||'').toLowerCase().split(/[,;/\n]+|\s+/).map(x=>x.replace(/[^a-z0-9-]/g,'')).filter(x=>x.length>2&&!stop.has(x));
  }

  function foodAllowed(food,restrictions){
    const haystack=String(food||'').toLowerCase();
    return !restrictionTokens(restrictions).some(token=>haystack.includes(token));
  }

  function calorieAdjustment({goal='recomp',loggedEnough=false,adherence=0,weeklyChangePct=null,waistImproved=false}={}){
    if(!loggedEnough)return{delta:0,text:'Log at least 5 calorie days and 3+ morning weights in each of two consecutive weeks before changing calories.'};
    if(adherence<.8)return{delta:0,text:`Logging/on-target adherence is ${Math.round(adherence*100)}%. Hold calories and improve consistency before changing the target.`};

    const change=Number(weeklyChangePct)||0; // positive means body weight increased
    if(goal==='muscle_gain'){
      if(change<.1)return{delta:100,text:'Weight gain is below the muscle-building target range with good adherence. Add 100 calories to training-day and recovery targets.'};
      if(change>.5)return{delta:-100,text:'Weight is rising faster than 0.5% per week. Reduce training-day and recovery targets by 100 calories.'};
      return{delta:0,text:'Weight gain is in a conservative muscle-building range. Keep calories unchanged.'};
    }
    if(goal==='maintain'){
      if(change<-.4)return{delta:100,text:'Weight is drifting down outside the maintenance range. Add 100 calories to daily targets.'};
      if(change>.4)return{delta:-100,text:'Weight is drifting up outside the maintenance range. Reduce daily targets by 100 calories.'};
      return{delta:0,text:'Weight is stable within the maintenance range. Keep calories unchanged.'};
    }

    const loss=-change;
    if(waistImproved&&Math.abs(loss)<.15)return{delta:0,text:'Weight is fairly stable but waist is down at least 0.25 in. Hold calories — body composition is improving.'};
    if(loss<.15)return{delta:-100,text:'Weight loss is below the target range with good adherence. Reduce training-day and recovery calories by 100.'};
    if(loss>.75)return{delta:100,text:'Weight is falling faster than 0.75% per week. Add 100 calories to training-day and recovery targets.'};
    return{delta:0,text:'Weight trend is in the target range. Keep calories unchanged.'};
  }

  return{DEFAULT_PREFIX,isPlannerKey,sanitizePlannerState,restrictionTokens,foodAllowed,calorieAdjustment,isLegacyAuthFragment};
});
