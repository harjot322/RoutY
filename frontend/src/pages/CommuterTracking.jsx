import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, 
  MapPin, 
  Search, 
  Navigation, 
  Clock, 
  Gauge, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Compass,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import LiveMap from '../components/LiveMap';
import PlaceSearchModal from '../components/PlaceSearchModal';
import { getCurrentBrowserLocation } from '../services/geocodingService';

export default function CommuterTracking() {
  const [config, setConfig] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStops, setNearestStops] = useState([]);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  // 1. Initial Load: Config, Routes, Buses
  useEffect(() => {
    async function loadData() {
      try {
        const [cfgRes, routesRes, busesRes] = await Promise.all([
          api.get('/public/config'),
          api.get('/public/routes'),
          api.get('/public/buses')
        ]);
        setConfig(cfgRes.data);
        setRoutes(routesRes.data);
        setBuses(busesRes.data);

        // Default to first route if available
        if (routesRes.data.length > 0) {
          setSelectedRouteId(routesRes.data[0]._id);
        }
      } catch (err) {
        console.error('Error fetching transit data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Real-time Telemetry Subscription via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const handleTelemetry = (data) => {
      setLastHeartbeat(Date.now());
      setBuses((prevBuses) => {
        return prevBuses.map((b) => {
          if (b._id === data.bus_id || b.bus_number === data.bus_number) {
            return {
              ...b,
              last_telemetry: {
                ...b.last_telemetry,
                latitude: data.latitude,
                longitude: data.longitude,
                bearing: data.bearing,
                speed_kmh: data.speed_kmh,
                next_stop_name: data.next_stop_name,
                distance_to_next_stop_m: data.distance_to_next_stop_m,
                eta_to_next_stop_sec: data.eta_to_next_stop_sec,
                timestamp: data.timestamp,
                is_stale: data.is_stale
              },
              etas: data.etas || b.etas
            };
          }
          return b;
        });
      });
    };

    const handleStale = (data) => {
      setBuses((prevBuses) => {
        return prevBuses.map((b) => {
          if (b._id === data.bus_id || b.bus_number === data.bus_number) {
            return {
              ...b,
              last_telemetry: {
                ...b.last_telemetry,
                is_stale: true
              }
            };
          }
          return b;
        });
      });
    };

    socket.on('telemetry:update', handleTelemetry);
    socket.on('telemetry:stale', handleStale);

    return () => {
      socket.off('telemetry:update', handleTelemetry);
      socket.off('telemetry:stale', handleStale);
    };
  }, []);

  // Selected Route Object
  const currentRoute = useMemo(() => {
    return routes.find((r) => r._id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  // Buses on the selected route
  const routeBuses = useMemo(() => {
    if (!selectedRouteId) return buses;
    return buses.filter((b) => b.route_id?._id === selectedRouteId || b.route_id === selectedRouteId);
  }, [buses, selectedRouteId]);

  // Active Selected Bus (or first bus on route)
  const activeBus = useMemo(() => {
    if (selectedBusId) {
      return buses.find((b) => b._id === selectedBusId) || null;
    }
    return routeBuses[0] || null;
  }, [buses, routeBuses, selectedBusId]);

  // Locate user using HTML5 Geolocation
  const handleLocateMe = async () => {
    try {
      const pos = await getCurrentBrowserLocation();
      setUserLocation(pos);
      setFlyToCoords([pos.lat, pos.lng]);

      // Query nearest stops
      const res = await api.get(`/public/nearest-stops?lat=${pos.lat}&lng=${pos.lng}`);
      setNearestStops(res.data);
    } catch (err) {
      alert('Could not detect location. Please check browser permissions.');
    }
  };

  // Place selected from Nominatim Search Modal
  const handleLocationPicked = (place) => {
    setFlyToCoords([place.lat, place.lng]);
    // Also fetch nearest stops to this searched landmark
    api.get(`/public/nearest-stops?lat=${place.lat}&lng=${place.lng}`).then(res => {
      setNearestStops(res.data);
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 flex flex-col md:flex-row">
      
      {/* ---------------- Top Floating Filter & Search Bar ---------------- */}
      <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-[460px] z-[500] flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl space-y-2.5">
          
          {/* Search Trigger Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-medium transition-all shadow-inner text-left"
            >
              <Search className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Search landmark or stop...</span>
            </button>

            {/* Locate Me button */}
            <button
              onClick={handleLocateMe}
              title="Find stops near my GPS location"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-colors shrink-0"
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">Near Me</span>
            </button>
          </div>

          {/* Route & Bus Selectors */}
          <div className="grid grid-cols-2 gap-2">
            {/* Route Selector */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                Select Route
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  setSelectedBusId(''); // Reset bus selection on route switch
                }}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="">All Routes</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.route_number}: {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bus Selector */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                Select Bus
              </label>
              <select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="">All Live Buses</option>
                {routeBuses.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.bus_number} ({Math.round(b.last_telemetry?.speed_kmh || 0)} km/h)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Nearest Stops Quick Banner (if commuter clicked Locate Me) */}
        {nearestStops.length > 0 && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-xl p-2.5 shadow-xl text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400">Nearest: </span>
                <span className="font-semibold text-white">{nearestStops[0].name}</span>
                <span className="text-emerald-400 font-mono ml-1.5">({nearestStops[0].distance_meters}m • ~{nearestStops[0].walking_time_min} min walk)</span>
              </div>
            </div>
            <button
              onClick={() => setFlyToCoords([nearestStops[0].latitude, nearestStops[0].longitude])}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 ml-2 shrink-0"
            >
              Zoom
            </button>
          </div>
        )}
      </div>

      {/* ---------------- Interactive Map Component ---------------- */}
      <div className="flex-1 w-full h-full">
        <LiveMap
          center={config?.defaultCenter || [23.2599, 77.4126]}
          zoom={config?.defaultZoom || 13}
          routes={routes}
          buses={buses}
          selectedRouteId={selectedRouteId}
          selectedBusId={selectedBusId}
          onSelectBus={(bus) => {
            setSelectedBusId(bus._id);
            if (bus.route_id?._id) setSelectedRouteId(bus.route_id._id);
            setDrawerOpen(true);
          }}
          onSelectStop={(stop, route) => {
            setSelectedRouteId(route._id);
            setFlyToCoords([stop.latitude, stop.longitude]);
          }}
          userLocation={userLocation}
          flyToCoords={flyToCoords}
        />
      </div>

      {/* ---------------- Live ETA Drawer / Sidebar ---------------- */}
      <div
        className={`absolute md:relative bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto z-[600] md:z-10 w-full md:w-96 bg-slate-900/95 backdrop-blur-lg border-t md:border-t-0 md:border-l border-slate-800 flex flex-col transition-all duration-300 shadow-2xl ${
          drawerOpen ? 'max-h-[60vh] md:max-h-full' : 'max-h-14'
        }`}
      >
        {/* Drawer Header / Toggle */}
        <div
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="p-3.5 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 select-none"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentRoute?.color || '#10b981' }}
            />
            <div className="font-bold font-display text-sm text-white">
              {currentRoute ? `${currentRoute.route_number} Live ETAs` : 'Transit Overview'}
            </div>
            {activeBus && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold">
                {activeBus.bus_number}
              </span>
            )}
          </div>
          <button className="text-slate-400 hover:text-white p-1">
            {drawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        {drawerOpen && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Active Bus Telemetry Status Card */}
            {activeBus ? (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">{activeBus.bus_number}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeBus.last_telemetry?.is_stale ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Stale (&gt;30s)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        ● Active Live
                      </span>
                    )}
                  </div>
                </div>

                {/* Speed and Next Stop Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/70 p-2 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Speed</div>
                    <div className="text-base font-bold font-mono text-emerald-400">
                      {Math.round(activeBus.last_telemetry?.speed_kmh || 0)} <span className="text-xs font-normal">km/h</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/70 p-2 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Next Stop</div>
                    <div className="text-xs font-bold text-amber-300 truncate mt-0.5">
                      {activeBus.last_telemetry?.next_stop_name || 'In Transit'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-3 bg-slate-800/40 rounded-xl text-xs text-slate-400">
                Select a bus or route to track live telemetry.
              </div>
            )}

            {/* Per-Stop ETA List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>STOPS & ESTIMATED ARRIVAL</span>
                <span>ETA</span>
              </div>

              {currentRoute?.stops && currentRoute.stops.length > 0 ? (
                <div className="relative border-l-2 border-slate-800 ml-3.5 space-y-3.5 py-1">
                  {currentRoute.stops.map((stop, idx) => {
                    const etaItem = activeBus?.etas?.find(e => e.stop_sequence === stop.sequence);
                    const isNext = activeBus?.last_telemetry?.next_stop_name === stop.name;
                    const isDeparted = etaItem?.eta_formatted === 'Departed';

                    return (
                      <div
                        key={idx}
                        onClick={() => setFlyToCoords([stop.latitude, stop.longitude])}
                        className={`relative pl-5 cursor-pointer group transition-all ${
                          isNext ? 'scale-[1.02]' : ''
                        }`}
                      >
                        {/* Node pin */}
                        <div
                          className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125 ${
                            isNext
                              ? 'bg-amber-400 border-white ring-4 ring-amber-400/30'
                              : isDeparted
                              ? 'bg-slate-700 border-slate-600'
                              : 'bg-emerald-500 border-slate-900'
                          }`}
                        />

                        {/* Stop Details */}
                        <div
                          className={`p-2.5 rounded-xl border transition-all ${
                            isNext
                              ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                              : 'bg-slate-800/50 border-slate-800 group-hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                                {stop.name}
                              </div>
                              {stop.name_hi && (
                                <div className="text-[11px] text-slate-400">{stop.name_hi}</div>
                              )}
                              {etaItem?.distance_remaining_m > 0 && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {etaItem.distance_remaining_m > 1000
                                    ? `${(etaItem.distance_remaining_m / 1000).toFixed(1)} km away`
                                    : `${etaItem.distance_remaining_m} m away`}
                                </div>
                              )}
                            </div>

                            {/* ETA Pill */}
                            <div className="shrink-0 text-right">
                              {isDeparted ? (
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-semibold">
                                  Departed
                                </span>
                              ) : isNext ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-bold shadow-md">
                                  {etaItem?.eta_formatted || 'Approaching'}
                                </span>
                              ) : etaItem?.eta_formatted ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-xs font-semibold font-mono">
                                  {etaItem.eta_formatted}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">--</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">
                  No stops configured for this route yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Place Search Modal Triggered by Button */}
      <PlaceSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectLocation={handleLocationPicked}
        city={config?.city || 'Bhopal'}
      />
    </div>
  );
}
