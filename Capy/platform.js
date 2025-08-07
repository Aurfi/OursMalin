(() => {
  // Jumping Capy : jeu de plateforme à défilement inspiré de Super Mario.
  // Le capybara peut courir vers la gauche ou la droite et sauter pour éviter
  // des trous et des ennemis.  Les niveaux sont définis statiquement afin
  // d'être facilement extensibles et modifiables sans changer la logique de
  // base.  Les coordonnées verticales sont mesurées à partir du sol (0
  // représente le niveau du sol).  La caméra suit le joueur afin de
  // parcourir un niveau plus large que l'écran.

  const canvas = document.getElementById('platformCanvas');
  const ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;

  // Image pour Super Capy.  Cette illustration détourée sera utilisée dans
  // Player.draw() pour remplacer les formes vectorielles du héros et
  // respecter l'icône de Super Capy sur le menu.
  const capySuperImg = new Image();
  // Utiliser exclusivement la version transparente de Super Capy.  Le jeu
  // original fournissait des sprites avec un fond beige.  Afin de mieux
  // s'intégrer à l'arrière‑plan du niveau, nous chargeons désormais une
  // version détourée et transparente (fichier capybara_super_user.png) que
  // nous avons ajouté au dossier assets à partir de l'image fournie par
  // l'utilisateur.  Si ce fichier est absent, le jeu tombera
  // automatiquement sur l'ancien sprite.
  capySuperImg.src = 'assets/capybara_super_user.png';

  // État du jeu : 'playing', 'gameover' ou 'win'
  let state = 'playing';
  let win = false;

  // Score et meilleur score
  let score = 0;
  let highScore = 0;
  try {
    const stored = localStorage.getItem('capyPlatformHighScore');
    if (stored !== null) highScore = parseInt(stored, 10) || 0;
  } catch (e) {
    highScore = 0;
  }

  // Sélecteurs d'interface
  const gameOverOverlay = document.getElementById('platform-gameover');
  const currentScoreEl = document.getElementById('platform-current-score');
  const highScoreEl = document.getElementById('platform-high-score');
  const funMessageEl = document.getElementById('platform-fun-message');
  const replayBtn = document.getElementById('platform-replay-button');
  const menuBtn = document.getElementById('platform-menu-button');
  const nextBtn = document.getElementById('platform-next-button');
  // Élément DOM pour la flèche directionnelle.  Cet élément est défini dans
  // platform.html et s'affiche au démarrage de chaque niveau pour
  // indiquer la direction à suivre.  Un timer est utilisé pour le
  // masquer automatiquement après une durée définie.
  const directionArrowEl = document.getElementById('direction-arrow');
  let arrowTimeoutId = null;
  // Mobile controls
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');
  const btnJump = document.getElementById('btn-jump');

  // Audio
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  try {
    audioCtx = new AudioContext();
  } catch (e) {
    audioCtx = null;
  }
  // Indicateurs de son.  isMuted coupe tous les sons et la musique.
  let isMuted = false;
  // Audio ambiant du niveau.  Ce fichier est un bruit blanc (ou vide) qui
  // pourra être remplacé par une vraie ambiance par l’utilisateur.  Il est
  // lu en boucle pendant le jeu.
  const ambient = new Audio('assets/sounds/ambient_platform.wav');
  ambient.loop = true;

  // Appliquer immédiatement le volume global à l'ambiance.
  applyVolume();

  // ---------------------------------------------------------------------------
  // Ajouts pour la version étendue de Super Capy
  //
  // ENEMY_HITBOX_MARGIN : réduit la taille de la boîte de collision des
  // ennemis pour offrir un peu de tolérance au joueur.  Un ennemi n'est
  // touché que si le capybara le chevauche réellement, ce qui rend le jeu
  // plus indulgent.
  const ENEMY_HITBOX_MARGIN = 6;

  // Liste des tuyaux présents dans le niveau.  Chaque tuyau peut optionnellement
  // définir des coordonnées destX et destY pour téléporter le joueur à
  // l'entrée d'un autre tuyau lorsqu'il appuie sur la touche bas.
  let pipes = [];

  // Segments de trace laissés derrière le joueur.  Lorsqu'il se déplace,
  // des points sont ajoutés dans cette liste et s'estompent progressivement.
  let trailSegments = [];
  const MAX_TRAIL_SEGMENTS = 80;

  // Hauteur maximale autorisée pour les niveaux aquatiques.  Ce paramètre
  // est défini lors du chargement du niveau via lvl.maxY.  Il permet de
  // limiter la montée du joueur sous l'eau afin de conserver le capybara
  // dans le cadre de jeu.
  let levelMaxY = 0;

  /**
   * Calcule le volume global enregistré par le menu.  Si aucune valeur
   * n'est trouvée, retourne 0,5 par défaut.  Ce volume est appliqué à
   * l'audio ambiant et aux effets sonores.
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
   * Applique le volume global ou coupe complètement le son selon isMuted.
   */
  function applyVolume() {
    const vol = isMuted ? 0 : getGlobalVolume();
    ambient.volume = vol;
  }

  /**
   * Joue un petit bip pour les actions (saut, pièce, etc.).  Ne joue rien si
   * le son est coupé ou si le contexte audio n'existe pas.
   */
  function playBeep(frequency, duration = 0.1, volume = 0.1) {
    if (!audioCtx || isMuted) return;
    const ctx2 = audioCtx;
    const osc = ctx2.createOscillator();
    const gain = ctx2.createGain();
    osc.frequency.value = frequency;
    osc.type = 'square';
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx2.destination);
    const now = ctx2.currentTime;
    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Démarre la lecture de l'ambiance lorsqu'une partie débute.  Si le son
   * est coupé, la lecture est mise en pause.  L'ambiance continue en boucle
   * jusqu'à ce que stopMusic() soit appelé.
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
   * Arrête la musique d'ambiance.  La fonction pause() est utilisée au
   * lieu de stop() car cela fonctionne mieux dans tous les navigateurs.
   */
  function stopMusic() {
    try {
      ambient.pause();
    } catch (e) {
      /* ignore */
    }
  }

  // Bouton de volume : coupe/rétablit tous les sons et l'ambiance.
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

  // ---------------------------------------------------------------------------
  // Gestion de la vitesse indépendante du rafraîchissement
  //
  // De nombreux moteurs de jeu basent leurs mouvements et minuteries sur le
  // nombre de frames affichées.  Sur des écrans plus rapides (120 Hz, 144 Hz),
  // cela entraîne des déplacements plus rapides et des animations qui
  // s’accélèrent, tandis que sur des écrans plus lents (30 Hz) le jeu peut
  // sembler poussif.  Afin de rendre Super Capy et les autres mini‑jeux
  // jouables quelle que soit la fréquence de rafraîchissement, nous appliquons
  // un multiplicateur de vitesse global dérivé de la mesure effectuée dans
  // config.js.  Ce multiplicateur est récupéré via window.getGameSpeed('platform')
  // et mis à jour lorsque l’événement capySpeedUpdated est émis.  Toutes les
  // mises à jour de position et d’accélération tiennent compte de ce facteur.

  // Facteur de vitesse appliqué aux mouvements.  La valeur par défaut est 1.
  let speedFactor = 1;
  function applySpeedFactor() {
    try {
      if (window.getGameSpeed) {
        const s = window.getGameSpeed('platform');
        speedFactor = (typeof s === 'number' && s > 0) ? s : 1;
      } else {
        speedFactor = 1;
      }
    } catch (e) {
      speedFactor = 1;
    }
  }
  // Appliquer immédiatement le facteur de vitesse et se mettre à l’écoute
  // d’éventuelles mises à jour dynamiques de la vitesse.
  applySpeedFactor();
  window.addEventListener('capySpeedUpdated', applySpeedFactor);

  // Contrôles clavier
  // Objet contenant l'état des touches.  Ajoutons la touche "down" pour
  // permettre d'entrer dans les tuyaux ou de descendre sous l'eau.  Les
  // autres directions restent inchangées.
  const keys = { left: false, right: false, up: false, down: false };
  // Dernière pression sur la touche bas.  Servira à détecter un double
  // appui pour traverser les plateformes aériennes.
  let lastDownPressTime = 0;
  window.addEventListener('keydown', (e) => {
    if (state === 'playing') {
      if (e.code === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') keys.left = true;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
      // Gestion de la touche de saut/monter.  Le joueur saute seulement
      // lorsque le niveau n'est pas aquatique.  Dans un niveau sous-marin,
      // la touche haut sert à nager vers le haut et ne déclenche pas de saut.
      if (e.code === 'ArrowUp' || e.code === 'Space' || e.key === 'z' || e.key === 'Z') {
        keys.up = true;
        // Le joueur ne saute pas sous l'eau : le mouvement vertical est géré
        // par Player.update() lorsqu'un niveau est marqué underwater.
        if (!(levels[currentLevelIndex] && levels[currentLevelIndex].underwater)) {
          player.jump();
        }
      }
      // Touche pour descendre ou entrer dans un tuyau
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        // Double appui pour traverser les plateformes aériennes.  Cette
        // fonctionnalité n'est active que lorsque le joueur est posé sur une
        // plateforme située au-dessus du sol (y>0) et que le niveau n'est
        // pas aquatique.
        const now = Date.now();
        const lvl = levels[currentLevelIndex] || {};
        if (player && player.isOnGround && player.y > 0 && !lvl.underwater) {
          if (now - lastDownPressTime < 300) {
            player.dropThroughTimer = 18;
          }
          lastDownPressTime = now;
        }
        keys.down = true;
      }
    } else if (state !== 'playing' && (e.code === 'Space' || e.code === 'Enter')) {
      resetGame();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') keys.left = false;
    if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'Space' || e.key === 'z' || e.key === 'Z') keys.up = false;
    if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
  });

  // Contrôles mobiles et de bureau pour les boutons fléchés.
  // Sur mobile, les événements tactiles sont utilisés pour le maintien.  Sur
  // bureau (ou certains navigateurs mobiles qui n'envoient pas touchstart),
  // les événements mouse/pointer sont également pris en charge.  Chaque
  // handler appelle preventDefault pour éviter le défilement de la page.
  function attachButtonControls(btn, onStart, onEnd) {
    if (!btn) return;
    // Touch events
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onStart();
    }, { passive: false });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (onEnd) onEnd();
    }, { passive: false });
    btn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      if (onEnd) onEnd();
    }, { passive: false });
    // Mouse events as fallback (desktop or some browsers)
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStart();
    });
    if (onEnd) {
      btn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        onEnd();
      });
      btn.addEventListener('mouseleave', (e) => {
        e.preventDefault();
        onEnd();
      });
    }
  }
  // Appliquer aux boutons gauche et droit : maintien pour l'accélération
  attachButtonControls(btnLeft, () => { keys.left = true; }, () => { keys.left = false; });
  attachButtonControls(btnRight, () => { keys.right = true; }, () => { keys.right = false; });
  // Le bouton de saut lance simplement la méthode jump du joueur
  if (btnJump) {
    attachButtonControls(btnJump, () => {
      player.jump();
    }, null);
  }

  // Définition des niveaux.  Chaque niveau est un objet contenant la hauteur
  // du sol, la largeur totale et des tableaux pour les plateformes (y
  // au‑dessus du sol), les ennemis, les bonus et la zone de fin (goal).
  // Le premier niveau correspond au niveau original.  Deux nouveaux niveaux
  // ont été ajoutés pour offrir plus de variété.  Les niveaux sont orientés
  // soit vers la droite (goal.x > point de départ) soit vers la gauche
  // (goal.x < point de départ).  Une flèche directionnelle s'affiche
  // brièvement au début pour indiquer au joueur dans quelle direction se
  // rendre.
  const levels = [
    {
      groundHeight: 80,
      width: 2200,
      // Position de départ du joueur.  Si absent, la valeur 50 est utilisée.
      startX: 50,
      platforms: [
        // Segments de sol (y = 0).  Les trous sont créés en omettant des
        // segments pour forcer le joueur à sauter par‑dessus.
        { x: 0, y: 0, width: 400, height: 20 },
        { x: 600, y: 0, width: 300, height: 20 },
        { x: 1000, y: 0, width: 400, height: 20 },
        { x: 1500, y: 0, width: 350, height: 20 },
        // Plates‑formes en l'air
        { x: 500, y: 120, width: 150, height: 20 },
        { x: 800, y: 160, width: 120, height: 20 },
        { x: 1300, y: 100, width: 160, height: 20 },
        { x: 1700, y: 140, width: 150, height: 20 }
      ],
      enemies: [
        { x: 700, y: 0, type: 'goomba' },
        { x: 1350, y: 0, type: 'goomba' },
        { x: 1800, y: 140, type: 'goomba' }
      ],
      bonuses: [
        { x: 550, y: 160, type: 'carrot' },
        { x: 850, y: 200, type: 'potato' },
        { x: 1450, y: 130, type: 'carrot' }
      ],
      goal: { x: 2000, y: 0, width: 40, height: 120 }
    },
    // Nouveau niveau 2 : un parcours plus long avec un enchaînement de
    // plateformes de hauteur moyenne et quelques trous plus larges.  La
    // configuration exige l'utilisation du double saut pour atteindre les
    // plateformes suspendues sans toutefois permettre d'atteindre le haut
    // de l'écran avec un seul saut.
    {
      groundHeight: 80,
      width: 2600,
      startX: 50,
      platforms: [
        { x: 0, y: 0, width: 500, height: 20 },
        { x: 650, y: 0, width: 300, height: 20 },
        { x: 1050, y: 0, width: 350, height: 20 },
        { x: 1500, y: 0, width: 500, height: 20 },
        // Plates‑formes aériennes à hauteur moyenne
        { x: 450, y: 120, width: 160, height: 20 },
        { x: 820, y: 170, width: 140, height: 20 },
        { x: 1250, y: 140, width: 170, height: 20 },
        { x: 1700, y: 180, width: 130, height: 20 },
        { x: 2000, y: 140, width: 170, height: 20 }
      ],
      enemies: [
        { x: 600, y: 0, type: 'goomba' },
        { x: 900, y: 0, type: 'goomba' },
        { x: 1450, y: 0, type: 'goomba' },
        { x: 1850, y: 140, type: 'goomba' }
      ],
      bonuses: [
        { x: 500, y: 160, type: 'carrot' },
        { x: 880, y: 210, type: 'potato' },
        { x: 1300, y: 190, type: 'carrot' },
        { x: 1900, y: 220, type: 'potato' }
      ],
      goal: { x: 2400, y: 0, width: 40, height: 120 }
    },
    // Nouveau niveau 3 : un aller‑retour où le joueur doit se diriger
    // vers la gauche pour atteindre le drapeau.  Les plateformes sont
    // disposées de façon symétrique et imposent de maîtriser le double
    // saut.  Le départ est situé vers la droite et la flèche directionnelle
    // indiquera de partir vers la gauche.
    {
      groundHeight: 80,
      width: 2600,
      // Ce niveau débute à droite et se dirige vers la gauche.  Le
      // joueur est positionné vers la fin du niveau et doit revenir
      // jusqu'au début.  La direction est explicitement indiquée.
      startX: 2400,
      direction: 'left',
      platforms: [
        { x: 2100, y: 0, width: 500, height: 20 },
        { x: 1600, y: 0, width: 350, height: 20 },
        { x: 1100, y: 0, width: 300, height: 20 },
        { x: 500, y: 0, width: 400, height: 20 },
        // Plates‑formes aériennes
        { x: 1900, y: 150, width: 150, height: 20 },
        { x: 1500, y: 120, width: 170, height: 20 },
        { x: 900, y: 160, width: 150, height: 20 },
        { x: 600, y: 200, width: 130, height: 20 }
      ],
      enemies: [
        { x: 2000, y: 0, type: 'goomba' },
        { x: 1500, y: 0, type: 'goomba' },
        { x: 800, y: 0, type: 'goomba' },
        { x: 550, y: 200, type: 'goomba' }
      ],
      bonuses: [
        { x: 1850, y: 200, type: 'carrot' },
        { x: 1420, y: 170, type: 'potato' },
        { x: 780, y: 210, type: 'carrot' },
        { x: 520, y: 240, type: 'potato' }
      ],
      goal: { x: 100, y: 0, width: 40, height: 120 }
    }
    ,
    // Niveau 4 : parcours étendu avec de nombreuses plateformes aériennes.  De
    // longs segments de sol alternent avec des trous et des plateformes
    // suspendues disposées à différentes hauteurs.  Le joueur commence
    // à gauche et doit utiliser le double saut avec parcimonie pour
    // atteindre les bonus et éviter les ennemis.  Les goombas sont
    // positionnés aussi bien au sol que sur les plateformes.
    {
      groundHeight: 80,
      width: 2800,
      startX: 50,
      platforms: [
        { x: 0, y: 0, width: 400, height: 20 },
        { x: 600, y: 0, width: 300, height: 20 },
        { x: 1100, y: 0, width: 350, height: 20 },
        { x: 1700, y: 0, width: 400, height: 20 },
        // Plates‑formes aériennes à différentes hauteurs
        { x: 500, y: 140, width: 150, height: 20 },
        { x: 900, y: 180, width: 140, height: 20 },
        { x: 1400, y: 140, width: 160, height: 20 },
        { x: 1800, y: 200, width: 130, height: 20 },
        { x: 2200, y: 160, width: 180, height: 20 }
      ],
      enemies: [
        { x: 700, y: 0, type: 'goomba' },
        { x: 950, y: 0, type: 'goomba' },
        { x: 1500, y: 0, type: 'goomba' },
        { x: 1900, y: 200, type: 'goomba' },
        { x: 2300, y: 160, type: 'goomba' }
      ],
      bonuses: [
        { x: 550, y: 160, type: 'carrot' },
        { x: 940, y: 220, type: 'potato' },
        { x: 1450, y: 180, type: 'carrot' },
        { x: 1850, y: 240, type: 'potato' },
        { x: 2250, y: 190, type: 'carrot' }
      ],
      goal: { x: 2600, y: 0, width: 40, height: 120 }
    },
    // Niveau 5 : défi vertical.  Ce niveau comporte des tours de
    // plateformes superposées qui obligent à enchaîner les sauts pour
    // progresser.  Des séries de plateformes élevées facilitent la
    // traversée mais requièrent un bon timing.  La largeur importante
    // augmente la durée de la partie.
    {
      groundHeight: 80,
      width: 3000,
      startX: 50,
      platforms: [
        { x: 0, y: 0, width: 500, height: 20 },
        { x: 600, y: 0, width: 350, height: 20 },
        { x: 1200, y: 0, width: 400, height: 20 },
        { x: 1800, y: 0, width: 450, height: 20 },
        // Tours de plateformes verticales sur la première moitié
        { x: 800, y: 120, width: 140, height: 20 },
        { x: 800, y: 200, width: 140, height: 20 },
        { x: 800, y: 280, width: 140, height: 20 },
        { x: 1600, y: 120, width: 150, height: 20 },
        { x: 1600, y: 200, width: 150, height: 20 },
        { x: 1600, y: 280, width: 150, height: 20 },
        // Plateformes sur la deuxième moitié pour créer un chemin aérien
        { x: 2200, y: 160, width: 180, height: 20 },
        { x: 2400, y: 220, width: 180, height: 20 },
        { x: 2600, y: 180, width: 150, height: 20 }
      ],
      enemies: [
        { x: 700, y: 0, type: 'goomba' },
        { x: 850, y: 120, type: 'goomba' },
        { x: 1400, y: 0, type: 'goomba' },
        { x: 1700, y: 120, type: 'goomba' },
        { x: 2200, y: 160, type: 'goomba' },
        { x: 2600, y: 180, type: 'goomba' }
      ],
      bonuses: [
        { x: 600, y: 160, type: 'carrot' },
        { x: 900, y: 320, type: 'potato' },
        { x: 1500, y: 240, type: 'carrot' },
        { x: 2300, y: 200, type: 'potato' },
        { x: 2700, y: 220, type: 'carrot' }
      ],
      goal: { x: 2800, y: 0, width: 40, height: 120 }
    }
    ,
    // Niveau 6 : un parcours sinueux avec des segments de sol plus courts et
    // de nombreuses plateformes intermédiaires.  Ce niveau demande de
    // jongler entre les sauts et les atterrissages sur des plateformes en
    // hauteur tout en évitant plusieurs goombas.  La largeur étendue
    // augmente la durée du niveau.
    {
      groundHeight: 80,
      width: 3200,
      startX: 50,
      platforms: [
        { x: 0, y: 0, width: 400, height: 20 },
        { x: 500, y: 0, width: 250, height: 20 },
        { x: 900, y: 0, width: 300, height: 20 },
        { x: 1400, y: 0, width: 300, height: 20 },
        { x: 1900, y: 0, width: 350, height: 20 },
        // plateformes aériennes
        { x: 650, y: 150, width: 160, height: 20 },
        { x: 1150, y: 200, width: 150, height: 20 },
        { x: 1700, y: 170, width: 170, height: 20 },
        { x: 2300, y: 140, width: 180, height: 20 },
        { x: 2600, y: 200, width: 140, height: 20 }
      ],
      enemies: [
        { x: 600, y: 0, type: 'goomba' },
        { x: 1000, y: 0, type: 'goomba' },
        { x: 1500, y: 0, type: 'goomba' },
        { x: 2100, y: 0, type: 'goomba' },
        { x: 2600, y: 170, type: 'goomba' }
      ],
      bonuses: [
        { x: 580, y: 170, type: 'carrot' },
        { x: 1200, y: 230, type: 'potato' },
        { x: 1750, y: 200, type: 'carrot' },
        { x: 2400, y: 180, type: 'potato' },
        { x: 2800, y: 220, type: 'carrot' }
      ],
      goal: { x: 3000, y: 0, width: 40, height: 120 }
    }
    ,
    // Niveau 7 : niveau tournant où le capy doit monter sur des tours de
    // plateformes disposées à différentes hauteurs.  De nombreux trous
    // séparent les segments de sol, obligeant le joueur à maîtriser le
    // timing de ses sauts.  Des bonus généreux récompensent les prises de
    // risque.
    {
      groundHeight: 80,
      width: 3400,
      startX: 50,
      platforms: [
        { x: 0, y: 0, width: 350, height: 20 },
        { x: 450, y: 0, width: 300, height: 20 },
        { x: 900, y: 0, width: 250, height: 20 },
        { x: 1300, y: 0, width: 300, height: 20 },
        { x: 1750, y: 0, width: 350, height: 20 },
        // Tours verticales
        { x: 700, y: 140, width: 140, height: 20 },
        { x: 700, y: 220, width: 140, height: 20 },
        { x: 1500, y: 160, width: 150, height: 20 },
        { x: 1500, y: 240, width: 150, height: 20 },
        { x: 2200, y: 180, width: 160, height: 20 },
        { x: 2200, y: 260, width: 160, height: 20 }
      ],
      enemies: [
        { x: 500, y: 0, type: 'goomba' },
        { x: 800, y: 160, type: 'goomba' },
        { x: 1200, y: 0, type: 'goomba' },
        { x: 1600, y: 200, type: 'goomba' },
        { x: 2100, y: 0, type: 'goomba' },
        { x: 2500, y: 260, type: 'goomba' }
      ],
      bonuses: [
        { x: 650, y: 180, type: 'carrot' },
        { x: 900, y: 260, type: 'potato' },
        { x: 1550, y: 220, type: 'carrot' },
        { x: 2250, y: 300, type: 'potato' },
        { x: 2750, y: 280, type: 'carrot' }
      ],
      goal: { x: 3200, y: 0, width: 40, height: 120 }
    }
    ,
    // Niveau 8 : un dernier niveau épique avec une alternance de sol et de
    // longues plateformes suspendues à haute altitude.  Les trous sont
    // nombreux et les goombas apparaissent à la fois au sol et en hauteur.
    // La largeur de 3600 px rend ce niveau particulièrement long et
    // exigeant.
    {
      groundHeight: 80,
      width: 3600,
      startX: 50,
      platforms: [
        { x: 0, y: 0, width: 400, height: 20 },
        { x: 550, y: 0, width: 300, height: 20 },
        { x: 950, y: 0, width: 350, height: 20 },
        { x: 1450, y: 0, width: 300, height: 20 },
        { x: 1950, y: 0, width: 350, height: 20 },
        // Plates‑formes suspendues très hautes pour un défi vertical
        { x: 700, y: 220, width: 160, height: 20 },
        { x: 1100, y: 260, width: 150, height: 20 },
        { x: 1500, y: 300, width: 170, height: 20 },
        { x: 2100, y: 240, width: 160, height: 20 },
        { x: 2500, y: 280, width: 150, height: 20 },
        { x: 3000, y: 200, width: 170, height: 20 }
      ],
      enemies: [
        { x: 600, y: 0, type: 'goomba' },
        { x: 950, y: 0, type: 'goomba' },
        { x: 1250, y: 260, type: 'goomba' },
        { x: 1750, y: 300, type: 'goomba' },
        { x: 2150, y: 240, type: 'goomba' },
        { x: 2750, y: 280, type: 'goomba' },
        { x: 3200, y: 200, type: 'goomba' }
      ],
      bonuses: [
        { x: 650, y: 250, type: 'carrot' },
        { x: 1200, y: 300, type: 'potato' },
        { x: 1600, y: 340, type: 'carrot' },
        { x: 2300, y: 260, type: 'potato' },
        { x: 2800, y: 300, type: 'carrot' },
        { x: 3300, y: 230, type: 'potato' }
      ],
      goal: { x: 3400, y: 0, width: 40, height: 120 }
    }
  ];
  // Les niveaux supplémentaires sont générés de manière procédurale.  Nous
  // conservons uniquement le premier niveau pré‑défini et remplissons le
  // reste du tableau avec des niveaux créés à la volée via
  // generateProceduralLevel().  Cette nouvelle génération introduit des
  // plateformes aléatoires, des trous, des pipes, des ennemis variés et
  // des niveaux sous-marins.  Le nombre total de niveaux reste identique
  // (45) pour préserver la progression.
  {
    const firstLevel = levels[0];
    levels.length = 1;
    for (let i = 1; i < 45; i++) {
      levels.push(generateProceduralLevel(i));
    }
  }

  /**
   * Génère un niveau procédural pour Super Capy.  Chaque niveau créé
   * contient un mélange de segments de sol avec des trous, de plates‑formes
   * aériennes, d'ennemis variés et parfois de tuyaux menant à des zones
   * éloignées.  Tous les 5 niveaux, un niveau est marqué comme
   * sous‑marin.  Dans ces niveaux, il n'y a pas de sol continu et le
   * joueur se déplace librement dans l'eau en évitant poissons et mines.
   * @param {number} index Indice du niveau (1‑based)
   * @returns {object} Objet représentant un niveau
   */
  function generateProceduralLevel(index) {
    const underwater = (index % 5 === 0);
    // Largeur du niveau : augmente avec l'indice et ajoute une petite
    // variation aléatoire pour éviter la monotonie.  La largeur reste
    // suffisamment grande pour permettre un gameplay intéressant.
    const baseWidth = 2200 + index * 100;
    const widthVariation = 200 + Math.random() * 200;
    const levelWidthValue = baseWidth + widthVariation;
    const level = {
      underwater: underwater,
      groundHeight: underwater ? 0 : 80,
      width: levelWidthValue,
      platforms: [],
      enemies: [],
      bonuses: [],
      pipes: [],
      // Limite verticale dans les niveaux aquatiques.  La valeur est
      // utilisée pour contraindre la hauteur maximale (capybara.y + height)
      // de l'avatar.  Dans les niveaux terrestres, maxY est omis.
      maxY: underwater ? 300 + Math.random() * 100 : undefined,
    };
    // Déterminer la position de départ et la direction.  Par défaut, on
    // commence à gauche ; une fois sur quatre, on commence à droite pour
    // varier le parcours.
    const directionLeft = (index % 4 === 1);
    level.startX = directionLeft ? levelWidthValue - 200 : 50;
    if (directionLeft) level.direction = 'left';
    // Définir la position de la fin du niveau (goal).  Le drapeau est
    // placé à environ 200 px de la fin dans la direction opposée au
    // départ.
    level.goal = directionLeft
      ? { x: 100, y: 0, width: 40, height: underwater ? 80 : 120 }
      : { x: levelWidthValue - 200, y: 0, width: 40, height: underwater ? 80 : 120 };
    if (!underwater) {
      // Construction du sol par segments entrecoupés de trous.  Nous
      // garantissons un parcours réalisable en limitant la longueur des
      // trous et en ajoutant occasionnellement des plates‑formes qui
      // permettent de franchir les gaps plus larges.
      let xPos = 0;
      while (xPos < levelWidthValue - 300) {
        // Longueur du segment de sol
        const segW = 250 + Math.random() * 250; // 250 à 500
        level.platforms.push({ x: xPos, y: 0, width: segW, height: 30 });
        // Plates‑formes aériennes au-dessus de ce segment avec une
        // probabilité de 30 %
        if (Math.random() < 0.3) {
          const platW = 100 + Math.random() * 120;
          // Position aléatoire au-dessus du segment mais sans dépasser la
          // largeur du niveau
          const px = xPos + (segW - platW) * Math.random();
          const py = 90 + Math.random() * 150;
          level.platforms.push({ x: px, y: py, width: platW, height: 20 });
        }
        xPos += segW;
        // Largeur du trou (gap) : entre 80 et 180 px.  Pour les grands
        // trous (>150 px), ajouter une plate‑forme qui les surplombe afin
        // de garantir qu'ils soient franchissables.
        const gapW = 80 + Math.random() * 100; // 80 à 180
        if (gapW > 150) {
          const platW2 = 120 + Math.random() * 80;
          const px2 = xPos + (gapW - platW2) / 2;
          const py2 = 120 + Math.random() * 120;
          level.platforms.push({ x: px2, y: py2, width: platW2, height: 20 });
        }
        xPos += gapW;
      }
      // Ajouter quelques plates‑formes supplémentaires dispersées
      const extraCount = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < extraCount; i++) {
        const platW = 80 + Math.random() * 140;
        const px = 200 + Math.random() * (levelWidthValue - 400);
        const py = 90 + Math.random() * 200;
        level.platforms.push({ x: px, y: py, width: platW, height: 20 });
      }
      // Générer des ennemis.  Leur nombre augmente légèrement avec l'indice.
      const enemyCount = 3 + Math.floor(Math.random() * 3) + Math.floor(index / 8);
      for (let i = 0; i < enemyCount; i++) {
        const ex = 150 + Math.random() * (levelWidthValue - 300);
        // Choisir une hauteur : sol ou plateforme.  70 % des ennemis au sol.
        let ey = 0;
        if (Math.random() < 0.3 && level.platforms.length > 0) {
          // Choisir une plate‑forme au hasard et placer l'ennemi sur le haut de la plate‑forme
          const p = level.platforms[Math.floor(Math.random() * level.platforms.length)];
          // Dans notre système de coordonnées, p.y représente le bord inférieur de la plate‑forme
          // (distance depuis le sol).  Pour que les ennemis se tiennent au dessus et non au
          // milieu de la plate‑forme, on ajoute la hauteur de la plate‑forme.  La hauteur
          // standard est de 20 px.  On utilise p.height au cas où cela évoluerait.
          ey = p.y + (p.height || 20);
        }
        // Choisir un type d'ennemi.  goomba : 50 %, koopa : 20 %, shell : 15 %,
        // mine : 15 % (pour diversifier les obstacles même hors de l'eau).
        const r = Math.random();
        let type;
        if (r < 0.5) type = 'goomba';
        else if (r < 0.7) type = 'koopa';
        else if (r < 0.85) type = 'shell';
        else type = 'mine';
        level.enemies.push({ x: ex, y: ey, type: type });
      }
      // Bonus (carottes et patates)
      const bonusCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < bonusCount; i++) {
        const bx = 200 + Math.random() * (levelWidthValue - 400);
        // Positionner le bonus soit au sol soit au-dessus d'une plate‑forme
        let by = 0;
        if (Math.random() < 0.4 && level.platforms.length > 0) {
          const p = level.platforms[Math.floor(Math.random() * level.platforms.length)];
          by = p.y + 40;
        } else {
          by = 120 + Math.random() * 200;
        }
        const type = Math.random() < 0.5 ? 'carrot' : 'potato';
        level.bonuses.push({ x: bx, y: by, type: type });
      }
      // Probabilité d'ajouter une paire de tuyaux pour créer un raccourci.
      if (Math.random() < 0.4) {
        // Deux positions aléatoires éloignées l'une de l'autre
        const px1 = 200 + Math.random() * (levelWidthValue * 0.4);
        const px2 = levelWidthValue * 0.6 + Math.random() * (levelWidthValue * 0.3);
        const ph = 80 + Math.random() * 80;
        level.pipes.push({ x: px1, y: 0, height: ph, destX: px2, destY: 0 });
        level.pipes.push({ x: px2, y: 0, height: ph, destX: px1, destY: 0 });
      }
    } else {
      // Construction d'un niveau sous‑marin.  Aucune plateforme au sol,
      // seulement des ennemis et quelques bonus pour guider le joueur.
      // La hauteur maximale est déjà définie.  Générer des poissons et des
      // mines à des positions aléatoires dans la zone.
      const fishCount = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < fishCount; i++) {
        const fx = 150 + Math.random() * (levelWidthValue - 300);
        const fy = 80 + Math.random() * ((level.maxY || 300) - 150);
        const type = Math.random() < 0.7 ? 'fish' : 'mine';
        level.enemies.push({ x: fx, y: fy, type: type });
      }
      // Quelques bonus sous forme de bulles (carottes/patates)
      const bonusCount2 = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < bonusCount2; i++) {
        const bx = 200 + Math.random() * (levelWidthValue - 400);
        const by = 80 + Math.random() * ((level.maxY || 300) - 150);
        const type = Math.random() < 0.5 ? 'carrot' : 'potato';
        level.bonuses.push({ x: bx, y: by, type: type });
      }
      // Ajouter éventuellement un tuyau menant à un autre endroit de la
      // section aquatique, pour varier le parcours.  Le tuyau émerge du
      // fond marin (y=0) et conduit à une zone supérieure.
      if (Math.random() < 0.3) {
        const px1 = 200 + Math.random() * (levelWidthValue * 0.4);
        const px2 = levelWidthValue * 0.6 + Math.random() * (levelWidthValue * 0.3);
        const ph = 60 + Math.random() * 60;
        // Les tuyaux sous l'eau ne dépassent pas la surface, on limite la
        // hauteur au quart de maxY
        const maxH = (level.maxY || 300) * 0.25;
        const h1 = Math.min(ph, maxH);
        const h2 = Math.min(ph, maxH);
        level.pipes.push({ x: px1, y: 0, height: h1, destX: px2, destY: level.maxY * 0.5 || 150 });
        level.pipes.push({ x: px2, y: 0, height: h2, destX: px1, destY: level.maxY * 0.5 || 150 });
      }
    }
    return level;
  }
  let currentLevelIndex = 0;
  // Permettre de choisir le niveau via un paramètre d'URL (?level=1).  Si
  // présent et valide, la variable currentLevelIndex est définie
  // correspondamment (en 0‑based).  Sinon, elle reste à zéro.
  (function parseLevelFromURL() {
    try {
      const params = new URLSearchParams(window.location.search);
      const lvl = parseInt(params.get('level'), 10);
      if (!isNaN(lvl) && lvl >= 1 && lvl <= levels.length) {
        currentLevelIndex = lvl - 1;
      }
    } catch (e) {}
  })();
  let groundHeight = levels[0].groundHeight;
  let levelWidth = levels[0].width;

  // Entités courantes
  let platforms = [];
  let enemies = [];
  let bonuses = [];
  let goal = null;

  // Variables d'indication de direction.  Lors du chargement d'un niveau,
  // arrowStartTime est initialisé à la valeur actuelle de performance.now().
  // Une flèche clignotante indique au joueur s'il faut aller vers la
  // droite ou vers la gauche.  Après arrowDuration millisecondes, la
  // flèche disparaît.  arrowDirection vaut 'right' ou 'left' selon la
  // position du goal par rapport au point de départ.  Ces valeurs sont
  // également utilisées pour dessiner la flèche directement sur le canvas
  // afin d'éviter les soucis de superposition d'éléments HTML.  La
  // variable arrowOpacity n'est plus nécessaire car l'opacité est gérée
  // via ctx.globalAlpha dans la fonction draw().
  let arrowStartTime = 0;
  // Durée d'affichage de la flèche directionnelle en millisecondes.
  // L'utilisateur avait constaté que la flèche restait indéfiniment car
  // arrowDuration était réglé à Infinity pour le débogage.  Nous le
  // remettons maintenant à 3500 ms (3,5 s) pour respecter l'exigence de
  // disparition rapide de la flèche.  Après cette durée, la flèche
  // directionnelle disparaît automatiquement.
  // Durée d'affichage de la flèche directionnelle en millisecondes.
  // La flèche apparaît pendant 3,5 secondes en début de niveau puis
  // disparaît.  Elle clignote tout au long de cette période.
  const arrowDuration = 3500;
  let arrowDirection = 'right';

  // Éléments décoratifs : nuages et oiseaux.  Ces objets sont
  // facultatifs et servent à enrichir le décor pour donner une
  // impression de mouvement même lorsqu'il n'y a pas d'obstacles à
  // l'écran.
  const clouds = [];
  const birds = [];

  // Classe représentant un nuage.  Les nuages se déplacent plus
  // lentement que la caméra afin de créer un effet de parallaxe.
  class Cloud {
    constructor(x, y, scale) {
      this.x = x;
      this.y = y;
      this.scale = scale;
      // Les nuages dérivent lentement vers la gauche en plus du parallaxe
      this.speed = 0.05 + Math.random() * 0.05;
    }
    update() {
      // Déplacer légèrement le nuage vers la gauche pour l'animer.  La
      // vitesse est multipliée par le facteur global afin de conserver
      // une allure constante indépendamment du taux de rafraîchissement.
      this.x -= this.speed * speedFactor;
      // Boucler si le nuage sort trop à gauche du niveau.  Nous ne
      // dépendons plus du nombre de frames pour déterminer la vitesse
      // d'enchaînement : la position se met à jour en temps réel via
      // speedFactor.  Lorsqu'un nuage quitte l'écran, on le replace à
      // droite avec un léger décalage aléatoire.
      if (this.x < -100) {
        this.x = levelWidth + 200 * Math.random();
      }
    }
    draw(cameraX) {
      // Position du nuage avec parallaxe : se déplace plus lentement
      const parallaxFactor = 0.3;
      const screenX = this.x - cameraX * parallaxFactor;
      const screenY = height - groundHeight - this.y;
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.scale(this.scale, this.scale);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      // Dessiner un nuage avec plusieurs cercles
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.arc(30, -10, 35, 0, Math.PI * 2);
      ctx.arc(-30, -10, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Classe représentant un oiseau volant.  Les oiseaux volent à une
  // vitesse modérée vers la gauche.  Ils sont réinitialisés au-delà
  // du bord droit lorsque hors de l'écran.  Dessin simple en forme de V.
  class BirdDeco {
    constructor(x, y, speed) {
      this.x = x;
      this.y = y;
      this.speed = speed;
      this.wingSpan = 28;
      this.life = 0;
    }
    update() {
      // Déplacement de l'oiseau vers la gauche.  Le facteur global
      // garantit une vitesse constante quel que soit le rafraîchissement
      // réel de l'écran.  Le compteur de vie sert uniquement à
      // d'éventuelles animations à l'avenir.
      this.x -= this.speed * speedFactor;
      this.life += speedFactor;
    }
    draw(cameraX) {
      const parallaxFactor = 0.5;
      const screenX = this.x - cameraX * parallaxFactor;
      const screenY = height - groundHeight - this.y;
      ctx.save();
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Forme simplifiée : oiseau en V
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + this.wingSpan / 2, screenY + 10);
      ctx.lineTo(screenX + this.wingSpan, screenY);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Initialiser des nuages espacés sur toute la largeur du niveau.  On
  // appelle cette fonction lors du chargement du niveau afin d'adapter
  // l'environnement à la longueur du niveau.  Les hauteurs sont
  // réparties dans la moitié supérieure de l'écran.
  function spawnClouds() {
    clouds.length = 0;
    const count = Math.max(4, Math.floor(levelWidth / 500));
    for (let i = 0; i < count; i++) {
      const x = Math.random() * levelWidth;
      const y = 200 + Math.random() * 200;
      const scale = 0.5 + Math.random() * 0.5;
      clouds.push(new Cloud(x, y, scale));
    }
  }

  // Gestion des oiseaux décoratifs.  Les oiseaux sont ajoutés
  // aléatoirement pendant l'update et supprimés lorsqu'ils sortent de
  // l'écran sur la gauche.  La vitesse et l'altitude sont variables.
  function spawnBird() {
    const x = levelWidth + 100;
    const y = 200 + Math.random() * 200;
    const speed = 0.7 + Math.random() * 0.5;
    birds.push(new BirdDeco(x, y, speed));
  }

  // Chargement du niveau en cours.  Cette fonction convertit les données
  // brutes en instances de classes pour les plateformes, ennemis et bonus.
  function loadLevel(index) {
    const lvl = levels[index];
    groundHeight = lvl.groundHeight;
    levelWidth = lvl.width;
    // Convertir les plateformes en instances de Platform.  Augmenter la
    // hauteur des plateformes au sol pour offrir une meilleure marge :
    // minimum 30 px.  Les plateformes aériennes conservent leur hauteur.
    platforms = lvl.platforms.map((p) => {
      const h = (p.y === 0 ? Math.max(30, p.height) : p.height);
      return new Platform(p.x, p.y, p.width, h);
    });
    // Pour chaque ennemi, associer la plateforme sous ses pieds afin qu'il
    // puisse rebondir aux extrémités.  On cherche la première plateforme
    // dont la zone horizontale englobe l'ennemi et dont la hauteur coïncide
    // avec l'ennemi.  Si aucune plateforme n'est trouvée, on utilise
    // simplement la largeur du niveau comme limite.
    enemies = lvl.enemies.map((e) => {
      let leftBound = 0;
      let rightBound = levelWidth;
      for (const plat of lvl.platforms) {
        // Les ennemis placés sur les plateformes utilisent une coordonnée y correspondant
        // au dessus de la plate-forme (plat.y + plat.height).  Ajuster la condition
        // pour trouver la plate-forme correspondante et calculer les bornes de
        // déplacement.
        const platTop = plat.y + (plat.height || 20);
        if (e.y === platTop && e.x >= plat.x && e.x <= plat.x + plat.width) {
          leftBound = plat.x;
          rightBound = plat.x + plat.width;
          break;
        }
      }
      return new Enemy(e.x, e.y, e.type, leftBound, rightBound);
    });
    // Lors du chargement du niveau, spécifier le type de chaque bonus
    bonuses = lvl.bonuses.map((b) => new Bonus(b.x, b.y, b.type));
    goal = new Goal(lvl.goal.x, lvl.goal.y, lvl.goal.width, lvl.goal.height);

    // Générer les tuyaux du niveau, le cas échéant.  Chaque entrée de
    // lvl.pipes définit x, y, height et éventuellement des coordonnées de
    // destination.  Convertir ces objets en instances de Pipe afin de
    // pouvoir les dessiner et gérer les collisions.
    pipes = (lvl.pipes || []).map((p) => new Pipe(p.x, p.y, p.height, p.destX, p.destY));
    // Ajouter des plateformes sur le dessus des tuyaux pour permettre de
    // marcher dessus.  Chaque tuyau est transformé en petit plateau de
    // 5 px d'épaisseur situé à sa hauteur finale.
    for (const pipe of pipes) {
      platforms.push(new Platform(pipe.x, pipe.y + pipe.height, pipe.width, 5));
    }
    // Réinitialiser la trace du capybara à l'entrée d'un niveau.
    trailSegments = [];
    // Hauteur maximale pour les niveaux sous‑marins.  Si le niveau
    // spécifie maxY, l'utiliser ; sinon on met 0 pour indiquer l'absence
    // de limite verticale spécifique.  Ce champ est utilisé dans
    // Player.update() lorsque lvl.underwater est vrai.
    levelMaxY = lvl.maxY || 0;
    // Réinitialiser les éléments décoratifs
    spawnClouds();
    birds.length = 0;

    // Déterminer la direction du niveau pour afficher la flèche
    arrowStartTime = performance.now();
    // Utiliser la direction déclarée explicitement dans le niveau si elle
    // existe.  Sinon, comparer la position du goal à la position de départ
    // pour choisir left ou right.
    if (lvl.direction) {
      arrowDirection = lvl.direction;
    } else {
      const startX = (lvl.startX !== undefined ? lvl.startX : 50);
      arrowDirection = (lvl.goal.x >= startX) ? 'right' : 'left';
    }

    // Mettre à jour la flèche directionnelle HTML.  On choisit le symbole en
    // fonction de la direction du niveau et on affiche la flèche.  Un
    // timer se charge de la masquer après `arrowDuration` millisecondes.
    if (directionArrowEl) {
      directionArrowEl.textContent = arrowDirection === 'right' ? '→' : '←';
      directionArrowEl.style.display = 'block';
      // Annuler tout timer précédent pour éviter des chevauchements
      if (arrowTimeoutId) clearTimeout(arrowTimeoutId);
      arrowTimeoutId = setTimeout(() => {
        directionArrowEl.style.display = 'none';
      }, arrowDuration);
    }
  }

  // Classe du joueur
  class Player {
    constructor() {
      // Augmenter les dimensions du héros pour qu’il soit plus visible à l’écran.
      // Les valeurs sont augmentées d’environ 40 % par rapport à la version
      // précédente (70 px de large et 56 px de haut) afin que Super Capy
      // corresponde mieux à sa stature héroïque tout en conservant le
      // ratio original (5:4).  Ces dimensions sont ensuite utilisées
      // directement lors du dessin de l’image détourée.
      this.width = 70;
      // Étendre le héros en hauteur pour lui donner une allure plus grande
      // sans modifier sa largeur.  On passe de 56 px à 70 px de haut.
      this.height = 70;
      this.reset();
      // Compteur de sauts pour autoriser un double saut.  La valeur
      // s’incrémente à chaque saut et se réinitialise lorsque le
      // capybara touche le sol ou une plateforme.
      this.jumpCount = 0;
      // Temps d'invulnérabilité après un respawn (en nombre de frames).  Pendant
      // cette période, les collisions avec les ennemis sont ignorées pour
      // empêcher la mort immédiate à la sortie de la zone de départ.  Voir
      // l'utilisation dans update() et dans la boucle de collisions plus bas.
      this.spawnTimer = 0;
      // Durée pendant laquelle le joueur peut traverser les plateformes
      // aériennes.  Décrémentée à chaque frame.  Lorsque > 0, les
      // collisions avec les plateformes de hauteur > 0 sont ignorées.
      this.dropThroughTimer = 0;

      // Durée pendant laquelle le joueur effectue une rotation en sortant
      // d'un tuyau de téléportation.  Lorsque > 0, Player.draw() applique
      // une rotation progressive afin de simuler une sortie animée du
      // tuyau.  Cette valeur est décrémentée dans Player.update().
      this.spinTimer = 0;
    }
    reset() {
      // Départ au début du niveau, au sol
      // Utiliser la position de départ définie par le niveau.  Si aucune
      // valeur n'est fournie, retomber à 50.
      const lvl = levels[currentLevelIndex] || {};
      this.x = (lvl.startX !== undefined ? lvl.startX : 50);
      // Définir une zone de protection horizontale à partir du point de
      // départ.  Tant que le joueur se trouve dans cette zone (~150 px,
      // équivalent à environ trois blocs de largeur), les collisions avec
      // les ennemis seront ignorées.  Ceci évite de mourir instantanément
      // lorsque des ennemis sont placés près de la zone de départ sur
      // certains niveaux.
      this.spawnSafeX = this.x + 150;
      this.y = 0;
      this.velX = 0;
      this.velY = 0;
      this.isOnGround = false;
      this.jumpCount = 0;
      // Réactiver la protection de spawn pendant ~90 frames (≈1.5 s à 60 FPS)
      this.spawnTimer = 90;

      // Réinitialiser le temporisateur de rotation lors de la sortie de
      // tuyau.  Ceci garantit que l'animation ne persiste pas d'un
      // niveau à l'autre.
      this.spinTimer = 0;
    }
    update() {
      // Ne rien faire si le jeu n'est pas en cours
      if (state !== 'playing') return;
      const lvl = levels[currentLevelIndex] || {};

      // Diminuer la durée de l'animation de sortie de tuyau.  Cette
      // variable est utilisée pour l'animation de rotation dans draw().
      if (this.spinTimer > 0) {
        this.spinTimer -= speedFactor;
        if (this.spinTimer < 0) this.spinTimer = 0;
      }
      // Décrémenter le timer de traversée des plateformes si actif
      if (this.dropThroughTimer > 0) {
        this.dropThroughTimer -= 1;
        if (this.dropThroughTimer < 0) this.dropThroughTimer = 0;
      }
      // Gestion spécifique aux niveaux sous‑marins : pas de gravité et
      // déplacement libre en X et Y avec des vitesses réduites.  Le
      // double saut est désactivé car la nage utilise les touches.
      if (lvl.underwater) {
        const sf = speedFactor;
        // Paramètres adaptés pour la nage : accélération et vitesse max réduites
        const maxSpeed = 3;
        const accel = 0.35;
        const friction = 0.85;
        // Mouvements horizontaux
        if (keys.left) {
          this.velX = Math.max(this.velX - accel * sf, -maxSpeed);
        } else if (keys.right) {
          this.velX = Math.min(this.velX + accel * sf, maxSpeed);
        } else {
          this.velX *= Math.pow(friction, sf);
          if (Math.abs(this.velX) < 0.05) this.velX = 0;
        }
        // Mouvements verticaux (sous l'eau on peut monter ou descendre)
        if (keys.up) {
          this.velY = Math.min(this.velY + accel * sf, maxSpeed);
        } else if (keys.down) {
          this.velY = Math.max(this.velY - accel * sf, -maxSpeed);
        } else {
          this.velY *= Math.pow(friction, sf);
          if (Math.abs(this.velY) < 0.05) this.velY = 0;
        }
        // Mettre à jour la position selon le facteur de vitesse
        this.x += this.velX * sf;
        this.y += this.velY * sf;
        // Décrémenter le timer d'invulnérabilité
        if (this.spawnTimer > 0) {
          this.spawnTimer -= sf;
          if (this.spawnTimer < 0) this.spawnTimer = 0;
        }
        // Empêcher de sortir du niveau horizontalement
        if (this.x < 0) {
          this.x = 0;
          this.velX = 0;
        }
        if (this.x + this.width > levelWidth) {
          this.x = levelWidth - this.width;
          this.velX = 0;
        }
        // Empêcher de sortir verticalement.  La coordonnée y correspond au
        // bas du capybara (0 = sol).  Sous l'eau, y ne doit pas être
        // négatif (descendre sous le sol) ni dépasser la limite max.
        if (this.y < 0) {
          this.y = 0;
          if (this.velY < 0) this.velY = 0;
        }
        const maxY = levelMaxY || lvl.maxY || 300;
        // La limite supérieure est à maxY : la tête du capybara ne doit pas
        // dépasser maxY.  Comme y stocke la position du bas, on teste
        // this.y + this.height.
        if (this.y + this.height > maxY) {
          this.y = maxY - this.height;
          if (this.velY > 0) this.velY = 0;
        }
        // Gérer les collisions avec les plateformes même sous l'eau : le
        // capybara peut se poser sur des plateformes et ne doit pas les
        // traverser.  Sous l'eau, on vérifie que l'on se déplace vers le
        // bas avant de corriger la position, comme dans la version
        // terrestre.
        if (this.velY < 0) {
          const prevY = this.y - this.velY * sf;
          for (const p of platforms) {
            // Ignorer les plateformes en hauteur lorsqu'un drop through est actif
            if (this.dropThroughTimer > 0 && p.y > 0) continue;
            const top = p.y + p.height;
            if (prevY >= top && this.y <= top) {
              if (this.x + this.width > p.x && this.x < p.x + p.width) {
                this.y = top;
                this.velY = 0;
                break;
              }
            }
          }
        }
        // Pas de gestion de isOnGround sous l'eau
        this.isOnGround = false;
        return;
      }
      const prevY = this.y;
      // Appliquer le facteur de vitesse global.  Cela permet de conserver un
      // comportement cohérent quel que soit le taux de rafraîchissement.
      const sf = speedFactor;
      // Constantes de mouvement de base (par frame à 60 Hz)
      const baseMaxSpeed = 4.5;
      const baseAccel = 0.5;
      const baseFriction = 0.85;
      const baseGravity = -0.35;
      // Mouvements horizontaux
      if (keys.left) {
        // Accélérer vers la gauche
        this.velX = Math.max(this.velX - baseAccel * sf, -baseMaxSpeed);
      } else if (keys.right) {
        // Accélérer vers la droite
        this.velX = Math.min(this.velX + baseAccel * sf, baseMaxSpeed);
      } else {
        // Appliquer un frottement exponentiel en fonction du facteur de vitesse
        // pour ralentir progressivement lorsque aucune touche n'est pressée.
        this.velX *= Math.pow(baseFriction, sf);
        if (Math.abs(this.velX) < 0.05) this.velX = 0;
      }
      // Gravité : ajouter la composante verticale
      this.velY += baseGravity * sf;
      // Mettre à jour la position en tenant compte du facteur de vitesse
      this.x += this.velX * sf;
      this.y += this.velY * sf;
      // Décrémenter le timer d'invulnérabilité en fonction de la vitesse
      if (this.spawnTimer > 0) {
        this.spawnTimer -= sf;
        if (this.spawnTimer < 0) this.spawnTimer = 0;
      }
      this.isOnGround = false;
      // Empêcher de sortir du niveau horizontalement
      if (this.x < 0) {
        this.x = 0;
        this.velX = 0;
      }
      if (this.x + this.width > levelWidth) {
        this.x = levelWidth - this.width;
        this.velX = 0;
      }
      // Collision avec le sol (y <= 0 -> sol)
      if (this.y < 0) {
        this.y = 0;
        if (this.velY < 0) this.velY = 0;
        this.isOnGround = true;
        this.jumpCount = 0;
      }
      // Collision avec les plateformes.  On ne vérifie la collision qu'à la descente
      if (this.velY < 0) {
        for (const p of platforms) {
          // Ignorer les plateformes aériennes lorsque le drop through est actif
          if (this.dropThroughTimer > 0 && p.y > 0) continue;
          const platformTop = p.y + p.height;
          // Vérifier que l'on est passé du dessus au-dessous
          if (prevY >= platformTop && this.y <= platformTop) {
            // Chevauchement horizontal
            if (this.x + this.width > p.x && this.x < p.x + p.width) {
              // Poser le joueur sur la plateforme
              this.y = platformTop;
              this.velY = 0;
              this.isOnGround = true;
              this.jumpCount = 0;
              break;
            }
          }
        }
      }
    }
    jump() {
      if (state !== 'playing') return;
      // Désactiver le saut lorsqu'on est dans un niveau aquatique.  Sous
      // l'eau, le joueur se déplace verticalement en utilisant les
      // touches haut et bas et la gravité n'est pas appliquée.
      if (levels[currentLevelIndex] && levels[currentLevelIndex].underwater) {
        return;
      }
      // Autoriser un double saut : le joueur peut sauter jusqu’à deux
      // fois avant de retoucher le sol.  La première et la seconde
      // impulsion utilisent la même force pour donner une sensation de
      // maîtrise.  L’atterrissage réinitialise jumpCount.
      // Force de saut utilisée pour chaque impulsion.  Cette valeur a été
      // réduite afin d'éviter que le capybara saute trop haut.  Avec un
      // double saut, il peut atteindre les plateformes les plus hautes du
      // niveau sans sortir de l'écran.  Voir README pour plus de détails.
      const jumpForce = 11;
      if (this.jumpCount < 2) {
        this.velY = jumpForce;
        this.isOnGround = false;
        this.jumpCount++;
        playBeep(660 + this.jumpCount * 50, 0.05, 0.07);
      }
    }
    getBounds() {
      // Boîte pour collisions avec bonus et ennemis
      return {
        left: this.x,
        right: this.x + this.width,
        top: this.y + this.height,
        bottom: this.y,
      };
    }
    draw(cameraX) {
      const screenX = this.x - cameraX;
      const screenY = height - groundHeight - this.y - this.height;
      ctx.save();
      ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
      // Incliner ou animer le héros selon le contexte.  Lorsqu'une
      // téléportation vient de se produire, la variable spinTimer est
      // positive et on applique une rotation complète de 180 degrés
      // (π radians) pour simuler la sortie du tuyau.  Sinon, on incline
      // légèrement selon la vitesse horizontale.
      let rot;
      const maxTilt = 0.3;
      if (this.spinTimer > 0) {
        // La progression varie de 0 à 1 au fur et à mesure que spinTimer diminue.
        const progress = 1 - (this.spinTimer / 30);
        rot = Math.PI * progress;
      } else {
        rot = Math.max(-maxTilt, Math.min(maxTilt, this.velX / 8));
      }
      ctx.rotate(rot);
      // Si l'image Super Capy est chargée, dessiner l'illustration PNG.
      // Appliquer un léger décalage vertical pour que les pieds touchent le sol.
      if (capySuperImg.complete && capySuperImg.naturalWidth) {
        const offsetY = 8;
        ctx.drawImage(capySuperImg, -this.width / 2, -this.height / 2 + offsetY, this.width, this.height);
      }
      ctx.restore();
      return;
      ctx.fillStyle = 'rgba(220,30,30,0.85)';
      ctx.beginPath();
      ctx.moveTo(-this.width * 0.45, -this.height * 0.3);
      ctx.lineTo(-this.width * 0.15, -this.height * 0.15);
      ctx.lineTo(-this.width * 0.35, this.height * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Tête
      ctx.beginPath();
      ctx.ellipse(this.width * 0.35, -this.height * 0.1, this.width * 0.32, this.height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // Oreille repositionnée : petite ellipse située sur le haut de la tête.
      // La couleur de l'oreille a été légèrement assombrie pour contraster
      // avec la teinte du corps.
      ctx.fillStyle = '#9c704d';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.18, -this.height * 0.35, this.width * 0.12, this.height * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      // Œil
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.45, -this.height * 0.1, this.width * 0.07, this.height * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.47, -this.height * 0.1, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      // Nez
      ctx.fillStyle = '#4d3928';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.62, -this.height * 0.02, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      // Queue
      ctx.beginPath();
      ctx.arc(-this.width * 0.45, this.height * 0.1, this.width * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = '#8b6c47';
      ctx.fill();
      // Pattes (statiques, simplifiées)
      ctx.fillStyle = '#8b6c47';
      ctx.fillRect(-this.width * 0.22, this.height * 0.35, this.width * 0.12, this.height * 0.22);
      ctx.fillRect(this.width * 0.02, this.height * 0.35, this.width * 0.12, this.height * 0.22);
      ctx.restore();
    }
  }

  class Platform {
    constructor(x, y, widthSeg, heightSeg) {
      this.x = x;
      this.y = y;
      this.width = widthSeg;
      this.height = heightSeg;
    }
    draw(cameraX) {
      const screenX = this.x - cameraX;
      const topY = height - groundHeight - (this.y + this.height);
      ctx.save();
      // Corps du segment
      // Les plateformes ont été recolorisées avec un brun sableux plus clair
      // pour se distinguer davantage du capybara et des ennemis.
      ctx.fillStyle = '#a57950';
      ctx.fillRect(screenX, topY, this.width, this.height);
      // Liseré plus clair sur le dessus
      ctx.fillStyle = '#c79a64';
      ctx.fillRect(screenX, topY, this.width, this.height * 0.25);
      ctx.restore();
    }
  }

  class Enemy {
    constructor(x, y, type, leftBound, rightBound) {
      this.x = x;
      this.y = y;
      this.type = type;
      // Dimensions et vitesse spécifiques selon le type d'ennemi
      switch (type) {
        case 'koopa':
          this.width = 44;
          this.height = 40;
          this.speed = 1.3;
          break;
        case 'shell':
          this.width = 40;
          this.height = 30;
          this.speed = 0;
          break;
        case 'shell-moving':
          this.width = 40;
          this.height = 30;
          this.speed = 3.0;
          break;
        case 'fish':
          this.width = 40;
          this.height = 28;
          this.speed = 2.0;
          break;
        case 'mine':
          this.width = 36;
          this.height = 36;
          this.speed = 0;
          break;
        default:
          // goomba et autres types inconnus
          this.width = 40;
          this.height = 35;
          this.speed = 1.5;
          break;
      }
      this.leftBound = leftBound;
      this.rightBound = rightBound - this.width;
      // direction initiale : -1 signifie qu'il commence vers la gauche
      this.direction = -1;
      this.alive = true;
    }
    update() {
      if (!this.alive) return;
      const sf = speedFactor;
      switch (this.type) {
        case 'shell-moving':
          // Une carapace en mouvement glisse rapidement dans la direction
          // courante.  Si elle frappe un bord du niveau, elle rebondit.
          this.x += this.direction * this.speed * sf;
          if (this.x <= 0) {
            this.x = 0;
            this.direction = 1;
          } else if (this.x + this.width >= levelWidth) {
            this.x = levelWidth - this.width;
            this.direction = -1;
          }
          break;
        case 'shell':
          // Une carapace immobile ne bouge pas.
          break;
        case 'koopa':
        case 'goomba':
        default:
          // Déplacement classique gauche/droite sur une plateforme
          this.x += this.direction * this.speed * sf;
          if (this.x <= this.leftBound || this.x >= this.rightBound) {
            this.direction *= -1;
          }
          break;
        case 'fish':
          // Les poissons nagent sous l'eau de gauche à droite et rebondissent
          // lorsqu'ils atteignent les bords du niveau.
          this.x += this.direction * this.speed * sf;
          if (this.x <= 0) {
            this.x = 0;
            this.direction = 1;
          } else if (this.x + this.width >= levelWidth) {
            this.x = levelWidth - this.width;
            this.direction = -1;
          }
          break;
        case 'mine':
          // Les mines sont statiques
          break;
      }
    }
    draw(cameraX) {
      if (!this.alive) return;
      const screenX = this.x - cameraX;
      const screenY = height - groundHeight - this.y - this.height;
      ctx.save();
      ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
      switch (this.type) {
        case 'koopa': {
          // Corps de la tortue : carapace verte et tête beige
          ctx.fillStyle = '#4caf50';
          ctx.beginPath();
          ctx.ellipse(0, 0, this.width * 0.5, this.height * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          // Bordure de la carapace
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#2e7d32';
          ctx.stroke();
          // Tête
          ctx.fillStyle = '#f4c27a';
          ctx.beginPath();
          ctx.ellipse(0, -this.height * 0.3, this.width * 0.35, this.height * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          // Yeux
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(-this.width * 0.1, -this.height * 0.35, this.width * 0.04, this.height * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(this.width * 0.1, -this.height * 0.35, this.width * 0.04, this.height * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shell':
        case 'shell-moving': {
          // Carapace : disque vert avec bandes plus claires
          ctx.fillStyle = '#4caf50';
          ctx.beginPath();
          ctx.ellipse(0, 0, this.width * 0.5, this.height * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8bc34a';
          ctx.beginPath();
          ctx.ellipse(0, 0, this.width * 0.35, this.height * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          // Contour
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#2e7d32';
          ctx.beginPath();
          ctx.ellipse(0, 0, this.width * 0.5, this.height * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'fish': {
          // Corps du poisson
          ctx.fillStyle = '#42a5f5';
          ctx.beginPath();
          ctx.ellipse(0, 0, this.width * 0.5, this.height * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          // Queue
          ctx.beginPath();
          ctx.moveTo(this.width * 0.5, 0);
          ctx.lineTo(this.width * 0.8, this.height * 0.2);
          ctx.lineTo(this.width * 0.8, -this.height * 0.2);
          ctx.closePath();
          ctx.fill();
          // Œil
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(-this.width * 0.15, -this.height * 0.1, this.width * 0.07, this.height * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(-this.width * 0.15, -this.height * 0.1, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'mine': {
          // Dessiner une mine sous-marine : cercle avec pointes
          ctx.fillStyle = '#757575';
          ctx.beginPath();
          ctx.arc(0, 0, this.width * 0.4, 0, Math.PI * 2);
          ctx.fill();
          // Pointes autour
          ctx.strokeStyle = '#424242';
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const startX = Math.cos(angle) * this.width * 0.4;
            const startY = Math.sin(angle) * this.width * 0.4;
            const endX = Math.cos(angle) * this.width * 0.6;
            const endY = Math.sin(angle) * this.width * 0.6;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
          break;
        }
        default: {
          // Ennemi par défaut : goomba rouge/rose avec pieds
          ctx.fillStyle = '#e37b7b';
          ctx.beginPath();
          ctx.ellipse(0, 0, this.width * 0.5, this.height * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          // Tête
          ctx.beginPath();
          ctx.ellipse(0, -this.height * 0.3, this.width * 0.35, this.height * 0.25, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#f49f9f';
          ctx.fill();
          // Yeux
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(-this.width * 0.12, -this.height * 0.35, this.width * 0.08, this.height * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(this.width * 0.12, -this.height * 0.35, this.width * 0.08, this.height * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(-this.width * 0.12, -this.height * 0.35, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(this.width * 0.12, -this.height * 0.35, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
          ctx.fill();
          // Pieds
          ctx.fillStyle = '#c66464';
          ctx.fillRect(-this.width * 0.3, this.height * 0.25, this.width * 0.25, this.height * 0.15);
          ctx.fillRect(this.width * 0.05, this.height * 0.25, this.width * 0.25, this.height * 0.15);
          break;
        }
      }
      ctx.restore();
    }
    getBounds() {
      // Réduire la boîte de collision grâce à ENEMY_HITBOX_MARGIN afin
      // d'offrir une tolérance lors des chocs avec le joueur.  Pour un
      // ennemi de type mine ou fish, on conserve tout de même une marge
      // identique pour rester cohérent.
      return {
        left: this.x + ENEMY_HITBOX_MARGIN,
        right: this.x + this.width - ENEMY_HITBOX_MARGIN,
        top: this.y + this.height - ENEMY_HITBOX_MARGIN,
        bottom: this.y + ENEMY_HITBOX_MARGIN,
      };
    }
  }

  // Classe représentant un tuyau dans les niveaux.  Un tuyau est une
  // structure verticale sur laquelle le joueur peut se tenir.  En
  // appuyant sur la touche bas, il peut être transporté à une autre
  // position (destX/destY) s'ils sont définis.  Les tuyaux utilisent
  // l'esthétique des tuyaux verts de Flappy Bird et de Mario, avec un
  // corps rectangulaire et un embout plus large.
  class Pipe {
    constructor(x, y, height, destX = null, destY = null) {
      this.x = x;
      this.y = y; // position du bas du tuyau (en unités de niveau)
      this.height = height;
      this.width = 60;
      this.destX = destX;
      this.destY = destY;
    }
    getBounds() {
      // Boîte englobante utilisée pour les collisions horizontales.  Elle
      // représente le corps entier du tuyau (du sol jusqu'au haut).
      return {
        left: this.x,
        right: this.x + this.width,
        top: this.y + this.height,
        bottom: this.y,
      };
    }
    getTopBounds() {
      // Boîte de la surface supérieure du tuyau utilisée pour détecter
      // l'entrée.  On réduit légèrement la hauteur pour permettre un peu
      // de tolérance.
      return {
        left: this.x,
        right: this.x + this.width,
        top: this.y + this.height + 5,
        bottom: this.y + this.height - 5,
      };
    }
    draw(cameraX) {
      const screenX = this.x - cameraX;
      // Calculer la position verticale : on dessine depuis le bas du
      // canvas (sol) moins la hauteur du tuyau.
      const screenY = height - groundHeight - this.y - this.height;
      // Couleurs inspirées de Flappy Bird : un vert moyen pour le corps
      // et un vert plus clair pour l'embout.  Un vert plus foncé sert
      // pour le contour.
      const bodyColor = '#6ec85f';
      const capColor = '#8ade71';
      const borderColor = '#499d3b';
      // Hauteur de l'embout (max 20 px ou 20 % de la hauteur)
      const capH = Math.min(20, this.height * 0.2);
      // Corps du tuyau
      ctx.fillStyle = bodyColor;
      ctx.fillRect(screenX, screenY + capH, this.width, this.height - capH);
      // Embout : légèrement plus large que le corps
      ctx.fillStyle = capColor;
      ctx.fillRect(screenX - 5, screenY, this.width + 10, capH);
      // Contours
      ctx.lineWidth = 2;
      ctx.strokeStyle = borderColor;
      ctx.strokeRect(screenX, screenY + capH, this.width, this.height - capH);
      ctx.strokeRect(screenX - 5, screenY, this.width + 10, capH);
    }
  }

  class Bonus {
    constructor(x, y, type = 'carrot') {
      this.x = x;
      this.y = y;
      this.radius = 14;
      // Définir explicitement le type s'il est fourni par les données
      // de niveau.  Par défaut, il s'agit d'une carotte.
      this.type = type;
    }
    update() {
      // Les bonus sont statiques dans ce mode
    }
    draw(cameraX) {
      const screenX = this.x - cameraX;
      const screenY = height - groundHeight - this.y;
      ctx.save();
      ctx.translate(screenX, screenY);
      // Bulle
      ctx.fillStyle = 'rgba(255, 236, 105, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      if (this.type === 'carrot') {
        // Carotte orientée vers le bas
        ctx.fillStyle = '#f6a323';
        ctx.beginPath();
        ctx.moveTo(0, this.radius);
        ctx.lineTo(this.radius * 0.6, -this.radius);
        ctx.lineTo(-this.radius * 0.6, -this.radius);
        ctx.closePath();
        ctx.fill();
        // Fanes
        ctx.fillStyle = '#6ea84f';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const lx = (-this.radius * 0.25) + i * (this.radius * 0.25);
          ctx.moveTo(lx, -this.radius * 1.05);
          ctx.lineTo(lx + this.radius * 0.15, -this.radius * 1.3);
          ctx.lineTo(lx + this.radius * 0.3, -this.radius * 1.05);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Patate
        ctx.fillStyle = '#d7a26c';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aa7342';
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI * 2) / 4;
          const px = Math.cos(angle) * this.radius * 0.3;
          const py = Math.sin(angle) * this.radius * 0.25;
          ctx.beginPath();
          ctx.ellipse(px, py, this.radius * 0.08, this.radius * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    getBounds() {
      return {
        left: this.x - this.radius,
        right: this.x + this.radius,
        top: this.y + this.radius,
        bottom: this.y - this.radius,
      };
    }
  }

  class Goal {
    constructor(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
    draw(cameraX) {
      const screenX = this.x - cameraX;
      const screenY = height - groundHeight - this.y - this.height;
      ctx.save();
      // Mât de drapeau
      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(screenX + this.width * 0.45, screenY, this.width * 0.1, this.height);
      // Drapeau triangulaire
      ctx.fillStyle = '#ff7043';
      ctx.beginPath();
      ctx.moveTo(screenX + this.width * 0.45, screenY + this.height * 0.2);
      ctx.lineTo(screenX + this.width * 0.45 + this.width * 0.6, screenY + this.height * 0.3);
      ctx.lineTo(screenX + this.width * 0.45, screenY + this.height * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    getBounds() {
      return {
        left: this.x,
        right: this.x + this.width,
        top: this.y + this.height,
        bottom: this.y,
      };
    }
  }

  let player = new Player();

  function update() {
    player.update();
    enemies.forEach((e) => e.update());

    // Mettre à jour les nuages et les oiseaux décoratifs
    clouds.forEach((c) => c.update());
    // Faire apparaître occasionnellement un oiseau : la probabilité par
    // frame est ajustée en fonction de speedFactor pour maintenir un
    // taux constant d'apparition par seconde.  Par exemple, à 60 Hz
    // speedFactor≈2.35, ce qui correspond à ~0.56 oiseaux par seconde.
    const birdSpawnProbPerFrame = 0.004 * speedFactor;
    if (Math.random() < birdSpawnProbPerFrame) {
      spawnBird();
    }
    // Mettre à jour les oiseaux existants et supprimer ceux qui quittent l'écran
    for (let i = birds.length - 1; i >= 0; i--) {
      const bird = birds[i];
      bird.update();
      // Si l'oiseau est trop loin à gauche par rapport à la caméra, on le retire
      // pour éviter des listes inutiles.  On utilise un seuil absolu de -200.
      if (bird.x < -200) {
        birds.splice(i, 1);
      }
    }
    // Collisions avec ennemis.  Utiliser des boîtes de collision réduites
    // pour plus de tolérance grâce à ENEMY_HITBOX_MARGIN.  Le comportement
    // dépend du type de l'ennemi : certains peuvent être éliminés en
    // sautant dessus, d'autres (poissons, mines, carapaces en mouvement)
    // sont létaux au moindre contact.
    const pBounds = player.getBounds();
    for (const e of enemies) {
      if (!e.alive) continue;
      const eb = e.getBounds();
      // Détection de collision de boîtes englobantes
      if (pBounds.right > eb.left && pBounds.left < eb.right && pBounds.bottom < eb.top && pBounds.top > eb.bottom) {
        // Zone de protection au spawn
        if (player.spawnTimer > 0 || (typeof player.spawnSafeX === 'number' && player.x < player.spawnSafeX)) {
          continue;
        }
        // Déterminer si l'on frappe l'ennemi par le dessus (velY négative et croisement du haut de l'ennemi)
        const stomping = (player.velY < 0 && player.y <= e.y + e.height && player.y + player.height >= e.y + e.height);
        if (e.type === 'goomba' || e.type === 'koopa') {
          if (stomping) {
            if (e.type === 'koopa') {
              // La tortue se transforme en carapace stationnaire
              e.type = 'shell';
              e.speed = 0;
            } else {
              // Goomba éliminé
              e.alive = false;
            }
            // Rebondir
            player.velY = 8;
            playBeep(880, 0.05, 0.08);
            continue;
          } else {
            // Contact latéral : si la carapace est déjà stationnaire, elle
            // commence à se déplacer.  Sinon, c'est la mort du joueur.
            if (e.type === 'shell') {
              e.type = 'shell-moving';
              e.speed = 3.0;
              e.direction = (player.velX >= 0 ? 1 : -1);
              player.velY = 8;
              playBeep(880, 0.05, 0.08);
              continue;
            }
            gameOver(false);
            return;
          }
        } else if (e.type === 'shell' || e.type === 'shell-moving') {
          // Une carapace en mouvement ou immobile est létale sauf si on la
          // frappe par-dessus (voir ci-dessus).  Ici, on meurt.
          gameOver(false);
          return;
        } else {
          // Poissons, mines et autres types : collision mortelle
          gameOver(false);
          return;
        }
      }
    }
    // Gérer les collisions entre une carapace en mouvement et les autres ennemis.
    // Lorsqu'une carapace en mouvement touche un ennemi ordinaire,
    // l'autre ennemi est éliminé et la carapace disparaît.  Ce
    // comportement s'inspire des jeux de plateforme classiques.
    for (let i = 0; i < enemies.length; i++) {
      const shell = enemies[i];
      if (!shell.alive || shell.type !== 'shell-moving') continue;
      const sb = shell.getBounds();
      for (let j = 0; j < enemies.length; j++) {
        if (i === j) continue;
        const other = enemies[j];
        if (!other.alive) continue;
        // Ignorer les autres carapaces
        if (other.type === 'shell' || other.type === 'shell-moving') continue;
        const ob = other.getBounds();
        if (sb.right > ob.left && sb.left < ob.right && sb.bottom < ob.top && sb.top > ob.bottom) {
          // Collision : l'ennemi est éliminé et la carapace cesse d'exister
          other.alive = false;
          shell.alive = false;
          break;
        }
      }
    }

    // Collisions avec les tuyaux : empêcher le capybara de traverser la
    // paroi des tuyaux et permettre la téléportation lorsque le joueur
    // se trouve sur le dessus et appuie sur la touche bas.
    for (const pipe of pipes) {
      // Collision horizontale avec le corps du tuyau
      const pb = player.getBounds();
      const pbLeft = pb.left;
      const pbRight = pb.right;
      const pbTop = pb.top;
      const pbBottom = pb.bottom;
      const tb = pipe.getBounds();
      if (pbRight > tb.left && pbLeft < tb.right && pbBottom < tb.top && pbTop > tb.bottom) {
        // Le capybara chevauche le tuyau horizontalement.  Si son centre
        // est à gauche du tuyau, on le positionne à gauche ; sinon à droite.
        if (player.x + player.width / 2 < pipe.x + pipe.width / 2) {
          player.x = pipe.x - player.width;
        } else {
          player.x = pipe.x + pipe.width;
        }
        player.velX = 0;
      }
      // Vérifier l'entrée dans le tuyau : le joueur doit se tenir sur
      // l'embouchure (dessus du tuyau) et appuyer sur la touche bas.
      const topB = pipe.getTopBounds();
      // Proximité verticale : la position de y correspond au bas du
      // capybara.  Vérifier qu'il est quasiment au même niveau que le
      // sommet du tuyau.  Utiliser une marge de 3 px.
      if (Math.abs(player.y - (pipe.y + pipe.height)) < 8 &&
          pbRight > topB.left && pbLeft < topB.right) {
        if (keys.down && pipe.destX != null && pipe.destY != null) {
          // Trouver le tuyau de destination correspondant aux coordonnées destX/destY
          let destPipe = null;
          for (const p of pipes) {
            if (p.x === pipe.destX && p.y === pipe.destY) {
              destPipe = p;
              break;
            }
          }
          if (destPipe) {
            // Placer le joueur au centre du dessus du tuyau de sortie
            player.x = destPipe.x + (destPipe.width - player.width) / 2;
            player.y = destPipe.y + destPipe.height;
          } else {
            // Retomber sur la logique originale si aucun tuyau n'est trouvé
            player.x = pipe.destX;
            player.y = pipe.destY;
          }
          // Réinitialiser la vitesse pour éviter les sauts intempestifs
          player.velX = 0;
          player.velY = 0;
          // Réactiver la protection spawn
          player.spawnTimer = 60;
          // Démarrer l'animation de rotation lors de la sortie du tuyau
          player.spinTimer = 30;
        }
      }
    }

    // Mettre à jour la trace du capybara.  Ajouter un segment au niveau
    // actuel de position du joueur et diminuer progressivement l'opacité
    // des segments existants.  Limiter la longueur de la trace à
    // MAX_TRAIL_SEGMENTS.
    trailSegments.push({ x: player.x + player.width / 2, y: player.y, alpha: 1 });
    if (trailSegments.length > MAX_TRAIL_SEGMENTS) {
      trailSegments.shift();
    }
    for (let i = 0; i < trailSegments.length; i++) {
      const seg = trailSegments[i];
      seg.alpha -= 0.02 * speedFactor;
    }
    // Retirer les segments invisibles
    trailSegments = trailSegments.filter((seg) => seg.alpha > 0);

    // Collisions avec bonus
    for (let i = bonuses.length - 1; i >= 0; i--) {
      const b = bonuses[i];
      const bb = b.getBounds();
      if (pBounds.right > bb.left && pBounds.left < bb.right && pBounds.bottom < bb.top && pBounds.top > bb.bottom) {
        // Ajouter des points selon le type du bonus : 1 pour une carotte,
        // 10 pour une patate.  Les bonus restent à leur type prédéfini
        // lors du chargement du niveau.
        if (b.type === 'potato') {
          score += 10;
        } else {
          score += 1;
        }
        playBeep(880, 0.05, 0.08);
        bonuses.splice(i, 1);
      }
    }
    // Collision avec goal
    if (goal) {
      const gb = goal.getBounds();
      if (pBounds.right > gb.left && pBounds.left < gb.right && pBounds.bottom < gb.top && pBounds.top > gb.bottom) {
        // Victoire
        gameOver(true);
        return;
      }
    }
    // Le score ne dépend plus du temps : seule la collecte des bonus
    // (carottes et patates) incrémente la valeur.  Aucune augmentation
    // automatique n’est appliquée ici.
  }

  function draw() {
    // Effacement et fond.  Choisir un thème différent pour les niveaux
    // sous-marins : dégradé de bleu.  Pour les niveaux terrestres, le
    // dégradé de ciel est conservé et une bande de sol est dessinée.
    ctx.clearRect(0, 0, width, height);
    const currentLevel = levels[currentLevelIndex] || {};
    const underwater = currentLevel.underwater;
    if (underwater) {
      // Dégradé vertical du fond marin (bleu foncé vers bleu clair)
      const waterGrad = ctx.createLinearGradient(0, 0, 0, height);
      waterGrad.addColorStop(0, '#012f6b');
      waterGrad.addColorStop(1, '#0288d1');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#e3f2fd');
      skyGrad.addColorStop(1, '#b3e5fc');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);
    }
    // Calculer la position de la caméra
    let cameraX = player.x - width * 0.3;
    cameraX = Math.max(0, Math.min(cameraX, levelWidth - width));
    // Dessiner le sol uniquement dans les niveaux terrestres
    if (!underwater) {
      const groundY = height - groundHeight;
      ctx.fillStyle = '#81c784';
      ctx.fillRect(-cameraX, groundY, levelWidth, groundHeight);
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(-cameraX, groundY, levelWidth, groundHeight * 0.2);
    }
    // Dessiner les nuages en arrière‑plan.  Ils utilisent un facteur de
    // parallaxe et sont placés avant les plateformes.
    clouds.forEach((c) => c.draw(cameraX));
    // Dessiner les oiseaux décoratifs
    birds.forEach((b) => b.draw(cameraX));
    // Dessiner les plateformes
    platforms.forEach((p) => p.draw(cameraX));
    // Dessiner les tuyaux
    pipes.forEach((p) => p.draw(cameraX));
    // Dessiner les bonus
    bonuses.forEach((b) => b.draw(cameraX));
    // Dessiner les ennemis
    enemies.forEach((e) => e.draw(cameraX));
    // Dessiner la trace lumineuse du capybara avant de le dessiner.  Chaque
    // segment est un petit cercle avec une opacité décroissante qui
    // représente la traînée du héros.
    ctx.save();
    for (const seg of trailSegments) {
      const sx = seg.x - cameraX;
      const sy = height - groundHeight - seg.y;
      ctx.globalAlpha = Math.max(0, seg.alpha * 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy - player.height * 0.2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Dessiner le goal
    if (goal) goal.draw(cameraX);
    // Dessiner le joueur
    player.draw(cameraX);

    // Afficher le score au centre en haut.  Utiliser un texte doré et une
    // boîte sombre semi‑transparente pour améliorer la visibilité sur les
    // arrières‑plans clairs.  Seul le nombre est affiché.
    ctx.save();
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const scoreStr = String(Math.floor(score));
    const metrics2 = ctx.measureText(scoreStr);
    const pad = 12;
    const boxWidth2 = metrics2.width + pad * 2;
    const boxHeight2 = 38;
    const boxX2 = (width - boxWidth2) / 2;
    const boxY2 = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(boxX2, boxY2, boxWidth2, boxHeight2);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(scoreStr, width / 2, boxY2 + boxHeight2 / 2);
    ctx.restore();

    // Dessiner la flèche directionnelle en début de niveau.  La flèche est
    // dessinée directement sur le canvas pour garantir sa visibilité.
    // Elle clignote toutes les 400 ms et disparaît après `arrowDuration` ms.
    {
      const now = performance.now();
      const elapsed = now - arrowStartTime;
      if (elapsed < arrowDuration) {
        ctx.save();
        // Police légèrement plus grande que le score pour différencier la flèche.
        // On reste sur une taille raisonnable pour ne pas distraire le joueur.
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Calque d'opacité pour clignoter : alterner visible/invisible toutes
        // 400 ms.  Lorsque blinkPhase vaut 0, la flèche est visible.
        const blinkPhase = Math.floor(elapsed / 400) % 2;
        ctx.globalAlpha = blinkPhase === 0 ? 1 : 0;
        // Couleur ambrée pour une bonne visibilité sur le ciel pastel
        ctx.fillStyle = '#ff9200';
        // Positionner la flèche sous le score, légèrement plus bas que la boîte du score
        // Position verticale de la flèche, légèrement en dessous de la zone du score
        const arrowY = 120;
        const arrowChar = arrowDirection === 'right' ? '→' : '←';
        ctx.fillText(arrowChar, width / 2, arrowY);
        ctx.restore();
      }
    }
  }

  function gameLoop() {
    // Suspendre la boucle tant que la pop‑up de pré‑lancement est active
    if (window.CAPY_PRESTART_ACTIVE) {
      requestAnimationFrame(gameLoop);
      return;
    }
    if (state === 'playing') {
      update();
      draw();
    }
    requestAnimationFrame(gameLoop);
  }

  /**
   * Sélectionne un message humoristique à afficher sur l'écran de fin de
   * niveau.  Si le score final est faible (<10), renvoie un message
   * satirique qui souligne la performance modeste.  Sinon, un message
   * positif est choisi parmi la liste habituelle.
   * @param {number} [score] - score final du joueur
   * @returns {string} Un message à afficher
   */
  function getFunMessage(score) {
    // Messages satiriques pour les faibles scores (<10)
    const lowMessages = [
      "Un score aussi bas ? Même un escargot sauterait plus loin !",
      "On dirait que les goombas t'ont roulé dessus… à reculons !",
      "Ton capybara a confondu courir et piquer un somme, on dirait."
    ];
    // Messages positifs et anecdotes habituelles
    const messages = [
      // Messages d'origine
      "Le capybara rêve de châteaux en fromage.",
      "Incroyable ! Un capybara acrobate !",
      "Mario n'a qu'à bien se tenir !",
      "Les capybaras sautent mieux qu'on ne le pense !",
      "Quelle aventure haute en couleur !",
      // Nouvelles anecdotes amusantes pour enrichir les fins de partie
      "On raconte qu’un capybara a traversé la jungle en sautant sur des noix de coco.",
      "Le capybara adore les cascades de fromage fondant.",
      "Selon la légende, les capybaras font du yoga après chaque victoire.",
      "Bravo ! On dirait que les capybaras t’ont adopté.",
      "Le capybara a désormais sa propre cape de super‑héros.",
      "Un capybara heureux partage toujours ses carottes.",
      "Les capybaras rêvent de plateformes infinies et de fromages célestes.",
      "Avez‑vous entendu ? Un capybara a battu un record de saut en longueur.",
      "Les capybaras chantent de joie quand on atteint le drapeau.",
      "Qui aurait cru qu’un capybara pouvait courir aussi vite qu’un lapin ?",
      "On murmure que les capybaras jouent à cache‑cache avec les goombas.",
      "Un fromage glissant n’arrête jamais un capybara déterminé."
    ];
    if (typeof score === 'number' && score < 10) {
      return lowMessages[Math.floor(Math.random() * lowMessages.length)];
    }
    return messages[Math.floor(Math.random() * messages.length)];
  }

  function gameOver(victory = false) {
    if (state !== 'playing') return;
    state = victory ? 'win' : 'gameover';
    win = victory;
    stopMusic();
    const finalScore = Math.floor(score);
    if (finalScore > highScore) {
      highScore = finalScore;
      try {
        localStorage.setItem('capyPlatformHighScore', String(highScore));
      } catch (e) {
        // ignore
      }
    }
    if (currentScoreEl) currentScoreEl.textContent = `${finalScore}`;
    if (highScoreEl) highScoreEl.textContent = `${highScore}`;
    // Mettre à jour le titre et le message fun en fonction du résultat
    const titleEl = document.getElementById('platform-gameover-title');
    if (titleEl) {
      // Lorsque le joueur gagne un niveau, l'écran ne doit pas afficher
      // « Game Over » mais simplement « Bravo ! » pour féliciter la réussite.
      titleEl.textContent = victory ? 'Bravo !' : 'Game Over';
    }
    if (funMessageEl) {
      // Afficher une illustration de capybara super-héros et le message.
      if (victory) {
        funMessageEl.innerHTML = `<img src="assets/capybara_super.png" alt="Capybara" /> <span>Bravo !</span>`;
      } else {
        const msg = getFunMessage(finalScore);
        funMessageEl.innerHTML = `<img src="assets/capybara_super.png" alt="Capybara" /> <span>${msg}</span>`;
      }
    }
    gameOverOverlay.classList.remove('hidden');

    // Afficher/masquer le bouton « Niveau suivant » selon la victoire et
    // l'existence d'un niveau ultérieur.  Ce bouton permet de passer
    // directement au niveau suivant sans repasser par le menu.
    if (nextBtn) {
      if (victory && currentLevelIndex < levels.length - 1) {
        nextBtn.style.display = 'inline-block';
      } else {
        nextBtn.style.display = 'none';
      }
    }

    // Débloquer le niveau suivant en enregistrant la progression dans localStorage.
    if (victory) {
      try {
        const stored = localStorage.getItem('capyPlatformMaxLevel');
        let maxUnlocked = 1;
        if (stored !== null) maxUnlocked = parseInt(stored, 10) || 1;
        const nextLevel = currentLevelIndex + 2; // niveau suivant en 1‑based
        if (nextLevel > maxUnlocked) {
          localStorage.setItem('capyPlatformMaxLevel', String(nextLevel));
        }
      } catch (e) {
        // ignore
      }
    }
  }

  function resetGame() {
    score = 0;
    state = 'playing';
    win = false;
    gameOverOverlay.classList.add('hidden');
    player.reset();
    loadLevel(currentLevelIndex);
    startMusic();
    // Ne pas redémarrer explicitement la boucle de jeu ici.  La boucle
    // principale est déjà lancée lors du chargement de la page.  Un
    // nouvel appel à requestAnimationFrame dans resetGame provoquerait
    // plusieurs boucles simultanées, entraînant une accélération du jeu
    // après chaque partie.  Voir applySpeedFactor() pour la gestion
    // dynamique de la vitesse.
  }

  // Écouteurs pour les boutons de l'écran Game Over
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      // Rejouer le même niveau
      resetGame();
    });
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      // Rediriger vers le nouveau menu principal situé dans le dossier Capy.  Comme
      // ce fichier se situe dans le dossier capy, il faut remonter d'un niveau.
      window.location.href = '../Capy/games.html';
    });
  }

  // Passer au niveau suivant lorsque le joueur clique sur le bouton prévu à
  // cet effet.  On incrémente l'indice de niveau, le remet à zéro en cas
  // de dépassement et on charge le nouveau niveau.
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentLevelIndex < levels.length - 1) {
        currentLevelIndex++;
      } else {
        currentLevelIndex = 0;
      }
      resetGame();
    });
  }

  // Démarrer le jeu au chargement
  loadLevel(currentLevelIndex);
  startMusic();
  requestAnimationFrame(gameLoop);
})();