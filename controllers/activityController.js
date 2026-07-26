const ActivityLog = require('../models/ActivityLog');

exports.getMyActivity = async (req, res) => {
  try {
    const userId = req.session?.user?.id || req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' });
    const rows = await ActivityLog.getByUserId(userId, 200);
    res.status(200).json(rows);
  } catch (error) {
    console.error('getMyActivity error:', error);
    res.status(500).json({ error: "Erreur lors de la récupération du journal d'activité." });
  }
};

exports.getAdminActivity = async (req, res) => {
  try {
    const rows = await ActivityLog.getAll({ limit: 500 });
    res.status(200).json(rows);
  } catch (error) {
    console.error('getAdminActivity error:', error);
    res.status(500).json({ error: "Erreur lors de la récupération du journal d'activité." });
  }
};

