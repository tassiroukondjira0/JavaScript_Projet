const Message = require('../models/Message');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const { logActivity } = require('../utils/activityLogger');
const { getDB } = require('../config/db');


exports.sendMessage = async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    const sender_id = req.user?.userId || req.session?.userId;

    if (!receiver_id) {
      return res.status(400).json({ error: 'Destinataire requis.' });
    }

    // Allow empty content if there's an image
    const hasImage = req.file ? true : false;
    if ((!content || content.trim() === '') && !hasImage) {
      return res.status(400).json({ error: 'Le contenu du message ne peut pas être vide.' });
    }

    const image = req.file ? req.file.filename : null;

    const messageId = await Message.create({
      sender_id,
      receiver_id,
      content: content || '',
      image
    });

    const senderUser = await User.findById(sender_id);
    const msg = {
      id: messageId,
      sender_id,
      receiver_id,
      content: content || '',
      image,
      is_read: 0,
      created_at: new Date().toISOString(),
      sender_name: (req.session?.fullname) || '',
      sender_picture: senderUser ? senderUser.profile_picture : 'default-avatar.png'
    };

    // Emit message to Socket.IO room `user-${receiver_id}`
    const io = req.app.get('socketio');
    if (io) {
      io.to(`user-${receiver_id}`).emit('private_message', msg);
      
      // Create notification for message
      const notifId = await Notification.create({
        receiver_id,
        sender_id,
        type: 'message',
        entity_id: sender_id // the chat partner ID
      });

      if (notifId) {
        io.to(`user-${receiver_id}`).emit('new_notification', {
          id: notifId,
          type: 'message',
          sender_name: (req.session?.fullname) || '',
          sender_picture: msg.sender_picture,
          entity_id: sender_id,
          created_at: msg.created_at
        });
      }
    }

    // Log activity
    await logActivity({
      actor_user_id: sender_id,
      action_type: 'message_sent',
      entity_type: 'message',
      entity_id: messageId
    });

    res.status(201).json(msg);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message.' });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const partnerId = parseInt(req.params.userId);
    const userId = req.user?.userId || req.session?.userId;
    
    const history = await Message.getChatHistory(userId, partnerId);
    
    // Mark all messages from partner as read
    await Message.markAllAsRead(partnerId, userId);

    res.status(200).json(history);
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique.' });
  }
};

exports.getChatPartners = async (req, res) => {
  try {
    const userId = req.user?.userId || req.session?.userId;
    const partners = await Message.getChatPartners(userId);
    res.status(200).json(partners);
  } catch (error) {
    console.error('Error getting chat partners:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des conversations.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user?.userId || req.session?.userId;

    const result = await Message.markAsRead(messageId, userId);

    // Emit read receipt in real-time
    if (result) {
      const io = req.app.get('socketio');
      if (io) {
        // sender_id = expéditeur ; receiver_id = userId (qui marque comme lu)
        // Récupérer l'info du message pour retrouver l'expéditeur.
        const db = getDB();
        const rows = await db.query(
          'SELECT id, sender_id, receiver_id FROM messages WHERE id = ?',
          [messageId]
        );
        const msg = rows && rows[0] ? rows[0] : null;
        if (msg && msg.sender_id) {
          io.to(`user-${msg.sender_id}`).emit('message_read', {
            messageId,
            senderId: msg.sender_id,
            receiverId: userId,
            created_at: new Date().toISOString()
          });
        }

      }
    }

    res.status(200).json({ success: result });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du message.' });
  }
};


exports.getUnreadCount = async (req, res) => {
  try {
    const partnerId = parseInt(req.params.partnerId);
    const userId = req.user?.userId || req.session?.userId;

    const count = await Message.getUnreadCount(userId, partnerId);
    res.status(200).json({ unread_count: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du compteur.' });
  }
};