const express = require('express');
const router = express.Router();
const { reportTelemetry, getActiveTelemetry } = require('../controllers/telemetryController');

// Ingestion endpoint used by Python simulator or hardware GPS adapter
router.post('/report', reportTelemetry);

// Read current active telemetry snapshot
router.get('/active', getActiveTelemetry);

module.exports = router;
