async function loadActivity() {
  const list = document.getElementById('activity-list');
  if (!list) return;

  const refreshBtn = document.getElementById('btn-refresh-activity');

  try {
    const res = await fetch('/api/activity');
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 40px;">
        <p style="color: var(--text-muted);">Aucune activité pour le moment.</p>
      </div>`;
      return;
    }

    list.innerHTML = rows.map(r => {
      const meta = (() => {
        try {
          if (!r.metadata) return null;
          return JSON.parse(r.metadata);
        } catch {
          return r.metadata;
        }
      })();

      const metaText = meta && typeof meta === 'object'
        ? Object.entries(meta).slice(0, 4).map(([k,v]) => `${k}: ${String(v)}`).join(' • ')
        : (meta ? String(meta) : '');

      const entity = r.entity_type ? `${r.entity_type}${r.entity_id ? `#${r.entity_id}` : ''}` : '';

      return `
        <div class="notification-item" style="cursor: default;">
          <div style="width:40px; height:40px; border-radius:12px; background: rgba(var(--primary-rgb),0.12); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">
            🧾
          </div>
          <div class="notification-info" style="flex:1;">
            <div class="notification-text" style="font-weight:700;">
              ${escapeHtml(r.action_type)}${entity ? ` — ${escapeHtml(entity)}` : ''}
            </div>
            <div style="font-size:0.8rem; color: var(--text-muted); margin-top:4px;">
              ${escapeHtml(formatTime(r.created_at))}
              ${metaText ? ` • ${escapeHtml(metaText)}` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('loadActivity error:', e);
    list.innerHTML = `<div style="text-align: center; padding: 40px;">
      <p style="color: var(--danger-color);">Erreur lors du chargement.</p>
    </div>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  return `Il y a ${diffDays} j`;
}

document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('btn-refresh-activity');
  if (refreshBtn) refreshBtn.addEventListener('click', loadActivity);
  loadActivity();
});

