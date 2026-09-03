(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.WWWorkPayCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DAY=86400000,formatters=new Map();
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const number=v=>v===null||v===undefined||String(v).trim()===''?null:(Number.isFinite(Number(v))?Number(v):null);
 function key(date){return date.toISOString().slice(0,10)}
 function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(+d)&&key(d)===value}
 function addDays(value,days){if(!validDate(value))throw Error('Choose a valid date.');return key(new Date(Date.parse(value+'T00:00:00Z')+days*DAY))}
 function minutes(value){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value||''))return null;const [h,m]=value.split(':').map(Number);return h*60+m}
 function displayTime(value,index=0){const matches=String(value||'').match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)?/gi)||[],part=matches[index];if(!part)return'';const m=part.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);let h=+m[1];if(m[3])h=h%12+(/PM/i.test(m[3])?12:0);const result=String(h).padStart(2,'0')+':'+m[2];return minutes(result)===null?'':result}
 function formatter(zone){if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));return formatters.get(zone)}
 function parts(timestamp,zone){const p=Object.fromEntries(formatter(zone).formatToParts(new Date(timestamp)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return{date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute}}
 // Resolve civil time in the workplace timezone, including DST. Repeated
 // clock times use the first start / last end and are flagged for review.
 function instant(date,time,zone,late=false){
  if(!validDate(date)||minutes(time)===null)throw Error('Check the shift date and times.');
  const target=Date.parse(date+'T'+time+':00Z'),offsets=new Set();
  for(const delta of [-DAY,0,DAY]){const t=target+delta,p=parts(t,zone);offsets.add(Date.parse(p.date+'T'+p.time+':00Z')-t)}
  const candidates=[...offsets].map(offset=>target-offset).filter(t=>{const p=parts(t,zone);return p.date===date&&p.time===time}).sort((a,b)=>a-b);
  if(!candidates.length)throw Error('This time does not exist because the clocks change. Enter the actual times.');
  return{timestamp:candidates[late?candidates.length-1:0],ambiguous:candidates.length>1};
 }
 function defaults(){return{rate:null,currency:'USD',period:'biweekly',anchor:'2026-01-05',weekStarts:1,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',breakMinutes:0,weeklyAfter:null,dailyAfter:null,doubleAfter:null,otMultiplier:1.5,doubleMultiplier:2,holidayMultiplier:1,stack:'highest',nightStart:'19:00',nightEnd:'07:00',nightDifferential:0,weekendDifferential:0,differentialPremium:true,withholdingPercent:null,deductions:[]}}
 function validateRules(raw){
  const r=Object.assign(defaults(),raw||{}),issues=[];
  for(const [field,min,max] of [['rate',0,100000],['breakMinutes',0,1440],['weeklyAfter',1,168],['dailyAfter',1,24],['doubleAfter',1,24],['otMultiplier',1,10],['doubleMultiplier',1,10],['holidayMultiplier',1,10],['nightDifferential',0,10000],['weekendDifferential',0,10000],['withholdingPercent',0,100]]){
   const value=number(r[field]);if(value!==null&&(value<min||value>max)||r[field]!==''&&r[field]!=null&&value===null)issues.push('Check '+field.replace(/([A-Z])/g,' $1').toLowerCase()+'.');r[field]=value;
  }
  for(const field of ['otMultiplier','doubleMultiplier','holidayMultiplier'])if(r[field]===null)issues.push('Enter each pay multiplier, using 1 for normal pay.');
  if(!['weekly','biweekly','fourweekly','semimonthly','monthly'].includes(r.period))issues.push('Choose a pay period.');
  if(!validDate(r.anchor))issues.push('Choose the first day of a pay period.');
  if(!Number.isInteger(+r.weekStarts)||+r.weekStarts<0||+r.weekStarts>6)issues.push('Choose the first day of your workweek.');r.weekStarts=+r.weekStarts;
  if(!/^[A-Z]{3}$/.test(r.currency))issues.push('Use a three-letter currency code.');
  try{formatter(r.timeZone).format(new Date())}catch{issues.push('Choose a valid workplace timezone.')}
  if(minutes(r.nightStart)===null||minutes(r.nightEnd)===null)issues.push('Check the night-pay times.');
  if(r.dailyAfter!==null&&r.doubleAfter!==null&&r.doubleAfter<=r.dailyAfter)issues.push('Double-time hours must start after daily overtime.');
  if(!['highest','add'].includes(r.stack))issues.push('Choose how pay premiums combine.');
  r.deductions=(Array.isArray(r.deductions)?r.deductions:[]).slice(0,30).map(d=>({name:String(d.name||'Deduction').slice(0,80),timing:d.timing,mode:d.mode,amount:number(d.amount)}));
  for(const d of r.deductions)if(!['pre','post'].includes(d.timing)||!['fixed','percent'].includes(d.mode)||d.amount===null||d.amount<0||d.amount>(d.mode==='percent'?100:1000000))issues.push('Check the deduction amount and type.');
  if(issues.length)throw Error(issues[0]);return r;
 }
 function periodFor(date,rules){
  const r=Object.assign(defaults(),rules||{});if(!validDate(date))throw Error('Choose a valid date.');
  const d=new Date(date+'T00:00:00Z'),y=d.getUTCFullYear(),m=d.getUTCMonth();let start,end;
  if(r.period==='monthly'||r.period==='semimonthly'){
   start=key(new Date(Date.UTC(y,m,r.period==='semimonthly'&&d.getUTCDate()>15?16:1)));
   end=r.period==='semimonthly'&&d.getUTCDate()<=15?key(new Date(Date.UTC(y,m,15))):key(new Date(Date.UTC(y,m+1,0)));
  }else{const days=r.period==='weekly'?7:r.period==='fourweekly'?28:14,anchor=validDate(r.anchor)?r.anchor:defaults().anchor,offset=Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse(anchor+'T00:00:00Z'))/DAY/days)*days;start=addDays(anchor,offset);end=addDays(start,days-1)}
  return{start,end};
 }
 function weekStart(date,first=1){return addDays(date,-((new Date(date+'T00:00:00Z').getUTCDay()-first+7)%7))}
 function calendarEntries(rows,date,rawEvents=[]){
  const seen=new Set();
  return rows.filter(row=>!row.unknown&&!row.off).map((row,index)=>{
   const event=rawEvents.find(e=>e.id===row.eventId)||{},sourceId=row.sourceId||'legacy:'+String(row.name||'Work');
   const start=row.start||displayTime(row.time,0),end=row.end||displayTime(row.time,1);
   return{id:'cal:'+date+':'+(row.eventId||row.rotationId||sourceId+':'+start+':'+end),calendar:true,legacy:!!row.legacy,date,sourceId,title:row.name||'Work shift',start,end,kind:event.exceptionType==='overtime'?'overtime':'work',holiday:event.exceptionType==='holiday',status:'planned',calendarDone:!!row.done};
  }).filter(row=>{const key=[row.sourceId,row.date,row.start,row.end].join('|');if(seen.has(row.id)||row.legacy&&seen.has(key))return false;seen.add(row.id);seen.add(key);return true});
 }
 function reconcile(planned,records){
  const byId=new Map(planned.map(row=>[row.id,row]));
  for(const row of Object.values(records||{})){
   if(!row||!row.id||!validDate(row.date))continue;
   const original=byId.get(row.id);byId.set(row.id,Object.assign({},row,{calendarChanged:!!original&&(original.date!==row.date||original.start!==row.scheduledStart||original.end!==row.scheduledEnd),detached:!!row.calendar&&!original}));
  }
  return[...byId.values()].filter(row=>row.status!=='skipped');
 }
 function bounds(entry,rules){
  const r=Object.assign(defaults(),rules),zone=r.timeZone;
  if(!validDate(entry.date))throw Error('Choose a valid shift date.');
  for(const name of ['rate','paidHours','breakMinutes','differential','startedAt','endedAt'])if(entry[name]!=null&&entry[name]!==''&&(number(entry[name])===null||number(entry[name])<0))throw Error('Check the shift hours and pay amounts.');
  if(number(entry.rate)>100000||number(entry.differential)>10000)throw Error('Check the shift pay amounts.');
  if(entry.kind==='leave'){const hours=number(entry.paidHours);if(hours===null||hours<0||hours>24)throw Error('Enter up to 24 paid leave hours.');return{hours,segments:[],warnings:[]}}
  const endDate=entry.endDate||addDays(entry.date,minutes(entry.end)<=minutes(entry.start)?1:0);
  const first=instant(entry.date,entry.start,zone),last=instant(endDate,entry.end,zone,true);
  const start=number(entry.startedAt)??first.timestamp,end=number(entry.endedAt)??last.timestamp,total=(end-start)/3600000;
  if(!(total>0&&total<=48))throw Error('A shift must be longer than zero and no more than 48 hours.');
  const unpaid=number(entry.breakMinutes)??r.breakMinutes??0,override=number(entry.paidHours),hours=override??(total-unpaid/60);
  if(unpaid<0||unpaid>total*60||hours<0||hours>48)throw Error('Check paid hours and unpaid breaks.');
  const warnings=[];if(first.ambiguous||last.ambiguous||Math.abs(total-((Date.parse(endDate+'T'+entry.end+':00Z')-Date.parse(entry.date+'T'+entry.start+':00Z'))/3600000))>1/30)warnings.push('Clock-change shift: check the paid hours.');
  if(parts(start,zone).date!==parts(end-1,zone).date&&unpaid>0)warnings.push('Overnight break is spread across the shift. Split the entry if payroll assigns it to a specific day.');
  if(entry.holiday&&parts(start,zone).date!==parts(end-1,zone).date)warnings.push('Holiday pay covers this whole entry. Split it if only part of the shift qualifies.');
  const cuts=new Set([start,end]);let date=parts(start,zone).date;
  for(let i=0;i<4;i++,date=addDays(date,1)){
   for(const time of ['00:00',r.nightStart,r.nightEnd]){try{const t=instant(date,time,zone).timestamp;if(t>start&&t<end)cuts.add(t)}catch{}}
  }
  const values=[...cuts].sort((a,b)=>a-b),segments=[];
  for(let i=1;i<values.length;i++){const a=values[i-1],b=values[i],p=parts(a,zone);segments.push({date:p.date,start:a,end:b,hours:(b-a)/3600000*hours/total,time:p.time})}
  return{start,end,hours,segments,warnings,unpaidMinutes:unpaid};
 }
 function summarize(entries,rules,range,{confirmedOnly=false}={}){
  const r=validateRules(rules),daily=new Map(),weekly=new Map(),results=[],warnings=new Set(),intervals=[];
  const contextStart=weekStart(range.start,r.weekStarts),sorted=entries.filter(e=>!confirmedOnly||e.status==='confirmed').slice().sort((a,b)=>(a.date+' '+(a.start||'00:00')).localeCompare(b.date+' '+(b.start||'00:00')));
  for(const e of sorted){
   if(e.date>range.end||e.date<addDays(contextStart,-2))continue;
   const row={entry:e,regular:0,overtime:0,double:0,holiday:0,leave:0,hours:0,gross:0,basePay:0,premiumPay:0,differentialPay:0,warnings:[]};
   const rate=number(e.rate)??r.rate;row.rate=rate;row.missingRate=rate===null;
   try{
    const b=bounds(e,r);row.breakMinutes=b.unpaidMinutes??0;row.warnings.push(...b.warnings);
    if(e.kind==='leave'){
     if(b.hours===null||b.hours<0||b.hours>24)throw Error('Enter up to 24 paid leave hours.');
     if(e.date>=range.start&&e.date<=range.end){row.leave=b.hours;row.gross=row.basePay=b.hours*(rate??0)}
    }else{
     for(const other of intervals)if(other.end>b.start&&b.end>other.start&&e.date>=range.start)row.warnings.push('Overlapping shifts: confirm that these hours should both be paid.');
     intervals.push({start:b.start,end:b.end});
     for(const seg of b.segments){
      if(seg.date<contextStart||seg.date>range.end)continue;
      const dayKey=seg.date,weekKey=weekStart(seg.date,r.weekStarts),day=daily.get(dayKey)||0;let remaining=seg.hours,cursor=day;
      while(remaining>1e-8){
       let type='regular',amount=remaining;
       if(e.kind==='double'||r.doubleAfter!==null&&cursor>=r.doubleAfter-1e-8)type='double';
       else if(e.kind==='overtime'||r.dailyAfter!==null&&cursor>=r.dailyAfter-1e-8)type='overtime';
       for(const threshold of [r.dailyAfter,r.doubleAfter])if(threshold!==null&&threshold>cursor+1e-8)amount=Math.min(amount,threshold-cursor);
       if(type==='regular'&&r.weeklyAfter!==null){const regular=weekly.get(weekKey)||0;if(regular>=r.weeklyAfter-1e-8)type='overtime';else amount=Math.min(amount,r.weeklyAfter-regular)}
       if(type==='regular')weekly.set(weekKey,(weekly.get(weekKey)||0)+amount);
       if(seg.date>=range.start){
        row[type]+=amount;row.hours+=amount;if(e.holiday)row.holiday+=amount;
        const ot=type==='double'?r.doubleMultiplier:type==='overtime'?r.otMultiplier:1,holiday=e.holiday?r.holidayMultiplier:1,multiplier=r.stack==='add'?1+(ot-1)+(holiday-1):Math.max(ot,holiday);
        const clock=minutes(seg.time),nightStart=minutes(r.nightStart),nightEnd=minutes(r.nightEnd),night=nightStart===nightEnd?false:nightStart<nightEnd?clock>=nightStart&&clock<nightEnd:clock>=nightStart||clock<nightEnd,weekend=[0,6].includes(new Date(seg.date+'T00:00:00Z').getUTCDay());
        const differential=(number(e.differential)||0)+(night?(r.nightDifferential||0):0)+(weekend?(r.weekendDifferential||0):0),base=amount*(rate??0),premium=base*(multiplier-1),extra=amount*differential*(r.differentialPremium?multiplier:1);
        row.basePay+=base;row.premiumPay+=premium;row.differentialPay+=extra;row.gross+=base+premium+extra;
       }
       remaining-=amount;cursor+=amount;
      }
      daily.set(dayKey,day+seg.hours);
     }
    }
   }catch(error){row.invalid=true;row.warnings.push(error.message)}
   if(row.hours||row.leave||e.date>=range.start&&e.date<=range.end){results.push(row);for(const warning of row.warnings)warnings.add(warning)}
  }
  const totals={hours:0,regular:0,overtime:0,double:0,holiday:0,leave:0,gross:0,basePay:0,premiumPay:0,differentialPay:0};
  for(const row of results)for(const name of Object.keys(totals))totals[name]+=row[name];
  const incomplete=results.some(row=>row.invalid||row.missingRate),gross=round(totals.gross),deductions=r.deductions.map(d=>Object.assign({},d,{total:round(d.mode==='percent'?gross*d.amount/100:d.amount)}));
  const pre=round(deductions.filter(d=>d.timing==='pre').reduce((sum,d)=>sum+d.total,0)),post=round(deductions.filter(d=>d.timing==='post').reduce((sum,d)=>sum+d.total,0)),taxBase=Math.max(0,gross-pre),tax=r.withholdingPercent===null?null:round(taxBase*r.withholdingPercent/100),net=incomplete||tax===null?null:round(gross-pre-post-tax);
  if(net!==null&&net<0)warnings.add('Deductions exceed this estimate. Check the amounts.');
  if(incomplete)warnings.add('Add missing rates or correct flagged shifts for a complete pay estimate.');
  return{rows:results,totals:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,round(v)])),incomplete,deductions,pre,post,taxBase:round(taxBase),tax,net,warnings:[...warnings]};
 }
 function csvCell(value){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return'"'+text.replaceAll('"','""')+'"'}
 function csv(report,currency){const rows=[['Date','Shift','Status','Start','End','End date','Unpaid break (min)','Work hours','Regular hours','Overtime hours','Double-time hours','Holiday worked hours (subset)','Paid leave hours','Hourly rate','Estimated gross','Currency','Review notes']];for(const row of report.rows){const e=row.entry;rows.push([e.date,e.title,e.status,e.kind==='leave'?'':e.start,e.kind==='leave'?'':e.end,e.endDate||'',row.breakMinutes,round(row.hours),round(row.regular),round(row.overtime),round(row.double),round(row.holiday),round(row.leave),row.rate,row.invalid||row.missingRate?'':round(row.gross),currency,row.warnings.join(' ')])}return'\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')}
 return{round,number,validDate,addDays,minutes,displayTime,parts,instant,defaults,validateRules,periodFor,weekStart,calendarEntries,reconcile,bounds,summarize,csv,csvCell};
});
