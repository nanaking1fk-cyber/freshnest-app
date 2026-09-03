const {json,cors,verifyUser,SUPABASE_URL,serviceHeaders,errorResponse}=require('../../server/v18-lib');
module.exports=async(req,res)=>{
 if(cors(req,res))return;
 try{
  if(req.method!=='DELETE')return json(res,405,{ok:false,error:'Method not allowed'});
  const user=await verifyUser(req);
  if(req.body?.confirmation!=='DELETE ACCOUNT'||req.body?.expectedUserId!==user.id)return json(res,400,{ok:false,error:'Confirm deletion for the account currently signed in.'});
  // Auth deletion cascades to this user's sessions and owner-scoped application rows.
  const target=`${SUPABASE_URL()}/auth/v1/admin/users/${encodeURIComponent(user.id)}`;
  let r;
  try{r=await fetch(target,{method:'DELETE',headers:serviceHeaders(),signal:AbortSignal.timeout(15000)})}
  catch{throw Object.assign(new Error('We could not delete your account. Your device data has been kept. Please try again or contact support.'),{status:502,code:'ACCOUNT_DELETE_FAILED'})}
  if(!r.ok)throw Object.assign(new Error('We could not delete your account. Your device data has been kept. Please try again or contact support.'),{status:502,code:'ACCOUNT_DELETE_FAILED'});
  // A successful DELETE response alone is not enough for a destructive
  // action. Confirm Auth can no longer find the user before telling the app
  // to erase its local copy and sign out every tab.
  let check;
  try{check=await fetch(target,{method:'GET',headers:serviceHeaders(),signal:AbortSignal.timeout(15000)})}
  catch{throw Object.assign(new Error('Account deletion could not be verified. Your device data has been kept. Please contact support before trying again.'),{status:502,code:'ACCOUNT_DELETE_UNVERIFIED'})}
  if(check.status!==404)throw Object.assign(new Error('Account deletion could not be verified. Your device data has been kept. Please contact support before trying again.'),{status:502,code:'ACCOUNT_DELETE_UNVERIFIED'});
  console.info(JSON.stringify({event:'account_delete',verified:true}));
  return json(res,200,{ok:true,deleted:true,verified:true});
 }catch(e){errorResponse(res,e)}
};
