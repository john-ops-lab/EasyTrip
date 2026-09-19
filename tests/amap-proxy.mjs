import assert from 'node:assert/strict';import {createWorker} from '../server/worker.mjs';
const env={AMAP_JS_KEY:'public-test-key',AMAP_SECURITY_CODE:'private-test-code',APP_ORIGIN:'https://trip.example'};let called=0;
const worker=createWorker({'/index.html':{type:'text/html',body:btoa('<h1>EasyTrip</h1>')}},async(url,opts)=>{called++;assert.equal(url.origin,'https://restapi.amap.com');assert.equal(url.searchParams.get('key'),env.AMAP_JS_KEY);assert.equal(url.searchParams.get('jscode'),env.AMAP_SECURITY_CODE);assert.equal(opts.redirect,'error');return new Response('{"status":"1","pois":[]}',{headers:{'content-type':'application/json','set-cookie':'private=1'}});});
let r=await worker.fetch(new Request('https://trip.example/map-config.json'),env);const config=await r.json();assert.equal(config.serviceHost,'https://trip.example/_AMapService');assert.ok(!JSON.stringify(config).includes(env.AMAP_SECURITY_CODE));
r=await worker.fetch(new Request('https://trip.example/_AMapService/v3/place/text?key=foreign&jscode=foreign&keywords=test',{headers:{origin:env.APP_ORIGIN}}),env);assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);assert.ok(!(await r.text()).includes(env.AMAP_SECURITY_CODE));assert.equal(called,1);
r=await worker.fetch(new Request('https://trip.example/_AMapService/v3/place/text',{headers:{origin:'https://foreign.example'}}),env);assert.equal(r.status,403);assert.equal(called,1);
r=await worker.fetch(new Request('https://trip.example/_AMapService/https://evil.example'),env);assert.equal(r.status,400);assert.equal(called,1);
r=await worker.fetch(new Request('https://trip.example/_AMapService/v3/place/text'),{});assert.equal(r.status,503);
r=await worker.fetch(new Request('https://trip.example/'),env);assert.match(await r.text(),/EasyTrip/);
r=await worker.fetch(new Request('https://trip.example/.env'),env);assert.equal(r.status,404);
console.log('PASS: server-only secret, fixed upstream, key override, cross-origin rejection, missing config, static assets');

r=await worker.fetch(new Request('https://trip.example/_AMapService/v3/place/text?callback=jsonp_test_123'),env);assert.match(r.headers.get('content-type'),/application\/javascript/);
r=await worker.fetch(new Request('https://trip.example/_AMapService/v3/place/text?callback=alert(1)'),env);assert.equal(r.status,400);
console.log('PASS: JSONP content type and callback validation');
