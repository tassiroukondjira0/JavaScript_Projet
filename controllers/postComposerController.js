const postModel = require('../models/postModel');
const { getDB } = require('../config/db');
const notificationModel = require('../models/notificationModel');

async function newPostPage(req, res) {
  const sessUser = req.session?.user || req.user || null;
  const user = sessUser?.id
    ? { id: sessUser.id, fullname: sessUser.fullname || sessUser.email || '', profile_picture: sessUser.profile_picture || null }
    : null;

  res.render('posts/new', { user });
}

async function createPostWithImages(req, res) {
  const userId = req.session?.user?.id || req.user?.userId || req.user?.id;
  const content = (req.body.content || '').trim();

  const db = getDB();
  try {
    const files = req.files?.images || [];
    if (!files.length) {
      return res.status(400).send('Veuillez sélectionner au moins une photo.');
    }

    // Create post (content est TEXT NOT NULL, donc '' passe)
    const postId = await postModel.createPost({
      userId,
      content,
      image: null
    });

    // Store multi-images in posts.images_json
    const imagesJson = JSON.stringify(files.map(f => f.filename));
    await db.execute(
      'UPDATE posts SET images_json=? WHERE id=?',
      [imagesJson, postId]
    );


    await notificationModel.createNotification({
      userId,
      type: 'NEW_REACTION',
      payload: { postId }
    });

    const socketApi = req.app.locals.socketApi;
    if (socketApi?.emitToUser) {
      socketApi.emitToUser(userId, 'notification:new', { type: 'NEW_REACTION', postId });
    }

    return res.redirect('/posts');
  } catch (e) {
    console.error('createPostWithImages error:', e);
    return res.status(500).send('Erreur lors de la création de la publication.');
  }
}

module.exports = {
  newPostPage,
  createPostWithImages
};

