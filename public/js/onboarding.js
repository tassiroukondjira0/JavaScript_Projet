/* Djokko onboarding (first usage assistant)
   Trigger: user has no posts yet.
*/

(function () {
  function hasShownKey(userId) {
    return `djokko_onboarding_shown_${userId}`;
  }

  async function fetchMyUsageStatus() {
    const res = await fetch('/api/onboarding/status');
    if (!res.ok) return null;
    return await res.json();
  }

  function buildOverlay(step, totalSteps) {
    const overlay = document.createElement('div');
    overlay.id = 'djokko-onboarding-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.style.zIndex = '20000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '18px';

    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.maxWidth = '720px';
    card.style.width = '100%';
    card.style.padding = '22px';
    card.style.boxShadow = 'var(--shadow-lg)';

    const stepTitle = {
      1: { fr: 'Bienvenue 👋', en: 'Welcome 👋' },
      2: { fr: 'Étape 1 — Ajoutez une photo', en: 'Step 1 — Add a photo' },
      3: { fr: 'Étape 2 — Complétez votre biographie', en: 'Step 2 — Complete your bio' },
      4: { fr: 'Étape 3 — Faites votre première publication', en: 'Step 3 — Make your first post' }
    };

    const dict = {
      fr: {
        subtitle: 'Partagez, échangez, connectez-vous.',
        progressLabel: `Étape ${step} / ${totalSteps}`,
        close: 'Fermer',
        next: 'Continuer',
        goProfile: 'Aller au profil',
        goFeed: 'Aller au fil d’actualité'
      },
      en: {
        subtitle: 'Share, exchange, connect.',
        progressLabel: `Step ${step} / ${totalSteps}`,
        close: 'Close',
        next: 'Continue',
        goProfile: 'Go to profile',
        goFeed: 'Go to feed'
      }
    };

    const lang = document.documentElement.lang === 'en' ? 'en' : 'fr';

    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap: 12px; margin-bottom: 8px;">
        <div style="display:flex; align-items:center; gap: 12px;">
          <div style="width:44px; height:44px; border-radius: 14px; background: var(--surface-soft); display:flex; align-items:center; justify-content:center; border: 1px solid var(--border-color);">
            🎉
          </div>
          <div>
            <div style="font-weight: 900; font-size: 1.1rem;">${(stepTitle[step] ? stepTitle[step][lang] : stepTitle[2].fr)}</div>
            <div style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">${dict[lang].subtitle}</div>
          </div>
        </div>
        <div style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700;">${dict[lang].progressLabel}</div>
      </div>

      <div style="margin-top: 12px; color: var(--text-main);">
        ${renderStepBody(step, lang)}
      </div>

      <div style="display:flex; gap: 10px; justify-content:flex-end; margin-top: 18px; flex-wrap: wrap;">
        <button id="djokko-onboarding-close" class="btn btn-secondary" style="padding: 8px 16px;">${dict[lang].close}</button>
        <button id="djokko-onboarding-next" class="btn btn-primary" style="padding: 8px 16px;">${dict[lang].next}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    return overlay;
  }

  function renderStepBody(step, lang) {
    if (step === 2) {
      return `
        <div class="glass-card" style="padding: 14px; background: var(--veil); border-color: var(--veil-strong);">
          <div style="font-weight: 800; margin-bottom: 6px;">${lang === 'en' ? 'Add your profile photo' : 'Ajoutez votre photo de profil'}</div>
          <div style="color: var(--text-muted); font-size: 0.92rem;">${lang === 'en' ? 'This helps people recognize you.' : 'Cela aide les autres à vous reconnaître.'}</div>
          <div style="margin-top: 12px;">${renderQuickLink('profile', lang)}</div>
        </div>
      `;
    }
    if (step === 3) {
      return `
        <div class="glass-card" style="padding: 14px; background: var(--veil); border-color: var(--veil-strong);">
          <div style="font-weight: 800; margin-bottom: 6px;">${lang === 'en' ? 'Write your bio' : 'Rédigez votre biographie'}</div>
          <div style="color: var(--text-muted); font-size: 0.92rem;">${lang === 'en' ? 'Tell others what you like.' : 'Dites aux autres ce que vous aimez.'}</div>
          <div style="margin-top: 12px;">${renderQuickLink('profile', lang)}</div>
        </div>
      `;
    }
    if (step === 4) {
      return `
        <div class="glass-card" style="padding: 14px; background: var(--veil); border-color: var(--veil-strong);">
          <div style="font-weight: 800; margin-bottom: 6px;">${lang === 'en' ? 'Post something!' : 'Publiez votre premier post !'}</div>
          <div style="color: var(--text-muted); font-size: 0.92rem;">${lang === 'en' ? 'A simple message is enough.' : 'Un message simple suffit.'}</div>
          <div style="margin-top: 12px;">${renderQuickLink('feed', lang)}</div>
        </div>
      `;
    }

    // step 1 intro (not used as body here)
    return `
      <div class="glass-card" style="padding: 14px; background: var(--veil); border-color: var(--veil-strong);">
        <div style="font-weight: 800; margin-bottom: 6px;">${lang === 'en' ? 'Let’s get you started' : 'On y va, en 3 étapes'}</div>
        <div style="color: var(--text-muted); font-size: 0.92rem;">${lang === 'en' ? 'A quick setup to feel at home.' : 'Un petit setup pour être à l’aise.'}</div>
      </div>
    `;
  }

  function renderQuickLink(target, lang) {
    const isProfile = target === 'profile';
    const label = lang === 'en' ? (isProfile ? 'Go to profile' : 'Go to feed') : (isProfile ? 'Aller au profil' : 'Aller au fil d’actualité');
    const href = isProfile ? `/profile/${window.currentUser && window.currentUser.id ? window.currentUser.id : ''}`.replace(/\/$/, '') : '/feed';
    // If href ends without id, just fallback to /profile/1 won't work, but we still show proper action below.
    return `
      <a class="btn btn-secondary" style="padding: 8px 16px; text-decoration:none;" href="${href}">${label}</a>
    `;
  }

  function markShown(userId) {
    try {
      window.localStorage.setItem(hasShownKey(userId), '1');
    } catch (_) {}
  }

  function isShown(userId) {
    try {
      return window.localStorage.getItem(hasShownKey(userId)) === '1';
    } catch (_) {
      return false;
    }
  }

  async function start() {
    if (!window.currentUser || !window.currentUser.id) return;

    const userId = window.currentUser.id;
    if (isShown(userId)) return;

    const status = await fetchMyUsageStatus();
    if (!status || !status.should_show) return;

    // We use 3-step assistant:
    // Step 1: welcome only (hidden in UI), then 2/3/4.
// Choisir l’étape la plus pertinente selon l’état réel (photo/bio/posts)
    let step = 2; // par défaut: photo
    if (status) {
      if (!status.hasPhoto) step = 2;
      else if (!status.hasBio) step = 3;
      else step = 4; // prêt pour la première publication
    }

    const overlay = buildOverlay(step, 4);


    const closeBtn = document.getElementById('djokko-onboarding-close');
    const nextBtn = document.getElementById('djokko-onboarding-next');

    closeBtn.addEventListener('click', () => {
      overlay.remove();
      markShown(userId);
    });

    nextBtn.addEventListener('click', () => {
      step++;
      overlay.remove();

      if (step <= 4) {
        const newOverlay = buildOverlay(step, 4);
        wire(newOverlay);
        // if finished at step 4, mark shown when closing via next
        if (step === 4) {
          // after step 4, next will close + mark
          const newNext = document.getElementById('djokko-onboarding-next');
          newNext.addEventListener('click', () => {
            newOverlay.remove();
            markShown(userId);
          }, { once: true });
          const newClose = document.getElementById('djokko-onboarding-close');
          newClose.addEventListener('click', () => {
            markShown(userId);
          }, { once: true });
        }
      }
    });

    function wire(currentOverlay) {
      // keep close behavior consistent
      const c = document.getElementById('djokko-onboarding-close');
      if (c) {
        c.addEventListener('click', () => {
          currentOverlay.remove();
          markShown(userId);
        }, { once: true });
      }
    }

    // auto-route convenience: if on feed page and step says profile, keep user. (no forced redirect)
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Main layout may load window.currentUser slightly after DOMContentLoaded.
    const t = setInterval(() => {
      if (window.currentUser && window.currentUser.id) {
        clearInterval(t);
        start();
      }
    }, 100);

    setTimeout(() => clearInterval(t), 5000);
  });
})();

