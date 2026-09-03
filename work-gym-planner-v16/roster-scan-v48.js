// Keep the original photo on-device. Only user-highlighted sections leave it.
(function(){
 'use strict';
 let editor=null,source=null,regions=[],drag=null,request=null,generation=0,returnFocus=null,imageOwner;
 const $=selector=>editor?.querySelector(selector);
 const status=text=>{if($('#rosterScanStatusV48'))$('#rosterScanStatusV48').textContent=text};
 const active=()=>!!editor?.classList.contains('open');
 function discard(){
  generation++;request?.abort();request=null;
  if(source){source.width=source.height=1;source=null}
  regions=[];drag=null;imageOwner=undefined;
  if(editor){editor.remove();editor=null}
  returnFocus?.focus?.();returnFocus=null;
 }
 function canvas(width,height){const value=document.createElement('canvas');value.width=width;value.height=height;return value}
 async function decode(file){
  const url=URL.createObjectURL(file),img=new Image();
  try{
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{img.src='';reject(Error('Opening took too long. Try a smaller photo or screenshot.'))},15000);img.onload=()=>{clearTimeout(timer);resolve()};img.onerror=()=>{clearTimeout(timer);reject(Error('This photo format could not be opened. Please use a screenshot, JPG or PNG.'))};img.src=url});
   const scale=Math.min(1,3600/Math.max(img.naturalWidth,img.naturalHeight),Math.sqrt(9000000/(img.naturalWidth*img.naturalHeight)));
   const result=canvas(Math.max(1,Math.round(img.naturalWidth*scale)),Math.max(1,Math.round(img.naturalHeight*scale))),ctx=result.getContext('2d');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,result.width,result.height);ctx.drawImage(img,0,0,result.width,result.height);return result;
  }finally{URL.revokeObjectURL(url)}
 }
 function rect(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)}}
 function point(event){const bounds=$('#rosterCanvasV48').getBoundingClientRect();return{x:Math.max(0,Math.min(source.width,(event.clientX-bounds.left)/bounds.width*source.width)),y:Math.max(0,Math.min(source.height,(event.clientY-bounds.top)/bounds.height*source.height))}}
 function redraw(){
  if(!source||!editor)return;
  const view=$('#rosterCanvasV48');if(view.width!==source.width)view.width=source.width;if(view.height!==source.height)view.height=source.height;
  const ctx=view.getContext('2d');ctx.drawImage(source,0,0);ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(0,0,view.width,view.height);
  const list=regions.concat(drag?[rect(drag.start,drag.end)]:[]);
  for(const r of list){ctx.drawImage(source,r.x,r.y,r.w,r.h,r.x,r.y,r.w,r.h);ctx.strokeStyle='#b9f33e';ctx.lineWidth=Math.max(3,source.width/250);ctx.strokeRect(r.x,r.y,r.w,r.h)}
  $('#rosterRegionCountV48').textContent=regions.length?`${regions.length} section${regions.length===1?'':'s'} highlighted`:'Nothing selected yet';
  $('#rosterReadV48').disabled=!regions.length||!$('#rosterConfirmV48').checked||!!request;
 }
 function changed(){if($('#rosterConfirmV48'))$('#rosterConfirmV48').checked=false;$('#rosterPreviewV48')?.replaceChildren();redraw()}
 function selectedImage(){
  if(!source||!regions.length)throw Error('Highlight your row and the date headings first.');
  const left=Math.floor(Math.min(...regions.map(r=>r.x))),top=Math.floor(Math.min(...regions.map(r=>r.y))),right=Math.ceil(Math.max(...regions.map(r=>r.x+r.w))),bottom=Math.ceil(Math.max(...regions.map(r=>r.y+r.h)));
  const result=canvas(right-left,bottom-top),ctx=result.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,result.width,result.height);
  // Preserve the original row/column alignment. Unselected pixels stay white.
  for(const r of regions)ctx.drawImage(source,r.x,r.y,r.w,r.h,r.x-left,r.y-top,r.w,r.h);
  return result;
 }
 function preview(){
  if(!regions.length)return;
  const result=selectedImage();result.setAttribute('aria-label','Only these highlighted sections will be sent');
  $('#rosterPreviewV48').replaceChildren(result);
 }
 async function read(){
  if(request||!regions.length||!$('#rosterConfirmV48').checked)return;
  const account=window.WGC18,owner=account?.session?.user?.id,stamp=generation;
  const identity=$('#rosterNameV48').value.trim(),month=$('#rosterMonthV48').value;
  if(!identity){status('Enter your name or employee ID as it appears in your highlighted row.');$('#rosterNameV48').focus();return}
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)){status('Choose the month shown on the roster.');return}
  if(!owner){status('Sign in to use the photo reader. You can still type your schedule or select dates.');return}
  request=new AbortController();const controller=request;redraw();status('Preparing your selected sections…');
  let timer;
  try{
   if(!await account.ensureHealthConsent?.({interactive:true,purpose:'personalized_ai'})){status('AI reading stays off. You can still type your schedule or select dates.');return}
   if(stamp!==generation||owner!==account.session?.user?.id)return;
   const token=await account.accessToken();if(!token)throw Error('Please sign in again, then retry the photo.');
   const selected=selectedImage();let image=selected.toDataURL('image/jpeg',.94);
   if(image.length>3800000)image=selected.toDataURL('image/jpeg',.78);
   selected.width=selected.height=1;
   if(image.length>3800000)throw Error('Highlight a smaller section. Try one week at a time.');
   if(stamp!==generation||owner!==account.session?.user?.id)return;
   status('Reading your shifts… This can take up to a minute.');
   timer=setTimeout(()=>controller.abort('timeout'),55000);
   const response=await fetch(((window.WGPNative&&window.WGPNative.apiBase)||'')+'/api/v25/roster-scan',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({image,identity,month,confirmed:true})});
   image='';
   const body=await response.json().catch(()=>({}));
   if(stamp!==generation||owner!==account.session?.user?.id)return;
   if(response.status===428){await account.refreshHealthConsent?.();throw Error('Your privacy choice needs updating. Tap Read my shifts to review it.')}
   if(!response.ok||body.ok===false)throw Error(body.error||(response.status===413?'Choose a smaller section and try again.':'The photo reader is unavailable. Please try again.'));
   if(!window.WWV25?.reviewRosterVision?.(body))throw Error('The calendar preview could not open. Please refresh and try again.');
   discard();
  }catch(error){
   if(stamp!==generation)return;
   status(controller.signal.aborted?'Reading took too long. Try one week at a time.':error instanceof TypeError?'Connection lost. Your calendar has not changed. Please try again.':error.message);
   // Report only a fixed code, never the image, name, provider text or filename.
   window.WWObservability?.capture?.('roster_photo_read',null,{name:'RosterPhotoReadError',message:'Roster photo reading did not finish'});
  }finally{clearTimeout(timer);if(request===controller)request=null;if(stamp===generation)redraw()}
 }
 function mount(){
  editor=document.createElement('div');editor.id='rosterScanDialogV48';editor.className='modal open';editor.setAttribute('role','dialog');editor.setAttribute('aria-modal','true');editor.setAttribute('aria-labelledby','rosterScanTitleV48');
  editor.innerHTML=`<div class="sheet rosterScanSheetV48"><header><div><small>PHOTO → CALENDAR</small><h2 id="rosterScanTitleV48">Highlight your schedule</h2></div><button type="button" data-roster-close aria-label="Cancel roster scan">✕</button></header>
   <p>Drag over <b>your name and shifts</b>, then the <b>date headings</b>. Add the shift-code key if needed. Leave other people out.</p>
   <div class="rosterScanFieldsV48"><label>Your name or employee ID<input id="rosterNameV48" maxlength="100" autocomplete="off"></label><label>Month shown on roster<input id="rosterMonthV48" type="month" required></label></div>
   <div class="rosterScanToolsV48"><button type="button" id="rosterRotateV48">Rotate ↻</button><button type="button" id="rosterUndoV48">Undo highlight</button><button type="button" id="rosterAllV48">Photo is only mine</button></div>
   <div class="rosterCanvasWrapV48"><canvas id="rosterCanvasV48" aria-label="Roster photo. Drag to highlight your row and date headings."></canvas></div>
   <p id="rosterRegionCountV48" role="status">Nothing selected yet</p>
   <details><summary>Adjust a highlight precisely</summary><p>Set the edges as percentages of the photo, then add the section.</p><div class="rosterScanEdgesV48"><label>Left<input data-edge="x" type="number" min="0" max="99" value="0"></label><label>Top<input data-edge="y" type="number" min="0" max="99" value="0"></label><label>Right<input data-edge="right" type="number" min="1" max="100" value="100"></label><label>Bottom<input data-edge="bottom" type="number" min="1" max="100" value="20"></label></div><button type="button" id="rosterAddAreaV48">Add section</button></details>
   <button type="button" id="rosterPreviewButtonV48">Preview what will be sent</button><div id="rosterPreviewV48"></div>
   <label class="rosterScanConsentV48"><input id="rosterConfirmV48" type="checkbox"><span>Only my schedule and its headings are highlighted. I agree to send these sections to OpenAI to read my shifts.</span></label>
   <p class="rosterScanPrivacyV48">The original photo stays on this device. Work + Workout does not save the selected image. <a target="_blank" rel="noopener noreferrer" id="rosterPrivacyV48">Privacy details</a></p>
   <p id="rosterScanStatusV48" role="status" aria-live="polite"></p><footer><button type="button" data-roster-close>Cancel</button><button class="primary" id="rosterReadV48" type="button" disabled>Read my shifts</button></footer></div>`;
  document.body.appendChild(editor);
  const profileValue=typeof profile==='function'?profile():{};
  $('#rosterNameV48').value=document.getElementById('rosterIdentityV31')?.value||profileValue?.rosterIdentity||profileValue?.name||'';
  const date=typeof calView!=='undefined'&&calView instanceof Date?calView:new Date();
  $('#rosterMonthV48').value=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  $('#rosterPrivacyV48').href=(typeof window.productPage==='function'?window.productPage('privacy.html'):new URL('../work-gym-planner/privacy.html',location.href).href)+'#roster';
  editor.querySelectorAll('[data-roster-close]').forEach(button=>button.onclick=discard);
  editor.addEventListener('click',event=>{if(event.target===editor)discard()});
  const view=$('#rosterCanvasV48');
  view.onpointerdown=event=>{if(request||regions.length>=8)return;event.preventDefault();drag={start:point(event),end:point(event)};view.setPointerCapture(event.pointerId)};
  view.onpointermove=event=>{if(drag){drag.end=point(event);redraw()}};
  view.onpointerup=event=>{if(!drag)return;const r=rect(drag.start,point(event));drag=null;if(r.w>5&&r.h>5)regions.push(r);changed()};
  view.onpointercancel=()=>{drag=null;redraw()};
  $('#rosterUndoV48').onclick=()=>{if(!request){regions.pop();changed()}};
  $('#rosterAllV48').onclick=()=>{if(!request){regions=[{x:0,y:0,w:source.width,h:source.height}];changed();status('Use this only for a photo of your own schedule. If others are visible, undo and highlight your row instead.')}};
  $('#rosterRotateV48').onclick=()=>{if(request)return;const rotated=canvas(source.height,source.width),ctx=rotated.getContext('2d');ctx.translate(rotated.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(source,0,0);source.width=source.height=1;source=rotated;regions=[];changed()};
  $('#rosterAddAreaV48').onclick=()=>{
   if(request||regions.length>=8)return;const values={};editor.querySelectorAll('[data-edge]').forEach(input=>values[input.dataset.edge]=Number(input.value));
   if(Object.values(values).some(value=>!Number.isFinite(value)||value<0||value>100)||values.right<=values.x||values.bottom<=values.y){status('The right and bottom edges must be beyond the left and top edges.');return}
   regions.push({x:source.width*values.x/100,y:source.height*values.y/100,w:source.width*(values.right-values.x)/100,h:source.height*(values.bottom-values.y)/100});changed();
  };
  $('#rosterPreviewButtonV48').onclick=preview;$('#rosterConfirmV48').onchange=()=>{preview();redraw()};$('#rosterReadV48').onclick=read;
  editor.addEventListener('keydown',event=>{
   if(event.key!=='Tab'||document.getElementById('healthConsentDialog')?.classList.contains('open'))return;
   const items=[...editor.querySelectorAll('button:not(:disabled),input,a[href],summary')].filter(item=>item.getClientRects().length),first=items[0],last=items.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  });
  redraw();$('[data-roster-close]').focus();
 }
 async function openFile(file,input){
  discard();returnFocus=input||document.activeElement;imageOwner=window.WGC18?.session?.user?.id||null;
  const stamp=generation,importStatus=document.getElementById('scheduleImportStatusV24');
  const message=text=>{if(importStatus)importStatus.textContent=text};
  if(!file)return;
  if(file.size>20*1024*1024){message('Choose a photo under 20 MB.');if(input)input.value='';return}
  message('Opening your photo…');
  try{const image=await decode(file);if(stamp!==generation){image.width=image.height=1;return}source=image;mount();message('Highlight your row and dates. Nothing is added until you approve it.')}catch(error){message(error.message)}finally{if(input)input.value=''}
 }
 // Capture before the legacy element handlers so a photo is never also sent
 // through the blocked WebAssembly OCR worker. PDF text reading stays local.
 document.addEventListener('change',event=>{
  const input=event.target;if(!['scheduleCameraV24','scheduleFileV24'].includes(input.id))return;
  const file=input.files?.[0];if(!file||file.type==='application/pdf'||/\.pdf$/i.test(file.name))return;
  event.stopImmediatePropagation();event.preventDefault();openFile(file,input);
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active()&&!document.getElementById('healthConsentDialog')?.classList.contains('open')){event.stopImmediatePropagation();event.preventDefault();discard()}},true);
 window.addEventListener('wgc:authchange',()=>{if(imageOwner!==undefined&&imageOwner!==(window.WGC18?.session?.user?.id||null))discard()});
 window.addEventListener('pagehide',discard);
 window.WWRosterScanV48={openFile,discard};
})();
