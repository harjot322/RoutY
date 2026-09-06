/**
 * Automated API & In-Memory Controller Verification Tests
 */
const assert = require('assert');
const { seedMemoryStore } = require('../utils/memoryStore');
const { setUseMongo } = require('../models/dbAdapter');
const {
  getConfig,
  getRoutes,
  getStops,
  getBuses,
  getNearestStops
} = require('../controllers/publicController');
const { reportTelemetry } = require('../controllers/telemetryController');
const { login } = require('../controllers/authController');
const { createRoute, createStop, createBus } = require('../controllers/adminController');

// Mock Express req/res
function mockReqRes(body = {}, query = {}, params = {}) {
  const req = {
    body,
    query,
    params,
    app: {
      get: (k) => null // Mock socket io
    }
  };

  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };

  return { req, res };
}

async function runApiTests() {
  console.log('\n--- Running API Controller & Telemetry Ingestion Tests ---');

  // Activate in-memory store
  setUseMongo(false);
  await seedMemoryStore();

  // Test 1: Public Config
  {
    const { req, res } = mockReqRes();
    await getConfig(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.appName, 'RoutY');
    console.log(`✓ Test 1 Passed: Public config returns appName='${res.data.appName}', city='${res.data.city}'`);
  }

  // Test 2: Public Routes (Seeded)
  {
    const { req, res } = mockReqRes();
    await getRoutes(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.data) && res.data.length >= 3, 'Should return at least 3 seeded routes');
    console.log(`✓ Test 2 Passed: Fetched ${res.data.length} seeded routes (${res.data.map(r => r.route_number).join(', ')})`);
  }

  // Test 3: Public Stops
  {
    const { req, res } = mockReqRes();
    await getStops(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.data) && res.data.length >= 10, 'Should return at least 10 stops');
    console.log(`✓ Test 3 Passed: Fetched ${res.data.length} transit stops`);
  }

  // Test 4: Nearest Stops Calculation
  {
    // Query near Bhopal Junction (23.2687, 77.4116)
    const { req, res } = mockReqRes({}, { lat: '23.2687', lng: '77.4116' });
    await getNearestStops(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.data) && res.data.length > 0);
    assert(res.data[0].distance_meters < 50, 'Closest stop to Bhopal Junction should be near 0m');
    console.log(`✓ Test 4 Passed: Nearest stop identified as '${res.data[0].name}' (${res.data[0].distance_meters}m away)`);
  }

  // Test 5: Admin Login
  {
    const { req, res } = mockReqRes({ username: 'admin', password: 'RoutYAdmin2026!' });
    await login(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.token, 'Should return JWT token');
    console.log(`✓ Test 5 Passed: Admin login successful, generated JWT token: ${res.data.token.substring(0, 20)}...`);
  }

  // Test 6: Telemetry Ingestion & Live ETA Calculation
  {
    const telemetryPayload = {
      bus_number: 'MP04-HE-1001',
      latitude: 23.2650,
      longitude: 77.4130,
      bearing: 145.0,
      speed_kmh: 32.5,
      timestamp: new Date().toISOString()
    };
    const { req, res } = mockReqRes(telemetryPayload);
    await reportTelemetry(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert(res.data.next_stop, 'Should identify upcoming stop');
    console.log(`✓ Test 6 Passed: Telemetry ingested for ${res.data.bus_number}, next stop: '${res.data.next_stop}', ETA: ${res.data.eta_seconds}s`);
  }

  // Test 7: Admin CRUD - Create Stop
  {
    const stopPayload = {
      name: 'Test New Stop',
      latitude: 23.2400,
      longitude: 77.4200,
      landmark: 'Test Square',
      zone: 'Central'
    };
    const { req, res } = mockReqRes(stopPayload);
    await createStop(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.name, 'Test New Stop');
    console.log(`✓ Test 7 Passed: Admin successfully created transit stop '${res.data.name}'`);
  }

  console.log('\nAll API & Telemetry tests passed successfully! 🎉');
}

module.exports = { runApiTests };

if (require.main === module) {
  runApiTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
