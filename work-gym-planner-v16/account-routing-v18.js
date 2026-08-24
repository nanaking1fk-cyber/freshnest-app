// v18 compatibility: route older account-modal calls to the active v18 dialog.
(function(){
 const base=window.openModal;
 if(typeof base==='function'&&!base.__accountRoute18){
  const wrapped=function(id,...args){if(id==='accountDialog')id='accountDialog18';return base.call(this,id,...args)};
  wrapped.__accountRoute18=true;window.openModal=wrapped;
 }
})();
