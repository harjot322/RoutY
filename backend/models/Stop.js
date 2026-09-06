const mongoose = require('mongoose');
const { createModelProxy } = require('./dbAdapter');

const stopSchema = new mongoose.Schema({
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
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  landmark: {
    type: String,
    trim: true,
    default: ''
  },
  zone: {
    type: String,
    trim: true,
    default: 'Central'
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

stopSchema.index({ latitude: 1, longitude: 1 });
stopSchema.index({ name: 'text', name_hi: 'text' });

const StopModel = mongoose.models.Stop || mongoose.model('Stop', stopSchema);
module.exports = createModelProxy(StopModel, 'stops');
