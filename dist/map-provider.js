'use strict';
// Records, weather, saved views and day keys stay in WGS84. Only the map uses GCJ-02.
const MapCoordinates={
 toMap(latlon){return coordtransform.wgs84togcj02(latlon[1],latlon[0]);},
 fromMap(lonlat){let p=coordtransform.gcj02towgs84(lonlat[0],lonlat[1]);for(let i=0;i<3;i++){const q=coordtransform.wgs84togcj02(...p);p=[p[0]+lonlat[0]-q[0],p[1]+lonlat[1]-q[1]];}return [p[1],p[0]];}
};
function mapNotice(message){const el=document.getElementById('map-status');el.hidden=!message;el.textContent=message;}
function loadAMap(config){return new Promise((resolve,reject)=>{
 if(!config.key||!config.serviceHost) return reject(Error('高德尚未配置，暂时使用 OpenStreetMap。'));
 const proxy=new URL(config.serviceHost,location.href);
 if(proxy.protocol!=='https:'&&!(proxy.protocol==='http:'&&['localhost','127.0.0.1'].includes(proxy.hostname)))return reject(Error('高德安全代理须使用 HTTPS。'));
 window._AMapSecurityConfig={serviceHost:proxy.href.replace(/\/$/,'')};
 const script=document.createElement('script');const timer=setTimeout(()=>reject(Error('高德加载超时，暂时使用 OpenStreetMap。')),15000);
 script.src='https://webapi.amap.com/maps?'+new URLSearchParams({v:'2.0',key:config.key,plugin:'AMap.ToolBar,AMap.Scale,AMap.PlaceSearch'});
 script.onload=()=>{clearTimeout(timer);window.AMap?.Map?resolve():reject(Error('高德加载失败，暂时使用 OpenStreetMap。'));};
 script.onerror=()=>{clearTimeout(timer);reject(Error('高德连接失败，暂时使用 OpenStreetMap。'));};document.head.append(script);
 });}
async function createTripMap(id){let config={provider:'osm'},notice='';try{const response=await fetch('map-config.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error();config=await response.json();}catch{notice='地图配置读取失败，暂时使用 OpenStreetMap。';}
 if(config.provider==='amap'){try{await loadAMap(config);const view=amapView(id);document.querySelector('.map-note').textContent='底图：高德地图 · 原始地点：WGS84';document.querySelector('.remote-credit').innerHTML='搜索由高德地图提供。新增地点保存在此浏览器。';document.getElementById('search-message').textContent='输入地名或地址后搜索高德地点。';mapNotice('');return view;}catch(e){notice=e.message;document.getElementById(id).replaceChildren();}}
 const view=osmView(id,notice);if(notice)mapNotice(notice);return view;
}
function osmView(id,notice){const m=L.map(id,{zoomControl:false,scrollWheelZoom:true});const labels=L.layerGroup().addTo(m);L.control.zoom({position:'topright'}).addTo(m);L.control.scale({position:'bottomright',imperial:false}).addTo(m);
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'}).addTo(m);let errors=0,loaded=0;
 tiles.on('tileerror',()=>{if(++errors>4&&!loaded)mapNotice([notice,'底图暂时未能加载；地点列表与天气详情仍可使用。'].filter(Boolean).join(' '));});tiles.on('tileload',()=>{loaded++;mapNotice(notice);});
 return {provider:'osm',getCenter:()=>m.getCenter(),getZoom:()=>m.getZoom(),setView:(p,z)=>m.setView(p,z,{animate:false}),panBy:p=>m.panBy(p,{animate:false}),on:(events,fn)=>m.on(events,fn),removeLayer:x=>m.removeLayer(x),
 marker:(r,style)=>L.marker([r.lat,r.lon],{icon:style,title:pretty(r),keyboard:true,alt:pretty(r)}).bindTooltip(esc(pretty(r)),{direction:'top',offset:[0,-30]}).addTo(m),
 fit:rows=>m.fitBounds(L.latLngBounds(rows.map(r=>[r.lat,r.lon])),{paddingTopLeft:[45,110],paddingBottomRight:[45,100],maxZoom:11,animate:false}),
 labels(rows){labels.clearLayers();rows.forEach(r=>L.tooltip({direction:'top',offset:[0,-30],permanent:true,className:'place-label'+(selected?.id===r.id?' place-label-selected':''),opacity:1}).setLatLng([r.lat,r.lon]).setContent(esc(pretty(r))).addTo(labels));},
 preview(p,box){const marker=L.marker([Number(p.lat),Number(p.lon)],{title:'搜索预览：'+p.name}).addTo(m).bindPopup(box,{maxWidth:290});m.setView([Number(p.lat),Number(p.lon)],13,{animate:false});marker.openPopup();return marker;}};
}
function amapView(id){const m=new AMap.Map(id,{viewMode:'2D',zoom:7,center:MapCoordinates.toMap([30.6,101.5]),animateEnable:false});m.addControl(new AMap.ToolBar({position:'RT',offset:[24,105]}));m.addControl(new AMap.Scale({position:'RB'}));const all=new Set();let popup=null;
 function position(r){return Array.isArray(r.amap_position)?r.amap_position:MapCoordinates.toMap([r.lat,r.lon]);}
 const view={provider:'amap',getCenter(){const c=m.getCenter(),p=MapCoordinates.fromMap([c.getLng(),c.getLat()]);return {lat:p[0],lng:p[1]};},getZoom:()=>m.getZoom(),setView:(p,z)=>m.setZoomAndCenter(z,MapCoordinates.toMap(p),true),panBy:p=>m.panBy(-p[0],-p[1]),on(events,fn){events.split(' ').forEach(e=>m.on(e,fn));},removeLayer(x){if(x?.raw){m.remove(x.raw);all.delete(x);}if(x?.popup)x.popup.close();},
 marker(r,style){const el=document.createElement('div');el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',pretty(r));el.title=pretty(r);const raw=new AMap.Marker({position:position(r),content:el,anchor:'bottom-center',offset:new AMap.Pixel(0,0)});raw.setMap(m);const wrapper={raw,r,getElement:()=>el,setIcon(s){el.className=s.className;el.innerHTML=s.html;},on(event,fn){if(event==='click'){raw.on('click',fn);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}return wrapper;}};wrapper.setIcon(style);all.add(wrapper);return wrapper;},
 fit(){const items=[...all].map(x=>x.raw);if(items.length)m.setFitView(items,true,[110,45,100,45],11);},
 labels(rows){const ids=new Set(rows.map(r=>r.id));for(const x of all)x.raw.setLabel(ids.has(x.r.id)?{content:`<span class="amap-place-label">${esc(pretty(x.r))}</span>`,direction:'top',offset:new AMap.Pixel(0,-5)}:{content:''});},
 preview(p,box){popup?.close();const raw=new AMap.Marker({position:position(p)});raw.setMap(m);popup=new AMap.InfoWindow({content:box,offset:new AMap.Pixel(0,-30)});m.setZoomAndCenter(13,position(p),true);popup.open(m,position(p));return {raw,popup};},
 search(q){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('高德搜索超时，请稍后重试。')),18000);const service=new AMap.PlaceSearch({pageSize:6,pageIndex:1,extensions:'base'});service.search(q,(status,result)=>{clearTimeout(timer);if(status==='no_data'){resolve([]);return;}if(status!=='complete'){reject(Error('高德搜索失败，请检查 Key 的服务权限与额度。'));return;}resolve((result.poiList?.pois||[]).filter(p=>p.location).map(p=>{const gcj=[p.location.getLng(),p.location.getLat()],wgs=MapCoordinates.fromMap(gcj);return {provider:'amap',amap_id:p.id,amap_position:gcj,name:p.name,display_name:[p.name,p.pname,p.cityname,p.adname,p.address].filter(x=>typeof x==='string'&&x).join(' · '),lat:wgs[0],lon:wgs[1]};}));});});}
 };return view;
}
