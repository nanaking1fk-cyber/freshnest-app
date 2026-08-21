// Modals / navigation -------------------------------------------------------
function page(id){$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+id));$$('.bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='training')renderTraining();if(id==='diary')renderDiary();if(id==='progress')renderProgress();if(id==='more')renderMore()}
function openModal(id){let m=$('#'+id);if(!m)return;lastFocus=document.activeElement;m.classList.add('open');setTimeout(()=>m.querySelector('button,input,select')?.focus(),20)}
function closeModal(id){let m=$('#'+id);if(!m)return;m.classList.remove('open');stopBarcode();lastFocus?.focus?.()}
function renderMore(){renderHeader()}
