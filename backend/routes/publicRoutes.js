const express = require('express');
const router = express.Router();
const {
  getConfig,
  getRoutes,
  getRouteById,
  getStops,
  getBuses,
  getBusById,
  getSchedules,
  getNearestStops
} = require('../controllers/publicController');

router.get('/config', getConfig);
router.get('/routes', getRoutes);
router.get('/routes/:id', getRouteById);
router.get('/stops', getStops);
router.get('/buses', getBuses);
router.get('/buses/:id', getBusById);
router.get('/schedules', getSchedules);
router.get('/nearest-stops', getNearestStops);

module.exports = router;
