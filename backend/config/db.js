/**
 * Database connection coordinator for RoutY
 * Tries local MongoDB first; if unavailable, falls back to in-memory store seamlessly.
 */
const mongoose = require('mongoose');
const { setUseMongo } = require('../models/dbAdapter');
const { seedMemoryStore } = require('../utils/memoryStore');
const Admin = require('../models/Admin');
const Stop = require('../models/Stop');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Schedule = require('../models/Schedule');
const {
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD
} = require('./constants');
const {
  SEED_STOPS,
  SEED_ROUTES_CONFIG,
  SEED_BUSES_CONFIG,
  generateRoadPath
} = require('./seedData');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/routy';
  
  try {
    // Attempt standard connection with 1500ms timeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 1500
    });
    console.log(`[Database] Connected successfully to local MongoDB at: ${mongoUri}`);
    setUseMongo(true);
    await seedMongoInitialData();
  } catch (err) {
    console.log(`[Database] Notice: Local MongoDB not detected (${err.message}).`);
    console.log(`[Database] Activating integrated In-Memory Database Fallback for zero-config evaluation.`);
    setUseMongo(false);
    await seedMemoryStore();
  }
}

async function seedMongoInitialData() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const admin = new Admin({
        username: DEFAULT_ADMIN_USERNAME,
        password: DEFAULT_ADMIN_PASSWORD,
        name: 'Municipal Transit Supervisor',
        role: 'admin'
      });
      await admin.save();
      console.log(`[Seeder] Seeded default admin account: ${DEFAULT_ADMIN_USERNAME}`);
    }

    const stopCount = await Stop.countDocuments();
    if (stopCount === 0) {
      console.log('[Seeder] Seeding MongoDB with transit stops, routes, buses, and schedules...');
      const createdStops = await Stop.insertMany(SEED_STOPS);

      const createdRoutes = [];
      for (const rConfig of SEED_ROUTES_CONFIG) {
        const routeStops = rConfig.stop_indices.map((idx, seq) => {
          const s = createdStops[idx];
          return {
            stop_id: s._id,
            name: s.name,
            name_hi: s.name_hi,
            sequence: seq,
            latitude: s.latitude,
            longitude: s.longitude,
            distance_along_m: 0
          };
        });

        const roadCoords = generateRoadPath(routeStops);
        const { haversineDistance } = require('../utils/geoUtils');
        
        let totalDist = 0;
        for (let i = 1; i < roadCoords.length; i++) {
          totalDist += haversineDistance(
            roadCoords[i - 1][1], roadCoords[i - 1][0],
            roadCoords[i][1], roadCoords[i][0]
          );
        }

        const newRoute = await Route.create({
          route_number: rConfig.route_number,
          name: rConfig.name,
          name_hi: rConfig.name_hi,
          description: rConfig.description,
          color: rConfig.color,
          stops: routeStops,
          geojson: {
            type: 'LineString',
            coordinates: roadCoords
          },
          total_distance_m: Math.round(totalDist),
          estimated_duration_min: Math.round(totalDist / (28000 / 60)),
          is_active: true
        });
        createdRoutes.push(newRoute);
      }

      const createdBuses = [];
      for (const bConfig of SEED_BUSES_CONFIG) {
        const assignedRoute = createdRoutes[bConfig.route_idx];
        const firstStop = assignedRoute.stops[0];

        const newBus = await Bus.create({
          bus_number: bConfig.bus_number,
          registration_number: bConfig.bus_number,
          model: bConfig.model,
          capacity: bConfig.capacity,
          route_id: assignedRoute._id,
          status: bConfig.status,
          last_telemetry: {
            latitude: firstStop.latitude,
            longitude: firstStop.longitude,
            bearing: 90,
            speed_kmh: 0,
            next_stop_name: assignedRoute.stops[1]?.name || firstStop.name,
            next_stop_sequence: 1,
            distance_to_next_stop_m: 500,
            eta_to_next_stop_sec: 120,
            timestamp: new Date(),
            is_stale: false
          },
          etas: []
        });
        createdBuses.push(newBus);
      }

      for (let i = 0; i < createdRoutes.length; i++) {
        const route = createdRoutes[i];
        const bus = createdBuses[i * 2];
        await Schedule.create({
          route_id: route._id,
          bus_id: bus._id,
          departure_time: '06:00',
          arrival_time: '22:30',
          frequency_minutes: 15,
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          is_active: true
        });
      }
      console.log('[Seeder] MongoDB seeded successfully.');
    }
  } catch (err) {
    console.error('[Seeder] Seeding error:', err);
  }
}

module.exports = {
  connectDB
};
