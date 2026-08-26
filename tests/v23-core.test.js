const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../shared/v23-core');

test('cloud state keeps planner records and strips credentials, caches and diagnostics',()=>{
  const clean=core.sanitizePlannerState({storage:{
    'wgp-v15-profile':'{"name":"A"}',
    'wgp-v15-calendar-items':'{}',
    'wgp-v15-sync-settings':'{"password":"secret"}',
    'wgp-v15-diagnostics':'[]',
    'wgc-v18-session':'{"access_token":"secret"}',
    'wgc-v18-user-cache:user-b':'{"storage":{}}',
    'wgc-v18-local-owner':'user-a'
  }});
  assert.deepEqual(Object.keys(clean.storage).sort(),['wgp-v15-calendar-items','wgp-v15-profile']);
  assert.equal(clean.schemaVersion,23);
  assert.equal(JSON.stringify(clean).includes('secret'),false);
});

test('one account capture can never include another account device cache',()=>{
  const accountA=core.sanitizePlannerState({storage:{
    'wgp-v15-profile':'{"name":"Account A"}',
    'wgc-v18-user-cache:account-b':'{"storage":{"wgp-v15-profile":"Account B"}}'
  }});
  assert.equal(accountA.storage['wgp-v15-profile'],'{"name":"Account A"}');
  assert.equal(Object.keys(accountA.storage).some(key=>key.includes('account-b')),false);
});

test('nutrition adjustment follows fat loss, muscle gain and maintenance goals',()=>{
  const common={loggedEnough:true,adherence:.9,waistImproved:false};
  assert.equal(core.calorieAdjustment({...common,goal:'fat_loss',weeklyChangePct:0}).delta,-100);
  assert.equal(core.calorieAdjustment({...common,goal:'muscle_gain',weeklyChangePct:0}).delta,100);
  assert.equal(core.calorieAdjustment({...common,goal:'maintain',weeklyChangePct:.7}).delta,-100);
});

test('food restriction matching excludes named restrictions',()=>{
  assert.equal(core.foodAllowed('Peanut stew','peanut allergy'),false);
  assert.equal(core.foodAllowed('Chicken and rice','peanut allergy'),true);
});
