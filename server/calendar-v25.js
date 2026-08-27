const crypto=require('crypto');
const {serviceFetch}=require('./v18-lib');
const Scheduling=require('../shared/v25-scheduling');

const APP_ORIGIN=()=>String(process.env.APP_ORIGIN||'https://www.workandworkout.com').replace(/\/$/,'');
const PROVIDERS=new Set(['google','microsoft']);

function providerConfig(provider){
  const redirectUri=`${APP_ORIGIN()}/api/v25/calendar?action=callback&provider=${provider}`;
  if(provider==='google')return{
    provider,clientId:process.env.GOOGLE_CALENDAR_CLIENT_ID||'',clientSecret:process.env.GOOGLE_CALENDAR_CLIENT_SECRET||'',redirectUri,
    authorizationEndpoint:'https://accounts.google.com/o/oauth2/v2/auth',tokenEndpoint:'https://oauth2.googleapis.com/token',
    scopes:['openid','email','https://www.googleapis.com/auth/calendar.events']
  };
  if(provider==='microsoft')return{
    provider,clientId:process.env.MICROSOFT_CALENDAR_CLIENT_ID||'',clientSecret:process.env.MICROSOFT_CALENDAR_CLIENT_SECRET||'',redirectUri,
    authorizationEndpoint:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',tokenEndpoint:'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes:['openid','email','offline_access','Calendars.ReadWrite','User.Read']
  };
  throw Object.assign(new Error('Unsupported calendar provider.'),{status:400});
}
function configured(provider){const config=providerConfig(provider);return!!(config.clientId&&config.clientSecret&&process.env.CALENDAR_TOKEN_ENCRYPTION_KEY)}
function requireConfigured(provider){if(!configured(provider))throw Object.assign(new Error(`${provider==='google'?'Google':'Outlook'} Calendar OAuth is not configured yet.`),{status:503});return providerConfig(provider)}
function encryptionKey(){const value=String(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY||'');if(value.length<32)throw Object.assign(new Error('Calendar token encryption is not configured.'),{status:503});return crypto.createHash('sha256').update(value).digest()}
function encrypt(value){
  if(!value)return null;
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv),body=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
  return['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),body.toString('base64url')].join('.');
}
function decrypt(value){
  if(!value)return'';const parts=String(value).split('.');if(parts.length!==4||parts[0]!=='v1')throw Error('Stored calendar token is invalid.');
  const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(parts[1],'base64url'));decipher.setAuthTag(Buffer.from(parts[2],'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(parts[3],'base64url')),decipher.final()]).toString('utf8');
}
function hash(value){return crypto.createHash('sha256').update(String(value)).digest('hex')}
function randomToken(bytes=32){return crypto.randomBytes(bytes).toString('base64url')}
function formBody(value){return new URLSearchParams(value).toString()}
function normalizeProvider(value){const provider=String(value||'').toLowerCase();if(!PROVIDERS.has(provider))throw Object.assign(new Error('Choose Google or Outlook Calendar.'),{status:400});return provider}
function allowedReturnTo(value){
  try{const url=new URL(value||APP_ORIGIN());if(url.origin!==APP_ORIGIN())return APP_ORIGIN()+'/';return url.origin+url.pathname}catch{return APP_ORIGIN()+'/'}
}

async function calendarStatus(userId){
  const rows=await serviceFetch(`calendar_connections?user_id=eq.${encodeURIComponent(userId)}&select=provider,status,provider_email,last_synced_at,last_error`);
  return{
    providers:{google:{configured:configured('google')},microsoft:{configured:configured('microsoft')}},
    configuredCount:['google','microsoft'].filter(configured).length,
    connections:(rows||[]).map(row=>({provider:row.provider,status:row.status,email:row.provider_email||'',lastSyncedAt:row.last_synced_at||null,lastError:row.last_error||null}))
  };
}

async function beginOAuth(userId,{provider,returnTo}={}){
  provider=normalizeProvider(provider);const config=requireConfigured(provider),state=randomToken(32),verifier=randomToken(48),challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  await serviceFetch(`calendar_oauth_states?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`,{method:'DELETE',prefer:'return=minimal'});
  await serviceFetch('calendar_oauth_states',{method:'POST',body:{state_hash:hash(state),user_id:userId,provider,code_verifier:verifier,return_to:allowedReturnTo(returnTo),expires_at:new Date(Date.now()+10*60*1000).toISOString()},prefer:'return=minimal'});
  const query={client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:config.scopes.join(' '),state,code_challenge:challenge,code_challenge_method:'S256'};
  if(provider==='google')Object.assign(query,{access_type:'offline',prompt:'consent',include_granted_scopes:'true'});
  else Object.assign(query,{response_mode:'query',prompt:'select_account'});
  return{authorizationUrl:config.authorizationEndpoint+'?'+formBody(query)};
}

async function tokenRequest(config,params){
  const response=await fetch(config.tokenEndpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:formBody(params)}),body=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(body.error_description||body.error||'Calendar authorization failed.'),{status:502});
  return body;
}
async function providerIdentity(provider,accessToken){
  const url=provider==='google'?'https://openidconnect.googleapis.com/v1/userinfo':'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName';
  const response=await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`}}),body=await response.json().catch(()=>({}));
  if(!response.ok)return{id:'',email:''};
  return provider==='google'?{id:body.sub||'',email:body.email||''}:{id:body.id||'',email:body.mail||body.userPrincipalName||''};
}
async function finishOAuth({provider,state,code,error,error_description}={}){
  provider=normalizeProvider(provider);if(error)throw Object.assign(new Error(error_description||error),{status:400});if(!state||!code)throw Object.assign(new Error('Calendar authorization response is incomplete.'),{status:400});
  const rows=await serviceFetch(`calendar_oauth_states?state_hash=eq.${hash(state)}&select=state_hash,user_id,provider,code_verifier,return_to,expires_at`),record=rows?.[0];
  if(!record||record.provider!==provider||new Date(record.expires_at)<=new Date())throw Object.assign(new Error('Calendar authorization expired. Start the connection again.'),{status:400});
  await serviceFetch(`calendar_oauth_states?state_hash=eq.${record.state_hash}`,{method:'DELETE',prefer:'return=minimal'});
  const config=requireConfigured(provider),token=await tokenRequest(config,{client_id:config.clientId,client_secret:config.clientSecret,code,code_verifier:record.code_verifier,grant_type:'authorization_code',redirect_uri:config.redirectUri}),identity=await providerIdentity(provider,token.access_token);
  const existing=await serviceFetch(`calendar_connections?user_id=eq.${encodeURIComponent(record.user_id)}&provider=eq.${provider}&select=encrypted_refresh_token`),refresh=token.refresh_token?encrypt(token.refresh_token):(existing?.[0]?.encrypted_refresh_token||null);
  await serviceFetch('calendar_connections?on_conflict=user_id,provider',{method:'POST',body:{user_id:record.user_id,provider,provider_account_id:identity.id||null,provider_email:identity.email||null,calendar_id:'primary',encrypted_access_token:encrypt(token.access_token),encrypted_refresh_token:refresh,token_expires_at:token.expires_in?new Date(Date.now()+Number(token.expires_in)*1000).toISOString():null,scopes:String(token.scope||config.scopes.join(' ')).split(/\s+/).filter(Boolean),status:'active',last_error:null,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});
  return{returnTo:record.return_to,provider};
}

async function connectionFor(userId,provider){
  const rows=await serviceFetch(`calendar_connections?user_id=eq.${encodeURIComponent(userId)}&provider=eq.${provider}&select=*`),connection=rows?.[0];
  if(!connection||connection.status==='revoked')throw Object.assign(new Error('Connect this calendar first.'),{status:409});return connection;
}
async function saveConnection(connection,patch){await serviceFetch(`calendar_connections?id=eq.${connection.id}`,{method:'PATCH',body:Object.assign({},patch,{updated_at:new Date().toISOString()}),prefer:'return=minimal'})}
async function validAccessToken(connection){
  if(connection.token_expires_at&&new Date(connection.token_expires_at).getTime()>Date.now()+5*60*1000)return decrypt(connection.encrypted_access_token);
  const refresh=decrypt(connection.encrypted_refresh_token);if(!refresh)throw Object.assign(new Error('Calendar permission expired. Reconnect the calendar.'),{status:401});
  const config=requireConfigured(connection.provider),params={client_id:config.clientId,client_secret:config.clientSecret,refresh_token:refresh,grant_type:'refresh_token'};if(connection.provider==='microsoft')params.scope=config.scopes.join(' ');
  const token=await tokenRequest(config,params);await saveConnection(connection,{encrypted_access_token:encrypt(token.access_token),encrypted_refresh_token:token.refresh_token?encrypt(token.refresh_token):connection.encrypted_refresh_token,token_expires_at:token.expires_in?new Date(Date.now()+Number(token.expires_in)*1000).toISOString():null,status:'active',last_error:null});
  return token.access_token;
}
function providerHeaders(token,extra={}){return{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...extra}}
async function providerFetch(url,token,options={}){
  const response=await fetch(url,{...options,headers:providerHeaders(token,options.headers||{})}),text=await response.text();let body={};try{body=text?JSON.parse(text):{}}catch{body={message:text}}
  if(!response.ok)throw Object.assign(new Error(body.error?.message||body.error_description||body.message||`Calendar provider failed (${response.status}).`),{status:502});return body;
}
function microsoftTimeZone(value){return({'America/New_York':'Eastern Standard Time','America/Chicago':'Central Standard Time','America/Denver':'Mountain Standard Time','America/Los_Angeles':'Pacific Standard Time','America/Phoenix':'US Mountain Standard Time','UTC':'UTC'})[value]||'UTC'}
function endDate(event){return event.end&&Scheduling.minutes(event.end)<=Scheduling.minutes(event.start)?Scheduling.keyFromDate(Scheduling.addDays(Scheduling.dateFromKey(event.date),1)):event.date}
function providerEventBody(provider,event,timeZone){
  const endDay=endDate(event),marker=`Work + Workout ID: ${event.id}`;
  if(provider==='google')return{summary:event.title,description:marker,start:{dateTime:`${event.date}T${event.start}:00`,timeZone},end:{dateTime:`${endDay}T${event.end}:00`,timeZone},extendedProperties:{private:{wwLocalId:event.id,wwKind:event.kind||'event'}}};
  const zone=microsoftTimeZone(timeZone);return{subject:event.title,body:{contentType:'text',content:marker},start:{dateTime:`${event.date}T${event.start}:00`,timeZone:zone},end:{dateTime:`${endDay}T${event.end}:00`,timeZone:zone},categories:['Work + Workout']};
}
function providerEventUrl(provider,id){return provider==='google'?`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`:`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(id)}`}
async function createRemote(provider,event,timeZone,token){const url=provider==='google'?'https://www.googleapis.com/calendar/v3/calendars/primary/events':'https://graph.microsoft.com/v1.0/me/events';return providerFetch(url,token,{method:'POST',body:JSON.stringify(providerEventBody(provider,event,timeZone))})}
async function updateRemote(provider,id,event,timeZone,token){return providerFetch(providerEventUrl(provider,id),token,{method:'PATCH',body:JSON.stringify(providerEventBody(provider,event,timeZone))})}
async function listRemote(provider,token,start,end,timeZone){
  if(provider==='google'){
    const query=formBody({timeMin:new Date(start+'T00:00:00Z').toISOString(),timeMax:new Date(end+'T23:59:59Z').toISOString(),singleEvents:'true',showDeleted:'false',maxResults:'2500'}),body=await providerFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+query,token);
    return(body.items||[]).map(item=>normalizeRemote(provider,item)).filter(Boolean);
  }
  const query=new URLSearchParams({startDateTime:new Date(start+'T00:00:00Z').toISOString(),endDateTime:new Date(end+'T23:59:59Z').toISOString(),'$top':'999','$select':'id,subject,start,end,lastModifiedDateTime,bodyPreview,isCancelled'}),body=await providerFetch('https://graph.microsoft.com/v1.0/me/calendarView?'+query,token,{headers:{Prefer:`outlook.timezone="${microsoftTimeZone(timeZone)}"`}});
  return(body.value||[]).filter(item=>!item.isCancelled).map(item=>normalizeRemote(provider,item)).filter(Boolean);
}
function normalizeRemote(provider,item){
  const start=provider==='google'?(item.start?.dateTime||item.start?.date):(item.start?.dateTime),end=provider==='google'?(item.end?.dateTime||item.end?.date):(item.end?.dateTime);if(!start||!end)return null;
  const allDay=start.length===10;return{externalId:item.id,title:(provider==='google'?item.summary:item.subject)||'Calendar event',date:start.slice(0,10),start:allDay?'':start.slice(11,16),end:allDay?'':end.slice(11,16),updatedAt:provider==='google'?item.updated:item.lastModifiedDateTime,allDay};
}
function proposalFromRemote(provider,remote,local=null,{conflict=false}={}){
  return{id:`remote-${provider}-${remote.externalId}`,kind:local?.kind||'event',date:remote.date,title:remote.title,start:remote.start,end:remote.end,overnight:remote.end&&Scheduling.minutes(remote.end)<=Scheduling.minutes(remote.start),reminder:30,sourceText:`Changed in ${provider==='google'?'Google Calendar':'Outlook Calendar'}`,sourceType:'external',sourceId:local?.sourceId||'',seriesId:`remote-${provider}-${remote.externalId}`,series:false,needsReview:false,externalId:remote.externalId,provider,confidence:{score:.97,label:'High',reasons:['verified provider event']},conflictTargetId:conflict?local?.id||'':'',conflictMessage:conflict?'This event changed in both Work + Workout and the connected calendar.':''};
}
async function upsertLink(userId,provider,local,externalId,remoteUpdatedAt){
  await serviceFetch('calendar_event_links?on_conflict=user_id,provider,local_event_id',{method:'POST',body:{user_id:userId,provider,local_event_id:local.id,external_event_id:externalId,local_updated_at:local.updatedAt||new Date().toISOString(),remote_updated_at:remoteUpdatedAt||new Date().toISOString(),sync_hash:hash(JSON.stringify([local.title,local.date,local.start,local.end]))},prefer:'resolution=merge-duplicates,return=minimal'});
}

async function syncCalendar(userId,{provider,events=[],timeZone='UTC'}={}){
  provider=normalizeProvider(provider);if(!Array.isArray(events))throw Object.assign(new Error('Calendar events must be an array.'),{status:400});
  const local=events.slice(0,500).filter(event=>event&&typeof event.id==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(event.date)&&/^\d{2}:\d{2}$/.test(event.start)&&/^\d{2}:\d{2}$/.test(event.end)),connection=await connectionFor(userId,provider),token=await validAccessToken(connection),start=Scheduling.keyFromDate(Scheduling.addDays(new Date(),-30)),end=Scheduling.keyFromDate(Scheduling.addDays(new Date(),180)),remote=await listRemote(provider,token,start,end,timeZone),remoteById=new Map(remote.map(item=>[item.externalId,item])),links=await serviceFetch(`calendar_event_links?user_id=eq.${encodeURIComponent(userId)}&provider=eq.${provider}&select=*`),linkByLocal=new Map((links||[]).map(link=>[link.local_event_id,link])),linkedExternal=new Set((links||[]).map(link=>link.external_event_id)),proposals=[],creates=[],updates=[];
  for(const event of local){
    let link=linkByLocal.get(event.id);
    if(!link&&event.provider===provider&&event.externalId){await upsertLink(userId,provider,event,event.externalId,remoteById.get(event.externalId)?.updatedAt);linkedExternal.add(event.externalId);continue}
    if(!link){creates.push(event);continue}
    const remoteEvent=remoteById.get(link.external_event_id);if(!remoteEvent)continue;
    const localChanged=event.updatedAt&&(!link.local_updated_at||new Date(event.updatedAt)>new Date(new Date(link.local_updated_at).getTime()+1000)),remoteChanged=remoteEvent.updatedAt&&(!link.remote_updated_at||new Date(remoteEvent.updatedAt)>new Date(new Date(link.remote_updated_at).getTime()+1000));
    if(localChanged&&remoteChanged)proposals.push(proposalFromRemote(provider,remoteEvent,event,{conflict:true}));
    else if(remoteChanged)proposals.push(proposalFromRemote(provider,remoteEvent,event,{conflict:true}));
    else if(localChanged)updates.push({event,externalId:link.external_event_id});
  }
  remote.forEach(item=>{if(!linkedExternal.has(item.externalId)&&proposals.length<100)proposals.push(proposalFromRemote(provider,item))});
  let pushed=0,updated=0;
  for(const event of creates.slice(0,30)){const created=await createRemote(provider,event,timeZone,token);await upsertLink(userId,provider,event,created.id,provider==='google'?created.updated:created.lastModifiedDateTime);pushed++}
  for(const item of updates.slice(0,30)){const changed=await updateRemote(provider,item.externalId,item.event,timeZone,token);await upsertLink(userId,provider,item.event,item.externalId,provider==='google'?changed.updated:changed.lastModifiedDateTime);updated++}
  const lastSyncedAt=new Date().toISOString();await saveConnection(connection,{last_synced_at:lastSyncedAt,last_error:null,status:'active'});
  const pending=Math.max(0,creates.length-30)+Math.max(0,updates.length-30),message=`Sync compared both calendars: ${pushed} added, ${updated} updated, ${proposals.length} returned for review${pending?`, ${pending} queued for the next sync`:''}.`;
  return{ok:true,pushed,updated,pending,proposals,lastSyncedAt,message};
}

async function disconnectCalendar(userId,{provider}={}){
  provider=normalizeProvider(provider);const connection=await connectionFor(userId,provider);
  if(provider==='google')try{await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:formBody({token:decrypt(connection.encrypted_refresh_token)||decrypt(connection.encrypted_access_token)})})}catch{}
  await serviceFetch(`calendar_event_links?user_id=eq.${encodeURIComponent(userId)}&provider=eq.${provider}`,{method:'DELETE',prefer:'return=minimal'});
  await serviceFetch(`calendar_connections?id=eq.${connection.id}`,{method:'DELETE',prefer:'return=minimal'});
  return{ok:true};
}

module.exports={providerConfig,configured,encrypt,decrypt,calendarStatus,beginOAuth,finishOAuth,syncCalendar,disconnectCalendar,proposalFromRemote,normalizeRemote,providerEventBody};
