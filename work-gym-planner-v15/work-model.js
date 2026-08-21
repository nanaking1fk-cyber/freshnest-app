// Work schedule states -------------------------------------------------------
function fixedWork(k){let p=profile();if(!p?.fixed?.enabled)return false;let n=diffDays(k,p.fixed.anchor),i=((n%14)+14)%14;return !!p.fixed.pattern[i]}
function fixedOffWeekend(k){let d=date(k),weekend=[0,6].includes(d.getDay());return weekend&&profile()?.fixed?.enabled&&!fixedWork(k)}
function variableMonth(ym){let x=jget(K.bellevue+ym,null);return x}
function variableCode(k){let p=profile();if(!p?.variable?.enabled)return'D';let m=variableMonth(k.slice(0,7));if(!m)return'?';return m[+k.slice(8)]||'?'}
function workState(k){let f=fixedWork(k),c=variableCode(k);if(c==='?')return{kind:'unknown',fixed:f,variable:null,code:c};let v=c==='X';if(f&&v)return{kind:'both',fixed:true,variable:true,code:c};if(f||v)return{kind:'one',fixed:f,variable:v,code:c};return{kind:'off',fixed:false,variable:false,code:c}}
function workText(k){let p=profile(),s=workState(k),a=[];if(s.kind==='unknown')return `${p?.variable?.name||'Variable job'} unknown`+(s.fixed?` · ${p?.fixed?.name||'Fixed job'} work`:'');if(s.fixed)a.push(p?.fixed?.name||'Fixed job');if(s.variable)a.push(p?.variable?.name||'Variable job');return a.length?a.join(' + '):'Off both'}
