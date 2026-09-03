const {json,cors,verifyUser,SUPABASE_URL,serviceHeaders,errorResponse}=require('../../server/v18-lib');
module.exports=async(req,res)=>{
 if(cors(req,res))return;
 try{
  if(req.method!=='DELETE')return json(res,405,{ok:false,error:'Method not allowed'});
  const user=await verifyUser(req);
  if(req.body?.confirmation!=='DELETE ACCOUNT'||req.body?.expectedUserId!==user.id)return json(res,400,{ok:false,error:'Confirm deletion for the account currently signed in.'});
  // Auth deletion cascades to this user's sessions and owner-scoped application rows.
  const r=await fetch(`${SUPABASE_URL()}/auth/v1/admin/users/${encodeURIComponent(user.id)}`,{method:'DELETE',headers:serviceHeaders(),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Object.assign(new Error('We could not delete your account. Your device data has been kept. Please try again or contact support.'),{status:502,code:'ACCOUNT_DELETE_FAILED'});
  return json(res,200,{ok:true,deleted:true});
 }catch(e){errorResponse(res,e)}
};
