const assert = require('assert');
const { computeRouteEtas } = require('../utils/etaEngine');
const { haversineDistance, calculateBearing, formatEta } = require('../utils/geoUtils');

function runEtaTests() {
  console.log('\n--- Running ETA Engine & Geo Math Tests ---');

  // Test 1: Haversine distance
  // Distance between Bhopal Junction (23.2687, 77.4116) and Bharat Talkies (23.2625, 77.4145)
  const distM = haversineDistance(23.2687, 77.4116, 23.2625, 77.4145);
  console.log(`Test 1: Haversine distance = ${distM.toFixed(1)}m`);
  assert(distM > 600 && distM < 900, `Expected distance between 600m and 900m, got ${distM}`);
  console.log('✓ Test 1 Passed: Haversine distance is accurate.');

  // Test 2: Bearing calculation
  // Heading south-east from (23.2687, 77.4116) to (23.2625, 77.4145) should be between 90 and 180 deg
  const brng = calculateBearing(23.2687, 77.4116, 23.2625, 77.4145);
  console.log(`Test 2: Bearing = ${brng.toFixed(1)}°`);
  assert(brng > 90 && brng < 180, `Expected bearing in SE quadrant, got ${brng}`);
  console.log('✓ Test 2 Passed: Bearing calculation is correct.');

  // Test 3: formatEta
  assert.strictEqual(formatEta(20), 'Arriving now');
  assert.strictEqual(formatEta(45), '< 1 min');
  assert.strictEqual(formatEta(120), '2 min');
  assert.strictEqual(formatEta(3600), '1h 0m');
  console.log('✓ Test 3 Passed: formatEta formats seconds correctly.');

  // Test 4: computeRouteEtas with mock route
  const mockRoute = {
    route_number: 'R-TEST',
    name: 'Test Route',
    stops: [
      { sequence: 0, name: 'Stop A', latitude: 23.2687, longitude: 77.4116 },
      { sequence: 1, name: 'Stop B', latitude: 23.2625, longitude: 77.4145 },
      { sequence: 2, name: 'Stop C', latitude: 23.2562, longitude: 77.4168 }
    ],
    geojson: {
      type: 'LineString',
      coordinates: [
        [77.4116, 23.2687],
        [77.4145, 23.2625],
        [77.4168, 23.2562]
      ]
    }
  };

  // Bus is between Stop A and Stop B, travelling at 30 km/h
  const telemetry = {
    latitude: 23.2650,
    longitude: 77.4130,
    speed_kmh: 30
  };

  const result = computeRouteEtas(mockRoute, telemetry);
  assert(result.etas.length === 3, 'Should produce 3 stop ETAs');
  assert(result.nextStop !== null, 'Should identify next upcoming stop');
  console.log(`Test 4: Next stop identified: ${result.nextStop.name}, ETA to next: ${result.etaToNextSec}s`);
  assert(result.etaToNextSec > 0, 'ETA to upcoming stop should be positive');
  console.log('✓ Test 4 Passed: computeRouteEtas generated valid downstream ETAs.');

  // Test 5: Stationary / slow bus fallback
  const stationaryTelemetry = {
    latitude: 23.2650,
    longitude: 77.4130,
    speed_kmh: 0 // Bus stopped at signal
  };
  const fallbackResult = computeRouteEtas(mockRoute, stationaryTelemetry);
  assert(fallbackResult.etaToNextSec > 0, 'Stationary bus should use fallback nominal speed, not divide by zero');
  console.log(`Test 5: Stationary bus fallback ETA = ${fallbackResult.etaToNextSec}s`);
  console.log('✓ Test 5 Passed: Stationary fallback works cleanly without divide-by-zero.');

  console.log('\nAll ETA Engine tests passed successfully! 🎉');
}

module.exports = { runEtaTests };

if (require.main === module) {
  runEtaTests();
}
