/**
 * In-Memory Database Fallback for RoutY
 * Ensures zero-config, out-of-the-box evaluation without requiring MongoDB installation.
 * Automatically mirrors Mongoose model query interfaces.
 */
const bcrypt = require('bcryptjs');
const { SEED_STOPS, SEED_ROUTES_CONFIG, SEED_BUSES_CONFIG, generateRoadPath } = require('../config/seedData');
const { haversineDistance } = require('./geoUtils');
const { DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } = require('../config/constants');

class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.docs = [];
  }

  _clone(doc) {
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc));
  }

  _matches(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (const [key, val] of Object.entries(query)) {
      if (key === '$or' && Array.isArray(val)) {
        const matchesAny = val.some(subQuery => this._matches(doc, subQuery));
        if (!matchesAny) return false;
        continue;
      }
      if (doc[key] !== val) return false;
    }
    return true;
  }

  async countDocuments(query = {}) {
    return this.docs.filter(d => this._matches(d, query)).length;
  }

  find(query = {}) {
    let results = this.docs.filter(d => this._matches(d, query)).map(d => this._wrapDoc(d));
    const queryObj = {
      _results: results,
      sort(sortCriteria) {
        // Simple sort handler
        const key = Object.keys(sortCriteria)[0];
        const dir = sortCriteria[key];
        results.sort((a, b) => {
          if (a[key] < b[key]) return dir === 1 ? -1 : 1;
          if (a[key] > b[key]) return dir === 1 ? 1 : -1;
          return 0;
        });
        return this;
      },
      select(fields) {
        return this;
      },
      populate(field, select) {
        if (field === 'route_id') {
          results.forEach(item => {
            if (item.route_id) {
              const r = memoryStore.routes.docs.find(x => x._id === item.route_id || x._id === item.route_id?._id);
              if (r) item.route_id = JSON.parse(JSON.stringify(r));
            }
          });
        }
        if (field === 'bus_id') {
          results.forEach(item => {
            if (item.bus_id) {
              const b = memoryStore.buses.docs.find(x => x._id === item.bus_id || x._id === item.bus_id?._id);
              if (b) item.bus_id = JSON.parse(JSON.stringify(b));
            }
          });
        }
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(results).then(resolve, reject);
      }
    };
    return queryObj;
  }

  async findOne(query = {}) {
    const doc = this.docs.find(d => this._matches(d, query));
    return doc ? this._wrapDoc(doc) : null;
  }

  async findById(id) {
    const doc = this.docs.find(d => String(d._id) === String(id));
    return doc ? this._wrapDoc(doc) : null;
  }

  async create(data) {
    const doc = {
      _id: 'mem_' + Math.random().toString(36).substr(2, 9),
      is_active: data.is_active !== undefined ? data.is_active : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    this.docs.push(doc);
    return this._wrapDoc(doc);
  }

  async insertMany(items) {
    const created = [];
    for (const item of items) {
      const doc = await this.create(item);
      created.push(doc);
    }
    return created;
  }

  async findByIdAndUpdate(id, data, options = {}) {
    const idx = this.docs.findIndex(d => String(d._id) === String(id));
    if (idx === -1) return null;
    this.docs[idx] = {
      ...this.docs[idx],
      ...data,
      updatedAt: new Date().toISOString()
    };
    return this._wrapDoc(this.docs[idx]);
  }

  async findByIdAndDelete(id) {
    const idx = this.docs.findIndex(d => String(d._id) === String(id));
    if (idx === -1) return null;
    const deleted = this.docs.splice(idx, 1)[0];
    return this._wrapDoc(deleted);
  }

  async updateMany(query, update) {
    let count = 0;
    for (let i = 0; i < this.docs.length; i++) {
      if (this._matches(this.docs[i], query)) {
        if (update.$set) {
          this.docs[i] = { ...this.docs[i], ...update.$set };
        }
        count++;
      }
    }
    return { modifiedCount: count };
  }

  async deleteMany(query) {
    const before = this.docs.length;
    this.docs = this.docs.filter(d => !this._matches(d, query));
    return { deletedCount: before - this.docs.length };
  }

  _wrapDoc(rawDoc) {
    const wrapped = JSON.parse(JSON.stringify(rawDoc));
    wrapped.toObject = () => JSON.parse(JSON.stringify(wrapped));
    wrapped.save = async () => {
      const idx = this.docs.findIndex(d => String(d._id) === String(wrapped._id));
      if (idx !== -1) {
        this.docs[idx] = { ...wrapped, updatedAt: new Date().toISOString() };
      }
      return wrapped;
    };
    if (this.name === 'Admin') {
      wrapped.comparePassword = async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      };
    }
    return wrapped;
  }
}

const memoryStore = {
  stops: new MemoryCollection('Stop'),
  routes: new MemoryCollection('Route'),
  buses: new MemoryCollection('Bus'),
  schedules: new MemoryCollection('Schedule'),
  admins: new MemoryCollection('Admin'),
  isInitialized: false
};

async function seedMemoryStore() {
  if (memoryStore.isInitialized) return;

  // 1. Seed Admin
  const hashedPw = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await memoryStore.admins.create({
    username: DEFAULT_ADMIN_USERNAME,
    password: hashedPw,
    name: 'Municipal Transit Supervisor',
    role: 'admin'
  });

  // 2. Seed Stops
  const createdStops = await memoryStore.stops.insertMany(SEED_STOPS);

  // 3. Seed Routes
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
    let totalDist = 0;
    for (let i = 1; i < roadCoords.length; i++) {
      totalDist += haversineDistance(
        roadCoords[i - 1][1], roadCoords[i - 1][0],
        roadCoords[i][1], roadCoords[i][0]
      );
    }

    const newRoute = await memoryStore.routes.create({
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

  // 4. Seed Buses
  const createdBuses = [];
  for (const bConfig of SEED_BUSES_CONFIG) {
    const assignedRoute = createdRoutes[bConfig.route_idx];
    const firstStop = assignedRoute.stops[0];

    const newBus = await memoryStore.buses.create({
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
        timestamp: new Date().toISOString(),
        is_stale: false
      },
      etas: []
    });
    createdBuses.push(newBus);
  }

  // 5. Seed Schedules
  for (let i = 0; i < createdRoutes.length; i++) {
    const route = createdRoutes[i];
    const bus = createdBuses[i * 2];
    await memoryStore.schedules.create({
      route_id: route._id,
      bus_id: bus._id,
      departure_time: '06:00',
      arrival_time: '22:30',
      frequency_minutes: 15,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      is_active: true
    });
  }

  memoryStore.isInitialized = true;
  console.log('[MemoryStore] Successfully initialized and seeded in-memory transit database.');
}

module.exports = {
  memoryStore,
  seedMemoryStore
};
