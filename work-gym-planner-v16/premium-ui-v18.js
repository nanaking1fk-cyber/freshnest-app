// Work + Gym Coach 18.3 premium visual polish and icon system.
(function premiumUI(){
 const svg=(paths,viewBox='0 0 24 24')=>`<svg viewBox="${viewBox}" aria-hidden="true">${paths}</svg>`;
 const ICONS={
  brand:svg('<path d="M4 7v10m3-12v14m3-7h4m0-7v14m3-12v10m3-7v4M7 12h10"/><path d="m8 18 3-3 2 2 4-5"/>'),
  sparkle:svg('<path d="M12 2.8c.7 4.1 2.9 6.3 7 7-4.1.7-6.3 2.9-7 7-.7-4.1-2.9-6.3-7-7 4.1-.7 6.3-2.9 7-7Z"/><path d="M19 16.2c.3 1.8 1.3 2.8 3 3-1.7.3-2.7 1.2-3 3-.3-1.8-1.3-2.7-3-3 1.7-.2 2.7-1.2 3-3ZM5 2.2c.2 1.3.9 2 2.2 2.2C5.9 4.6 5.2 5.3 5 6.6c-.2-1.3-.9-2-2.2-2.2C4.1 4.2 4.8 3.5 5 2.2Z"/>'),
  user:svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4.1 3.2-6.2 7-6.2s6.2 2.1 7 6.2"/>'),
  calendar:svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3m-10 3h3"/>'),
  apple:svg('<path d="M12 7c1.6-2.2 4.9-2.5 6.6-.5 1.6 1.9 1.3 5.2.2 7.8-1.6 3.8-3.9 6.7-6 6.7-1.1 0-1.7-.7-2.8-.7S8.2 21 7.2 21c-2.1 0-4.4-2.9-6-6.7C.1 11.7-.2 8.4 1.4 6.5 3.1 4.5 6.4 4.8 8 7c1.2-.7 2.8-.7 4 0Z"/><path d="M12.1 4.8c.2-2 1.6-3.5 3.6-3.8.1 2-1.3 3.8-3.6 3.8Z"/>'),
  database:svg('<ellipse cx="12" cy="5.5" rx="7.5" ry="3.5"/><path d="M4.5 5.5v6c0 1.9 3.4 3.5 7.5 3.5s7.5-1.6 7.5-3.5v-6m-15 6v6c0 1.9 3.4 3.5 7.5 3.5s7.5-1.6 7.5-3.5v-6"/>'),
  info:svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>'),
  heart:svg('<path d="M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11Z"/><path d="M7.8 12h2l1.2-2.4 2.1 5 1.1-2.6h2"/>'),
  bell:svg('<path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7Zm4 10h4"/>'),
  cloud:svg('<path d="M7 19H5.5A3.5 3.5 0 0 1 5 12a7 7 0 0 1 13.5-1.8A4.5 4.5 0 0 1 18 19H7Z"/><path d="m9 14 3-3 3 3m-3-3v8"/>'),
  chart:svg('<path d="M4 20V10m5 10V4m6 16v-7m5 7V7"/><path d="m3 8 6-5 6 7 6-5"/>'),
  dumbbell:svg('<path d="M3 9v6m3-8v10m3-5h6m0-5v10m3-8v6m3-4v2M6 12h12"/>'),
  shield:svg('<path d="M12 3 20 6v5c0 5.2-3.1 8.5-8 10-4.9-1.5-8-4.8-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>'),
  file:svg('<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6m-6 4h6"/>'),
  support:svg('<path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 12h2a2 2 0 0 1 2 2v4H6a2 2 0 0 1-2-2v-4Zm16 0h-2a2 2 0 0 0-2 2v4h2a2 2 0 0 0 2-2v-4Zm-4 7c-1 1.3-2.3 2-4 2"/>'),
  camera:svg('<path d="M4 7h3l1.3-2h7.4L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  bowl:svg('<path d="M4 11h16c0 5-3.4 8-8 8s-8-3-8-8Z"/><path d="M3 11h18M8 7c0-1.6 1-2.7 2.5-3M13 8c0-1.8 1.2-3 3-3.8"/>'),
  check:svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/>'),
  clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  chevron:svg('<path d="m9 5 7 7-7 7"/>')
 };

 function menuIcon(button){
  let text=(button.querySelector('b')?.textContent||button.textContent||'').toLowerCase();
  if(text.includes('personal'))return'sparkle';
  if(text.includes('ai coach'))return'sparkle';
  if(text.includes('account'))return'user';
  if(text.includes('workout library'))return'dumbbell';
  if(text.includes('body stats')||text.includes('progress'))return'chart';
  if(text.includes('profile'))return'user';
  if(text.includes('variable')||text.includes('schedule'))return'calendar';
  if(text.includes('nutrition'))return'apple';
  if(text.includes('health')||text.includes('recovery'))return'heart';
  if(text.includes('reminder'))return'bell';
  if(text.includes('cloud'))return'cloud';
  if(text.includes('backup')||text.includes('data'))return'database';
  if(text.includes('privacy'))return'shield';
  if(text.includes('terms'))return'file';
  if(text.includes('support'))return'support';
  return'info';
 }

 function upgradeMenuIcons(root=document){
  root.querySelectorAll('.menuCards>button').forEach(button=>{
   let slot=button.querySelector(':scope>span');
   if(slot&&!slot.dataset.premiumIcon){
    slot.className='premiumMenuIcon';
    slot.dataset.premiumIcon=menuIcon(button);
    slot.setAttribute('aria-hidden','true');
    slot.innerHTML=ICONS[slot.dataset.premiumIcon];
   }
   let chevron=button.querySelector(':scope>i');
   if(chevron&&!chevron.dataset.premiumIcon){
    chevron.className='premiumChevron';
    chevron.dataset.premiumIcon='chevron';
    chevron.setAttribute('aria-hidden','true');
    chevron.innerHTML=ICONS.chevron;
   }
  });
 }

 function upgradeHeroIcons(root=document){
  root.querySelectorAll('.obHero').forEach(hero=>{
   if(hero.dataset.premiumIcon)return;
   let heading=(hero.parentElement?.querySelector('h3')?.textContent||'').toLowerCase();
   let name=heading.includes('working')?'calendar':heading.includes('train')?'dumbbell':heading.includes('food')?'apple':heading.includes('ready')?'check':'sparkle';
   hero.className='obHero premiumHeroIcon';
   hero.dataset.premiumIcon=name;
   hero.innerHTML=ICONS[name];
  });
  root.querySelectorAll('.aiWelcome>span').forEach(hero=>{
   if(hero.dataset.premiumIcon)return;
   hero.className='premiumHeroIcon';
   hero.dataset.premiumIcon='sparkle';
   hero.innerHTML=ICONS.sparkle;
  });
 }

 function upgradeCoach(root=document){
  root.querySelectorAll('.aiCoachFab').forEach(button=>{
   if(button.dataset.premiumIcon)return;
   button.dataset.premiumIcon='sparkle';
   button.innerHTML=ICONS.sparkle;
  });
  root.querySelectorAll('.aiCamera').forEach(label=>{
   if(label.dataset.premiumIcon)return;
   label.dataset.premiumIcon='camera';
   let input=label.querySelector('input');
   label.replaceChildren();
   label.insertAdjacentHTML('afterbegin',ICONS.camera);
   if(input)label.appendChild(input);
  });
  let quick=root.querySelector('#aiPhotoQuick');
  if(quick&&!quick.dataset.premiumIcon){quick.dataset.premiumIcon='camera';quick.innerHTML=`<span class="premiumInlineIcon">${ICONS.camera}</span> Identify gym equipment`}
 }

 function upgradeLibrary(root=document){
  root.querySelectorAll('.libraryIcon,.libraryHero>span').forEach(icon=>{
   if(icon.dataset.premiumIcon)return;
   icon.dataset.premiumIcon='dumbbell';
   icon.innerHTML=ICONS.dumbbell;
  });
 }

 function upgradeInlineActions(root=document){
  root.querySelectorAll('#nutritionAskAI,#nutritionRefreshAI').forEach(button=>{
   if(button.dataset.premiumIcon)return;
   button.dataset.premiumIcon='sparkle';
   let label=button.textContent.replace(/^\s*✨\s*/,'');
   button.innerHTML=`<span class="premiumInlineIcon">${ICONS.sparkle}</span>${label}`;
  });
  root.querySelectorAll('.result .ph').forEach(slot=>{
   if(slot.dataset.premiumIcon)return;
   slot.dataset.premiumIcon='bowl';slot.classList.add('premiumInlineIcon');slot.innerHTML=ICONS.bowl;
  });
 }

 function upgradeChrome(){
  document.documentElement.classList.add('premiumV18');
  document.body?.classList.add('premiumV18');
  let theme=document.querySelector('meta[name="theme-color"]');
  if(theme)theme.content='#080b10';
  let style=document.getElementById('premiumV18Styles');
  if(style&&style!==document.head.lastElementChild)document.head.appendChild(style);
  let more=document.querySelector('#page-more>h2');
  if(more){
   more.textContent='Your space';
   if(!document.getElementById('premiumMoreIntro')){
    let intro=document.createElement('p');
    intro.id='premiumMoreIntro';intro.className='premiumPageIntro';intro.textContent='Your profile, coaching tools and preferences';
    more.insertAdjacentElement('afterend',intro);
   }
  }
  upgradeMenuIcons();upgradeHeroIcons();upgradeCoach();upgradeLibrary();upgradeInlineActions();
 }

 let scheduled=false;
 const observer=new MutationObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;upgradeMenuIcons();upgradeHeroIcons();upgradeCoach();upgradeLibrary();upgradeInlineActions()});
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',upgradeChrome,{once:true});else upgradeChrome();
 window.WGC18=window.WGC18||{};
 window.WGC18.premiumIcons=ICONS;
})();
