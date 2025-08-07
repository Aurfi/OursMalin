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
  function triggerResize() {
    if (typeof window.resize === 'function') {
      try {
        window.resize();
      } catch (e) {
        // ignore errors
      }
    }
  }
  window.addEventListener('resize', triggerResize);
  document.addEventListener('DOMContentLoaded', triggerResize);
})();