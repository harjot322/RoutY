import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, X, Loader2 } from 'lucide-react';
import { searchPlaceByName, getCurrentBrowserLocation } from '../services/geocodingService';

export default function PlaceSearchModal({
  isOpen,
  onClose,
  onSelectLocation,
  city = 'Bhopal'
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      const places = await searchPlaceByName(query, city);
      setResults(places);
      setLoading(false);
    }, 350);

    return () => clearTimeout(handler);
  }, [query, city]);

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentBrowserLocation();
      onSelectLocation({
        name: 'My Current Location',
        displayName: 'GPS Detected Position',
        lat: pos.lat,
        lng: pos.lng
      });
      onClose();
    } catch (err) {
      alert('Unable to retrieve location. Please grant location permissions in your browser.');
    } finally {
      setLocating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search place or landmark in ${city}... (e.g. Railway Station)`}
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />}
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
          >
            Esc
          </button>
        </div>

        {/* Action Shortcuts */}
        <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <button
            onClick={handleUseMyLocation}
            disabled={locating}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium py-1 transition-colors"
          >
            {locating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>Locate Me (Current GPS)</span>
          </button>
          <span className="text-slate-500 text-[11px]">Free OpenStreetMap Nominatim</span>
        </div>

        {/* Search Results Dropdown */}
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50">
          {results.length > 0 ? (
            results.map((place) => (
              <div
                key={place.id}
                onClick={() => {
                  onSelectLocation(place);
                  onClose();
                }}
                className="p-3.5 hover:bg-slate-800/80 cursor-pointer flex items-start gap-3 transition-colors group"
              >
                <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-emerald-600/20 text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white group-hover:text-emerald-300 truncate">
                    {place.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {place.displayName}
                  </div>
                </div>
              </div>
            ))
          ) : query.trim().length >= 2 && !loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No matching locations found in {city}. Try a broader landmark name.
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-500">
              <span className="font-semibold text-slate-400">Popular landmarks:</span> Railway Station, MP Nagar Zone 1, AIIMS, Karond Mandi, New Market
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
