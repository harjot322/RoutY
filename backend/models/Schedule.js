const mongoose = require('mongoose');
const { createModelProxy } = require('./dbAdapter');

const scheduleSchema = new mongoose.Schema({
  route_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  bus_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    default: null
  },
  departure_time: {
    type: String,
    required: true,
    trim: true
  },
  arrival_time: {
    type: String,
    required: true,
    trim: true
  },
  frequency_minutes: {
    type: Number,
    default: 20
  },
  days: {
    type: [String],
    default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

scheduleSchema.index({ route_id: 1 });
scheduleSchema.index({ bus_id: 1 });

const ScheduleModel = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);
module.exports = createModelProxy(ScheduleModel, 'schedules');
