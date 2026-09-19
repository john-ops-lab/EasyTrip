const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export function createWorker(assets,requestUpstream=fetch){return {async fetch(request,env){
 const url=new URL(request.url);
 if(request.method!=='GET'&&request.method!=='HEAD')return json({error:'Method not allowed'},405);
 if(url.pathname==='/map-config.json')return json({provider:'amap',key:env.AMAP_JS_KEY||'',serviceHost:env.APP_ORIGIN?env.APP_ORIGIN.replace(/\/$/,'')+'/_AMapService':''});
 if(url.pathname.startsWith('/_AMapService/')){
  if(!env.AMAP_JS_KEY||!env.AMAP_SECURITY_CODE)return json({error:'AMap not configured'},503);
  const source=request.headers.get('origin');if(source&&source!==env.APP_ORIGIN)return json({error:'Origin not allowed'},403);
  const path=url.pathname.slice('/_AMapService'.length);
  if(!/^\/v[345]\/[a-zA-Z0-9/_-]+$/.test(path))return json({error:'Invalid map endpoint'},400);
  const target=new URL(path.startsWith('/v4/map/styles')?'https://webapi.amap.com':'https://restapi.amap.com');target.pathname=path;target.search=url.search;
  target.searchParams.set('key',env.AMAP_JS_KEY);target.searchParams.set('jscode',env.AMAP_SECURITY_CODE);
  try{const upstream=await requestUpstream(target,{method:'GET',headers:{'Referer':env.APP_ORIGIN+'/'},redirect:'error',signal:AbortSignal.timeout(18000)});
   if(!upstream.ok)return json({error:'Map service unavailable'},502);
   const headers=new Headers({'content-type':upstream.headers.get('content-type')||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});
   // Never forward cookies, redirect locations or credentials from the upstream service.
   return new Response(request.method==='HEAD'?null:upstream.body,{status:upstream.status,headers});
  }catch{return json({error:'Map service connection failed'},502);}
 }
 const path=url.pathname==='/'?'/index.html':url.pathname,asset=assets[path];
 if(!asset)return new Response('Not found',{status:404});
 const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
 return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff'}});
}};}
