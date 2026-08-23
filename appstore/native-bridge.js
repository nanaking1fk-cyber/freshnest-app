// Native-only enhancements loaded inside the Capacitor bundle.
(function(){
  const cap=window.Capacitor;
  const isNative=!!cap?.isNativePlatform?.();
  if(!isNative)return;
  document.documentElement.classList.add('native-ios');
  const plugin=n=>cap?.Plugins?.[n];
  const Haptics=plugin('Haptics');
  async function impact(style='LIGHT'){try{await Haptics?.impact?.({style})}catch{}}
  async function success(){try{await Haptics?.notification?.({type:'SUCCESS'})}catch{}}
  document.addEventListener('click',e=>{if(e.target.closest('button,.result,.completedSessionSummary'))impact('LIGHT')},{passive:true});
  if(typeof completeTraining==='function'){
    const base=completeTraining;
    completeTraining=function(){let r=base.apply(this,arguments);success();return r};
  }
  if(typeof saveBodyCheckin169==='function'){
    const base=saveBodyCheckin169;
    saveBodyCheckin169=function(){let r=base.apply(this,arguments);impact('MEDIUM');return r};
  }
  // App Store binary must not download executable OCR code after review.
  // The monthly work-schedule review grid remains fully functional. A native
  // Vision framework OCR plugin can replace this no-op in a later native step.
  if(typeof loadTesseract==='function'){
    loadTesseract=async function(){
      let s=document.querySelector('#bScanStatus');
      if(s)s.textContent='Automatic schedule OCR is not enabled in this native build yet. Use the review grid; unknown dates are never assumed off.';
      return false;
    };
  }
  window.WGPNative={isNative:true,impact,success};
})();
