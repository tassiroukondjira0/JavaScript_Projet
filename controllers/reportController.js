const Report = require('../models/Report');
const { logActivity } = require('../utils/activityLogger');


exports.reportPostOrComment = async (req, res) => {
  try {
    const reporterId = req.user?.userId || req.session?.userId;
    const { entity_type, entity_id, reason } = req.body;

    if (!reporterId) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    if (!entity_type || !entity_id) {
      return res.status(400).json({ error: 'Type et identifiant de l\'élément à signaler sont requis.' });
    }

    const normalizedType = String(entity_type).toLowerCase();
    if (!['post', 'comment'].includes(normalizedType)) {
      return res.status(400).json({ error: 'entity_type invalide (post|comment).' });
    }

    const normalizedReason = (reason || '').trim();
    if (!normalizedReason || normalizedReason.length < 4) {
      return res.status(400).json({ error: 'Raison trop courte (min 4 caractères).' });
    }

    const reportId = await Report.create({
      reporter_id: reporterId,
      entity_type: normalizedType,
      entity_id: parseInt(entity_id),
      reason: normalizedReason
    });

    await logActivity({
      actor_user_id: reporterId,
      action_type: 'report_created',
      entity_type: 'report',
      entity_id: reportId,
      metadata: { entity_type: normalizedType, entity_id: parseInt(entity_id) }
    });

    res.status(201).json({
      message: 'Signalement envoyé avec succès.',
      reportId
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Erreur lors du signalement.' });
  }
};

exports.getPendingReports = async (req, res) => {
  try {
    const pending = await Report.getPending();
    res.status(200).json(pending);
  } catch (error) {
    console.error('Error getting pending reports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des signalements.' });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const all = await Report.getAll();
    res.status(200).json(all);
  } catch (error) {
    console.error('Error getting all reports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des signalements.' });
  }
};

exports.moderateReport = async (req, res) => {
  try {
    const adminId = req.user?.userId || req.session?.userId;
    if (!adminId) return res.status(401).json({ error: 'Non authentifié.' });

    const reportId = parseInt(req.params.id);
    const { status } = req.body;

    if (![ 'pending', 'accepted', 'rejected', 'dismissed' ].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    const ok = await Report.setStatus(reportId, status);
    if (!ok) return res.status(404).json({ error: 'Signalement introuvable.' });

    await logActivity({
      actor_user_id: adminId,
      action_type: 'report_moderated',
      entity_type: 'report',
      entity_id: reportId,
      metadata: { status }
    });

    res.status(200).json({ message: 'Signalement mis à jour.' });

  } catch (error) {
    console.error('Error moderating report:', error);
    res.status(500).json({ error: 'Erreur lors de la modération.' });
  }
};

