const Comment = require('../models/commentModel');
const Post = require('../models/postModel');
const Notification = require('../models/notificationModel');
const { logActivity } = require('../utils/activityLogger');

exports.createComment = async (req, res) => {
  try {
    const { post_id, content, parent_id } = req.body;
    const user_id = req.user?.userId || req.session?.user?.id || req.user?.id;

    if (!post_id || !content || content.trim() === '') {
      return res.status(400).json({ error: 'Le contenu du commentaire ne peut pas être vide.' });
    }

    if (typeof content === 'string' && content.length > 5000) {
      return res.status(400).json({ error: 'Le contenu du commentaire dépasse la limite de 5000 caractères.' });
    }

    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    // Hiérarchie max 3 niveaux (top-level = niveau 1)
    if (parent_id) {
      const parent = await Comment.findById(parent_id);
      if (!parent) {
        return res.status(404).json({ error: 'Commentaire parent non trouvé.' });
      }

      // Vérifie que le parent appartient au même post
      if (parseInt(parent.post_id) !== parseInt(post_id)) {
        return res.status(400).json({ error: 'Le parent doit appartenir à la même publication.' });
      }

      // profondeur: parent_level <= 2 (pour permettre up to 3)
      let depth = 1;
      let cursor = parent;
      while (cursor?.parent_id) {
        depth += 1;
        if (depth >= 3) {
          // Si parent a déjà un ancêtre, on ne peut pas ajouter un 4e niveau
          return res.status(400).json({ error: 'Hiérarchie maximale de 3 niveaux dépassée.' });
        }
        cursor = await Comment.findById(cursor.parent_id);
        if (!cursor) break;
      }
    }

    const commentId = await Comment.create({
      post_id,
      user_id,
      content,
      parent_id: parent_id || null
    });

    const newComment = await Comment.findById(commentId);
    
    // Fetch profile picture and fullname (using DB as fallback)
    const userProfile = await require('../models/userModel').findById(user_id);
    newComment.fullname = (req.session?.user?.fullname) || (userProfile?.fullname) || '';
    newComment.profile_picture = userProfile ? userProfile.profile_picture : 'default-avatar.png';

    // Create notification if the commenter is not the post author
    // For replies, notify the parent comment author; for top-level comments, notify post author
    let notifyUserId = null;
    if (parent_id) {
      const parentComment = await Comment.findById(parent_id);
      if (parentComment && parseInt(parentComment.user_id) !== user_id) {
        notifyUserId = parentComment.user_id;
      }
    } else if (parseInt(post.user_id) !== user_id) {
      notifyUserId = post.user_id;
    }

    if (notifyUserId) {
      const notifId = await Notification.create({
        receiver_id: notifyUserId,
        sender_id: user_id,
        type: parent_id ? 'comment_reply' : 'comment',
        entity_id: post_id
      });

      // Emit real-time notification via Socket.IO
      const io = req.app.get('socketio');
      if (io) {
        io.to(`user-${notifyUserId}`).emit('new_notification', {
          id: notifId,
          type: parent_id ? 'comment_reply' : 'comment',
          sender_name: (req.session?.user?.fullname) || (userProfile?.fullname) || '',
          sender_picture: newComment.profile_picture,
          entity_id: post_id,
          created_at: new Date().toISOString()
        });
      }
    }

    await logActivity({
      actor_user_id: user_id,
      action_type: parent_id ? 'reply_created' : 'comment_created',
      entity_type: 'comment',
      entity_id: commentId
    });

    res.status(201).json({
      message: parent_id ? 'Réponse ajoutée.' : 'Commentaire ajouté.',
      comment: newComment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const currentUserId = req.user?.userId || req.session?.user?.id || req.user?.id;
    const isAdmin = req.user?.isAdmin || req.session?.user?.is_admin;

    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Le contenu du commentaire ne peut pas être vide.' });
    }
    if (typeof content === 'string' && content.length > 5000) {
      return res.status(400).json({ error: 'Le contenu du commentaire dépasse la limite de 5000 caractères.' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouvé.' });
    }

    const isOwner = parseInt(comment.user_id) === currentUserId;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier ce commentaire.' });
    }

    // Modification uniquement dans 30 minutes (optionnel selon cahier des charges, mais appliqué ici)
    if (isOwner) {
      const createdAt = comment.created_at ? new Date(comment.created_at) : null;
      if (createdAt && !Number.isNaN(createdAt.getTime())) {
        const minutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
        if (minutes > 30) {
          return res.status(403).json({ error: 'La modification du commentaire n\'est autorisée que dans les 30 minutes.' });
        }
      }
    }

    await Comment.update(commentId, { content });

    const updated = await Comment.findById(commentId);
    res.status(200).json({ message: 'Commentaire mis à jour.', comment: updated });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du commentaire.' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const currentUserId = req.user?.userId || req.session?.user?.id || req.user?.id;
    const isAdmin = req.user?.isAdmin || req.session?.user?.is_admin;


    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouvé.' });
    }

    // Verify rights: comment author, post author, or admin
    const post = await Post.findById(comment.post_id);
    const isCommentOwner = parseInt(comment.user_id) === currentUserId;
    const isPostOwner = post && parseInt(post.user_id) === currentUserId;

    if (!isCommentOwner && !isPostOwner && !isAdmin) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer ce commentaire.' });
    }

    await Comment.delete(commentId);

    res.status(200).json({ message: 'Commentaire supprimé.' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire.' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const comments = await Comment.getByPostId(postId);
    res.status(200).json(comments);
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.' });
  }
};

exports.getReplies = async (req, res) => {
  try {
    const parentId = parseInt(req.params.parentId);
    const replies = await Comment.getReplies(parentId);
    res.status(200).json(replies);
  } catch (error) {
    console.error('Error getting replies:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des réponses.' });
  }
};