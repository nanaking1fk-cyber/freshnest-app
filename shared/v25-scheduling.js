(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WWScheduling=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const WEEKDAYS={sun:0,sunday:0,mon:1,monday:1,tue:2,tues:2,tuesday:2,wed:3,wednesday:3,thu:4,thur:4,thurs:4,thursday:4,fri:5,friday:5,sat:6,saturday:6};
  const DAY_TOKEN='(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)';
  const DAY_RE=new RegExp('\\b'+DAY_TOKEN+'\\b','gi');
  const NUMBER_WORDS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7};
  const COLORS=['#58a6ff','#b8f34a','#a78bfa','#f59e0b','#f472b6','#22d3ee','#fb7185','#34d399'];

  function pad(value){return String(value).padStart(2,'0')}
  function keyFromDate(value){return value.getFullYear()+'-'+pad(value.getMonth()+1)+'-'+pad(value.getDate())}
  function dateFromKey(value){const parts=String(value||'').split('-').map(Number);return new Date(parts[0],parts[1]-1,parts[2])}
  function addDays(value,days){const copy=new Date(value);copy.setDate(copy.getDate()+days);return copy}
  function diffDays(left,right){return Math.round((dateFromKey(left)-dateFromKey(right))/86400000)}
  function modulo(value,divisor){return((value%divisor)+divisor)%divisor}
  function minutes(value){if(!/^\d{2}:\d{2}$/.test(String(value||'')))return null;const parts=value.split(':').map(Number);return parts[0]*60+parts[1]}
  function normalizeHour(hour,minute,meridiem,{assumeAfternoon=false}={}){
    hour=Number(hour);minute=Number(minute||0);
    if(meridiem){
      meridiem=String(meridiem).toLowerCase();
      if(meridiem==='pm'&&hour<12)hour+=12;
      if(meridiem==='am'&&hour===12)hour=0;
    }else if(assumeAfternoon&&hour>=1&&hour<=6)hour+=12;
    return pad(modulo(hour,24))+':'+pad(Math.max(0,Math.min(59,minute)));
  }
  function parseTimes(text){
    const value=String(text||'');
    const range=value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if(range){
      let firstMeridiem=range[3],secondMeridiem=range[6];
      if(!firstMeridiem&&secondMeridiem)firstMeridiem=secondMeridiem;
      if(firstMeridiem&&!secondMeridiem)secondMeridiem=firstMeridiem;
      const start=normalizeHour(range[1],range[2],firstMeridiem);
      const end=normalizeHour(range[4],range[5],secondMeridiem);
      return{start,end,overnight:minutes(end)<=minutes(start),ambiguous:!range[3]&&!range[6]};
    }
    const single=value.match(/(?:\bat\b|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if(single){
      const ambiguous=!single[3];
      return{start:normalizeHour(single[1],single[2],single[3],{assumeAfternoon:ambiguous}),end:'',overnight:false,ambiguous};
    }
    return{start:'',end:'',overnight:false,ambiguous:false};
  }

  function splitInput(raw){
    return String(raw||'').replace(/([.!?])\s+(?=[A-Z0-9])/g,'$1\n').split(/\n+|;\s*/).map(value=>value.trim()).filter(Boolean);
  }
  function expandDayLanguage(text){
    let value=String(text||'').replace(/\bweekdays?\b/gi,'Monday Tuesday Wednesday Thursday Friday').replace(/\bweekends?\b/gi,'Saturday Sunday');
    return value.replace(new RegExp('\\b'+DAY_TOKEN+'\\s*(?:-|–|—|through|thru)\\s*'+DAY_TOKEN+'\\b','gi'),function(match,start,end){
      const first=WEEKDAYS[start.toLowerCase()],last=WEEKDAYS[end.toLowerCase()],names=[DAY_NAMES[first]];
      let cursor=first;
      while(cursor!==last&&names.length<7){cursor=(cursor+1)%7;names.push(DAY_NAMES[cursor])}
      return names.join(' ');
    });
  }
  function explicitDate(text,now=new Date()){
    if(/\btoday\b/i.test(text))return keyFromDate(now);
    if(/\btomorrow\b/i.test(text))return keyFromDate(addDays(now,1));
    const iso=text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if(iso)return keyFromDate(new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3])));
    const slash=text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
    if(slash)return keyFromDate(new Date(Number(slash[3]||now.getFullYear()),Number(slash[1])-1,Number(slash[2])));
    const months={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
    const named=text.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i);
    if(named)return keyFromDate(new Date(Number(named[3]||now.getFullYear()),months[named[1].toLowerCase()],Number(named[2])));
    return'';
  }
  function nextWeekday(index,now=new Date(),weekOffset=0){
    let delta=(index-now.getDay()+7)%7;
    if(/Invalid/.test(String(now)))delta=0;
    return addDays(now,delta+weekOffset*7);
  }
  function weekdaysIn(text){
    const found=[],seen=new Set();let match;
    DAY_RE.lastIndex=0;
    while((match=DAY_RE.exec(text))){const value=WEEKDAYS[match[1].toLowerCase()];if(!seen.has(value)){seen.add(value);found.push(value)}}
    DAY_RE.lastIndex=0;
    return found;
  }
  function deadlineDate(text,now=new Date()){
    const before=text.match(/\bbefore\s+([a-z]+)\b/i);
    if(!before||WEEKDAYS[before[1].toLowerCase()]==null)return'';
    return keyFromDate(addDays(nextWeekday(WEEKDAYS[before[1].toLowerCase()],now),-1));
  }
  function classify(text){
    if(/\b(work|working|shift|job|on call|double)\b/i.test(text))return'work';
    if(/\b(workout|gym|train|training|run|walk|yoga|lift|cardio)\b/i.test(text))return'workout';
    if(/\b(meal|lunch|dinner|breakfast|grocer|cook|food|prep)\b/i.test(text))return'meal';
    if(/\b(doctor|dentist|appointment|pickup|pick up|meeting|class|church)\b/i.test(text))return'event';
    return'todo';
  }
  function titleFor(text,kind){
    let clean=String(text||'').replace(/\b(every|each|weekly|today|tomorrow|this week)\b/gi,'').replace(/\bbefore\s+[a-z]+\b/gi,'').replace(DAY_RE,'').replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi,'').replace(/(?:\bat\b|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi,'').replace(/\b(?:one|two|three|four|five|six|seven|\d+)\s+times?\b/gi,'').replace(/[.!?]+$/,'').replace(/\s+/g,' ').replace(/^[,.\-\s]+|[,.\-\s]+$/g,'').trim();
    DAY_RE.lastIndex=0;
    if(kind==='work'){
      const place=text.match(/\b(?:work|working|shift)\s+at\s+([A-Za-z][A-Za-z0-9 '&-]{2,32})/i);
      return place&&place[1]?place[1].trim()+' shift':'Work shift';
    }
    if(kind==='workout')return clean.length>3?clean.charAt(0).toUpperCase()+clean.slice(1):'Workout';
    if(kind==='meal'&&/\bprep\b/i.test(text))return'Meal prep';
    if(!clean)return kind==='event'?'Appointment':kind==='meal'?'Meal planning':kind==='todo'?'To-do':'Workout';
    return clean.charAt(0).toUpperCase()+clean.slice(1);
  }
  function frequency(text){
    const match=String(text||'').match(/\b(one|two|three|four|five|six|seven|\d+)\s+times?\b/i);
    if(!match)return 0;
    return Math.max(1,Math.min(7,NUMBER_WORDS[match[1].toLowerCase()]||Number(match[1])||1));
  }
  function confidenceFor({hasDate,hasTime,hasEnd,kind,ambiguous,sourceType='text'}){
    let score=.4;const reasons=[];
    if(hasDate){score+=.25;reasons.push('date recognized')}else reasons.push('date inferred');
    if(hasTime){score+=.18;reasons.push(ambiguous?'time inferred':'time recognized')}else reasons.push('time not supplied');
    if(kind!=='work'||hasEnd){score+=.1}else reasons.push('shift end missing');
    if(ambiguous)score-=.08;
    if(sourceType==='ocr')score-=.08;
    if(sourceType==='external')score+=.07;
    score=Math.max(.2,Math.min(.99,score));
    return{score:Number(score.toFixed(2)),label:score>=.84?'High':score>=.63?'Medium':'Low',reasons};
  }
  function datesFor(text,kind,{now=new Date(),weeks=8}={}){
    const exact=explicitDate(text,now);
    if(exact)return[exact];
    const found=weekdaysIn(text);
    if(!found.length)return[keyFromDate(now)];
    const recurring=kind==='work'&&(/\bevery\b|\beach\b|\bweekly\b|\bshifts?\b/i.test(text)||found.length>1);
    const values=[];
    found.forEach(index=>{for(let week=0;week<(recurring?weeks:1);week++)values.push(keyFromDate(nextWeekday(index,now,week+(/\bnext\b/i.test(text)?1:0))))});
    return values.sort();
  }
  function parseNaturalLanguage(raw,{now=new Date(),sourceId='work',sourceType='text',weeks=8}={}){
    const entries=[];
    splitInput(raw).forEach((segment,segmentIndex)=>{
      const normalized=expandDayLanguage(segment),kind=classify(normalized),times=parseTimes(normalized),days=weekdaysIn(normalized),exact=explicitDate(normalized,now),deadline=deadlineDate(normalized,now),count=frequency(normalized),seriesId='series-'+segmentIndex+'-'+Math.abs(hashString(segment));
      const hasDate=!!exact||days.length>0||!!deadline;
      if(count>1&&(kind==='workout'||kind==='todo'||kind==='meal')&&!exact&&!days.length){
        for(let index=0;index<count;index++)entries.push(makeEntry({segment,segmentIndex,index,kind,date:keyFromDate(now),times,title:titleFor(normalized,kind),sourceId,sourceType,seriesId,hasDate:true,flexible:true,deadline:deadline||keyFromDate(addDays(now,6)),confidence:confidenceFor({hasDate:true,hasTime:!!times.start,hasEnd:!!times.end,kind,ambiguous:times.ambiguous,sourceType})}));
        return;
      }
      const dates=deadline&&!exact&&!days.length?[deadline]:datesFor(normalized,kind,{now,weeks});
      dates.forEach((date,index)=>entries.push(makeEntry({segment,segmentIndex,index,kind,date,times,title:titleFor(normalized,kind),sourceId,sourceType,seriesId,hasDate,flexible:!!deadline&&!times.start,deadline,confidence:confidenceFor({hasDate,hasTime:!!times.start,hasEnd:!!times.end,kind,ambiguous:times.ambiguous,sourceType})})));
    });
    return entries;
  }
  function makeEntry({segment,segmentIndex,index,kind,date,times,title,sourceId,sourceType,seriesId,hasDate,flexible,deadline,confidence}){
    return{id:'proposal-'+segmentIndex+'-'+index+'-'+Math.abs(hashString(segment+'|'+date+'|'+index)),kind,date,title,start:times.start,end:times.end,overnight:times.overnight,reminder:kind==='work'?60:(kind==='event'||kind==='workout'?30:0),sourceText:segment,sourceType,sourceId:kind==='work'?sourceId:'',seriesId,series:index>0||kind==='work'&&seriesId,index,needsReview:!hasDate,flexible:!!flexible,deadline:deadline||'',confidence};
  }
  function hashString(value){let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash|0}

  function eventBounds(event){
    if(!event?.date||!event.start)return null;
    const start=dateFromKey(event.date),startParts=event.start.split(':').map(Number);start.setHours(startParts[0],startParts[1]||0,0,0);
    const end=new Date(start),endParts=String(event.end||event.start).split(':').map(Number);end.setHours(endParts[0],endParts[1]||0,0,0);
    if(!event.end)end.setTime(start.getTime()+60*60000);
    else if(end<=start)end.setDate(end.getDate()+1);
    return{start:start.getTime(),end:end.getTime()};
  }
  function overlap(left,right){const a=eventBounds(left),b=eventBounds(right);return!!(a&&b&&a.start<b.end&&b.start<a.end)}
  function sameEvent(left,right){return left.date===right.date&&String(left.start||'')===String(right.start||'')&&String(left.end||'')===String(right.end||'')&&String(left.title||'').trim().toLowerCase()===String(right.title||'').trim().toLowerCase()}
  function detectConflicts(proposals,existing=[]){
    const map={};
    proposals.forEach((proposal,index)=>{
      const conflicts=[];
      existing.forEach(event=>{
        if(sameEvent(proposal,event))conflicts.push({type:'duplicate',event,message:'Already on your calendar'});
        else if(overlap(proposal,event))conflicts.push({type:'overlap',event,message:'Overlaps '+(event.title||'another item')});
        else if(proposal.kind==='work'&&event.kind==='work'&&proposal.date===event.date&&proposal.sourceId===event.sourceId)conflicts.push({type:'same-source',event,message:'Another shift from this source already exists on this date'});
      });
      proposals.slice(0,index).forEach(event=>{if(overlap(proposal,event))conflicts.push({type:'proposal-overlap',event,message:'Overlaps another proposed item'})});
      if(conflicts.length)map[proposal.id]=conflicts;
    });
    return map;
  }
  function durationHours(event){const bounds=eventBounds(event);return bounds?Math.max(0,(bounds.end-bounds.start)/3600000):0}

  function busyOn(events,dateKey){return events.filter(event=>event.date===dateKey&&event.start).map(eventBounds).filter(Boolean)}
  function slotFree(events,dateKey,start,duration=60){
    const candidate={date:dateKey,start,end:timeAfter(start,duration)};
    return!events.some(event=>overlap(candidate,event));
  }
  function timeAfter(value,amount){const total=modulo((minutes(value)||0)+amount,1440);return pad(Math.floor(total/60))+':'+pad(total%60)}
  function placeFlexibleEntries(entries,existing=[],{now=new Date()}={}){
    const fixed=entries.filter(item=>!item.flexible),busy=existing.concat(fixed),output=[];
    entries.forEach((item,index)=>{
      if(!item.flexible){output.push(item);return}
      const deadline=item.deadline?dateFromKey(item.deadline):addDays(now,6),startDay=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      const candidates=[];
      for(let day=new Date(startDay);day<=deadline;day=addDays(day,1)){
        const key=keyFromDate(day),weekend=[0,6].includes(day.getDay()),times=item.kind==='workout'?(weekend?['10:00','16:00','08:00']:['18:00','06:30','20:00']):(weekend?['11:00','15:00']:['17:30','19:00','12:00']);
        times.forEach(time=>{if(slotFree(busy.concat(output),key,time,item.kind==='workout'?60:45))candidates.push({date:key,start:time})});
      }
      const sameSeries=output.filter(entry=>entry.seriesId===item.seriesId),usedDays=new Set(sameSeries.map(entry=>entry.date));
      const choice=candidates.find(candidate=>!usedDays.has(candidate.date)&&!sameSeries.some(entry=>Math.abs(diffDays(candidate.date,entry.date))<2))||candidates.find(candidate=>!usedDays.has(candidate.date))||candidates[0];
      const placed=Object.assign({},item,choice||{},{end:choice?timeAfter(choice.start,item.kind==='workout'?60:45):item.end,needsReview:!choice,confidence:choice?confidenceFor({hasDate:true,hasTime:true,hasEnd:true,kind:item.kind,ambiguous:false,sourceType:item.sourceType}):item.confidence,suggestion:choice?'Suggested in a free time window':'No free window found'});
      output.push(placed);
    });
    return output;
  }

  function patternFromPreset(preset,{onDays=4,offDays=2}={}){
    if(preset==='four_two')return Array.from({length:onDays+offDays},(_,index)=>index<onDays?'D':'O');
    if(preset==='alternating_weekends')return['D','D','D','D','D','D','D','D','D','D','O','O','O','O'];
    if(preset==='rotating_nights')return['D','D','O','O','N','N','O','O'];
    return['D','D','D','D','O','O'];
  }
  function parsePattern(value){
    const source=Array.isArray(value)?value:String(value||'').split(/[\s,|/]+/);
    return source.map(token=>String(token||'').trim().toUpperCase()).filter(Boolean).map(token=>token.startsWith('N')?'N':token.startsWith('O')||token==='-'?'O':'D').slice(0,42);
  }
  function normalizeRotation(rotation){
    const pattern=parsePattern(rotation?.pattern?.length?rotation.pattern:patternFromPreset(rotation?.preset||'four_two',rotation||{}));
    return Object.assign({id:'rotation-'+Math.abs(hashString(JSON.stringify(rotation||{})+Date.now())),name:'Work rotation',sourceId:'work',anchor:keyFromDate(new Date()),active:true,dayStart:'07:00',dayEnd:'19:00',nightStart:'19:00',nightEnd:'07:00',exceptions:{}},rotation,{pattern:pattern.length?pattern:['D','D','D','D','O','O']});
  }
  function rotationEventOn(rotation,dateKey,source){
    const rule=normalizeRotation(rotation);
    if(!rule.active||dateKey<rule.anchor)return null;
    const exception=rule.exceptions&&rule.exceptions[dateKey];
    if(exception?.action==='skip')return null;
    const token=rule.pattern[modulo(diffDays(dateKey,rule.anchor),rule.pattern.length)];
    if(token==='O'&&!exception?.action)return null;
    const night=exception?.night!=null?!!exception.night:token==='N';
    const start=exception?.start||(night?rule.nightStart:rule.dayStart),end=exception?.end||(night?rule.nightEnd:rule.dayEnd);
    return{id:'rotation:'+rule.id+':'+dateKey,kind:'work',date:dateKey,title:exception?.title||rule.name||source?.name||'Work shift',start,end,overnight:minutes(end)<=minutes(start),sourceId:rule.sourceId,sourceName:source?.name||'Work',color:source?.color||COLORS[0],rotationId:rule.id,generated:true,exception:!!exception,updatedAt:rule.updatedAt||rule.createdAt||''};
  }
  function projectRotation(rotation,startKey,endKey,source){
    const values=[];
    for(let day=dateFromKey(startKey),end=dateFromKey(endKey);day<=end;day=addDays(day,1)){const event=rotationEventOn(rotation,keyFromDate(day),source);if(event)values.push(event)}
    return values;
  }
  function eventsForRange({events=[],rotations=[],sources=[]},startKey,endKey){
    const sourceMap=Object.fromEntries(sources.map(source=>[source.id,source])),values=events.filter(event=>event.date>=startKey&&event.date<=endKey);
    rotations.forEach(rotation=>values.push(...projectRotation(rotation,startKey,endKey,sourceMap[rotation.sourceId])));
    return dedupeEvents(values).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  }
  function dedupeEvents(events){const seen=new Set();return events.filter(event=>{const key=event.id||[event.kind,event.date,event.start,event.end,event.title,event.sourceId].join('|');if(seen.has(key))return false;seen.add(key);return true})}
  function startOfWeek(value){const day=dateFromKey(value),offset=(day.getDay()+6)%7;return keyFromDate(addDays(day,-offset))}
  function weeklySummary(events,dateKey,sources=[]){
    const start=startOfWeek(dateKey),end=keyFromDate(addDays(dateFromKey(start),6)),work=eventsForRange({events,rotations:[],sources},start,end).filter(event=>event.kind==='work'),sourceMap=Object.fromEntries(sources.map(source=>[source.id,source])),totals={};
    work.forEach(event=>{const id=event.sourceId||'work',source=sourceMap[id]||{id,name:event.sourceName||'Work',color:event.color||COLORS[0],overtimeThreshold:40};if(!totals[id])totals[id]={source,hours:0,overtime:0};totals[id].hours+=durationHours(event)});
    Object.values(totals).forEach(value=>{value.hours=Number(value.hours.toFixed(1));value.overtime=Number(Math.max(0,value.hours-(Number(value.source.overtimeThreshold)||40)).toFixed(1))});
    const conflicts=detectPairConflicts(work);
    return{start,end,totalHours:Number(Object.values(totals).reduce((sum,value)=>sum+value.hours,0).toFixed(1)),totals:Object.values(totals),conflicts};
  }
  function detectPairConflicts(events){
    const values=[];
    events.forEach((event,index)=>{
      events.slice(index+1).forEach(other=>{
        if(overlap(event,other))values.push({left:event,right:other,message:(event.title||'Work')+' overlaps '+(other.title||'another item')});
      });
    });
    return values;
  }

  return{DAY_NAMES,WEEKDAYS,COLORS,pad,keyFromDate,dateFromKey,addDays,diffDays,minutes,parseTimes,splitInput,expandDayLanguage,explicitDate,deadlineDate,classify,parseNaturalLanguage,confidenceFor,eventBounds,overlap,sameEvent,detectConflicts,durationHours,timeAfter,placeFlexibleEntries,patternFromPreset,parsePattern,normalizeRotation,rotationEventOn,projectRotation,eventsForRange,dedupeEvents,startOfWeek,weeklySummary,detectPairConflicts,hashString};
});
