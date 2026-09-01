// v16.3 DOM / navigation additions. Runs during parsing before DOMContentLoaded.
(function setupV16Shell(){
 const app=document.getElementById('appRoot');
 const cal=document.getElementById('page-calendar');
 if(app&&cal&&!document.getElementById('page-home')){
   const home=document.createElement('section');
   home.id='page-home';home.className='page active';home.setAttribute('aria-label','Home dashboard');
   home.innerHTML='<div id="todayDashboard"></div>';
   cal.classList.remove('active');
   app.insertBefore(home,cal);
 }
 const top=document.querySelector('.topbar');if(top)top.classList.add('legacyTopbar');
 const nav=document.querySelector('.bottomNav');
 if(nav){nav.innerHTML=`
   <button data-page="home" class="active" aria-label="Home"><span class="navSvg"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.7 12 3l9 7.7v9.1a1.2 1.2 0 0 1-1.2 1.2h-5.2v-6.4H9.4V21H4.2A1.2 1.2 0 0 1 3 19.8z"/></svg></span><small>Home</small></button>
   <button data-page="calendar" aria-label="Calendar"><span class="navSvg"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Zm1-2v4m12-4v4M3 9h18M7 13h2m3 0h2m3 0h2M7 17h2m3 0h2"/></svg></span><small>Calendar</small></button>
   <button data-page="training" aria-label="Training"><span class="navSvg"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6m3-8v10m3-6h6m0-4v10m3-8v6m3-4v2M6 12h12"/></svg></span><small>Training</small></button>
   <button data-page="diary" aria-label="Nutrition"><span class="navSvg"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-4.5 0-8-3.8-8-8.4C4 8.9 6.6 6 10 6c.8 0 1.5.2 2 .5.5-.3 1.2-.5 2-.5 3.4 0 6 2.9 6 6.6C20 17.2 16.5 21 12 21Zm0-15c0-2.5 1.7-4.3 4.4-4.7C16.1 4.2 14.3 6 12 6Z"/></svg></span><small>Nutrition</small></button>
   <button data-page="more" aria-label="More"><span class="navSvg"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></span><small>More</small></button>`}
 // Upgrade page navigation so Home always refreshes its live cards.
 const oldPage=window.page;
 window.page=function(id){
   document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+id));
   document.querySelectorAll('.bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
   if(id==='home')window.renderTodayDashboard?.();
   if(id==='calendar')window.renderCalendar?.();
   if(id==='training')window.renderTraining?.();
   if(id==='diary')window.renderDiary?.();
   if(id==='progress')window.renderProgress?.();
   if(id==='more')window.renderMore?.();
   window.scrollTo({top:0,behavior:'smooth'});
 };
 const cards=document.querySelector('#page-more .menuCards');
 if(cards&&!cards.querySelector('[data-open="health"]')){
   const backup=cards.querySelector('[data-open="backup"]');
   const box=document.createElement('div');box.innerHTML=`<button data-open="health"><span>❤️</span><div><b>Health & steps</b><small>Automatic phone steps, sleep and recovery</small></div><i>›</i></button><button data-open="reminders"><span>🔔</span><div><b>Reminders & Calendar</b><small>Workout alerts and iOS Calendar export</small></div><i>›</i></button><button data-open="cloud"><span>☁️</span><div><b>Private cloud sync</b><small>Encrypted WebDAV / Nextcloud sync</small></div><i>›</i></button>`;
   [...box.children].forEach(x=>cards.insertBefore(x,backup));
 }
 const modalHTML=`
 <div id="healthDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="healthTitle"><div class="sheet healthStepSheet"><div class="sheetHandle"></div><div class="sheetHead"><h2 id="healthTitle">Health & steps</h2><button data-close="healthDialog">Done</button></div>
  <div id="nativeStepConnectCard" class="card noMargin nativeStepCard"></div>
  <div class="card"><h3>Apple Health file import</h3><p>For website or historical use, export your Health data on iPhone, unzip it in Files, then choose <b>export.xml</b>. The file is parsed locally on this device.</p><label class="captureBtn">Choose Apple Health export.xml<input id="healthXml" type="file" accept="text/xml,.xml"></label><p id="healthImportStatus" class="statusText"></p></div>
  <div class="card"><h3>CSV import</h3><p>CSV columns can include date, weight, steps, sleep, and resting HR.</p><label class="captureBtn">Choose health CSV<input id="healthCsv" type="file" accept="text/csv,.csv"></label></div>
  <div class="card"><h3>Today / manual recovery</h3><div class="formGrid"><label>Date<input id="healthDate" type="date"></label><label>Sleep (hours)<input id="healthSleep" type="number" step="0.1"></label><label>Steps<input id="healthSteps" type="number" step="1"></label><label>Resting HR<input id="healthRhr" type="number" step="1"></label></div><button id="saveHealthManual" class="primary wideBtn">Save recovery data</button></div></div></div>
 <div id="remindersDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="remindersTitle"><div class="sheet"><div class="sheetHandle"></div><div class="sheetHead"><h2 id="remindersTitle">Reminders & Calendar</h2><button data-close="remindersDialog">Done</button></div><div id="reminderSettings" class="card noMargin"></div></div></div>
 <div id="cloudDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="cloudTitle"><div class="sheet"><div class="sheetHandle"></div><div class="sheetHead"><h2 id="cloudTitle">Private cloud sync</h2><button data-close="cloudDialog">Done</button></div><div class="introBox"><b>End-to-end encrypted sync for a WebDAV-compatible private cloud.</b><p>Works with services such as Nextcloud/ownCloud when the server allows browser CORS. The planner encrypts the backup before upload. This is optional.</p></div><div class="formGrid"><label class="span2">Full HTTPS WebDAV file URL<input id="cloudUrl" placeholder="https://cloud.example.com/remote.php/dav/files/user/work-gym.wgp.json"></label><label>Username<input id="cloudUser" autocomplete="username"></label><label>Password / app token<input id="cloudPassword" type="password" autocomplete="current-password"></label><label class="span2">Encryption passphrase<input id="cloudPassphrase" type="password" autocomplete="new-password" placeholder="Required on every device"></label></div><label class="check"><input id="cloudAuto" type="checkbox"> Auto-upload when this app goes into the background during the current session</label><div class="twoButtons"><button id="cloudPull">Pull from cloud</button><button id="cloudPush" class="primary">Push to cloud</button></div><p id="cloudStatus" class="statusText"></p></div></div>`;
 if(!document.getElementById('healthDialog'))document.body.insertAdjacentHTML('beforeend',modalHTML);
 const old=document.getElementById('backupDialog');if(old){old.outerHTML=`<div id="backupDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="backupTitle"><div class="sheet"><div class="sheetHandle"></div><div class="sheetHead"><h2 id="backupTitle">Data & backup</h2><button data-close="backupDialog">Done</button></div><div class="card noMargin"><h3>Secure backup</h3><p>Create an AES-256 encrypted backup. On iPhone, Share can save it directly to iCloud Drive or another private Files location.</p><input id="backupPass" class="fullInput" type="password" placeholder="Backup passphrase (6+ characters)"><div class="twoButtons"><button id="exportEncrypted" class="primary">Encrypted download</button><button id="shareEncrypted">Share / save to Files</button></div><p id="backupStatus" class="statusText"></p></div><div class="card"><h3>Plain backup</h3><button id="exportData" class="wideBtn">Export plain JSON</button></div><div class="card"><h3>Restore / migrate</h3><label class="captureBtn">Choose backup file<input id="importFile" type="file" accept="application/json,.json"></label><p id="importStatus" class="statusText"></p><button id="restoreSnapshot" class="wideBtn">Restore last automatic local snapshot</button></div><div class="card"><h3>Diagnostics</h3><button id="exportDiagnostics" class="wideBtn">Export diagnostics</button></div><div class="card dangerZone"><h3>Delete local data</h3><input id="deleteConfirm" class="fullInput" placeholder="Type DELETE"><button id="deleteAllData" class="danger wideBtn">Delete all planner data</button></div></div></div>`}
 const about=document.querySelector('#aboutDialog .card');if(about)about.innerHTML='<p><b>Version:</b> 30.1.30</p><p>Adaptive work, recovery, training and nutrition planning with private account sync and review-before-save schedule intake.</p><p>The native iPhone and Android apps can read daily steps with permission. Websites and PWAs cannot access HealthKit or Health Connect directly.</p>';
})();
