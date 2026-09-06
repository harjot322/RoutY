require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');
const Bus = require('./models/Bus');
const { STALE_TELEMETRY_THRESHOLD_SEC } = require('./config/constants');

const path = require('path');
const app = express();
const server = http.createServer(app);

// Socket.IO Setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Attach io instance so controllers can emit events
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging in dev
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/telemetry/report')) {
    console.log(`[HTTP] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telemetry', telemetryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RoutY Civic Transit API'
  });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.emit('connection:ack', {
    message: 'Connected to RoutY live transit socket server',
    serverTime: new Date().toISOString()
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Periodic Stale Telemetry Detector (runs every 10 seconds)
setInterval(async () => {
  try {
    const thresholdDate = new Date(Date.now() - (STALE_TELEMETRY_THRESHOLD_SEC * 1000));
    const staleBuses = await Bus.find({
      status: 'active',
      'last_telemetry.timestamp': { $lt: thresholdDate },
      'last_telemetry.is_stale': false
    });

    for (const b of staleBuses) {
      b.last_telemetry.is_stale = true;
      await b.save();
      io.emit('telemetry:stale', {
        bus_id: b._id,
        bus_number: b.bus_number,
        is_stale: true,
        last_reported: b.last_telemetry.timestamp
      });
    }
  } catch (err) {
    // Suppress background check errors
  }
}, 10000);

// SPA Fallback: serve index.html for any non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

let currentPort = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    await connectDB();
    const HOST = process.env.HOST || '127.0.0.1';

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && currentPort === 5000) {
        console.warn(`[Server] Port 5000 is occupied (e.g. by macOS AirPlay). Retrying on port 5050...`);
        currentPort = 5050;
        server.listen(currentPort, HOST);
      } else {
        console.error('[Server] Fatal server error:', err);
      }
    });

    server.listen(currentPort, HOST, () => {
      console.log(`\n=================================================`);
      console.log(`  🚍 RoutY Transit Backend Server Running`);
      console.log(`  🌐 URL: http://${HOST}:${currentPort}`);
      console.log(`  📡 Socket.IO: Ready for live commuter feeds`);
      console.log(`  🔑 Default Admin: admin / RoutYAdmin2026!`);
      console.log(`=================================================\n`);
    });
  } catch (err) {
    console.error('Failed to start RoutY server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
