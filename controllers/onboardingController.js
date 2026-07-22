const { getDB } = require('../config/db');

exports.getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.session?.userId || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    // Step 2 choice: first usage based on activity.
    // If the user has no posts yet -> show assistant.
    const [rows] = await getDB().query('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [userId]);
    const postsCount = rows?.[0]?.count ?? 0;

    // Also consider profile photo/bio completeness for step guidance later (optional).
    const [u] = await getDB().query('SELECT profile_picture, bio FROM users WHERE id = ?', [userId]);
    const user = u?.[0] || null;

    const hasPhoto = !!(user && user.profile_picture);
    const hasBio = !!(user && user.bio && String(user.bio).trim().length > 0);

    return res.status(200).json({
      should_show: postsCount === 0,
      postsCount,
      hasPhoto,
      hasBio
    });
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du statut onboarding.' });
  }
};

