// Local-only fixture server. Never forwards credentials or API writes to production.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"ok":false,"error":"Local audit: API must be mocked."}');return}
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
    if(['/work-gym-planner/','/work-gym-planner/index.html','/'].includes(url.pathname)){res.writeHead(307,{Location:'/work-gym-planner/shell.html'+url.search});res.end();return}
    const file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+'/')||!/^\/(?:work-gym-planner(?:-v1[56])?|shared)\//.test(file.slice(root.length))){res.writeHead(403);res.end();return}
    res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');
    const bytes=await readFile(file);res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Not found')}
});
server.listen(4173,'127.0.0.1',()=>console.log('Local audit server: http://127.0.0.1:4173'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
