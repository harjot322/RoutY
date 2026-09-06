const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/me', requireAdminAuth, getMe);

module.exports = router;
