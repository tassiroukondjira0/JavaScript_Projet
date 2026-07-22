const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/search', requireLogin, (req, res) => res.render('users/search'));
router.get('/search/api', requireLogin, userController.searchUsers);

module.exports = router;

