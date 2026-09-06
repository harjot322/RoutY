const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  createRoute,
  updateRoute,
  deleteRoute,
  createStop,
  updateStop,
  deleteStop,
  createBus,
  updateBus,
  deleteBus,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/adminController');

// All admin routes require token authentication
router.use(requireAdminAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Routes CRUD
router.post('/routes', createRoute);
router.put('/routes/:id', updateRoute);
router.delete('/routes/:id', deleteRoute);

// Stops CRUD
router.post('/stops', createStop);
router.put('/stops/:id', updateStop);
router.delete('/stops/:id', deleteStop);

// Buses CRUD
router.post('/buses', createBus);
router.put('/buses/:id', updateBus);
router.delete('/buses/:id', deleteBus);

// Schedules CRUD
router.post('/schedules', createSchedule);
router.put('/schedules/:id', updateSchedule);
router.delete('/schedules/:id', deleteSchedule);

module.exports = router;
