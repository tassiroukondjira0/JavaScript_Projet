const Friend = require('../models/Friend');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

// Resolve the current user id from either session (req.session.user.id)
// or JWT (req.user.userId). Several controllers previously read
// req.session.userId (which does not exist) — this caused friend requests
// to be attributed to NULL and therefore to never be delivered.
function currentUserId(req) {
  const sid = req.session?.user?.id;
  const jwtId = req.user?.userId || req.user?.id;
  return sid || jwtId;
}

exports.sendFriendRequest = async (req, res) => {
  try {
    const { receiver_id } = req.body;
    const sender_id = currentUserId(req);

    if (!sender_id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    if (!receiver_id) {
      return res.status(400).json({ error: 'ID du destinataire requis.' });
    }

    if (parseInt(receiver_id) === parseInt(sender_id)) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même en ami.' });
    }

    const friendshipId = await Friend.sendRequest(parseInt(sender_id), parseInt(receiver_id));

    // Create notification
    const notifId = await Notification.create({
      receiver_id,
      sender_id,
      type: 'friend_request',
      entity_id: friendshipId
    });

    const senderUser = await User.findById(sender_id);

    // Emit real-time notification
    const io = req.app.get('socketio');
    if (io) {
      io.to(`user-${receiver_id}`).emit('new_notification', {
        id: notifId,
        type: 'friend_request',
        sender_name: (req.session?.user?.fullname) || (senderUser ? senderUser.fullname : ''),
        sender_picture: senderUser ? senderUser.profile_picture : 'default-avatar.png',
        entity_id: friendshipId,
        created_at: new Date().toISOString()
      });
      // Also notify friend list update
      io.to(`user-${receiver_id}`).emit('friend_request_received', {
        friendship_id: friendshipId,
        user_id: sender_id,
        fullname: (req.session?.user?.fullname) || (senderUser ? senderUser.fullname : ''),
        profile_picture: senderUser ? senderUser.profile_picture : 'default-avatar.png'
      });
    }

    res.status(201).json({ message: 'Demande d\'ami envoyée.' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de l\'envoi de la demande d\'ami.' });
  }
};

exports.respondToFriendRequest = async (req, res) => {
  try {
    const { sender_id, accept } = req.body; // sender_id is the user who originally sent the request
    const receiver_id = currentUserId(req); // current user accepting/rejecting

    if (!sender_id || accept === undefined) {
      return res.status(400).json({ error: 'Données manquantes.' });
    }

    if (!receiver_id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const success = await Friend.respondToRequest(parseInt(sender_id), parseInt(receiver_id), accept);
    if (!success) {
      return res.status(404).json({ error: 'Demande d\'ami introuvable ou déjà traitée.' });
    }

    if (accept) {
      // Create notification: "receiver_id accepted sender_id's request" -> notify sender_id
      const notifId = await Notification.create({
        receiver_id: sender_id,
        sender_id: receiver_id,
        type: 'friend_accept',
        entity_id: receiver_id
      });

      const receiverUser = await User.findById(receiver_id);

      // Emit real-time notifications
      const io = req.app.get('socketio');
      if (io) {
        io.to(`user-${sender_id}`).emit('new_notification', {
          id: notifId,
          type: 'friend_accept',
          sender_name: (req.session?.user?.fullname) || (receiverUser ? receiverUser.fullname : ''),
          sender_picture: receiverUser ? receiverUser.profile_picture : 'default-avatar.png',
          entity_id: receiver_id,
          created_at: new Date().toISOString()
        });

        // Notify both sockets to reload their friends lists
        io.to(`user-${sender_id}`).emit('friendship_updated');
        io.to(`user-${receiver_id}`).emit('friendship_updated');
      }
    }

    res.status(200).json({ message: accept ? 'Demande d\'ami acceptée.' : 'Demande d\'ami refusée.' });
  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Erreur lors de la réponse à la demande d\'ami.' });
  }
};

exports.getFriendsList = async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });
    const friends = await Friend.getFriendsList(userId);
    res.status(200).json(friends);
  } catch (error) {
    console.error('Error getting friends list:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la liste d\'amis.' });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });
    const requests = await Friend.getPendingRequests(userId);
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes d\'amis.' });
  }
};

exports.getSentRequests = async (req, res) => {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });
    const requests = await Friend.getSentRequests(userId);
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error getting sent requests:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes d\'amis envoyées.' });
  }
};

exports.getUserFriends = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const friends = await Friend.getFriendsList(userId);
    res.status(200).json(friends);
  } catch (error) {
    console.error('Error getting user friends:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des amis.' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const blockedId = parseInt(req.params.id);
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });

    if (blockedId === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous bloquer vous-même.' });
    }

    await Friend.blockUser(userId, blockedId);

    const io = req.app.get('socketio');
    if (io) {
      io.to(`user-${blockedId}`).emit('friendship_updated');
      io.to(`user-${userId}`).emit('friendship_updated');
    }

    res.status(200).json({ message: 'Utilisateur bloqué.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Erreur lors du blocage de l\'utilisateur.' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const blockedId = parseInt(req.params.id);
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });

    await Friend.unblockUser(userId, blockedId);

    res.status(200).json({ message: 'Utilisateur débloqué.' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Erreur lors du déblocage de l\'utilisateur.' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const friendId = parseInt(req.params.id);
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });

    const success = await Friend.removeFriend(userId, friendId);
    if (!success) {
      return res.status(404).json({ error: 'Relation d\'amitié non trouvée.' });
    }

    const io = req.app.get('socketio');
    if (io) {
      io.to(`user-${friendId}`).emit('friendship_updated');
      io.to(`user-${userId}`).emit('friendship_updated');
    }

    res.status(200).json({ message: 'Ami supprimé.' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'ami.' });
  }
};