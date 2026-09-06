const mongoose = require('mongoose');
const { createModelProxy } = require('./dbAdapter');

const routeStopSchema = new mongoose.Schema({
  stop_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop',
    required: false
  },
  name: {
    type: String,
    required: true
  },
  name_hi: {
    type: String,
    default: ''
  },
  sequence: {
    type: Number,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  distance_along_m: {
    type: Number,
    default: 0
  }
}, { _id: false });

const routeSchema = new mongoose.Schema({
  route_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  name_hi: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  color: {
    type: String,
    default: '#2563eb'
  },
  stops: [routeStopSchema],
  geojson: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]],
      default: []
    }
  },
  total_distance_m: {
    type: Number,
    default: 0
  },
  estimated_duration_min: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

routeSchema.index({ route_number: 1 });
routeSchema.index({ is_active: 1 });

const RouteModel = mongoose.models.Route || mongoose.model('Route', routeSchema);
module.exports = createModelProxy(RouteModel, 'routes');
