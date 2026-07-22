const Post = require('../models/postModel');
const User = require('../models/userModel');
const { logActivity } = require('../utils/activityLogger');

// Resolve current user id from session (req.session.user.id) or JWT.
function currentUserId(req) {
  return req.session?.user?.id || req.user?.userId || req.user?.id;
}

exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const user_id = currentUserId(req);

    if (!content || content.trim() === '') {
      if (!req.file) {
        return res.status(400).json({ error: 'Le contenu de la publication ne peut pas être vide.' });
      }
    }

    const image = req.file ? req.file.filename : null;

    const postId = await Post.create({
      user_id,
      content,
      image
    });

    const newPost = await Post.findById(postId);

    await logActivity({
      actor_user_id: user_id,
      action_type: 'post_created',
      entity_type: 'post',
      entity_id: postId
    });

    res.status(201).json({
      message: 'Publication créée.',
      post: newPost
    });

  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la publication.' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const currentUserId = req.session?.user?.id || req.user?.userId || req.user?.id;
    const { content } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    // Verify ownership
    if (parseInt(post.user_id) !== currentUserId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier cette publication.' });
    }

    const updateData = {};
    if (content !== undefined) {
      if (content.trim() === '' && !post.image && !req.file) {
        return res.status(400).json({ error: 'Le contenu de la publication ne peut pas être vide.' });
      }
      updateData.content = content;
    }

    if (req.file) {
      updateData.image = req.file.filename;
    }

    await Post.update(postId, updateData);
    const updatedPost = await Post.findById(postId);

    await logActivity({
      actor_user_id: currentUserId,
      action_type: 'post_updated',
      entity_type: 'post',
      entity_id: postId
    });

    res.status(200).json({
      message: 'Publication modifiée.',
      post: updatedPost
    });

  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de la publication.' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const currentUserId = req.session?.user?.id || req.user?.userId || req.user?.id;
    const isAdmin = req.user?.isAdmin || req.session?.isAdmin;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    // Verify ownership or admin rights
    if (parseInt(post.user_id) !== currentUserId && !isAdmin) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer cette publication.' });
    }

    await Post.delete(postId);

    await logActivity({
      actor_user_id: currentUserId,
      action_type: 'post_deleted',
      entity_type: 'post',
      entity_id: postId
    });

    res.status(200).json({ message: 'Publication supprimée.' });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la publication.' });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const currentUserId = req.session?.user?.id || req.user?.userId || req.user?.id;
    const feed = await Post.getFeed(currentUserId);
    res.status(200).json(feed);
  } catch (error) {
    console.error('Error getting feed:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du fil d\'actualité.' });
  }
};

exports.searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.session?.user?.id || req.user?.userId || req.user?.id;

    if (!q || q.trim() === '') {
      return res.status(200).json([]);
    }

    const posts = await Post.search(q, currentUserId);
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche de publications.' });
  }
};

// Get current user's own posts (for dashboard)
exports.getUserPosts = async (req, res) => {
  try {
    const userId = req.session?.user?.id || req.user?.userId || req.user?.id;
    const posts = await Post.getProfileFeed(userId, userId);
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error getting user posts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des publications.' });
  }
};

// Get a specific user's posts by ID (for profile page)
exports.getUserPostsById = async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    const currentUserId = req.session?.user?.id || req.user?.userId || req.user?.id;
    const posts = await Post.getProfileFeed(currentUserId, profileId);
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error getting user posts by id:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des publications.' });
  }
};

module.exports = {
  createPost: exports.createPost,
  updatePost: exports.updatePost,
  deletePost: exports.deletePost,
  getFeed: exports.getFeed,
  searchPosts: exports.searchPosts,
  getUserPosts: exports.getUserPosts,
  getUserPostsById: exports.getUserPostsById
};
