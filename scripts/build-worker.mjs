import fs from 'node:fs';
import path from 'node:path';
const input=path.resolve(process.argv[2]||'dist'),output=path.resolve(process.argv[3]||'.worker-build');
if(output===input||output.startsWith(input+path.sep))throw Error('Worker output must be outside public assets');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
const assets={};
function walk(dir){for(const name of fs.readdirSync(dir)){if(name.startsWith('.'))continue;const file=path.join(dir,name),stat=fs.lstatSync(file);if(stat.isDirectory())walk(file);else if(stat.isFile()){const rel=path.relative(input,file).split(path.sep).join('/');if(!types[path.extname(file)]&&name!=='LICENSE'&&!name.endsWith('.LICENSE'))throw Error('Unexpected public file: '+rel);assets['/'+rel]={type:types[path.extname(file)]||'text/plain; charset=utf-8',body:fs.readFileSync(file).toString('base64')};}else throw Error('Unsupported public asset');}}
walk(input);if(!assets['/index.html'])throw Error('Missing index.html');fs.mkdirSync(path.join(output,'server'),{recursive:true});
const worker=fs.readFileSync(new URL('../server/worker.mjs',import.meta.url),'utf8');
fs.writeFileSync(path.join(output,'server/index.js'),worker+'\nexport default createWorker('+JSON.stringify(assets)+');\n');
fs.writeFileSync(path.join(output,'server/package.json'),' {"type":"module"}\n');console.log('Worker built with '+Object.keys(assets).length+' assets');
