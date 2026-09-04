const lib=require('../../server/v18-lib');
const apple=require('../../server/apple-subscriptions-v56');
module.exports=async(req,res)=>{
  if(lib.cors(req,res))return;
  try{
    if(req.method!=='POST')return lib.json(res,405,{ok:false,error:'Method not allowed.'});
    await apple.notification(req.body?.signedPayload);
    return lib.json(res,200,{ok:true});
  }catch(error){return lib.errorResponse(res,error)}
};
