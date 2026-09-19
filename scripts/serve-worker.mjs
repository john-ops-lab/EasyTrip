import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const worker=await import(pathToFileURL(path.resolve(process.argv[2]||'.worker-build/server/index.js')));
const credentials=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):{};
const port=Number(process.argv[4]||8774),origin='http://127.0.0.1:'+port,env={...credentials,APP_ORIGIN:origin};
http.createServer(async(req,res)=>{try{const response=await worker.default.fetch(new Request(origin+req.url,{method:req.method,headers:req.headers}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Local server error');}}).listen(port,'127.0.0.1',()=>console.log('Local worker ready on port '+port));
