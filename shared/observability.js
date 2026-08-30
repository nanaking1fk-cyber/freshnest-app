(()=>{
  if(window.WWObservability)return;
  const RELEASE='30.1.25';
  let sent=0;
  function category(value){
    const text=String(value||'').toLowerCase();
    if(text.includes('network')||text.includes('fetch'))return'network';
    if(text.includes('script'))return'script';
    if(text.includes('quota')||text.includes('storage'))return'storage';
    if(text.includes('auth')||text.includes('session'))return'auth';
    return'client';
  }
  function capture(source,value){
    if(sent>=5)return;
    sent+=1;
    try{
      fetch('/api/v18/client-error',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:String(source||'runtime').slice(0,32),category:category(value),release:RELEASE}),keepalive:true}).catch(()=>{});
    }catch{}
  }
  window.WWObservability={capture};
  window.addEventListener('error',event=>capture('window_error',event?.message));
  window.addEventListener('unhandledrejection',event=>capture('unhandled_rejection',event?.reason?.name||event?.reason?.message));
})();
