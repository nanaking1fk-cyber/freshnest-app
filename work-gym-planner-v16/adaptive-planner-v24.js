// Work + Workout 24.0 — adaptive calendar intake and effortless life planning.
(function adaptivePlannerV24(){
  'use strict';
  var PDF_MODULE='/work-gym-planner-v16/vendor/pdfjs/pdf.min.mjs';
  var PDF_WORKER='/work-gym-planner-v16/vendor/pdfjs/pdf.worker.min.mjs';
  var mounting=false;

  function heroMarkup(){
    return '<section id="calendarUtilityV24" class="calendarUtilityV24" aria-labelledby="calendarUtilityTitle">'+
      '<div class="calendarUtilityCopy"><small>LIFE CALENDAR</small><h1 id="calendarUtilityTitle">Drop in your schedule.<br><em>We organize the rest.</em></h1><p>Work shifts, training, meals, appointments and to-dos become one practical day plan—built around your life, not a preset job template.</p><div class="calendarUtilityProof"><span>Private by default</span><span>Review before save</span><span>Adapts per user</span></div></div>'+
      '<div class="calendarUtilityFlow" aria-label="How schedule planning works"><span><b>01</b><i>PASTE OR UPLOAD</i><small>Text, voice, photo or PDF</small></span><span><b>02</b><i>REVIEW</i><small>Confirm dates and reminders</small></span><span><b>03</b><i>LIVE YOUR PLAN</i><small>Work, health and life together</small></span></div>'+
    '</section>';
  }

  function importMarkup(){
    return '<div id="scheduleImportV24" class="scheduleImportV24">'+
      '<div><b>Import a master schedule</b><small>Use the format you already have. We extract the text locally, then let you review every item.</small></div>'+
      '<div class="scheduleImportButtons">'+
        '<label><span aria-hidden="true">⌁</span> Take a photo<input id="scheduleCameraV24" type="file" accept="image/*" capture="environment"></label>'+
        '<label><span aria-hidden="true">＋</span> Upload photo or PDF<input id="scheduleFileV24" type="file" accept="image/*,application/pdf,.pdf"></label>'+
      '</div>'+
      '<p id="scheduleImportStatusV24" role="status">Nothing is added until you review and approve it.</p>'+
    '</div>';
  }

  function toolbarMarkup(){
    return '<div id="calendarActionBarV24" class="calendarActionBarV24" aria-label="Calendar quick actions">'+
      '<button id="calendarTodayV24"><span>Today</span><small>Jump back</small></button>'+
      '<button id="calendarTodoV24"><span>Add a to-do</span><small>Any task or errand</small></button>'+
      '<button id="calendarImportV24"><span>Import schedule</span><small>Text, photo or PDF</small></button>'+
    '</div>';
  }

  function setStatus(message,bad){
    var status=document.getElementById('scheduleImportStatusV24');
    if(!status)return;
    status.textContent=message;
    status.classList.toggle('bad',!!bad);
  }

  function showCalendar(focusInput){
    if(typeof window.page==='function')window.page('calendar');
    else document.querySelector('.bottomNav [data-page="calendar"]')?.click();
    window.setTimeout(function(){
      mount();
      var target=document.getElementById('smartCaptureV19')||document.getElementById('calendarUtilityV24');
      target?.scrollIntoView({behavior:'smooth',block:'start'});
      if(focusInput)window.setTimeout(function(){document.getElementById('smartCaptureInput')?.focus()},350);
    },80);
  }

  function quickAdd(){
    if(typeof window.openCalendarDate==='function')window.openCalendarDate(typeof window.dkey==='function'?window.dkey():undefined);
    else showCalendar(false);
    window.setTimeout(function(){
      document.querySelector('[data-agenda-form] input[name="title"]')?.focus();
      document.querySelector('.dayAgenda')?.scrollIntoView({behavior:'smooth',block:'center'});
    },180);
  }

  async function extractPdf(file){
    setStatus('Reading PDF locally…');
    var pdfjs=await import(PDF_MODULE);
    pdfjs.GlobalWorkerOptions.workerSrc=PDF_WORKER;
    var documentTask=pdfjs.getDocument({data:await file.arrayBuffer()}),pdf=await documentTask.promise;
    var pages=Math.min(pdf.numPages,15),output=[];
    for(var pageNumber=1;pageNumber<=pages;pageNumber++){
      setStatus('Reading PDF page '+pageNumber+' of '+pages+'…');
      var page=await pdf.getPage(pageNumber),content=await page.getTextContent(),line='',lines=[];
      content.items.forEach(function(item){
        var value=String(item.str||'').trim();
        if(value)line+=(line?' ':'')+value;
        if(item.hasEOL&&line){lines.push(line);line=''}
      });
      if(line)lines.push(line);
      output.push(lines.join('\n'));
      page.cleanup?.();
    }
    if(pdf.numPages>pages)output.push('Only the first '+pages+' pages were reviewed.');
    return output.join('\n').trim();
  }

  async function extractImage(file){
    setStatus('Preparing private photo scan…');
    if(typeof window.loadTesseract!=='function'||!(await window.loadTesseract()))throw Error('The photo reader could not load. You can still paste the schedule as text.');
    var result=await window.Tesseract.recognize(file,'eng',{...(window.TESSERACT_OPTIONS||{}),logger:function(progress){
      if(progress.status==='recognizing text')setStatus('Reading schedule… '+Math.round((progress.progress||0)*100)+'%');
    }});
    return String(result?.data?.text||'').trim();
  }

  function reviewExtractedText(text,fileName){
    if(!text)throw Error('No readable schedule text was found. Try a brighter, straighter photo or paste the schedule.');
    var input=document.getElementById('smartCaptureInput');
    if(!input)throw Error('The calendar intake is not ready yet. Please try again.');
    input.value=text;
    setStatus('Text extracted from '+fileName+'. Review the suggested dates below before saving.');
    if(!window.WGC19?.reviewRawText?.(text,{sourceType:'ocr',fileName:fileName}))document.getElementById('smartCaptureBuild')?.click();
  }

  async function processFile(file,input){
    if(!file)return;
    if(file.size>20*1024*1024){setStatus('Choose a file smaller than 20 MB.',true);input.value='';return}
    try{
      var type=String(file.type||'').toLowerCase(),isPdf=type==='application/pdf'||/\.pdf$/i.test(file.name),isImage=type.startsWith('image/');
      if(!isPdf&&!isImage)throw Error('Choose a schedule photo or PDF.');
      var text=isPdf?await extractPdf(file):await extractImage(file);
      reviewExtractedText(text,file.name||'your file');
    }catch(error){
      console.error(error);
      setStatus(error.message||'This schedule could not be read. Nothing was changed.',true);
    }finally{input.value=''}
  }

  function bindImport(){
    var camera=document.getElementById('scheduleCameraV24'),file=document.getElementById('scheduleFileV24');
    [camera,file].forEach(function(input){
      if(!input||input.dataset.bound)return;
      input.dataset.bound='true';
      input.addEventListener('change',function(){processFile(input.files?.[0],input)});
    });
  }

  function personalizeCapture(capture){
    if(capture.dataset.adaptiveV24)return;
    capture.dataset.adaptiveV24='true';
    var eyebrow=capture.querySelector('.smartCaptureIntro small'),title=capture.querySelector('.smartCaptureIntro h2'),copy=capture.querySelector('.smartCaptureIntro p');
    if(eyebrow)eyebrow.textContent='EFFORTLESS INPUT';
    if(title)title.textContent='Tell us the week in your own words.';
    if(copy)copy.textContent='Paste a roster, speak it, or upload what your employer sent. Work, appointments, errands, meals and reminders are organized together.';
    var intro=capture.querySelector('.smartCaptureIntro');
    if(intro&&!document.getElementById('scheduleImportV24'))intro.insertAdjacentHTML('afterend',importMarkup());
    var input=document.getElementById('smartCaptureInput');
    if(input)input.placeholder='Try: I work Mon–Fri 7am–3pm. Dentist Aug 29 at 10. Meal prep Sunday at 4. Remind me to call Mom tomorrow at 6.';
    bindImport();
  }

  function bindCalendarActions(){
    var today=document.getElementById('calendarTodayV24'),todo=document.getElementById('calendarTodoV24'),importButton=document.getElementById('calendarImportV24');
    if(today&&!today.dataset.bound){today.dataset.bound='true';today.onclick=function(){document.getElementById('todayQuick')?.click()}}
    if(todo&&!todo.dataset.bound){todo.dataset.bound='true';todo.onclick=quickAdd}
    if(importButton&&!importButton.dataset.bound){importButton.dataset.bound='true';importButton.onclick=function(){showCalendar(true)}}
  }

  function adaptMenus(){
    document.getElementById('signOutQuick')?.remove();
    var menu=document.querySelector('#page-more [data-open="bellevue"]');
    if(menu){
      var title=menu.querySelector('b'),copy=menu.querySelector('small');
      if(title)title.textContent='Import a schedule';
      if(copy)copy.textContent='Paste text or upload a photo or PDF';
      menu.onclick=function(event){event.preventDefault();showCalendar(true)};
    }
    var account=document.getElementById('openAccountV18')?.querySelector('small');
    if(account)account.textContent='Profile, privacy, sync and sign out';
    var quick=document.getElementById('quickPlanWeek');
    if(quick&&!quick.dataset.adaptiveV24){quick.dataset.adaptiveV24='true';quick.onclick=function(){showCalendar(true)}}
  }

  function mount(){
    if(mounting)return;
    mounting=true;
    try{
      adaptMenus();
      var calendar=document.getElementById('page-calendar');
      if(!calendar)return;
      var legend=calendar.querySelector('.legend');
      if(!document.getElementById('calendarUtilityV24'))legend?.insertAdjacentHTML('beforebegin',heroMarkup());
      var capture=document.getElementById('smartCaptureV19'),hero=document.getElementById('calendarUtilityV24');
      if(capture&&!calendar.contains(capture))hero?.insertAdjacentElement('afterend',capture);
      if(capture)personalizeCapture(capture);
      if(legend&&!document.getElementById('calendarActionBarV24'))legend.insertAdjacentHTML('afterend',toolbarMarkup());
      bindCalendarActions();
      adaptMenus();
      document.body.classList.add('adaptivePlannerV24');
    }finally{mounting=false}
  }

  function boot(){
    mount();
    var scheduled=false;
    new MutationObserver(function(){
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(function(){scheduled=false;mount()});
    }).observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('wgc:authchange',function(){window.setTimeout(mount,100)});
  }

  window.WGC24=Object.assign(window.WGC24||{},{showCalendar:showCalendar,processScheduleFile:processFile,mount:mount});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
