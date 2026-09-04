function normalizeOFF(p){return window.WGCFoodPortions.normalizeOFF(p)}
function foodResult(p,index=0){let F=window.WGCFoodPortions,q=F.totalNutrition(p).cal,known=F.number(p.per100?.cal)!==null;return'<div class="foodResultRow"><button type="button" class="foodResultSelect" data-result-index="'+index+'"><span>'+(p.img?'<img src="'+esc(p.img)+'" alt="">':'<span class="ph">◉</span>')+'</span><span><b>'+esc(p.name)+'</b><small>'+esc(p.brand||p.source)+' · '+esc(foodAmountLabel(p))+'</small></span><strong>'+(p.needsNutritionCheck?'Check label':known?Math.round(q)+' kcal':'Calories needed')+'</strong></button><button type="button" class="foodQuickAdd" data-quick-add-index="'+index+'" aria-label="Quick add '+esc(p.name)+'">+</button></div>'}
let lastSearchProducts=[],foodSearchRequest=0,foodSearchTimer=null,mealScanImageDataUrl='',foodSearchController=null,barcodeLookupTask=null,mealScanTask=null,mealScanPreparation=0,lastFoodRemoteSearch=0,lastBarcodeLookup=0;
const packagedFoodCache=new Map();
async function foodRequest(url,signal){
 const result=window.WWObservability?.request?await window.WWObservability.request(url,{signal},{readText:true,timeoutMs:12000}):await fetch(url,{signal}).then(async response=>({response,text:await response.text()}));
 if(!result.response.ok)throw Object.assign(Error(result.response.status===429?'Packaged-food search is busy. Please wait a minute or use Quick add.':'Food search is temporarily unavailable. Use the available foods or Quick add.'),{status:result.response.status});
 return JSON.parse(result.text);
}
function clearFoodSearch({restore=true}={}){foodSearchRequest++;foodSearchController?.abort();foodSearchController=null;barcodeLookupTask?.controller.abort();barcodeLookupTask=null;clearTimeout(foodSearchTimer);lastSearchProducts=[];let input=$('foodSearchInput'),results=$('foodSearchResults'),clear=$('clearFoodSearch');if(input)input.value='';if(results){results.innerHTML='';results.hidden=true}if(clear)clear.hidden=true;if(restore&&$('#foodDialog')?.classList.contains('open')&&!foodState.editId)foodTab(foodState.libraryTab||'history')}
function showFoodSearchResults(){stopBarcode();$('foodEntryEditor').hidden=true;$$('#foodDialog [data-food-pane]').forEach(p=>{p.hidden=true;p.classList.remove('active')});$('foodSearchResults').hidden=false;$('clearFoodSearch').hidden=false;renderFoodBatch()}
async function searchFood({remote=true}={}){
 clearTimeout(foodSearchTimer);let input=$('foodSearchInput'),q=input.value.trim();if(!q)return clearFoodSearch();
 foodSearchController?.abort();const controller=new AbortController();foodSearchController=controller;
 let request=++foodSearchRequest;showFoodSearchResults();
 let built=[...myFoods().filter(x=>x.name?.toLowerCase().includes(q.toLowerCase())).slice(0,5),...builtinFoodMatches(q)],seen=new Set;
 built=built.filter(x=>{let key=String(x.code||x.name).toLowerCase();if(seen.has(key))return false;seen.add(key);return true});
 const display=(items,note='')=>{lastSearchProducts=items;$('foodSearchResults').innerHTML=items.map(foodResult).join('')+(note?'<p class="foodSearchStatus">'+esc(note)+'</p>':'');bindFoodResults()};
 lastSearchProducts=built;display(built,remote?'Checking packaged foods…':'Tap Search for packaged foods.');bindFoodResults();
 if(!remote)return;
 if(q.length<2)return display(built,'Type at least two letters to search packaged foods.');
 try{
  const cacheKey=q.toLowerCase();let j=packagedFoodCache.get(cacheKey);
  if(!j){
   // Open Food Facts limits search to 10 requests/minute. Never search remotely on each keystroke.
   if(Date.now()-lastFoodRemoteSearch<6500)return display(built,'Please wait a few seconds before searching again. These foods and Quick add are still available.');
   lastFoodRemoteSearch=Date.now();
   let fields='code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit,product_quantity_unit,quantity,image_front_small_url',u=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${fields}`;
   j=await foodRequest(u,controller.signal);
   packagedFoodCache.set(cacheKey,j);if(packagedFoodCache.size>20)packagedFoodCache.delete(packagedFoodCache.keys().next().value);
  }
  if(request!==foodSearchRequest||input.value.trim()!==q||controller.signal.aborted)return;
  let off=(j.products||[]).map(normalizeOFF).filter(x=>x.name).filter(x=>{let key=String(x.code||x.name).toLowerCase();if(seen.has(key))return false;seen.add(key);return true});
  display([...built,...off],!built.length&&!off.length?'No matching foods found. Try a simpler name or Quick add.':'');
 }catch(error){
  if(request!==foodSearchRequest||input.value.trim()!==q||controller.signal.aborted)return;
  display(built,error.status===429?error.message:'Packaged-food search is unavailable. Your saved foods and Quick add still work.');
 }finally{if(foodSearchController===controller)foodSearchController=null}
}
function bindFoodResults(){$$('#foodSearchResults [data-result-index]').forEach(b=>b.onclick=()=>setFoodBase(lastSearchProducts[+b.dataset.resultIndex]));$$('#foodSearchResults [data-quick-add-index]').forEach(b=>b.onclick=()=>queueFoodProduct(lastSearchProducts[+b.dataset.quickAddIndex]))}
async function lookupBarcode(code){
 code=String(code||'').replace(/[\s-]/g,'');
 if(!/^(?:\d{8}|\d{12,14})$/.test(code))return setBarcodeStatus('Enter the full 8, 12, 13 or 14-digit barcode, or search by food name.');
 if(barcodeLookupTask?.code===code)return;
 if(Date.now()-lastBarcodeLookup<4200)return setBarcodeStatus('Please wait a few seconds before scanning another barcode.');
 barcodeLookupTask?.controller.abort();const task={code,controller:new AbortController()};barcodeLookupTask=task;lastBarcodeLookup=Date.now();
 setBarcodeStatus('Looking up '+code+' in Open Food Facts…');
 try{
  let fields='code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit,product_quantity_unit,quantity,image_front_small_url',j=await foodRequest(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`,task.controller.signal);
  if(barcodeLookupTask!==task||task.controller.signal.aborted)return;
  if(j.status===1&&j.product){setFoodBase(normalizeOFF({...j.product,code}));setBarcodeStatus('✓ Product found. Review the serving and nutrition values.');stopBarcode()}
  else setBarcodeStatus('Barcode read, but this product was not found. Search by food name or use Quick add.');
 }catch(error){if(barcodeLookupTask===task&&!task.controller.signal.aborted)setBarcodeStatus('Barcode search is unavailable. Try again, search by food name or use Quick add.')}
 finally{if(barcodeLookupTask===task)barcodeLookupTask=null}
}
function setBarcodeStatus(t){$('#barcodeStatus').textContent=t}
const SCANNER_URL='/work-gym-planner-v16/vendor/html5-qrcode/html5-qrcode.min.js';
async function ensureScanner(){if(window.Html5Qrcode)return true;return new Promise(resolve=>{let s=document.createElement('script');s.src=SCANNER_URL;s.onload=()=>resolve(!!window.Html5Qrcode);s.onerror=()=>resolve(false);document.head.appendChild(s)})}
let nativeBarcodeStream=null,nativeBarcodeTimer=null;
async function nativeBarcodeDetector(){if(!('BarcodeDetector' in window))return null;try{let wanted=['ean_13','ean_8','upc_a','upc_e'];let supported=BarcodeDetector.getSupportedFormats?await BarcodeDetector.getSupportedFormats():wanted,formats=wanted.filter(x=>supported.includes(x));return new BarcodeDetector(formats.length?{formats}:undefined)}catch{return null}}
async function startBarcode(){await stopBarcode();if(!navigator.mediaDevices?.getUserMedia){setBarcodeStatus('Live camera is blocked in this in-app browser. Open the planner in Safari or the Home Screen app, then retry. Photo barcode scanning can still be used here.');return}let native=await nativeBarcodeDetector();if(native){try{let v=document.createElement('video');v.playsInline=true;v.muted=true;v.style.width='100%';v.style.maxHeight='260px';v.style.objectFit='cover';$('#barcodeReader').appendChild(v);nativeBarcodeStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});v.srcObject=nativeBarcodeStream;await v.play();setBarcodeStatus('Camera ready. Center the full UPC/EAN barcode and hold steady.');nativeBarcodeTimer=setInterval(async()=>{try{let r=await native.detect(v),code=r?.[0]?.rawValue;if(code){await stopBarcode();lookupBarcode(code)}}catch{}},300);return}catch{await stopBarcode()}}
 if(!(await ensureScanner())){setBarcodeStatus('Barcode scanner fallback could not load. Check internet and retry.');return}try{barcodeScanner=new Html5Qrcode('barcodeReader');await barcodeScanner.start({facingMode:'environment'},{fps:10,qrbox:{width:280,height:140},formatsToSupport:window.Html5QrcodeSupportedFormats?[Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E]:undefined},txt=>lookupBarcode(txt),()=>{});setBarcodeStatus('Camera ready. Center the full barcode in the box and hold steady.')}catch(e){setBarcodeStatus('Live scan could not start. Use Safari/Home Screen or scan a barcode photo.') }}
async function stopBarcode(){if(nativeBarcodeTimer){clearInterval(nativeBarcodeTimer);nativeBarcodeTimer=null}if(nativeBarcodeStream){nativeBarcodeStream.getTracks().forEach(t=>t.stop());nativeBarcodeStream=null}if(barcodeScanner){try{if(barcodeScanner.isScanning)await barcodeScanner.stop();await barcodeScanner.clear()}catch{}barcodeScanner=null}if($('#barcodeReader'))$('#barcodeReader').innerHTML=''}
async function scanBarcodePhoto(file){if(!file)return;await stopBarcode();setBarcodeStatus('Reading barcode from photo…');let native=await nativeBarcodeDetector();if(native){try{let bmp=await createImageBitmap(file),r=await native.detect(bmp),code=r?.[0]?.rawValue;bmp.close?.();if(code){$('#barcodePhoto').value='';return lookupBarcode(code)}}catch{}}
 if(!(await ensureScanner())){setBarcodeStatus('Barcode scanner fallback could not load.');$('#barcodePhoto').value='';return}try{barcodeScanner=new Html5Qrcode('barcodeReader');let txt=await barcodeScanner.scanFile(file,true);await lookupBarcode(txt)}catch{setBarcodeStatus('No UPC/EAN barcode could be read. Retake the photo closer, sharp, and with the entire barcode visible.')}finally{try{await barcodeScanner?.clear()}catch{}barcodeScanner=null;$('#barcodePhoto').value=''}}
function renderRecentFoods(){renderNutritionLibrary()}
function renderSavedFoods(){let host=$('savedFoodResults');if(!host)return;let q=($('#savedFoodSearch')?.value||'').toLowerCase(),a=myFoods().filter(x=>!q||x.name.toLowerCase().includes(q));host.innerHTML=a.length?a.map((x,i)=>`<article class="nutritionLibraryCard"><div class="nutritionLibraryIcon">F</div><button type="button" class="nutritionLibrarySelect" data-saved="${i}"><small>${esc(x.source||'Saved food')}</small><b>${esc(x.name)}</b><p>${esc(foodAmountLabel(x))} · ${Math.round(window.WGCFoodPortions.totalNutrition(x).cal)} kcal</p></button><button type="button" class="nutritionLibraryAdd" data-saved-add="${i}" aria-label="Add ${esc(x.name)}">+</button></article>`).join(''):nutritionEmpty('No saved foods','Choose “Save/update in My Foods” when logging a food.');$$('[data-saved]').forEach(b=>b.onclick=()=>setFoodBase(a[+b.dataset.saved]));$$('[data-saved-add]').forEach(b=>b.onclick=()=>queueFoodProduct(a[+b.dataset.savedAdd]))}
function renderRecipes(){let host=$('recipeResults');if(!host)return;let a=recipes();host.innerHTML=a.length?a.map((r,i)=>{let q=nutritionMealSummary(r.items||[]);return`<article class="nutritionLibraryCard"><div class="nutritionLibraryIcon">R</div><div><small>${esc(r.items?.[0]?.meal||'Meal')} recipe</small><b>${esc(r.name)}</b><p>${r.items.length} foods · ${Math.round(q.cal)} kcal · ${Math.round(q.p)}g protein</p></div><button type="button" class="nutritionLibraryAdd" data-recipe="${i}" aria-label="Add ${esc(r.name)}">+</button></article>`}).join(''):nutritionEmpty('No recipes saved','Use “Save meal” on the diary to create a reusable recipe.');$$('[data-recipe]').forEach(b=>b.onclick=()=>{let r=a[+b.dataset.recipe];stageFoodItems(r.items,r.name)})}

function mealScanFileData(file){return new Promise((resolve,reject)=>{let reader=new FileReader;reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read this photo.'));reader.readAsDataURL(file)})}
async function prepareMealScan(file){resetMealScan();if(!file)return;const preparation=mealScanPreparation,owner=window.WGC18?.session?.user?.id;const current=()=>preparation===mealScanPreparation&&owner===window.WGC18?.session?.user?.id;if(!/^image\/(?:jpeg|png|webp)$/i.test(file.type||''))return setMealScanStatus('Use a JPG, PNG or WebP photo.',true);if(file.size>12_000_000)return setMealScanStatus('Choose a meal photo under 12 MB.',true);try{let raw=await mealScanFileData(file);if(!current())return;let img=new Image;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('This image could not be opened.'));img.src=raw});if(!current())return;let scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);mealScanImageDataUrl=canvas.toDataURL('image/jpeg',.84);$('mealScanPreview').innerHTML=`<img src="${mealScanImageDataUrl}" alt="Meal photo ready to analyze">`;$('mealScanPreview').hidden=false;$('analyzeMealPhoto').disabled=false;setMealScanStatus('Photo ready. AI estimates can be wrong; review every food before saving.')}catch(e){if(current())setMealScanStatus(e.message||'Could not prepare this photo.',true)}}
function setMealScanStatus(message,error=false){let el=$('mealScanStatus');if(!el)return;el.textContent=message;el.classList.toggle('error',error)}
function resetMealScan(){mealScanPreparation++;mealScanTask?.controller.abort();mealScanTask=null;mealScanImageDataUrl='';let input=$('mealScanPhoto'),preview=$('mealScanPreview'),button=$('analyzeMealPhoto');if(input)input.value='';if(preview){preview.innerHTML='';preview.hidden=true}if(button){button.disabled=true;button.textContent='Analyze meal'}if($('mealScanStatus'))setMealScanStatus('The photo is sent to OpenAI for this analysis only and is not saved by Work + Workout.')}
async function analyzeMealPhoto(){
 if(mealScanTask)return;
 if(!mealScanImageDataUrl)return setMealScanStatus('Take or choose a meal photo first.',true);
 let A=window.WGC18;if(!A?.session)return setMealScanStatus('Sign in to use Meal Scan.',true);
 const task={controller:new AbortController(),photo:mealScanImageDataUrl,owner:A.session.user.id};mealScanTask=task;
 let button=$('analyzeMealPhoto');button.disabled=true;button.textContent='Analyzing…';setMealScanStatus('Identifying the visible foods and estimating portions…');
 try{
  if(typeof A.ensureHealthConsent!=='function'||!await A.ensureHealthConsent({interactive:true,purpose:'meal_scan_ai'}))throw Error('Meal Scan is off in your saved privacy choices. You can change this in Profile → Account & privacy.');
  if(mealScanTask!==task||A.session?.user?.id!==task.owner||task.controller.signal.aborted)return;
  if(!await A.ensureAICredits?.('meal'))return;
  if(mealScanTask!==task||A.session?.user?.id!==task.owner||task.controller.signal.aborted)return;
  let j=await A.authedFetch('meal-scan',{method:'POST',signal:task.controller.signal,body:JSON.stringify({imageDataUrl:task.photo})});
  if(mealScanTask!==task||A.session?.user?.id!==task.owner||task.controller.signal.aborted)return;
  let products=(j.items||[]).map(x=>({name:x.name,brand:'',code:'',source:'AI meal scan estimate',defaultGrams:x.defaultGrams,per100:x.per100,img:''}));
  if(!products.length)throw Error('No foods could be identified confidently. Try a clearer overhead photo.');
  stageFoodItems(products.map(foodDraftFromProduct),'Meal Scan');let count=products.length;resetMealScan();foodTab('history');toast(`${count} estimated ${count===1?'food':'foods'} ready to review`);
 }catch(error){
  if(mealScanTask!==task||A.session?.user?.id!==task.owner||task.controller.signal.aborted)return;
  const connection=['NETWORK_ERROR','NETWORK_OFFLINE','REQUEST_TIMEOUT'].includes(error.code)||error.name==='TypeError';
  setMealScanStatus(connection?'Meal Scan could not connect. Your photo is still here—check your connection and tap Try again.':error.message||'Meal Scan could not analyze this photo.',true);
 }finally{if(mealScanTask===task){if(A.session?.user?.id!==task.owner)resetMealScan();else{mealScanTask=null;button.disabled=false;button.textContent='Try again'}}}
}
