const {json,cors,verifyUser,deleteChat,errorResponse}=require('../../server/v18-lib');

module.exports=async(req,res)=>{
  if(cors(req,res))return;
  try{
    if(req.method!=='DELETE')return json(res,405,{ok:false,error:'Method not allowed'});
    const user=await verifyUser(req);
    const threadId=req.body?.threadId||null;
    if(threadId&&!/^[0-9a-f-]{36}$/i.test(threadId))return json(res,400,{ok:false,error:'Invalid chat thread.'});
    await deleteChat(user.id,threadId);
    return json(res,200,{ok:true,deleted:true});
  }catch(error){errorResponse(res,error)}
};
