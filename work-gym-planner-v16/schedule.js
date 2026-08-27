// Variable work schedule editor / OCR --------------------------------------
function openBellevue(){let ym=dkey().slice(0,7);$('#bMonth').value=ym;loadBDraft(ym);openModal('bellevueDialog')}
function loadBDraft(ym){let saved=variableMonth(ym),days=daysInMonth(ym);bDraft={};bConfidence={};for(let i=1;i<=days;i++){bDraft[i]=saved?.[i]||'?';bConfidence[i]=saved?100:null}renderBReview();renderSavedMonths();bPhotoFile=null;bRotation=0;$('#bPhotoPreview').classList.add('hidden');$('#bScanStatus').textContent='Missing days are UNKNOWN and are never treated as days off. Review every code before saving.'}
function renderBReview(){if(!bDraft)return;$('#bReview').innerHTML=Object.entries(bDraft).map(([n,c])=>{let cf=bConfidence[n],low=cf!=null&&cf<75;return`<button data-bday="${n}" class="${c==='?'?'q':c.toLowerCase()} ${low?'lowConfidence':''}" aria-label="Day ${n}: ${c==='?'?'Unknown':c}${cf!=null?`, OCR confidence ${Math.round(cf)} percent`:''}">${n}<br>${c}${cf!=null?`<small>${Math.round(cf)}%</small>`:''}</button>`}).join('');$$('[data-bday]').forEach(b=>b.onclick=()=>{let n=+b.dataset.bday,seq=['?','X','D','H'],cur=bDraft[n]||'?';bDraft[n]=seq[(seq.indexOf(cur)+1)%seq.length];bConfidence[n]=100;renderBReview()})}
function saveBMonth(){let ym=$('#bMonth').value;if(!ym||!bDraft)return;let pack={};for(const [d,c] of Object.entries(bDraft))pack[d]=c;jset(K.bellevue+ym,pack);closeModal('bellevueDialog');renderAll();toast('Schedule month saved')}
function renderSavedMonths(){let a=[];for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(k?.startsWith(K.bellevue))a.push(k.slice(K.bellevue.length))}a.sort();$('#savedMonths').innerHTML=a.map(ym=>`<button data-savedmonth="${ym}">${ym}</button>`).join('');$$('[data-savedmonth]').forEach(b=>b.onclick=()=>{$('#bMonth').value=b.dataset.savedmonth;loadBDraft(b.dataset.savedmonth)})}
async function rotatedPhotoBlob(){if(!bPhotoFile||!bRotation)return bPhotoFile;let bmp=await createImageBitmap(bPhotoFile),c=document.createElement('canvas'),ctx=c.getContext('2d'),r=bRotation%360;if(r===90||r===270){c.width=bmp.height;c.height=bmp.width}else{c.width=bmp.width;c.height=bmp.height}ctx.translate(c.width/2,c.height/2);ctx.rotate(r*Math.PI/180);ctx.drawImage(bmp,-bmp.width/2,-bmp.height/2);return new Promise(res=>c.toBlob(res,'image/jpeg',.92))}
const TESSERACT_OPTIONS=window.TESSERACT_OPTIONS={workerPath:'/work-gym-planner-v16/vendor/tesseract/worker.min.js',corePath:'/work-gym-planner-v16/vendor/tesseract-core',langPath:'https://tessdata.projectnaptha.com/4.0.0'};
async function loadTesseract(){if(window.Tesseract)return true;return new Promise(resolve=>{let s=document.createElement('script');s.src='/work-gym-planner-v16/vendor/tesseract/tesseract.min.js';s.onload=()=>resolve(!!window.Tesseract);s.onerror=()=>resolve(false);document.head.appendChild(s)})}
function wordText(w){return String(w.text||'').trim()}
function wordCenter(w){return{x:(w.bbox.x0+w.bbox.x1)/2,y:(w.bbox.y0+w.bbox.y1)/2,h:Math.max(1,w.bbox.y1-w.bbox.y0)}}
function findNameWord(words){let p=profile(),tokens=String(p?.name||'').toLowerCase().split(/\s+/).filter(x=>x.length>=2);if(!tokens.length)return null;let hits=words.filter(w=>tokens.some(t=>wordText(w).toLowerCase().includes(t)));if(!hits.length)return null;return hits.sort((a,b)=>(+b.confidence||0)-(+a.confidence||0))[0]}
function headerDates(words,rowY,days){let candidates=words.map(w=>({w,n:+wordText(w).replace(/\D/g,''),...wordCenter(w)})).filter(x=>x.n>=1&&x.n<=days&&x.y<rowY-4);if(candidates.length<8)return[];
 let bands=[];for(const c of candidates){let band=bands.find(b=>Math.abs(b.y-c.y)<Math.max(10,c.h*1.2));if(!band){band={y:c.y,a:[]};bands.push(band)}band.a.push(c);band.y=band.a.reduce((s,x)=>s+x.y,0)/band.a.length}bands.sort((a,b)=>b.a.length-a.a.length);let best=bands[0]?.a||[];let byDay=new Map();for(const c of best){let old=byDay.get(c.n);if(!old||(+c.w.confidence||0)>(+old.w.confidence||0))byDay.set(c.n,c)}return [...byDay.values()].sort((a,b)=>a.n-b.n)}
function mapSymbolsToDays(words,nameHit,days){let nc=wordCenter(nameHit),rowY=nc.y,rowH=nc.h,headers=headerDates(words,rowY,days),symbols=words.map(w=>{let t=wordText(w).toUpperCase().replace(/[^XDH]/g,''),c=wordCenter(w);return{w,t,...c}}).filter(x=>/^[XDH]$/.test(x.t)&&Math.abs(x.y-rowY)<Math.max(18,rowH*1.25)&&x.x>nc.x+20).sort((a,b)=>a.x-b.x);let out={};
 if(headers.length>=Math.min(15,Math.floor(days*.55))){for(const s of symbols){let nearest=headers.reduce((best,h)=>!best||Math.abs(h.x-s.x)<Math.abs(best.x-s.x)?h:best,null);if(!nearest)continue;let spacings=headers.slice(1).map((h,i)=>h.x-headers[i].x).filter(x=>x>2),median=spacings.sort((a,b)=>a-b)[Math.floor(spacings.length/2)]||40,dist=Math.abs(nearest.x-s.x),geo=clamp(100-dist/Math.max(8,median)*60,20,100),conf=clamp((+s.w.confidence||50)*.65+geo*.35,0,100);if(!out[nearest.n]||conf>out[nearest.n].confidence)out[nearest.n]={code:s.t,confidence:conf}}return{out,mode:'date-mapped',headers:headers.length,symbols:symbols.length}}
 return{out:{},mode:'review-only',headers:headers.length,symbols:symbols.length,sequence:symbols.map(s=>({code:s.t,confidence:+s.w.confidence||50}))}
}
function offerOcrRawReview(text,message){let status=$('#bScanStatus');if(!status)return;status.innerHTML=`${esc(message)} <button type="button" id="bReviewOcrText">Review extracted text</button>`;$('#bReviewOcrText').onclick=()=>{closeModal('bellevueDialog');page('home');setTimeout(()=>{if(!window.WGC19?.reviewRawText?.(text))toast('Open Quick Plan and paste the extracted schedule text')},80)}}
async function scanSchedulePhoto(){
 if(!bPhotoFile)return $('#bScanStatus').textContent='Choose a schedule photo first.';
 if(!(await loadTesseract()))return $('#bScanStatus').textContent='OCR assistant could not load. Use the manual review grid.';
 $('#bScan').disabled=true;$('#bScanStatus').textContent='Scanning photo locally in this browser. The photo is not saved…';
 try{
  let blob=await rotatedPhotoBlob(),res=await Tesseract.recognize(blob,'eng',{...TESSERACT_OPTIONS,logger:m=>{if(m.status==='recognizing text')$('#bScanStatus').textContent=`Scanning… ${Math.round((m.progress||0)*100)}%`}}),words=res.data.words||[],rawText=String(res.data.text||'').trim(),nameHit=findNameWord(words),days=daysInMonth($('#bMonth').value);
  if(!nameHit){
   let parsed=window.WGC19?.parseRawInput?.(rawText)||[],reviewable=parsed.some(item=>!item.needsReview);
   if(reviewable)offerOcrRawReview(rawText,`The grid layout was not reliable enough to auto-map dates. Nothing was changed.`);
   else $('#bScanStatus').textContent=`OCR could not confidently find ${profile()?.name||'the profile name'} or dated shifts. No dates were changed.`;
   return
  }
  let mapped=mapSymbolsToDays(words,nameHit,days),applied=0,low=0;
  for(const [d,v] of Object.entries(mapped.out)){if(v.confidence>=55){bDraft[d]=v.code;bConfidence[d]=v.confidence;applied++;if(v.confidence<75)low++}}
  renderBReview();
  if(applied)$('#bScanStatus').textContent=`Mapped ${applied} X/D/H cells to specific calendar dates using the date header. ${low?`${low} low-confidence date${low===1?'':'s'} are outlined for review. `:''}Review every date before Save.`;
  else if(rawText&&window.WGC19?.parseRawInput?.(rawText).some(item=>!item.needsReview))offerOcrRawReview(rawText,`The name row was found, but its columns could not be mapped safely. Nothing was overwritten.`);
  else $('#bScanStatus').textContent=`OCR found the name row and ${mapped.symbols} schedule symbols, but could not map them safely to date columns. Nothing was overwritten. Rotate/crop the image or use the review grid.`;
 }catch(e){console.error(e);$('#bScanStatus').textContent='OCR could not reliably read this photo. No schedule data was overwritten.'}
 finally{$('#bScan').disabled=false}
}
