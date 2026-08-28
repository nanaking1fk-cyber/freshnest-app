(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WWRoster=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MONTHS={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,dec:11,december:11};
  const DAYS={sun:0,sunday:0,mon:1,monday:1,tue:2,tues:2,tuesday:2,wed:3,wednesday:3,thu:4,thur:4,thurs:4,thursday:4,fri:5,friday:5,sat:6,saturday:6};
  const OFF_RE=/^(?:off|rest|rdo|pto|vac|vacation|leave|--+|—+|x)$/i;
  const CODE_RE=/^(?:d|day|n|night)$/i;

  function pad(value){return String(value).padStart(2,'0')}
  function key(date){return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())}
  function dateFromKey(value){const parts=String(value||'').split('-').map(Number);return new Date(parts[0],parts[1]-1,parts[2])}
  function addDays(value,amount){const copy=new Date(value);copy.setDate(copy.getDate()+amount);return copy}
  function clean(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[‐‑‒–—]/g,'-').replace(/[^\S\r\n]+/g,' ').replace(/\r/g,'').trim()}
  function normalized(value){return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function tokens(value){return normalized(value).split(' ').filter(Boolean)}
  function unique(values){return[...new Set(values)]}
  function hash(value){let result=0;for(const char of String(value||''))result=(result*31+char.charCodeAt(0))|0;return Math.abs(result)}

  function levenshtein(left,right){
    left=normalized(left);right=normalized(right);
    if(!left)return right.length;if(!right)return left.length;
    const row=Array.from({length:right.length+1},(_,index)=>index);
    for(let i=1;i<=left.length;i++){
      let previous=row[0];row[0]=i;
      for(let j=1;j<=right.length;j++){
        const held=row[j],cost=left[i-1]===right[j-1]?0:1;
        row[j]=Math.min(row[j]+1,row[j-1]+1,previous+cost);previous=held;
      }
    }
    return row[right.length];
  }
  function tokenSimilarity(left,right){
    const distance=levenshtein(left,right),length=Math.max(normalized(left).length,normalized(right).length,1);
    return Math.max(0,1-distance/length);
  }
  function identityScore(line,identity){
    const source=normalized(line),target=normalized(identity);if(!source||!target)return 0;
    if(source===target)return 1;
    if(source.includes(target))return .98;
    const wanted=tokens(target),available=tokens(source);if(!wanted.length)return 0;
    const matches=wanted.map(token=>Math.max(0,...available.map(candidate=>tokenSimilarity(token,candidate))));
    const coverage=matches.filter(score=>score>=.72).length/wanted.length,average=matches.reduce((sum,value)=>sum+value,0)/wanted.length;
    if(coverage===1)return Math.min(.94,.7+average*.24);
    return average*.62+coverage*.25;
  }
  function bestIdentityLine(lines,identities){
    let best={index:-1,identity:'',line:'',score:0};
    lines.forEach(function(line,index){identities.forEach(function(identity){const score=identityScore(line,identity);if(score>best.score)best={index,identity,line,score}})});
    return best;
  }

  function safeDate(year,month,day){const value=new Date(year,month,day);return value.getFullYear()===year&&value.getMonth()===month&&value.getDate()===day?key(value):''}
  function chooseYear(month,day,now){
    let year=now.getFullYear(),candidate=new Date(year,month,day),distance=(candidate-now)/86400000;
    if(distance<-180)year++;else if(distance>300)year--;
    return year;
  }
  function parseDateToken(value,now=new Date()){
    const text=clean(value);
    let match=text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if(match)return safeDate(+match[1],+match[2]-1,+match[3]);
    match=text.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/);
    if(match){let year=match[3]?+match[3]:chooseYear(+match[1]-1,+match[2],now);if(year<100)year+=2000;return safeDate(year,+match[1]-1,+match[2])}
    match=text.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i);
    if(match){const month=MONTHS[match[1].toLowerCase()],day=+match[2],year=match[3]?+match[3]:chooseYear(month,day,now);return safeDate(year,month,day)}
    match=text.match(/\b(\d{1,2})\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:\s+(20\d{2}))?\b/i);
    if(match){const month=MONTHS[match[2].toLowerCase()],day=+match[1],year=match[3]?+match[3]:chooseYear(month,day,now);return safeDate(year,month,day)}
    return'';
  }
  function datesIn(value,now=new Date()){
    const text=clean(value),matches=[];
    const patterns=[/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g,/\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/g,/\b(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2}(?:,?\s+20\d{2})?\b/gi,/\b\d{1,2}\s+(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:\s+20\d{2})?\b/gi];
    patterns.forEach(function(pattern){for(const match of text.matchAll(pattern)){const date=parseDateToken(match[0],now);if(date)matches.push({date,index:match.index,raw:match[0]})}});
    return matches.sort((a,b)=>a.index-b.index).filter(function(item,index,list){return !index||item.index!==list[index-1].index||item.date!==list[index-1].date});
  }
  function nextWeekday(day,now){let delta=(day-now.getDay()+7)%7;if(delta===0)delta=7;return addDays(now,delta)}
  function weekdayDatesIn(value,now=new Date()){
    const results=[],seen=new Set(),pattern=/\b(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/gi;let match;
    while((match=pattern.exec(value))){const day=DAYS[match[1].toLowerCase()];if(seen.has(day))continue;seen.add(day);results.push({date:key(nextWeekday(day,now)),index:match.index,raw:match[0],needsReview:true})}
    return results;
  }

  function normalizeClock(hour,minute,meridiem){
    hour=+hour;minute=+(minute||0);meridiem=String(meridiem||'').toLowerCase();
    if(meridiem.startsWith('p')&&hour<12)hour+=12;if(meridiem.startsWith('a')&&hour===12)hour=0;
    return pad((hour+24)%24)+':'+pad(Math.min(59,minute));
  }
  function compactClock(raw,meridiem){
    const digits=String(raw||'').replace(/\D/g,'');
    if(digits.length>=3){const hour=+digits.slice(0,-2),minute=+digits.slice(-2);return normalizeClock(hour,minute,meridiem)}
    return normalizeClock(+digits,0,meridiem);
  }
  function parseTimeRange(value){
    const text=clean(value);
    let match=text.match(/\b(\d{1,2})(?::(\d{2}))?\s*([ap](?:\.?m\.?)?)?\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*([ap](?:\.?m\.?)?)?\b/i);
    if(match){let first=match[3],second=match[6];if(!first&&second)first=second;if(first&&!second)second=first;let start=normalizeClock(match[1],match[2],first),end=normalizeClock(match[4],match[5],second);if(!first&&!second&&+match[1]<=6&&+match[4]>=7)start=normalizeClock(match[1],match[2],'p');return{start,end,overnight:end<=start,ambiguous:!match[3]&&!match[6]}}
    match=text.match(/\b(\d{3,4})\s*(?:-|to)\s*(\d{3,4})\b/);
    if(match){const start=compactClock(match[1]),end=compactClock(match[2]);return{start,end,overnight:end<=start,ambiguous:false}}
    return null;
  }
  function shiftFromToken(value,date,options={}){
    const text=clean(value).replace(/^[:|,;\s]+|[:|,;\s]+$/g,'');if(!text)return null;
    if(OFF_RE.test(text))return{date,off:true,raw:text};
    const range=parseTimeRange(text);
    if(range)return{id:'roster-'+hash(date+'|'+range.start+'|'+range.end),kind:'work',date,title:options.title||'Work shift',start:range.start,end:range.end,overnight:range.overnight,needsReview:!!options.needsReview,sourceType:'roster',sourceText:'Roster shift for '+date,confidence:{label:options.confidence>=.85?'High':options.confidence>=.65?'Medium':'Low',score:options.confidence||.6,reasons:['Matched roster identity','Date and shift time extracted']}};
    if(CODE_RE.test(text)){
      const night=/^n/i.test(text),start=night?(options.nightStart||'19:00'):(options.dayStart||'07:00'),end=night?(options.nightEnd||'07:00'):(options.dayEnd||'19:00');
      return{id:'roster-'+hash(date+'|'+start+'|'+end),kind:'work',date,title:options.title||'Work shift',start,end,overnight:end<=start,needsReview:!!options.needsReview,sourceType:'roster',sourceText:'Roster '+(night?'night':'day')+' shift for '+date,confidence:{label:'Medium',score:Math.min(.79,options.confidence||.72),reasons:['Matched roster identity','Shift code interpreted with default hours']}};
    }
    return null;
  }
  function shiftTokens(value){
    const text=clean(value),pattern=/(?:\b(?:off|rest|rdo|pto|vacation|vac|leave|day|night|d|n)\b|--+|\b\d{1,2}(?::\d{2})?\s*[ap](?:\.?m\.?)?\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\s*[ap](?:\.?m\.?)?\b|\b\d{3,4}\s*(?:-|to)\s*\d{3,4}\b|\b\d{1,2}(?::\d{2})?\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\b)/gi;
    return[...text.matchAll(pattern)].map(match=>({raw:match[0],index:match.index}));
  }
  function dateHeaders(lines,identityIndex,now){
    const before=lines.slice(Math.max(0,identityIndex-10),identityIndex+1).join(' | '),explicit=datesIn(before,now);
    return explicit.length?explicit:weekdayDatesIn(before,now);
  }
  function likelyEmployeeHeading(line){
    const value=clean(line);if(!value||datesIn(value).length||parseTimeRange(value)||/\b(?:off|rest|day|night|shift|schedule|roster|week|employee|name)\b/i.test(value))return false;
    const words=value.split(/\s+/).filter(Boolean);return words.length>=2&&words.length<=6&&words.every(word=>/^[A-Za-z'’-]+$/.test(word));
  }
  function personalBlock(lines,match){
    const selected=[match.line];
    for(let index=match.index+1;index<Math.min(lines.length,match.index+18);index++){
      const line=lines[index];
      if(index>match.index+1&&likelyEmployeeHeading(line))break;
      if(datesIn(line).length||parseTimeRange(line)||shiftTokens(line).length||/^\s*(?:mon|tue|wed|thu|fri|sat|sun)\b/i.test(line))selected.push(line);
      else if(selected.length>1)break;
    }
    return selected;
  }
  function extractPersonalShifts(lines,match,options){
    const now=options.now||new Date(),headers=dateHeaders(lines,match.index,now),block=personalBlock(lines,match),confidence=Math.max(.55,Math.min(.98,match.score*.84+.14)),results=[];
    function add(shift){if(shift&&!shift.off&&!results.some(item=>item.date===shift.date&&item.start===shift.start&&item.end===shift.end))results.push(shift)}
    // Long-form lines: each personal line carries its own date and shift.
    block.forEach(function(line){
      const lineDates=datesIn(line,now),range=parseTimeRange(line),code=shiftTokens(line).find(token=>CODE_RE.test(token.raw)||OFF_RE.test(token.raw));
      if(lineDates.length&&(range||code))lineDates.forEach(function(item){add(shiftFromToken(range?range.start+'-'+range.end:code.raw,item.date,{...options,confidence,needsReview:false}))});
    });
    // Some rosters repeat the employee name on every dated row.
    lines.forEach(function(line){
      if(identityScore(line,match.identity)<.72)return;const lineDates=datesIn(line,now),range=parseTimeRange(line);if(lineDates.length&&range)lineDates.forEach(function(item){add(shiftFromToken(range.start+'-'+range.end,item.date,{...options,confidence}))});
    });
    if(results.length)return{shifts:results,headers,block};
    // Table layout: date columns sit above one row for the matched employee.
    const row=clean(match.line).replace(new RegExp(match.identity.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),' '),cells=shiftTokens(row);
    if(headers.length&&cells.length){
      const count=Math.min(headers.length,cells.length);for(let index=0;index<count;index++)add(shiftFromToken(cells[index].raw,headers[index].date,{...options,confidence,needsReview:!!headers[index].needsReview}));
    }
    if(results.length)return{shifts:results,headers,block};
    // Section layout: the name is a heading followed by dated rows.
    block.slice(1).forEach(function(line){const date=datesIn(line,now)[0],range=parseTimeRange(line),code=shiftTokens(line).find(token=>CODE_RE.test(token.raw)||OFF_RE.test(token.raw));if(date&&(range||code))add(shiftFromToken(range?range.start+'-'+range.end:code.raw,date.date,{...options,confidence}))});
    return{shifts:results,headers,block};
  }

  function mostCommon(values,fallback){const counts={};values.filter(Boolean).forEach(value=>counts[value]=(counts[value]||0)+1);return Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]||fallback}
  function shiftCode(shift){const hour=+(shift.start||'00:00').slice(0,2);return shift.overnight||hour>=17?'N':'D'}
  function inferRotation(shifts,range={}){
    if(!Array.isArray(shifts)||shifts.length<3)return null;
    const ordered=shifts.slice().sort((a,b)=>a.date.localeCompare(b.date)),start=dateFromKey(range.start||ordered[0].date),end=dateFromKey(range.end||ordered[ordered.length-1].date),span=Math.round((end-start)/86400000)+1;if(span<6||span>42)return null;
    const byDate=Object.fromEntries(ordered.map(shift=>[shift.date,shift])),sequence=[];for(let index=0;index<span;index++){const current=byDate[key(addDays(start,index))];sequence.push(current?shiftCode(current):'O')}
    let length=0;
    for(let size=2;size<=Math.min(28,Math.floor(sequence.length/2));size++){
      let checked=0,mismatch=0;for(let index=size;index<sequence.length;index++){checked++;if(sequence[index]!==sequence[index%size])mismatch++}
      if(checked>=size&&mismatch===0){length=size;break}
    }
    if(!length&&span>=12){let mismatch=0;for(let index=7;index<sequence.length;index++)if(sequence[index]!==sequence[index%7])mismatch++;if(mismatch<=1)length=7}
    if(!length)return null;
    const pattern=sequence.slice(0,length),workCount=pattern.filter(code=>code!=='O').length;if(!workCount)return null;
    const signature=pattern.join(''),label=/^D{4}O{2}$/.test(signature)?'4 on / 2 off':length===14&&pattern.slice(0,7).join('')!==pattern.slice(7).join('')?'Alternating two-week rotation':pattern.includes('N')&&pattern.includes('D')?'Rotating day and night pattern':length===7?'Weekly work pattern':'Custom '+length+'-day rotation';
    const confidence=Math.min(.96,.75+Math.min(ordered.length,10)*.018);
    return{label,pattern,anchor:key(start),dayStart:mostCommon(ordered.filter(shift=>shiftCode(shift)==='D').map(shift=>shift.start),'07:00'),dayEnd:mostCommon(ordered.filter(shift=>shiftCode(shift)==='D').map(shift=>shift.end),'19:00'),nightStart:mostCommon(ordered.filter(shift=>shiftCode(shift)==='N').map(shift=>shift.start),'19:00'),nightEnd:mostCommon(ordered.filter(shift=>shiftCode(shift)==='N').map(shift=>shift.end),'07:00'),confidence,sourceDates:{start:ordered[0].date,end:ordered[ordered.length-1].date}};
  }
  function toNaturalLanguage(shifts,title='Work'){return shifts.map(shift=>title+' '+shift.start+'-'+shift.end+' on '+shift.date).join('\n')}
  function analyze(text,options={}){
    const source=clean(text),lines=source.split(/\n+/).map(clean).filter(Boolean),identities=unique([options.identity,...(options.aliases||[])].map(clean).filter(Boolean));
    if(!source)return{status:'empty',message:'No readable roster text was found.',identity:null,shifts:[],rotation:null};
    if(!identities.length)return{status:'needs_identity',message:'Enter your name or employee ID exactly as it appears on the roster.',identity:null,shifts:[],rotation:null};
    const match=bestIdentityLine(lines,identities);
    if(match.score<.64)return{status:'identity_not_found',message:'We could not confidently find that name in this roster. Check the spelling or enter the employee ID shown on it.',identity:{requested:identities[0],matched:'',confidence:match.score},shifts:[],rotation:null};
    const extracted=extractPersonalShifts(lines,match,{now:options.now||new Date(),title:options.title||'Work shift',dayStart:options.dayStart,dayEnd:options.dayEnd,nightStart:options.nightStart,nightEnd:options.nightEnd});
    if(!extracted.shifts.length)return{status:'no_shifts',message:'Your name was found, but no dated shift times could be read confidently. Use a clearer image or correct the extracted text.',identity:{requested:match.identity,matched:clean(match.line),confidence:match.score},shifts:[],rotation:null,personalText:extracted.block.join('\n')};
    const headerDates=extracted.headers.map(item=>item.date).sort(),rotation=inferRotation(extracted.shifts,{start:headerDates[0],end:headerDates[headerDates.length-1]});
    return{status:'matched',message:extracted.shifts.length+' shifts found for '+match.identity+'.',identity:{requested:match.identity,matched:clean(match.line),confidence:match.score},shifts:extracted.shifts,rotation,personalText:extracted.block.join('\n'),normalizedText:toNaturalLanguage(extracted.shifts,options.title||'Work'),ignoredOtherRows:true};
  }

  return{clean,normalized,identityScore,parseDateToken,datesIn,parseTimeRange,shiftTokens,inferRotation,toNaturalLanguage,analyze};
});
