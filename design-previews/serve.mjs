import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg'};
createServer(async(req,res)=>{
try{
const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
const file=path.resolve(root,'.'+(name==='/'?'/index-06-10.html':name));
if(!file.startsWith(root+path.sep)||!mime[path.extname(file)]){res.writeHead(404);res.end('Not found');return;}
const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end('Not found');}
}).listen(3200,'127.0.0.1',()=>console.log('Preview gallery: http://localhost:3200'));
