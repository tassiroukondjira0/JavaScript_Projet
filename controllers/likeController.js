const Like = require('../models/Like');
const Post = require('../models/postModel');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

exports.toggleLike = async (req, res) => {
  try {
    const { post_id } = req.body;
const user_id = req.user?.userId || req.session?.user?.id || req.user?.id;

    if (!post_id) {
      return res.status(400).json({ error: 'ID de publication requis.' });
    }

    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    const result = await Like.toggle(post_id, user_id);
    const count = await Like.countByPostId(post_id);

    // If it's a new like and not liked by the author, notify the author
    if (result.liked && parseInt(post.user_id) !== user_id) {
      const notifId = await Notification.create({
        receiver_id: post.user_id,
        sender_id: user_id,
        type: 'like',
        entity_id: post_id
      });

      const senderUser = await User.findById(user_id);

      // Emit real-time notification
      const io = req.app.get('socketio');
      if (io) {
        io.to(`user-${post.user_id}`).emit('new_notification', {
          id: notifId,
          type: 'like',
          sender_name: (senderUser?.fullname) || (req.session?.user?.fullname) || '',
          sender_picture: senderUser ? senderUser.profile_picture : 'default-avatar.png',
          entity_id: post_id,
          created_at: new Date().toISOString()
        });
      }
    }

    res.status(200).json({
      liked: result.liked,
      likes_count: count
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Erreur lors de la gestion du like.' });
  }
};
