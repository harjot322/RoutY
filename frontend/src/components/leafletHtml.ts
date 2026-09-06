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

export const MAP_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#EAEAEA;font-family:-apple-system,Roboto,sans-serif}
.leaflet-control-attribution{font-size:9px}
.bus{width:40px;height:40px;border-radius:12px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;position:relative}
.bus svg{position:absolute;width:18px;height:18px;top:-11px;left:8px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4))}
.bus.sos{animation:pulse 1s infinite;border-color:#D32F2F}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(211,47,47,.7)}100%{box-shadow:0 0 0 16px rgba(211,47,47,0)}}
.stop{width:16px;height:16px;border-radius:8px;background:#fff;border:3px solid #333;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.user{width:22px;height:22px;border-radius:11px;background:#1565C0;border:4px solid #fff;box-shadow:0 0 0 6px rgba(21,101,192,.25)}
.pin{width:14px;height:14px;border-radius:7px;background:#121212;border:3px solid #fff}
.lbl{background:#fff;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:700;border:1px solid #ccc;white-space:nowrap}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([26.93,81.2],11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var routeLayer=L.layerGroup().addTo(map),stopLayer=L.layerGroup().addTo(map),heatLayer=L.layerGroup().addTo(map),trailLayer=L.layerGroup().addTo(map);
var buses={},userM=null,fitted=false;
function post(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else if(window.parent!==window){window.parent.postMessage(s,'*')}}
var busSvg='<svg viewBox="0 0 24 24" fill="#fff"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM18 11H6V6h12v5z"/></svg>';
function busIcon(b){return L.divIcon({className:'',iconSize:[40,40],iconAnchor:[20,20],html:'<div class="bus'+(b.sos?' sos':'')+'" style="background:'+b.color+'">'+busSvg+b.label+'</div>'})}
function setRoutes(rs,hl){routeLayer.clearLayers();stopLayer.clearLayers();var all=[];rs.forEach(function(r){var ll=r.path.map(function(c){return [c[1],c[0]]});all=all.concat(ll);var dim=hl&&hl!==r.id;L.polyline(ll,{color:r.color,weight:dim?3:6,opacity:dim?0.35:0.9}).addTo(routeLayer);r.stops.forEach(function(s){var m=L.marker([s.lat,s.lng],{icon:L.divIcon({className:'',iconSize:[16,16],iconAnchor:[8,8],html:'<div class="stop" style="border-color:'+r.color+'"></div>'})}).addTo(stopLayer);m.bindTooltip(s.name,{direction:'top',offset:[0,-8],className:'lbl'});m.on('click',function(){post({type:'stopTap',id:s.id,routeId:r.id})})})});if(!fitted&&all.length){fitted=true;map.fitBounds(L.latLngBounds(all),{padding:[30,30]})}if(hl){var r=rs.filter(function(x){return x.id===hl})[0];if(r){map.fitBounds(L.latLngBounds(r.path.map(function(c){return [c[1],c[0]]})),{padding:[30,30]})}}}
function animate(m,to){var from=m.getLatLng(),start=null;function step(ts){if(!start)start=ts;var t=Math.min(1,(ts-start)/1500);m.setLatLng([from.lat+(to[0]-from.lat)*t,from.lng+(to[1]-from.lng)*t]);if(t<1)requestAnimationFrame(step)}requestAnimationFrame(step)}
function setBuses(bs){var seen={};bs.forEach(function(b){seen[b.id]=1;var m=buses[b.id];if(!m){m=L.marker([b.lat,b.lng],{icon:busIcon(b),zIndexOffset:1000}).addTo(map);m.on('click',function(){post({type:'busTap',id:b.id})});buses[b.id]=m;m._sos=b.sos}else{animate(m,[b.lat,b.lng]);if(m._sos!==b.sos){m.setIcon(busIcon(b));m._sos=b.sos}}});Object.keys(buses).forEach(function(id){if(!seen[id]){map.removeLayer(buses[id]);delete buses[id]}})}
function setUser(u){if(userM){map.removeLayer(userM);userM=null}if(u){userM=L.marker([u.lat,u.lng],{icon:L.divIcon({className:'',iconSize:[22,22],iconAnchor:[11,11],html:'<div class="user"></div>'}),zIndexOffset:2000}).addTo(map)}}
function setHeat(ps){heatLayer.clearLayers();var pts=[];ps.forEach(function(p){pts.push([p.lat,p.lng]);var r=14+Math.min(40,p.weight*6);L.circleMarker([p.lat,p.lng],{radius:r,color:'#D32F2F',weight:2,fillColor:'#D32F2F',fillOpacity:0.35}).addTo(heatLayer).bindTooltip(p.label+' ('+p.weight+')',{className:'lbl'})});if(pts.length){map.fitBounds(L.latLngBounds(pts),{padding:[40,40],maxZoom:13})}}
function setTrail(tr,mk){trailLayer.clearLayers();if(tr&&tr.length){var ll=tr.map(function(p){return [p.lat,p.lng]});L.polyline(ll,{color:'#121212',weight:4,opacity:0.6,dashArray:'6 6'}).addTo(trailLayer)}if(mk){L.marker([mk.lat,mk.lng],{icon:L.divIcon({className:'',iconSize:[40,40],iconAnchor:[20,20],html:'<div class="bus" style="background:#121212">'+busSvg+mk.label+'</div>'}),zIndexOffset:3000}).addTo(trailLayer)}}
function handle(d){try{if(typeof d==='string')d=JSON.parse(d);switch(d.type){case 'routes':setRoutes(d.routes,d.highlight);break;case 'buses':setBuses(d.buses);break;case 'user':setUser(d.user);break;case 'heat':setHeat(d.points);break;case 'trail':setTrail(d.trail,d.marker);break;case 'focus':map.setView([d.lat,d.lng],d.zoom||14,{animate:true});break}}catch(e){}}
window.__rx=handle;window.addEventListener('message',function(e){handle(e.data)});document.addEventListener('message',function(e){handle(e.data)});
setTimeout(function(){post({type:'ready'})},50);
</script></body></html>`;
