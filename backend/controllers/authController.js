const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
}

async function getMe(req, res) {
  try {
    return res.json({ admin: req.admin });
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving profile' });
  }
}

module.exports = {
  login,
  getMe
};
