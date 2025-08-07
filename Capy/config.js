// Configurations globales pour Capy Games
// Ce fichier définit des variables utilisées par tous les jeux pour ajuster
// leur vitesse indépendamment du rafraîchissement de l'écran.  Le fait
// d'augmenter la vitesse permet d'accélérer les déplacements et les
// apparitions des obstacles sans dépendre du nombre de FPS du navigateur.

// Facteur de vitesse global appliqué à l'ensemble des jeux.  Cette valeur
// constitue une base qui sera ensuite ajustée en fonction du taux de
// rafraîchissement réel du périphérique.  Une valeur de 2.35 permet
// d'accélérer sensiblement les jeux sur des écrans 60 Hz tout en restant
// agréable.  Ne modifiez pas cette constante directement : utilisez le
// menu des options ou laissez le système d'auto‑mesure adapter la vitesse.
window.BASE_SPEED_MULTIPLIER = 2.35;

// Initialiser le multiplicateur global avec la valeur de base.  Ce
// multiplicateur sera recalculé dynamiquement après la mesure du
// rafraîchissement d'écran.
window.GLOBAL_SPEED_MULTIPLIER = window.BASE_SPEED_MULTIPLIER;

// Tableau contenant des multiplicateurs de vitesse spécifiques à chaque
// mini‑jeu.  Si un jeu n'est pas listé ici, son multiplicateur est 1.
// Multiplicateurs de vitesse par jeu.  Pour rendre certains mini‑jeux
// un peu plus dynamiques, leur vitesse de base est augmentée de 10 %.
// Ces valeurs se multiplient avec GLOBAL_SPEED_MULTIPLIER pour obtenir
// la vitesse effective.  Par exemple, flappy, runner et energy sont
// accélérés de 10 % (1.1) tandis que les autres restent à 1.
window.GAME_SPEEDS = {
  // Flying Capy : vitesse augmentée de 35 % pour rendre le jeu plus
  // dynamique.  La valeur 1.35 est appliquée au multiplicateur global.
  // Flying Capy : vitesse augmentée d'environ 35 % pour rendre le jeu
  // dynamique.  On applique un gain supplémentaire de 10 % pour accélérer
  // l'ensemble des jeux d'arcade.
  flappy: 1.35 * 1.1,
  // Running Capy, Ragon électrique : légère augmentation ajustée par
  // un facteur supplémentaire de 10 %.
  runner: 1.1 * 1.1,
  energy: 1.1 * 1.1,
  // Plateforme et Courgette Crush ne nécessitent pas de vitesse supplémentaire
  platform: 1 * 1.1,
  courgette: 1 * 1.1
  ,
  // Capy Catch : vitesse par défaut.  Ce jeu utilise la même
  // accélération que la plupart des jeux sauf Flappy.  Les objets
  // tombent plus vite si GLOBAL_SPEED_MULTIPLIER est élevé.
  // Capy Catch : accélération doublée pour rendre le jeu plus
  // dynamique conformément aux retours utilisateur.
  catch: 2 * 1.1
  ,
  // Capy Tap : vitesse par défaut.  La cadence d’apparition des
  // légumes s’ajuste automatiquement via le multiplicateur global.
  tap: 1 * 1.1
  ,
  // Capy Bomber : vitesse par défaut
  bomber: 1 * 1.1
  ,
  // Capy Swat : jeu de réflexion, pas de vitesse particulière
  swat: 1 * 1.1
};

// Fonction utilitaire pour récupérer la vitesse effective d'un jeu.  Elle
// multiplie la constante globale par la valeur spécifique du jeu.
window.getGameSpeed = function (gameId) {
  const perGame = window.GAME_SPEEDS[gameId] !== undefined ? window.GAME_SPEEDS[gameId] : 1;
  return window.GLOBAL_SPEED_MULTIPLIER * perGame;
};

// Mesure automatique du nombre de frames par seconde et adaptation de la
// vitesse.  Chaque appareil peut afficher les jeux à des rythmes
// différents (30 Hz, 60 Hz, 120 Hz, etc.) ce qui entraîne des vitesses
// différentes pour un code basé sur requestAnimationFrame.  Pour
// compenser ces différences, on mesure le FPS réel à l'aide de
// requestAnimationFrame puis on ajuste GLOBAL_SPEED_MULTIPLIER de sorte
// qu'un écran lent augmente la vitesse et qu'un écran rapide la réduise.
// Une fois la mesure effectuée, un événement "capySpeedUpdated" est
// dispatché afin que chaque jeu puisse recalculer ses paramètres.
(function autoAdjustSpeed() {
  const samples = [];
  let last = performance.now();
  function measure(now) {
    const delta = now - last;
    last = now;
    // Écarter les outliers (delta trop élevé) dus à des ralentissements
    if (delta > 0 && delta < 200) {
      samples.push(1000 / delta);
    }
    if (samples.length < 30) {
      requestAnimationFrame(measure);
    } else {
      // Calculer la moyenne des FPS mesurés
      const fps = samples.reduce((a, b) => a + b, 0) / samples.length;
      // Ratio par rapport à un écran de référence 60 Hz
      const ratio = 60 / fps;
      // Ajuster le multiplicateur global selon le ratio et la valeur de base
      window.GLOBAL_SPEED_MULTIPLIER = window.BASE_SPEED_MULTIPLIER * ratio;
      // Notifier les jeux que la vitesse a été mise à jour
      window.dispatchEvent(new Event('capySpeedUpdated'));
    }
  }
  // Lancer la mesure dès que possible
  requestAnimationFrame(measure);
})();

// -----------------------------------------------------------------------------
// Gestion du thème clair/sombre
//
// Deux icônes (soleil et lune) sont utilisées comme indicateurs sur le
// bouton.  La préférence est stockée dans localStorage sous la clé
// capyDarkMode.  Les pages consultent cette valeur lors du chargement pour
// appliquer la classe .dark-mode au corps du document.  La fonction
// applyTheme() peut être appelée n’importe quand pour mettre à jour le
// thème et l’icône.  La fonction toggleTheme() inverse la préférence.

window.applyTheme = function () {
  let isDark = false;
  try {
    const stored = localStorage.getItem('capyDarkMode');
    if (stored !== null) isDark = stored === 'true';
  } catch (e) {
    isDark = false;
  }
  if (document.body) {
    document.body.classList.toggle('dark-mode', isDark);
  }
  // Mettre à jour l’icône si elle est présente
  const icon = document.getElementById('dark-mode-icon');
  if (icon) {
    // Lorsque la page est servie depuis un sous-dossier (ex. Capy/),
    // les chemins relatifs doivent remonter d’un niveau pour accéder à assets.
    let prefix = '';
    try {
      const loc = window.location.pathname.toLowerCase();
      // Si on se trouve dans le dossier « capy », les ressources (icônes)
      // résident également dans ce dossier.  On doit donc remonter
      // d'un niveau et entrer dans capy/ au lieu de se rendre à la racine.
      if (loc.includes('/capy/')) prefix = '../capy/';
    } catch (e) {
      prefix = '';
    }
    icon.src = prefix + (isDark ? 'assets/icon_sun.png' : 'assets/icon_moon.png');
  }
};

window.toggleTheme = function () {
  let current = false;
  try {
    const stored = localStorage.getItem('capyDarkMode');
    current = stored === 'true';
    localStorage.setItem('capyDarkMode', (!current).toString());
  } catch (e) {
    // Si localStorage n’est pas disponible, basculer simplement la classe
    current = document.body.classList.contains('dark-mode');
  }
  window.applyTheme();
};

// Appliquer le thème enregistré dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  // Appliquer immédiatement le thème stocké.  Ceci permet de basculer
  // sans clignotement lors du chargement de la page.
  window.applyTheme();

  // Réinitialiser tous les scores et niveaux au premier chargement de la
  // nouvelle version du site.  Afin d'éviter d'effacer les données à
  // chaque page, nous stockons un indicateur dans localStorage.  Si
  // capyResetDone n'est pas présent, on efface tout le contenu de
  // localStorage puis on crée le drapeau.  Ceci garantit une remise à
  // zéro unique lors de la première visite après l'upgrade massive.
  try {
    if (!localStorage.getItem('capyResetDone')) {
      localStorage.clear();
      localStorage.setItem('capyResetDone', 'true');
    }
  } catch (e) {
    // Si localStorage est indisponible, on ignore simplement
  }
  // Créer dynamiquement le bouton de bascule de thème si nécessaire.
  // Certaines pages comme l'accueil intègrent déjà ce bouton dans le HTML.
  if (!document.getElementById('dark-mode-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'dark-mode-toggle';
    toggleBtn.className = 'dark-mode-toggle';
    // L'icône reflète l'état actuel : soleil en mode sombre, lune en mode clair.
    const iconImg = document.createElement('img');
    iconImg.id = 'dark-mode-icon';
    try {
      // Déterminer si l'on se trouve dans le sous-répertoire Capy
      let prefix = '';
      const loc = window.location.pathname.toLowerCase();
      // Lorsqu'on est dans le dossier « capy », les assets sont situés dans ce même
      // dossier.  On remonte donc d'un répertoire puis on va dans capy/ plutôt
      // que dans la racine du site.
      if (loc.includes('/capy/')) prefix = '../capy/';
      const isDark = localStorage.getItem('capyDarkMode') === 'true';
      iconImg.src = prefix + (isDark ? 'assets/icon_sun.png' : 'assets/icon_moon.png');
    } catch (e) {
      // Valeur par défaut : lune dans le répertoire courant
      iconImg.src = 'assets/icon_moon.png';
    }
    toggleBtn.appendChild(iconImg);
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.toggleTheme();
      window.applyTheme();
    });
    // Placer le bouton dans le coin supérieur droit de la fenêtre pour qu’il
    // reste accessible même lorsque la page scroll.  On utilise
    // position: fixed dans la feuille de style.
    document.body.appendChild(toggleBtn);
  }
  /*
   * Overlay de pré‑lancement : cette section crée un pop‑up demandant au
   * joueur de lancer la partie ou de revenir au menu.  Le script
   * prestart.js était auparavant inclus dans chaque page de jeu, mais
   * certaines pages utilisent des suffixes de version dans leurs
   * attributs src, rendant l’injection HTML peu fiable.  Pour garantir
   * l’affichage de l’overlay sur toutes les pages de jeu, nous
   * l’implémentons directement ici.  La fenêtre est affichée sur
   * toutes les pages sauf l’accueil (identifiant capy-home) ou celles
   * marquées explicitement avec data-no-prestart sur le corps.  Elle
   * n’est créée qu’une fois par page.  Après un clic sur « Jouer »,
   * l’overlay disparaît après un délai de 500 ms pour laisser
   * suffisamment de temps au chargement des assets.
   */
  (function initPrestartOverlay() {
    const body = document.body;
    // Ne pas appliquer de délai sur la page d’accueil ou lorsqu’un drapeau data-no-prestart est présent.
    if (!body || body.id === 'capy-home' || body.dataset.noPrestart === 'true') return;
    // Lorsque l’utilisateur clique sur « Rejouer », un drapeau skipPrestart est stocké dans
    // sessionStorage.  Nous l’utilisons uniquement pour le supprimer afin de repartir d’un état propre.
    try {
      if (sessionStorage.getItem('skipPrestart') === 'true') {
        sessionStorage.removeItem('skipPrestart');
      }
    } catch (e) {
      // Si sessionStorage n’est pas disponible, ignorer.
    }
    // Aucune fenêtre de pré‑lancement ni pause : lancer la partie immédiatement.
    // CAPY_PRESTART_ACTIVE est mis à false pour signifier qu’aucune attente n’est en cours.
    window.CAPY_PRESTART_ACTIVE = false;
    // Émettre l'événement capyGameStart légèrement différé pour permettre
    // au script du jeu (main.js, runner.js, etc.) de s'abonner à
    // l'événement avant qu'il ne soit déclenché.  Utiliser setTimeout 0ms
    // garantit un dispatch asynchrone dès la prochaine boucle d'événements.
    setTimeout(() => {
      window.dispatchEvent(new Event('capyGameStart'));
    }, 0);
  })();

  /*
   * Raccourci clavier : retourner au menu en appuyant sur Échap.
   *
   * La plupart des pages de jeu permettent au joueur de revenir au menu en
   * cliquant sur un bouton.  Pour améliorer la navigation, nous ajoutons
   * également un gestionnaire d'événement global qui intercepte la touche
   * Échap et redirige vers la page du menu (capygames.html).  Cette
   * redirection ne s'applique pas sur la page d'accueil ni sur la page
   * capygames elle‑même afin d'éviter une boucle inutile.  Elle ne
   * s'applique pas non plus lorsque le corps comporte le drapeau
   * data-no-escape, permettant à certaines pages internes d'ignorer ce
   * comportement (par exemple le menu principal ou des écrans modaux).
   */
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const body = document.body;
    const path = window.location.pathname;
    // Si la page est le menu principal ou l'accueil, ne rien faire.  On
    // vérifie également la nouvelle page Capy/games.html afin de ne pas
    // afficher le dialogue de confirmation sur le menu principal.
    if (body && (body.id === 'capy-home' || /capygames\.html$/.test(path) || /Capy\/games\.html$/.test(path))) return;
    // Permettre aux pages d'opter pour la désactivation du raccourci
    if (body && body.dataset.noEscape === 'true') return;
    // Afficher une boîte de dialogue de confirmation avant de quitter le jeu.
    ev.preventDefault();
    const confirmQuit = window.confirm('Voulez-vous quitter le jeu ?');
    if (confirmQuit) {
      // Redirection vers le nouveau chemin du menu principal
      window.location.href = '../Capy/games.html';
    } else {
      // Le joueur souhaite rester : aucune action supplémentaire.  La boucle
      // de jeu reprend normalement après la fermeture du dialogue.
    }
  });
});

// -----------------------------------------------------------------------------
// Comportement générique pour le bouton “Rejouer”.
// La plupart des jeux utilisent un bouton « Rejouer » pour recommencer.  Afin
// d’éviter des réinitialisations complexes et pour repartir d’un état propre,
// on force simplement le rechargement de la page lorsque l’utilisateur
// clique sur un bouton étiqueté « Rejouer ».  Cette règle ne s’applique
// pas au jeu de plateforme (platform.html) qui gère la progression des
// niveaux et nécessite un comportement personnalisé.
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (!path.includes('platform.html')) {
    document.querySelectorAll('button').forEach((btn) => {
      if (btn.textContent && btn.textContent.trim().toLowerCase() === 'rejouer') {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          // Indiquer au script de démarrage de ne pas afficher la pop‑up
          try {
            sessionStorage.setItem('skipPrestart', 'true');
          } catch (err) {}
          window.location.reload();
        });
      }
    });
  }
});