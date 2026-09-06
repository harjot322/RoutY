/**
 * Free Zero-Cost Geocoding, Reverse Geocoding, and Road Snapping Service
 * Powered by OpenStreetMap Nominatim & OSRM Routing Engine
 * Requires ZERO API keys, ZERO cloud billing.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';

/**
 * Autocomplete search for places/landmarks by text name
 * 
 * @param {string} query - e.g. "Central Station", "MP Nagar", "City Hospital"
 * @param {string} cityHint - City context to bias results (e.g. "Bhopal")
 * @returns {Promise<Array>} Array of found places with coordinates
 */
export async function searchPlaceByName(query, cityHint = 'Bhopal') {
  if (!query || query.trim().length < 2) return [];

  try {
    const q = query.toLowerCase().includes(cityHint.toLowerCase()) 
      ? query.trim() 
      : `${query.trim()}, ${cityHint}, India`;

    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(q)}&limit=6&countrycodes=in&addressdetails=1`;
    
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        // OSM Nominatim Usage Policy requires a descriptive User-Agent
        'User-Agent': 'RoutY-Civic-Transit-Platform/1.0'
      }
    });

    if (!resp.ok) {
      console.warn(`[Nominatim] Search failed: ${resp.statusText}`);
      return [];
    }

    const data = await resp.json();
    return data.map(item => {
      const addr = item.address || {};
      const primaryName = addr.amenity || addr.building || addr.road || addr.suburb || item.name || item.display_name.split(',')[0];
      
      return {
        id: item.place_id,
        name: primaryName,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        road: addr.road || '',
        suburb: addr.suburb || addr.neighbourhood || '',
        city: addr.city || addr.town || addr.state_district || cityHint
      };
    });
  } catch (err) {
    console.error('[Nominatim] Error during place search:', err);
    return [];
  }
}

/**
 * Reverse geocode a latitude/longitude point to obtain street/landmark name
 * 
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<Object>} Formatted location name and address details
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RoutY-Civic-Transit-Platform/1.0'
      }
    });

    if (!resp.ok) return { name: `Stop (${lat.toFixed(4)}, ${lng.toFixed(4)})`, displayName: '' };

    const data = await resp.json();
    const addr = data.address || {};
    const primaryName = addr.amenity || addr.building || addr.road || addr.suburb || data.name || `Stop at ${addr.road || 'Road'}`;

    return {
      name: primaryName,
      displayName: data.display_name,
      road: addr.road || '',
      suburb: addr.suburb || addr.neighbourhood || '',
      city: addr.city || addr.town || ''
    };
  } catch (err) {
    console.error('[Nominatim] Reverse geocode error:', err);
    return { name: `Stop (${lat.toFixed(4)}, ${lng.toFixed(4)})`, displayName: '' };
  }
}

/**
 * Free road network snapping via Open Source Routing Machine (OSRM)
 * Converts ordered stops into smooth turn-by-turn road geometry.
 * 
 * @param {Array<{latitude: number, longitude: number}>} stops 
 * @returns {Promise<{coordinates: Array<[number, number]>, distanceM: number, durationSec: number}>}
 */
export async function fetchRoadRoute(stops) {
  if (!stops || stops.length < 2) return null;

  try {
    const coordsStr = stops.map(s => `${s.longitude},${s.latitude}`).join(';');
    const url = `${OSRM_BASE}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

    const resp = await fetch(url);
    if (!resp.ok) return null;

    const data = await resp.json();
    if (data.code !== 'Ok' || !data.routes || !data.routes.length) return null;

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates, // [[lng, lat], ...]
      distanceM: Math.round(route.distance),
      durationSec: Math.round(route.duration)
    };
  } catch (err) {
    console.warn('[OSRM] Could not snap to road network, falling back to direct paths:', err.message);
    return null;
  }
}

/**
 * Free HTML5 Browser Geolocation with Promise wrapper
 */
export function getCurrentBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}
