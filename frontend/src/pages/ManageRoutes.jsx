import React, { useState, useEffect } from 'react';
import { 
  Route as RouteIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  MapPin, 
  Search, 
  Sparkles, 
  Check, 
  X, 
  Loader2 
} from 'lucide-react';
import api from '../services/api';
import { searchPlaceByName, fetchRoadRoute } from '../services/geocodingService';

export default function ManageRoutes() {
  const [routes, setRoutes] = useState([]);
  const [stopsList, setStopsList] = useState([]);
  const [editingRoute, setEditingRoute] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [routeNumber, setRouteNumber] = useState('');
  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [selectedStops, setSelectedStops] = useState([]);
  const [autoPlaceQuery, setAutoPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [snappingRoad, setSnappingRoad] = useState(false);
  const [roadGeojson, setRoadGeojson] = useState(null);

  const fetchRoutes = async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        api.get('/public/routes'),
        api.get('/public/stops')
      ]);
      setRoutes(rRes.data);
      setStopsList(sRes.data);
    } catch (err) {
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const openNewRouteModal = () => {
    setEditingRoute(null);
    setRouteNumber('');
    setName('');
    setNameHi('');
    setDescription('');
    setColor('#2563eb');
    setSelectedStops([]);
    setRoadGeojson(null);
    setIsModalOpen(true);
  };

  const openEditRouteModal = (route) => {
    setEditingRoute(route);
    setRouteNumber(route.route_number);
    setName(route.name);
    setNameHi(route.name_hi || '');
    setDescription(route.description || '');
    setColor(route.color || '#2563eb');
    setSelectedStops(route.stops || []);
    setRoadGeojson(route.geojson || null);
    setIsModalOpen(true);
  };

  // Place search inside route builder
  useEffect(() => {
    if (!autoPlaceQuery || autoPlaceQuery.trim().length < 2) {
      setPlaceResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchPlaceByName(autoPlaceQuery);
      setPlaceResults(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [autoPlaceQuery]);

  // Add stop from place search result
  const handleAddStopFromSearch = (place) => {
    const newStop = {
      name: place.name,
      name_hi: '',
      latitude: place.lat,
      longitude: place.lng,
      sequence: selectedStops.length
    };
    setSelectedStops([...selectedStops, newStop]);
    setAutoPlaceQuery('');
    setPlaceResults([]);
  };

  // Add stop from existing registered stops dropdown
  const handleAddExistingStop = (stopId) => {
    const existing = stopsList.find((s) => s._id === stopId);
    if (!existing) return;
    const newStop = {
      stop_id: existing._id,
      name: existing.name,
      name_hi: existing.name_hi || '',
      latitude: existing.latitude,
      longitude: existing.longitude,
      sequence: selectedStops.length
    };
    setSelectedStops([...selectedStops, newStop]);
  };

  // Reorder stops
  const moveStop = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= selectedStops.length) return;
    const updated = [...selectedStops];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    // Re-index sequences
    setSelectedStops(updated.map((s, idx) => ({ ...s, sequence: idx })));
  };

  const removeStop = (index) => {
    const updated = selectedStops.filter((_, idx) => idx !== index);
    setSelectedStops(updated.map((s, idx) => ({ ...s, sequence: idx })));
  };

  // Auto snap road path using free OSRM
  const handleSnapRoad = async () => {
    if (selectedStops.length < 2) {
      alert('Add at least 2 stops to snap road geometry.');
      return;
    }
    setSnappingRoad(true);
    try {
      const roadData = await fetchRoadRoute(selectedStops);
      if (roadData && roadData.coordinates) {
        setRoadGeojson({
          type: 'LineString',
          coordinates: roadData.coordinates
        });
        alert(`Successfully snapped road! Route length: ${(roadData.distanceM / 1000).toFixed(1)} km`);
      } else {
        alert('Could not snap road coordinates. Fallback interpolated road will be used.');
      }
    } catch (err) {
      alert('OSRM road snapping failed. Standard interpolation will be used.');
    } finally {
      setSnappingRoad(false);
    }
  };

  // Save or Update Route
  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (selectedStops.length < 2) {
      alert('A route must have at least 2 stops.');
      return;
    }

    const payload = {
      route_number: routeNumber,
      name,
      name_hi: nameHi,
      description,
      color,
      stops: selectedStops,
      geojson: roadGeojson
    };

    try {
      if (editingRoute) {
        await api.put(`/admin/routes/${editingRoute._id}`, payload);
      } else {
        await api.post('/admin/routes', payload);
      }
      setIsModalOpen(false);
      fetchRoutes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save route');
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm('Are you sure you want to delete this route? Assigned buses will be set to idle.')) return;
    try {
      await api.delete(`/admin/routes/${id}`);
      fetchRoutes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete route');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2.5">
            <RouteIcon className="w-6 h-6 text-blue-400" />
            <span>Public Transit Route Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create, edit, and organize municipal bus corridors with real-world road geometries.
          </p>
        </div>

        <button
          onClick={openNewRouteModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-900/30 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Route</span>
        </button>
      </div>

      {/* Routes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {routes.map((route) => (
          <div
            key={route._id}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 group hover:border-slate-700 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-md"
                    style={{ backgroundColor: route.color || '#2563eb' }}
                  />
                  <span className="font-mono font-bold text-base text-white">{route.route_number}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditRouteModal(route)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoute(route._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                  {route.name}
                </h3>
                {route.name_hi && (
                  <p className="text-xs text-slate-400 mt-0.5">{route.name_hi}</p>
                )}
              </div>

              {route.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{route.description}</p>
              )}

              {/* Stops Count & Distance */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>{route.stops?.length || 0} Ordered Stops</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {(route.total_distance_m / 1000).toFixed(1)} km
                </span>
              </div>
            </div>

            {/* Stops Preview Bar */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {route.stops?.map((s, i) => (
                <span
                  key={i}
                  title={s.name}
                  className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded-md border border-slate-700/60 truncate max-w-[100px] shrink-0"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- Route Creator / Editor Modal ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold font-display text-white">
                {editingRoute ? `Edit Route: ${editingRoute.route_number}` : 'Create New Transit Route'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4">
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Route Code</label>
                  <input
                    type="text"
                    value={routeNumber}
                    onChange={(e) => setRouteNumber(e.target.value)}
                    placeholder="e.g. R-101"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Route Name (English)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Central Station – Tech City"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Local Name (Hindi)</label>
                  <input
                    type="text"
                    value={nameHi}
                    onChange={(e) => setNameHi(e.target.value)}
                    placeholder="e.g. सेन्ट्रल स्टेशन – टेक सिटी"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Route Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-8 rounded-lg bg-transparent cursor-pointer border border-slate-700"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ---------------- Free Automated Stop Addition via Place Search ---------------- */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Free Automated Place Name Detection (Nominatim)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Zero API Key Required</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={autoPlaceQuery}
                    onChange={(e) => setAutoPlaceQuery(e.target.value)}
                    placeholder="Type landmark or place name to auto-detect coordinates..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />

                  {/* Dropdown of detected places */}
                  {placeResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 z-50 max-h-48 overflow-y-auto">
                      {placeResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleAddStopFromSearch(p)}
                          className="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs text-white transition-colors"
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold text-emerald-300">{p.name}</span>
                            <span className="text-slate-400 text-[11px] block truncate">{p.displayName}</span>
                          </div>
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                            + Add Stop
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Or Pick From Existing Registered Stops */}
                {stopsList.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-400">Or add existing:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddExistingStop(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                    >
                      <option value="">Choose registered stop...</option>
                      {stopsList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.zone || 'Central'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Ordered Stops List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>ORDERED STOPS IN ROUTE ({selectedStops.length})</span>
                  <button
                    type="button"
                    onClick={handleSnapRoad}
                    disabled={snappingRoad || selectedStops.length < 2}
                    className="flex items-center gap-1.5 px-3 py-1 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  >
                    {snappingRoad ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Snap Road Path (OSRM)</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedStops.map((stop, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 font-bold text-[10px] text-emerald-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-white truncate">{stop.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">
                            ({Number(stop.latitude).toFixed(4)}, {Number(stop.longitude).toFixed(4)})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveStop(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-20"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStop(idx, 1)}
                          disabled={idx === selectedStops.length - 1}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-20"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStop(idx)}
                          className="p-1 hover:bg-rose-900/30 rounded text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-900/30"
                >
                  {editingRoute ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
