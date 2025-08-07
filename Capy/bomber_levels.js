(() => {
  /**
   * Gestionnaire de sélection de niveaux pour Bomber Capy.  Cette page
   * présente une grille de boutons numérotés.  Chaque niveau terminé
   * déverrouille le suivant.  La progression est conservée dans
   * localStorage sous la clé bomberCapyUnlockedLevel.  Lorsqu’un
   * niveau est sélectionné, le script enregistre la valeur dans
   * bomberCapySelectedLevel et redirige vers bomber.html.
   */
  const gridEl = document.getElementById('bomber-level-grid');
  const backBtn = document.getElementById('bomber-level-back');
  // Nombre total de niveaux disponibles.  Trois niveaux sont inclus
  // dans cette version ; ajouter de nouvelles valeurs pour plus de
  // diversité.
  const TOTAL_LEVELS = 3;
  // Charger le niveau le plus haut débloqué
  let unlocked = 1;
  try {
    const stored = localStorage.getItem('bomberCapyUnlockedLevel');
    if (stored !== null) {
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n >= 1) unlocked = Math.max(unlocked, n);
    }
  } catch (e) {}
  // Générer les boutons
  function createButtons() {
    gridEl.innerHTML = '';
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const btn = document.createElement('button');
      btn.className = 'level-button';
      btn.textContent = String(i);
      if (i > unlocked) {
        btn.disabled = true;
        btn.classList.add('level-locked');
      }
      btn.addEventListener('click', () => {
        try {
          localStorage.setItem('bomberCapySelectedLevel', i);
        } catch (e) {}
        window.location.href = 'bomber.html';
      });
      gridEl.appendChild(btn);
    }
  }
  // Bouton retour au menu
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Revenir au menu principal situé dans Capy (un niveau au-dessus)
      window.location.href = '../Capy/games.html';
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    createButtons();
  });
})();