// v18 guard: require an account for cloud-backed onboarding once cloud is active.
window.WGC18=window.WGC18||{};
(function(A){
 let old=A.openOnboarding;if(typeof old!=='function')return;
 A.openOnboarding=function(...args){
   if(A.config?.cloudConfigured&&!A.session){
     window.renderAccount18?.();
     window.openModal?.('accountDialog18');
     let s=$('#accountStatus18');if(s)s.textContent='Create an account or sign in first. Your personalized plan will then be saved to your account.';
     return;
   }
   return old.apply(this,args);
 };
})(window.WGC18);
