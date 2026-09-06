const Bus = require('../models/Bus');
const Route = require('../models/Route');
const { computeRouteEtas } = require('../utils/etaEngine');
const { STALE_TELEMETRY_THRESHOLD_SEC } = require('../config/constants');

/**
 * Handle incoming telemetry packet from Python simulator or hardware GPS feed
 */
async function reportTelemetry(req, res) {
  try {
    const {
      bus_id,
      bus_number,
      route_id,
      latitude,
      longitude,
      bearing,
      speed_kmh,
      timestamp
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }

    // Find bus by ID or bus_number
    let bus = null;
    if (bus_id) {
      bus = await Bus.findById(bus_id);
    }
    if (!bus && bus_number) {
      bus = await Bus.findOne({ bus_number: bus_number.toUpperCase().trim() });
    }

    if (!bus) {
      return res.status(404).json({ message: `Bus not found for id: ${bus_id || bus_number}` });
    }

    // Determine route
    const targetRouteId = route_id || bus.route_id;
    let route = null;
    if (targetRouteId) {
      route = await Route.findById(targetRouteId);
    }

    // Compute ETAs if route is active
    let calculated = { etas: [], nextStop: null, distanceToNextM: 0, etaToNextSec: 0 };
    if (route) {
      calculated = computeRouteEtas(route, { latitude, longitude, speed_kmh });
    }

    const reportTime = timestamp ? new Date(timestamp) : new Date();
    const isStale = (Date.now() - reportTime.getTime()) > (STALE_TELEMETRY_THRESHOLD_SEC * 1000);

    // Update bus document
    bus.last_telemetry = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      bearing: Number(bearing) || 0,
      speed_kmh: Number(speed_kmh) || 0,
      next_stop_name: calculated.nextStop?.name || '',
      next_stop_sequence: calculated.nextStop?.sequence || 0,
      distance_to_next_stop_m: calculated.distanceToNextM,
      eta_to_next_stop_sec: calculated.etaToNextSec,
      timestamp: reportTime,
      is_stale: isStale
    };
    bus.etas = calculated.etas;
    await bus.save();

    // Broadcast live update over Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('telemetry:update', {
        bus_id: bus._id,
        bus_number: bus.bus_number,
        route_id: route?._id || bus.route_id,
        route_number: route?.route_number || '',
        route_name: route?.name || '',
        route_color: route?.color || '#2563eb',
        latitude: Number(latitude),
        longitude: Number(longitude),
        bearing: Number(bearing) || 0,
        speed_kmh: Number(speed_kmh) || 0,
        next_stop_name: calculated.nextStop?.name || '',
        distance_to_next_stop_m: calculated.distanceToNextM,
        eta_to_next_stop_sec: calculated.etaToNextSec,
        etas: calculated.etas,
        timestamp: reportTime.toISOString(),
        is_stale: isStale
      });
    }

    return res.json({
      status: 'ok',
      bus_number: bus.bus_number,
      next_stop: calculated.nextStop?.name || null,
      eta_seconds: calculated.etaToNextSec,
      etas_count: calculated.etas.length
    });
  } catch (err) {
    console.error('[Telemetry] Report error:', err);
    return res.status(500).json({ message: 'Error processing telemetry', error: err.message });
  }
}

/**
 * Get all active bus positions with staleness check
 */
async function getActiveTelemetry(req, res) {
  try {
    const buses = await Bus.find({ status: 'active' }).populate('route_id', 'route_number name color');
    const now = Date.now();
    const thresholdMs = STALE_TELEMETRY_THRESHOLD_SEC * 1000;

    const result = buses.map(bus => {
      const bObj = bus.toObject();
      const lastTime = bObj.last_telemetry?.timestamp ? new Date(bObj.last_telemetry.timestamp).getTime() : 0;
      const isStale = (now - lastTime) > thresholdMs;
      if (bObj.last_telemetry) {
        bObj.last_telemetry.is_stale = isStale;
      }
      return bObj;
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching active telemetry', error: err.message });
  }
}

module.exports = {
  reportTelemetry,
  getActiveTelemetry
};
