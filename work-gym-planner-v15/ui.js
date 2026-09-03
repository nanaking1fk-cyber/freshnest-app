// Modals / navigation -------------------------------------------------------
let modalActivationV62=null;
// Safari does not focus pointer-clicked buttons. Remember the real opener as
// well as keyboard focus so dismissing a sheet returns to the right control.
document.addEventListener('click',event=>{const target=event.target?.closest?.('button,a[href],[tabindex]');modalActivationV62=target?{target,at:Date.now()}:null},true);
function page(id){$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+id));$$('.bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='training')renderTraining();if(id==='diary')renderDiary();if(id==='progress')renderProgress();if(id==='more')renderMore()}
function openModal(id){let m=$('#'+id);if(!m)return;let opener=modalActivationV62&&Date.now()-modalActivationV62.at<500?modalActivationV62.target:document.activeElement;if(!m.classList.contains('open'))m._returnFocus=opener;lastFocus=opener;m.classList.add('open');setTimeout(()=>{if(m.classList.contains('open'))m.querySelector('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')?.focus()},20)}
function closeModal(id){let m=$('#'+id);if(!m)return;m.classList.remove('open');stopBarcode();let target=m._returnFocus||lastFocus;if(target?.isConnected&&target.offsetParent!==null)target.focus?.();m._returnFocus=null}
function renderMore(){renderHeader()}
