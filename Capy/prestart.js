(() => {
  /**
   * Script générique pour afficher une fenêtre de pré‑lancement sur toutes
   * les pages de jeux.  Cette fenêtre demande au joueur s’il souhaite
   * commencer la partie ou retourner au menu.  Elle garantit également
   * un délai d’environ 500 ms avant le démarrage effectif du jeu afin de
   * laisser le temps aux assets de se charger.
   */
  /**
   * Fonction qui crée et affiche l’overlay de pré‑lancement.  Elle est
   * appelée soit lors de l’événement DOMContentLoaded si le script est
   * chargé avant que le DOM soit prêt, soit immédiatement si le DOM est
   * déjà chargé au moment où le script est exécuté.  Cela garantit que
   * l’overlay apparaît correctement même lorsque prestart.js est ajouté à
   * la fin du document.
   */
  function showPrestartOverlay() {
    // Ne rien faire sur la page d’accueil afin de ne pas bloquer le menu.
    if (document.body && document.body.id === 'capy-home') return;
    // Si l’overlay existe déjà, ne pas en créer un second.
    if (document.querySelector('.prestart-overlay')) return;
    // Créer l’overlay et son contenu.
    const overlay = document.createElement('div');
    overlay.className = 'prestart-overlay';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const h = document.createElement('h2');
    h.textContent = 'Prêt à jouer ?';
    const p = document.createElement('p');
    p.textContent = 'Cliquez sur jouer lorsque vous êtes prêt, ou revenez au menu.';
    const playBtn = document.createElement('button');
    playBtn.textContent = 'Jouer';
    playBtn.className = 'btn';
    const menuBtn = document.createElement('button');
    menuBtn.textContent = 'Menu';
    menuBtn.className = 'btn';
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '12px';
    btnGroup.style.justifyContent = 'center';
    btnGroup.style.marginTop = '12px';
    btnGroup.appendChild(playBtn);
    btnGroup.appendChild(menuBtn);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(btnGroup);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    // Lien vers le menu principal
    menuBtn.addEventListener('click', () => {
      window.location.href = '../Capy/games.html';
    });
    // Démarrage du jeu après un délai plus court.  Afin de rendre
    // l’attente moins perceptible, le délai passe de 500 ms à 200 ms.
    playBtn.addEventListener('click', () => {
      setTimeout(() => {
        overlay.remove();
      }, 200);
    });
  }
  // Vérifier l’état du document : si le DOM est prêt, afficher tout de
  // suite l’overlay.  Sinon, attendre l’événement DOMContentLoaded.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    showPrestartOverlay();
  } else {
    document.addEventListener('DOMContentLoaded', showPrestartOverlay);
  }
})();