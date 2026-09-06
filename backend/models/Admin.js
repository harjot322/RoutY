const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createModelProxy } = require('./dbAdapter');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: 'Civic Transit Admin'
  },
  role: {
    type: String,
    enum: ['admin', 'dispatcher'],
    default: 'admin'
  }
}, {
  timestamps: true
});

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const AdminModel = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
module.exports = createModelProxy(AdminModel, 'admins');
