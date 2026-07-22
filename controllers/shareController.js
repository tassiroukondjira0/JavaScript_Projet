const Post = require('../models/postModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const { logActivity } = require('../utils/activityLogger');

/**
 * Share/repost a post
 */
exports.sharePost = async (req, res) => {
  try {
    const { post_id, content } = req.body;
    const user_id = req.user?.userId || req.session?.user?.id;

    if (!post_id) {
      return res.status(400).json({ error: 'ID de publication requis.' });
    }

    // Check if original post exists
    const originalPost = await Post.findById(post_id);
    if (!originalPost) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    // Create a shared post
    const shareContent = content ? content : '';
    const sharedPostId = await Post.create({
      user_id,
      content: shareContent,
      image: null
    });

    // Update to set shared_from
    await Post.update(sharedPostId, { shared_from: post_id });

    const newPost = await Post.findById(sharedPostId);

    // Notify original post author if someone else shared their post
    if (parseInt(originalPost.user_id) !== user_id) {
      const notifId = await Notification.create({
        receiver_id: originalPost.user_id,
        sender_id: user_id,
        type: 'share',
        entity_id: post_id
      });

      const senderUser = await User.findById(user_id);

      // Emit real-time notification via Socket.IO
      const io = req.app.get('socketio');
      if (io) {
        io.to(`user-${originalPost.user_id}`).emit('new_notification', {
          id: notifId,
          type: 'share',
          sender_name: (req.session?.user?.fullname) || (senderUser?.fullname) || '',
          sender_picture: (req.session?.user?.profile_picture) || (senderUser?.profile_picture) || 'default-avatar.png',
          entity_id: post_id,
          created_at: new Date().toISOString()
        });
      }
    }


    await logActivity({
      actor_user_id: user_id,
      action_type: 'post_shared',
      entity_type: 'post',
      entity_id: post_id,
      metadata: { shared_post_id: sharedPostId }
    });

    res.status(201).json({
      message: 'Publication partagée avec succès.',
      post: newPost
    });
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ error: 'Erreur lors du partage de la publication.' });
  }
};