const lib=require('../../server/v18-lib');
const access=require('../../server/ai-access-v56');
const apple=require('../../server/apple-subscriptions-v56');
module.exports=async(req,res)=>{
  if(lib.cors(req,res))return;
  try{
    if(!['GET','POST'].includes(req.method))return lib.json(res,405,{ok:false,error:'Method not allowed.'});
    const user=await lib.verifyUser(req);
    let purchase;
    if(req.method==='POST')purchase=await apple.verifyPurchase(user.id,req.body?.signedTransaction);
    return lib.json(res,200,{ok:true,...await access.status(user),...(purchase?{purchase}:{})});
  }catch(error){return lib.errorResponse(res,error)}
};
