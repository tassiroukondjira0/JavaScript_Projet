const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const profileController = require('../controllers/profileController');

router.post('/', requireLogin, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), profileController.updateProfile);

module.exports = router;


