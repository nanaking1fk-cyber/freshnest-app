'use strict';

const responseFormat={
  type:'json_schema',
  name:'meal_scan_estimate',
  strict:true,
  schema:{
    type:'object',additionalProperties:false,required:['items','note'],
    properties:{
      items:{type:'array',maxItems:12,items:{
        type:'object',additionalProperties:false,
        required:['name','grams','calories','protein','carbs','fat','fiber','saturatedFat','sodiumMg','confidence'],
        properties:{
          name:{type:'string'},grams:{type:'number'},calories:{type:'number'},protein:{type:'number'},
          carbs:{type:'number'},fat:{type:'number'},fiber:{type:'number'},saturatedFat:{type:'number'},
          sodiumMg:{type:'number'},confidence:{type:'number',minimum:0,maximum:1}
        }
      }},
      note:{type:'string'}
    }
  }
};

const number=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const clean=(value,max=100)=>String(value||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);

function validateMealScan(raw){
  const items=[];
  for(const item of Array.isArray(raw?.items)?raw.items:[]){
    const name=clean(item?.name),grams=number(item?.grams,1,2500),calories=number(item?.calories,0,5000);
    if(!name||!grams||!calories)continue;
    const scale=100/grams;
    items.push({
      name,defaultGrams:Math.round(grams*10)/10,confidence:number(item?.confidence,0,1),
      per100:{
        cal:calories*scale,p:number(item?.protein,0,500)*scale,c:number(item?.carbs,0,1000)*scale,
        f:number(item?.fat,0,500)*scale,fiber:number(item?.fiber,0,250)*scale,
        satFat:number(item?.saturatedFat,0,250)*scale,sodium:number(item?.sodiumMg,0,20000)*scale
      }
    });
    if(items.length>=12)break;
  }
  return{items,note:clean(raw?.note,240)};
}

module.exports={responseFormat,validateMealScan};
