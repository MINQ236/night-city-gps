import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs';
import {meters,bearing,normalizeHeading,formatDistance,formatTime,futureClock,compactRoute,navigationProgress,parseDestinationQuery,maneuverText,maneuverIcon,isCoordinate} from './nav-core.mjs';
import {findPlaces,getRoutes} from './providers.mjs';

const VERSION='1.0.0';
const START=[8.0472,52.2799];
const $=id=>document.getElementById(id);
const storageKey='ncgps.preferences.v1';
const placeKey='ncgps.places.v1';
const defaults={units:'metric',lang:'en',pitch:55,voice:false};
function readStore(key,fallback){try{const x=JSON.parse(localStorage.getItem(key));return x??fallback}catch{return fallback}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
const prefs={...defaults,...readStore(storageKey,{})};
let store=readStore(placeKey,{favorites:[],recent:[]});
if(!Array.isArray(store.favorites)||!Array.isArray(store.recent))store={favorites:[],recent:[]};
const state={position:null,oldPosition:null,speed:null,heading:null,accuracy:null,gpsWatch:null,drive:false,navigating:false,mapReady:false,picking:false,route:null,alternatives:[],routeIndex:0,destination:null,destMarker:null,routeMarker:null,offRoute:0,lastReroute:0,lastProgress:null,lastVoiceKey:'',lastVoiceStep:-1,routeBusy:false,userPanned:false,activeSearch:0,toastTimer:null,navOriginWasGPS:false};
$('version').textContent='v'+VERSION;
$('units').value=prefs.units;$('language').value=prefs.lang;$('pitch').value=String(prefs.pitch);$('voice').setAttribute('aria-pressed',String(prefs.voice));
const display=(e,yes)=>{e.hidden=!yes};
function toast(msg){const e=$('toast');e.textContent=msg;e.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>e.hidden=true,5600)}
function status(t){$('signal').textContent=t}
function setText(id,text){$(id).textContent=String(text)}
function savePrefs(){writeStore(storageKey,prefs)}
function savePlaces(){writeStore(placeKey,store)}
function cleanPlace(place){return {coords:place.coords.map(Number),label:String(place.label||'Selected location').slice(0,180)}}
function remember(place){store.recent=[cleanPlace(place),...store.recent.filter(x=>x.label!==place.label)].slice(0,10);savePlaces()}
function isFavorite(place){return !!place&&store.favorites.some(x=>x.label===place.label&&meters(x.coords,place.coords)<20)}
function toggleFavorite(){if(!state.destination)return;const p=state.destination;if(isFavorite(p)){store.favorites=store.favorites.filter(x=>!(x.label===p.label&&meters(x.coords,p.coords)<20))}else{store.favorites.unshift(cleanPlace(p));store.favorites=store.favorites.slice(0,25)}savePlaces();renderRoute();toast(isFavorite(p)?'Destination saved':'Destination removed from favorites')}

// Keep the public OpenFreeMap vector style, recolor its layers (including optional 3D buildings).
const map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/dark',center:START,zoom:15.5,pitch:55,bearing:-15,antialias:true,attributionControl:false});
map.on('error',e=>console.warn('Map loading notice:',e.error||e));
function recolorMap(){
 const palette={ground:'#06172e',park:'#092338',water:'#05223a',road:'#00849c',roadEdge:'#0ad9ef',building:'#52181d',buildingTop:'#75272a',labels:'#36d5df'};
 let building=null;
 for(const layer of [...map.getStyle().layers]){
  const id=layer.id.toLowerCase(),type=layer.type;
  try{
   if(type==='background')map.setPaintProperty(layer.id,'background-color',palette.ground);
   if(type==='fill'){
    if(/water|lake|river|ocean/.test(id))map.setPaintProperty(layer.id,'fill-color',palette.water);
    else if(/building/.test(id)){
      map.setPaintProperty(layer.id,'fill-color',palette.building);map.setPaintProperty(layer.id,'fill-opacity',0.98);
      if(!building&&layer.source&&layer['source-layer'])building=layer;
    }else if(/park|grass|green|landuse|landcover|wood|forest/.test(id))map.setPaintProperty(layer.id,'fill-color',palette.park);
    else if(/land|earth/.test(id))map.setPaintProperty(layer.id,'fill-color',palette.ground);
   }
   if(type==='line'){
    if(/road|street|highway|motorway|transport|bridge|tunnel/.test(id)){
      map.setPaintProperty(layer.id,'line-color',/case|casing|outline|border/.test(id)?palette.roadEdge:palette.road);
      map.setPaintProperty(layer.id,'line-opacity',1);
    }else if(/water|river|stream/.test(id))map.setPaintProperty(layer.id,'line-color',palette.water);
   }
   if(type==='symbol'&&/label|place|road|street|poi/.test(id)&&map.getLayoutProperty(layer.id,'text-field')){
      map.setPaintProperty(layer.id,'text-color',palette.labels);
      map.setPaintProperty(layer.id,'text-halo-color','#06132c');map.setPaintProperty(layer.id,'text-halo-width',1.4);
   }
   if(type==='fill-extrusion'&&/building/.test(id)){
      map.setPaintProperty(layer.id,'fill-extrusion-color',palette.buildingTop);map.setPaintProperty(layer.id,'fill-extrusion-opacity',.94);
   }
  }catch(e){console.debug('Style layer unchanged:',layer.id,e)}
 }
 if(building){
  try{const layer={id:'nc-extrusions',type:'fill-extrusion',source:building.source,'source-layer':building['source-layer'],minzoom:14,paint:{'fill-extrusion-color':palette.buildingTop,'fill-extrusion-opacity':.82,'fill-extrusion-base':['coalesce',['get','render_min_height'],['get','min_height'],0],'fill-extrusion-height':['coalesce',['get','render_height'],['get','height'],10]}};if(building.filter)layer.filter=building.filter;map.addLayer(layer)}catch(e){console.debug('Building extrusions unavailable',e)}
 }
}
const blank={type:'FeatureCollection',features:[]};
function addRouteLayers(){
 map.addSource('nc-route',{type:'geojson',data:blank});
 map.addLayer({id:'nc-route-shadow',type:'line',source:'nc-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#311d20','line-width':['interpolate',['linear'],['zoom'],10,5,17,12],'line-opacity':.95}});
 map.addLayer({id:'nc-route-line',type:'line',source:'nc-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#f4c83c','line-width':['interpolate',['linear'],['zoom'],10,3.3,17,5.7],'line-opacity':1}});
 map.addSource('nc-traveled',{type:'geojson',data:blank});
 map.addLayer({id:'nc-traveled-line',type:'line',source:'nc-traveled',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#587b84','line-width':4,'line-opacity':.7}});
}
map.on('load',()=>{recolorMap();addRouteLayers();state.mapReady=true;status('GPS // READY');if(state.route)paintRoute();const shared=parseDestinationQuery(window.location.search);if(shared){toast('Shared destination loaded. Enable GPS, then the route will be calculated.');setTimeout(()=>planRoute(shared),450)}});
const arrow=document.createElement('div');arrow.className='vehicle-arrow';arrow.innerHTML='<svg viewBox="0 0 42 52" width="42" height="52" xmlns="http://www.w3.org/2000/svg"><path d="M21 1 L39 47 L21 37 L3 47 Z" fill="#00daf3" stroke="#041b32" stroke-width="3"/><path d="M21 9 L21 36" stroke="#e7ffff" stroke-width="2"/></svg>';
const gpsMarker=new maplibregl.Marker({element:arrow,rotationAlignment:'viewport',pitchAlignment:'viewport'}).setLngLat(START).addTo(map);
function setMarkerHeading(){gpsMarker.setRotation(state.heading===null?-map.getBearing():state.heading-map.getBearing())}
map.on('rotate',setMarkerHeading);
function followCamera(instant=false){if(!state.position)return;const h=map.getContainer().clientHeight;map.easeTo({center:state.position,bearing:state.heading??map.getBearing(),pitch:prefs.pitch,zoom:Math.max(map.getZoom(),16.5),offset:[0,Math.min(h*.16,110)],duration:instant?0:650,essential:true})}
function driveMode(enabled){state.drive=enabled;$('driveMode').classList.toggle('on',enabled);$('driveMode').setAttribute('aria-pressed',String(enabled));setText('driveMode',enabled?'▲ FOLLOW ON':'▲ DRIVE');$('reticle').style.display=enabled?'none':'';if(enabled){startGPS();followCamera();}}
function gpsError(err){const explanations={1:'GPS permission denied. Enable location in iPhone Settings → Privacy & Security → Location Services and Safari.',2:'GPS signal unavailable.',3:'GPS timed out. Retry in an open area.'};status('GPS // OFFLINE');toast(explanations[err.code]||err.message||'GPS failed');stopGPS()}
function startGPS(){if(!navigator.geolocation){toast('This browser does not provide GPS.');return}if(!window.isSecureContext){toast('GPS requires HTTPS (GitHub Pages) or localhost.');return}if(state.gpsWatch!==null){if(state.position)followCamera();return}status('GPS // REQUESTING');state.gpsWatch=navigator.geolocation.watchPosition(positionUpdate,gpsError,{enableHighAccuracy:true,maximumAge:1500,timeout:18000})}
function stopGPS(){if(state.gpsWatch!==null){navigator.geolocation.clearWatch(state.gpsWatch);state.gpsWatch=null}}
function positionUpdate(event){
 const c=event.coords,p=[c.longitude,c.latitude],now=Date.now();if(!isCoordinate(p))return;
 const prior=state.position,priorTime=state.oldPosition?.time??0;
 state.position=p;state.accuracy=c.accuracy;state.speed=c.speed==null?null:c.speed*3.6;
 const course=(Number.isFinite(c.heading)&&c.heading>=0&&(c.speed===null||c.speed>1.3))?c.heading:null;
 // Heading from position changes is useful when GPS heading is unavailable; filter tiny GPS jitter.
 if(course!==null)state.heading=normalizeHeading(course);
 else if(prior&&meters(prior,p)>9&&now-priorTime>1800&&c.accuracy<45)state.heading=bearing(prior,p);
 state.oldPosition={time:now};gpsMarker.setLngLat(p);setMarkerHeading();
 setText('speed',state.speed===null?'-- KM/H':`${Math.round(state.speed)} KM/H`);
 setText('accuracy',`GPS ±${Math.round(c.accuracy)} M`);status(`GPS // LIVE · ±${Math.round(c.accuracy)} M`);
 if(state.drive)followCamera();
 if(state.route)updateProgress();
}

function formatKm(m){return formatDistance(m,prefs.units)}
function origin(){return state.position||map.getCenter().toArray()}
function hideResults(){$('results').hidden=true;$('results').replaceChildren()}
function renderSearchResults(places){hideResults();for(const p of places){const button=document.createElement('button');button.type='button';const name=document.createElement('div');name.textContent='⌖ '+p.label;button.appendChild(name);if(p.subtitle){const detail=document.createElement('div');detail.className='labelsmall';detail.textContent=p.subtitle;button.appendChild(detail);}button.onclick=()=>{hideResults();$('searchInput').value=p.label;planRoute(p)};$('results').appendChild(button)}$('results').hidden=false}
function renderSaved(){const box=$('savedPanel');box.replaceChildren();for(const [title,places] of [['★ SAVED PLACES',store.favorites],['↺ RECENT',store.recent]]){const h=document.createElement('div');h.className='eyebrow';h.style.padding='9px';h.textContent=title;box.appendChild(h);for(const place of places){const row=document.createElement('div');row.className='row';const b=document.createElement('button');b.type='button';b.textContent=place.label;b.onclick=()=>{box.hidden=true;planRoute(place)};row.appendChild(b);if(title.includes('SAVED')){const del=document.createElement('button');del.className='remove';del.textContent='×';del.setAttribute('aria-label','Remove '+place.label);del.onclick=()=>{store.favorites=store.favorites.filter(x=>x!==place);savePlaces();renderSaved()};row.appendChild(del)}box.appendChild(row)}}if(!store.favorites.length&&!store.recent.length){const empty=document.createElement('div');empty.style.padding='12px';empty.textContent='No saved places yet.';box.appendChild(empty)}}
$('searchForm').addEventListener('submit',async e=>{e.preventDefault();const q=$('searchInput').value.trim();if(q.length<3)return;const seq=++state.activeSearch;$('searchButton').disabled=true;hideResults();try{const res=await findPlaces(q,origin(),prefs.lang);if(seq!==state.activeSearch)return;if(!res.length){toast('No results. Try adding the city or street number.');return}renderSearchResults(res)}catch(error){toast('Search unavailable: '+error.message)}finally{$('searchButton').disabled=false}});
$('searchInput').addEventListener('input',()=>{state.activeSearch++;hideResults()});
$('recentToggle').onclick=()=>{renderSaved();$('savedPanel').hidden=!$('savedPanel').hidden};
$('pickMap').onclick=()=>{state.picking=true;$('pickHint').hidden=false;hideResults();$('savedPanel').hidden=true;toast('Tap a place on the map to select it.')};
$('cancelPick').onclick=()=>{state.picking=false;$('pickHint').hidden=true};
map.on('click',e=>{if(!state.picking)return;state.picking=false;$('pickHint').hidden=true;const p={coords:[e.lngLat.lng,e.lngLat.lat],label:`Map pin ${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`};$('searchInput').value=p.label;planRoute(p)});
map.on('dragstart',()=>{if(state.drive){driveMode(false);toast('Map unlocked. Tap DRIVE to resume following your position.')}});
$('zoomIn').onclick=()=>map.zoomIn();$('zoomOut').onclick=()=>map.zoomOut();
$('locate').onclick=()=>{startGPS();if(state.position)followCamera()};
$('recenter').onclick=()=>{startGPS();if(state.position){map.flyTo({center:state.position,zoom:17,pitch:prefs.pitch,duration:750});if(state.drive)followCamera()}else toast('Waiting for GPS permission and first position fix.')};
$('driveMode').onclick=()=>driveMode(!state.drive);
$('favoriteBtn').onclick=toggleFavorite;

function paintRoute(){if(!state.mapReady||!state.route)return;const r=state.route;map.getSource('nc-route').setData({type:'Feature',geometry:{type:'LineString',coordinates:r.geometry.coordinates},properties:{}});map.getSource('nc-traveled').setData(blank)}
function showDestinationMarker(dest){if(state.destMarker)state.destMarker.remove();const pin=document.createElement('div');pin.className='destination-pin';pin.textContent='◆';state.destMarker=new maplibregl.Marker({element:pin}).setLngLat(dest.coords).addTo(map)}
async function planRoute(dest,{reroute=false}={}){
 if(!isCoordinate(dest?.coords))return toast('Invalid destination');
 if(state.routeBusy)return toast('Route calculation is already running.');
 state.routeBusy=true;const old=state.route;const previous=state.destination;
 if(!reroute){state.navigating=false;state.lastProgress=null;state.lastVoiceKey='';setText('startNav','▶ START')}
 status('ROUTE // CALCULATING');hideResults();$('savedPanel').hidden=true;
 try{
  const routes=await getRoutes(origin(),dest.coords);
  state.navOriginWasGPS=!!state.position;state.routeIndex=0;state.alternatives=routes;state.route=routes[0];state.compiled=compactRoute(state.route);state.destination=cleanPlace(dest);state.offRoute=0;state.lastProgress=null;
  remember(state.destination);showDestinationMarker(state.destination);paintRoute();renderRoute();
  if(!reroute){if(state.position){setText('street','ROUTE PLANNED // READY')}else{setText('street','PREVIEW // GPS NOT ACTIVE');toast('Route starts at map center. Enable GPS before driving.')}const bounds=new maplibregl.LngLatBounds();for(const point of state.route.geometry.coordinates)bounds.extend(point);map.fitBounds(bounds,{padding:{top:180,bottom:300,left:35,right:60},maxZoom:16,pitch:25,duration:800})}
  else{toast('Route recalculated');if(state.drive)followCamera()}
  status(state.position?'GPS // LIVE':'ROUTE // READY');
  if(state.navigating)updateProgress();
  return true;
 }catch(e){console.error('Routing:',e);if(!reroute){state.route=old;state.destination=previous;renderRoute()}toast('Routing unavailable: '+e.message+'. Demo service may be busy.');status('ROUTE // UNAVAILABLE');return false}
 finally{state.routeBusy=false}
}
function chooseAlternate(){if(state.alternatives.length<2)return;state.routeIndex=(state.routeIndex+1)%state.alternatives.length;state.route=state.alternatives[state.routeIndex];state.compiled=compactRoute(state.route);state.lastProgress=null;state.offRoute=0;paintRoute();renderRoute();if(state.position)updateProgress();toast(`Alternative route ${state.routeIndex+1}/${state.alternatives.length}`)}
$('routeAlternative').onclick=chooseAlternate;
function renderRoute(){const has=!!state.route&&!!state.destination;display($('routePanel'),has);display($('maneuverPanel'),has&&state.navigating);if(!has){setText('modeLabel','SYSTEM // FREE ROAM');return}setText('modeLabel',state.navigating?'GUIDANCE // ACTIVE':'ROUTE // READY');setText('destinationTitle',state.destination.label);$('favoriteBtn').textContent=isFavorite(state.destination)?'★':'☆';display($('routeAlternative'),state.alternatives.length>1);setText('startNav',state.navigating?'❚❚ PAUSE':'▶ START');const length=state.lastProgress?.remaining??state.route.distance;const seconds=Math.max(0,state.route.duration*(length/Math.max(1,state.route.distance)));setText('remaining',formatKm(length));setText('timeLeft',formatTime(seconds));setText('eta',futureClock(seconds))}
function turnAnnouncement(item,dist){let raw=maneuverText(item.step);if(prefs.lang==='de'){raw=raw.replace('TURN RIGHT','Rechts abbiegen').replace('TURN LEFT','Links abbiegen').replace('CONTINUE STRAIGHT','Geradeaus weiterfahren').replace('ARRIVE AT DESTINATION','Ziel erreicht').replace('KEEP RIGHT','Rechts halten').replace('KEEP LEFT','Links halten').replace('START ROUTE','Navigation gestartet');}const pre=prefs.lang==='de'?`In ${Math.round(dist)} Metern, `:`In ${Math.round(dist)} meters, `;return pre+raw}
function announce(text){if(!prefs.voice||!('speechSynthesis' in window))return;try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=prefs.lang==='de'?'de-DE':'en-US';u.rate=1;u.volume=1;window.speechSynthesis.speak(u)}catch(e){console.debug('Speech unavailable:',e)}}
function maybeSpeak(p){if(!state.navigating||!p?.upcoming||!prefs.voice)return;const step=state.compiled.maneuvers.indexOf(p.upcoming);const t=p.turnMeters;const boundary=t<50?'now':t<180?'near':t<450?'soon':null;if(boundary===null)return;const key=`${step}/${boundary}`;if(key===state.lastVoiceKey)return;state.lastVoiceKey=key;announce(turnAnnouncement(p.upcoming,Math.max(0,t)))}
function progressPaint(p){if(!state.mapReady||!state.compiled)return;const pts=state.compiled.points;const past=pts.slice(0,p.index+1);past.push(pts[p.index+1]);if(past.length>=2)map.getSource('nc-traveled').setData({type:'Feature',geometry:{type:'LineString',coordinates:past},properties:{}})}
function updateProgress(){if(!state.route||!state.compiled||!state.position)return;const p=navigationProgress(state.compiled,state.position,state.lastProgress?.along);state.lastProgress=p;const remaining=Math.max(0,p.remaining);const seconds=Math.max(0,state.route.duration*(remaining/Math.max(1,state.compiled.length)));setText('remaining',formatKm(remaining));setText('timeLeft',formatTime(seconds));setText('eta',futureClock(seconds));
 if(state.navigating){setText('modeLabel','GUIDANCE // LIVE');const step=p.upcoming?.step;if(step){setText('turnIcon',maneuverIcon(step));setText('turnDistance',formatKm(p.turnMeters));setText('turnText',maneuverText(step))}else{setText('turnIcon','◆');setText('turnText','CONTINUE TO DESTINATION');setText('turnDistance',formatKm(remaining))}progressPaint(p);maybeSpeak(p)}
 if(state.navigating&&remaining<28&&meters(state.position,state.destination.coords)<35&&state.accuracy<35){toast('Destination reached');announce(prefs.lang==='de'?'Ziel erreicht':'Destination reached');stopNavigation();return}
 // Conservative rerouting: only three consecutive good GPS fixes well off road, 30s cooldown.
 if(state.navigating&&state.accuracy!=null&&state.accuracy<=40){state.offRoute=p.distance>Math.max(55,state.accuracy*2)?state.offRoute+1:0;if(state.offRoute>=3&&Date.now()-state.lastReroute>30000&&!state.routeBusy){state.lastReroute=Date.now();state.offRoute=0;planRoute(state.destination,{reroute:true})}}
}
async function startNavigation(){if(!state.route){toast('Select a destination first.');return}if(!state.position){startGPS();toast('Enable GPS and wait for a location fix before starting navigation.');return}if(state.navigating){state.navigating=false;setText('startNav','▶ RESUME');$('maneuverPanel').hidden=true;setText('modeLabel','GUIDANCE // PAUSED');return}if(!state.navOriginWasGPS){toast('Updating route to start from your live GPS position...');const good=await planRoute(state.destination,{reroute:true});if(!good)return;}state.navigating=true;state.lastVoiceKey='';driveMode(true);renderRoute();updateProgress();announce(prefs.lang==='de'?'Navigation gestartet':'Navigation started')}
function stopNavigation(){state.navigating=false;state.route=null;state.compiled=null;state.alternatives=[];state.destination=null;state.lastProgress=null;state.offRoute=0;state.lastVoiceKey='';if(state.destMarker){state.destMarker.remove();state.destMarker=null}if(state.mapReady){map.getSource('nc-route').setData(blank);map.getSource('nc-traveled').setData(blank)}renderRoute();setText('street',state.position?'LIVE POSITION // TRACKING':'OSNABRÜCK // FREE ROAM');$('maneuverPanel').hidden=true}
$('startNav').onclick=startNavigation;
$('clearRoute').onclick=()=>{stopNavigation();toast('Route ended')};
$('shareRoute').onclick=async()=>{if(!state.destination)return;const u=new URL(window.location.href);u.search='';u.hash='';u.searchParams.set('to',state.destination.coords.join(','));u.searchParams.set('name',state.destination.label);if(navigator.share){try{await navigator.share({title:'Night City GPS destination',text:state.destination.label,url:u.href});return}catch(e){if(e.name==='AbortError')return}}try{await navigator.clipboard.writeText(u.href);toast('Destination link copied')}catch{toast('Unable to copy link on this device')}};
$('settings').onclick=()=>$('settingsDialog').showModal();
$('units').onchange=e=>{prefs.units=e.target.value;savePrefs();renderRoute();if(state.position)updateProgress()};
$('language').onchange=e=>{prefs.lang=e.target.value;savePrefs()};
$('pitch').oninput=e=>{prefs.pitch=Number(e.target.value);savePrefs();if(state.drive)followCamera(true)};
$('voice').onclick=()=>{prefs.voice=!prefs.voice;savePrefs();$('voice').classList.toggle('on',prefs.voice);$('voice').setAttribute('aria-pressed',String(prefs.voice));$('voice').textContent=prefs.voice?'♪ ON':'♪ OFF';if(prefs.voice)announce(prefs.lang==='de'?'Sprachansagen aktiviert':'Voice guidance enabled')};
$('voice').classList.toggle('on',prefs.voice);$('voice').textContent=prefs.voice?'♪ ON':'♪ OFF';
$('testVoice').onclick=()=>{const old=prefs.voice;prefs.voice=true;announce(prefs.lang==='de'?'Night City Navigation bereit':'Night City Navigation ready');prefs.voice=old};
$('resetData').onclick=()=>{store={favorites:[],recent:[]};savePlaces();renderSaved();toast('Saved locations deleted')};
// Versioned PWA: application shell is installed offline. Map tiles and navigation need the internet.
if('serviceWorker' in navigator&&location.protocol==='https:'){
 window.addEventListener('load',()=>{navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(r=>r.update()).catch(e=>console.warn('Offline shell unavailable',e))});
}
window.addEventListener('online',()=>toast('Connection restored'));
window.addEventListener('offline',()=>toast('Offline: route search and map tiles require internet'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.position&&state.drive)followCamera(true)});
console.info('NIGHT CITY GPS',VERSION,'// Browser navigation prototype, not safety-certified');
