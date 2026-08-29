const test=require('node:test');
const assert=require('node:assert/strict');
const {validateProposal}=require('../server/schedule-ai-v25');

test('AI schedule validation retains only safe, real calendar items',()=>{
  const result=validateProposal({items:[
    {kind:'work',date:'2026-09-01',start:'07:00',end:'19:00',title:'Hospital',confidence:.94,needs_review:false,source_text:'Tuesday 7a-7p'},
    {kind:'event',date:'2026-02-30',start:'14:00',end:'15:00',title:'Impossible date',confidence:.9,needs_review:false,source_text:'bad'},
    {kind:'work',date:'2026-09-01',start:'07:00',end:'19:00',title:'Hospital',confidence:.94,needs_review:false,source_text:'duplicate'},
    {kind:'work',date:'2026-09-02',start:'07:00',end:'',title:'Clinic',confidence:.72,needs_review:false,source_text:'Wednesday 7am'}
  ],assumptions:['The note did not state the end time.']});
  assert.equal(result.items.length,2);
  assert.equal(result.items[0].confidence.label,'High');
  assert.equal(result.items[1].needsReview,true);
  assert.ok(result.items[1].confidence.reasons.includes('work shift has no confirmed end time'));
  assert.deepEqual(result.assumptions,['The note did not state the end time.']);
});

test('AI schedule validation strips invalid times and unknown item kinds',()=>{
  const result=validateProposal({items:[
    {kind:'unknown',date:'2026-09-01',start:'07:00',end:'19:00',title:'Nope',confidence:.8,needs_review:false,source_text:''},
    {kind:'event',date:'2026-09-01',start:'30:00',end:'',title:'Bad time',confidence:.8,needs_review:false,source_text:''}
  ]});
  assert.deepEqual(result.items,[]);
});
