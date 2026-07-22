/* Admin graphs (simple) */

(function () {
  function toChartLabel(dateStr) {
    // dateStr: YYYY-MM-DD
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  function renderStatusBars(container, byStatus) {
    if (!container) return;

    const total = (byStatus.active || 0) + (byStatus.pending || 0) + (byStatus.suspended || 0);
    const fmt = (n) => String(n ?? 0);

    const mkRow = (key, label, color) => {
      const value = byStatus[key] || 0;
      const pct = total > 0 ? Math.round((value * 100) / total) : 0;
      return `
        <div class="admin-status-row">
          <div class="admin-status-label" style="display:flex; align-items:center; gap:10px;">
            <span class="admin-status-dot" style="width:10px; height:10px; border-radius:999px; background:${color}; display:inline-block;"></span>
            <span style="font-weight:700;">${label}</span>
          </div>
          <div style="margin-left:auto; font-weight:700;">${fmt(value)} (${pct}%)</div>
          <div class="admin-status-track">
            <div class="admin-status-fill" style="width:${pct}%; background:${color};"></div>
          </div>
        </div>
      `;
    };

    container.innerHTML = mkRow('active', 'Actifs', 'rgba(23,169,122,0.95)') +
      mkRow('pending', 'En attente', 'rgba(61,114,240,0.95)') +
      mkRow('suspended', 'Suspendus', 'rgba(229,72,77,0.95)');
  }

  function renderSignupBars(container, series) {
    if (!container) return;

    // series: [{date:'YYYY-MM-DD', count:Number}]
    const max = Math.max(1, ...(series.map(s => Number(s.count) || 0)));

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'admin-signup-bars-wrapper';

    series.forEach((s) => {
      const count = Number(s.count) || 0;
      const pct = (count * 100) / max;

      const col = document.createElement('div');
      col.className = 'admin-signup-col';
      col.title = `${s.date} : ${count}`;
      col.style.setProperty('--col-height', `${pct}%`);

      const label = document.createElement('div');
      label.className = 'admin-signup-col-label';
      label.textContent = toChartLabel(s.date);

      const bar = document.createElement('div');
      bar.className = 'admin-signup-bar';
      bar.style.height = `${pct}%`;

      col.appendChild(bar);
      col.appendChild(label);
      wrapper.appendChild(col);
    });

    container.appendChild(wrapper);
  }

  async function init() {
    const containerStatus = document.getElementById('admin-status-container');
    const containerSignup = document.getElementById('admin-signups-container');
    if (!containerStatus && !containerSignup) return;

    let stats;
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) return;
      stats = await res.json();
    } catch (e) {
      console.error('admin charts load failed', e);
      return;
    }

    if (stats.byStatus) renderStatusBars(containerStatus, stats.byStatus);
    if (stats.signups30d) renderSignupBars(containerSignup, stats.signups30d);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

