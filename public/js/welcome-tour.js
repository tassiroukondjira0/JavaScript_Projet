// Djokko — Welcome Tour : guide interactif pas à pas pour configurer le profil
(function () {
  const overlay = document.getElementById('welcome-tour');
  if (!overlay) return;

  const STORAGE_KEY = 'djokko_welcome_tour_seen';

  // Ne pas réafficher si déjà vu
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      overlay.remove();
      return;
    }
  } catch (e) {}

  // Étapes du tour
  const steps = [
    {
      title: '👋 Bienvenue sur Djokko !',
      description: 'Faisons un tour rapide pour personnaliser votre profil et découvrir les fonctionnalités principales.',
      highlight: null,
      action: null
    },
    {
      title: '📸 Photo de profil',
      description: 'Ajoutez une photo de profil pour que vos amis puissent vous reconnaître facilement.',
      highlight: 'profile-avatar-trigger',
      action: {
        text: 'Ajouter ma photo',
        url: '/profile'
      }
    },
    {
      title: '🖼️ Photo de couverture',
      description: 'Personnalisez votre profil avec une photo de couverture qui vous représente.',
      highlight: null,
      action: {
        text: 'Ajouter une couverture',
        url: '/profile'
      }
    },
    {
      title: '✏️ Bio',
      description: 'Rédigez une courte biographie pour parler de vous aux autres membres.',
      highlight: null,
      action: {
        text: 'Rédiger ma bio',
        url: '/profile'
      }
    },
    {
      title: '🏫 Établissement',
      description: 'Indiquez votre école, université ou entreprise pour retrouver vos connaissances.',
      highlight: null,
      action: {
        text: 'Ajouter mon établissement',
        url: '/profile'
      }
    },
    {
      title: '📍 Localisation',
      description: 'Partagez votre ville ou votre pays si vous le souhaitez.',
      highlight: null,
      action: {
        text: 'Ajouter ma localisation',
        url: '/profile'
      }
    },
    {
      title: '🚀 Prêt à explorer !',
      description: 'Votre profil est configuré. Vous pouvez maintenant publier, commenter, discuter avec vos amis et bien plus encore !',
      highlight: null,
      action: null
    }
  ];

  let currentStep = 0;

  function renderStep(index) {
    const step = steps[index];
    const total = steps.length;
    const progress = Math.round(((index + 1) / total) * 100);

    // Highlight element if specified
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    if (step.highlight) {
      const target = document.getElementById(step.highlight);
      if (target) {
        target.classList.add('tour-highlight');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const card = overlay.querySelector('.tour-card');
    if (!card) return;

    // Progress bar
    const progressBar = `<div class="tour-progress"><div class="tour-progress-bar" style="width:${progress}%"></div></div>`;

    // Step counter
    const counter = `<div class="tour-step-counter">Étape ${index + 1} sur ${total}</div>`;

    // Action button
    let actionBtn = '';
    if (step.action) {
      actionBtn = `<a href="${step.action.url}" class="btn btn-primary tour-action-btn">${step.action.text}</a>`;
    }

    // Navigation buttons
    let navBtns = '';
    if (index === 0) {
      navBtns = `
        <button type="button" class="btn btn-primary" id="tour-next">Commencer →</button>
        <button type="button" class="btn btn-ghost" id="tour-skip">Passer</button>
      `;
    } else if (index === total - 1) {
      navBtns = `
        <button type="button" class="btn btn-primary" id="tour-finish">Terminer ✓</button>
      `;
    } else {
      navBtns = `
        <button type="button" class="btn btn-ghost" id="tour-prev">← Retour</button>
        <button type="button" class="btn btn-primary" id="tour-next">Suivant →</button>
        <button type="button" class="btn btn-ghost" id="tour-skip">Passer</button>
      `;
    }

    card.innerHTML = `
      ${progressBar}
      ${counter}
      <h3>${step.title}</h3>
      <p class="muted">${step.description}</p>
      ${actionBtn ? `<div class="tour-action">${actionBtn}</div>` : ''}
      <div class="tour-nav">${navBtns}</div>
    `;

    // Attach event listeners
    const nextBtn = document.getElementById('tour-next');
    const prevBtn = document.getElementById('tour-prev');
    const skipBtn = document.getElementById('tour-skip');
    const finishBtn = document.getElementById('tour-finish');
    const actionBtns = card.querySelectorAll('.tour-action-btn');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (index < total - 1) {
          currentStep = index + 1;
          renderStep(currentStep);
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (index > 0) {
          currentStep = index - 1;
          renderStep(currentStep);
        }
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', close);
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', close);
    }

    // Action buttons navigate to profile page
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Don't close the tour, just navigate
        // The tour will be shown again when user comes back if not completed
      });
    });
  }

  function close() {
    overlay.style.display = 'none';
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  // Initialize
  renderStep(0);

  // Fermeture en cliquant en dehors de la carte
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
})();