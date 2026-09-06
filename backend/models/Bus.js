const mongoose = require('mongoose');
const { createModelProxy } = require('./dbAdapter');

const etaItemSchema = new mongoose.Schema({
  stop_name: String,
  stop_sequence: Number,
  latitude: Number,
  longitude: Number,
  distance_remaining_m: Number,
  eta_seconds: Number,
  eta_formatted: String
}, { _id: false });

const busSchema = new mongoose.Schema({
  bus_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  registration_number: {
    type: String,
    trim: true,
    default: ''
  },
  model: {
    type: String,
    trim: true,
    default: 'Tata Ultra Electric Citybus'
  },
  capacity: {
    type: Number,
    default: 32
  },
  route_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'maintenance'],
    default: 'active'
  },
  last_telemetry: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    bearing: { type: Number, default: 0 },
    speed_kmh: { type: Number, default: 0 },
    next_stop_name: { type: String, default: '' },
    next_stop_sequence: { type: Number, default: 0 },
    distance_to_next_stop_m: { type: Number, default: 0 },
    eta_to_next_stop_sec: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    is_stale: { type: Boolean, default: false }
  },
  etas: [etaItemSchema]
}, {
  timestamps: true
});

busSchema.index({ bus_number: 1 });
busSchema.index({ route_id: 1 });
busSchema.index({ status: 1 });

const BusModel = mongoose.models.Bus || mongoose.model('Bus', busSchema);
module.exports = createModelProxy(BusModel, 'buses');
