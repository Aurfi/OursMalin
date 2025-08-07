(() => {
  /**
   * Capybara Runner
   *
   * Ce fichier implémente un mini‑jeu de course inspiré du jeu du dinosaure de Chrome.
   * Le capybara court dans un marais et doit sauter par‑dessus des obstacles.
   * Un chat noir le poursuit et saute automatiquement les obstacles, se rapprochant
   * progressivement sans jamais l'attraper. Un mode "ragondin fatigué" permet de
   * jouer sans obstacles et avec des bisous du chat.
   */

  const canvas = document.getElementById('runnerCanvas');
  const ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;

  // Image du capybara pour le mode Runner.  Cette image détourée remplace
  // l'ancien dessin vectoriel du héros et assure une cohérence avec
  // l'illustration utilisée sur la page d'accueil.
  const capyRunImg = new Image();
  capyRunImg.src = 'assets/capybara_running_new.png';

  // États possibles
  const STATE_MENU = 'menu';
  const STATE_PLAYING = 'playing';
  const STATE_GAMEOVER = 'gameover';
  let state = STATE_MENU;

  // Récupération et stockage du meilleur score
  let runnerHighScore = 0;
  try {
    const stored = localStorage.getItem('capyRunnerHighScore');
    if (stored !== null) runnerHighScore = parseInt(stored, 10) || 0;
  } catch (e) {
    runnerHighScore = 0;
  }

  // Sélecteurs d'interface
  const menuOverlay = document.getElementById('runner-menu');
  const gameOverOverlay = document.getElementById('runner-gameover');
  const currentScoreEl = document.getElementById('runner-current-score');
  const highScoreEl = document.getElementById('runner-high-score');
  const funMessageEl = document.getElementById('runner-fun-message');
  const startBtn = document.getElementById('runner-start-button');
  const backBtn = document.getElementById('runner-back-button');
  const replayBtn = document.getElementById('runner-replay-button');
  const ragondinBtn = document.getElementById('runner-ragondin-button');
  const menuBtn = document.getElementById('runner-menu-button');
  // Bouton de contrôle du volume
  const volumeBtn = document.getElementById('volume-toggle');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      volumeBtn.textContent = isMuted ? '🔇' : '🔊';
      if (isMuted) {
        stopMusic();
      } else {
        // Redémarrer l'ambiance.  Le paramètre ragondinMode est conservé
        // mais n'a aucun effet puisque la même ambiance est utilisée dans les deux cas.
        startMusic(ragondinMode);
      }
      applyVolume();
    });
  }

  // Suppression du bouton « musique » : seul le bouton volume est conservé.

  // Paramètres du jeu
  // Gravité réduite pour que la chute soit moins brutale.  Une valeur plus basse
  // ralentit la descente et offre un meilleur contrôle.
  // Gravité réduite : la chute est plus lente pour un meilleur contrôle.
  const gravity = 0.28;
  // Saut moins puissant : la hauteur atteinte reste modérée.
  const jumpStrength = -8;
  // Vitesse horizontale initiale.  La valeur origGameSpeed est conservée
  // pour recalculer la vitesse effective lorsque GLOBAL_SPEED_MULTIPLIER est
  // mis à jour.  Afin de rendre le jeu plus dynamique, nous doublons
  // cette vitesse de base.  L'espacement des obstacles est ajusté plus loin
  // pour conserver une difficulté raisonnable.
  const origGameSpeed = 5.0;
  let gameSpeed = origGameSpeed;
  // Intervalle initial entre les obstacles.  Stocké pour pouvoir
  // recalculer spawnInterval lorsque la vitesse change.
  // Augmenter l’intervalle initial entre deux obstacles afin de compenser
  // l’augmentation de la vitesse.  Un intervalle plus long garantit
  // suffisamment d’espace pour sauter et retomber entre les éléments
  // lorsque la vitesse est doublée.
  const initialSpawnInterval = 300;
  let spawnInterval = initialSpawnInterval;

  /**
   * Applique le multiplicateur de vitesse global défini dans config.js.
   * Recalcule gameSpeed et spawnInterval à partir des valeurs originales.
   */
  function applySpeed() {
    try {
      if (window.getGameSpeed) {
        const spd = window.getGameSpeed('runner');
        gameSpeed = origGameSpeed * spd;
        // Utiliser une valeur plancher plus élevée pour espacer davantage les obstacles
        spawnInterval = Math.max(120, Math.round(initialSpawnInterval / spd));
      }
    } catch (e) {
      // aucune modification en cas d'erreur
    }
  }
  // Appliquer immédiatement la vitesse
  applySpeed();
  // Recalculer la vitesse lorsqu'elle est mise à jour dynamiquement
  window.addEventListener('capySpeedUpdated', applySpeed);
  let frameCount = 0;
  let score = 0;
  let ragondinMode = false;
  // Suivi du mode ragondin : durée de la partie et moment où le chat rattrape le capybara
  let ragondinTimer = 0;
  let ragondinCaught = false;
  let caughtFrame = 0;

  // Hauteur du sol
  let groundHeight = 80;

  // Chargement de l'arrière‑plan du marais (image générée)
  const swampImg = new Image();
  swampImg.src = 'assets/swamp_background.png';
  let swampLoaded = false;
  swampImg.onload = () => {
    swampLoaded = true;
    // Initialiser les couches de parallaxe lorsque l'image est prête.  Deux
    // couches se déplacent à des vitesses différentes pour créer un effet de
    // profondeur.  Chaque couche conserve une position horizontale qui sera
    // mise à jour à chaque frame.
    // Pour éviter les artefacts de découpage et les raccords disgracieux,
    // le fond est dessiné une seule fois sans parallaxe.  Les couches de
    // parallaxe restent vides.
    parallaxLayers = [];
  };

  // Couches de parallaxe pour le défilement du décor
  let parallaxLayers = [];

  // Adapter le canvas à la taille de la fenêtre pour un rendu responsive.
  function resizeCanvas() {
    /**
     * Redimensionne le canvas pour occuper davantage de place à l'écran.
     * On veut un format plus généreux en hauteur afin que l'action ne soit
     * plus confinée au coin inférieur.  Le canvas occupe jusqu'à 95 % de la
     * largeur disponible (avec une limite maximale) et environ 80 % de la
     * hauteur, en conservant un rapport largeur/hauteur proche de 5/4.
     */
    const maxWidth = 900;
    // Largeur initiale : 95 % de la fenêtre ou maxWidth, selon le plus petit
    let newWidth = Math.min(window.innerWidth * 0.95, maxWidth);
    // Hauteur basée sur un ratio 5/4 (hauteur = largeur * 0.8)
    let newHeight = newWidth * 0.8;
    // Si la hauteur dépasse 80 % de l'écran, l'ajuster et recalculer la largeur
    if (newHeight > window.innerHeight * 0.8) {
      newHeight = window.innerHeight * 0.8;
      newWidth = newHeight / 0.8;
    }
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    width = canvas.width;
    height = canvas.height;
    // Ajuster la hauteur du sol : 15 % de la nouvelle hauteur
    groundHeight = height * 0.15;
    // Réajuster les positions du capybara et du chat pour rester alignés avec le sol
    if (capy) {
      capy.y = height - groundHeight - capy.height / 2;
      // Centrer le capybara en mode ragondin, sinon le placer à 20 % de la largeur
      capy.x = ragondinMode ? width * 0.5 : width * 0.2;
    }
    if (cat) {
      cat.y = height - groundHeight - cat.height / 2;
      if (ragondinMode) {
        // En mode ragondin, positionner le chat derrière le capybara avec un écart initial élevé
        cat.x = Math.max(10, capy.x - 150);
      } else {
        const desiredX = width * 0.2 - 120;
        cat.x = desiredX < 10 ? 10 : desiredX;
      }
    }
  }

  // Contexte audio et contrôle du volume
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  try {
    audioCtx = new AudioContext();
  } catch (e) {
    audioCtx = null;
  }
  // Indicateur global pour couper le son : lorsqu'il est activé, aucun bip ni
  // mélodie ne sera joué.  Le bouton de volume modifie cette valeur.
  let isMuted = false;
  // Retrait de isMusicMuted : tous les sons sont contrôlés via isMuted
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
  // Gestion de l'ambiance sonore.  Le runner possède un son neutre qui
  // pourra être remplacé par une vraie musique d'ambiance.  La variable
  // `ambient` est l'objet Audio principal pour ce mode.
  const ambient = new Audio('assets/sounds/ambient_runner.wav');
  ambient.loop = true;

  // Appliquer immédiatement le volume global à l'ambiance.
  applyVolume();

  /**
   * Renvoie le volume global enregistré par le menu (0..1).  Retourne 0,5
   * par défaut si aucune valeur n'est disponible.  Ce volume est appliqué
   * à l'audio ambiant.  Les effets sonores passent par playBeep.
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
   * Applique le volume global à l'ambiance selon isMuted.
   */
  function applyVolume() {
    const vol = isMuted ? 0 : getGlobalVolume();
    ambient.volume = vol;
  }

  /**
   * Démarre la lecture de l'ambiance pour le mode runner.  Le paramètre
   * `ragondin` est conservé pour compatibilité mais n'a aucun effet : la
   * même ambiance est jouée dans les deux modes.  Si le son est coupé,
   * la lecture est interrompue.
   */
  function startMusic(ragondin = false) {
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
   * Met en pause l'ambiance.  Utilise pause() plutôt que stop() pour une
   * compatibilité maximale avec les navigateurs.
   */
  function stopMusic() {
    try {
      ambient.pause();
    } catch (e) {
      /* ignore */
    }
  }

  // Messages amusants sur le fromage et blagues pour l'écran de fin
  const cheeseMessages = [
    "Saviez‑vous que certaines meules de fromage peuvent peser plus de 100 kg ?",
    "Le Roquefort est affiné dans des grottes naturelles du sud de la France depuis des siècles.",
    "Pourquoi les fromagers sont‑ils de bons musiciens ? Parce qu’ils connaissent toutes les notes !",
    "Au Royaume‑Uni, il existe une course annuelle où l’on poursuit… un fromage qui dévale une colline !",
    "Quelle est la préférée des souris ? Celle qui a le plus de trous !",
    "En Suisse, certains fromages sont protégés par des AOP comme des trésors nationaux.",
    "Le mot « fromage » vient du latin “forma” qui désigne le moule dans lequel le caillé était pressé.",
    "Il existe plus de 1 200 variétés de fromage en France !",
    "On dit qu’un fromage qui sent fort a simplement beaucoup de caractère !",
    // Nouvelles anecdotes et blagues variées pour diversifier les messages
    "Un ragondin peut nager jusqu’à cinq kilomètres sans se fatiguer.",
    // La blague sur le gruyère a été supprimée car elle n'était pas
    // particulièrement drôle.  Nous privilégions des anecdotes ou
    // des jeux de mots amusants.
    "En Italie, certaines variétés de parmesan sont utilisées comme monnaie d’emprunt auprès des banques.",
    "Au Japon, on fabrique des desserts au fromage qui ressemblent à des nuages.",
    "Pourquoi le fromage bleu est‑il triste ? Parce qu’il se sent moisi…",
    "Le saviez‑vous ? Il existe un fromage suédois fabriqué à partir de lait de renne !",
    "Les moines médiévaux ont inventé plusieurs fromages pour financer leurs abbayes.",
    "Si le fromage était une personne, il serait certainement un grand comédien : il peut être à la fois doux, piquant et parfois coulant !",
    "On raconte qu’un capybara raffole du fromage… mais uniquement s’il est servi avec un bon verre d’eau !",
    "Les capybaras sont parfois surnommés « les rois du chill » car ils se prélassent avec n’importe quel animal.",
    "Une dinde qui se prend pour un capybara ? C'est un « capybird » !",
    "Pourquoi le capybara est‑il toujours calme ? Parce qu'il laisse couler comme l'eau du marais.",
    "Il existe un fromage au lait de chameau servi lors de fêtes africaines.",
    "Le fromage de yak se mâche pendant des heures comme un chewing‑gum.",
    "Un ragondin peut rester sous l'eau jusqu'à cinq minutes sans respirer.",
    "Quel fromage est fait pour le clavier ? Le ‘Queso’ !",
    "La mozzarella est originaire de la région de Campanie, en Italie.",
    "Le capybara adore se faire gratouiller derrière les oreilles, surtout après un plongeon.",
    "Pourquoi l’ogre ne mange plus de fromage ? Parce qu’il a trop de raclette !",
    "Certains fromages à pâte persillée étaient appelés “fromages du diable” par superstition.",
    "Selon une légende, les capybaras savent faire du surf sur les nénuphars.",
  ];

  // Messages satiriques pour les scores faibles (<10).  Ces phrases
  // amusantes s’affichent sur l’écran de fin lorsque le joueur ne
  // récolte qu’un petit nombre de points.
  const lowScoreMessages = [
    "Un marathon de sieste ? Ton capybara n’a pas beaucoup couru.",
    "On aurait dit une promenade de santé… sans la partie 'santé'.",
    "Ton score est si bas qu’on dirait un escargot déguisé en capybara."
  ];
  // Images pour égayer l'écran de fin : utiliser uniquement des animaux (capybaras ailés et courant)
  // Images pour égayer l'écran de fin : uniquement des capybaras
  // Les animaux hybrides (licorne, tortue, pingouin) et les capybaras
  // électriques sont écartés pour ne conserver que des visuels de capybara.
  const funImages = [
    'assets/capybara_flying_new.png',
    'assets/capybara_running_new.png',
    'assets/capybara_bomber.png',
    'assets/capybara_super.png',
    'assets/capybara_memory.png',
    'assets/capybara_blackjack.png',
    'assets/capybara_gign_new.png'
  ];


  // Classes des entités
  class RunnerCapy {
    constructor() {
      // Dimensions du capybara du mode Runner.  Ces valeurs sont choisies pour
      // un rendu lisible sur mobile et desktop.
      this.width = 70;
      this.height = 45;
      this.x = width * 0.2;
      this.y = height - groundHeight - this.height / 2;
      this.velY = 0;
      this.rotation = 0;
      // Timer de glisse après un saut : réduit la gravité pendant quelques frames
      this.glideTimer = 0;
      // Timer pour l'animation des pattes (avance/recule) lorsque le capybara court
      this.legTimer = 0;

      // Compteur de sauts consécutifs : permet d'autoriser deux sauts en l'air au maximum
      this.jumpCount = 0;
    }
    reset() {
      this.x = width * 0.2;
      this.y = height - groundHeight - this.height / 2;
      this.velY = 0;
      this.rotation = 0;
      this.glideTimer = 0;
      this.legTimer = 0;
      this.jumpCount = 0;
    }
    update() {
      // Appliquer une gravité réduite pendant la phase de glisse.  La
      // durée de la glisse est décrémentée en fonction de speedFactor de
      // sorte que l'effet dure un temps constant quel que soit le FPS.
      if (this.glideTimer > 0) {
        this.velY += gravity * 0.2 * speedFactor;
        this.glideTimer -= speedFactor;
        if (this.glideTimer < 0) this.glideTimer = 0;
        // Limiter la vitesse de descente pour planer un peu
        if (this.velY > 2) this.velY = 2;
      } else {
        this.velY += gravity * speedFactor;
      }
      // Mettre à jour la position verticale en tenant compte du facteur
      // global afin de conserver une chute/montée cohérente.
      this.y += this.velY * speedFactor;
      // Collision avec le sol
      const floorY = height - groundHeight - this.height / 2;
      // Lorsque le capybara touche le sol, il continue simplement à courir.
      // Dans le jeu du T‑Rex, toucher le sol n'entraîne pas la perte.
      if (this.y > floorY) {
        this.y = floorY;
        this.velY = 0;
        // Réinitialiser le compteur de sauts lorsqu'on touche le sol
        this.jumpCount = 0;
      }
      // Collision avec le plafond (limiter l'altitude)
      if (this.y - this.height / 2 < 0) {
        this.y = this.height / 2;
        this.velY = 0;
      }
      // Rotation en fonction de la vitesse
      const rotMax = 0.5;
      const rotMin = -0.5;
      this.rotation = Math.max(rotMin, Math.min(rotMax, this.velY / 10));

      // Avancer le timer des pattes lorsqu'on touche le sol.  Utiliser
      // speedFactor pour que l'animation soit indépendante du FPS.
      const currentFloorY = height - groundHeight - this.height / 2;
      if (this.y >= currentFloorY - 0.1) {
        this.legTimer += speedFactor;
      }
    }
    jump() {
      // Limiter le nombre de sauts à deux avant de retoucher le sol
      if (this.jumpCount >= 2) return;
      this.jumpCount++;
      // Saut plus puissant pour atteindre plus haut et activer une petite glisse
      this.velY = jumpStrength;
      // Initialiser glideTimer proportionnellement à speedFactor afin de
      // conserver une durée de glisse constante (~0,2 s).  Comme
      // glideTimer est décrémenté de speedFactor à chaque update, on
      // multiplie la valeur de base (12 frames) par speedFactor.
      this.glideTimer = 12 * speedFactor; // planer environ 0,2 s
      // Émettre un beep distinct pour le saut
      playBeep(650, 0.05, 0.08);
    }
    getBounds() {
      const shrink = 0.8;
      return {
        left: this.x - (this.width * shrink) / 2,
        top: this.y - (this.height * shrink) / 2,
        right: this.x + (this.width * shrink) / 2,
        bottom: this.y + (this.height * shrink) / 2,
      };
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      // Nous n'utilisons plus l'image détourée pour Capy Runner afin de revenir à
      // un rendu vectoriel.  Les formes vectorielles ci‑dessous représentent
      // le capybara en course.
      // Dessiner le corps
      ctx.fillStyle = '#b99563';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dessiner la tête légèrement en avant et plus petite que le corps
      ctx.beginPath();
      ctx.ellipse(this.width * 0.35, -this.height * 0.05, this.width * 0.3, this.height * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Oreille repositionnée et agrandie pour un aspect plus naturel.
      ctx.fillStyle = '#8b6c47';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.18, -this.height * 0.4, this.width * 0.1, this.height * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      // Œil
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.45, -this.height * 0.13, this.width * 0.05, this.height * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.47, -this.height * 0.13, this.width * 0.02, this.height * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      // Nez (narine) positionné sur l'avant de la tête
      ctx.fillStyle = '#4d3928';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.62, -this.height * 0.05, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      // Queue (petite)
      ctx.beginPath();
      ctx.arc(-this.width * 0.42, 0, this.width * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = '#8b6c47';
      ctx.fill();
      // Dessiner les pattes.  Lorsque le capybara est en l'air (velY < 0 ou position au dessus du sol),
      // les pattes sont dressées vers l'arrière ; sinon elles alternent pour simuler la course.
      const floorY = height - groundHeight - this.height / 2;
      const onGround = this.y >= floorY - 0.1;
      ctx.fillStyle = '#8b6c47';
      if (onGround) {
        // Les jambes pivotent doucement autour de leur « genou » pour simuler
        // un balayage léger du sol.  On ralentit l'animation en augmentant
        // le nombre de frames par cycle (diviseur 10) : cela rend les
        // oscillations moins rapides.  L'angle est réduit pour un mouvement
        // subtil.
        // On ralentit l'animation en allongeant le cycle : un cycle complet
        // toutes les 20 frames environ.  L'angle de pivot est réduit pour
        // éviter un clignotement trop rapide.
        const phase = Math.floor(this.legTimer / 20) % 2;
        const leftX = -this.width * 0.25;
        const rightX = this.width * 0.05;
        const yPos = this.height * 0.4;
        const legW = this.width * 0.12;
        const legH = this.height * 0.22;
        // Angle plus faible pour un mouvement subtil de balayage
        const angle = 0.2;
        const tilt = phase === 0 ? 1 : -1;
        const drawLeg = (xPos) => {
          ctx.save();
          // Placer le pivot au sommet de la patte (au niveau du corps).  On
          // translate au point d'attache puis on fait pivoter la jambe
          // autour de cet axe.  La patte est ensuite dessinée sous ce pivot.
          ctx.translate(xPos + legW / 2, yPos);
          ctx.rotate(tilt * angle);
          ctx.fillRect(-legW / 2, 0, legW, legH);
          ctx.restore();
        };
        drawLeg(leftX);
        drawLeg(rightX);
      } else {
        // En l'air : pattes repliées vers l'arrière, légèrement plus visibles
        const rearX1 = -this.width * 0.2;
        const rearX2 = this.width * 0.1;
        const rearY = this.height * 0.55;
        const rearW = this.width * 0.1;
        const rearH = this.height * 0.15;
        ctx.fillRect(rearX1, rearY, rearW, rearH);
        ctx.fillRect(rearX2, rearY, rearW, rearH);
      }
      ctx.restore();
    }
  }

  class RunnerCat {
    constructor() {
      this.width = 50;
      this.height = 35;
      // Position initiale du chat : légèrement derrière le capybara, avec une
      // marge minimale pour s'assurer qu'il reste visible sur les petits écrans.
      const desiredX = width * 0.2 - 120;
      this.x = desiredX < 10 ? 10 : desiredX;
      this.y = height - groundHeight - this.height / 2;
      this.velY = 0;
      // Timer pour l'animation des pattes
      this.legTimer = 0;
    }
    reset() {
      // Positionner le chat légèrement derrière le capybara.  On s'assure qu'il
      // reste à l'intérieur de l'écran en cas de petits écrans.
      const desiredX = width * 0.2 - 120;
      this.x = desiredX < 10 ? 10 : desiredX;
      this.y = height - groundHeight - this.height / 2;
      this.velY = 0;
      this.legTimer = 0;
    }
    update() {
      // Approcher du capybara sans le rattraper complètement.  En mode
      // ragondin fatigué, la distance d'écart se réduit progressivement en
      // fonction du temps écoulé pour que le chat rattrape doucement le
      // capybara.  Hors mode ragondin, une distance fixe est conservée.
      // Ajuster la distance dynamique en mode ragondin pour que le chat
      // approche plus lentement et laisse davantage de temps au joueur.
      // L'écart initial est plus grand (200 px) et décroît plus doucement
      // (divisé par 6) jusqu'à un minimum de 20 px.
      const dynamicDistance = ragondinMode
        ? Math.max(20, 200 - ragondinTimer / 6)
        : 150;
      const targetX = capy.x - dynamicDistance;
      // Calcul d'une vitesse d'approche qui augmente avec le score (limité à 1)
      const approachSpeed = Math.min(0.5 + score / 200, 1);
      if (this.x < targetX) {
        // Multiplier par speedFactor pour conserver une vitesse
        // d'approche constante en temps réel.
        this.x += approachSpeed * speedFactor;
      }
      // Saut automatique si un obstacle approche.  On ne désactive plus
      // l'auto-saut en mode ragondin pour que le chat continue à sauter au-dessus
      // des obstacles.  Un petit décalage aléatoire est ajouté à la portée
      // pour varier le moment des sauts et les rendre moins mécaniques.
      for (const obs of obstacles) {
        // Déterminer une zone d'anticipation variable
        const randomRange = 120 + Math.random() * 60; // entre 120 et 180 px
        if (
          obs.x < this.x + randomRange &&
          obs.x + obs.width > this.x + this.width / 2 &&
          this.y + this.height / 2 >= height - groundHeight - obs.height
        ) {
          if (this.velY >= -2) {
            this.velY = jumpStrength;
          }
        }
      }
      // Appliquer la gravité
      this.velY += gravity * speedFactor;
      this.y += this.velY * speedFactor;
      // Collisions avec le sol
      const floorY = height - groundHeight - this.height / 2;
      if (this.y > floorY) {
        this.y = floorY;
        this.velY = 0;
      }
      // Limiter le plafond
      if (this.y - this.height / 2 < 0) {
        this.y = this.height / 2;
        this.velY = 0;
      }
      // Avancer le timer des pattes lorsque le chat touche le sol
      const onGround = this.y >= height - groundHeight - this.height / 2 - 0.1;
      if (onGround) {
        this.legTimer += speedFactor;
      }
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      // Corps (chat noir stylisé)
      // On remonte davantage le corps pour que les pattes soient bien visibles,
      // et on utilise une teinte légèrement plus claire pour les membres afin
      // de distinguer leur mouvement du corps.
      const bodyOffsetY = -this.height * 0.15;
      ctx.fillStyle = '#333';
      // Corps légèrement remonté
      ctx.beginPath();
      ctx.ellipse(0, bodyOffsetY, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tête remontée avec le corps
      ctx.beginPath();
      ctx.ellipse(this.width * 0.3, bodyOffsetY - this.height * 0.2, this.width * 0.25, this.height * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // Oreilles repositionnées et agrandies pour ressembler à des oreilles
      // Elles sont désormais d'un noir profond pour contraster avec le corps.
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.45, bodyOffsetY - this.height * 0.55, this.width * 0.1, this.height * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.width * 0.25, bodyOffsetY - this.height * 0.55, this.width * 0.1, this.height * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      // Yeux (jaunes)
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.4, bodyOffsetY - this.height * 0.25, this.width * 0.05, this.height * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.width * 0.26, bodyOffsetY - this.height * 0.25, this.width * 0.05, this.height * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Dessiner les pattes sous le corps.  Elles pivotent lentement
      // autour de leur « genou ».  On utilise une couleur légèrement
      // plus claire (#888) pour mieux distinguer les membres du corps.  Le
      // cycle d'animation est ralenti et l'angle de pivot est réduit.
      ctx.save();
      // Translation verticale : appliquer le même offset que pour le corps
      ctx.translate(this.x, this.y + (-this.height * 0.15));
      ctx.fillStyle = '#888';
      // Cycle plus long pour éviter un clignotement.  Un cycle complet
      // toutes les 16 frames environ.
      const phase = Math.floor(this.legTimer / 16) % 2;
      const angle = 0.25;
      const tilt = phase === 0 ? 1 : -1;
      const legW = this.width * 0.12;
      const legH = this.height * 0.3;
      const leftX = -this.width * 0.25;
      const rightX = this.width * 0.05;
      // Position verticale de base : sous le corps
      const yPos = this.height * 0.4;
      const drawLeg = (xPos) => {
        ctx.save();
        // Placer le pivot au sommet de la patte, puis dessiner la patte
        // sous ce pivot.  Ce pivot correspond à l'endroit où la patte
        // rejoint le corps.
        ctx.translate(xPos + legW / 2, yPos);
        ctx.rotate(tilt * angle);
        ctx.fillRect(-legW / 2, 0, legW, legH);
        ctx.restore();
      };
      drawLeg(leftX);
      drawLeg(rightX);
      ctx.restore();
    }
  }

  class RunnerObstacle {
    constructor() {
      // Ajouter une variété d'obstacles pour le marais : arbres, buissons et rochers.
      const types = ['tree', 'bush', 'rock', 'stump', 'flower'];
      this.type = types[Math.floor(Math.random() * types.length)];
      // Définir la taille selon le type et agrandir les éléments pour qu'ils
      // remplissent mieux l'espace.  Les buissons sont plus larges et plus
      // hauts et les arbres un peu plus imposants.
      switch (this.type) {
        case 'tree':
          this.width = 80;
          this.height = 150;
          break;
        case 'rock':
          this.width = 80;
          this.height = 60;
          break;
        case 'stump':
          this.width = 70;
          this.height = 60;
          break;
        case 'flower':
          this.width = 60;
          this.height = 80;
          break;
        case 'bush':
        default:
          this.width = 120;
          this.height = 100;
          break;
      }
      this.x = width + this.width;
    }
    update() {
      this.x -= gameSpeed;
    }
    draw() {
      const baseY = height - groundHeight;
      ctx.save();
      ctx.translate(this.x, baseY);
      switch (this.type) {
        case 'tree': {
          // Tronc
          ctx.fillStyle = '#8d6e63';
          const trunkW = this.width * 0.2;
          const trunkH = this.height * 0.5;
          ctx.fillRect((this.width - trunkW) / 2, -trunkH, trunkW, trunkH);
          // Contour du tronc
          ctx.strokeStyle = '#5d4037';
          ctx.lineWidth = 2;
          ctx.strokeRect((this.width - trunkW) / 2, -trunkH, trunkW, trunkH);
          // Feuillage : plusieurs ellipses pour un rendu plus fourni
          const canopyCount = 3;
          for (let i = 0; i < canopyCount; i++) {
            const rx = this.width * (0.7 - i * 0.1);
            const ry = this.height * 0.3;
            const offsetY = -this.height + i * (this.height * 0.15);
            ctx.fillStyle = '#4caf50';
            ctx.beginPath();
            ctx.ellipse(this.width / 2, offsetY, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            // Contour du feuillage
            ctx.strokeStyle = '#388e3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(this.width / 2, offsetY, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }
        case 'rock': {
          // Rocher gris avec contour et fissures
          ctx.fillStyle = '#90a4ae';
          ctx.beginPath();
          ctx.ellipse(this.width / 2, -this.height * 0.5, this.width * 0.45, this.height * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#455a64';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(this.width / 2, -this.height * 0.5, this.width * 0.45, this.height * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
          // Fissures
          ctx.strokeStyle = '#607d8b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(this.width * 0.4, -this.height * 0.6);
          ctx.lineTo(this.width * 0.55, -this.height * 0.4);
          ctx.lineTo(this.width * 0.35, -this.height * 0.3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(this.width * 0.6, -this.height * 0.6);
          ctx.lineTo(this.width * 0.7, -this.height * 0.45);
          ctx.stroke();
          break;
        }
        case 'stump': {
          // Souche d'arbre : cylindre brun avec un dessus clair et des anneaux
          // Tronc
          ctx.fillStyle = '#8d6e63';
          ctx.fillRect(this.width * 0.2, -this.height, this.width * 0.6, this.height);
          ctx.strokeStyle = '#5d4037';
          ctx.lineWidth = 2;
          ctx.strokeRect(this.width * 0.2, -this.height, this.width * 0.6, this.height);
          // Dessus de la souche
          ctx.fillStyle = '#a98258';
          ctx.beginPath();
          ctx.ellipse(this.width * 0.5, -this.height, this.width * 0.3, this.height * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#6d4c41';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(this.width * 0.5, -this.height, this.width * 0.3, this.height * 0.15, 0, 0, Math.PI * 2);
          ctx.stroke();
          // Anneaux
          ctx.strokeStyle = '#8d6e63';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(this.width * 0.5, -this.height * 0.9, this.width * 0.25, this.height * 0.1, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(this.width * 0.5, -this.height * 0.8, this.width * 0.2, this.height * 0.08, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'flower': {
          // Fleur colorée : tige verte et pétales autour d'un cœur jaune
          // Tige
          ctx.fillStyle = '#66bb6a';
          ctx.fillRect(this.width * 0.48, -this.height * 0.8, this.width * 0.04, this.height * 0.8);
          // Pétales : plusieurs ellipses de couleur vive
          const petalColors = ['#e91e63', '#f06292', '#ba68c8', '#ce93d8'];
          const petalCount = 5;
          for (let i = 0; i < petalCount; i++) {
            const angle = (i * 2 * Math.PI) / petalCount;
            const px = this.width * 0.5 + Math.cos(angle) * this.width * 0.25;
            const py = -this.height * 0.8 + Math.sin(angle) * this.height * 0.25;
            ctx.fillStyle = petalColors[i % petalColors.length];
            ctx.beginPath();
            ctx.ellipse(px, py, this.width * 0.15, this.height * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Cœur de la fleur
          ctx.fillStyle = '#fdd835';
          ctx.beginPath();
          ctx.ellipse(this.width * 0.5, -this.height * 0.8, this.width * 0.12, this.height * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fbc02d';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(this.width * 0.5, -this.height * 0.8, this.width * 0.12, this.height * 0.12, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'bush':
        default: {
          // Buisson : dessiner plusieurs ellipses qui se chevauchent avec des contours renforcés
          const parts = 4;
          for (let i = 0; i < parts; i++) {
            const rx = this.width * (0.35 + 0.05 * (i % 2));
            const ry = this.height * 0.4;
            const offsetX = (i - (parts - 1) / 2) * this.width * 0.2;
            // Position verticale ajustée pour que le bas des buissons touche le sol.  Le facteur
            // 0.4 place le centre de l'ellipse de manière à ce que sa limite
            // inférieure atteigne l'origine (sol).
            const offsetY = -this.height * 0.4 + (i % 2) * 10;
            ctx.fillStyle = '#66bb6a';
            ctx.beginPath();
            ctx.ellipse(this.width / 2 + offsetX, offsetY, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            // Contour du buisson renforcé
            ctx.strokeStyle = '#2e7d32';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(this.width / 2 + offsetX, offsetY, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }
      }
      ctx.restore();
    }
    isOffScreen() {
      return this.x + this.width < 0;
    }

    /**
     * Calcule une hitbox réduite pour cet obstacle afin de rendre la collision
     * plus permissive.  On retire 10 % sur les côtés et 20 % en haut et en
     * bas afin que le joueur puisse frôler un obstacle sans perdre
     * immédiatement.
     */
    getHitbox() {
      const marginX = this.width * 0.1;
      const marginY = this.height * 0.2;
      return {
        left: this.x + marginX,
        right: this.x + this.width - marginX,
        top: height - groundHeight - this.height + marginY,
        bottom: height - groundHeight - marginY,
      };
    }
  }

  class Heart {
    constructor(x, y, dx = 0, dy = 0) {
      this.x = x;
      this.y = y;
      // Taille légèrement plus grande pour rendre les bisous visibles
      this.size = 18;
      // Direction vers laquelle le cœur se déplace (calculée lors de la création)
      this.dx = dx;
      this.dy = dy;
    }
    update() {
      // Les cœurs se déplacent selon leur vecteur de direction.  La gravité est
      // négligée : ils flottent simplement vers leur cible, puis disparaissent.
      this.x += this.dx;
      this.y += this.dy;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.size / 20, this.size / 20);
      ctx.fillStyle = '#e91e63';
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.bezierCurveTo(-6, -12, -12, -4, 0, 6);
      ctx.bezierCurveTo(12, -4, 6, -12, 0, -4);
      ctx.fill();
      ctx.restore();
    }
    isOffScreen() {
      // Les cœurs sont supprimés lorsqu'ils sortent complètement de l'écran
      return this.x > width || this.y + this.size < 0 || this.x + this.size < 0;
    }
  }

  // Classe Bonus pour le mode Runner.  Inspiré du bonus du jeu volant, il
  // apparaît de temps en temps et augmente le score lorsqu'il est
  // collecté.  Les bonus flottent au milieu de l'écran et se déplacent
  // horizontalement avec la même vitesse que les obstacles.
  class Bonus {
    constructor() {
      this.radius = 16;
      this.x = width + this.radius;
      // Position verticale : au-dessus du capybara mais sous le ciel
      this.y = height * 0.45 + (Math.random() - 0.5) * height * 0.1;
      this.collected = false;
      // Chaque bonus est soit une carotte soit une patate pour varier
      // les visuels.  Les carottes rapportent des points et les patates
      // peuvent être interprétées comme un bonus de même nature (toutes
      // deux donnent des points supplémentaires dans ce mode).
      this.type = Math.random() < 0.5 ? 'carrot' : 'potato';
    }
    update() {
      this.x -= gameSpeed;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      // Dessiner une bulle transparente légèrement plus lumineuse autour du bonus
      ctx.fillStyle = 'rgba(255, 236, 105, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Dessiner une carotte ou une patate selon le type
      if (this.type === 'carrot') {
        // Carotte orange plus vive orientée vers le bas
        ctx.fillStyle = '#f6a323';
        ctx.beginPath();
        ctx.moveTo(0, this.radius);
        ctx.lineTo(this.radius * 0.6, -this.radius);
        ctx.lineTo(-this.radius * 0.6, -this.radius);
        ctx.closePath();
        ctx.fill();
        // Fanes vertes
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
    isOffScreen() {
      return this.x + this.radius < 0;
    }
    getBounds() {
      return {
        left: this.x - this.radius,
        right: this.x + this.radius,
        top: this.y - this.radius,
        bottom: this.y + this.radius,
      };
    }
  }

  // Collections
  let capy = new RunnerCapy();
  let cat = new RunnerCat();
  let obstacles = [];
  let hearts = [];
  let bonuses = [];

  // Décors animés : nuages et oiseaux.  Ces éléments ajoutent du mouvement
  // dans le ciel pour montrer la vitesse de défilement même en l'absence
  // d'obstacles.  Les nuages avancent lentement, tandis que les oiseaux
  // apparaissent occasionnellement et se déplacent un peu plus vite.
  let clouds = [];
  let birds = [];

  class Cloud {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * (height - groundHeight) * 0.3 + 10;
      // Vitesse légèrement proportionnelle à la vitesse du jeu
      this.speed = gameSpeed * 0.2 + Math.random() * 0.5;
      this.scale = 0.4 + Math.random() * 0.4;
    }
    update() {
      this.x -= this.speed;
      if (this.x < -150 * this.scale) {
        this.x = width + 150 * this.scale;
        this.y = Math.random() * (height - groundHeight) * 0.3 + 10;
        this.speed = gameSpeed * 0.2 + Math.random() * 0.5;
        this.scale = 0.4 + Math.random() * 0.4;
      }
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.scale, this.scale);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      // Dessiner trois ellipses se chevauchant pour former un nuage
      const r = 30;
      ctx.beginPath();
      ctx.arc(-r * 0.6, 0, r, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.4, r * 1.2, 0, Math.PI * 2);
      ctx.arc(r * 0.8, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Bird {
    constructor() {
      this.x = width + 40;
      this.y = Math.random() * (height - groundHeight) * 0.3 + 20;
      this.speed = gameSpeed * 0.4 + Math.random() * 1.0;
    }
    update() {
      this.x -= this.speed;
    }
    draw() {
      ctx.save();
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Dessiner un simple V pour représenter un oiseau en vol
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + 8, this.y - 5);
      ctx.lineTo(this.x + 16, this.y);
      ctx.stroke();
      ctx.restore();
    }
    isOffScreen() {
      return this.x < -20;
    }
  }

  // Intervalle d'apparition des bonus (en frames).  Un bonus est généré
  // toutes les 400 frames (~6,6 s à 60 FPS).  Les bonus ne sont pas
  // générés en mode ragondin fatigué afin de préserver la simplicité de
  // ce mode.
  const bonusSpawnInterval = 400;

  // -------------------------------------------------------------------------
  // Gestion de la vitesse indépendante du nombre de frames
  //
  // Comme pour les autres mini‑jeux, nous introduisons un facteur de
  // vitesse global (speedFactor) calculé via window.getGameSpeed('runner').
  // Ce facteur ajuste les mouvements et les minuteries en temps réel afin
  // d'obtenir un rythme constant sur des écrans 30 Hz, 60 Hz ou 144 Hz.
  // Des minuteries cumulatives (obstacleTimer, bonusTimer et heartTimer)
  // sont incrémentées de speedFactor à chaque frame pour déclencher
  // l'apparition d'obstacles, de bonus ou de coeurs après un nombre
  // d'unités de temps équivalent.
  let speedFactor = 1;
  function applySpeedFactorRunner() {
    try {
      if (window.getGameSpeed) {
        const s = window.getGameSpeed('runner');
        speedFactor = (typeof s === 'number' && s > 0) ? s : 1;
      } else {
        speedFactor = 1;
      }
    } catch (e) {
      speedFactor = 1;
    }
  }
  // Appliquer immédiatement et écouter les modifications globales de vitesse
  applySpeedFactorRunner();
  window.addEventListener('capySpeedUpdated', applySpeedFactorRunner);

  // Minuteries pour les éléments périodiques (obstacles, bonus et coeurs)
  let obstacleTimer = 0;
  let bonusTimer = 0;
  let heartTimer = 0;

  function resetGame(modeRagondin = false) {
    score = 0;
    frameCount = 0;
    ragondinMode = modeRagondin;
    ragondinTimer = 0;
    ragondinCaught = false;
    caughtFrame = 0;
    capy.reset();
    cat.reset();
    // En mode ragondin fatigué, placer le capybara et le chat au centre
    // de l'écran afin que le joueur bénéficie d'une zone de jeu plus grande.
    if (modeRagondin) {
      capy.x = width * 0.5;
      // Positionner le chat derrière le capybara avec une marge généreuse
      cat.x = Math.max(10, capy.x - 150);
    }
    obstacles = [];
    hearts = [];
    bonuses = [];
    // Réinitialiser la vitesse et l'intervalle de génération avec les
    // valeurs de base afin de conserver une progression équilibrée.  La
    // vitesse initiale est la vitesse originale (doublée par origGameSpeed)
    // et l'intervalle entre obstacles est plus long pour permettre au
    // joueur de s'adapter au rythme rapide.
    gameSpeed = origGameSpeed;
    spawnInterval = 200;
    // Initialiser les nuages et les oiseaux.  Réinitialiser leurs tableaux
    // pour éviter l'accumulation entre les parties.
    clouds = [];
    for (let i = 0; i < 4; i++) {
      clouds.push(new Cloud());
    }
    birds = [];
  }

  function endGame() {
    state = STATE_GAMEOVER;
    // Sauvegarder le meilleur score
    if (score > runnerHighScore) {
      runnerHighScore = score;
      try {
        localStorage.setItem('capyRunnerHighScore', String(runnerHighScore));
      } catch (e) {
        // Ignorer
      }
    }
    // Afficher uniquement la valeur du score et du record dans l'écran de fin
    currentScoreEl.textContent = `${score}`;
    highScoreEl.textContent = `${runnerHighScore}`;
    // Choisir un message et un visuel amusant pour l'écran de fin.
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
    // Arrêter la musique d'ambiance lorsque la partie se termine
    stopMusic();
  }

  function update() {
    frameCount++;
    // Mise à jour capybara et chat
    capy.update();
    cat.update();

    // Mettre à jour les nuages et les oiseaux.  Les nuages se déplacent
    // continuellement tandis que des oiseaux apparaissent occasionnellement.
    clouds.forEach((c) => c.update());
    birds.forEach((b) => b.update());
    // Supprimer les oiseaux hors champ
    birds = birds.filter((b) => !b.isOffScreen());
    // Faire apparaître un oiseau aléatoirement.  La probabilité par frame
    // est multipliée par speedFactor pour conserver un taux d'apparition
    // constant par seconde quelle que soit la fréquence de rafraîchissement.
    if (Math.random() < 0.005 * speedFactor) {
      birds.push(new Bird());
    }

    // Pas de mise à jour des couches de parallaxe : le fond reste fixe.
    // Suivi du temps en mode ragondin et gestion de la rencontre entre le
    // chat et le capybara.  Le chat s'approche doucement grâce à la
    // distance dynamique définie dans RunnerCat.update().  Lorsque la
    // distance entre les deux se réduit suffisamment, une explosion de
    // cœurs est déclenchée immédiatement, puis une pluie de cœurs continue
    // pendant un court moment avant la fin automatique de la partie.
    if (ragondinMode) {
      ragondinTimer++;
      if (!ragondinCaught) {
        const dx = capy.x - cat.x;
        // Déclencher la rencontre lorsque le chat atteint presque le capybara ou après un délai maximal
        // Ajuster la durée du mode ragondin : la rencontre se produit
        // après environ 26 secondes (~1 600 frames à 60 FPS) ou lorsque le
        // chat atteint physiquement le capybara.  Cette durée est
        // légèrement réduite pour offrir une séquence contemplative mais
        // cohérente avec la demande (~25–30 s).
        if (dx <= 30 || ragondinTimer >= 1600) {
          ragondinCaught = true;
          caughtFrame = ragondinTimer;
          // Explosion initiale de cœurs : générer plusieurs cœurs partant
          // du milieu entre le chat et le capybara dans des directions aléatoires
          const cx = (capy.x + cat.x) / 2;
          const cy = (capy.y + cat.y) / 2;
          for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            const dxh = Math.cos(angle) * speed;
            const dyh = Math.sin(angle) * speed;
            hearts.push(new Heart(cx, cy, dxh, dyh));
          }
        }
      } else {
        const elapsed = ragondinTimer - caughtFrame;
        // Pendant un certain nombre de frames après la rencontre, générer
        // des cœurs supplémentaires pour prolonger l'effet et renforcer
        // l'atmosphère paisible du mode fatigué.  Le délai est
        // considérablement allongé : on passe de 360 frames (~6 s) à
        // 600 frames (~10 s).  Ces valeurs assurent que le mode
        // ragondin fatigué dure encore plus longtemps avant de se terminer.
        if (elapsed < 600) {
          const cx = (capy.x + cat.x) / 2;
          const cy = (capy.y + cat.y) / 2;
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 1.5;
            const dxh = Math.cos(angle) * speed;
            const dyh = Math.sin(angle) * speed;
            hearts.push(new Heart(cx, cy, dxh, dyh));
          }
        } else {
          endGame();
          return;
        }
      }
    }
    // Mettre à jour les coeurs (bisous)
    hearts.forEach((h) => h.update());
    hearts = hearts.filter((h) => !h.isOffScreen());
    // Génération de coeurs en mode ragondin
    if (ragondinMode) {
      // Génération de bisous selon un minuteur indépendant du nombre de
      // frames.  heartTimer s'incrémente de speedFactor à chaque frame et
      // déclenche la création d'un cœur lorsque le seuil (40) est atteint.
      heartTimer += speedFactor;
      if (heartTimer >= 40) {
        heartTimer -= 40;
        const startX = cat.x + cat.width * 0.5;
        const startY = cat.y - cat.height * 0.5;
        const targetX = capy.x;
        const targetY = capy.y;
        const dxTot = targetX - startX;
        const dyTot = targetY - startY;
        const dist = Math.sqrt(dxTot * dxTot + dyTot * dyTot) || 1;
        const speed = 2.5;
        const dx = (dxTot / dist) * speed;
        const dy = (dyTot / dist) * speed;
        hearts.push(new Heart(startX, startY, dx, dy));
      }
    }
    // Génération d'obstacles et de bonus.  Les minuteries obstacleTimer et
    // bonusTimer s'incrémentent de speedFactor à chaque frame.  Lorsque
    // ces minuteries atteignent leur intervalle respectif, un élément est
    // ajouté et la minuterie est réduite.  Ceci maintient un rythme
    // constant d'apparition en temps réel.
    if (!ragondinMode) {
      obstacleTimer += speedFactor;
      if (obstacleTimer >= spawnInterval) {
        obstacleTimer -= spawnInterval;
        obstacles.push(new RunnerObstacle());
      }
      bonusTimer += speedFactor;
      if (bonusTimer >= bonusSpawnInterval) {
        bonusTimer -= bonusSpawnInterval;
        bonuses.push(new Bonus());
      }
    }
    // Mise à jour des obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.update();
      // Passage d'obstacle = augmentation du score
      if (!obs.scored && obs.x + obs.width < capy.x) {
        obs.scored = true;
        score++;
        // Augmenter légèrement la vitesse toutes les 5 unités de score.  La
        // progression est plus douce (0.15) pour que le jeu reste accessible
        // plus longtemps.
        if (score % 5 === 0) {
          // Accélération progressive : avant 50 points, augmentation modérée ;
          // au‑delà, la vitesse augmente davantage pour rendre le jeu plus difficile.
          if (score < 50) {
            // Augmenter la vitesse plus fortement pour accélérer davantage le jeu
            gameSpeed += 0.25;
          } else {
            gameSpeed += 0.4;
          }
        }
        // Réduire l'intervalle entre les obstacles.  Au‑delà de 50 points,
        // la réduction s'accélère pour densifier les obstacles.
        if (score < 50) {
          spawnInterval = Math.max(140, Math.floor(300 - score * 0.3));
        } else {
          spawnInterval = Math.max(120, Math.floor(300 - 50 * 0.3 - (score - 50) * 0.6));
        }
      }
      // Collision avec le capybara
      // Si l'on est en mode ragondin, on conserve les obstacles mais on
      // désactive la collision, de sorte que le capybara puisse passer au
      // travers sans perdre.  Sinon, on utilise une hitbox réduite pour
      // permettre un contact permissif.
      if (!ragondinMode) {
        const cb = capy.getBounds();
        const hb = obs.getHitbox();
        if (
          cb.right > hb.left &&
          cb.left < hb.right &&
          cb.bottom > hb.top &&
          cb.top < hb.bottom
        ) {
          endGame();
        }
      }
      if (obs.isOffScreen()) {
        obstacles.splice(i, 1);
      }
    }
    // Mettre à jour les bonus
    for (let i = bonuses.length - 1; i >= 0; i--) {
      const b = bonuses[i];
      b.update();
      // Collision entre le capybara et le bonus : augmenter le score et
      // supprimer le bonus.  On utilise une vérification simple par
      // rectangle englobant autour du bonus et du capybara.
      const cb = capy.getBounds();
      const bb = b.getBounds();
      if (
        !ragondinMode &&
        cb.right > bb.left &&
        cb.left < bb.right &&
        cb.bottom > bb.top &&
        cb.top < bb.bottom
      ) {
        score += 5;
        // Jouer un son lorsque l'on collecte un bonus afin de rendre
        // l'interaction plus satisfaisante
        playBeep(800, 0.1, 0.08);
        bonuses.splice(i, 1);
        continue;
      }
      // Retirer les bonus sortis de l'écran
      if (b.isOffScreen()) {
        bonuses.splice(i, 1);
      }
    }
  }

  function drawBackground() {
    // Ciel dégradé clair
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#bbdefb');
    skyGrad.addColorStop(1, '#e3f2fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);
    // Défilement parallaxe : dessiner chaque couche avec son décalage
    const areaH = height - groundHeight;
    if (swampLoaded && parallaxLayers.length > 0) {
      parallaxLayers.forEach((layer) => {
        // Dessiner l'image deux fois pour couvrir toute la largeur
        ctx.drawImage(swampImg, layer.offset, 0, width, areaH);
        ctx.drawImage(swampImg, layer.offset + width, 0, width, areaH);
      });
    } else if (swampLoaded) {
      // Fallback : une seule couche si les couches n'ont pas été initialisées
      ctx.drawImage(swampImg, 0, 0, width, areaH);
    }
    // Sol : bande unique de couleur pour le rivage
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, height - groundHeight, width, groundHeight);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    // Décors animés dans le ciel
    clouds.forEach((c) => c.draw());
    birds.forEach((b) => b.draw());
    // Dessiner obstacles
    obstacles.forEach((obs) => obs.draw());
    // Dessiner les bonus
    bonuses.forEach((b) => b.draw());
    // Dessiner coeurs
    hearts.forEach((h) => h.draw());
    // Dessiner chat et capybara
    cat.draw();
    capy.draw();
    // Afficher le score au centre du haut.  La mention "Score" est
    // supprimée pour mettre en avant la valeur.  Un panneau sombre
    // semi‑transparent améliore la lisibilité.  Le texte est doré et en gras.
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(scoreStr, width / 2, boxY + boxH / 2);
    ctx.restore();
  }

  function gameLoop() {
    // Suspendre la boucle tant que la pop‑up de pré‑lancement est affichée
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

  function startGame(modeRagondin = false) {
    resetGame(modeRagondin);
    state = STATE_PLAYING;
    // Cacher les overlays si ils existent
    if (typeof menuOverlay !== 'undefined' && menuOverlay) {
      menuOverlay.classList.add('hidden');
    }
    gameOverOverlay.classList.add('hidden');
    // Lancer la musique d'ambiance adaptée au mode
    startMusic(modeRagondin);
  }

  // Démarrer automatiquement lorsque l’overlay de pré‑lancement se ferme
  window.addEventListener('capyGameStart', () => {
    if (state === STATE_MENU) {
      startGame();
    }
  });

  function returnMenu() {
    state = STATE_MENU;
    if (typeof menuOverlay !== 'undefined' && menuOverlay) {
      menuOverlay.classList.remove('hidden');
    }
    gameOverOverlay.classList.add('hidden');
    // Arrêter la musique lorsqu'on quitte le jeu
    stopMusic();
  }

  // Gestionnaires d'événements UI
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startGame(false);
    });
  }
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Lien correct vers le menu depuis capy/runner.html
      window.location.href = '../Capy/games.html';
    });
  }
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      startGame(false);
    });
  }
  if (ragondinBtn) {
    ragondinBtn.addEventListener('click', () => {
      startGame(true);
    });
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      // Idem : corriger le chemin relatif
      window.location.href = '../Capy/games.html';
    });
  }

  // Contrôles clavier et souris
  function handleJump() {
    if (state === STATE_PLAYING) {
      capy.jump();
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

  // Ajuster le canvas lorsque la taille de la fenêtre change et initialiser ses dimensions.
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Démarrage automatique : si aucun bouton de démarrage n'est présent (pas de menu),
  // lancer directement le jeu en mode normal lorsque la page est chargée.
  if (!startBtn) {
    startGame(false);
  }
  // Lancer la boucle d'animation
  requestAnimationFrame(gameLoop);

  // (Les définitions et appels dupliqués de resizeCanvas et de la boucle de jeu
  // ont été supprimés.  Le redimensionnement et l'initialisation de la boucle
  // sont gérés plus haut dans le fichier.)
})();