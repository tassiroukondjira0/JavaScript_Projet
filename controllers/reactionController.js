const reactionModel = require('../models/reactionModel');

const Post = require('../models/postModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const { logActivity } = require('../utils/activityLogger');
const { getDB } = require('../config/db');

exports.toggleReaction = async (req, res) => {
  try {
    const { post_id, reaction_type } = req.body;
    const user_id = req.user?.userId || req.session?.user?.id || req.user?.id;

    if (!post_id || !reaction_type) {
      return res.status(400).json({ error: 'ID de publication et type de réaction requis.' });
    }

    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    const modelResult = await reactionModel.react({
      postId: post_id,
      userId: user_id,
      reactionType: reaction_type
    });

    const counts = await reactionModel.getReactionSummary({ postId: post_id });
    const totalCount = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);

    const isInserted = !!modelResult?.inserted;
    const isRemoved = !!modelResult?.removed;

    // Notifications uniquement quand une réaction est ajoutée (pas lors du retrait)
    if (isInserted && parseInt(post.user_id) !== user_id) {
      const notifId = await Notification.create({
        receiver_id: post.user_id,
        sender_id: user_id,
        type: 'reaction',
        entity_id: post_id
      });

      const senderUser = await User.findById(user_id);

      // Emit real-time notification
      const io = req.app.get('socketio');
      if (io) {
        io.to(`user-${post.user_id}`).emit('new_notification', {
          id: notifId,
          type: 'reaction',
          reaction_type: reaction_type,
          sender_name: (req.session?.user?.fullname) || (senderUser?.fullname) || '',
          sender_picture: senderUser ? senderUser.profile_picture : 'default-avatar.png',
          entity_id: post_id,
          created_at: new Date().toISOString()
        });
      }

      await logActivity({
        actor_user_id: user_id,
        action_type: 'reaction_created',
        entity_type: 'post',
        entity_id: post_id,
        metadata: { reaction_type }
      });
    }

    // Journalisation selon insert/remove
    if (modelResult?.removed) {
      await logActivity({
        actor_user_id: user_id,
        action_type: 'reaction_removed',
        entity_type: 'post',
        entity_id: post_id,
        metadata: { reaction_type }
      });
    } else {
      await logActivity({
        actor_user_id: user_id,
        action_type: modelResult?.inserted ? 'reaction_created' : 'reaction_updated',
        entity_type: 'post',
        entity_id: post_id,
        metadata: { reaction_type }
      });
    }

    res.status(200).json({
      reacted: !modelResult?.removed,
      reaction_type: reaction_type,
      counts,
      total_count: totalCount
    });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la gestion de la réaction.' });
  }
};

exports.getReactionCounts = async (req, res) => {
  try {
    const { post_id } = req.query;

    if (!post_id) {
      return res.status(400).json({ error: 'ID de publication requis.' });
    }

    const counts = await reactionModel.getReactionSummary({ postId: post_id });
    const totalCount = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);

    res.status(200).json({ counts, total_count: totalCount });
  } catch (error) {
    console.error('Error getting reaction counts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des réactions.' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const db = getDB();
    const stats = {};
    const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

    for (const type of reactionTypes) {
      const sql = 'SELECT COUNT(*) as count FROM reactions WHERE reaction_type = ?';
      const result = await db.query(sql, [type]);
      stats[type] = result[0].count;
    }

    res.status(200).json({ reactions: stats });
  } catch (error) {
    console.error('Error getting reaction stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques.' });
  }
};
