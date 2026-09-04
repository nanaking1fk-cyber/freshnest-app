const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
// Regression: the old lifetime trial must not lock out existing accounts.
test('monthly credits replace lifetime trial and metadata-only paid flags',()=>{
 assert.doesNotMatch(read('server/v18-lib.js'),/reserveAICoach|paidAccount|AI_COACH_PAID_REQUIRED/);
 assert.match(read('api/v18/coach.js'),/access\.run\(user,mode/);
 assert.doesNotMatch(read('work-gym-planner-v16/ai-coach-v18.js'),/TRIAL_KEY|jset\(TRIAL|requires a paid plan/);
 assert.match(read('work-gym-planner-v16/ai-coach-v18.js'),/Discover AI Plus/);
 assert.match(read('work-gym-planner-v16/ai-coach-v18.js'),/monthly AI allowance does not reset/);
});
test('an Apple receipt, not a frontend paid flag, is required for extra credits',()=>{
 const apple=read('server/apple-subscriptions-v56.js');
 assert.match(apple,/verifyAndDecodeTransaction/);assert.match(apple,/getAllSubscriptionStatuses/);
 assert.match(apple,/validateTransaction/);assert.doesNotMatch(apple,/user_metadata|app_metadata/);
});
