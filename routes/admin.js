const express = require('express');
const router = express.Router();

const { requireLogin } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const adminController = require('../controllers/adminController');

router.get('/dashboard', requireLogin, requireRole(['ADMIN', 'SUPER_ADMIN']), adminController.dashboard);

module.exports = router;

