// Fixture-based tests (NOT live API calls). Fixtures mimic documented provider response shapes.
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom'), assert=require('assert');
const {parseFlow,parseIncidents}=require('../server.js');
const html=fs.readFileSync(path.join(__dirname,'../project_citypulse.html'),'utf8');
let pass=0; const ok=(c,m)=>{ assert(c,m); pass++; console.log('  ✓',m); };
const NOW=Math.floor(Date.now()/3600000)*3600; // top of the current hour (unix s)
const hrs=Array.from({length:48},(_,i)=>NOW-24*3600+i*3600);
const wx={latitude:13.0,longitude:80.25,current_units:{temperature_2m:'°C',relative_humidity_2m:'%',apparent_temperature:'°C',precipitation:'mm',wind_speed_10m:'km/h'},
  current:{time:NOW,interval:900,temperature_2m:31.4,relative_humidity_2m:68,apparent_temperature:37.1,precipitation:0.2,weather_code:2,wind_speed_10m:14.5},
  hourly:{time:hrs,temperature_2m:hrs.map((_,i)=>27+Math.sin(i/4)*3)}};
const aqLoc=(pm,aqi)=>({latitude:13.0,longitude:80.2,current_units:{pm2_5:'μg/m³',pm10:'μg/m³'},current:{time:NOW,pm2_5:pm,pm10:pm*1.6,us_aqi:aqi,ozone:40,nitrogen_dioxide:12},hourly:{time:hrs,us_aqi:hrs.map((_,i)=>60+i),pm2_5:hrs.map((_,i)=>15+i/2)}});
const tr={provider:'TomTom Traffic API',fetchedAt:Date.now(),bbox:'80.15,12.96,80.39,13.20',attribution:'Traffic data © TomTom',
  corridors:[{name:'MG Road',ok:true,currentSpeed:20,freeFlowSpeed:40,currentTravelTime:90,freeFlowTravelTime:45,confidence:0.9,matched:{lat:13.061,lon:80.242},roadClosure:false},
             {name:'OMR',ok:true,currentSpeed:45,freeFlowSpeed:50,currentTravelTime:60,freeFlowTravelTime:54,confidence:0.8,matched:{lat:12.9,lon:80.22},roadClosure:false},
             {name:'ECR',ok:false,error:'HTTP 429 (rate limited)'}],
  incidents:{ok:true,items:[{category:'RoadWorks',description:'<img src=x onerror=alert(1)> Roadworks',from:'A',to:'B',roads:[],delaySec:120,startTime:'2026-10-17T01:00:00Z',endTime:null,timeValidity:'present',lat:13.05,lon:80.25},{category:'Accident',description:'Accident',delaySec:300,lat:13,lon:80.2}]}};
const notices={fetchedAt:Date.now(),notices:[
  {id:'n1',type:'planned_work',category:'road_construction',title:'Drainage upgrade',description:'Night work, one lane closed',road:'Anna Salai',lat:null,lon:null,activeFrom:new Date(Date.now()-3600e3).toISOString(),activeUntil:new Date(Date.now()+864e5).toISOString(),alternative:'GST Road',verifiedBy:'Authority (simulated role)'},
  {id:'n2',type:'incident',category:'accident',title:'Verified crash',description:'Two vehicles, lane blocked',road:'MG Road',lat:13.061,lon:80.242,verifiedBy:'Authority (simulated role)'}]};
const J=(b,s=200)=>Promise.resolve({ok:s<400,status:s,json:()=>Promise.resolve(b)});
async function boot(router){
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost:3000/',pretendToBeVisual:true,beforeParse(w){ w.fetch=(u,o)=>router(String(u)); w.alert=()=>{}; }});
  await new Promise(r=>setTimeout(r,400)); return dom;
}
(async()=>{
  console.log('Server parsers'); 
  const f=parseFlow({name:'X',lat:1,lon:2},{flowSegmentData:{currentSpeed:25,freeFlowSpeed:50,currentTravelTime:100,freeFlowTravelTime:50,confidence:.9,roadClosure:false,coordinates:{coordinate:[{latitude:13.1,longitude:80.2}]}}});
  ok(f.currentSpeed===25&&f.matched.lat===13.1,'parseFlow maps TomTom flowSegmentData fields');
  const inc=parseIncidents({incidents:[{geometry:{type:'LineString',coordinates:[[80.2,13.0],[80.21,13.01]]},properties:{id:'a',iconCategory:'RoadWorks',events:[{description:'Roadworks'}],from:'P',to:'Q',delay:60}}]});
  ok(inc[0].category==='RoadWorks'&&inc[0].lat===13&&inc[0].lon===80.2,'parseIncidents extracts category, description and first coordinate');
  let threw=false; try{ parseIncidents({}); }catch{ threw=true; } ok(threw,'parseIncidents rejects malformed payload');

  console.log('Success path (fixtures)');
  let urls=[];
  let dom=await boot(u=>{ urls.push(u);
    if(u.includes('air-quality-api')) return J([aqLoc(42,118),aqLoc(40,110),aqLoc(41,112),aqLoc(43,120),aqLoc(44,121),aqLoc(40,111)]);
    if(u.includes('api.open-meteo.com')) return J(wx);
    if(u.endsWith('/api/traffic')) return J(tr);
    if(u.endsWith('/api/public/notices')) return J(notices);
    if(u.endsWith('/api/config')||u.endsWith('/api/health')) return J({error:'x'},404);
    return J({},404); });
  let d=dom.window.document, txt=id=>d.getElementById(id).textContent;
  ok(urls.some(u=>u.includes('latitude=13.0827')&&u.includes('timeformat=unixtime')),'weather request uses configured city coordinates');
  ok(urls.find(u=>u.includes('air-quality-api')).split('latitude=')[1].split('&')[0].split(',').length===6,'air-quality request covers city + 5 zones in one call');
  ok(txt('env-cards').includes('31.4')&&txt('env-cards').includes('Partly cloudy'),'weather values rendered in Environmental cards');
  ok(txt('env-cards').includes('118')&&txt('env-cards').includes('Unhealthy for sensitive groups'),'provider US AQI rendered with EPA category');
  ok(txt('env-cards').includes('Model estimate'),'environment values labelled as model estimates');
  ok(d.getElementById('envAqi').innerHTML.includes('<svg'),'24h AQI chart drawn from provider hourly series');
  ok(txt('mob-cards').includes('Derived'),'congestion labelled Derived');
  ok(txt('mob-cards').includes('Congestion Level30')&&txt('mob-cards').includes('Moderate'),'mean congestion = mean(50%,10%) = 30% (failed ECR segment excluded)');
  ok(txt('congestionTable').includes('50%')&&txt('congestionTable').includes('Error: HTTP 429'),'corridor table shows derived 50% and per-corridor error without breaking');
  ok(!d.body.innerHTML.includes('<img src=x'),'provider text is HTML-escaped');
  ok(txt('repairQueueTable').includes('Roadworks'),'incident table rendered');
  ok(txt('alertsTable').includes('US AQI 118'),'alert rule fired from live AQI');
  ok(txt('mobNotices').includes('Drainage upgrade')&&txt('mobNotices').includes('GST Road')&&txt('mobNotices').includes('Approved by the authority server'),'approved planned work shown with reason and alternative route');
  ok(/MG Road.*Accident — authority-verified/.test(txt('congestionTable').replace(/\s+/g,' ')),'MG Road slow-down classified as authority-verified accident');
  ok(/OMR.*(Moderate|Free-flow)/.test(txt('congestionTable').replace(/\s+/g,' '))&&!/OMR[^A-Z]*Accident/.test(txt('congestionTable').replace(/\s+/g,' ')),'slow traffic without any report is NOT called an accident');
  ok(txt('alertsTable').includes('Avoid route — planned work')&&txt('alertsTable').includes('GST Road'),'planned work raises an avoid-route alert with alternative');
  d.getElementById('zoneSelect').value='MG Road'; d.getElementById('scenarioSelect').value='road_closure'; d.getElementById('runSim').click();
  ok(txt('simResults').includes('Scenario projection')&&txt('simResults').includes('Baseline 50'),'simulator baseline = live MG Road congestion (50%), projections tagged');
  ok(txt('simResults').includes('65'),'road-closure formula 50 + 50×0.30 = 65%');
  d.getElementById('genReport').click(); ok(txt('reportPre').includes('Generated:')&&txt('reportPre').includes('Open-Meteo'),'report built from live data');
  ok(Object.keys(dom.window.eval('store').r).every(k=>dom.window.eval('store').r[k].fetchedAt&&dom.window.eval('store').r[k].dataType),'every reading has fetchedAt + dataType');
  dom.window.close();

  console.log('Classification: heavy traffic without any report');
  const tr2=JSON.parse(JSON.stringify(tr)); tr2.incidents.items=[]; 
  dom=await boot(u=>{ if(u.includes('air-quality-api')) return J({},500); if(u.includes('api.open-meteo')) return J({},500); if(u.endsWith('/api/traffic')) return J(tr2); if(u.endsWith('/api/public/notices')) return J({fetchedAt:Date.now(),notices:[]}); return J({},404); });
  d=dom.window.document; ok(/MG Road.*Heavy traffic — no incident reported/.test(d.getElementById('congestionTable').textContent.replace(/\s+/g,' ')),'50% slow-down with no incident/notice is labelled "Heavy traffic — no incident reported"'); dom.window.close();

  console.log('Failure path');
  dom=await boot(u=>{ if(u.includes('air-quality-api')) return J({latitude:1,current:{}},200); if(u.includes('api.open-meteo')) return J({reason:'boom'},500); if(u.endsWith('/api/traffic')) return J({error:'TOMTOM_API_KEY is not configured on the server'},503); return J({},404); });
  ok(true,'(failure path boot)');
  d=dom.window.document; txt=id=>d.getElementById(id).textContent;
  ok(Object.keys(dom.window.eval('store').r).length===0,'no readings stored when every provider fails (nothing invented)');
  ok(txt('env-cards').includes('Unavailable')&&!/\d{2}\.\d/.test(txt('env-cards').replace(/\d{2}:\d{2}/g,'')),'Environmental cards show Unavailable, no numbers');
  ok(txt('mobNotice').includes('TOMTOM_API_KEY'),'traffic shows key requirement message');
  ok(txt('simResults').includes('Missing baseline'),'simulator disables calculations without baseline');
  ok(dom.window.eval('store').src.weather.state==='error'&&dom.window.eval('store').src.weather.fails===1,'failure counted for backoff');
  ok(txt('liveChip').includes('No live data'),'status chip reports no live data');
  dom.window.close();

  console.log('Stale path: first fetch ok, refresh fails');
  let n=0; dom=await boot(u=>{ if(u.includes('api.open-meteo')){ n++; return n===1?J(wx):J({reason:'down'},503);} return J({},404); });
  dom.window.document.getElementById('refreshBtn').disabled=false; dom.window.refreshAll(); await new Promise(r=>setTimeout(r,300));
  d=dom.window.document; ok(dom.window.eval('store').r.temp&&dom.window.eval('store').src.weather.state==='stale','old reading retained and source marked stale');
  ok(d.getElementById('env-cards').textContent.includes('stale')&&dom.window.eval('store').r.temp.observedAt===NOW*1000,'stale label shown, original observation time preserved');
  dom.window.close();
  console.log(`\n${pass} checks passed`); process.exit(0);
})().catch(e=>{ console.error('FAIL:',e.message); process.exit(1); });
