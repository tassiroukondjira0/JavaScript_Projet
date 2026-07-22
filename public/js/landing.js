/* Djokko landing page: theme + small identity animations */

(function () {
  function applyTheme(theme) {
    const finalTheme = theme === 'light' || theme === 'dark' ? theme : 'dark';
    document.documentElement.dataset.theme = finalTheme;
    try {
      window.localStorage.setItem('theme', finalTheme);
    } catch (_) {}
  }

  function initThemeControls() {
    const btn = document.getElementById('btn-toggle-theme');
    if (!btn) return;


    const t = window.__DJOKKO_T__ || {};
    const toggleThemeAria = t.toggleThemeAria || ((theme) => `Toggle theme (currently ${theme})`);
    const themeDarkTitle = t.themeDarkTitle || 'Mode sombre';
    const themeLightTitle = t.themeLightTitle || 'Mode clair';


    const saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
    } else {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(prefersLight ? 'light' : 'dark');
    }

    const updateBtnLabel = () => {
      const theme = document.documentElement.dataset.theme || 'dark';
      btn.setAttribute(
        'aria-label',
        typeof toggleThemeAria === 'function'
          ? toggleThemeAria(theme)
          : (toggleThemeAria || `Toggle theme (currently ${theme})`)
      );
      btn.title = theme === 'light' ? themeDarkTitle : themeLightTitle;
      btn.dataset.state = theme;
    };

    updateBtnLabel();

    btn.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      updateBtnLabel();
    });
  }

  function initMicroAnimations() {
    const hero = document.getElementById('landing-hero');

    // Add a very subtle parallax-like tilt on hero from cursor movement
    if (hero) {
      const applyTilt = (evt) => {
        const rect = hero.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotateX = ((y - cy) / cy) * -2.5;
        const rotateY = ((x - cx) / cx) * 2.5;
        hero.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      };

      const resetTilt = () => {
        hero.style.transition = 'transform .4s ease';
        hero.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
        setTimeout(() => { hero.style.transition = ''; }, 400);
      };

      hero.addEventListener('mousemove', applyTilt);
      hero.addEventListener('mouseleave', resetTilt);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initThemeControls();
    initMicroAnimations();

    // Ensure initial CSS theme is set even before CSS loads completely.
    const saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') applyTheme(saved);
  });
})();