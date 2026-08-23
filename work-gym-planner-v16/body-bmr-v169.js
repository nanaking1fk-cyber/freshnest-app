// v16.9 body-metric extension: estimate BMR from lean body mass when body-fat data exists.
const _calcBodyMetricsBmr169=calcBodyMetrics;
calcBodyMetrics=function(x){let m=_calcBodyMetricsBmr169(x),leanKg=m.lean!=null?m.lean*.45359237:null;return{...m,bmr:leanKg?370+21.6*leanKg:null}};
const _renderBodyMetricsBmr169=renderBodyMetrics169;
renderBodyMetrics169=function(){
 _renderBodyMetricsBmr169();
 let rec=latestBodyRecord(),m=calcBodyMetrics(rec?.[1]||{}),grid=$('#bodyMetricGrid');
 if(grid&&!grid.querySelector('[data-bmr]')){let d=document.createElement('div');d.dataset.bmr='1';d.innerHTML=`<small>Est. BMR</small><b>${m.bmr?Math.round(m.bmr)+' kcal':'—'}</b>`;grid.appendChild(d)}
};
