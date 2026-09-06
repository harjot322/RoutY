const Route = require('../models/Route');
const Stop = require('../models/Stop');
const Bus = require('../models/Bus');
const Schedule = require('../models/Schedule');
const {
  DEFAULT_CITY,
  DEFAULT_STATE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM
} = require('../config/constants');
const { haversineDistance } = require('../utils/geoUtils');

async function getConfig(req, res) {
  return res.json({
    appName: 'RoutY',
    tagline: 'Real-Time Public Transport Tracking System',
    city: process.env.CITY_NAME || DEFAULT_CITY,
    state: process.env.STATE_NAME || DEFAULT_STATE,
    defaultCenter: DEFAULT_MAP_CENTER,
    defaultZoom: DEFAULT_MAP_ZOOM,
    version: '1.0.0'
  });
}

async function getRoutes(req, res) {
  try {
    const routes = await Route.find({ is_active: true }).sort({ route_number: 1 });
    return res.json(routes);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching routes', error: err.message });
  }
}

async function getRouteById(req, res) {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    const buses = await Bus.find({ route_id: route._id });
    const schedules = await Schedule.find({ route_id: route._id, is_active: true });
    return res.json({ route, buses, schedules });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching route details', error: err.message });
  }
}

async function getStops(req, res) {
  try {
    const stops = await Stop.find({ is_active: true }).sort({ name: 1 });
    return res.json(stops);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching stops', error: err.message });
  }
}

async function getBuses(req, res) {
  try {
    const buses = await Bus.find().populate('route_id', 'route_number name color');
    return res.json(buses);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching buses', error: err.message });
  }
}

async function getBusById(req, res) {
  try {
    const bus = await Bus.findById(req.params.id).populate('route_id');
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    return res.json(bus);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching bus details', error: err.message });
  }
}

async function getSchedules(req, res) {
  try {
    const schedules = await Schedule.find({ is_active: true })
      .populate('route_id', 'route_number name color')
      .populate('bus_id', 'bus_number model');
    return res.json(schedules);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching schedules', error: err.message });
  }
}

async function getNearestStops(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Valid lat and lng query params are required' });
    }

    const stops = await Stop.find({ is_active: true });
    const withDistance = stops.map(stop => {
      const distMeters = haversineDistance(lat, lng, stop.latitude, stop.longitude);
      return {
        ...stop.toObject(),
        distance_meters: Math.round(distMeters),
        walking_time_min: Math.round(distMeters / (4500 / 60)) // ~4.5 km/h walking speed
      };
    });

    withDistance.sort((a, b) => a.distance_meters - b.distance_meters);
    return res.json(withDistance.slice(0, 10)); // Top 10 closest stops
  } catch (err) {
    return res.status(500).json({ message: 'Error calculating nearest stops', error: err.message });
  }
}

module.exports = {
  getConfig,
  getRoutes,
  getRouteById,
  getStops,
  getBuses,
  getBusById,
  getSchedules,
  getNearestStops
};
