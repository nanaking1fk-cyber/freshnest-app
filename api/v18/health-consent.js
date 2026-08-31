const {
  json,cors,verifyUser,getHealthConsent,healthConsentActive,recordHealthConsent,
  HEALTH_CONSENT_VERSION,HEALTH_POLICY_VERSION,HEALTH_CONSENT_PURPOSES,
  HEALTH_CONSENT_STATEMENT,errorResponse
}=require('../../server/v18-lib');

module.exports=async(req,res)=>{
  if(cors(req,res))return;
  try{
    const user=await verifyUser(req);
    if(req.method==='GET'){
      const receipt=await getHealthConsent(user.id,user.authorization);
      const activePurposes=HEALTH_CONSENT_PURPOSES.filter(purpose=>healthConsentActive(receipt,purpose));
      return json(res,200,{ok:true,receipt,activePurposes,consentVersion:HEALTH_CONSENT_VERSION,policyVersion:HEALTH_POLICY_VERSION,statement:HEALTH_CONSENT_STATEMENT});
    }
    if(req.method==='POST'){
      const {action,confirmed,purposes,consentVersion,locale}=req.body||{};
      if(action!=='grant'&&action!=='withdraw')return json(res,400,{ok:false,error:'Consent action must be grant or withdraw.'});
      if(action==='grant'&&(confirmed!==true||consentVersion!==HEALTH_CONSENT_VERSION))return json(res,400,{ok:false,error:'Current explicit confirmation is required.'});
      const receipt=await recordHealthConsent(user.id,user.authorization,{action:action==='grant'?'granted':'withdrawn',purposes:Array.isArray(purposes)?purposes:[],locale});
      const activePurposes=HEALTH_CONSENT_PURPOSES.filter(purpose=>healthConsentActive(receipt,purpose));
      return json(res,200,{ok:true,receipt,activePurposes,consentVersion:HEALTH_CONSENT_VERSION,policyVersion:HEALTH_POLICY_VERSION});
    }
    return json(res,405,{ok:false,error:'Method not allowed'});
  }catch(error){errorResponse(res,error)}
};
