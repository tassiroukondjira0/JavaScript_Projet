// Djokko — Inscription : sélecteur de pays, assemblage du numéro et confirmation du mot de passe

// Liste des pays africains avec drapeau (emoji) et indicatif
const COUNTRIES = [
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dial: '+212' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dial: '+216' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dial: '+213' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dial: '+225' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dial: '+229' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', dial: '+224' },
  { code: 'CD', name: 'RDC', flag: '🇨🇩', dial: '+243' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241' },
  { code: 'EG', name: 'Égypte', flag: '🇪🇬', dial: '+20' },
  { code: 'NG', name: 'Nigéria', flag: '🇳🇬', dial: '+234' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', dial: '+27' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', dial: '+244' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', dial: '+267' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', dial: '+257' },
  { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻', dial: '+238' },
  { code: 'KM', name: 'Comores', flag: '🇰🇲', dial: '+269' },
  { code: 'CG', name: 'Congo-Brazzaville', flag: '🇨🇬', dial: '+242' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dial: '+253' },
  { code: 'ER', name: 'Érythrée', flag: '🇪🇷', dial: '+291' },
  { code: 'ET', name: 'Éthiopie', flag: '🇪🇹', dial: '+251' },
  { code: 'GM', name: 'Gambie', flag: '🇬🇲', dial: '+220' },
  { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', dial: '+245' },
  { code: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶', dial: '+240' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', dial: '+266' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', dial: '+231' },
  { code: 'LY', name: 'Libye', flag: '🇱🇾', dial: '+218' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dial: '+261' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', dial: '+265' },
  { code: 'MR', name: 'Mauritanie', flag: '🇲🇷', dial: '+222' },
  { code: 'MU', name: 'Maurice', flag: '🇲🇺', dial: '+230' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dial: '+258' },
  { code: 'NA', name: 'Namibie', flag: '🇳🇦', dial: '+264' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dial: '+227' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '+250' },
  { code: 'ST', name: 'Sao Tomé-et-Principe', flag: '🇸🇹', dial: '+239' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨', dial: '+248' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dial: '+232' },
  { code: 'SO', name: 'Somalie', flag: '🇸🇴', dial: '+252' },
  { code: 'SS', name: 'Soudan du Sud', flag: '🇸🇸', dial: '+211' },
  { code: 'SD', name: 'Soudan', flag: '🇸🇩', dial: '+249' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', dial: '+268' },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', dial: '+255' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩', dial: '+235' },
  { code: 'UG', name: 'Ouganda', flag: '🇺🇬', dial: '+256' },
  { code: 'ZM', name: 'Zambie', flag: '🇿🇲', dial: '+260' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dial: '+263' },
  { code: 'CF', name: 'République centrafricaine', flag: '🇨🇫', dial: '+236' }
];

// Dédoublonnage par code+dial pour éviter les doublons (ex: US/CA +1, RU/KZ +7)
const UNIQUE_COUNTRIES = [];
const seen = new Set();
for (const c of COUNTRIES) {
  const key = c.code + c.dial;
  if (!seen.has(key)) {
    seen.add(key);
    UNIQUE_COUNTRIES.push(c);
  }
}
UNIQUE_COUNTRIES.sort((a, b) => a.name.localeCompare(b.name));

(function () {
  const toggle = document.getElementById('country-toggle');
  const list = document.getElementById('country-list');
  const flagEl = document.getElementById('selected-flag');
  const dialEl = document.getElementById('selected-dial');
  const codeInput = document.getElementById('country_code');
  const flagInput = document.getElementById('country_flag');
  const phoneInput = document.getElementById('phone');

  if (!toggle || !list) return;

  // Champ de recherche pour filtrer les pays
  const search = document.createElement('input');
  search.id = 'country-search';
  search.type = 'text';
  search.placeholder = 'Rechercher un pays…';
  search.className = 'country-search';
  search.autocomplete = 'off';

  // Insérer le champ de recherche en premier dans la liste déroulante
  list.appendChild(search);

  // Ajouter un séparateur visuel après la recherche
  const divider = document.createElement('li');
  divider.className = 'country-divider';
  divider.setAttribute('role', 'separator');
  list.appendChild(divider);

  search.hidden = false;
  divider.hidden = false;

  function renderList(filter = '') {
    // Retirer tous les éléments sauf la recherche et le séparateur
    while (list.children.length > 2) {
      list.removeChild(list.lastChild);
    }

    const f = filter.trim().toLowerCase();
    const filtered = UNIQUE_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(f) || c.dial.includes(f) || c.code.toLowerCase().includes(f)
    );

    if (filtered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'country-empty';
      empty.textContent = 'Aucun pays trouvé';
      empty.setAttribute('role', 'option');
      list.appendChild(empty);
      return;
    }

    filtered.forEach((c) => {
      const li = document.createElement('li');
      li.className = 'country-option';
      li.setAttribute('role', 'option');
      li.dataset.dial = c.dial;
      li.dataset.flag = c.flag;
      li.innerHTML = `<span class="c-flag">${c.flag}</span><span class="c-name">${c.name}</span><span class="c-dial">${c.dial}</span>`;
      li.addEventListener('click', () => selectCountry(c));
      list.appendChild(li);
    });
  }

  function selectCountry(c) {
    flagEl.textContent = c.flag;
    dialEl.textContent = c.dial;
    codeInput.value = c.dial;
    flagInput.value = c.flag;
    hideDropdown();
    if (phoneInput) phoneInput.focus();
  }

  function hideDropdown() {
    list.hidden = true;
    search.hidden = true;
    divider.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  function showDropdown() {
    list.hidden = false;
    search.hidden = false;
    divider.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    renderList();
    search.value = '';
    search.focus();
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (list.hidden) {
      showDropdown();
    } else {
      hideDropdown();
    }
  });

  // Recherche dans la liste
  search.addEventListener('input', (e) => {
    renderList(e.target.value);
    e.stopPropagation();
  });

  search.addEventListener('click', (e) => e.stopPropagation());

  // Navigation clavier dans la liste
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = list.querySelector('.country-option');
      if (first) first.focus();
    }
    if (e.key === 'Escape') {
      hideDropdown();
      toggle.focus();
    }
  });

  // Navigation clavier sur les options
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = Array.from(list.querySelectorAll('.country-option'));
      const idx = items.indexOf(e.target);
      const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
      if (items[next]) items[next].focus();
    }
    if (e.key === 'Escape') {
      hideDropdown();
      toggle.focus();
    }
    if (e.key === 'Enter') {
      e.target.click();
    }
  });

  // Fermer le dropdown quand on clique en dehors
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !list.contains(e.target)) {
      hideDropdown();
    }
  });

  // Confirmation du mot de passe
  const form = document.getElementById('register-form');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm_password');
  const mismatch = document.getElementById('password-mismatch');

  function checkMatch() {
    if (!confirm.value) {
      mismatch.hidden = true;
      return true;
    }
    const ok = password.value === confirm.value;
    mismatch.hidden = ok;
    return ok;
  }

  if (form && password && confirm) {
    confirm.addEventListener('input', checkMatch);
    password.addEventListener('input', checkMatch);
    form.addEventListener('submit', (e) => {
      if (!checkMatch()) {
        e.preventDefault();
        mismatch.hidden = false;
        confirm.focus();
        return;
      }
      // Normalise le numéro de téléphone (supprime espaces, points, tirets)
      if (phoneInput) {
        phoneInput.value = phoneInput.value.replace(/[\s.\-()]/g, '');
      }
    });
  }

  // Afficher / masquer les mots de passe
  document.querySelectorAll('.affix-btn[data-target]').forEach((btn) => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    btn.addEventListener('click', () => {
      const show = target.type === 'password';
      target.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁️';
    });
  });
})();
