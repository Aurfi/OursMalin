(() => {
  /**
   * Ragondin Véhicule
   *
   * Ce mode s'inspire du jeu Runner : un capybara conduit une petite voiture
   * bleue et doit franchir des obstacles dans un marais.  Il est suivi par
   * une voiture identique conduite par un chat noir, pour rappeler le mode
   * Running Capy.  Aucune référence textuelle à l'entreprise d'énergie n'est
   * utilisée.  Ce script gère le gameplay, l'animation, le score et les
   * interactions utilisateur.
   */

  const canvas = document.getElementById('energyCanvas');
  const ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;

  // États possibles
  const STATE_PLAYING = 'playing';
  const STATE_GAMEOVER = 'gameover';
  let state = STATE_PLAYING;

  // Meilleur score sauvegardé dans le localStorage.  La clé a été changée
  // pour éviter de faire référence à l'ancien mode (« véhicule »).  Nous
  // utilisons maintenant « capyElectricHighScore » pour enregistrer le
  // record du mode Ragon électrique.
  let energyHighScore = 0;
  try {
    const stored = localStorage.getItem('capyElectricHighScore');
    if (stored !== null) energyHighScore = parseInt(stored, 10) || 0;
  } catch (e) {
    energyHighScore = 0;
  }

  // Sélecteurs d'interface
  const gameOverOverlay = document.getElementById('energy-gameover');
  const currentScoreEl = document.getElementById('energy-current-score');
  const highScoreEl = document.getElementById('energy-high-score');
  const replayBtn = document.getElementById('energy-replay-button');
  const menuBtn = document.getElementById('energy-menu-button');
  const funMessageEl = document.getElementById('energy-fun-message');
  const volumeBtn = document.getElementById('volume-toggle');

  // Bouton pour couper uniquement la musique, sans couper les effets sonores
  // Aucun bouton musique n'est utilisé dans cette version ; le sélecteur est conservé
  // uniquement pour compatibilité mais n'est pas utilisé.
  const musicBtn = null;

  // Paramètres du jeu
  const gravity = 0.25;
  const jumpStrength = -9;
  // Vitesse horizontale de base.  La valeur origGameSpeed est mémorisée pour
  // permettre de recalculer gameSpeed lorsque GLOBAL_SPEED_MULTIPLIER change.
  // Doubler la vitesse horizontale de base pour rendre la course plus dynamique.
  // L'espacement des obstacles est ajusté plus loin pour rester jouable.
  const origGameSpeed = 5.0;
  let gameSpeed = origGameSpeed;
  // Intervalle initial plus long pour éviter l'apparition d'obstacles dès
  // les premières secondes.  La valeur initiale est stockée pour pouvoir
  // recalculer spawnInterval lors de la mise à jour du multiplicateur.
  // Augmenter l’intervalle initial entre deux obstacles afin de compenser
  // la vitesse doublée.  Un intervalle plus long laisse au conducteur le temps
  // de réagir et de manœuvrer entre les éléments.
  const initialSpawnInterval = 300;
  let spawnInterval = initialSpawnInterval;

  // -------------------------------------------------------------------------
  // Gestion de la vitesse indépendante du nombre de frames
  //
  // Le mode Ragon électrique partage de nombreuses similitudes avec les
  // modes Runner et Flappy : des obstacles, des bonus et des décorations
  // apparaissent régulièrement et se déplacent horizontalement.  Dans la
  // version d'origine, l’apparition de ces éléments était basée sur
  // frameCount et des probabilités fixes par frame, ce qui provoquait un
  // comportement très différent selon la fréquence de rafraîchissement (30 Hz,
  // 60 Hz ou 120 Hz).  Pour rendre la vitesse uniforme, on introduit un
  // multiplicateur « speedFactor » dérivé de window.getGameSpeed('energy') qui
  // correspond au nombre d’unités temporelles par frame.  Toutes les
  // minuteries sont incrémentées de speedFactor à chaque frame.  Lorsqu’une
  // minuterie dépasse un seuil (intervalle de génération), un nouvel
  // élément est créé et la minuterie est réduite.
  //
  // Ces minuteries incluent :
  //   • obstacleTimer : apparition des obstacles (RunnerObstacle).
  //   • bonusTimer : apparition des bonus.
  //   • cloudTimer : apparition des nuages décoratifs.
  //   • lightningTimer : durée de vie des éclairs dans la classe Lightning.
  //   • bird probability : probabilité d’apparition des oiseaux ajustée par
  //     speedFactor.
  //
  // La fonction applySpeedFactorEnergy() est appelée lors du chargement et
  // lorsqu’un nouvel FPS est mesuré (événement capySpeedUpdated).  Elle
  // met à jour speedFactor en fonction du multiplicateur global défini dans
  // config.js.  Si window.getGameSpeed n’est pas défini ou retourne une
  // valeur invalide, on utilise 1 comme valeur par défaut.
  let speedFactor = 1;
  function applySpeedFactorEnergy() {
    try {
      if (window.getGameSpeed) {
        const s = window.getGameSpeed('energy');
        speedFactor = (typeof s === 'number' && s > 0) ? s : 1;
      } else {
        speedFactor = 1;
      }
    } catch (e) {
      speedFactor = 1;
    }
  }
  // Appliquer immédiatement le facteur et se mettre à l’écoute des
  // notifications de changement de vitesse
  applySpeedFactorEnergy();
  window.addEventListener('capySpeedUpdated', applySpeedFactorEnergy);

  // Timers pour l’apparition périodique des éléments et des bonus
  let obstacleTimer = 0;
  let bonusTimer = 0;
  let cloudTimer = 0;

  /**
   * Recalcule gameSpeed et spawnInterval en fonction du multiplicateur
   * global.  Cette fonction est appelée au démarrage et à chaque mise
   * à jour dynamique via l'événement capySpeedUpdated.
   */
  function applySpeed() {
    try {
      if (window.getGameSpeed) {
        const spd = window.getGameSpeed('energy');
        gameSpeed = origGameSpeed * spd;
        // Ajuster le plafond minimal pour conserver un espacement confortable malgré la
        // vitesse doublée.  On utilise 120 comme plancher au lieu de 80.
        spawnInterval = Math.max(120, Math.round(initialSpawnInterval / spd));
      }
    } catch (e) {
      // en cas d'erreur, conserver les valeurs actuelles
    }
  }
  // Appliquer la vitesse initiale
  applySpeed();
  // Recalculer la vitesse lors de la réception de capySpeedUpdated
  window.addEventListener('capySpeedUpdated', applySpeed);
  let frameCount = 0;
  let score = 0;

  // Hauteur du sol
  let groundHeight = 80;

  // Fond du marais (utilise le même décor que pour le Runner).  On prépare
  // également des couches de parallaxe pour un effet de profondeur.  Chaque
  // couche défile à une vitesse différente.
  // Image de fond pour le mode Ragon électrique : décor urbain
  const swampImg = new Image();
  swampImg.src = 'assets/city_background.png';
  let swampLoaded = false;
  // Couches de parallaxe : initialisées après le chargement de l'image
  let parallaxLayers = [];
  swampImg.onload = () => {
    swampLoaded = true;
    // Préparer plusieurs couches de parallaxe.  Chaque couche se déplace
    // à une vitesse différente pour donner une impression de profondeur.
    // L'offset est remis à zéro lorsque l'image sort de l'écran.  On
    // dessine deux images côte à côte pour assurer la continuité.
    parallaxLayers = [
      { offset: 0, speed: 0.2 }, // couche lointaine, plus lente
      { offset: 0, speed: 0.5 }  // couche proche, plus rapide
    ];
  };

  // Gestion audio
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx;
  try {
    audioCtx = new AudioContext();
  } catch (e) {
    audioCtx = null;
  }
  let isMuted = false;
  function playBeep(freq, duration = 0.1, volume = 0.1) {
    if (!audioCtx || isMuted) return;
    const ctx2 = audioCtx;
    const osc = ctx2.createOscillator();
    const gain = ctx2.createGain();
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx2.destination);
    const now = ctx2.currentTime;
    osc.start(now);
    osc.stop(now + duration);
  }
  // Ambient audio for Ragon électrique.  This placeholder audio will loop
  // softly in the background and can be replaced by the user with a real
  // soundtrack.  It uses the global volume from the main menu and is
  // muted entirely when isMuted is true.
  const ambient = new Audio('assets/sounds/ambient_energy.wav');
  ambient.loop = true;

  // Appliquer immédiatement le volume global à l'ambiance.
  applyVolume();

  /**
   * Return the global volume saved in localStorage or 0.5 by default.
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
   * Apply the global volume to the ambient audio, muting completely if
   * isMuted is true.
   */
  function applyVolume() {
    const vol = isMuted ? 0 : getGlobalVolume();
    ambient.volume = vol;
  }

  /**
   * Start the ambient background sound.  Resets to the beginning and
   * plays if not muted.
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
   * Pause the ambient audio.  Called when the game is over or muted.
   */
  function stopMusic() {
    try {
      ambient.pause();
    } catch (e) {
      /* ignore */
    }
  }
  // Volume toggle
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      volumeBtn.textContent = isMuted ? '🔇' : '🔊';
      if (isMuted) {
        stopMusic();
      } else {
        startMusic();
      }
      // Mettre à jour le volume appliqué à l'ambiance
      applyVolume();
    });
  }
  // Le bouton musique (music-toggle) est retiré de l'interface ; toute la
  // gestion du son passe par le bouton de volume ci‑dessus.

  // Messages amusants sur le fromage et blagues
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
    // Nouvelles anecdotes et blagues pour enrichir l'écran de fin
    "Un ragondin peut nager jusqu’à cinq kilomètres sans se fatiguer.",
    // La blague sur le gruyère qui s'enfuit a été retirée car elle ne
    // suscitait pas l'amusement.  Nous conservons uniquement des
    // anecdotes intéressantes ou des jeux de mots plus subtils.
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

  // Messages satiriques pour un faible score (<10).  Ces
  // moqueries amicales incitent le joueur à mieux gérer son énergie.
  const lowScoreMessages = [
    "On dirait que tu as pris une décharge… de flemme.",
    "Ton capybara a oublié de brancher la prise : très peu d'énergie ici !",
    "Même sans électricité, un capybara pourrait marquer autant de points."
  ];
  // Images amusantes : utiliser uniquement des animaux.  On réutilise les
  // visuels de capybara déjà générés pour rester cohérent.
  // Images amusantes pour l'écran de fin : uniquement des capybaras.  Les
  // visuels de licorne, de tortue, de pingouin et d’électricité sont
  // retirés afin d'utiliser exclusivement des capybaras.
  const funImages = [
    'assets/capybara_flying_new.png',
    'assets/capybara_running_new.png',
    'assets/capybara_bomber.png',
    'assets/capybara_super.png',
    'assets/capybara_memory.png',
    'assets/capybara_blackjack.png',
    'assets/capybara_gign_new.png'
  ];

  // Classe Bonus pour le mode Ragon électrique.  Ces bonus ressemblent à des
  // étoiles jaunes et rapportent des points supplémentaires lorsqu'ils
  // sont collectés par la voiture du capybara.  Leur logique est très
  // similaire à celle utilisée dans le jeu Runner.
  class Bonus {
    constructor() {
      this.radius = 16;
      this.x = width + this.radius;
      this.y = height * 0.45 + (Math.random() - 0.5) * height * 0.1;
      this.collected = false;
      // Chaque bonus est soit une carotte soit une patate afin de
      // remplacer les étoiles par des légumes amusants.  Les deux
      // donnent des points supplémentaires lorsqu'ils sont collectés.
      this.type = Math.random() < 0.5 ? 'carrot' : 'potato';
    }
    update() {
      this.x -= gameSpeed;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      // Dessiner une bulle transparente autour du bonus. La bulle est
      // légèrement plus claire pour attirer l'attention du joueur.
      ctx.fillStyle = 'rgba(255, 236, 105, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Dessiner la carotte ou la patate
      if (this.type === 'carrot') {
        ctx.fillStyle = '#f6a323';
        ctx.beginPath();
        // Carotte orientée vers le bas
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

  /**
   * Classe Lightning
   *
   * Représente un éclair temporaire dans le ciel.  Chaque éclair est
   * constitué d'une série de segments qui s'étendent du haut de l'écran
   * vers le bas avec une trajectoire en zigzag.  Ils s'estompent après
   * quelques frames pour ne pas saturer l'affichage.  Des éclairs sont
   * générés aléatoirement dans update().
   */
  class Lightning {
    constructor() {
      // Durée de vie en frames
      this.life = 10;
      this.segments = [];
      // Position initiale aléatoire en haut de l'écran
      let x = Math.random() * width;
      let y = 0;
      this.segments.push({ x, y });
      // Générer un chemin irrégulier vers le bas en quelques segments
      for (let i = 0; i < 8; i++) {
        const dx = (Math.random() - 0.5) * width * 0.1;
        const dy = height * (0.05 + Math.random() * 0.05);
        x += dx;
        y += dy;
        // Ne pas dépasser le sol
        if (y > height - groundHeight) {
          this.segments.push({ x, y: height - groundHeight });
          break;
        }
        this.segments.push({ x, y });
      }
    }
    update() {
      // Réduire la durée de vie en fonction de speedFactor afin que
      // l’éclair disparaisse après un temps constant quelle que soit
      // la fréquence.  À 60 FPS avec speedFactor≈2.35, cela correspond
      // toujours à ~10 frames (~4.3 s si la vitesse globale est élevée).
      this.life -= speedFactor;
    }
    draw() {
      if (this.segments.length < 2) return;
      ctx.save();
      ctx.strokeStyle = '#fff9c4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.segments[0].x, this.segments[0].y);
      for (let i = 1; i < this.segments.length; i++) {
        ctx.lineTo(this.segments[i].x, this.segments[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
    isDone() {
      return this.life <= 0;
    }
  }

  // Entités
  class CarCapy {
    constructor() {
      // Voiture légèrement plus courte et plus étroite pour laisser voir
      // davantage le décor et la voiture poursuivante.  La hauteur est
      // ajustée proportionnellement.
      // Agrandir légèrement la voiture pour une meilleure visibilité
      this.width = 110;
      this.height = 55;
      // Position initiale plus centrée pour laisser de la place à la voiture poursuivante
      this.x = width * 0.3;
      this.y = height - groundHeight - this.height / 2;
      this.velY = 0;
      this.rotation = 0;
      this.wheelRotation = 0;
      this.glideTimer = 0;
      this.jumpCount = 0;
    }
    reset() {
      // Réinitialiser la position en conservant un placement centré
      this.x = width * 0.3;
      this.y = height - groundHeight - this.height / 2;
      this.velY = 0;
      this.rotation = 0;
      this.wheelRotation = 0;
      this.glideTimer = 0;
      this.jumpCount = 0;
    }
    update() {
      // Glisse : réduire l'effet de gravité pendant un certain nombre de
      // « frames » mesurées en temps réel via speedFactor.  Le compteur
      // glideTimer est décrémenté de speedFactor à chaque update.  La
      // gravité appliquée pendant la glisse est 20 % de la gravité normale.
      if (this.glideTimer > 0) {
        this.velY += gravity * 0.2 * speedFactor;
        this.glideTimer -= speedFactor;
        if (this.glideTimer < 0) this.glideTimer = 0;
        // Limiter la vitesse de descente pour planer un peu
        if (this.velY > 2) this.velY = 2;
      } else {
        this.velY += gravity * speedFactor;
      }
      // Mettre à jour la position verticale en tenant compte du facteur de
      // vitesse global.  Ceci maintient une montée/descente cohérente en
      // temps réel plutôt qu'en nombre de frames.
      this.y += this.velY * speedFactor;
      const floorY = height - groundHeight - this.height / 2;
      if (this.y > floorY) {
        this.y = floorY;
        this.velY = 0;
        // Réinitialiser le compteur de sauts lorsqu'on touche le sol
        this.jumpCount = 0;
      }
      if (this.y - this.height / 2 < 0) {
        this.y = this.height / 2;
        this.velY = 0;
      }
      // Rotation liée à la vitesse verticale
      const maxRot = 0.3;
      const minRot = -0.3;
      this.rotation = Math.max(minRot, Math.min(maxRot, this.velY / 10));
      // Faire tourner les roues proportionnellement au temps réel
      this.wheelRotation += gameSpeed * 0.1 * speedFactor;
    }
    jump() {
      // Limiter à deux sauts consécutifs avant de toucher le sol
      if (this.jumpCount >= 2) return;
      this.jumpCount++;
      this.velY = jumpStrength;
      // Initialiser glideTimer proportionnellement à speedFactor afin de
      // conserver une durée de glisse constante (~0,2 s).  Comme
      // glideTimer est décrémenté de speedFactor à chaque update, on
      // multiplie la valeur de base (12 frames) par speedFactor pour que
      // l'animation dure le même temps réel quel que soit le nombre de
      // frames par seconde.
      this.glideTimer = 12 * speedFactor;
      playBeep(650, 0.05, 0.08);
    }
    getBounds() {
      const shrink = 0.8;
      return {
        left: this.x - (this.width * shrink) / 2,
        right: this.x + (this.width * shrink) / 2,
        top: this.y - (this.height * shrink) / 2,
        bottom: this.y + (this.height * shrink) / 2,
      };
    }

    /**
     * Retourne une hitbox réduite pour la voiture.  Par soucis de
     * permissivité, on réduit légèrement la zone de collision par rapport
     * aux dimensions réelles du véhicule.  Cette méthode est utilisée
     * pour les détections de bonus.  Sans cette implémentation le code
     * faisait appel à une méthode inexistante, entraînant une
     * exception qui provoquait la fin prématurée du jeu.
     */
    getHitbox() {
      // Réduire davantage la zone de collision (30 % de marge) pour être plus permissif.
      const shrink = 0.7;
      const marginX = this.width * (1 - shrink) / 2;
      const marginY = this.height * (1 - shrink) / 2;
      return {
        left: this.x - this.width / 2 + marginX,
        right: this.x + this.width / 2 - marginX,
        top: this.y - this.height / 2 + marginY,
        bottom: this.y + this.height / 2 - marginY,
      };
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      // Corps de la voiture
      const bodyW = this.width * 0.8;
      const bodyH = this.height * 0.6;
      const bodyX = -bodyW / 2;
      const bodyY = -bodyH / 2;
      ctx.fillStyle = '#1e88e5';
      ctx.strokeStyle = '#1565c0';
      ctx.lineWidth = 2;
      const radius = 8;
      ctx.beginPath();
      ctx.moveTo(bodyX + radius, bodyY);
      ctx.lineTo(bodyX + bodyW - radius, bodyY);
      ctx.quadraticCurveTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + radius);
      ctx.lineTo(bodyX + bodyW, bodyY + bodyH - radius);
      ctx.quadraticCurveTo(bodyX + bodyW, bodyY + bodyH, bodyX + bodyW - radius, bodyY + bodyH);
      ctx.lineTo(bodyX + radius, bodyY + bodyH);
      ctx.quadraticCurveTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - radius);
      ctx.lineTo(bodyX, bodyY + radius);
      ctx.quadraticCurveTo(bodyX, bodyY, bodyX + radius, bodyY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Logo « E » stylisé (on évite toute mention explicite)
      ctx.fillStyle = '#ffffff';
      const logoR = bodyH * 0.25;
      ctx.beginPath();
      ctx.arc(bodyX + bodyW * 0.8, bodyY + bodyH * 0.5, logoR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#76c043';
      ctx.font = `${logoR * 1.3}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', bodyX + bodyW * 0.8, bodyY + bodyH * 0.5 + 1);
      // Roues
      const wheelR = this.width * 0.12;
      const wheelY = this.height * 0.32;
      const wheelOffset = this.width * 0.3;
      const drawWheel = (offsetX) => {
        ctx.save();
        ctx.translate(offsetX, wheelY);
        ctx.rotate(this.wheelRotation);
        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
        ctx.fill();
        // Jantes
        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-wheelR, 0);
        ctx.lineTo(wheelR, 0);
        ctx.moveTo(0, -wheelR);
        ctx.lineTo(0, wheelR);
        ctx.stroke();
        ctx.restore();
      };
      drawWheel(-wheelOffset);
      drawWheel(wheelOffset);

      // Ajouter une petite tête de capybara sortant du toit de la voiture.  La
      // tête est dessinée comme un ovale brun clair avec une oreille et un
      // œil pour rappeler le capy du mode Runner.  Cela apporte un aspect
      // attachant tout en restant stylisé.
      ctx.save();
      // Position de la tête : légèrement en avant et au-dessus de la voiture
      const headX = bodyX + bodyW * 0.15;
      const headY = bodyY - bodyH * 0.25;
      ctx.translate(headX, headY);
      // Tête
      ctx.fillStyle = '#b99563';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width * 0.15, this.height * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // Oreille repositionnée et agrandie pour mieux évoquer une oreille
      ctx.fillStyle = '#8b6c47';
      ctx.beginPath();
      ctx.ellipse(-this.width * 0.12, -this.height * 0.2, this.width * 0.07, this.height * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Yeux
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-this.width * 0.03, -this.height * 0.05, this.width * 0.03, this.height * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(-this.width * 0.02, -this.height * 0.05, this.width * 0.015, this.height * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      // Nez
      ctx.fillStyle = '#4d3928';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.02, 0, this.width * 0.03, this.height * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }
  }

  /**
   * Deuxième voiture conduite par le chat noir pour rappeler le mode Runner.
   * Elle est blanche avec un cercle bleu et un « G » et une tête de chat qui
   * dépasse.  Elle suit la voiture du capybara avec la même logique que
   * l'ogre précédent.
   */
  class CarCat {
    constructor() {
      // Voiture du chat un peu plus courte pour correspondre à la voiture du
      // capybara.  La hauteur est ajustée proportionnellement.
      this.width = 90;
      this.height = 45;
      // Position initiale derrière la voiture du capybara
      // Position initiale du chat : un peu plus en retrait pour éviter que
      // les deux voitures ne se chevauchent, même sur les petits écrans.
      // Position initiale derrière la voiture du capybara.  On place
      // cette voiture à environ 10 % de la largeur pour qu'elle soit bien
      // visible même sur les écrans larges, et on ajuste ensuite sa distance
      // par rapport à la voiture du joueur dans update().
      this.x = width * 0.1;
      this.y = height - groundHeight - this.height / 2;
      this.velY = 0;
      this.rotation = 0;
      this.wheelRotation = 0;
    }
    reset() {
      // Lors du reset, replacer la voiture poursuivante à 10 % de la largeur.
      this.x = width * 0.1;
      this.y = height - groundHeight - this.height / 2;
      this.velY = 0;
      this.rotation = 0;
      this.wheelRotation = 0;
    }
    update() {
      // Avancer vers la voiture du capy sans jamais la rattraper complètement.
      // La vitesse d'approche augmente légèrement avec le score pour
      // donner une impression de poursuite qui s'intensifie.
      const baseDistance = 200;
      const targetX = car.x - baseDistance;
      // Calculer une vitesse d'approche qui augmente légèrement avec le score.
      // Multiplier par speedFactor afin que la distance parcourue par
      // seconde reste constante indépendamment du nombre de frames.
      const approachSpeed = Math.min(0.4 + score / 200, 0.9);
      if (this.x < targetX) {
        this.x += approachSpeed * speedFactor;
      }
      // Sauter automatiquement lorsque des obstacles approchent
      for (const obs of obstacles) {
        const randomRange = 150 + Math.random() * 60;
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
      // Appliquer la gravité et mettre à jour la position verticale en
      // tenant compte du facteur de vitesse.  Cela garantit une chute
      // uniforme quel que soit le rafraîchissement.
      this.velY += gravity * speedFactor;
      this.y += this.velY * speedFactor;
      const floorY = height - groundHeight - this.height / 2;
      if (this.y > floorY) {
        this.y = floorY;
        this.velY = 0;
      }
      if (this.y - this.height / 2 < 0) {
        this.y = this.height / 2;
        this.velY = 0;
      }
      // Rotation subtile en fonction de la vitesse verticale
      const maxRot = 0.3;
      const minRot = -0.3;
      this.rotation = Math.max(minRot, Math.min(maxRot, this.velY / 10));
      // Faire tourner les roues proportionnellement au temps réel
      this.wheelRotation += gameSpeed * 0.1 * speedFactor;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      // Corps blanc
      const bodyW = this.width * 0.8;
      const bodyH = this.height * 0.6;
      const bodyX = -bodyW / 2;
      const bodyY = -bodyH / 2;
      ctx.fillStyle = '#f5f5f5';
      ctx.strokeStyle = '#e0e0e0';
      const radius = 8;
      ctx.beginPath();
      ctx.moveTo(bodyX + radius, bodyY);
      ctx.lineTo(bodyX + bodyW - radius, bodyY);
      ctx.quadraticCurveTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + radius);
      ctx.lineTo(bodyX + bodyW, bodyY + bodyH - radius);
      ctx.quadraticCurveTo(bodyX + bodyW, bodyY + bodyH, bodyX + bodyW - radius, bodyY + bodyH);
      ctx.lineTo(bodyX + radius, bodyY + bodyH);
      ctx.quadraticCurveTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - radius);
      ctx.lineTo(bodyX, bodyY + radius);
      ctx.quadraticCurveTo(bodyX, bodyY, bodyX + radius, bodyY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Logo « G » bleu
      ctx.fillStyle = '#1976d2';
      const logoR = bodyH * 0.25;
      ctx.beginPath();
      ctx.arc(bodyX + bodyW * 0.8, bodyY + bodyH * 0.5, logoR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e3f2fd';
      ctx.font = `${logoR * 1.3}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('G', bodyX + bodyW * 0.8, bodyY + bodyH * 0.5 + 1);
      // Petite tête de chat sortant du cockpit
      ctx.save();
      const headX = bodyX + bodyW * 0.15;
      const headY = bodyY - bodyH * 0.25;
      ctx.translate(headX, headY);
      // Tête
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width * 0.15, this.height * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // Oreilles repositionnées et agrandies pour renforcer l'aspect félin
      ctx.beginPath();
      ctx.ellipse(-this.width * 0.1, -this.height * 0.2, this.width * 0.07, this.height * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.width * 0.1, -this.height * 0.2, this.width * 0.07, this.height * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Yeux
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.ellipse(-this.width * 0.03, -this.height * 0.05, this.width * 0.03, this.height * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.width * 0.03, -this.height * 0.05, this.width * 0.03, this.height * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Roues
      const wheelR = this.width * 0.12;
      const wheelY = this.height * 0.32;
      const wheelOffset = this.width * 0.3;
      const drawWheel = (offsetX) => {
        ctx.save();
        ctx.translate(offsetX, wheelY);
        ctx.rotate(this.wheelRotation);
        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-wheelR, 0);
        ctx.lineTo(wheelR, 0);
        ctx.moveTo(0, -wheelR);
        ctx.lineTo(0, wheelR);
        ctx.stroke();
        ctx.restore();
      };
      drawWheel(-wheelOffset);
      drawWheel(wheelOffset);
      ctx.restore();
    }
  }

  class RunnerObstacle {
    constructor() {
      // Choisir aléatoirement un type d'obstacle urbain.  Outre les
      // lampadaires, cônes, panneaux et transformateurs, on ajoute des
      // bancs et des bornes incendie (hydrants) pour plus de variété.
      const types = ['lamp', 'cone', 'sign', 'transformer', 'bench', 'hydrant', 'trashcan', 'trafficLight'];
      this.type = types[Math.floor(Math.random() * types.length)];
      switch (this.type) {
        case 'lamp':
          this.width = 40;
          this.height = 150;
          break;
        case 'cone':
          this.width = 60;
          this.height = 80;
          break;
        case 'sign':
          this.width = 50;
          this.height = 120;
          break;
        case 'transformer':
          this.width = 100;
          this.height = 110;
          break;
        case 'bench':
          this.width = 70;
          this.height = 50;
          break;
        case 'hydrant':
          this.width = 40;
          this.height = 60;
          break;
        case 'trashcan':
          this.width = 50;
          this.height = 70;
          break;
        case 'trafficLight':
          this.width = 50;
          this.height = 140;
          break;
        default:
          this.width = 60;
          this.height = 80;
      }
      this.x = width + this.width;
      this.scored = false;
    }
    update() {
      this.x -= gameSpeed;
    }
    draw() {
      const baseY = height - groundHeight;
      ctx.save();
      ctx.translate(this.x, baseY);
      switch (this.type) {
        case 'lamp': {
          // Lampadaire : pied gris et tête ronde
          ctx.fillStyle = '#757575';
          const poleW = this.width * 0.2;
          const poleH = this.height * 0.8;
          ctx.fillRect((this.width - poleW) / 2, -poleH, poleW, poleH);
          // Contour du pied
          ctx.strokeStyle = '#545454';
          ctx.lineWidth = 2;
          ctx.strokeRect((this.width - poleW) / 2, -poleH, poleW, poleH);
          // Tête du lampadaire
          ctx.fillStyle = '#b0bec5';
          ctx.beginPath();
          ctx.ellipse(this.width / 2, -poleH, this.width * 0.4, this.height * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#90a4ae';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(this.width / 2, -poleH, this.width * 0.4, this.height * 0.2, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'cone': {
          // Plot de chantier orange avec bandes blanches
          ctx.fillStyle = '#ff9800';
          ctx.beginPath();
          ctx.moveTo(this.width / 2, -this.height);
          ctx.lineTo(this.width, 0);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();
          // Bandes blanches
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(this.width * 0.25, -this.height * 0.6, this.width * 0.5, this.height * 0.08);
          ctx.fillRect(this.width * 0.2, -this.height * 0.3, this.width * 0.6, this.height * 0.08);
          // Contour du cône
          ctx.strokeStyle = '#e65100';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(this.width / 2, -this.height);
          ctx.lineTo(this.width, 0);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case 'sign': {
          // Panneau de signalisation avec un petit logo discret d'opérateur
          // Pied du panneau
          ctx.fillStyle = '#757575';
          const poleW = this.width * 0.2;
          const poleH = this.height * 0.6;
          ctx.fillRect((this.width - poleW) / 2, -poleH, poleW, poleH);
          ctx.strokeStyle = '#545454';
          ctx.lineWidth = 2;
          ctx.strokeRect((this.width - poleW) / 2, -poleH, poleW, poleH);
          // Plaque du panneau
          const boardW = this.width * 1.0;
          const boardH = this.height * 0.35;
          ctx.fillStyle = '#fafafa';
          ctx.fillRect((this.width - boardW) / 2, -poleH - boardH, boardW, boardH);
          ctx.strokeStyle = '#b0bec5';
          ctx.lineWidth = 2;
          ctx.strokeRect((this.width - boardW) / 2, -poleH - boardH, boardW, boardH);
          // Afficher soit un éclair soit le texte « EDF » en rare easter egg.
          // La probabilité d'afficher « EDF » est faible (~3 %).  Sinon,
          // dessiner un éclair stylisé au centre de la plaque.
          if (Math.random() < 0.03) {
            ctx.fillStyle = '#90a4ae';
            ctx.font = `${boardH * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('EDF', this.width / 2, -poleH - boardH / 2);
          } else {
            ctx.fillStyle = '#fbc02d';
            ctx.beginPath();
            const xC = this.width / 2;
            const yTop = -poleH - boardH + boardH * 0.2;
            const yMid = -poleH - boardH + boardH * 0.5;
            const yBot = -poleH - boardH + boardH * 0.8;
            const xLeft = xC - boardW * 0.15;
            const xRight = xC;
            ctx.moveTo(xC, yTop);
            ctx.lineTo(xLeft, yMid);
            ctx.lineTo(xRight, yMid);
            ctx.lineTo(xLeft, yBot);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#f57f17';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xC, yTop);
            ctx.lineTo(xLeft, yMid);
            ctx.lineTo(xRight, yMid);
            ctx.lineTo(xLeft, yBot);
            ctx.stroke();
          }
          break;
        }
        case 'transformer': {
          // Transformateur électrique stylisé : grande caisse avec bobines
          const bodyH = this.height * 0.8;
          // Corps principal
          ctx.fillStyle = '#607d8b';
          ctx.fillRect(0, -bodyH, this.width, bodyH);
          ctx.strokeStyle = '#455a64';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, -bodyH, this.width, bodyH);
          // Bobines
          ctx.fillStyle = '#455a64';
          for (let i = 1; i <= 3; i++) {
            const cx = (i * this.width) / 4;
            ctx.fillRect(cx - this.width * 0.05, -bodyH + bodyH * 0.1, this.width * 0.1, bodyH * 0.6);
          }
          // Couvercle
          ctx.fillStyle = '#546e7a';
          ctx.fillRect(0, -bodyH - this.height * 0.05, this.width, this.height * 0.05);
          ctx.strokeStyle = '#37474f';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, -bodyH - this.height * 0.05, this.width, this.height * 0.05);
          // Logo discret
          ctx.fillStyle = '#ffeb3b';
          ctx.font = `${this.height * 0.15}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', this.width / 2, -bodyH * 0.5);
          break;
        }
        case 'bench': {
          // Banc : planche en bois avec deux pieds métalliques
          // Pieds
          ctx.fillStyle = '#546e7a';
          const legW = this.width * 0.08;
          const legH = this.height * 0.6;
          ctx.fillRect(this.width * 0.2, -legH, legW, legH);
          ctx.fillRect(this.width * 0.72, -legH, legW, legH);
          // Assise
          ctx.fillStyle = '#8d6e63';
          const seatH = this.height * 0.3;
          ctx.fillRect(0, -legH - seatH, this.width, seatH);
          // Contours
          ctx.strokeStyle = '#5d4037';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, -legH - seatH, this.width, seatH);
          ctx.strokeStyle = '#37474f';
          ctx.strokeRect(this.width * 0.2, -legH, legW, legH);
          ctx.strokeRect(this.width * 0.72, -legH, legW, legH);
          break;
        }
        case 'hydrant': {
          // Borne incendie rouge
          const bodyH = this.height * 0.7;
          const bodyW = this.width * 0.5;
          const bodyX = (this.width - bodyW) / 2;
          // Corps principal
          ctx.fillStyle = '#e53935';
          ctx.fillRect(bodyX, -bodyH, bodyW, bodyH);
          ctx.strokeStyle = '#b71c1c';
          ctx.lineWidth = 2;
          ctx.strokeRect(bodyX, -bodyH, bodyW, bodyH);
          // Chapeau
          ctx.beginPath();
          ctx.fillStyle = '#c62828';
          ctx.ellipse(this.width / 2, -bodyH, bodyW * 0.7, this.height * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#b71c1c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(this.width / 2, -bodyH, bodyW * 0.7, this.height * 0.15, 0, 0, Math.PI * 2);
          ctx.stroke();
          // Nozzles
          ctx.fillStyle = '#e53935';
          const nozzleR = this.width * 0.08;
          ctx.beginPath();
          ctx.arc(bodyX - nozzleR, -bodyH + bodyH * 0.5, nozzleR, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(bodyX + bodyW + nozzleR, -bodyH + bodyH * 0.5, nozzleR, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'trashcan': {
          // Poubelle gris métallique avec couvercle
          const bodyH = this.height * 0.8;
          const bodyW = this.width * 0.6;
          const bodyX = (this.width - bodyW) / 2;
          // Corps
          ctx.fillStyle = '#9e9e9e';
          ctx.fillRect(bodyX, -bodyH, bodyW, bodyH);
          ctx.strokeStyle = '#616161';
          ctx.lineWidth = 2;
          ctx.strokeRect(bodyX, -bodyH, bodyW, bodyH);
          // Couvercle
          ctx.fillStyle = '#757575';
          ctx.beginPath();
          ctx.ellipse(this.width / 2, -bodyH, bodyW * 0.7, this.height * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#616161';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(this.width / 2, -bodyH, bodyW * 0.7, this.height * 0.12, 0, 0, Math.PI * 2);
          ctx.stroke();
          // Anses
          ctx.fillStyle = '#616161';
          const handleW = bodyW * 0.1;
          const handleH = bodyH * 0.2;
          ctx.fillRect(bodyX - handleW, -bodyH + bodyH * 0.4, handleW, handleH);
          ctx.fillRect(bodyX + bodyW, -bodyH + bodyH * 0.4, handleW, handleH);
          break;
        }
        case 'trafficLight': {
          // Feu de signalisation : poteau et boîtier avec trois lumières
          // Poteau
          ctx.fillStyle = '#757575';
          const poleW = this.width * 0.15;
          const poleH = this.height * 0.8;
          ctx.fillRect((this.width - poleW) / 2, -poleH, poleW, poleH);
          ctx.strokeStyle = '#545454';
          ctx.lineWidth = 2;
          ctx.strokeRect((this.width - poleW) / 2, -poleH, poleW, poleH);
          // Boîtier
          const boxW = this.width * 0.6;
          const boxH = this.height * 0.4;
          const boxX = (this.width - boxW) / 2;
          const boxY = -poleH - boxH;
          ctx.fillStyle = '#424242';
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.strokeStyle = '#212121';
          ctx.lineWidth = 2;
          ctx.strokeRect(boxX, boxY, boxW, boxH);
          // Feux rouge, jaune et vert
          const lightR = boxH / 6;
          const cx = this.width / 2;
          const cyStart = boxY + lightR * 1.2;
          const gap = lightR * 2.0;
          const colors = ['#e53935', '#fdd835', '#43a047'];
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.arc(cx, cyStart + i * gap, lightR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1b5e20';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cyStart + i * gap, lightR, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }
        default:
          break;
      }
      ctx.restore();
    }
    isOffScreen() {
      return this.x + this.width < 0;
    }

  /**
   * Calcule une hitbox réduite pour rendre la collision plus permissive.  La
   * méthode renvoie un rectangle légèrement réduit sur les côtés et les
   * extrémités pour permettre au joueur de frôler un obstacle sans perdre
   * systématiquement.  Les coordonnées sont en pixels relatifs au canvas.
   */
  getHitbox() {
    // Les marges varient en fonction du type d'obstacle.  Pour les
    // panneaux, seule la partie basse (pied + base) est réellement
    // dangereuse ; on évite ainsi de punir le joueur lorsqu'il touche
    // simplement la plaque supérieure.  Pour les transformateurs,
    // l'ensemble de la caisse est considérée avec une marge réduite.
      if (this.type === 'sign') {
        const marginX = this.width * 0.1;
        const collHeight = this.height * 0.4;
        return {
          left: this.x + marginX,
          right: this.x + this.width - marginX,
          top: height - groundHeight - collHeight,
          bottom: height - groundHeight,
        };
      }
      if (this.type === 'transformer') {
        const marginX = this.width * 0.15;
        const marginY = this.height * 0.3;
        return {
          left: this.x + marginX,
          right: this.x + this.width - marginX,
          top: height - groundHeight - this.height + marginY,
          bottom: height - groundHeight - marginY,
        };
      }
      if (this.type === 'bench') {
        const marginX = this.width * 0.1;
        const marginY = this.height * 0.3;
        return {
          left: this.x + marginX,
          right: this.x + this.width - marginX,
          top: height - groundHeight - this.height + marginY,
          bottom: height - groundHeight,
        };
      }
      if (this.type === 'hydrant') {
        const marginX = this.width * 0.1;
        const marginY = this.height * 0.2;
        return {
          left: this.x + marginX,
          right: this.x + this.width - marginX,
          top: height - groundHeight - this.height + marginY,
          bottom: height - groundHeight,
        };
      }
      if (this.type === 'trashcan') {
        const marginX = this.width * 0.1;
        const marginY = this.height * 0.2;
        return {
          left: this.x + marginX,
          right: this.x + this.width - marginX,
          top: height - groundHeight - this.height + marginY,
          bottom: height - groundHeight,
        };
      }
      if (this.type === 'trafficLight') {
        // Considérer uniquement la partie inférieure du poteau et du boîtier comme zone de collision
        const marginX = this.width * 0.2;
        return {
          left: this.x + marginX,
          right: this.x + this.width - marginX,
          top: height - groundHeight - this.height * 0.8,
          bottom: height - groundHeight,
        };
      }
      // Obstacle standard
      const marginX = this.width * 0.2;
      const marginY = this.height * 0.4;
      return {
        left: this.x + marginX,
        right: this.x + this.width - marginX,
        top: height - groundHeight - this.height + marginY,
        bottom: height - groundHeight - marginY,
      };
    }
  }

  // Gestion des obstacles, des bonus et des véhicules
  let obstacles = [];
  let bonuses = [];
  let car = new CarCapy();
  // Voiture du chat poursuivant le capybara
  let carCat = new CarCat();

  // Collection des éclairs.  Elle est vidée à chaque nouvelle partie.
  let lightningBolts = [];

// Décors animés : nuages et oiseaux.  Ces tableaux contiennent les
// instances actuelles de nuages et d'oiseaux volant dans le ciel de la
// ville.  Ils sont réinitialisés à chaque partie.
let clouds = [];
let birds = [];

// Classe Cloud pour dessiner des nuages en mouvement dans le ciel.  Les
// nuages se déplacent lentement vers la gauche et réapparaissent à
// droite lorsqu'ils sortent de l'écran.
class Cloud {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * width;
    this.y = Math.random() * (height - groundHeight) * 0.3 + 10;
    this.speed = gameSpeed * 0.2 + Math.random() * 0.4;
    this.scale = 0.4 + Math.random() * 0.4;
  }
  update() {
    this.x -= this.speed;
    if (this.x < -150 * this.scale) {
      this.x = width + 150 * this.scale;
      this.y = Math.random() * (height - groundHeight) * 0.3 + 10;
      this.speed = gameSpeed * 0.2 + Math.random() * 0.4;
      this.scale = 0.4 + Math.random() * 0.4;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const r = 30;
    ctx.beginPath();
    ctx.arc(-r * 0.6, 0, r, 0, Math.PI * 2);
    ctx.arc(0, -r * 0.4, r * 1.2, 0, Math.PI * 2);
    ctx.arc(r * 0.8, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Classe Bird pour dessiner un petit oiseau stylisé en forme de V.  Les
// oiseaux apparaissent de temps en temps et volent plus vite que les
// nuages.
class Bird {
  constructor() {
    this.x = width + 40;
    this.y = Math.random() * (height - groundHeight) * 0.3 + 20;
    this.speed = gameSpeed * 0.4 + Math.random() * 1.2;
  }
  update() {
    this.x -= this.speed;
  }
  draw() {
    ctx.save();
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 2;
    ctx.beginPath();
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

  // Intervalle d'apparition des bonus (en frames) dans ce mode.  Les bonus
  // n'apparaissent pas trop fréquemment pour ne pas saturer l'écran.
  const bonusSpawnInterval = 400;

  function resetGame() {
    car = new CarCapy();
    carCat = new CarCat();
    obstacles = [];
    bonuses = [];
    lightningBolts = [];
    // Réinitialiser les nuages et les oiseaux afin de ne pas accumuler les
    // éléments d'une partie à l'autre
    clouds = [];
    birds = [];
    frameCount = 0;
    score = 0;
    // Réinitialiser la vitesse de base en utilisant origGameSpeed (5.0).
    gameSpeed = origGameSpeed;
    // Fixer un intervalle initial d’apparition des obstacles suffisamment long
    // pour que les éléments ne se succèdent pas trop vite malgré la vitesse accrue.
    spawnInterval = 200;
  }

  function endGame() {
    state = STATE_GAMEOVER;
    // Mettre à jour le score et le record.  Afficher uniquement la valeur
    // numérique sans préfixe.
    currentScoreEl.textContent = `${score}`;
    if (score > energyHighScore) {
      energyHighScore = score;
      try {
        localStorage.setItem('capyElectricHighScore', energyHighScore.toString());
      } catch (e) {
        /* ignore */
      }
    }
    highScoreEl.textContent = `${energyHighScore}`;
    // Choisir un message et une image aléatoires pour l'écran de fin.
    let msg;
    if (score < 10) {
      msg = lowScoreMessages[Math.floor(Math.random() * lowScoreMessages.length)];
    } else {
      msg = cheeseMessages[Math.floor(Math.random() * cheeseMessages.length)];
    }
    const imgSrc = funImages[Math.floor(Math.random() * funImages.length)];
    // Insérer l'image et le texte sans styles inline : l'image sera stylisée via CSS
    funMessageEl.innerHTML = `<img src="${imgSrc}"> <span>${msg}</span>`;
    gameOverOverlay.classList.remove('hidden');
    stopMusic();
  }

  function startGame() {
    resetGame();
    state = STATE_PLAYING;
    gameOverOverlay.classList.add('hidden');
    startMusic();
  }

  // Démarrer automatiquement lorsque l’overlay se ferme
  window.addEventListener('capyGameStart', () => {
    if (state === STATE_MENU) {
      startGame();
    }
  });

  // Mise à jour et dessin
  function update() {
    // Incrémenter le compteur de frames (resté pour d'autres logiques) et mettre
    // à jour les entités principales.
    frameCount++;
    car.update();
    carCat.update();

    // Mettre à jour les éclairs existants.  La durée de vie est décrémentée
    // dans Lightning.update() en fonction de speedFactor.  Supprimer les
    // éclairs terminés, puis générer éventuellement un nouvel éclair.  La
    // probabilité d'apparition par frame est multipliée par speedFactor
    // afin de conserver une fréquence constante (~2 % par frame à 60 Hz).
    lightningBolts.forEach((bolt) => bolt.update());
    lightningBolts = lightningBolts.filter((bolt) => !bolt.isDone());
    if (Math.random() < 0.02 * speedFactor) {
      lightningBolts.push(new Lightning());
    }

    // Mise à jour et apparition périodique des nuages et des oiseaux.  Plutôt
    // que de se baser sur frameCount, on utilise un minuteur cloudTimer
    // incrémenté de speedFactor à chaque frame.  Lorsqu'il dépasse 300,
    // un nouveau nuage est ajouté et le minuteur est réduit.  Les oiseaux
    // apparaissent de façon probabiliste, avec une probabilité par frame
    // multipliée par speedFactor.
    if (state === STATE_PLAYING) {
      cloudTimer += speedFactor;
      if (cloudTimer >= 300) {
        cloudTimer -= 300;
        clouds.push(new Cloud());
      }
      clouds.forEach((c) => c.update());
      // Apparition d'oiseaux avec probabilité ajustée
      if (Math.random() < 0.02 * speedFactor) {
        birds.push(new Bird());
      }
      birds.forEach((b) => b.update());
      for (let i = birds.length - 1; i >= 0; i--) {
        if (birds[i].isOffScreen()) {
          birds.splice(i, 1);
        }
      }
    }

    // Mettre à jour la position des couches de parallaxe.  Chaque couche se
    // déplace proportionnellement à gameSpeed.  Ce comportement reste
    // inchangé car gameSpeed est déjà ajusté pour compenser la fréquence.
    if (parallaxLayers.length > 0) {
      parallaxLayers.forEach((layer) => {
        layer.offset -= gameSpeed * layer.speed;
        if (layer.offset <= -width) {
          layer.offset += width;
        }
      });
    }
    // Génération d'obstacles.  Utiliser obstacleTimer incrémenté par
    // speedFactor pour déclencher la création d'un obstacle lorsque la
    // minuterie dépasse spawnInterval.  Ceci maintient un intervalle
    // cohérent en temps réel quelle que soit la fréquence.
    obstacleTimer += speedFactor;
    if (obstacleTimer >= spawnInterval) {
      obstacleTimer -= spawnInterval;
      obstacles.push(new RunnerObstacle());
    }

    // Génération de bonus.  De la même manière que pour les obstacles, on
    // utilise bonusTimer et bonusSpawnInterval pour générer les bonus.
    bonusTimer += speedFactor;
    if (bonusTimer >= bonusSpawnInterval) {
      bonusTimer -= bonusSpawnInterval;
      bonuses.push(new Bonus());
    }
    // Mise à jour des obstacles et détection des collisions
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.update();
      // Score lorsqu'on dépasse un obstacle
      if (!obs.scored && obs.x + obs.width < car.x) {
        obs.scored = true;
        score++;
        if (score % 5 === 0) {
          // Accélération progressive : avant 50 points, on augmente modérément la vitesse ;
          // au-delà de 50 points, l'augmentation est plus marquée pour accroître la difficulté.
          if (score < 50) {
            // Augmenter la vitesse un peu plus fort pour accélérer la partie
            gameSpeed += 0.25;
          } else {
            gameSpeed += 0.4;
          }
        }
        // Diminuer l'intervalle entre les obstacles : au‑delà de 50 points, la réduction s'accélère.
        // Ajuster l’intervalle entre les obstacles en fonction du score.  Les
        // valeurs de base et les planchers sont augmentés afin de
        // maintenir un espacement confortable malgré la vitesse doublée.
        if (score < 50) {
          // Augmenter l'intervalle de base et son plancher pour rester jouable à vitesse doublée.
          spawnInterval = Math.max(140, Math.floor(300 - score * 0.3));
        } else {
          spawnInterval = Math.max(120, Math.floor(300 - 50 * 0.3 - (score - 50) * 0.6));
        }
      }
      // Collision : utiliser une hitbox réduite afin d'être plus permissif.
      const cb = car.getBounds();
      const hb = obs.getHitbox();
      if (
        cb.right > hb.left &&
        cb.left < hb.right &&
        cb.bottom > hb.top &&
        cb.top < hb.bottom
      ) {
        endGame();
        return;
      }
      if (obs.isOffScreen()) {
        obstacles.splice(i, 1);
      }
    }

    // Mise à jour des bonus et détection des collisions avec la voiture du capybara
    for (let i = bonuses.length - 1; i >= 0; i--) {
      const b = bonuses[i];
      b.update();
      // Collision avec la voiture du joueur
      const bb = b.getBounds();
      const hbCar = car.getHitbox();
      if (
        hbCar.right > bb.left &&
        hbCar.left < bb.right &&
        hbCar.bottom > bb.top &&
        hbCar.top < bb.bottom
      ) {
        score += 5;
        // Jouer un son lors de la collecte du bonus pour renforcer le feedback
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
    // Ciel en dégradé
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#bbdefb');
    skyGrad.addColorStop(1, '#e3f2fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);
    const areaH = height - groundHeight;
    // Défilement du décor en parallaxe : dessiner chaque couche avec son
    // offset.  Si l'image est chargée mais aucune couche n'est définie,
    // afficher l'image une seule fois.
    // Dessiner les nuages et les oiseaux avant le décor en parallaxe
    clouds.forEach((c) => c.draw());
    birds.forEach((b) => b.draw());
    if (swampLoaded && parallaxLayers.length > 0) {
      parallaxLayers.forEach((layer) => {
        ctx.drawImage(swampImg, layer.offset, 0, width, areaH);
        ctx.drawImage(swampImg, layer.offset + width, 0, width, areaH);
      });
    } else if (swampLoaded) {
      ctx.drawImage(swampImg, 0, 0, width, areaH);
    }
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, height - groundHeight, width, groundHeight);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    // Dessiner les éclairs devant l'arrière‑plan mais derrière les obstacles et bonus.
    lightningBolts.forEach((bolt) => bolt.draw());
    obstacles.forEach((obs) => obs.draw());
    // Dessiner les bonus après les obstacles pour qu'ils apparaissent au-dessus
    bonuses.forEach((b) => b.draw());
    carCat.draw();
    car.draw();
    // Afficher le score au centre du haut, sans la mention "Score".  Un
    // panneau sombre semi‑transparente est dessiné pour améliorer la
    // lisibilité sur les arrière‑plans détaillés.  Le texte est doré et en
    // gras pour attirer l'œil.
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
    // Ne pas exécuter le jeu tant que l’overlay de pré‑lancement est actif
    if (window.CAPY_PRESTART_ACTIVE) {
      requestAnimationFrame(gameLoop);
      return;
    }
    try {
      if (state === STATE_PLAYING) {
        update();
        draw();
      }
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(gameLoop);
  }

  function resizeCanvas() {
    // Calculer des dimensions qui occupent 80 % de la hauteur et 95 % de la largeur
    const maxW = 900;
    let newW = Math.min(window.innerWidth * 0.95, maxW);
    let newH = newW * 0.8;
    if (newH > window.innerHeight * 0.8) {
      newH = window.innerHeight * 0.8;
      newW = newH / 0.8;
    }
    canvas.width = newW;
    canvas.height = newH;
    canvas.style.width = `${newW}px`;
    canvas.style.height = `${newH}px`;
    width = canvas.width;
    height = canvas.height;
    groundHeight = height * 0.15;
    // Réajuster positions
    if (car) {
      car.y = height - groundHeight - car.height / 2;
      // Centrer le joueur à 30 % de la largeur
      car.x = width * 0.3;
    }
    if (carCat) {
      carCat.y = height - groundHeight - carCat.height / 2;
      // Positionner la voiture poursuivante à 10 % de la largeur
      carCat.x = width * 0.1;
    }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Réafficher l'écran principal depuis le bouton Menu
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      stopMusic();
      window.location.href = '../Capy/games.html';
    });
  }
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      startGame();
    });
  }

  // Contrôles : clic/touch ou barre d'espace/flèche haut pour sauter
  function handleJump() {
    if (state === STATE_PLAYING) {
      car.jump();
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

  // Démarrer automatiquement le jeu dès que la page est chargée
  startGame();
  gameLoop();
})();