// Legal/support routes resolve from the active app directory in production,
// previews, GitHub Pages and native bundles.
function productPage(file){try{return new URL(`./${file}`,location.href).href}catch{return`./${file}`}}
function installCommercialLegalLinks(){
  let more=$('#page-more .menuCards');if(!more)return;
  let privacy=$('#commercialPrivacy');if(privacy){privacy.onclick=()=>location.href=productPage('privacy.html');privacy.querySelector('b').textContent='Privacy & Consumer Health Data Policy';privacy.querySelector('small').textContent='Health data, account sync, providers, rights and deletion'}
  if(!$('#commercialTerms')){let b=document.createElement('button');b.id='commercialTerms';b.innerHTML='<span>📄</span><div><b>Terms of Use</b><small>Fitness, nutrition and service terms</small></div><i>›</i>';b.onclick=()=>location.href=productPage('terms.html');more.appendChild(b)}
  if(!$('#commercialSupport')){let b=document.createElement('button');b.id='commercialSupport';b.innerHTML='<span>🛟</span><div><b>Support</b><small>Troubleshooting, diagnostics and bug reports</small></div><i>›</i>';b.onclick=()=>location.href=productPage('support.html');more.appendChild(b)}
}
installCommercialLegalLinks();
document.addEventListener('DOMContentLoaded',()=>setTimeout(installCommercialLegalLinks,0));
