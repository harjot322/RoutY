const Route = require('../models/Route');
const Stop = require('../models/Stop');
const Bus = require('../models/Bus');
const Schedule = require('../models/Schedule');
const { haversineDistance } = require('../utils/geoUtils');
const { generateRoadPath } = require('../config/seedData');

async function getDashboardStats(req, res) {
  try {
    const [totalRoutes, totalStops, totalBuses, activeBuses, totalSchedules] = await Promise.all([
      Route.countDocuments({ is_active: true }),
      Stop.countDocuments({ is_active: true }),
      Bus.countDocuments(),
      Bus.countDocuments({ status: 'active' }),
      Schedule.countDocuments({ is_active: true })
    ]);

    // Calculate average fleet speed from recent telemetry
    const buses = await Bus.find({ status: 'active' }).select('last_telemetry');
    let speedSum = 0;
    let reportingCount = 0;
    const now = Date.now();
    buses.forEach(b => {
      if (b.last_telemetry?.timestamp && (now - new Date(b.last_telemetry.timestamp).getTime() < 60000)) {
        speedSum += (b.last_telemetry.speed_kmh || 0);
        reportingCount++;
      }
    });
    const avgSpeed = reportingCount > 0 ? (speedSum / reportingCount).toFixed(1) : '24.5';

    return res.json({
      totalRoutes,
      totalStops,
      totalBuses,
      activeBuses,
      totalSchedules,
      averageSpeedKmh: Number(avgSpeed),
      systemStatus: 'Operational',
      telemetryHealth: reportingCount > 0 ? 'Live (Connected)' : 'Standby'
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving dashboard stats', error: err.message });
  }
}

// ---------------- Route Management ----------------
async function createRoute(req, res) {
  try {
    const { route_number, name, name_hi, description, color, stops, geojson } = req.body;
    if (!route_number || !name || !stops || stops.length < 2) {
      return res.status(400).json({ message: 'Route number, name, and at least 2 stops are required' });
    }

    const existing = await Route.findOne({ route_number: route_number.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: `Route number ${route_number} already exists` });
    }

    // Format stops
    const formattedStops = stops.map((s, idx) => ({
      stop_id: s.stop_id || null,
      name: s.name,
      name_hi: s.name_hi || '',
      sequence: idx,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      distance_along_m: 0
    }));

    // If geojson wasn't provided, auto-generate road path
    const coordinates = (geojson && geojson.coordinates?.length > 1)
      ? geojson.coordinates
      : generateRoadPath(formattedStops);

    let totalDist = 0;
    for (let i = 1; i < coordinates.length; i++) {
      totalDist += haversineDistance(
        coordinates[i - 1][1], coordinates[i - 1][0],
        coordinates[i][1], coordinates[i][0]
      );
    }

    const route = await Route.create({
      route_number: route_number.toUpperCase().trim(),
      name: name.trim(),
      name_hi: name_hi || '',
      description: description || '',
      color: color || '#2563eb',
      stops: formattedStops,
      geojson: {
        type: 'LineString',
        coordinates
      },
      total_distance_m: Math.round(totalDist),
      estimated_duration_min: Math.round(totalDist / (28000 / 60))
    });

    return res.status(201).json(route);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create route', error: err.message });
  }
}

async function updateRoute(req, res) {
  try {
    const { id } = req.params;
    const { route_number, name, name_hi, description, color, stops, geojson, is_active } = req.body;

    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    if (route_number) route.route_number = route_number.toUpperCase().trim();
    if (name) route.name = name.trim();
    if (name_hi !== undefined) route.name_hi = name_hi;
    if (description !== undefined) route.description = description;
    if (color) route.color = color;
    if (is_active !== undefined) route.is_active = is_active;

    if (stops && stops.length >= 2) {
      route.stops = stops.map((s, idx) => ({
        stop_id: s.stop_id || null,
        name: s.name,
        name_hi: s.name_hi || '',
        sequence: idx,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        distance_along_m: 0
      }));

      const coordinates = (geojson && geojson.coordinates?.length > 1)
        ? geojson.coordinates
        : generateRoadPath(route.stops);

      route.geojson = { type: 'LineString', coordinates };

      let totalDist = 0;
      for (let i = 1; i < coordinates.length; i++) {
        totalDist += haversineDistance(
          coordinates[i - 1][1], coordinates[i - 1][0],
          coordinates[i][1], coordinates[i][0]
        );
      }
      route.total_distance_m = Math.round(totalDist);
      route.estimated_duration_min = Math.round(totalDist / (28000 / 60));
    }

    await route.save();
    return res.json(route);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update route', error: err.message });
  }
}

async function deleteRoute(req, res) {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    // Detach buses from deleted route
    await Bus.updateMany({ route_id: route._id }, { $set: { route_id: null, status: 'idle' } });
    await Schedule.deleteMany({ route_id: route._id });
    return res.json({ message: 'Route deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete route', error: err.message });
  }
}

// ---------------- Stop Management ----------------
async function createStop(req, res) {
  try {
    const { name, name_hi, latitude, longitude, landmark, zone, address } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Stop name, latitude, and longitude are required' });
    }

    const stop = await Stop.create({
      name: name.trim(),
      name_hi: name_hi || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
      landmark: landmark || '',
      zone: zone || 'Central',
      address: address || ''
    });

    return res.status(201).json(stop);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create stop', error: err.message });
  }
}

async function updateStop(req, res) {
  try {
    const stop = await Stop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!stop) return res.status(404).json({ message: 'Stop not found' });
    return res.json(stop);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update stop', error: err.message });
  }
}

async function deleteStop(req, res) {
  try {
    const stop = await Stop.findByIdAndDelete(req.params.id);
    if (!stop) return res.status(404).json({ message: 'Stop not found' });
    return res.json({ message: 'Stop deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete stop', error: err.message });
  }
}

// ---------------- Bus Fleet Management ----------------
async function createBus(req, res) {
  try {
    const { bus_number, registration_number, model, capacity, route_id, status } = req.body;
    if (!bus_number) {
      return res.status(400).json({ message: 'Bus plate number is required' });
    }

    const existing = await Bus.findOne({ bus_number: bus_number.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: `Bus ${bus_number} already exists` });
    }

    const bus = await Bus.create({
      bus_number: bus_number.toUpperCase().trim(),
      registration_number: registration_number || bus_number,
      model: model || 'Tata Ultra Electric Citybus',
      capacity: Number(capacity) || 32,
      route_id: route_id || null,
      status: status || 'active'
    });

    return res.status(201).json(bus);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create bus', error: err.message });
  }
}

async function updateBus(req, res) {
  try {
    const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    return res.json(bus);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update bus', error: err.message });
  }
}

async function deleteBus(req, res) {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    await Schedule.deleteMany({ bus_id: bus._id });
    return res.json({ message: 'Bus removed from fleet' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete bus', error: err.message });
  }
}

// ---------------- Schedule Management ----------------
async function createSchedule(req, res) {
  try {
    const { route_id, bus_id, departure_time, arrival_time, frequency_minutes, days } = req.body;
    if (!route_id || !departure_time || !arrival_time) {
      return res.status(400).json({ message: 'Route, departure time, and arrival time are required' });
    }

    const schedule = await Schedule.create({
      route_id,
      bus_id: bus_id || null,
      departure_time,
      arrival_time,
      frequency_minutes: frequency_minutes || 20,
      days: days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    });

    return res.status(201).json(schedule);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create schedule', error: err.message });
  }
}

async function updateSchedule(req, res) {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    return res.json(schedule);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update schedule', error: err.message });
  }
}

async function deleteSchedule(req, res) {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    return res.json({ message: 'Schedule deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete schedule', error: err.message });
  }
}

module.exports = {
  getDashboardStats,
  createRoute,
  updateRoute,
  deleteRoute,
  createStop,
  updateStop,
  deleteStop,
  createBus,
  updateBus,
  deleteBus,
  createSchedule,
  updateSchedule,
  deleteSchedule
};
