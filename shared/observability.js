(()=>{
  'use strict';
  if(window.WWObservability)return;

  const RELEASE='30.1.31';
  const MAX_REPORTS=10;
  const SOURCES=new Set(['window_error','unhandled_rejection','boot_load','resource_error','network_error','api_error','native_bridge','native_crash','native_hang']);
  const recent=new Map();
  const originalFetch=typeof window.fetch==='function'?window.fetch.bind(window):null;
  let sent=0;

  function surface(){
    const value=String(window.WGPNative?.platform||'web').toLowerCase();
    return value==='ios'||value==='android'?value:'web';
  }

  function category(value,source){
    const text=`${source||''} ${value||''}`.toLowerCase();
    if(source==='native_crash'||source==='native_hang'||source==='native_bridge')return'native';
    if(source==='api_error')return'api';
    if(source==='resource_error')return'script';
    if(text.includes('network')||text.includes('fetch')||text.includes('load failed'))return'network';
    if(text.includes('script')||text.includes('syntax'))return'script';
    if(text.includes('quota')||text.includes('storage'))return'storage';
    if(text.includes('auth')||text.includes('session'))return'auth';
    return'client';
  }

  function redact(value,limit){
    return String(value||'')
      .replace(/[\u0000-\u001f\u007f]/g,' ')
      .replace(/https?:\/\/[^\s)\]}]+/gi,'[url]')
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]')
      .replace(/\bBearer\s+\S+/gi,'Bearer [credential]')
      .replace(/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}(?:\.[A-Za-z0-9_-]{8,})?/g,'[credential]')
      .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,'[id]')
      .replace(/([?&](?:token|key|code|secret|password)=)[^&\s]+/gi,'$1[redacted]')
      .replace(/(["'])(?:(?!\1).){1,160}\1/g,'$1[value]$1')
      .replace(/\b\d{7,}\b/g,'[number]')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,limit);
  }

  function cleanStack(value){
    const origin=String(location.origin||'');
    return String(value||'')
      .split('\n')
      .slice(0,35)
      .map(line=>redact(origin?line.replaceAll(origin,''):line,260))
      .filter(Boolean)
      .join('\n')
      .slice(0,4000);
  }

  function route(value=location.href){
    try{return new URL(String(value),location.href).pathname.slice(0,240)||'/'}catch{return'/'}
  }

  function endpoint(){
    const base=surface()==='web'?'':String(window.WGPNative?.apiBase||'https://www.workandworkout.com').replace(/\/$/,'');
    return `${base}/api/v18/client-error`;
  }

  function capture(source,value,options={}){
    // Feature-specific labels must still use a source accepted by the collector.
    const allowedSource=SOURCES.has(source)?source:String(source||'').startsWith('native_')?'native_bridge':'window_error';
    // Errors can come from the document replaced during boot or another realm.
    const error=value&&typeof value==='object'?value:null;
    const errorName=redact(options.name||error?.name||(typeof value==='string'?value:'Error'),80)||'Error';
    const message=redact(options.message||error?.message||(typeof value==='string'?value:''),240);
    const stack=cleanStack(options.stack||error?.stack||'');
    const reportRoute=route(options.route||location.href);
    const key=`${allowedSource}|${errorName}|${message}|${stack.split('\n')[0]||''}|${reportRoute}`;
    const now=Date.now();
    if(sent>=MAX_REPORTS||now-(recent.get(key)||0)<60000)return false;
    recent.set(key,now);
    sent+=1;
    const reportSurface=surface();
    const headers={'Content-Type':'application/json'};
    if(reportSurface!=='web')headers['X-Work-Workout-Native']=reportSurface;
    const body={
      source:allowedSource,
      category:category(`${errorName} ${message}`,allowedSource),
      release:RELEASE,
      surface:reportSurface,
      route:reportRoute,
      errorName,
      message,
      stack
    };
    try{
      if(!originalFetch)return false;
      originalFetch(endpoint(),{method:'POST',headers,body:JSON.stringify(body),keepalive:true,credentials:'omit'}).catch(()=>{});
      return true;
    }catch{return false}
  }

  function cancelled(){return Object.assign(new Error('Request cancelled.'),{name:'AbortError',code:'REQUEST_CANCELLED'})}
  async function request(input,init={},policy={}){
    const requestUrl=typeof input==='string'||input instanceof URL?String(input):input?.url;
    const method=String(init.method||input?.method||'GET').toUpperCase();
    const signal=init.signal||input?.signal;
    const retries=['GET','HEAD'].includes(method)?Math.min(1,Math.max(0,Number(policy.retries)||0)):0;
    for(let attempt=0;;attempt++){
      if(signal?.aborted||policy.shouldContinue?.()===false)throw cancelled();
      if(navigator.onLine===false)throw Object.assign(new Error('You are offline. Reconnect and try again.'),{code:'NETWORK_OFFLINE'});
      let timer,timedOut=false;
      const controller=policy.timeoutMs>0?new AbortController():null,abort=()=>controller?.abort();
      if(controller)signal?.addEventListener('abort',abort,{once:true});
      if(policy.timeoutMs>0)timer=setTimeout(()=>{timedOut=true;controller.abort()},policy.timeoutMs);
      try{
        const response=await originalFetch(input,{...init,signal:controller?.signal||signal});
        // Read bodies inside the deadline too: receiving headers is not completion.
        const text=policy.readText?await response.text():null;
        if(policy.shouldContinue?.()===false||signal?.aborted)throw cancelled();
        if(response.status>=500)capture('api_error',`HTTP ${response.status}`,{name:'ServerResponseError',message:`${method} request failed (${response.status}): ${route(requestUrl)}`,route:requestUrl});
        return policy.readText?{response,text}:response;
      }catch(error){
        if(signal?.aborted||policy.shouldContinue?.()===false||error?.code==='REQUEST_CANCELLED')throw cancelled();
        if(attempt<retries&&!timedOut&&navigator.onLine!==false&&(error?.name==='TypeError'||error?.name==='NetworkError')){
          clearTimeout(timer);signal?.removeEventListener('abort',abort);
          await new Promise(resolve=>setTimeout(resolve,350+Math.random()*150));
          continue;
        }
        const failure=timedOut?Object.assign(new Error('This is taking longer than expected. Please try again.'),{name:'TimeoutError',code:'REQUEST_TIMEOUT'}):error;
        if(!failure.code)try{failure.code='NETWORK_ERROR'}catch{}
        if(failure?.name!=='AbortError')capture('network_error',failure,{name:failure?.name||'NetworkError',message:`${method} request ${timedOut?'timed out':'failed'}: ${route(requestUrl)}`,route:requestUrl});
        throw failure;
      }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
    }
  }

  window.WWObservability={capture,request,release:RELEASE};

  window.addEventListener('error',event=>{
    if(event?.error||event?.message){capture('window_error',event.error||event.message);return}
    const target=event?.target;
    const asset=target?.src||target?.href;
    if(asset){
      let external=false;try{external=new URL(asset,location.href).origin!==location.origin}catch{}
      capture('resource_error','Resource failed to load',{name:external?'ExternalResourceError':'ResourceError',message:`${external?'External resource':'App resource'} failed: ${route(asset)}`,route:asset});
    }
  },true);
  window.addEventListener('unhandledrejection',event=>capture('unhandled_rejection',event?.reason||'Unhandled promise rejection'));

  if(originalFetch){
    window.fetch=async function(input,init){
      const requestUrl=typeof input==='string'||input instanceof URL?String(input):input?.url;
      if(String(requestUrl||'').includes('/api/v18/client-error'))return originalFetch(input,init);
      return request(input,init);
    };
  }
})();
