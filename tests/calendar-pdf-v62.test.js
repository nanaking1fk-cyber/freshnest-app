const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../work-gym-planner-v16/calendar-premium-v42.js'),'utf8');
function harness(){const c={Blob,TextEncoder,shareRows:()=>[{date:'2026-09-03',items:['W'.repeat(400)+' (late) \\ END']}],dateLabel:x=>x};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  function pdfPlain('),source.indexOf('  function openShare(')),c);return c}
test('PDF wraps every character before escaping instead of silently truncating a shift',async()=>{
 const c=harness(),lines=c.pdfLines('W'.repeat(400)+' (late) \\ END');assert.ok(lines.every(x=>x.length<=90));assert.equal(lines.join('').replaceAll(' ',''),'W'.repeat(400)+'(late)\\END');
 const pdf=await c.buildPdf({range:{start:'2026-09-01',end:'2026-09-30'}}).text();assert.match(pdf,/\\\(late\\\)/);assert.match(pdf,/\\\\ END/);assert.match(pdf,/\/BaseFont \/Courier/);assert.doesNotMatch(source,/pdfText\(line\)\.slice/);
});
test('changing PDF date or inclusion controls invalidates the previous preview',()=>{assert.match(source,/root\.addEventListener\('input',invalidatePreview\)/);assert.match(source,/root\.addEventListener\('change',invalidatePreview\)/);assert.match(source,/delete previewButton\.dataset\.shareReady/)});
