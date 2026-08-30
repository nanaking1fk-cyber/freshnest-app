const {json,cors,verifyUser,errorResponse}=require('../../server/v18-lib');
const {calendarStatus,beginOAuth,finishOAuth,syncCalendar,disconnectCalendar}=require('../../server/calendar-v25');

function redirect(res,location){
  res.statusCode=302;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Location',location);
  res.end();
}

function requestSearchParams(req){
  // Parse the raw request URL with the WHATWG API instead of Vercel's legacy
  // query object, which can invoke Node's deprecated parser.
  return new URL(String(req.url||'/api/v25/calendar'),'https://www.workandworkout.com').searchParams;
}

module.exports=async(req,res)=>{
  if(cors(req,res))return;
  const query=requestSearchParams(req);
  const action=String(query.get('action')||'status');
  try{
    if(action==='callback'){
      const result=await finishOAuth({provider:query.get('provider'),state:query.get('state'),code:query.get('code'),error:query.get('error'),error_description:query.get('error_description')});
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
