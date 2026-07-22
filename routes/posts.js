const express = require('express');
const path = require('path');
const multer = require('multer');
const router = express.Router();

const { requireLogin } = require('../middleware/auth');
const postsController = require('../controllers/postsController');

// Simple auth check for feed
const authCheck = (req, res, next) => {
  if (!req.session?.user) {
    return res.redirect('/auth/login');
  }
  next();
};

const postModel = require('../models/postModel');
const commentModel = require('../models/commentModel');
const reactionModel = require('../models/reactionModel');
const shareModel = require('../models/shareModel');
const reportModel = require('../models/reportModel');
const notificationModel = require('../models/notificationModel');

// Multer local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Feed
router.get('/', authCheck, postsController.feed);

// Multi-photo composer page
const postComposerController = require('../controllers/postComposerController');

router.get('/new', requireLogin, postComposerController.newPostPage);

// Create post (legacy: single image)
router.post('/', requireLogin, upload.single('image'), async (req, res) => {
  const content = req.body.content;
  const image = req.file?.filename || null;
  const userId = req.session.user.id;

  const postId = await postModel.createPost({ userId, content, image });

  await notificationModel.createNotification({
    userId,
    type: 'NEW_REACTION',
    payload: { postId }
  });

  const socketApi = req.app.locals.socketApi;
  if (socketApi?.emitToUser) {
    socketApi.emitToUser(userId, 'notification:new', { type: 'NEW_REACTION', postId });
  }

  res.redirect('/posts');
});

// Create post (multi images)
const uploadImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/new', requireLogin, uploadImages.array('images', 10), postComposerController.createPostWithImages);





// Add comment (top-level)
router.post('/:postId/comments', requireLogin, async (req, res) => {
  const postId = Number(req.params.postId);
  const content = req.body.content;
  if (!content) return res.status(400).send('content requis');

  const userId = req.session.user.id;
  const commentId = await commentModel.addComment({ postId, userId, content });

  const ownerId = await postModel.findPostOwner(postId);
  if (ownerId && ownerId !== userId) {
    await notificationModel.createNotification({
      userId: ownerId,
      type: 'NEW_COMMENT',
      payload: { postId, commentId }
    });
  }

  res.redirect('/posts');
});

// Add comment reply (niveau 2/3 via parent_id)
router.post('/:postId/comments/:parentId', requireLogin, async (req, res) => {
  const postId = Number(req.params.postId);
  const parentId = Number(req.params.parentId);
  const content = req.body.content;
  if (!content) return res.status(400).send('content requis');

  const commentController = require('../controllers/commentController');

  // On appelle createComment en lui passant les infos attendues
  const fakeReq = {
    body: { post_id: postId, content, parent_id: parentId },
    user: req.session.user,
    session: req.session,
    app: req.app
  };

  const fakeRes = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      res.status(this.code || 200).json(payload);
    }
  };

  await commentController.createComment(fakeReq, fakeRes);
});

// React
router.post('/:postId/reactions', requireLogin, async (req, res) => {
  const postId = Number(req.params.postId);
  const reactionType = req.body.reactionType || 'LIKE';
  const userId = req.session.user.id;

  await reactionModel.react({ postId, userId, reactionType });

  const ownerId = await postModel.findPostOwner(postId);
  if (ownerId && ownerId !== userId) {
    await notificationModel.createNotification({
      userId: ownerId,
      type: 'NEW_REACTION',
      payload: { postId, reactionType }
    });
  }

  res.redirect('/posts');
});

// Share
router.post('/:postId/share', requireLogin, async (req, res) => {
  const postId = Number(req.params.postId);
  const userId = req.session.user.id;

  await shareModel.sharePost({ postId, userId });
  const ownerId = await postModel.findPostOwner(postId);
  if (ownerId && ownerId !== userId) {
    await notificationModel.createNotification({
      userId: ownerId,
      type: 'NEW_REACTION',
      payload: { postId, action: 'SHARE' }
    });
  }

  res.redirect('/posts');
});

// Report
router.post('/:postId/report', requireLogin, async (req, res) => {
  const postId = Number(req.params.postId);
  const userId = req.session.user.id;
  const reason = req.body.reason || null;

  await reportModel.reportTarget({
    targetType: 'POST',
    targetId: postId,
    reporterId: userId,
    reason
  });

  res.redirect('/posts');
});

// Search posts (minimal)
router.get('/search', (req, res) => res.render('posts/search'));
router.get('/search/api', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const db = require('../config/db').getDB();
  const [rows] = await db.execute(
    `SELECT p.*, u.fullname, u.profile_picture
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.content LIKE ?
     ORDER BY p.created_at DESC
     LIMIT 20`,
    [`%${q}%`]
  );
  res.json(rows);
});

module.exports = router;

