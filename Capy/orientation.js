//
// orientation.js
//
// Ce script gère l'affichage d'un message invitant l'utilisateur
// à orienter son appareil en mode paysage pour certains jeux qui
// nécessitent une vue horizontale (par exemple Flying Capy, Running
// Capy, Platform, Super Capy, etc.).  Pour les pages qui ne
// nécessitent pas de mode paysage (courgette.html, index.html,
// capygames.html), l'attribut data-force-landscape du corps est
// défini à "false" et aucune restriction n'est appliquée.  Sur
// courgette.html, le redimensionnement est géré par une fonction
// globale resize() définie dans courgette.js.

(() => {
  function checkOrientation() {
    const forceLandscape = document.body.dataset.forceLandscape === 'true';
    const isPortrait = window.innerHeight > window.innerWidth;
    const warningEl = document.getElementById('orientation-warning');
    if (!warningEl) return;
    if (forceLandscape) {
      if (isPortrait) {
        // Afficher l'avertissement et mettre en pause toute animation
        warningEl.classList.remove('hidden');
      } else {
        warningEl.classList.add('hidden');
      }
    } else {
      // Pages non bloquées : aucune superposition, mais adapter
      // éventuellement la mise en page via une fonction resize()
      warningEl.classList.add('hidden');
      if (typeof window.resize === 'function') {
        try {
          window.resize();
        } catch (e) {
          // ignore errors
        }
      }
    }
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  document.addEventListener('DOMContentLoaded', checkOrientation);
})();