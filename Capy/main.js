(() => {
  /**
   * Flappy Capybara
   *
   * Ce fichier implémente la logique du jeu.  Il gère l’affichage du menu, le gameplay
   * (mouvement du capybara, génération des obstacles et bonus, détection de collisions,
   * calcul du score et gestion des états) ainsi que l’écran de fin de partie.
   */

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;

  // Image du capybara pour le mode Flappy. Nous utilisons l'illustration
  // originale sans licorne ni ailes intégrées afin de pouvoir dessiner
  // proprement des ailes animées par-dessus. Cette image est détourée et
  // orientée vers la gauche par défaut ; elle sera pivotée par le dessin.
  const capyImg = new Image();
  // Utiliser la nouvelle illustration fournie par l'utilisateur (fond transparent).
  // Cette image ne comporte pas d'ailes intégrées afin de pouvoir dessiner nos
  // propres ailes animées.  Remplacer l'ancien fichier personnalisé par
  // capybara_flying.png placé dans assets.
  capyImg.src = 'assets/capybara_flying.png';

  // Image pour le sol du jeu.  Au lieu d'un simple dégradé vert ou du motif
  // bambou, nous utilisons un décor de marécage (swamp_background.png)
  // pour apporter une touche plus naturelle et moins monotone à l'arrière-plan.
  const groundImg = new Image();
  groundImg.src = 'assets/swamp_background.png';

  // États possibles du jeu
  const STATE_MENU = 'menu';
  const STATE_PLAYING = 'playing';
  const STATE_GAMEOVER = 'gameover';
  let state = STATE_MENU;

  // Lecture/écriture du meilleur score via localStorage
  let highScore = 0;
  try {
    const stored = localStorage.getItem('flappyCapybaraHighScore');
    if (stored !== null) highScore = parseInt(stored, 10) || 0;
  } catch (e) {
    // localStorage peut être désactivé, ignorer
    highScore = 0;
  }

  // Récupérer les records des autres modes pour afficher sur le menu principal.
  let runnerHighScore = 0;
  let energyHighScore = 0;
  try {
    const storedRunner = localStorage.getItem('capyRunnerHighScore');
    if (storedRunner !== null) runnerHighScore = parseInt(storedRunner, 10) || 0;
  } catch (e) {
    runnerHighScore = 0;
  }
  try {
    const storedEnergy = localStorage.getItem('capyElectricHighScore');
    if (storedEnergy !== null) energyHighScore = parseInt(storedEnergy, 10) || 0;
  } catch (e) {
    energyHighScore = 0;
  }

  // La mise à jour des records sera effectuée plus bas dans le code, après
  // l'initialisation des éléments DOM.  Cette ligne a été déplacée afin
  // d'éviter d'accéder à des constantes encore non initialisées (TDZ).

  // Sélecteurs d’interface
  const menuOverlay = document.getElementById('menu');
  const gameOverOverlay = document.getElementById('gameover');
  // Éléments d'interface pour afficher les meilleurs scores sur la page d'accueil.
  const bestScoreFlappyEl = document.getElementById('best-score-flappy');
  const bestScoreRunningEl = document.getElementById('best-score-running');
  // Le record pour le mode électrique (anciennement véhicule) est stocké
  // dans l'élément dont l'ID a été mis à jour sur la page d'accueil.
  const bestScoreEnergyEl = document.getElementById('best-score-electric');
  const currentScoreEl = document.getElementById('current-score');
  const highScoreEl = document.getElementById('high-score');
  const playBtn = document.getElementById('play-button');
  const replayBtn = document.getElementById('replay-button');
  const menuBtn = document.getElementById('menu-button');
  const runnerBtn = document.getElementById('runner-button');
  // Élément pour message amusant sur l'écran de Game Over (affiché seulement si présent)
  const funMessageEl = document.getElementById('flappy-fun-message');

  // Liste de messages amusants et anecdotes sur le fromage pour varier les écrans de fin
  // Liste de messages et anecdotes affichés aléatoirement à la fin de la partie.
  // Certaines entrées classiques ont été conservées mais la majorité ont
  // été renouvelées pour offrir plus de variété et d’humour.  Les
  // nouveaux textes abordent des faits étonnants sur les capybaras et
  // des anecdotes fromagères amusantes.
  const cheeseMessages = [
    // Quelques classiques
    "Saviez‑vous que certaines meules de fromage peuvent peser plus de 100 kg ?",
    "Le Roquefort est affiné dans des grottes naturelles du sud de la France depuis des siècles.",
    "Il existe plus de 1 200 variétés de fromage en France !",
    "Les capybaras sont parfois surnommés « les rois du chill » car ils se prélassent avec n’importe quel animal.",
    // Nouveaux messages
    "En Bolivie, les capybaras sont parfois appelés 'chanchitos de río' – petits cochons de rivière.",
    "Le fromage à tartiner a été inventé par accident lorsqu’un fromage à pâte molle fut trop chauffé.",
    "Pourquoi le capybara est-il toujours à l’heure ? Parce qu’il suit le courant !",
    "Dans certains pays d’Asie, on fait fermenter le fromage pendant des années pour obtenir un goût puissant.",
    "Une famille de capybaras peut comprendre jusqu’à 20 individus, tous aussi relax.",
    "Certaines meules de parmesan sont marquées au feu pour garantir leur origine.",
    "Le saviez-vous ? Le capybara communique en émettant de petits sifflements.",
    "Pourquoi les fromages font-ils de bons partisans ? Parce qu’ils sont affinés avec le temps.",
    "Au Brésil, on peut voir des capybaras se prélasser dans les parcs urbains.",
    "Le fromage suisse Emmental est réputé pour ses grands trous, appelés 'yeux'.",
    "Selon la légende, un capybara aurait déjà fait une sieste pendant un concert de rock.",
    "Certains fromages hollandais sont colorés en rouge avec de la cire pour les protéger.",
    "Le capybara est un excellent nageur grâce à ses doigts palmés.",
    "Pourquoi le camembert est-il romantique ? Parce qu’il fond toujours pour vous.",
    "Les capybaras vivent souvent en harmonie avec des oiseaux perchés sur leur dos.",
    "Dans les Alpes, on fabrique de la raclette depuis le Moyen Âge.",
    "Le capybara peut dormir dans l’eau, ne laissant dépasser que son nez.",
    "La croûte du fromage peut être lavée à la bière pour développer des arômes uniques.",
    "Un capybara peut courir jusqu’à 35 km/h sur de courtes distances.",
    "Pourquoi les fromages n’aiment-ils pas les secrets ? Parce qu’ils finissent toujours par fuir !",
    "Certaines tribus d’Amazonie considèrent le capybara comme un animal sacré.",
    "Le fromage bleu obtient sa couleur grâce à des cultures de moisissures spécifiques.",
    "Les capybaras sont parfois adoptés comme animaux de compagnie en Amérique du Sud.",
    "Pourquoi le cheddar aime les devinettes ? Parce qu’il adore qu’on le déchiffre !",
    "La feta grecque est traditionnellement fabriquée avec du lait de brebis.",
    "Le capybara chante parfois sous la pluie, un spectacle rare mais adorable.",
    "En Norvège, on fabrique un fromage brun sucré à base de lactosérum, le 'brunost'.",
    "Pourquoi le gouda est-il optimiste ? Parce qu’il voit toujours la meule à moitié pleine.",
    "Les moustaches du capybara sont extrêmement sensibles et l’aident à détecter des mouvements dans l’eau.",
    "Le fromage halloumi peut être grillé sans fondre, parfait pour les barbecues.",
    "On dit que les capybaras rêvent de nénuphars géants.",
    "Certaines caves à fromage sont situées sous des monastères centenaires.",
    "Les capybaras aiment se faire gratter le ventre, surtout au coucher du soleil.",
    "Le roquefort est affiné dans les grottes de Combalou depuis plus de 1 000 ans.",
    "Pourquoi le fromage de chèvre est-il drôle ? Parce qu’il a du 'chévre‑sprit' !"
  ];

  // Messages satiriques lorsque le joueur obtient un score très bas (<10).
  const lowScoreMessages = [
    "On aurait pu faire une sieste et marquer davantage de points !",
    "Même un bébé capybara aurait volé plus loin…",
    "Ton score est si bas qu’il déprime les grenouilles du marais."
  ];
  // Visuels à afficher aléatoirement sur l’écran de Game Over : seulement des animaux
  // Sélection d'illustrations à afficher aléatoirement sur l’écran de Game Over.
  // Afin de conserver une cohérence graphique, seules des capybaras sont
  // utilisées (pas de pingouin, de tortue ou de licorne).  Les images
  // suivantes représentent les différentes activités du capybara : volant,
  // courant, bombardier, superhéros, mémoire et blackjack.
  // Liste d’illustrations à afficher aléatoirement sur l’écran de Game Over.
  // Seules des capybaras mignonnes en gros plan sont conservées.  Les icônes
  // génériques ou les images de jeux (mémoire, blackjack, GIGN…) sont exclues.
  const funImages = [
    'assets/capybara_unicorn.png',
    'assets/capybara_turtle.png',
    'assets/capybara_penguin.png',
    'assets/capybara_bomber.png',
    'assets/capybara_super.png',
    'assets/capybara_ninja_new.png',
    'assets/capybara_electric.png',
    'assets/capybara_catch.png',
    'assets/capybara_running_new.png'
  ];
  // Bouton volume global
  const volumeBtn = document.getElementById('volume-toggle');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      volumeBtn.textContent = isMuted ? '🔇' : '🔊';
      if (isMuted) {
        stopMusic();
      } else {
        startMusic();
      }
      applyVolume();
    });
  }
  // Supprimer la gestion d'un bouton séparé pour la musique.  La page flappy ne
  // comporte qu'un seul contrôle de volume, donc la variable musicBtn et son
  // événement sont retirés.

  // Paramètres du jeu
  // Gravité et impulsion de saut : ajustés pour rendre le jeu plus accessible.
  // Gravité : valeur réduite pour ralentir la chute et rendre le vol plus facile
  // Gravité : valeur réduite pour une chute plus lente et un contrôle plus facile.  
  // Elle est volontairement faible pour permettre au capybara de planer longtemps après un saut.
  const gravity = 0.04;
  // Impulsion de saut d'origine conservée comme référence.
  // Nous n'utilisons plus directement cette constante mais définissons la
  // vélocité dans jump().
  const jumpVelocity = -9.0;
  // Vitesse de défilement horizontal initiale.  La valeur origGameSpeed est
  // conservée pour pouvoir recalculer la vitesse effective lorsque
  // GLOBAL_SPEED_MULTIPLIER est mis à jour.  Un ratio élevé rend le jeu
  // plus dynamique.
  // Augmenter la vitesse de défilement des obstacles pour rendre le jeu plus difficile.
  // La valeur d'origine était de 1.6.  Nous l'augmentons afin que les obstacles
  // arrivent plus rapidement à l'écran, réduisant ainsi le temps de réaction du joueur.
  const origGameSpeed = 2.5;
  let gameSpeed = origGameSpeed;
  // Intervalle initial entre les obstacles.  Ce paramètre est également
  // recalculé en fonction de la vitesse pour maintenir une densité
  // cohérente d'obstacles.  La valeur initiale est stockée dans
  // initialSpawnInterval.
  // Augmenter l'intervalle initial entre deux obstacles afin de garantir
  // des passages plus larges et d'éviter que deux obstacles ne se
  // succèdent trop rapidement.  Cette valeur plus élevée est réduite
  // progressivement avec le score.
  // La valeur précédente (300) a été jugée trop faible suite à la mise à jour
  // : un délai plus long (360 frames) procure des obstacles mieux espacés
  // et une meilleure lisibilité.
  const initialSpawnInterval = 360;
  let spawnInterval = initialSpawnInterval;

  // -------------------------------------------------------------------------
  // Gestion de la vitesse indépendante du nombre de frames
  //
  // speedFactor représente le multiplicateur de vitesse global calculé dans
  // config.js via window.getGameSpeed('flappy').  Il est utilisé pour
  // convertir les intervalles définis en nombre de frames en intervalles
  // temps‑réel.  À chaque frame, nous incrémentons des minuteries avec
  // speedFactor et déclenchons des événements (apparition d’obstacles,
  // nuages ou oiseaux) lorsque ces minuteries dépassent un seuil.
  let speedFactor = 1;
  function applySpeedFactor() {
    try {
      if (window.getGameSpeed) {
        const s = window.getGameSpeed('flappy');
        speedFactor = (typeof s === 'number' && s > 0) ? s : 1;
      } else {
        speedFactor = 1;
      }
    } catch (e) {
      speedFactor = 1;
    }
  }
  // Initialiser speedFactor et mettre à jour lorsqu'un nouvel FPS est mesuré
  applySpeedFactor();
  window.addEventListener('capySpeedUpdated', applySpeedFactor);

  // Timers cumulés pour contrôler les apparitions d’obstacles, nuages et oiseaux
  let obstacleTimer = 0;
  let cloudTimer = 0;
  let birdTimer = 0;

  // -------------------------------------------------------------------------
  // Palettes de couleurs pour les obstacles naturels
  //
  // Afin de remplacer les tuyaux rectangulaires par des éléments
  // organiques (arbres et rochers), nous définissons ici des palettes
  // harmonieuses et pastel.  Chaque entrée de tableau est choisie pour
  // apporter de la variété tout en restant douce pour l’œil.  Les couleurs
  // sont inspirées des tons des forêts et des roches sous un ciel ensoleillé.
  //
  // TREE_TRUNK_COLORS : définit un dégradé vertical pour les troncs d’arbre.
  // Chaque objet comporte une couleur `top` et `bottom` pour la partie
  // supérieure et inférieure du tronc.  Les nuances sont légèrement
  // rosées et brunes.
  const TREE_TRUNK_COLORS = [
    { top: '#d7ccc8', bottom: '#bcaaa4' },
    { top: '#bcaaa4', bottom: '#a1887f' },
    { top: '#a1887f', bottom: '#8d6e63' }
  ];
  // TREE_CANOPY_COLORS : couleur unique pour la canopée de chaque arbre.
  // Les verts sont tendres et légèrement jaunis pour rappeler des feuilles
  // baignées de lumière.
  const TREE_CANOPY_COLORS = ['#c5e1a5', '#aed581', '#b9f6ca'];
  // ROCK_COLORS : couleur de base pour un bloc rocheux stylisé.  Les teintes
  // gris-bleutées sont volontairement douces pour conserver la cohérence
  // avec le reste de la palette.
  const ROCK_COLORS = ['#cfd8dc', '#b0bec5', '#90a4ae'];
  // ROCK_LUMP_COLORS : couleur des reliefs dessinés par-dessus les rochers.
  // Légèrement plus foncé pour suggérer la profondeur.
  const ROCK_LUMP_COLORS = ['#b0bec5', '#90a4ae', '#78909c'];

  /**
   * Applique le multiplicateur de vitesse défini dans config.js.  Cette
   * fonction est appelée au démarrage et à chaque fois que la vitesse
   * globale est mise à jour (événement capySpeedUpdated).  Elle recalcule
   * gameSpeed et spawnInterval à partir des valeurs originales.
   */
  function applySpeed() {
    try {
      if (window.getGameSpeed) {
        const spd = window.getGameSpeed('flappy');
        gameSpeed = origGameSpeed * spd;
        // Utiliser un intervalle minimal plus élevé (320) afin d'espacer
        // davantage les obstacles.  Le facteur dépend du multiplicateur
        // global de vitesse spd, mais ne descend jamais en dessous de 320
        // frames.  Ceci corrige le comportement trop rapide observé après
        // l'actualisation automatique de la vitesse.
        spawnInterval = Math.max(320, Math.round(initialSpawnInterval / spd));
      }
    } catch (e) {
      // en cas d'erreur, conserver les valeurs actuelles
    }
  }
  // Appliquer la vitesse au chargement
  applySpeed();
  // Recalculer la vitesse lorsque l'événement capySpeedUpdated est envoyé
  window.addEventListener('capySpeedUpdated', applySpeed);
  let frameCount = 0;
  let score = 0;
  // Timer d'animation du score.  Lorsqu'un point est gagné, ce compteur
  // est initialisé à une valeur positive afin de déclencher un effet
  // d'agrandissement temporaire sur le compteur affiché en haut de l'écran.
  // Le compteur est décrémenté à chaque frame dans update() via la logique
  // d'affichage et ne devient jamais négatif.
  let scoreAnimationTimer = 0;
  let invincibleTimer = 0;

  // Hauteur du sol en bas de l'écran (portion réservée au décor)
  // Hauteur du sol (bande horizontale en bas de l'écran).  Dans
  // Flying Capi, le sol n'est plus visible afin de renforcer la
  // sensation de vol.  Nous initialisons donc cette valeur à 0.
  let groundHeight = 0;

  // Nuages et oiseaux pour le fond
  const clouds = [];
  const birds = [];

  // Mettre à jour les textes affichant les meilleurs scores sur la page d'accueil.
  function updateMenuScores() {
    if (bestScoreFlappyEl) {
      bestScoreFlappyEl.textContent = `Record Flying Capy : ${highScore}`;
    }
    if (bestScoreRunningEl) {
      bestScoreRunningEl.textContent = `Record Running Capy : ${runnerHighScore}`;
    }
    if (bestScoreEnergyEl) {
      bestScoreEnergyEl.textContent = `Record Ragon électrique : ${energyHighScore}`;
    }
  }


  // Context audio pour les effets sonores
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  try {
    audioCtx = new AudioContext();
  } catch (e) {
    audioCtx = null;
  }

  function playBeep(frequency, duration = 0.1, volume = 0.1) {
    if (!audioCtx || isMuted) return;
    // L’AudioContext sur mobile ne démarre qu’après une interaction utilisateur
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    osc.type = 'square';
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.start(now);
    osc.stop(now + duration);
  }

  // Gestion du son
  // Lorsque isMuted est vrai, tous les sons (effets et ambiance) sont coupés.
  let isMuted = false;

  // Audio ambiant du mode Flappy.  Ce fichier est un bruit blanc vide qui
  // pourra être remplacé par une vraie ambiance par l'utilisateur.  La
  // lecture boucle automatiquement.
  const ambient = new Audio('assets/sounds/ambient_flappy.wav');
  ambient.loop = true;

  // Appliquer immédiatement le volume global à l'ambiance.
  applyVolume();

  /**
   * Calcule le volume global enregistré par le menu.  Valeur comprise entre
   * 0 et 1.  Retourne 0,5 par défaut si aucune valeur n'est stockée.
   */
  function getGlobalVolume() {
    let v = 0.5;
    try {
      const stored = localStorage.getItem('capyGlobalVolume');
      if (stored !== null) v = parseFloat(stored);
    } catch (e) {
      /* ignore */
    }
    return isNaN(v) ? 0.5 : v;
  }

  /**
   * Met à jour le volume de l'audio ambiant et de tous les effets sonores
   * (définis plus loin) en fonction de isMuted et du volume global.
   */
  function applyVolume() {
    const vol = isMuted ? 0 : getGlobalVolume();
    ambient.volume = vol;
    // Les effets sonores utilisent playBeep, qui règle son volume dans la
    // fonction playBeep directement.
  }

  /**
   * Lance la musique d'ambiance du jeu.  Si le son est coupé, ne joue
   * rien.  L'audio se met en boucle jusqu'à l'appel de stopMusic().
   */
  function startMusic() {
    applyVolume();
    if (!isMuted) {
      try {
        ambient.currentTime = 0;
        ambient.play();
      } catch (e) {
        /* ignore */
      }
    }
  }

  /**
   * Arrête l'ambiance en la mettant en pause.  Utiliser pause() évite
   * certains bugs de Chrome où stop() réinitialise l'audio.  
   */
  function stopMusic() {
    try {
      ambient.pause();
    } catch (e) {
      /* ignore */
    }
  }

  // Classe Capybara représentant le joueur
  class Capybara {
    constructor() {
      this.x = width * 0.25;
      this.y = height / 2;
      this.radius = 25;
      // Dimensions adaptées au nouveau visuel PNG (capybara ailé).  Afin de
      // rendre le héros plus imposant à l’écran, la largeur et la hauteur
      // sont augmentées.  Ces valeurs correspondent à environ +25 % par
      // rapport aux dimensions précédentes.
      // Agrandir le héros pour qu'il soit plus visible
      this.width = 130;
      this.height = 100;
      this.velY = 0;
      this.rotation = 0;
      // Timer d’animation des ailes.  Plus la valeur est grande, plus
      // l'animation est lente.  Nous l'initialisons à zéro ici et
      // l'utiliserons pour déclencher des battements progressifs.
      this.wingFlapTimer = 0;
      // Timer de glisse : lorsque >0, la chute est ralentie pour simuler un vol plané
      this.glideTimer = 0;
    }
    reset() {
      this.y = height / 2;
      this.velY = 0;
      this.rotation = 0;
      this.wingFlapTimer = 0;
      // Débuter avec une courte phase de plané.  La version précédente
      // permettait de planer longtemps, ce qui donnait l'impression que
      // le capybara était un avion.  Nous réduisons cette durée à
      // environ 0,5 s (30 frames) pour un démarrage moins flottant.
      this.glideTimer = 30;
    }
    update() {
      // Lorsque la glisse est active, appliquer une accélération très faible et limiter la vitesse.
      if (this.glideTimer > 0) {
        // Pendant le plané, appliquer une accélération faible.  La version
        // précédente multipliait la gravité par 0,05 (donc la chute était
        // extrêmement lente).  Pour que le capybara ne plane plus comme un
        // avion en papier, on applique 30 % de la gravité.
        this.velY += gravity * 0.3;
        this.glideTimer--;
        // Limiter la vitesse de descente afin que le capybara tombe très lentement.
        if (this.velY > 1) {
          this.velY = 1;
        }
        // Limiter également la remontée pour éviter un saut trop abrupt si plusieurs clics sont rapides.
        if (this.velY < -3) {
          this.velY = -3;
        }
      } else {
        // Hors plané, appliquer la gravité normale.
        this.velY += gravity;
      }
      this.y += this.velY;
      // Mettre à jour la rotation en fonction de la vitesse (pour l’animation de l’inertie)
      const rotMax = 0.5;
      const rotMin = -0.5;
      this.rotation = Math.max(rotMin, Math.min(rotMax, this.velY / 10));
      // Décrémenter le timer d’animation des ailes
      if (this.wingFlapTimer > 0) {
        this.wingFlapTimer--;
      }
    }
    jump() {
      // Impulsion réduite : on ne monte pas trop haut pour faciliter la gestion de l’altitude.
      // Ce saut initial est couplé à une phase de plané qui ralentit fortement la descente.
      // Ajuster encore l’impulsion vers le haut : on monte légèrement moins haut.
      // Augmenter l’impulsion du saut afin de rendre le héros plus réactif.
      // Une valeur plus négative le propulse plus vite vers le haut, améliorant
      // ainsi la maniabilité.  La valeur précédente (-4.2) rendait le capybara
      // trop lent à contrôler après la dernière mise à jour.
      this.velY = -6;
      // Activer la phase de glisse pendant un temps très court.  Réduire
      // drastiquement la durée permet d'éviter un plané prolongé.  À 60 FPS,
      // 5 frames représentent environ 0,08 s.
      this.glideTimer = 5;
      playBeep(600, 0.05, 0.08);
      // Déclencher l’animation des ailes pendant la durée du plané pour un battement visible
      this.wingFlapTimer = 25;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      // Utiliser le sprite PNG transparent du capybara si disponible, sinon un ovale de secours
      if (capyImg.complete && capyImg.naturalWidth) {
        ctx.drawImage(
          capyImg,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
      } else {
        ctx.fillStyle = '#b99563';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Les ailes ont été retirées pour simplifier le design de Flying Capy.
      // Aucune animation supplémentaire n'est dessinée derrière le sprite.
      ctx.restore();
    }
      /*
       * Les éléments suivants dessinaient autrefois l'oreille, l'œil, la narine,
       * les pattes et la queue pour la version vectorielle du capybara.
       * Maintenant que nous utilisons un sprite PNG complet, nous n'avons
       * plus besoin de ces formes supplémentaires. Elles sont conservées
       * ici à titre de référence mais désactivées.
       *
       * ctx.fillStyle = '#8b6c47';
       * ctx.beginPath();
       * ctx.ellipse(this.width * 0.18, -this.height * 0.38, this.width * 0.12, this.height * 0.18, 0, 0, Math.PI * 2);
       * ctx.fill();
       * // Œil
       * ctx.fillStyle = '#fff';
       * ctx.beginPath();
       * ctx.ellipse(this.width * 0.46, -this.height * 0.12, this.width * 0.08, this.height * 0.1, 0, 0, Math.PI * 2);
       * ctx.fill();
       * ctx.fillStyle = '#000';
       * ctx.beginPath();
       * ctx.ellipse(this.width * 0.48, -this.height * 0.12, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
       * ctx.fill();
       * // Narine repositionnée vers l'avant
       * ctx.fillStyle = '#4d3928';
       * ctx.beginPath();
       * ctx.ellipse(this.width * 0.64, -this.height * 0.05, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
       * ctx.fill();
       * // Pattes
       * ctx.fillStyle = '#8b6c47';
       * ctx.fillRect(-this.width * 0.25, this.height * 0.45, this.width * 0.15, this.height * 0.22);
       * ctx.fillRect(this.width * 0.05, this.height * 0.45, this.width * 0.15, this.height * 0.22);
       * // Queue
       * ctx.beginPath();
       * ctx.arc(-this.width * 0.45, 0, this.width * 0.08, 0, Math.PI * 2);
       * ctx.fill();
      */
      // Ancienne restauration obsolète supprimée.
    getBounds() {
      // Réduire la boîte de collision pour être plus permissif :
      // seule la partie centrale du corps compte pour les collisions.
      const shrink = 0.8;
      return {
        left: this.x - (this.width * shrink) / 2,
        top: this.y - (this.height * shrink) / 2,
        right: this.x + (this.width * shrink) / 2,
        bottom: this.y + (this.height * shrink) / 2
      };
    }
  }

  // Classe Obstacle
  class Obstacle {
    constructor() {
      this.width = 60;
      this.x = width + this.width;
      // Hauteur du trou dynamique : large au début, se réduit lorsque le score augmente
      // Taille du trou : très large au début pour faciliter le passage, se réduit lentement avec le score
      const maxGap = 420;
      const minGap = 260;
      // Réduction très progressive pour ne pas fermer trop rapidement
      // On retire 0,5 pixel du trou par point de score, afin de garder des ouvertures larges plus longtemps.
      this.gapHeight = Math.max(minGap, maxGap - score * 0.5);
      // Position verticale du centre du trou
      // S'assurer que le trou ne chevauche pas le sol (groundHeight)
      const margin = 50;
      const availableHeight = height - groundHeight - margin * 2 - this.gapHeight;
      this.gapY = Math.random() * availableHeight + margin + this.gapHeight / 2;
      // Ajuster la position verticale du trou en fonction du trou précédent pour
      // garantir une progression fluide entre deux obstacles.  Si le trou
      // précédent existe, limiter le décalage vertical à une valeur
      // raisonnable.  Le capybara peut ainsi franchir chaque passage sans
      // devoir effectuer des montées ou descentes impossibles.
      if (lastGapY !== null) {
        const maxShift = 200; // différence maximale en pixels entre deux passages
        // Calculer les bornes autorisées pour gapY
        const lowerBound = margin + this.gapHeight / 2;
        const upperBound = height - groundHeight - margin - this.gapHeight / 2;
        if (this.gapY > lastGapY + maxShift) {
          this.gapY = Math.min(lastGapY + maxShift, upperBound);
        } else if (this.gapY < lastGapY - maxShift) {
          this.gapY = Math.max(lastGapY - maxShift, lowerBound);
        }
      }
      // Mettre à jour la dernière hauteur afin que l'obstacle suivant puisse s'y référer
      lastGapY = this.gapY;
      this.scored = false;
      // Bonus associé (peut être null)
      this.bonus = null;
      // Génération d’un bonus avec une faible probabilité
      if (Math.random() < 0.25) {
        const bonusType = Math.random() < 0.5 ? 'score' : 'invincible';
        const bonusX = this.x + this.width / 2;
        const bonusY = this.gapY;
        this.bonus = new Bonus(bonusX, bonusY, bonusType);
      }

      // Choisir aléatoirement le type d'obstacle parmi 'tree' ou 'rock'.  Ces
      // valeurs déterminent la manière dont l'obstacle est dessiné dans
      // draw().  Un indice de variante est également généré pour varier
      // les palettes de couleurs des troncs, des feuillages et des rochers.
      this.type = Math.random() < 0.5 ? 'tree' : 'rock';
      this.variant = Math.floor(Math.random() * 3);
    }
    update() {
      this.x -= gameSpeed;
      if (this.bonus) {
        this.bonus.x -= gameSpeed;
      }
    }
    draw() {
      // Dessiner des tuyaux classiques de style Flappy Bird au lieu
      // d'obstacles stylisés.  Chaque obstacle se compose de deux
      // sections rectangulaires (haut et bas) séparées par un trou.
      // On ajoute un embout légèrement plus large pour évoquer la
      // terminaison du tuyau.
      const topHeight = this.gapY - this.gapHeight / 2;
      const bottomY = this.gapY + this.gapHeight / 2;
      const bottomHeight = (height - groundHeight) - bottomY;
      if (topHeight > 0) {
        this.drawPipeSection(this.x, 0, this.width, topHeight, true);
      }
      if (bottomHeight > 0) {
        this.drawPipeSection(this.x, bottomY, this.width, bottomHeight, false);
      }
      // Dessiner le bonus, s'il existe, au-dessus des tuyaux
      if (this.bonus) {
        this.bonus.draw();
      }
    }

    /**
     * Dessine une section de tuyau.  Le tuyau se compose d'un corps
     * rectangulaire et d'un embout plus large pour rappeler le design
     * original.  Pour le haut du trou, l'embout est dessiné en bas
     * (face vers le bas) ; pour le bas du trou, il est dessiné en haut.
     * @param {number} x Position horizontale du tuyau
     * @param {number} y Position verticale de début de la section
     * @param {number} w Largeur du tuyau (hors embout)
     * @param {number} h Hauteur de la section
     * @param {boolean} isTop Indique si la section est au-dessus du trou
     */
    drawPipeSection(x, y, w, h, isTop) {
      // Couleurs inspirées de Flappy Bird : un vert moyen pour le corps
      // et un vert plus clair pour l'embout.  Un vert plus foncé est
      // utilisé pour le contour afin de créer un léger relief.
      const bodyColor = '#6ec85f';
      const capColor = '#8ade71';
      const borderColor = '#499d3b';
      const capHeight = Math.min(20, h * 0.2);
      // Corps du tuyau (zone principale)
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x, y, w, h);
      // Embout : légèrement plus large que le corps
      const capY = isTop ? (y + h - capHeight) : y;
      ctx.fillStyle = capColor;
      ctx.fillRect(x - 5, capY, w + 10, capHeight);
      // Contours du corps
      ctx.lineWidth = 2;
      ctx.strokeStyle = borderColor;
      ctx.strokeRect(x, y, w, h);
      // Contours de l'embout
      ctx.strokeRect(x - 5, capY, w + 10, capHeight);
    }
    isOffScreen() {
      return this.x + this.width < 0;
    }
  }

  // Classe Bonus
  class Bonus {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      // Bonus plus grand pour être plus facilement collecté
      this.radius = 24;
      this.type = type; // 'score' ou 'invincible'
      this.collected = false;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      // Dessiner une bulle semi‑transparente autour du bonus pour le
      // mettre en évidence. La bulle est légèrement plus lumineuse pour
      // attirer davantage l'œil du joueur.
      ctx.fillStyle = 'rgba(255, 236, 105, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Dessiner une carotte ou une patate au lieu d'une étoile. La
      // carotte pointe vers le bas et possède des fanes vertes au sommet.
      if (this.type === 'score') {
        // Carotte avec une couleur orange plus vive et un tracé
        // légèrement plus large. La pointe de la carotte est orientée
        // vers le bas (la racine), tandis que le sommet est élargi. Les
        // coordonnées tiennent compte du système de coordonnées Canvas
        // (l'axe y croît vers le bas).
        ctx.fillStyle = '#f6a323';
        ctx.beginPath();
        // Pointe dirigée vers le bas
        ctx.moveTo(0, this.radius);
        ctx.lineTo(this.radius * 0.6, -this.radius);
        ctx.lineTo(-this.radius * 0.6, -this.radius);
        ctx.closePath();
        ctx.fill();
        // Fanes vertes au sommet : trois petites pointes
        ctx.fillStyle = '#6ea84f';
        const leafCount = 3;
        for (let i = 0; i < leafCount; i++) {
          ctx.beginPath();
          const lx = (-this.radius * 0.25) + i * (this.radius * 0.25);
          ctx.moveTo(lx, -this.radius * 1.05);
          ctx.lineTo(lx + this.radius * 0.15, -this.radius * 1.3);
          ctx.lineTo(lx + this.radius * 0.3, -this.radius * 1.05);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Patate avec une couleur plus chaude
        ctx.fillStyle = '#d7a26c';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Taches sur la peau
        ctx.fillStyle = '#aa7342';
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI * 2) / 4;
          const px = Math.cos(angle) * this.radius * 0.4;
          const py = Math.sin(angle) * this.radius * 0.3;
          ctx.beginPath();
          ctx.ellipse(px, py, this.radius * 0.1, this.radius * 0.07, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // Variables globales
  let capy = new Capybara();
  let obstacles = [];
  // Conserver la dernière position verticale du trou des obstacles pour
  // éviter que deux passages consécutifs ne soient trop éloignés.
  // Lorsque null, aucune contrainte n'est appliquée.
  let lastGapY = null;

  // Classe Cloud pour le décor de fond
  class Cloud {
    constructor() {
      this.reset();
    }
    reset() {
      this.y = Math.random() * (height - groundHeight) * 0.4;
      this.x = width + Math.random() * width;
      this.speed = 0.5 + Math.random() * 0.5;
      this.scale = 0.6 + Math.random() * 0.6;
    }
    update() {
      // Déplacer le nuage vers la gauche.  Multiplier par speedFactor
      // afin que la vitesse soit indépendante du nombre de frames et
      // conserve une allure constante sur les différents écrans.
      this.x -= this.speed * speedFactor;
      if (this.x < -150 * this.scale) {
        this.reset();
        this.x = width;
      }
    }
    draw() {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.translate(this.x, this.y);
      const r = 30 * this.scale;
      // Dessiner trois cercles qui se chevauchent pour former un nuage
      ctx.beginPath();
      ctx.arc(-r * 0.6, 0, r, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.4, r * 1.2, 0, Math.PI * 2);
      ctx.arc(r * 0.8, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Classe Bird
  // Représente un petit oiseau stylisé en forme de V dans le ciel.  Les
  // oiseaux se déplacent plus rapidement que les nuages pour donner
  // l'impression d'un défilement dynamique.  Ils sont utilisés dans
  // l'arrière‑plan du mode volant pour apporter de la vie même lorsqu'il
  // n'y a pas d'obstacles à l'écran.
  class Bird {
    constructor() {
      this.x = width + 30;
      this.y = Math.random() * (height - groundHeight) * 0.4 + 20;
      // Vitesse légèrement plus élevée que celle des nuages
      this.speed = gameSpeed * 0.5 + Math.random() * 1.0;
    }
    update() {
      // Déplacement horizontal de l'oiseau.  Le facteur speedFactor
      // garantit une vitesse constante indépendamment du taux de
      // rafraîchissement.
      this.x -= this.speed * speedFactor;
    }
    draw() {
      ctx.save();
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Dessiner un simple V pour représenter un oiseau
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + 6, this.y - 4);
      ctx.lineTo(this.x + 12, this.y);
      ctx.stroke();
      ctx.restore();
    }
    isOffScreen() {
      return this.x < -20;
    }
  }

  function resetGame() {
    score = 0;
    frameCount = 0;
    invincibleTimer = 0;
    // Vitesse initiale légèrement plus rapide pour dynamiser le défilement
    gameSpeed = 1.6;
    // Espacement initial très large
    spawnInterval = initialSpawnInterval;
    // Réinitialiser la mémoire du dernier trou afin que le premier
    // obstacle du niveau puisse apparaître n'importe où.
    lastGapY = null;
    obstacles = [];
    // Réinitialiser les nuages et les oiseaux
    clouds.length = 0;
    birds.length = 0;
    capy.reset();
  }

  function update() {
    // Mettre à jour les nuages et les oiseaux de fond lorsque le jeu est en cours.
    if (state === STATE_PLAYING) {
      // Ajouter de nouveaux nuages périodiquement en fonction du facteur de vitesse.
      // Le timer cloudTimer s'incrémente de speedFactor à chaque frame.  Lorsque
      // cloudTimer dépasse 300, un nuage est ajouté et le timer est réduit.
      cloudTimer += speedFactor;
      if (cloudTimer >= 300) {
        cloudTimer -= 300;
        clouds.push(new Cloud());
      }
      clouds.forEach((c) => c.update());
      // Ajouter des oiseaux occasionnellement.  La probabilité par frame est
      // multipliée par speedFactor pour assurer une fréquence constante
      // d'apparition par seconde sur tous les écrans.
      if (Math.random() < 0.02 * speedFactor) {
        birds.push(new Bird());
      }
      birds.forEach((b) => b.update());
      // Supprimer les oiseaux sortis de l'écran pour éviter une accumulation
      for (let i = birds.length - 1; i >= 0; i--) {
        if (birds[i].isOffScreen()) {
          birds.splice(i, 1);
        }
      }
    }
    frameCount++;
    // Mise à jour du capybara
    capy.update();
    // Empêcher de sortir de l’écran (collision avec le sol ou le plafond)
    if (capy.y + capy.height / 2 >= height - groundHeight) {
      capy.y = height - groundHeight - capy.height / 2;
      capy.velY = 0;
      endGame();
    } else if (capy.y - capy.height / 2 <= 0) {
      capy.y = capy.height / 2;
      capy.velY = 0;
    }
    // Gérer l’invincibilité
    if (invincibleTimer > 0) {
      invincibleTimer--;
    }
    // Génération périodique des obstacles.  Au lieu de se baser sur
    // frameCount, on utilise un compteur temporel.  À chaque frame,
    // obstacleTimer est incrémenté de speedFactor.  Lorsqu'il atteint ou
    // dépasse spawnInterval, un nouvel obstacle est créé et le compteur
    // est réduit.  Cette approche maintient un rythme constant
    // d'apparition d'obstacles, quelle que soit la fréquence de
    // rafraîchissement.
    obstacleTimer += speedFactor;
    if (obstacleTimer >= spawnInterval) {
      obstacleTimer -= spawnInterval;
      obstacles.push(new Obstacle());
    }
    // Mise à jour et suppression des obstacles hors écran
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.update();
      // Score : lorsqu’un obstacle est passé à gauche du capybara
      if (!obs.scored && obs.x + obs.width < capy.x) {
        obs.scored = true;
        score++;
        // Déclencher l'animation du score.  La valeur 15 correspond à
        // environ un quart de seconde à 60 FPS.  Cette durée permet un
        // agrandissement visible mais bref du compteur afin d'attirer
        // l'attention du joueur lorsqu'il franchit un obstacle.
        scoreAnimationTimer = 15;
        // Augmenter progressivement la vitesse toutes les 8 unités de score.
        // Avant 50 points, augmentation modérée ; au‑delà de 50 points, la vitesse augmente davantage.
        if (score % 8 === 0) {
          if (score < 50) {
            gameSpeed += 0.1;
          } else {
            gameSpeed += 0.15;
          }
        }
        // Réduire l’intervalle de génération en fonction du score pour rapprocher les obstacles.
        // Ajuster l’intervalle de génération en fonction du score.  Nous
        // utilisons une valeur plancher plus élevée (320) et une réduction
        // plus lente afin d’éviter que les obstacles n’arrivent trop vite.
        spawnInterval = Math.max(320, Math.floor(initialSpawnInterval - score * 0.12));
        playBeep(400, 0.05, 0.05);
      }
      // Détection de collision obstacle
      const bounds = capy.getBounds();
      // Collision horizontale
      if (
        bounds.right > obs.x &&
        bounds.left < obs.x + obs.width
      ) {
        // Vérifier verticalement
        const gapTop = obs.gapY - obs.gapHeight / 2;
        const gapBottom = obs.gapY + obs.gapHeight / 2;
        if (
          bounds.top < gapTop ||
          bounds.bottom > gapBottom
        ) {
          if (invincibleTimer <= 0) {
            endGame();
          }
        }
      }
      // Détection de bonus : si le capybara entre en collision avec le bonus,
      // ajouter les points ou l'invincibilité et supprimer le bonus pour
      // qu'il disparaisse immédiatement.
      if (obs.bonus && !obs.bonus.collected) {
        const dx = capy.x - obs.bonus.x;
        const dy = capy.y - obs.bonus.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < capy.width / 2 + obs.bonus.radius) {
          if (obs.bonus.type === 'score') {
            score += 5;
          } else {
            invincibleTimer = 300; // environ 5 secondes à 60 FPS
          }
          playBeep(800, 0.1, 0.08);
          // Marquer comme collecté et supprimer le bonus pour qu'il disparaisse
          obs.bonus.collected = true;
          obs.bonus = null;
        }
      }
      if (obs.isOffScreen()) {
        obstacles.splice(i, 1);
      }
    }
  }

  /**
   * Dessine l’arrière‑plan : ciel en dégradé, nuages flottants et sol herbeux.
   */
  function drawBackground() {
    // Ciel dégradé
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height - groundHeight);
    skyGrad.addColorStop(0, '#bbdefb');
    skyGrad.addColorStop(1, '#e3f2fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height - groundHeight);
    // Nuages
    clouds.forEach((c) => c.draw());
    // Oiseaux en arrière‑plan
    birds.forEach((b) => b.draw());
    // Sol : utiliser un motif à partir d'une image pour remplacer le fond vert.
    // Si l'image est chargée, l'étirer sur toute la largeur du jeu.  Dans le
    // cas contraire, dessiner un dégradé beige pour éviter un fond vert.
    if (groundImg.complete && groundImg.naturalWidth) {
      ctx.drawImage(groundImg, 0, height - groundHeight, width, groundHeight);
    } else {
      const groundGrad = ctx.createLinearGradient(0, height - groundHeight, 0, height);
      groundGrad.addColorStop(0, '#f0e5d0');
      groundGrad.addColorStop(1, '#d2b48c');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, height - groundHeight, width, groundHeight);
    }
  }

  function draw() {
    // Effacer l’écran
    ctx.clearRect(0, 0, width, height);
    // Dessiner le fond (ciel, nuages et sol)
    drawBackground();
    // Dessiner les obstacles
    obstacles.forEach((obs) => obs.draw());
    // Si invincible, dessiner un halo autour du capybara
    if (invincibleTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.ellipse(capy.x, capy.y, capy.width * 0.7, capy.height * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Dessiner le capybara
    capy.draw();
    // Score courant au centre du haut.  On affiche uniquement le nombre,
    // dans une police dorée et en gras, avec une boîte semi‑transparente
    // pour améliorer la lisibilité sur le ciel et les obstacles.
    ctx.save();
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const scoreStr = String(Math.floor(score));
    const metrics = ctx.measureText(scoreStr);
    const pad = 12;
    const boxW = metrics.width + pad * 2;
    const boxH = 38;
    const boxX = (width - boxW) / 2;
    const boxY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(scoreStr, width / 2, boxY + boxH / 2);
    // Afficher l'indication d'invincibilité sous le score si nécessaire
    if (invincibleTimer > 0) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('Invincibilité', width / 2, boxY + boxH + 18);
    }
    ctx.restore();
  }

  function endGame() {
    state = STATE_GAMEOVER;
    // Mettre à jour le meilleur score
    if (score > highScore) {
      highScore = score;
      try {
        localStorage.setItem('flappyCapybaraHighScore', String(highScore));
      } catch (e) {
        // Ignore stockage
      }
    }
    // Afficher uniquement la valeur du score et du record dans l'écran de fin
    currentScoreEl.textContent = `${score}`;
    highScoreEl.textContent = `${highScore}`;
    // Ajouter un visuel et un message humoristique.  Pour les scores
    // inférieurs à 10, utiliser un message satirique pour souligner la
    // performance modeste du joueur.  Sinon, sélectionner une
    // anecdote fromagère.
    if (funMessageEl) {
      let msg;
      if (score < 10) {
        msg = lowScoreMessages[Math.floor(Math.random() * lowScoreMessages.length)];
      } else {
        msg = cheeseMessages[Math.floor(Math.random() * cheeseMessages.length)];
      }
      const imgSrc = funImages[Math.floor(Math.random() * funImages.length)];
      funMessageEl.innerHTML = `<img src="${imgSrc}"> <span>${msg}</span>`;
    }
    gameOverOverlay.classList.remove('hidden');
    playBeep(200, 0.2, 0.15);
    // Arrêter la musique d'ambiance lorsque la partie se termine
    stopMusic();
  }

  function gameLoop() {
    // Ne pas exécuter le jeu tant que la pop‑up de pré‑lancement est visible
    if (window.CAPY_PRESTART_ACTIVE) {
      requestAnimationFrame(gameLoop);
      return;
    }
    if (state === STATE_PLAYING) {
      update();
      draw();
    }
    requestAnimationFrame(gameLoop);
  }

  // Démarrage du jeu depuis le menu
  function startGame() {
    resetGame();
    state = STATE_PLAYING;
    // Masquer l'écran de menu et l'écran de fin si présents.  Sur la page
    // flappy.html, le menu n'existe pas et ces lignes sont donc sans effet.
    if (menuOverlay) menuOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    // Démarrer la musique d'ambiance pour le mode volant
    startMusic();
  }

  // Lorsque l'overlay de pré‑lancement se ferme, un événement "capyGameStart"
  // est envoyé par config.js.  Sur les pages où Flying Capy se lance
  // automatiquement (flappy.html), il faut démarrer la partie à ce
  // moment‑là car il n'y a pas de bouton « play ».  La condition
  // STATE_MENU garantit que l'on ne redémarre pas une partie en cours.
  window.addEventListener('capyGameStart', () => {
    if (state === STATE_MENU) {
      startGame();
    }
  });

  // Par sécurité, lancer la partie automatiquement après 2,5 s si
  // l'événement n'est jamais reçu (par exemple si config.js n'est pas
  // chargé ou qu'un bug empêche l'émission de capyGameStart).  Ce
  // délai garantit que le jeu démarre toujours.
  setTimeout(() => {
    if (state === STATE_MENU) {
      startGame();
    }
  }, 2500);
  function returnMenu() {
    state = STATE_MENU;
    // Afficher l'écran de menu si présent et masquer l'écran de fin
    if (menuOverlay) menuOverlay.classList.remove('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    // Mettre à jour les textes de meilleurs scores lors du retour au menu principal
    updateMenuScores();
    // Arrêter la musique d'ambiance lorsque l'on retourne au menu
    stopMusic();
  }

  // Listeners boutons.  Vérifier l'existence de chaque élément avant de lui
  // attacher un gestionnaire d'événement afin d'éviter une erreur si l'élément
  // n'est pas présent sur la page (c'est le cas de flappy.html).
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      startGame();
    });
  }
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      startGame();
    });
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      // Sur la page de jeu autonome (flappy.html), il n'y a pas d'écran de menu ;
      // dans ce cas on retourne à la page d'accueil.  Sinon on affiche le menu interne.
      if (!menuOverlay) {
        // Lorsque l'écran de jeu autonome (par ex. flappy.html) est affiché, revenir
        // au menu principal situé un niveau au‑dessus.  Sans ce préfixe, le chemin
        // est interprété comme capy/Capy/games.html.
        window.location.href = '../Capy/games.html';
      } else {
        returnMenu();
      }
    });
  }
  if (runnerBtn) {
    runnerBtn.addEventListener('click', () => {
      window.location.href = 'runner.html';
    });
  }
  // Bouton pour accéder au mode Ragondin Véhicule.  Redirige vers la page dédiée.
  const energyBtn = document.getElementById('energy-button');
  if (energyBtn) {
    energyBtn.addEventListener('click', () => {
      window.location.href = 'energy.html';
    });
  }

  // Contrôles de jeu (clic/touch ou barre espace)
  function handleJump(e) {
    if (state === STATE_PLAYING) {
      capy.jump();
    } else if (state === STATE_MENU) {
      startGame();
    }
  }
  canvas.addEventListener('mousedown', handleJump);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleJump();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      handleJump();
    }
  });

  // Adapter le canvas à la taille de la fenêtre
  function resizeCanvas() {
    const ratio = 480 / 640;
    const windowRatio = window.innerWidth / window.innerHeight;
    if (windowRatio > ratio) {
      // Largeur trop grande, ajuster largeur
      const newHeight = window.innerHeight;
      const newWidth = newHeight * ratio;
      canvas.width = newWidth;
      canvas.height = newHeight;
    } else {
      const newWidth = window.innerWidth;
      const newHeight = newWidth / ratio;
      canvas.width = newWidth;
      canvas.height = newHeight;
    }
    // Appliquer la taille de style pour permettre le centrage horizontal via margin auto
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    width = canvas.width;
    height = canvas.height;
    // Le jeu volant ne nécessite pas d'afficher le sol : conserver un sol nul
    groundHeight = 0;
    // Mettre à jour capybara pour qu’il reste proportionnel (à ce stade on garde la taille)
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Afficher les meilleurs scores dans le menu au chargement
  updateMenuScores();

  // Pour la page flappy.html il n'y a pas de bouton play.  Nous ne
  // démarrons plus immédiatement la partie afin de laisser aux
  // ressources le temps de se charger.  Le démarrage est désormais
  // déclenché par l'événement "capyGameStart" (géré dans config.js) ou
  // par le fallback ci‑dessus (setTimeout).  Nous masquons
  // simplement les overlays s'ils existent pour éviter qu'ils
  // apparaissent par erreur.
  if (!playBtn) {
    if (menuOverlay) menuOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    // Ne pas lancer startGame ici ; il sera déclenché automatiquement
    // lorsque l'événement capyGameStart sera émis ou après le délai
    // spécifié dans setTimeout ci‑dessus.
  }

  // Lancer la boucle de jeu
  requestAnimationFrame(gameLoop);
})();
