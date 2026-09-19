'use strict';
// Date-only arithmetic is kept in UTC; the application day uses Asia/Shanghai.
const TripDates={
 today:()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),
 valid(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;},
 addDays(s,n){const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);},
 addMonths(s,n){const [y,m,d]=s.split('-').map(Number);const first=new Date(Date.UTC(y,m-1+n,1));const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();first.setUTCDate(Math.min(d,last));return first.toISOString().slice(0,10);},
 previous(s){return this.addMonths(s,-12);},
 list(start,end){const dates=[];for(let d=start;d<=end&&dates.length<64;d=this.addDays(d,1))dates.push(d);return dates;},
 validate(start,end,today=this.today()){if(!this.valid(start)||!this.valid(end))return '请选择完整有效的开始和结束日期。';if(start>end)return '结束日期不能早于开始日期。';if(start<today||end>this.addMonths(today,2))return `日期须在 ${today} 至 ${this.addMonths(today,2)} 之间（含当天）。`;return '';},
 forecast(start,end,today=this.today()){const from=start>today?start:today,to=end<this.addDays(today,15)?end:this.addDays(today,15);return from<=to?{start:from,end:to}:null;}
};
if(typeof module!=='undefined')module.exports=TripDates;
const TRIP_KEY='chuanxi-trip-dates-v1',WEATHER_KEY='chuanxi-weather-cache-v1';
let weatherEpoch=0,weatherBusy=false;
function tripPeriod(){return {start:data.trip_dates[0],end:data.trip_dates.at(-1)};}
function weatherStamp(){return new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});}
function resetWeather(r){r.forecast={time:[]};r.history={time:[]};delete r.forecast_url;delete r.history_url;r.forecast_status='pending';r.history_status='pending';delete r.weather_note;r.weather_updated_at=null;}
function persistWeather(){try{const period=tripPeriod();localStorage.setItem(WEATHER_KEY,JSON.stringify({...period,records:Object.fromEntries(data.records.map(r=>[r.id,{lat:r.lat,lon:r.lon,forecast:r.forecast,history:r.history,forecast_url:r.forecast_url,history_url:r.history_url,forecast_status:r.forecast_status,history_status:r.history_status,weather_updated_at:r.weather_updated_at}]))}));return true;}catch{$('trip-status').textContent='日期已保存，但天气缓存写入失败；刷新后可重新保存日期以查询。';return false;}}
function restoreTrip(){let period,cache;try{period=JSON.parse(localStorage.getItem(TRIP_KEY));cache=JSON.parse(localStorage.getItem(WEATHER_KEY));}catch{}
 if(period&&TripDates.valid(period.start)&&TripDates.valid(period.end)&&period.start<=period.end&&period.end<=TripDates.addMonths(period.start,2)){
 data.trip_dates=TripDates.list(period.start,period.end);
 for(const r of data.records){resetWeather(r);r.forecast_status=r.history_status='unavailable';const c=cache?.start===period.start&&cache?.end===period.end?cache.records?.[r.id]:null;if(c&&c.lat===r.lat&&c.lon===r.lon){for(const k of ['forecast','history'])if(Array.isArray(c[k]?.time))r[k]=c[k];for(const k of ['forecast_url','history_url','forecast_status','history_status','weather_updated_at'])if(c[k]!=null)r[k]=c[k];if(r.forecast_status==='pending')r.forecast_status='unavailable';if(r.history_status==='pending')r.history_status='unavailable';}}
 }
 if(!data.trip_dates.includes(date))date=data.trip_dates[0];renderTripHeader();}
function renderTripHeader(){const p=tripPeriod();$('trip-range').textContent=`${p.start.slice(5).replace('-','.')} — ${p.end.slice(5).replace('-','.')}`;$('trip-year').textContent=p.start.slice(0,4)===p.end.slice(0,4)?p.start.slice(0,4):`${p.start.slice(0,4)}—${p.end.slice(0,4)}`;}
function initTripEditor(){
 $('edit-trip').onclick=()=>{const p=tripPeriod(),today=TripDates.today(),max=TripDates.addMonths(today,2);for(const id of ['trip-start','trip-end']){$(id).min=today;$(id).max=max;} $('trip-start').value=p.start;$('trip-end').value=p.end;$('trip-limits').textContent=`可选 ${today} 至 ${max}。预报通常最多覆盖未来16天；更远日期只提供前一年同期参考。`;$('trip-error').textContent='';$('trip-dialog').showModal();};
 $('trip-close').onclick=()=>$('trip-dialog').close();$('trip-form').onsubmit=async e=>{e.preventDefault();if(weatherBusy)return;const start=$('trip-start').value,end=$('trip-end').value,error=TripDates.validate(start,end);if(error){$('trip-error').textContent=error;return;}
 try{localStorage.setItem(TRIP_KEY,JSON.stringify({start,end}));}catch{$('trip-error').textContent='浏览器未允许保存日期，请启用网站存储后重试。';return;}
 weatherEpoch++;data.trip_dates=TripDates.list(start,end);date=start;data.records.forEach(resetWeather);renderTripHeader();persistWeather();saveState();if(selected)renderDetail();$('trip-dialog').close();await refreshTripWeather();};
}
function weatherURL(rows,kind,period){const common={latitude:rows.map(r=>r.lat).join(','),longitude:rows.map(r=>r.lon).join(','),timezone:'Asia/Shanghai',elevation:rows.map(r=>Number.isFinite(r.elevation_raw_m)?r.elevation_raw_m:Number.isFinite(r.elevation)?r.elevation:'nan').join(',')};let endpoint;
 if(kind==='forecast'){const range=TripDates.forecast(period.start,period.end);if(!range)return null;Object.assign(common,{start_date:range.start,end_date:range.end,daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code'});endpoint='https://api.open-meteo.com/v1/forecast';}
 else{Object.assign(common,{start_date:TripDates.previous(period.start),end_date:TripDates.previous(period.end),models:'era5_seamless',daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code'});endpoint='https://archive-api.open-meteo.com/v1/archive';}
 return endpoint+'?'+new URLSearchParams(common);}
async function fetchWeatherBatch(rows,kind,period,epoch,requests){const url=weatherURL(rows,kind,period);const valid=r=>weatherEpoch===epoch&&data.records.includes(r)&&(!requests||r.weather_request===requests.get(r));if(!url){for(const r of rows)if(valid(r)){r[kind]={time:[]};r[kind+'_status']='outside';delete r[kind+'_url'];}return;}
 try{const payload=await getJSON(url),list=Array.isArray(payload)?payload:[payload];if(list.length!==rows.length||list.some(p=>!Array.isArray(p.daily?.time)||!Array.isArray(p.daily?.temperature_2m_min)||!Array.isArray(p.daily?.temperature_2m_max)||p.daily.time.length!==p.daily.temperature_2m_min.length||p.daily.time.length!==p.daily.temperature_2m_max.length))throw Error('Invalid weather response');
 rows.forEach((r,i)=>{if(valid(r)){r[kind]=list[i].daily;r[kind+'_url']=url;r[kind+'_status']='ok';r.weather_updated_at=weatherStamp();}});
 }catch{for(const r of rows)if(valid(r)){r[kind]={time:[]};r[kind+'_status']='error';delete r[kind+'_url'];}}
}
async function refreshTripWeather(){weatherBusy=true;$('trip-status').textContent=`正在更新全部 ${data.records.length} 个地点的天气…`;$('trip-save').disabled=true;$('edit-trip').disabled=true;const epoch=weatherEpoch,period=tripPeriod(),rows=[...data.records],jobs=[];for(let i=0;i<rows.length;i+=8)for(const kind of ['forecast','history'])jobs.push({rows:rows.slice(i,i+8),kind});let next=0,done=0;
 async function worker(){while(next<jobs.length){const job=jobs[next++];await fetchWeatherBatch(job.rows,job.kind,period,epoch);if(epoch!==weatherEpoch)return;done++;$('trip-status').textContent=`正在更新全部 ${rows.length} 个地点的天气：${done}/${jobs.length}`;persistWeather();if(selected)renderWeather();}}
 try{await Promise.all([worker(),worker()]);}finally{weatherBusy=false;$('trip-save').disabled=false;$('edit-trip').disabled=false;}
 if(epoch!==weatherEpoch)return;const errors=rows.filter(r=>r.forecast_status==='error'||r.history_status==='error').length,outside=!TripDates.forecast(period.start,period.end);const saved=persistWeather();if(saved)$('trip-status').textContent=errors?`日期已保存；${errors} 个地点有天气查询失败。可再次保存日期重试。`:`已更新 ${rows.length} 个地点${outside?'；所选日期暂无预报，已查询前一年同期参考':'；超出预报范围的日期显示暂无'}`;if(selected)renderDetail();}
function weatherNote(r){if(r.forecast_status||r.history_status){const stamp=r.weather_updated_at?`更新于 ${r.weather_updated_at}。`:'';return `${stamp}按当前出行日期查询；前一年同期为再分析估计，非气象站实测。${r.forecast_status==='error'||r.history_status==='error'?'部分查询失败，可再次保存日期重试。':''}${r.forecast_status==='pending'||r.history_status==='pending'?'正在更新…':''}${data.trip_dates.some(d=>d.endsWith('-02-29'))?'2月29日对照前一年2月28日。':''}`;}return r.weather_note||`数据查询于 ${data.fetched_at?.slice(0,10)||'此前'}，非实时天气。前一年同期为再分析估计；保存出行日期可重新查询。`;}
