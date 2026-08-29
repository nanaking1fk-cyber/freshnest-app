'use strict';

const KINDS=new Set(['work','event','todo','workout','meal']);
const DATE=/^20(?:2\d|3\d)-\d{2}-\d{2}$/;
const TIME=/^(?:[01]\d|2[0-3]):[0-5]\d$/;

const responseFormat={
  type:'json_schema',
  name:'schedule_proposal',
  strict:true,
  schema:{
    type:'object',additionalProperties:false,required:['items','assumptions'],
    properties:{
      items:{type:'array',maxItems:370,items:{
        type:'object',additionalProperties:false,
        required:['kind','date','start','end','title','confidence','needs_review','source_text'],
        properties:{
          kind:{type:'string',enum:['work','event','todo','workout','meal']},
          date:{type:'string'},start:{type:'string'},end:{type:'string'},title:{type:'string'},
          confidence:{type:'number',minimum:0,maximum:1},needs_review:{type:'boolean'},source_text:{type:'string'}
        }
      }},
      assumptions:{type:'array',maxItems:12,items:{type:'string'}}
    }
  }
};

function validDate(value){
  if(!DATE.test(String(value||'')))return false;
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(year,month-1,day);
  return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day;
}
function clean(value,max=180){return String(value==null?'':value).replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}
function labelFor(score){return score>=.86?'High':score>=.64?'Medium':'Low'}

function validateProposal(raw){
  const seen=new Set(),items=[];
  for(const item of Array.isArray(raw?.items)?raw.items:[]){
    const kind=String(item?.kind||'');
    const date=String(item?.date||'');
    const start=String(item?.start||''),end=String(item?.end||'');
    const title=clean(item?.title,100);
    if(!KINDS.has(kind)||!validDate(date)||!title||start&&!TIME.test(start)||end&&!TIME.test(end))continue;
    const key=[kind,date,start,end,title.toLowerCase()].join('|');
    if(seen.has(key)||items.length>=370)continue;
    seen.add(key);
    const score=Math.max(0,Math.min(1,Number(item.confidence)||0));
    const reasons=[];
    if(item.needs_review)reasons.push('AI marked this item for review');
    if(kind==='work'&&!start)reasons.push('work shift has no confirmed start time');
    if(kind==='work'&&start&&!end)reasons.push('work shift has no confirmed end time');
    items.push({kind,date,start,end,title,confidence:{score,label:labelFor(score),reasons},needsReview:!!item.needs_review||reasons.length>0,sourceText:clean(item.source_text,360)});
  }
  const assumptions=(Array.isArray(raw?.assumptions)?raw.assumptions:[]).map(value=>clean(value,180)).filter(Boolean).slice(0,12);
  return{items,assumptions};
}

module.exports={responseFormat,validateProposal,validDate};
