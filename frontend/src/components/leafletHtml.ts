import { useEffect } from "react";

export type MapRoute = { id: string; color: string; number: string; path: [number, number][]; stops: { id: string; name: string; lat: number; lng: number }[] };
export type MapBus = { id: string; lat: number; lng: number; color: string; label: string; sos: boolean; heading: number };
export type MapPoint = { lat: number; lng: number; weight: number; label: string };

export type LeafletMapProps = {
  routes?: MapRoute[];
  buses?: MapBus[];
  user?: { lat: number; lng: number } | null;
  heat?: MapPoint[];
  trail?: { lat: number; lng: number }[];
  marker?: { lat: number; lng: number; label: string } | null;
  highlightRouteId?: string | null;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  onBusPress?: (id: string) => void;
  onStopPress?: (stopId: string, routeId: string) => void;
  style?: any;
  testID?: string;
};

/** Pushes props into the map page whenever they change. Shared by native & web wrappers. */
export function useMapSync(ready: boolean, send: (msg: object) => void, p: LeafletMapProps) {
  const { routes, buses, user, heat, trail, marker, highlightRouteId, focus } = p;
  useEffect(() => {
    if (ready) send({ type: "routes", routes: routes ?? [], highlight: highlightRouteId ?? null });
  }, [ready, routes, highlightRouteId, send]);
  useEffect(() => {
    if (ready) send({ type: "buses", buses: buses ?? [] });
  }, [ready, buses, send]);
  useEffect(() => {
    if (ready) send({ type: "user", user: user ?? null });
  }, [ready, user, send]);
  useEffect(() => {
    if (ready) send({ type: "heat", points: heat ?? [] });
  }, [ready, heat, send]);
  useEffect(() => {
    if (ready) send({ type: "trail", trail: trail ?? [], marker: marker ?? null });
  }, [ready, trail, marker, send]);
  useEffect(() => {
    if (ready && focus) send({ type: "focus", ...focus });
  }, [ready, focus, send]);
}

const CARTO_KEY = process.env.EXPO_PUBLIC_CARTO_API_KEY || "";

export const MAP_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif}
.leaflet-control-attribution{font-size:8px;opacity:0.6}

/* Uber-style Directional Vehicle Marker */
.vehicle-container{position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer}
.vehicle-pill{background:#0F172A;color:#FFFFFF;padding:2px 7px;border-radius:12px;font-size:10px;font-weight:800;letter-spacing:0.5px;box-shadow:0 3px 8px rgba(15,23,42,0.3);white-space:nowrap;margin-bottom:2px;border:1.5px solid #FFFFFF}
.vehicle-disc{width:36px;height:36px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.35);border:2.5px solid #FFFFFF;transition:transform 0.4s cubic-bezier(0.4,0,0.2,1);position:relative}
.vehicle-disc svg{width:18px;height:18px}
.vehicle-disc.sos{border-color:#EF4444;animation:sos-pulse 1.2s infinite}
@keyframes sos-pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,0.8)}70%{box-shadow:0 0 0 16px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}

/* Transit Stop Node */
.stop-node{width:14px;height:14px;border-radius:7px;background:#FFFFFF;border:3.5px solid #0F172A;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;transition:transform 0.2s}
.stop-node:hover{transform:scale(1.3)}

/* User Location Dot */
.user-dot{width:20px;height:20px;border-radius:10px;background:#3B82F6;border:3.5px solid #FFFFFF;box-shadow:0 0 0 8px rgba(59,130,246,0.25)}

/* Bilingual Stop Tooltip */
.stop-tooltip{background:#FFFFFF;padding:4px 8px;border-radius:8px;box-shadow:0 4px 12px rgba(15,23,42,0.15);border:1px solid #E2E8F0;text-align:center}
.stop-tooltip-hi{font-size:11px;font-weight:700;color:#0F172A;line-height:1.2}
.stop-tooltip-en{font-size:9.5px;font-weight:600;color:#64748B;line-height:1.2}

/* Unserved Demand Heat Marker */
.demand-marker{border-radius:50%;background:rgba(239,68,68,0.35);border:2px solid #EF4444}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([26.93,81.2],11);
// CartoDB Voyager tile layer with clean watermark-free API key
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' + ('${CARTO_KEY}' ? '?key=${CARTO_KEY}' : ''),{
  maxZoom:19,
  subdomains:'abcd',
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

var casingLayer=L.layerGroup().addTo(map),routeLayer=L.layerGroup().addTo(map),stopLayer=L.layerGroup().addTo(map),heatLayer=L.layerGroup().addTo(map),trailLayer=L.layerGroup().addTo(map);
var buses={},userM=null,fitted=false;

function post(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else if(window.parent!==window){window.parent.postMessage(s,'*')}}

// Directional heading arrow icon for vehicles
var dirSvg='<svg viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>';

function createVehicleIcon(b){
  var heading=b.heading||0;
  var html='<div class="vehicle-container">'+
             '<div class="vehicle-pill" style="border-color:'+b.color+'">'+b.label+'</div>'+
             '<div class="vehicle-disc'+(b.sos?' sos':'')+'" style="background:'+b.color+';transform:rotate('+heading+'deg)">'+dirSvg+'</div>'+
           '</div>';
  return L.divIcon({className:'',iconSize:[40,54],iconAnchor:[20,40],html:html});
}

function setRoutes(rs,hl){
  casingLayer.clearLayers();
  routeLayer.clearLayers();
  stopLayer.clearLayers();
  var all=[];
  rs.forEach(function(r){
    var ll=r.path.map(function(c){return [c[1],c[0]]});
    all=all.concat(ll);
    var isHl=hl&&hl===r.id;
    var isDim=hl&&hl!==r.id;
    
    // Road casing (darker backdrop line for high contrast)
    L.polyline(ll,{color:'#0F172A',weight:isHl?8:(isDim?3:6),opacity:isDim?0.15:0.35,lineCap:'round',lineJoin:'round'}).addTo(casingLayer);
    // Main colored route line
    L.polyline(ll,{color:r.color,weight:isHl?6:(isDim?2:4.5),opacity:isDim?0.25:0.95,lineCap:'round',lineJoin:'round'}).addTo(routeLayer);
    
    r.stops.forEach(function(s){
      var nodeHtml='<div class="stop-node" style="border-color:'+r.color+'"></div>';
      var m=L.marker([s.lat,s.lng],{icon:L.divIcon({className:'',iconSize:[14,14],iconAnchor:[7,7],html:nodeHtml})}).addTo(stopLayer);
      
      var tipContent='<div class="stop-tooltip">'+
                       (s.name_hi?'<div class="stop-tooltip-hi">'+s.name_hi+'</div>':'')+
                       '<div class="stop-tooltip-en">'+s.name+'</div>'+
                     '</div>';
      m.bindTooltip(tipContent,{direction:'top',offset:[0,-6],className:''});
      m.on('click',function(){post({type:'stopTap',id:s.id,routeId:r.id})});
    });
  });
  if(!fitted&&all.length){
    fitted=true;
    map.fitBounds(L.latLngBounds(all),{padding:[36,36]});
  }
  if(hl){
    var r=rs.filter(function(x){return x.id===hl})[0];
    if(r&&r.path&&r.path.length){
      map.fitBounds(L.latLngBounds(r.path.map(function(c){return [c[1],c[0]]})),{padding:[40,40]});
    }
  }
}

function animateVehicle(m,to,heading,b){
  var from=m.getLatLng();
  var start=null;
  function step(ts){
    if(!start)start=ts;
    var t=Math.min(1,(ts-start)/1400);
    var curLat=from.lat+(to[0]-from.lat)*t;
    var curLng=from.lng+(to[1]-from.lng)*t;
    m.setLatLng([curLat,curLng]);
    if(t<1){
      requestAnimationFrame(step);
    } else {
      m.setIcon(createVehicleIcon(b));
    }
  }
  requestAnimationFrame(step);
}

function setBuses(bs){
  var seen={};
  bs.forEach(function(b){
    seen[b.id]=1;
    var m=buses[b.id];
    if(!m){
      m=L.marker([b.lat,b.lng],{icon:createVehicleIcon(b),zIndexOffset:1000}).addTo(map);
      m.on('click',function(){post({type:'busTap',id:b.id})});
      buses[b.id]=m;
      m._sos=b.sos;
      m._heading=b.heading;
    } else {
      animateVehicle(m,[b.lat,b.lng],b.heading,b);
      m._sos=b.sos;
      m._heading=b.heading;
    }
  });
  Object.keys(buses).forEach(function(id){
    if(!seen[id]){
      map.removeLayer(buses[id]);
      delete buses[id];
    }
  });
}

function setUser(u){
  if(userM){map.removeLayer(userM);userM=null}
  if(u){
    userM=L.marker([u.lat,u.lng],{icon:L.divIcon({className:'',iconSize:[20,20],iconAnchor:[10,10],html:'<div class="user-dot"></div>'}),zIndexOffset:2000}).addTo(map);
  }
}

function setHeat(ps){
  heatLayer.clearLayers();
  var pts=[];
  ps.forEach(function(p){
    pts.push([p.lat,p.lng]);
    var r=14+Math.min(40,p.weight*6);
    L.circleMarker([p.lat,p.lng],{radius:r,color:'#EF4444',weight:2,fillColor:'#EF4444',fillOpacity:0.35}).addTo(heatLayer).bindTooltip(p.label+' ('+p.weight+')',{className:'stop-tooltip'});
  });
  if(pts.length){map.fitBounds(L.latLngBounds(pts),{padding:[40,40],maxZoom:13})}
}

function setTrail(tr,mk){
  trailLayer.clearLayers();
  if(tr&&tr.length){
    var ll=tr.map(function(p){return [p.lat,p.lng]});
    L.polyline(ll,{color:'#0F172A',weight:4,opacity:0.7,dashArray:'6 6'}).addTo(trailLayer);
  }
  if(mk){
    L.marker([mk.lat,mk.lng],{icon:createVehicleIcon(mk),zIndexOffset:3000}).addTo(trailLayer);
  }
}

function handle(d){
  try{
    if(typeof d==='string')d=JSON.parse(d);
    switch(d.type){
      case 'routes':setRoutes(d.routes,d.highlight);break;
      case 'buses':setBuses(d.buses);break;
      case 'user':setUser(d.user);break;
      case 'heat':setHeat(d.points);break;
      case 'trail':setTrail(d.trail,d.marker);break;
      case 'focus':map.setView([d.lat,d.lng],d.zoom||14,{animate:true});break;
    }
  }catch(e){}
}

window.__rx=handle;
window.addEventListener('message',function(e){handle(e.data)});
document.addEventListener('message',function(e){handle(e.data)});
setTimeout(function(){post({type:'ready'})},50);
</script></body></html>`;
