'use strict';
const CUSTOM_KEY='chuanxi-custom-places-v1',SEARCH_CACHE='chuanxi-search-cache-v1';
let customPlaces=[],searchResults=[],previewMarker=null,lastSearch=0,searchBusy=false;
function loadCustomPlaces(){try{const rows=JSON.parse(localStorage.getItem(CUSTOM_KEY)||'[]');return Array.isArray(rows)?rows.filter(r=>/^U[1-9][0-9]*$/.test(r.id)&&typeof r.name==='string'&&Number.isFinite(r.lat)&&Math.abs(r.lat)<=85&&Number.isFinite(r.lon)&&Math.abs(r.lon)<=180).map(r=>({...r,custom:true,group:'我的新增地点',forecast:r.forecast?.time?r.forecast:{time:[]},history:r.history?.time?r.history:{time:[]}})):[];}catch{return [];}}
function persistCustom(){try{localStorage.setItem(CUSTOM_KEY,JSON.stringify(customPlaces));return true;}catch{return false;}}
function updateLibrary(){const region=$('region').value;colors.clear();[...new Set(data.records.map(r=>r.group))].forEach((g,i)=>colors.set(g,palette[i%palette.length]));$('region').innerHTML='<option value="">全部区域</option>'+[...colors.keys()].map(g=>`<option>${esc(g)}</option>`).join('');$('region').value=colors.has(region)?region:'';$('total').textContent=data.records.length;$('group-total').textContent=colors.size;renderElevationLegend();}
async function getJSON(url){const res=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!res.ok)throw Error('服务暂时不可用');return res.json();}
function initPlaceSearch(){
 $('new-place-open').onclick=()=>{$('place-search-dialog').showModal();$('remote-query').focus();};
 $('search-close').onclick=()=>$('place-search-dialog').close();
 $('remote-form').onsubmit=searchPlaces;
 $('remote-results').onclick=e=>{const b=e.target.closest('[data-result]');if(b)previewPlace(searchResults[Number(b.dataset.result)]);};
}
async function searchPlaces(e){e.preventDefault();const q=$('remote-query').value.trim();if(!q||searchBusy)return;
 if(Date.now()-lastSearch<1100){$('search-message').textContent='请稍等一秒再搜索。';return;}
 searchBusy=true;lastSearch=Date.now();$('remote-submit').disabled=true;$('remote-results').innerHTML='';$('search-message').textContent='正在搜索地点…';
 try{let cache={};try{cache=JSON.parse(localStorage.getItem(SEARCH_CACHE)||'{}');}catch{}
 const key=map.provider+':'+q.toLocaleLowerCase();let results=cache[key]?.at>Date.now()-7*86400000?cache[key].rows:null;
 if(!results){if(map.provider==='amap'){results=await map.search(q);}else{const config=await getJSON('search-config.json');const url=new URL(config.endpoint);url.search=new URLSearchParams({q,format:'jsonv2',limit:'6','accept-language':'zh-CN',addressdetails:'1'});results=await getJSON(url);if(!Array.isArray(results))throw Error();}cache[key]={at:Date.now(),rows:results};try{localStorage.setItem(SEARCH_CACHE,JSON.stringify(Object.fromEntries(Object.entries(cache).slice(-30))));}catch{}}
 searchResults=results.filter(r=>Number.isFinite(Number(r.lat))&&Math.abs(Number(r.lat))<=85&&Number.isFinite(Number(r.lon))&&Math.abs(Number(r.lon))<=180);
 $('search-message').textContent=searchResults.length?'点击结果，在地图上预览后加入。':'没有找到。试试“县市名 + 地点名”或其他名称；当前地图服务可能尚未收录。';
 $('remote-results').innerHTML=searchResults.map((r,i)=>`<li><button type="button" data-result="${i}"><strong>${esc(r.name||r.display_name.split(',')[0])}</strong><span>${esc(r.display_name)}</span></button></li>`).join('');
 }catch{$('search-message').textContent='搜索服务连接失败，请稍后重试。已有地点仍可使用。';}finally{searchBusy=false;$('remote-submit').disabled=false;}}
function previewPlace(p){if(!p)return;$('place-search-dialog').close();closeDetail();document.querySelector('.sidebar').classList.remove('open');$('list-toggle').setAttribute('aria-expanded','false');$('list-toggle').textContent='地点列表';if(previewMarker)map.removeLayer(previewMarker);
 const box=document.createElement('div');box.className='search-preview';const title=document.createElement('strong');title.textContent=p.name||p.display_name.split(',')[0];const address=document.createElement('p');address.textContent=p.display_name;const note=document.createElement('p');note.textContent=`${Number(p.lon).toFixed(4)}°E, ${Number(p.lat).toFixed(4)}°N · 搜索位置不一定是入口或停车场`;
 const add=document.createElement('button');add.type='button';add.textContent='加入探索地点库';add.onclick=()=>addPlace(p,add);box.append(title,address,note,add);
 previewMarker=map.preview(p,box);}

async function addPlace(p,button){const name=p.name||p.display_name.split(',')[0],lat=Number(p.lat),lon=Number(p.lon);const osmKey=p.provider==='amap'?`amap/${p.amap_id}`:`${p.osm_type}/${p.osm_id}`;
 const existing=data.records.find(r=>r.osmKey===osmKey||(Math.abs(r.lat-lat)<.002&&Math.abs(r.lon-lon)<.002&&[r.name,r.display_name,r.original_name].some(n=>n?.includes(name))));
 if(existing){button.textContent='已在地点库，正在定位';revealPlace(existing.id);if(previewMarker)map.removeLayer(previewMarker);return;}
 button.disabled=true;button.textContent='正在加入…';
 const id='U'+(Math.max(0,...customPlaces.map(r=>Number(r.id.slice(1))))+1);
 const r={id,custom:true,osmKey,amap_id:p.amap_id,amap_position:p.amap_position,name,display_name:name,original_name:name,lat,lon,elevation:null,group:'我的新增地点',crs:'WGS84',coordinate_note:p.provider==='amap'?'由高德 GCJ-02 近似转换；地图显示保留高德原始位置':'WGS84',url:p.provider==='amap'?`https://uri.amap.com/marker?position=${p.amap_position.join(',')}&coordinate=gaode&name=${encodeURIComponent(name)}`:['node','way','relation'].includes(p.osm_type)&&/^\d+$/.test(String(p.osm_id))?`https://www.openstreetmap.org/${p.osm_type}/${p.osm_id}`:'https://www.openstreetmap.org/',access:'自行添加的地点，车辆能否到达及开放情况尚未核实。',point:p.display_name,forecast:{time:[]},history:{time:[]},weather_note:'海拔与天气尚未补齐；如未显示，可点击下方重新查询。'};
 customPlaces.push(r);if(!persistCustom()){customPlaces.pop();button.disabled=false;button.textContent='保存失败，点击重试';return;}
 data.records.push(r);updateLibrary();revealPlace(id);if(previewMarker){map.removeLayer(previewMarker);previewMarker=null;}await enrichPlace(r);}
function revealPlace(id){hiddenPlaces.delete(id);$('search').value='';$('region').value='';$('altitude').value='';$('walking').checked=false;filter();select(id);}
async function enrichPlace(r){const epoch=weatherEpoch,period=tripPeriod();r.weather_request=(r.weather_request||0)+1;const requests=new Map([[r,r.weather_request]]);r.forecast_status=r.history_status='pending';
 await Promise.allSettled([fetchWeatherBatch([r],'forecast',period,epoch,requests),fetchWeatherBatch([r],'history',period,epoch,requests),(async()=>{const url='https://api.open-meteo.com/v1/elevation?'+new URLSearchParams({latitude:r.lat,longitude:r.lon});const raw=await getJSON(url);if(Number.isFinite(raw.elevation?.[0])){r.elevation=Math.round(raw.elevation[0]/10)*10;r.elevation_raw_m=raw.elevation[0];r.elevation_source=url;}})()]);
 if(!data.records.includes(r)||epoch!==weatherEpoch||r.weather_request!==requests.get(r))return;
 persistCustom();persistWeather();renderList();renderMarkers();if(selected?.id===r.id)renderDetail();}
function removeCustomPlace(id){const old=customPlaces;customPlaces=customPlaces.filter(r=>r.id!==id);if(!persistCustom()){customPlaces=old;$('save-status').textContent='移除未保存，请重试';return;}data.records=data.records.filter(r=>r.id!==id);hiddenPlaces.delete(id);closeDetail();updateLibrary();filter();}
