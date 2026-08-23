// v17 legal/support routes that work in both GitHub Pages and Capacitor.
function productPage(file){return window.Capacitor?.isNativePlatform?.()?`./${file}`:`/freshnest-app/work-gym-planner/${file}`}
function installCommercialLegalLinks(){
  let more=$('#page-more .menuCards');if(!more)return;
  let privacy=$('#commercialPrivacy');if(privacy){privacy.onclick=()=>location.href=productPage('privacy.html');privacy.querySelector('b').textContent='Privacy policy';privacy.querySelector('small').textContent='Local data, third-party lookups, backups and deletion'}
  if(!$('#commercialTerms')){let b=document.createElement('button');b.id='commercialTerms';b.innerHTML='<span>📄</span><div><b>Terms of use</b><small>Fitness, nutrition and service terms</small></div><i>›</i>';b.onclick=()=>location.href=productPage('terms.html');more.appendChild(b)}
  if(!$('#commercialSupport')){let b=document.createElement('button');b.id='commercialSupport';b.innerHTML='<span>🛟</span><div><b>Support</b><small>Troubleshooting, diagnostics and bug reports</small></div><i>›</i>';b.onclick=()=>location.href=productPage('support.html');more.appendChild(b)}
}
installCommercialLegalLinks();
document.addEventListener('DOMContentLoaded',()=>setTimeout(installCommercialLegalLinks,0));
