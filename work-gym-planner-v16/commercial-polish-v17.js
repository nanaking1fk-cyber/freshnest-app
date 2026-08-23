// v17 commercial wording / onboarding polish.
function polishCommercialUI(){
  let rot=$('#rotationGrid');if(rot){
    let parent=rot.parentElement;
    let heading=[...parent.querySelectorAll('h3')].find(x=>/14-day fixed-job rotation/i.test(x.textContent));if(heading)heading.textContent='Repeating work cycle';
    let note=[...parent.querySelectorAll('p.muted')].find(x=>/tap a day/i.test(x.textContent));if(note)note.textContent='Tap each cycle day to switch Work ↔ Off. Day 1 is the anchor date. Choose a cycle length from 7 to 28 days.';
  }
  let anchor=$('#fixedAnchor')?.closest('label');if(anchor&&anchor.firstChild)anchor.firstChild.textContent='Cycle Day 1 anchor';
  let menu=[...$$('#page-more .menuCards button')].find(x=>x.dataset.open==='profile');if(menu){let b=menu.querySelector('b'),s=menu.querySelector('small');if(b)b.textContent='Profile, work & training setup';if(s)s.textContent='Work cycle, shifts, equipment, training days'}
  let variable=$('#variableJobMenu');if(variable&&/schedule/i.test(variable.textContent)){let p=profile();variable.textContent=(p?.variable?.name||'Variable work')+' schedule'}
  let intro=$('#onboardingIntro');if(intro)intro.classList.add('commercialOnboarding');
}
polishCommercialUI();
document.addEventListener('DOMContentLoaded',()=>setTimeout(polishCommercialUI,0));
