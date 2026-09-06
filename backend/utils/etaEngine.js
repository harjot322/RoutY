/**
 * RoutY Real-Time ETA Calculation Engine
 * Computes distance along GeoJSON paths, applies traffic & dwell time models,
 * and maintains smooth arrival estimates.
 */
const {
  DEFAULT_BUS_SPEED_MPS,
  MIN_SPEED_MPS,
  ASSUMED_STOP_DWELL_SEC,
  BUS_ARRIVED_RADIUS_METERS
} = require('../config/constants');
const {
  haversineDistance,
  formatEta,
  remainingDistanceAlongLine
} = require('./geoUtils');

/**
 * Compute real-time stop-level ETAs for a bus on a route
 * 
 * @param {Object} route - Mongoose route document with ordered stops and geojson
 * @param {Object} telemetry - { latitude, longitude, speed_kmh }
 * @returns {Object} { etas: Array, nextStop: Object, distanceToNextM: number, etaToNextSec: number }
 */
function computeRouteEtas(route, telemetry) {
  if (!route || !Array.isArray(route.stops) || route.stops.length === 0) {
    return { etas: [], nextStop: null, distanceToNextM: 0, etaToNextSec: 0 };
  }

  const busLat = Number(telemetry.latitude);
  const busLng = Number(telemetry.longitude);
  const rawSpeedKmh = Number(telemetry.speed_kmh) || 0;
  const rawSpeedMps = rawSpeedKmh / 3.6;

  // Determine effective speed with fallback for stationary or slow buses
  let effectiveSpeedMps;
  if (rawSpeedMps >= MIN_SPEED_MPS) {
    // Weighted blend: 65% real-time speed + 35% typical city transit speed
    effectiveSpeedMps = (0.65 * rawSpeedMps) + (0.35 * DEFAULT_BUS_SPEED_MPS);
  } else {
    // Bus stopped at traffic light or boarding: fall back to default transit average
    effectiveSpeedMps = DEFAULT_BUS_SPEED_MPS;
  }

  const lineCoords = route.geojson?.coordinates || [];
  const sortedStops = [...route.stops].sort((a, b) => a.sequence - b.sequence);

  // 1. Identify which stop is currently the closest ahead
  // Compute distance from bus to each stop
  let upcomingStopIndex = -1;
  let minAheadDist = Infinity;

  // Measure straight line distances to identify progression
  const stopDistances = sortedStops.map((stop) => {
    const distM = haversineDistance(busLat, busLng, stop.latitude, stop.longitude);
    return { stop, distM };
  });

  // Find candidate upcoming stops along route sequence
  // If line coordinates are available, check distance along line
  for (let i = 0; i < sortedStops.length; i++) {
    const stop = sortedStops[i];
    const distM = remainingDistanceAlongLine(lineCoords, [busLat, busLng], [stop.latitude, stop.longitude]);
    
    // If bus is more than BUS_ARRIVED_RADIUS_METERS away or it's the next stop
    if (distM > BUS_ARRIVED_RADIUS_METERS && distM < minAheadDist) {
      minAheadDist = distM;
      upcomingStopIndex = i;
    }
  }

  if (upcomingStopIndex === -1) {
    // If bus is at or near the last stop, point to the last stop
    upcomingStopIndex = sortedStops.length - 1;
  }

  const etas = [];
  let nextStop = sortedStops[upcomingStopIndex] || null;
  let distanceToNextM = 0;
  let etaToNextSec = 0;

  for (let i = 0; i < sortedStops.length; i++) {
    const stop = sortedStops[i];
    const stopLat = stop.latitude;
    const stopLng = stop.longitude;

    if (i < upcomingStopIndex) {
      // Stop has already been passed in this run
      etas.push({
        stop_name: stop.name,
        stop_sequence: stop.sequence,
        latitude: stopLat,
        longitude: stopLng,
        distance_remaining_m: 0,
        eta_seconds: 0,
        eta_formatted: 'Departed'
      });
    } else {
      // Downstream upcoming stop
      const remDistanceM = remainingDistanceAlongLine(
        lineCoords,
        [busLat, busLng],
        [stopLat, stopLng]
      );

      // Add dwell time for intermediate stops
      const intermediateStopsCount = Math.max(0, i - upcomingStopIndex);
      const totalDwellSec = intermediateStopsCount * ASSUMED_STOP_DWELL_SEC;

      const travelSec = Math.round(remDistanceM / effectiveSpeedMps);
      const etaSec = travelSec + totalDwellSec;

      if (i === upcomingStopIndex) {
        distanceToNextM = Math.round(remDistanceM);
        etaToNextSec = etaSec;
      }

      etas.push({
        stop_name: stop.name,
        stop_sequence: stop.sequence,
        latitude: stopLat,
        longitude: stopLng,
        distance_remaining_m: Math.round(remDistanceM),
        eta_seconds: etaSec,
        eta_formatted: formatEta(etaSec)
      });
    }
  }

  return {
    etas,
    nextStop,
    distanceToNextM,
    etaToNextSec
  };
}

module.exports = {
  computeRouteEtas
};
