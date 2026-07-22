const ActivityLog = require('../models/ActivityLog');

function safeMeta(meta) {
  // Store as plain object; stringify happens in model.
  if (!meta || typeof meta !== 'object') return meta ?? null;
  return meta;
}

async function logActivity({ actor_user_id, action_type, entity_type = null, entity_id = null, metadata = null }) {
  try {
    return await ActivityLog.create({
      actor_user_id,
      action_type,
      entity_type,
      entity_id,
      metadata: safeMeta(metadata)
    });
  } catch (e) {
    // Never break main flows because of audit logging.
    console.error('[activityLogger] failed:', e && e.message ? e.message : e);
    return null;
  }
}

module.exports = { logActivity };

