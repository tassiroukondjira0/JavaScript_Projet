const { getDB } = require('../config/db');

async function exportMyData(req, res) {
  const userId = req.session?.user?.id || req.user?.userId || req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const db = getDB();

    // Get user info
    const [users] = await db.execute(
      'SELECT id, fullname, email, username, bio, city, country, phone, date_of_birth, created_at FROM users WHERE id = ?',
      [userId]
    );

    // Get posts
    const [posts] = await db.execute(
      'SELECT id, content, image, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // Get comments
    const [comments] = await db.execute(
      'SELECT c.id, c.content, c.post_id, c.created_at FROM comments c WHERE c.user_id = ? ORDER BY c.created_at DESC',
      [userId]
    );

    // Get friends
    const [friends] = await db.execute(
      `SELECT u.id, u.fullname, u.email, f.status, f.created_at
       FROM friends f
       JOIN users u ON (u.id = f.user_id OR u.id = f.friend_id)
       WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ?
       ORDER BY f.created_at DESC`,
      [userId, userId, userId]
    );

    // Get activity log
    const [activities] = await db.execute(
      'SELECT action_type, entity_type, entity_id, created_at FROM activity_log WHERE actor_user_id = ? ORDER BY created_at DESC LIMIT 100',
      [userId]
    );

    const exportData = {
      exported_at: new Date().toISOString(),
      user: users[0] || null,
      posts_count: posts.length,
      posts,
      comments_count: comments.length,
      comments,
      friends_count: friends.length,
      friends,
      recent_activity: activities
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="djokko-export-${userId}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Erreur lors de l\'exportation' });
  }
}

module.exports = { exportMyData };
