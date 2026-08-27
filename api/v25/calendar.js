const {json,cors,verifyUser,errorResponse}=require('../../server/v18-lib');
const {calendarStatus,beginOAuth,finishOAuth,syncCalendar,disconnectCalendar}=require('../../server/calendar-v25');

function redirect(res,location){
  res.statusCode=302;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Location',location);
  res.end();
}

module.exports=async(req,res)=>{
  if(cors(req,res))return;
  const action=String(req.query?.action||'status');
  try{
    if(action==='callback'){
      const result=await finishOAuth({provider:req.query?.provider,state:req.query?.state,code:req.query?.code,error:req.query?.error,error_description:req.query?.error_description});
      const target=new URL(result.returnTo);
      target.searchParams.set('calendar','connected');
      target.searchParams.set('provider',result.provider);
      return redirect(res,target.toString());
    }
    const user=await verifyUser(req);
    if(action==='status'&&req.method==='GET')return json(res,200,{ok:true,...await calendarStatus(user.id)});
    if(action==='connect'&&req.method==='POST')return json(res,200,{ok:true,...await beginOAuth(user.id,req.body||{})});
    if(action==='sync'&&req.method==='POST')return json(res,200,await syncCalendar(user.id,req.body||{}));
    if(action==='disconnect'&&req.method==='POST')return json(res,200,await disconnectCalendar(user.id,req.body||{}));
    return json(res,405,{ok:false,error:'Method not allowed.'});
  }catch(error){
    if(action==='callback'){
      const target=new URL(process.env.APP_ORIGIN||'https://www.workandworkout.com');
      target.searchParams.set('calendar','error');
      target.searchParams.set('message',String(error.message||'Calendar connection failed').slice(0,180));
      return redirect(res,target.toString());
    }
    return errorResponse(res,error);
  }
};
