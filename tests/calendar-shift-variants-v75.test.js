const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const Core=require('../shared/v25-scheduling');
const calendar=read('work-gym-planner-v16/calendar-premium-v42.js');
const platform=read('work-gym-planner-v16/schedule-platform-v25.js');
const css=read('work-gym-planner-v16/calendar-premium-v42.css');

test('every workplace has compatible Day, Evening and Night shift presets',()=>{
 const variants=Core.sourceShiftVariants({id:'legacy-work',name:'Hospital',color:'#34d399'});
 assert.deepEqual(variants.map(item=>item.id),['day','evening','night']);
 assert.deepEqual(variants.map(item=>item.color),['#58a6ff','#f59e0b','#a78bfa']);
 assert.deepEqual(variants.map(item=>[item.start,item.end]),[['07:00','15:00'],['15:00','23:00'],['23:00','07:00']]);
 const custom=Core.sourceShiftVariants({shiftVariants:[{id:'evening',start:'16:00',end:'00:00',color:'#f472b6'}]});
 assert.deepEqual(custom[1],{id:'evening',label:'Evening shift',shortLabel:'Evening',start:'16:00',end:'00:00',color:'#f472b6'});
});

test('new rotations use the chosen shift label and color under one work source',()=>{
 const source={id:'hospital',name:'City Hospital',color:'#34d399'};
 const evening=Core.normalizeRotation({id:'evening-rule',name:'Evening shift',sourceId:source.id,shiftVariantId:'evening',shiftLabel:'Evening shift',shiftColor:'#f59e0b',anchor:'2026-09-07',pattern:['D'],dayStart:'16:00',dayEnd:'00:00'});
 const event=Core.rotationEventOn(evening,'2026-09-08',source);
 assert.equal(event.sourceId,'hospital');assert.equal(event.sourceName,'City Hospital');
 assert.equal(event.shiftVariantId,'evening');assert.equal(event.title,'Evening shift');assert.equal(event.color,'#f59e0b');
 assert.equal(event.start,'16:00');assert.equal(event.end,'00:00');assert.equal(event.overnight,true);
});

test('legacy rotations retain their existing title and work-source color',()=>{
 const source={id:'legacy',name:'Old job',color:'#34d399'};
 const event=Core.rotationEventOn({id:'old',name:'Regular shift',sourceId:'legacy',anchor:'2026-09-07',pattern:['D'],dayStart:'09:00',dayEnd:'17:00'},'2026-09-08',source);
 assert.equal(event.title,'Regular shift');assert.equal(event.color,'#34d399');assert.equal(event.shiftVariantId,'');
});

test('mixed rotations switch both the label and color between day and night',()=>{
 const source={id:'hospital',name:'City Hospital',color:'#34d399'},rotation={id:'mixed',name:'Rotating shift',sourceId:'hospital',anchor:'2026-09-07',pattern:['D','N'],dayStart:'07:00',dayEnd:'19:00',nightStart:'19:00',nightEnd:'07:00',useShiftVariants:true};
 const day=Core.rotationEventOn(rotation,'2026-09-07',source),night=Core.rotationEventOn(rotation,'2026-09-08',source);
 assert.deepEqual([day.title,day.color,day.shiftVariantId],['Day shift','#58a6ff','day']);
 assert.deepEqual([night.title,night.color,night.shiftVariantId],['Night shift','#a78bfa','night']);
});

test('guided schedules and one-off shifts expose simple shift choices and persist metadata',()=>{
 assert.match(calendar,/function shiftChoicesMarkup/);
 assert.match(calendar,/data-shift-variant/);
 assert.match(calendar,/Which shift do you work\?/);
 assert.match(calendar,/shiftVariantId:variant\.id,shiftLabel/);
 assert.match(calendar,/kindLabel\+' · '\+variant\.shortLabel/);
 assert.doesNotMatch(calendar,/Shift name <small>optional<\/small>/);
});

test('multi-date, typed and roster entries classify and save per-shift colors',()=>{
 assert.match(platform,/data-picker-variant/);
 assert.match(platform,/shiftVariantId:off\?'':variant\.id/);
 assert.match(platform,/function addShiftVariant/);
 assert.match(platform,/Core\.shiftVariantForTimes/);
 assert.match(platform,/color:colored\.shiftColor\|\|colored\.color/);
 assert.match(platform,/color:event\.color\|\|source\.color/);
});

test('new shift controls are premium scoped and responsive',()=>{
 const rules=css.split('/* v75:')[1]?.split('/* v46:')[0];assert.ok(rules);
 const selectors=[...rules.matchAll(/(?:^|\})\s*(body\.premiumV30[^\{]+)\{/gm)].map(match=>match[1]);assert.ok(selectors.length>10);
 selectors.flatMap(value=>value.split(',')).forEach(selector=>assert.match(selector,/^\s*body\.premiumV30/));
 assert.match(rules,/calendarShiftChoicesV75/);assert.match(rules,/shiftPickerVariantsV75/);assert.match(rules,/@media\(max-width:760px\)/);
});

test('production and offline loaders carry the latest release',()=>{
 for(const file of ['work-gym-planner/boot.js','work-gym-planner/index.html','work-gym-planner/shell.html','work-gym-planner/sw.js','work-gym-planner-v16/sw.js','work-gym-planner-v16/pwa-patch.js'])assert.match(read(file),/30\.1\.31-tour76/);
});
