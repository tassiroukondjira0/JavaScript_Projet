const SavedPost = require('../models/savedPostModel');
const Post = require('../models/postModel');

async function toggleSave(req, res) {
  try {
    const { post_id } = req.body;
    const user_id = req.session.user?.id || req.user?.userId;

    if (!post_id) {
      return res.status(400).json({ error: 'ID de publication requis.' });
    }

    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    const result = await SavedPost.save(user_id, post_id);
    const count = await SavedPost.getSavedCount(post_id);

    res.json({ saved: result.saved, saved_count: count });
  } catch (error) {
    console.error('Error toggling save:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
  }
}

async function getSavedPosts(req, res) {
  try {
    const user_id = req.session.user?.id || req.user?.userId;
    const posts = await SavedPost.getSavedPosts(user_id);
    res.json(posts);
  } catch (error) {
    console.error('Error getting saved posts:', error);
    res.status(500).json({ error: 'Erreur lors du chargement.' });
  }
}

module.exports = { toggleSave, getSavedPosts };