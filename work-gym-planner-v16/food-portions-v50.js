// Portion arithmetic and Open Food Facts normalization. No network or storage.
// OFF documents _100g as per 100 g OR per 100 ml, and _serving as one serving:
// https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WGCFoodPortions=api})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const nutrients=['cal','p','c','f','fiber','satFat','sodium'];
 function number(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(String(value).replace(',','.'));return Number.isFinite(n)&&n>=0?n:null}
 function positive(value){const n=number(value);return n>0?n:null}
 function rounded(value){return Math.round(value*1000000)/1000000}
 function format(value){return Number(value.toFixed(2)).toLocaleString('en-US',{maximumFractionDigits:2})}
 function unit(food){return food?.nutritionUnit==='ml'?'ml':'g'}
 function portion(food={}){
  // The established `grams` field remains the total quantity used by older
  // clients. For volume-based foods nutritionUnit identifies it as ml; no
  // density conversion (or claim that one ml weighs one gram) is made.
  const total=positive(food.grams),size=positive(food.servingSize)||positive(food.defaultGrams)||total||100;
  const count=positive(food.servings)||positive(food.defaultServings)||1;
  const validMeta=total===null||Math.abs(size*count-total)<.001;
  return{size:validMeta?size:total,count:validMeta?count:1,total:total||rounded(size*count),unit:unit(food)};
 }
 function amountLabel(food){const p=portion(food);return p.count===1?`${format(p.total)} ${p.unit}`:`${format(p.count)} servings × ${format(p.size)} ${p.unit} (${format(p.total)} ${p.unit})`}
 function productFromEntry(entry){const p=portion(entry);return{name:entry.name,brand:entry.brand||'',source:entry.source||'Diary history',code:entry.code||'',defaultGrams:p.size,defaultServings:p.count,nutritionUnit:p.unit,servingLabel:entry.servingLabel||'',per100:{...(entry.per100||{})},img:''}}
 function totalNutrition(food){const p=portion(food);return Object.fromEntries(nutrients.map(key=>[key,(number(food.per100?.[key])||0)*p.total/100]))}
 function servingFromOFF(product){
  const label=String(product.serving_size||'').trim().slice(0,140);
  // Never read the first number in "2 cookies (30 g)" as a gram weight.
  // Prefer an explicit metric measure, including decimal commas.
  const metric=label.match(/(?:^|[^\d.,])(\d+(?:[.,]\d+)?)\s*(kg|mg|grams?|g|millilit(?:er|re)s?|ml|lit(?:er|re)s?|l)\b/i);
  let parsed=null;
  if(metric){const measure=metric[2].toLowerCase(),volume=/^(?:ml|millilit|l)/.test(measure);parsed={size:positive(metric[1])*(measure==='kg'?1000:measure==='mg'?.001:measure==='l'||/^lit/.test(measure)?1000:1),unit:volume?'ml':'g'}}
  // Ounces by weight have an exact conversion; fluid ounces need a regional
  // convention, so only use their provider-supplied metric equivalent.
  if(!parsed&&!/fl(?:uid)?\.?\s*oz|fluid ounces/i.test(label)){const oz=label.match(/(?:^|[^\d.,])(\d+(?:[.,]\d+)?)\s*(?:oz|ounces?)\b/i);if(oz)parsed={size:positive(oz[1])*28.349523125,unit:'g'}}
  const normalized=positive(product.serving_quantity),normalizedUnit=String(product.serving_quantity_unit||'').toLowerCase();
  if(normalized&&['g','ml'].includes(normalizedUnit))return{size:normalized,unit:normalizedUnit,label,known:true};
  if(parsed?.size>0)return{...parsed,label,known:true};
  // Older OFF records omit the unit for an otherwise normalized gram size.
  const inferred=String(product.product_quantity_unit||'').toLowerCase()==='ml'||/\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l)\b/i.test(String(product.quantity||''))?'ml':'g';
  if(normalized)return{size:normalized,unit:inferred,label,known:true};
  return{size:100,unit:inferred,label:'',known:false};
 }
 function normalizeOFF(product={}){
  const n=product.nutriments||{},serving=servingFromOFF(product);
  const normalized=key=>{const hundred=number(n[key+'_100g']);if(hundred!==null)return hundred;const single=number(n[key+'_serving']);return single!==null&&serving.known?single*100/serving.size:null};
  // Normalized energy and energy-kj are always kJ, even if energy_unit says
  // kcal (that field describes contributor input, not the normalized value).
  let cal=normalized('energy-kcal');const kj=normalized('energy-kj')??normalized('energy');
  if(cal===null&&kj!==null)cal=kj/4.184;
  const salt=normalized('salt'),sodium=normalized('sodium');
  const per100={cal,p:normalized('proteins'),c:normalized('carbohydrates-total')??normalized('carbohydrates'),f:normalized('fat'),fiber:normalized('fiber'),satFat:normalized('saturated-fat'),sodium:sodium!==null?sodium*1000:salt!==null?salt/2.5*1000:null};
  const warnings=[];
  if(cal===null)warnings.push('Calories are missing. Enter them from the food label.');
  if(cal!==null&&cal>1000)warnings.push('The listed calories look unusually high. Check the food label.');
  if(['p','c','f','fiber','satFat'].some(key=>per100[key]>100))warnings.push('Some nutrition values look incorrect. Check the food label.');
  if(cal!==null&&['p','c','f'].every(key=>per100[key]!==null)){
   const estimate=per100.p*4+per100.c*4+per100.f*9;
   if(Math.abs(cal-estimate)>Math.max(150,estimate*.6))warnings.push('Calories and macros do not seem to agree. Check the food label.');
  }
  return{name:product.product_name||product.generic_name||'Unnamed food',brand:product.brands||'',code:product.code||'',source:'Open Food Facts',defaultGrams:rounded(serving.size),defaultServings:1,nutritionUnit:serving.unit,servingLabel:serving.label,servingSizeKnown:serving.known,per100,img:product.image_front_small_url||'',nutritionWarnings:warnings,needsNutritionCheck:!!warnings.length};
 }
 return{nutrients,number,positive,rounded,format,unit,portion,amountLabel,productFromEntry,totalNutrition,servingFromOFF,normalizeOFF};
});
