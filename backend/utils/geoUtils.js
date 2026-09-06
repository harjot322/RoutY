/**
 * Geo math & projection utilities for RoutY
 */
const turf = require('@turf/turf');

const EARTH_RADIUS_METERS = 6371000.0;

/**
 * Haversine formula for distance between two points in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Initial bearing from (lat1, lon1) to (lat2, lon2) in degrees [0, 360)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const toDeg = (x) => (x * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));

  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * Format remaining seconds into clean, human-readable ETA string
 */
function formatEta(seconds) {
  if (seconds <= 30) return 'Arriving now';
  if (seconds < 60) return '< 1 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return `${hrs}h ${remMin}m`;
}

/**
 * Project a current bus location onto a route's GeoJSON LineString coordinates
 * and calculate remaining distance along the line to a target stop point.
 * 
 * @param {Array<[number, number]>} lineCoords - [[lng, lat], ...]
 * @param {[number, number]} currentPos - [lat, lng]
 * @param {[number, number]} stopPos - [lat, lng]
 * @returns {number} Distance in meters
 */
function remainingDistanceAlongLine(lineCoords, currentPos, stopPos) {
  if (!lineCoords || lineCoords.length < 2) {
    // Fallback directly to straight-line distance if no geometry
    return haversineDistance(currentPos[0], currentPos[1], stopPos[0], stopPos[1]);
  }

  try {
    const line = turf.lineString(lineCoords);
    const busPt = turf.point([currentPos[1], currentPos[0]]); // [lng, lat]
    const stopPt = turf.point([stopPos[1], stopPos[0]]); // [lng, lat]

    const busSnapped = turf.nearestPointOnLine(line, busPt);
    const stopSnapped = turf.nearestPointOnLine(line, stopPt);

    const busDistKm = busSnapped.properties.location || 0;
    const stopDistKm = stopSnapped.properties.location || 0;

    const remainingKm = stopDistKm - busDistKm;
    if (remainingKm >= 0) {
      return remainingKm * 1000.0;
    } else {
      // If stop has already passed or bus looped, return straight line distance
      return haversineDistance(currentPos[0], currentPos[1], stopPos[0], stopPos[1]);
    }
  } catch (err) {
    return haversineDistance(currentPos[0], currentPos[1], stopPos[0], stopPos[1]);
  }
}

module.exports = {
  EARTH_RADIUS_METERS,
  haversineDistance,
  calculateBearing,
  formatEta,
  remainingDistanceAlongLine
};
