/**
 * RoutY System Constants
 * Configurable defaults for Indian Tier-2 Civic Public Transit
 */
module.exports = {
  // Speed and ETA defaults
  DEFAULT_BUS_SPEED_KMH: 28.0, // Average urban transit bus speed in Tier-2 Indian cities
  DEFAULT_BUS_SPEED_MPS: 28.0 / 3.6, // ~7.78 m/s
  MIN_SPEED_MPS: 1.5, // Below 5.4 km/h consider bus slowly maneuvering or at stop
  ASSUMED_STOP_DWELL_SEC: 20, // 20 seconds dwell time per transit stop
  ETA_SMOOTHING_ALPHA: 0.35, // Exponential smoothing weight for new ETA readings
  STALE_TELEMETRY_THRESHOLD_SEC: 30, // Telemetry older than 30s is marked stale
  BUS_ARRIVED_RADIUS_METERS: 45, // Bus within 45m of stop counts as arrived
  
  // Default target city context
  DEFAULT_CITY: 'Bhopal',
  DEFAULT_STATE: 'Madhya Pradesh',
  DEFAULT_MAP_CENTER: [23.259933, 77.412615], // Bhopal city center
  DEFAULT_MAP_ZOOM: 13,

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'routy_civic_jwt_secret_2026_super_secure',
  JWT_EXPIRES_IN: '7d',

  // Free OSRM Routing Engine URL
  OSRM_BASE_URL: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',

  // Default Admin Credentials (for local development/evaluation)
  DEFAULT_ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  DEFAULT_ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'RoutYAdmin2026!'
};
