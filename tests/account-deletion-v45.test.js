const test=require('node:test'),assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://auth.example.test';
process.env.SUPABASE_PUBLISHABLE_KEY='publishable-test';
process.env.SUPABASE_SECRET_KEY='sb_secret_fixture';
const handler=require('../api/v18/account');
async function request(body,deleteStatus=200){
 const calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/user')?{id:'user-a'}:{id:'user-a'}),{status:url.endsWith('/user')?200:deleteStatus})};
 const res={setHeader(){},end(body){this.body=JSON.parse(body)}};
 await handler({method:'DELETE',url:'/api/v18/account',headers:{authorization:'Bearer fixture-token'},body},res);
 return{calls,res};
}
test('account deletion refuses missing or cross-account confirmation',async()=>{
 for(const body of [{},{confirmation:'DELETE ACCOUNT',expectedUserId:'other-user'}]){
  const {calls,res}=await request(body);assert.equal(res.statusCode,400);assert.equal(calls.length,1);
 }
});
test('confirmed deletion targets only the authenticated account with server credentials',async()=>{
 const {calls,res}=await request({confirmation:'DELETE ACCOUNT',expectedUserId:'user-a'});
 assert.equal(res.statusCode,200);assert.equal(res.body.deleted,true);
 assert.equal(calls[1].url,'https://auth.example.test/auth/v1/admin/users/user-a');
 assert.equal(calls[1].options.method,'DELETE');assert.equal(calls[1].options.headers.apikey,'sb_secret_fixture');
});
test('upstream deletion failure is never reported as success',async()=>{
 const {res}=await request({confirmation:'DELETE ACCOUNT',expectedUserId:'user-a'},500);
 assert.equal(res.statusCode,502);assert.equal(res.body.deleted,undefined);assert.equal(res.body.code,'ACCOUNT_DELETE_FAILED');
});
