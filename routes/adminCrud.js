const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const adminCrudController = require('../controllers/adminCrudController');

router.use(requireLogin, requireRole(['ADMIN', 'SUPER_ADMIN']));

router.get('/users', adminCrudController.listUsers);
router.post('/users/:userId/role', adminCrudController.updateUserRole);

router.get('/posts', adminCrudController.listPosts);
router.post('/posts/:postId/delete', adminCrudController.deletePost);

router.get('/reports', adminCrudController.listReports);

router.get('/comments', adminCrudController.listComments);
router.post('/comments/:commentId/delete', adminCrudController.deleteComment);

module.exports = router;
