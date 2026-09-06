import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit3, Search, Sparkles, X } from 'lucide-react';
import api from '../services/api';
import { searchPlaceByName } from '../services/geocodingService';

export default function ManageStops() {
  const [stops, setStops] = useState([]);
  const [editingStop, setEditingStop] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [landmark, setLandmark] = useState('');
  const [zone, setZone] = useState('Central');
  const [address, setAddress] = useState('');
  const [autoSearch, setAutoSearch] = useState('');
  const [autoResults, setAutoResults] = useState([]);

  const fetchStops = async () => {
    try {
      const res = await api.get('/public/stops');
      setStops(res.data);
    } catch (err) {
      console.error('Failed to fetch stops:', err);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  const openNewStopModal = () => {
    setEditingStop(null);
    setName('');
    setNameHi('');
    setLatitude('');
    setLongitude('');
    setLandmark('');
    setZone('Central');
    setAddress('');
    setAutoSearch('');
    setAutoResults([]);
    setIsModalOpen(true);
  };

  const openEditStopModal = (stop) => {
    setEditingStop(stop);
    setName(stop.name);
    setNameHi(stop.name_hi || '');
    setLatitude(stop.latitude);
    setLongitude(stop.longitude);
    setLandmark(stop.landmark || '');
    setZone(stop.zone || 'Central');
    setAddress(stop.address || '');
    setAutoSearch('');
    setAutoResults([]);
    setIsModalOpen(true);
  };

  // Automated place detection
  useEffect(() => {
    if (!autoSearch || autoSearch.trim().length < 2) {
      setAutoResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const places = await searchPlaceByName(autoSearch);
      setAutoResults(places);
    }, 300);
    return () => clearTimeout(timer);
  }, [autoSearch]);

  const selectAutoPlace = (p) => {
    setName(p.name);
    setLatitude(p.lat);
    setLongitude(p.lng);
    setLandmark(p.road || p.suburb || '');
    setAddress(p.displayName);
    setAutoSearch('');
    setAutoResults([]);
  };

  const handleSaveStop = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      name_hi: nameHi,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      landmark,
      zone,
      address
    };

    try {
      if (editingStop) {
        await api.put(`/admin/stops/${editingStop._id}`, payload);
      } else {
        await api.post('/admin/stops', payload);
      }
      setIsModalOpen(false);
      fetchStops();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save stop');
    }
  };

  const handleDeleteStop = async (id) => {
    if (!window.confirm('Are you sure you want to delete this stop?')) return;
    try {
      await api.delete(`/admin/stops/${id}`);
      fetchStops();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete stop');
    }
  };

  const filteredStops = stops.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.landmark && s.landmark.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <span>Transit Stops Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure bus stop locations with free automated geographic place name detection.
          </p>
        </div>

        <button
          onClick={openNewStopModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stop</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter stops by name or landmark..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Stops Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Stop Name</th>
              <th className="py-3.5 px-4">Hindi Name</th>
              <th className="py-3.5 px-4">Zone</th>
              <th className="py-3.5 px-4">Coordinates</th>
              <th className="py-3.5 px-4">Landmark</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredStops.map((stop) => (
              <tr key={stop._id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{stop.name}</span>
                </td>
                <td className="py-3.5 px-4 text-slate-400">{stop.name_hi || '--'}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-slate-300">
                    {stop.zone}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 text-slate-400">{stop.landmark || '--'}</td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditStopModal(stop)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStop(stop._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- Create/Edit Modal ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold font-display text-white">
                {editingStop ? 'Edit Transit Stop' : 'Add New Transit Stop'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Automated Place Detection Input */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <label className="block text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Detect Location by Landmark Name (Free Nominatim)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={autoSearch}
                  onChange={(e) => setAutoSearch(e.target.value)}
                  placeholder="Type any place name (e.g. AIIMS, MP Nagar, Railway Station)..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />

                {autoResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 z-50 max-h-44 overflow-y-auto">
                    {autoResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selectAutoPlace(p)}
                        className="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs text-white"
                      >
                        <div className="truncate mr-2">
                          <span className="font-semibold text-emerald-300">{p.name}</span>
                          <span className="text-slate-400 text-[10px] block truncate">{p.displayName}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 shrink-0 font-semibold">
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveStop} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stop Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hindi / Local Name</label>
                  <input
                    type="text"
                    value={nameHi}
                    onChange={(e) => setNameHi(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Landmark</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Overbridge"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Zone / Sector</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="e.g. Central, East, Old City"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30"
                >
                  {editingStop ? 'Update Stop' : 'Save Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
