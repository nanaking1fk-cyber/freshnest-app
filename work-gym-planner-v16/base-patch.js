// v16 compatibility layer over the stable v15 storage namespace.
var APP_VERSION='16.3.0';
K.health=PREFIX+'health-log';K.notification=PREFIX+'notification-settings';K.diagnostics=PREFIX+'diagnostics';K.recovery=PREFIX+'recovery-snapshots';K.sync=PREFIX+'sync-settings';
function francisProfile(){return {id:'francis',name:'Francis',sleepTarget:7.5,fixed:{enabled:true,name:'NYU',anchor:'2026-08-17',pattern:[...FRANCIS_PATTERN],start:'16:00',end:'00:00',commuteMin:30},variable:{enabled:true,name:'Bellevue',start:'07:30',end:'15:30',commuteMin:30},createdAt:new Date().toISOString()}}
