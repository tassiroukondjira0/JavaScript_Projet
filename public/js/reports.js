document.addEventListener('DOMContentLoaded', () => {
  const reportsList = document.getElementById('reports-list');
  if (!reportsList) return;

  async function loadReports() {
    try {
      const res = await fetch('/api/reports/all');
      if (!res.ok) return;

      const reports = await res.json();

      if (reports.length === 0) {
        reportsList.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Aucun signalement</td></tr>`;
        return;
      }

      reportsList.innerHTML = reports.map(r => {
        const statusColors = {
          pending: 'rgba(61,114,240,0.95)',
          accepted: 'rgba(23,169,122,0.95)',
          rejected: 'rgba(229,72,77,0.95)',
          dismissed: 'rgba(148,163,184,0.95)'
        };
        const statusColor = statusColors[r.status] || 'rgba(148,163,184,0.95)';
        const statusLabel = r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Inconnu';

        return `
          <tr id="report-row-${r.id}">
            <td>${r.id}</td>
            <td>${r.entity_type}</td>
            <td>${r.entity_id}</td>
            <td>${r.reason || ''}</td>
            <td>${r.reporter_id}</td>
            <td><span style="display:inline-block; width:10px; height:10px; border-radius:999px; background:${statusColor}; margin-right:6px;"></span>${statusLabel}</td>
            <td>
              ${r.status === 'pending' ? `
                <button class="btn btn-primary btn-accept-report" data-id="${r.id}" style="padding: 6px 12px; font-size: 0.8rem; margin-right: 4px;">Traiter</button>
                <button class="btn btn-danger btn-reject-report" data-id="${r.id}" style="padding: 6px 12px; font-size: 0.8rem;">Rejeter</button>
              ` : '<span style="color: var(--text-muted); font-size: 0.85rem;">Clôturé</span>'}
            </td>
          </tr>
        `;
      }).join('');

      reportsList.querySelectorAll('.btn-accept-report').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          await moderateReport(id, 'accepted');
        });
      });

      reportsList.querySelectorAll('.btn-reject-report').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          await moderateReport(id, 'rejected');
        });
      });

    } catch (err) {
      console.error('Error loading reports:', err);
    }
  }

  async function moderateReport(reportId, status) {
    try {
      const res = await fetch(`/api/reports/${reportId}/moderate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const row = document.getElementById(`report-row-${reportId}`);
        if (row) loadReports();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de la modération.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  loadReports();
});