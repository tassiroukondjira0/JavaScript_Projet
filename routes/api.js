const express = require('express');
const router = express.Router();

// Middlewares
const { requireLogin } = require('../middleware/auth');
const admin = require('../middleware/admin');
const superAdmin = require('../middleware/superAdmin');

const upload = require('../middleware/upload');
const rateLimitOtp = require('../middleware/rateLimitOtp');
const multer = require('multer');
const path = require('path');


// Controllers
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const likeController = require('../controllers/likeController');
const friendController = require('../controllers/friendController');
const messageController = require('../controllers/messageController');
const notificationController = require('../controllers/notificationController');
const adminController = require('../controllers/adminController');
const reportController = require('../controllers/reportController');
const onboardingController = require('../controllers/onboardingController');
const passwordResetController = require('../controllers/passwordResetController');
const activityController = require('../controllers/activityController');
const reactionController = require('../controllers/reactionController');
const shareController = require('../controllers/shareController');
const profileController = require('../controllers/profileController');
const savedPostController = require('../controllers/savedPostController');

// Multer for message image uploads
const messageUpload = require('../middleware/messageUpload');


// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

router.post('/auth/register', rateLimitOtp({ windowMs: 10 * 60 * 1000, max: 3 }), authController.registerStep1);

// Vérification OTP (uniquement par SMS)
router.post('/auth/verify', rateLimitOtp({ windowMs: 10 * 60 * 1000, max: 5 }), authController.otpVerify);
router.post('/auth/login', authController.loginStep);

router.post('/auth/logout', (req, res) => {
  if (req.session) req.session.destroy(() => res.json({ ok: true }));
  else res.json({ ok: true });
});
router.get('/auth/me', requireLogin, userController.getMe);

// Refresh token
const refreshController = require('../controllers/refreshController');
router.post('/auth/refresh', refreshController.refreshToken);

// ----------------------------------------------------
// PASSWORD RESET OTP ROUTES
// ----------------------------------------------------
router.post('/auth/password-reset/request', rateLimitOtp({ windowMs: 10 * 60 * 1000, max: 3 }), passwordResetController.requestResetOtp);
router.post('/auth/password-reset/confirm', rateLimitOtp({ windowMs: 10 * 60 * 1000, max: 5 }), passwordResetController.verifyResetOtpAndChangePassword);



// ----------------------------------------------------
// USER & PROFILE ROUTES
// ----------------------------------------------------

router.get('/users/profile/:id', requireLogin, userController.getProfile);
router.get('/users/search', requireLogin, userController.searchUsers);
router.get('/users/me/stats', requireLogin, userController.getUserStats);


// ----------------------------------------------------
// POSTS ROUTES
// ----------------------------------------------------
router.post('/posts', requireLogin, upload.single('image'), postController.createPost);
router.put('/posts/:id', requireLogin, upload.single('image'), postController.updatePost);
router.delete('/posts/:id', requireLogin, postController.deletePost);
router.get('/posts/feed', requireLogin, postController.getFeed);
router.get('/posts/search', requireLogin, postController.searchPosts);
router.get('/posts/user/me', requireLogin, postController.getUserPosts);
router.get('/posts/user/:id', requireLogin, postController.getUserPostsById);

// ----------------------------------------------------
// SHARE/REPOST ROUTES
// ----------------------------------------------------
router.post('/shares', requireLogin, shareController.sharePost);

// ----------------------------------------------------
// SAVE/FAVORITE POSTS ROUTES
// ----------------------------------------------------
router.post('/posts/save', requireLogin, savedPostController.toggleSave);
router.get('/posts/saved', requireLogin, savedPostController.getSavedPosts);

// ----------------------------------------------------
// PROFILE AVATAR DELETE ROUTE
// ----------------------------------------------------
router.post('/profile/avatar/delete', requireLogin, profileController.deleteAvatar);

// ----------------------------------------------------
// COMMENTS ROUTES
// ----------------------------------------------------
router.post('/comments', requireLogin, commentController.createComment);
router.delete('/comments/:id', requireLogin, commentController.deleteComment);
router.get('/comments/post/:postId', requireLogin, commentController.getComments);
router.get('/comments/:parentId/replies', requireLogin, commentController.getReplies);

// ----------------------------------------------------
// LIKES ROUTES (legacy - for backward compatibility)
// ----------------------------------------------------
router.post('/likes/toggle', requireLogin, likeController.toggleLike);

// ----------------------------------------------------
// REACTIONS ROUTES
// ----------------------------------------------------
router.post('/reactions/toggle', requireLogin, reactionController.toggleReaction);
router.get('/reactions/counts', requireLogin, reactionController.getReactionCounts);

// ----------------------------------------------------
// FRIENDS ROUTES
// ----------------------------------------------------
router.post('/friends/request', requireLogin, friendController.sendFriendRequest);
router.post('/friends/respond', requireLogin, friendController.respondToFriendRequest);
router.get('/friends/list', requireLogin, friendController.getFriendsList);
router.get('/friends/pending', requireLogin, friendController.getPendingRequests);
router.get('/friends/sent', requireLogin, friendController.getSentRequests);
router.get('/friends/user/:id', requireLogin, friendController.getUserFriends);
router.post('/friends/block/:id', requireLogin, friendController.blockUser);
router.post('/friends/unblock/:id', requireLogin, friendController.unblockUser);
router.delete('/friends/:id', requireLogin, friendController.removeFriend);

// ----------------------------------------------------
// MESSAGES ROUTES
// ----------------------------------------------------
router.post('/messages', requireLogin, messageUpload.single('image'), messageController.sendMessage);
router.get('/messages/history/:userId', requireLogin, messageController.getChatHistory);
router.get('/messages/partners', requireLogin, messageController.getChatPartners);
router.put('/messages/read/:id', requireLogin, messageController.markAsRead);
router.get('/messages/unread/:partnerId', requireLogin, messageController.getUnreadCount);

// ----------------------------------------------------
// NOTIFICATIONS ROUTES
// ----------------------------------------------------
router.get('/notifications', requireLogin, notificationController.listNotifications);
router.put('/notifications/read/:id', requireLogin, notificationController.markAsRead);
router.put('/notifications/read-all', requireLogin, notificationController.markAllRead);

// ----------------------------------------------------
// ACTIVITY LOG (Journal d'activité)
// ----------------------------------------------------
router.get('/activity', requireLogin, activityController.getMyActivity);
router.get('/admin/activity', requireLogin, admin, activityController.getAdminActivity);

// ----------------------------------------------------
// REPORTS (Signalements) ROUTES
// ----------------------------------------------------
router.post('/reports', requireLogin, reportController.reportPostOrComment);
router.get('/reports/pending', requireLogin, admin, reportController.getPendingReports);
router.get('/reports/all', requireLogin, admin, reportController.getAllReports);
router.put('/reports/:id/moderate', requireLogin, admin, reportController.moderateReport);

// ----------------------------------------------------
// ADMIN ROUTES
// ----------------------------------------------------
// Admin (is_admin)
router.get('/admin/stats', requireLogin, admin, adminController.getStats);
router.get('/admin/users', requireLogin, admin, adminController.getUsers);
router.put('/admin/users/:id/suspend', requireLogin, admin, adminController.suspendUser);
router.put('/admin/users/:id/reactivate', requireLogin, admin, adminController.reactivateUser);
router.put('/admin/users/:id/role', requireLogin, admin, adminController.setRole);
router.delete('/admin/users/:id', requireLogin, admin, adminController.deleteUser);

// Super Admin (is_super_admin)
// Adds higher privileges for sensitive role management.
router.put('/admin-super/users/:id/role', requireLogin, superAdmin, adminController.setRole);

// ----------------------------------------------------
// ONBOARDING ROUTES
// ----------------------------------------------------
router.get('/onboarding/status', requireLogin, onboardingController.getOnboardingStatus);

module.exports = router;

