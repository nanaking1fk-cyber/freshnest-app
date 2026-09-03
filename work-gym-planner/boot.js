(async()=>{try{
  const currentBoot=document.getElementById('wwBoot');
  const boot=currentBoot?currentBoot.outerHTML:'';
  let h=await fetch('../work-gym-planner-v15/index.html?v=30.1.31-agreement60',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('base');return r.text()});
  const remove=['workout-plan.js','nutrition-core.js','calendar.js','training.js','diary.js','progress.js','schedule.js','data.js','init.js'];
  for(const f of remove)h=h.replace(new RegExp('<script\\s+defer\\s+src="\\./'+f.replace('.','\\.')+'"><\\/script>\\s*','g'),'');
  h=h.replace('<head>','<head><base href="../work-gym-planner-v15/"><scr'+'ipt defer src="../shared/observability.js?v=30.1.31-free57-hours58"></scr'+'ipt>');
  h=h.replace('<body>','<body>'+boot);
  h=h.replace('<meta name="description" content="Work, training, nutrition, and body-composition planner.">','<meta name="description" content="Add your work schedule, then plan workouts, meals, recovery, tasks and reminders around the hours you actually work.">');
  h=h.replace('<title>Work + Gym Planner</title>','<title>Work + Workout | Health planned around work</title>');
  h=h.replace('<link rel="manifest" href="./manifest.webmanifest">','<link rel="manifest" href="../work-gym-planner/manifest.webmanifest?v=30.1.31">');
  h=h.replace('<link rel="icon" href="./icons/icon-192.png" type="image/png">','<link rel="icon" type="image/svg+xml" href="../work-gym-planner-v16/icons/icon.svg?v=30.1.31">');
  h=h.replace('<link rel="apple-touch-icon" sizes="180x180" href="./icons/icon-180.png">','<link rel="apple-touch-icon" sizes="180x180" href="../work-gym-planner-v16/icons/icon-180.png?v=30.1.31">');
  h=h.replace('</head>','<link rel="stylesheet" href="../work-gym-planner/boot.css?v=30.1.31"><link rel="stylesheet" href="../work-gym-planner-v16/v16.css?v=30.1.31"><link id="premiumV18Styles" rel="stylesheet" href="../work-gym-planner-v16/premium-v18.css?v=30.1.31"><link rel="stylesheet" href="../work-gym-planner-v16/landing-v29.css?v=30.1.31"><link rel="stylesheet" href="../work-gym-planner-v16/home-v27.css?v=30.1.31"><link rel="stylesheet" href="../work-gym-planner-v16/nutrition-v27.css?v=30.1.31"><link rel="stylesheet" href="../work-gym-planner-v16/adaptive-planner-v24.css?v=30.1.31"><link rel="stylesheet" href="../work-gym-planner-v16/schedule-platform-v25.css?v=30.1.31"><link rel="stylesheet" href="../work-gym-planner-v16/app-v29.css?v=30.1.31"><link rel="stylesheet" href="../work-gym-planner-v16/app-v30.css?v=30.1.31-free57-hours58"><link rel="stylesheet" href="../work-gym-planner-v16/calendar-premium-v42.css?v=30.1.31-free57-hours58"><link rel="stylesheet" href="../work-gym-planner-v16/roster-scan-v48.css?v=30.1.31-roster48"><link rel="stylesheet" href="../work-gym-planner-v16/work-pay-v58.css?v=30.1.31-hours58"></head>');
  const p='../work-gym-planner-v16/';
  h=h.replace('app-v30.css?v=30.1.31-free57-hours58','app-v30.css?v=30.1.31-agreement60');
  const assetRevision='30.1.31-agreement60';
  const platformScripts='<scr'+'ipt defer src="../shared/work-pay-v58.js?v=30.1.31-hours58"></scr'+'ipt><scr'+'ipt defer src="../shared/v23-core.js?v=30.1.31"></scr'+'ipt><scr'+'ipt defer src="../shared/v25-scheduling.js?v=30.1.31-free57-hours58"></scr'+'ipt><scr'+'ipt defer src="../shared/v31-roster.js?v=30.1.31"></scr'+'ipt>';
  const appScripts=['base-patch.js','workout-plan.js','food-portions-v50.js','nutrition-core.js','health.js','coach.js','today.js','calendar.js','training-a.js','training-b.js','alternatives.js','diary-a.js','diary-b.js','progress.js','schedule.js','data.js','cloud.js','notifications.js','pwa-patch.js','shell.js','audit-v169.js','singlejob-ui-v169.js','body-bmr-v169.js','training-history-v1610.js','commercial-v17.js','commercial-legal-v17.js','commercial-polish-v17.js','commercial-cyclefix-v17.js','accounts-v18.js','account-security-v18.js','sync-v18.js','onboarding-v18.js','onboarding-accountfix-v18.js','exercise-library-v18.js','ai-coach-v18.js','nutrition-plan-v18.js','training-guides-v18.js','v18-integration.js','init.js','premium-ui-v18.js','guided-onboarding-v18.js','landing-v29.js','adaptive-planner-v24.js','schedule-platform-v25.js','app-v29.js','app-v30.js','calendar-premium-v42.js','work-pay-v58.js','roster-scan-v48.js'].map(x=>'<scr'+'ipt defer src="'+p+x+'?v='+assetRevision+'"></scr'+'ipt>').join('');
  const consentScript='<scr'+'ipt defer src="'+p+'health-consent-v35.js?v='+assetRevision+'"></scr'+'ipt>';
  const orderedScripts=appScripts.replace('<scr'+'ipt defer src="'+p+'sync-v18.js?v='+assetRevision+'"></scr'+'ipt>',consentScript+'<scr'+'ipt defer src="'+p+'sync-v18.js?v='+assetRevision+'"></scr'+'ipt>');
  h=h.replace('</body>',platformScripts+orderedScripts+'<scr'+'ipt defer src="../shared/usage-counts-v45.js?v='+assetRevision+'"></scr'+'ipt></body>');
  document.open();document.write(h);document.close();
}catch(e){
  window.WWObservability?.capture?.('boot_load',e?.name);
  console.error(e);
  const status=document.getElementById('wwBootStatus');
  if(status)status.textContent='We could not finish loading. Check your connection, then refresh this page.';
}})();
