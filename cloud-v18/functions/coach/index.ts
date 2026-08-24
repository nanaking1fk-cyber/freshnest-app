const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
const env=(k:string)=>Deno.env.get(k)||'';
async function userFromRequest(req:Request){
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))throw Object.assign(new Error('Sign in required.'),{status:401});
  const r=await fetch(`${env('SUPABASE_URL')}/auth/v1/user`,{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:auth}});
  if(!r.ok)throw Object.assign(new Error('Session expired. Sign in again.'),{status:401});
  return await r.json();
}
async function rest(path:string,{method='GET',body,prefer='return=representation'}:{method?:string,body?:unknown,prefer?:string}={}){
  const r=await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`,{method,headers:{apikey:env('SUPABASE_SERVICE_ROLE_KEY'),Authorization:`Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,'Content-Type':'application/json',Prefer:prefer},body:body==null?undefined:JSON.stringify(body)});
  const text=await r.text();let data:any=null;if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!r.ok)throw Object.assign(new Error(data?.message||data?.error||`Database request failed (${r.status})`),{status:500});
  return data;
}
async function enforceLimit(userId:string){
  const day=new Date().toISOString().slice(0,10),limit=+(env('AI_DAILY_LIMIT')||40);
  const rows=await rest(`ai_usage_daily?user_id=eq.${encodeURIComponent(userId)}&day=eq.${day}&select=requests`);
  const n=rows?.[0]?.requests||0;if(n>=limit)throw Object.assign(new Error('Daily AI Coach limit reached. Try again tomorrow.'),{status:429});
  await rest('ai_usage_daily?on_conflict=user_id,day',{method:'POST',body:{user_id:userId,day,requests:n+1,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});
}
function outputText(j:any){if(typeof j?.output_text==='string')return j.output_text;for(const item of j?.output||[])for(const c of item?.content||[])if(c.type==='output_text'&&c.text)return c.text;return''}
async function askOpenAI(instructions:string,message:string,imageDataUrl?:string|null){
  const key=env('OPENAI_API_KEY');if(!key)throw Object.assign(new Error('AI Coach is not configured yet.'),{status:503});
  const content:any[]=[{type:'input_text',text:message||'Help me with my plan.'}];if(imageDataUrl)content.push({type:'input_image',image_url:imageDataUrl,detail:'high'});
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:env('OPENAI_COACH_MODEL')||'gpt-5.6-terra',instructions,input:[{role:'user',content}],max_output_tokens:1800})});
  const j=await r.json();if(!r.ok)throw Object.assign(new Error(j?.error?.message||'AI request failed.'),{status:r.status>=400&&r.status<500?r.status:502});return outputText(j);
}
function compactState(state:any){const s=state?.storage||state||{};let history:any[]=[];try{history=JSON.parse(s['wgp-v15-training-history']||'[]')}catch{}let body:any={};try{body=JSON.parse(s['wgp-v15-body-log']||'{}')}catch{}let p=null,n=null,onboarding=null;try{p=JSON.parse(s['wgp-v15-profile']||'null')}catch{}try{n=JSON.parse(s['wgp-v15-nutrition-settings']||'null')}catch{}try{onboarding=JSON.parse(s['wgp-v15-onboarding-v18']||'null')}catch{}return{profile:p,nutrition:n,recentCompleted:history.slice(-6),recentBody:Object.entries(body).slice(-10),onboarding}}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
  if(req.method!=='POST')return json(405,{ok:false,error:'Method not allowed'});
  try{
    const user=await userFromRequest(req);await enforceLimit(user.id);
    const body=await req.json().catch(()=>({}));let message=String(body.message||'').trim(),imageDataUrl=body.imageDataUrl||null,mode=String(body.mode||'coach'),threadId=body.threadId||crypto.randomUUID(),context=body.context;
    if(!message&&!imageDataUrl)return json(400,{ok:false,error:'Ask a question or attach a photo.'});
    if(message.length>8000)return json(413,{ok:false,error:'Question is too long.'});
    if(imageDataUrl&&(!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(imageDataUrl)||imageDataUrl.length>8_000_000))return json(413,{ok:false,error:'Use a JPG, PNG or WebP image under about 6 MB.'});
    if(!context){const rows=await rest(`user_state?user_id=eq.${encodeURIComponent(user.id)}&select=state`);context=compactState(rows?.[0]?.state)}
    let instructions=`You are Work + Gym Coach, an evidence-informed consumer fitness, schedule and nutrition coach. Personalize from the supplied context, but never invent logged facts. Respect work shifts, commute, sleep, recurring commitments, recovery, equipment access and chosen workout duration. Nutrition guidance should prioritize foods and cuisines the user says they already know and enjoy while fitting calorie, protein and fiber goals. Be concise and practical. Do not diagnose disease or treat estimates as medical facts. If a question requires individualized medical care, recommend an appropriate clinician. Context JSON:\n${JSON.stringify(context).slice(0,26000)}`;
    if(mode==='equipment')instructions+='\nThis request includes a gym-equipment photo. Focus on the equipment, not any person. Identify it only when reasonably confident; explain adjustments/setup, safe starting position, movement path, muscles trained, common errors, and matching exercise-library names. If uncertain, say what visible feature would distinguish it.';
    const answer=await askOpenAI(instructions,message||'Identify this gym equipment and explain how to use it safely.',imageDataUrl);
    // Only text is retained. Image bytes are intentionally not saved in chat history.
    await rest('chat_messages',{method:'POST',body:[{user_id:user.id,thread_id:threadId,role:'user',message:message||'[equipment photo]',mode},{user_id:user.id,thread_id:threadId,role:'assistant',message:answer,mode}],prefer:'return=minimal'}).catch(()=>{});
    return json(200,{ok:true,answer,threadId});
  }catch(e){return json((e as any)?.status||500,{ok:false,error:(e as Error)?.message||'Unexpected server error'})}
});
