import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus, MapPin, Gauge, Clock, AlertTriangle } from 'lucide-react';

// Fly-to controller sub-component
function MapController({ center, zoom, flyToCoords }) {
  const map = useMap();

  useEffect(() => {
    if (flyToCoords && Array.isArray(flyToCoords) && flyToCoords.length === 2) {
      map.flyTo(flyToCoords, 16, { animate: true, duration: 1.2 });
    }
  }, [flyToCoords, map]);

  return null;
}

// Generate custom rotating bus SVG marker
function createBusIcon(bus, isSelected) {
  const bearing = bus.last_telemetry?.bearing || 0;
  const speed = bus.last_telemetry?.speed_kmh || 0;
  const isStale = bus.last_telemetry?.is_stale;
  const routeColor = bus.route_id?.color || '#2563eb';

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
      <!-- Live pulse effect -->
      ${!isStale ? `<div class="absolute w-12 h-12 rounded-full animate-ping opacity-25" style="background-color: ${routeColor};"></div>` : ''}

      <!-- Bus Plate & Speed Pill -->
      <div class="flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded-md text-[10px] font-bold text-white shadow-md border ${isSelected ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-700/80'}" style="background-color: #0f172a;">
        <span style="color: ${routeColor};">●</span>
        <span>${bus.bus_number.split('-')[0] || bus.bus_number}</span>
        ${!isStale ? `<span class="text-emerald-400 font-mono text-[9px]">${Math.round(speed)}k</span>` : '<span class="text-amber-400 text-[9px]">stale</span>'}
      </div>

      <!-- Rotating Vehicle Body -->
      <div class="relative w-8 h-8 rounded-xl shadow-xl flex items-center justify-center transition-transform duration-300 ${isSelected ? 'scale-110' : ''}" style="background-color: ${routeColor}; border: 2px solid #ffffff;">
        <div style="transform: rotate(${bearing}deg); transition: transform 0.4s ease-out;">
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-bus-marker',
    iconSize: [40, 50],
    iconAnchor: [20, 25]
  });
}

// Custom numbered stop marker
function createStopIcon(stop, index, isNext) {
  const html = `
    <div class="relative flex flex-col items-center cursor-pointer" style="transform: translate(-50%, -50%);">
      <div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shadow-lg border-2 ${
        isNext 
          ? 'bg-amber-500 text-slate-950 border-white ring-4 ring-amber-400/40 animate-pulse' 
          : 'bg-slate-900 text-slate-200 border-emerald-500'
      }">
        ${index + 1}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-stop-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

export default function LiveMap({
  center = [23.2599, 77.4126],
  zoom = 13,
  routes = [],
  buses = [],
  selectedRouteId = null,
  selectedBusId = null,
  onSelectBus = () => {},
  onSelectStop = () => {},
  userLocation = null,
  flyToCoords = null
}) {
  // Filter polylines and stops based on selected route
  const activeRoutes = useMemo(() => {
    if (!selectedRouteId) return routes;
    return routes.filter(r => r._id === selectedRouteId);
  }, [routes, selectedRouteId]);

  // Filter buses based on selected route/bus
  const displayBuses = useMemo(() => {
    let list = buses;
    if (selectedRouteId) {
      list = list.filter(b => (b.route_id?._id === selectedRouteId || b.route_id === selectedRouteId));
    }
    if (selectedBusId) {
      list = list.filter(b => b._id === selectedBusId);
    }
    return list;
  }, [buses, selectedRouteId, selectedBusId]);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <MapController center={center} zoom={zoom} flyToCoords={flyToCoords} />

        {/* Free OpenStreetMap Tiles with subtle dark carto contrast */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* User Commuter Location Marker */}
        {userLocation && (
          <>
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={24}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
            />
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={7}
              pathOptions={{ color: '#ffffff', fillColor: '#2563eb', fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div className="text-xs font-semibold text-slate-100">You are here (Current Location)</div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* Route Polylines */}
        {activeRoutes.map(route => {
          const coords = route.geojson?.coordinates?.map(c => [c[1], c[0]]) || [];
          if (coords.length < 2) return null;
          const isCurrent = route._id === selectedRouteId;

          return (
            <React.Fragment key={route._id}>
              {/* Outer soft glow line */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color: route.color || '#2563eb',
                  weight: isCurrent ? 8 : 5,
                  opacity: isCurrent ? 0.4 : 0.25,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* Inner crisp route line */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color: route.color || '#2563eb',
                  weight: isCurrent ? 4 : 3,
                  opacity: isCurrent ? 1 : 0.75,
                  dashArray: isCurrent ? null : '6, 6'
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Stops along active routes */}
        {activeRoutes.map(route => {
          return route.stops?.map((stop, idx) => {
            const isNext = displayBuses.some(b => b.last_telemetry?.next_stop_name === stop.name);

            return (
              <Marker
                key={`${route._id}-stop-${idx}`}
                position={[stop.latitude, stop.longitude]}
                icon={createStopIcon(stop, idx, isNext)}
                eventHandlers={{
                  click: () => onSelectStop(stop, route)
                }}
              >
                <Popup>
                  <div className="p-1 max-w-[200px]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Stop #{idx + 1}</span>
                    </div>
                    <div className="font-semibold text-sm text-white mt-0.5">{stop.name}</div>
                    {stop.name_hi && <div className="text-xs text-slate-400">{stop.name_hi}</div>}
                    <div className="text-[11px] text-slate-400 mt-1">Route: {route.route_number}</div>
                    {isNext && (
                      <div className="mt-2 px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 rounded text-[10px] text-amber-300 font-semibold inline-block">
                        Upcoming Bus Approaching
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          });
        })}

        {/* Live Buses Markers */}
        {displayBuses.map(bus => {
          const lat = bus.last_telemetry?.latitude;
          const lng = bus.last_telemetry?.longitude;
          if (!lat || !lng) return null;

          const isSelected = bus._id === selectedBusId;

          return (
            <Marker
              key={bus._id}
              position={[lat, lng]}
              icon={createBusIcon(bus, isSelected)}
              eventHandlers={{
                click: () => onSelectBus(bus)
              }}
            >
              <Popup>
                <div className="p-1 min-w-[210px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-emerald-400" />
                      <span>{bus.bus_number}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {bus.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Route:</span>
                      <span className="font-semibold text-white">{bus.route_id?.route_number || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Current Speed:</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {Math.round(bus.last_telemetry?.speed_kmh || 0)} km/h
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Next Stop:</span>
                      <span className="font-semibold text-amber-300 truncate max-w-[120px]">
                        {bus.last_telemetry?.next_stop_name || 'In Transit'}
                      </span>
                    </div>
                    {bus.last_telemetry?.eta_to_next_stop_sec > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">ETA to Next:</span>
                        <span className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                          {Math.round(bus.last_telemetry.eta_to_next_stop_sec / 60)} min
                        </span>
                      </div>
                    )}
                    {bus.last_telemetry?.is_stale && (
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Signal paused (&gt;30s)</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
