// v18 guard: route signed-out users to Account without referencing module-private UI functions.
window.WGC18=window.WGC18||{};
(function(A){let old=A.openOnboarding;if(typeof old!=='function')return;A.openOnboarding=function(...args){if(A.config?.cloudConfigured&&!A.session){let s=$('#accountStatus');if(s)s.textContent='Create an account or sign in first. Your personalized plan will then be saved to your account.';openModal('accountDialog');return}return old.apply(this,args)}})(window.WGC18);
