(function () {
  const key = 'djokko_first_login';
  const seen = localStorage.getItem(key);

  if (seen) return;

  localStorage.setItem(key, '1');

  const steps = [
    { title: 'Bienvenue sur Djokko', text: 'Découvrez votre fil d’actualité et publiez du contenu.' },
    { title: 'Messagerie', text: 'Utilisez le chat pour discuter en temps réel.' },
    { title: 'Profil', text: 'Personnalisez votre avatar, bio et couverture.' }
  ];

  let i = 0;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:flex;align-items:center;justify-content:center;';
  document.body.appendChild(overlay);

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--card);color:var(--text);padding:18px;border-radius:12px;max-width:420px;width:90%;z-index:9999;';
  overlay.appendChild(box);

  function render() {
    const s = steps[i];
    box.innerHTML = `<h3>${s.title}</h3><p>${s.text}</p>
      <div style="display:flex;justify-content:space-between;margin-top:10px;">
        <button id="wtPrev" class="btn">Précédent</button>
        <button id="wtNext" class="btn btn-primary">${i===steps.length-1?'Terminer':'Suivant'}</button>
      </div>`;
    document.getElementById('wtPrev').onclick = () => { if (i>0) { i--; render(); } };
    document.getElementById('wtNext').onclick = () => { if (i<steps.length-1) { i++; render(); } else { overlay.remove(); } };
  }

  render();
})();