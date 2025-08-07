(() => {
  /**
   * Capy Catch – un jeu d'arcade dans lequel le joueur déplace un
   * capybara pour attraper des légumes tout en évitant des fourches
   * qui tombent du ciel.  Chaque légume rapporte des points et les
   * fourches font perdre une vie.  Lorsque toutes les vies sont
   * perdues, la partie se termine et le score est comparé au record.
   */
  const canvas = document.getElementById('catchCanvas');
  const ctx = canvas.getContext('2d');
  // Barre latérale et éléments d'interface
  const scoreEl = document.getElementById('catch-score');
  const livesEl = document.getElementById('catch-lives');
  const restartBtn = document.getElementById('catch-restart');
  const menuBtn = document.getElementById('catch-menu');
  const gameoverOverlay = document.getElementById('catch-gameover');
  const currentScoreEl = document.getElementById('catch-current-score');
  const highScoreEl = document.getElementById('catch-high-score');
  const funMsgEl = document.getElementById('catch-fun-message');
  const overReplayBtn = document.getElementById('catch-over-replay');
  const overMenuBtn = document.getElementById('catch-over-menu');
  const volumeBtn = document.getElementById('volume-toggle');

  // Fenêtre d'instructions et bouton de fermeture.  On affiche
  // l'overlay lors du premier lancement puis on enregistre un
  // indicateur dans localStorage pour ne plus l'afficher.
  const instructionsEl = document.getElementById('catch-instructions');
  const instructionsOkBtn = document.getElementById('catch-instructions-ok');

  function showInstructions() {
    instructionsEl.classList.remove('hidden');
  }
  function hideInstructions() {
    instructionsEl.classList.add('hidden');
    try {
      localStorage.setItem('capyCatchInstructionsShown', 'true');
    } catch (e) {}
  }
  if (instructionsOkBtn) {
    instructionsOkBtn.addEventListener('click', hideInstructions);
  }

  // Charger les images des légumes et du capybara
  const vegSources = ['veg_carrot_final.png', 'veg_tomato_final.png', 'veg_courgette_final.png'];
  const vegImgs = vegSources.map((src) => {
    const img = new Image();
    img.src = 'assets/' + src;
    return img;
  });

  // Messages satiriques pour les faibles scores (<10).  Ces phrases
  // moqueuses sont affichées lorsque le joueur termine la partie avec
  // un score très bas afin de l’encourager à améliorer sa performance.
  const lowScoreMessages = [
    "Ton panier est resté presque vide… Essaie de viser les carottes, pas les fourches !",
    "On dirait que tu as plus perdu de vies que gagné de légumes…",
    "Même un lapin affamé aurait récolté plus de légumes que ça."
  ];
  const capyImg = new Image();
  // Utiliser la version détourée du capybara pour supprimer le halo blanc
  // Cette image est fournie dans les nouveaux assets (capybara_running_clear.png).
  capyImg.src = 'assets/capybara_running_clear.png';

  // Objets audio : sons simples pour attraper et perdre une vie.
  const catchSound = new Audio('assets/sounds/match.wav');
  const hurtSound = new Audio('assets/sounds/invalid.wav');
  const ambient = new Audio('assets/sounds/ambient_courgette.wav');
  ambient.loop = true;

  // Appliquer le volume global en fonction du réglage général
  function applyVolume() {
    const vol = isMuted ? 0 : getGlobalVolume();
    [catchSound, hurtSound, ambient].forEach((aud) => {
      aud.volume = vol;
    });
  }
  // Récupérer le volume depuis localStorage
  function getGlobalVolume() {
    let v = 0.5;
    try {
      const stored = localStorage.getItem('capyGlobalVolume');
      if (stored !== null) v = parseFloat(stored);
    } catch (e) {}
    return isNaN(v) ? 0.5 : v;
  }
  let isMuted = false;
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      applyVolume();
      volumeBtn.textContent = isMuted ? '🔈' : '🔇';
    });
  }

  // Variables de jeu
  let player;
  let objects = [];
  let score;
  let lives;
  let gameOver = false;
  let lastFrameTime = 0;
  let spawnTimer = 0;
  // Intervalle de génération d'un nouvel objet en millisecondes.  La
  // vitesse effective sera ajustée avec le multiplicateur de vitesse
  // global.  1200ms convient comme base.
  // Intervalle de base (ms) pour la génération d'objets.  Réduit pour
  // rendre le jeu plus dynamique et s'accélérer avec le multiplicateur
  // global.  Une base plus faible génère des vagues rapides.
  let spawnIntervalBase = 800;
  let gameSpeed = 1;

  // Ajout d'un multiplicateur dynamique en fonction du taux de
  // rafraîchissement.  Cette fonction est appelée lors de
  // l'initialisation et à chaque événement capySpeedUpdated.
  function applySpeed() {
    gameSpeed = window.getGameSpeed ? window.getGameSpeed('catch') : 1;
  }
  window.addEventListener('capySpeedUpdated', applySpeed);
  applySpeed();

  // Redimensionnement du canvas et du joueur.  Cette fonction est
  // appelée au chargement et lors des changements de taille de la
  // fenêtre.  Elle adapte la taille du plateau en conservant les
  // proportions et réinitialise la partie.
  function resize() {
    // Déterminer l'orientation
    const portrait = window.innerHeight > window.innerWidth;
    let boardSize;
    if (portrait) {
      boardSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.6);
    } else {
      boardSize = Math.min(window.innerHeight * 0.8, window.innerWidth * 0.6);
    }
    canvas.style.width = boardSize + 'px';
    canvas.style.height = boardSize + 'px';
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    // Mettre à jour la position et la taille du joueur en fonction du
    // nouveau canvas.  On redémarre également la partie pour éviter
    // d'avoir des objets dans des positions incohérentes.
    initPlayer();
    restartGame();
  }
  window.addEventListener('resize', resize);

  // Initialisation du joueur.  Le capybara se trouve centré en bas
  // de l'écran.  Sa largeur est proportionnelle à la largeur du
  // canvas pour rester adapté à toutes les tailles d'écran.
  function initPlayer() {
    const size = canvas.width / 8;
    player = {
      x: (canvas.width - size) / 2,
      y: canvas.height - size - 10,
      width: size,
      height: size,
      speed: canvas.width / 200 // vitesse horizontale de base
    };
    // Vitesse horizontale actuelle (aucun mouvement au démarrage)
    player.vx = 0;
  }

  // Début d'une nouvelle partie
  function restartGame() {
    score = 0;
    lives = 3;
    objects = [];
    spawnTimer = 0;
    lastFrameTime = performance.now();
    gameOver = false;
    hideGameOver();
    updateUI();
    applyVolume();
    if (!ambient.paused) {
      // Si déjà en lecture, rien à faire.  Sinon, lancer l'ambiance.
    } else {
      try {
        ambient.play();
      } catch (e) {}
    }
    // Dessiner l'état initial pour afficher immédiatement le joueur
    drawGame();
  }

  // Mettre à jour l'affichage des scores et des vies
  function updateUI() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
  }

  // Masquer l'écran de fin et afficher la barre latérale
  function hideGameOver() {
    gameoverOverlay.classList.add('hidden');
  }

  // Afficher l'écran de fin de partie
  function showGameOver() {
    gameOver = true;
    ambient.pause();
    // Mettre à jour les scores affichés
    currentScoreEl.textContent = score;
    // Charger l'ancien record
    let record = 0;
    try {
      const stored = localStorage.getItem('capyCatchHighScore');
      if (stored !== null) record = parseInt(stored, 10) || 0;
    } catch (e) {}
    if (score > record) {
      record = score;
      try {
        localStorage.setItem('capyCatchHighScore', record);
      } catch (e) {}
    }
    highScoreEl.textContent = record;
    // Choisir un message en fonction du score final.  En dessous de 10
    // points, afficher un message satirique pour souligner la faiblesse du
    // résultat ; sinon, sélectionner un message amusant classique.
    const messages = [
      "Attrape les comme des carottes volantes !",
      "Les fourches piquent, attention !",
      "Capy = 0, fourches = 3... revanche !",
      "Ne laisse pas tomber les légumes !",
      "Encore une bouchée ?"
    ];
    let msg;
    if (score < 10) {
      msg = lowScoreMessages[Math.floor(Math.random() * lowScoreMessages.length)];
    } else {
      msg = messages[Math.floor(Math.random() * messages.length)];
    }
    // Afficher le message avec une image du capybara correspondant au jeu.
    funMsgEl.innerHTML = `<img src="assets/capybara_running_clear.png" alt="Capybara" /> <span>${msg}</span>`;
    gameoverOverlay.classList.remove('hidden');
  }

  // Génère un nouvel objet (légume ou fourche) en haut de l'écran
  function spawnObject() {
    // Choisir le type : 75 % légumes, 25 % fourches
    const isVeg = Math.random() < 0.75;
    const size = canvas.width / 12;
    const x = Math.random() * (canvas.width - size);
    const y = -size;
    // Ajuster la vitesse de chute en fonction du score : plus le
    // score est élevé, plus les objets tombent rapidement.
    // Ralentir la chute au début du niveau : diminuer la base de vitesse.  On passe de 1.2 à 0.4
    // pour que les fruits et légumes descendent lentement en début de partie et accélèrent ensuite.
    const base = (canvas.height / 600) * (0.4 + Math.random() * 0.4);
    const speed = base * (1 + score / 200);
    // Limiter le nombre d'objets simultanés à l'écran.  Le jeu devient
    // illisible s'il y a trop de légumes ou de fourches.  On impose donc
    // un plafond : 15 légumes et 10 fourches maximum en même temps.
    const vegCount = objects.reduce((acc, obj) => acc + (obj.type === 'veg' ? 1 : 0), 0);
    const forkCount = objects.reduce((acc, obj) => acc + (obj.type === 'fork' ? 1 : 0), 0);
    if (isVeg) {
      if (vegCount >= 15) return; // ne pas ajouter de légume au-delà de la limite
      const vegIndex = Math.floor(Math.random() * vegImgs.length);
      objects.push({ x, y, size, speed, type: 'veg', vegIndex });
    } else {
      if (forkCount >= 10) return; // limiter les fourches à 10 simultanées
      objects.push({ x, y, size, speed, type: 'fork' });
    }
  }

  // Dessine la fourche via des primitives.  La fourche est composée
  // d'un manche et de trois dents.  Les couleurs sont gris clair.
  function drawFork(x, y, size) {
    // Dessiner une fourche inversée : le manche en haut et les pointes vers le bas.
    // Ajuster la longueur des pointes pour qu'elles soient plus longues et visibles.
    const handleWidth = size * 0.15;
    const handleHeight = size * 0.6;
    const prongWidth = size * 0.1;
    const prongHeight = size * 0.35;
    const gap = prongWidth * 0.5;
    ctx.save();
    // Manche en bois
    ctx.fillStyle = '#795548';
    ctx.fillRect(x + (size - handleWidth) / 2, y, handleWidth, handleHeight);
    // Pointes en métal, orientées vers le bas
    ctx.fillStyle = '#5d4037';
    for (let i = -1; i <= 1; i++) {
      const px = x + size / 2 + i * (prongWidth + gap) - prongWidth / 2;
      ctx.fillRect(px, y + handleHeight, prongWidth, prongHeight);
    }
    ctx.restore();
  }

  // Boucle principale de rendu
  function animate(now) {
    if (!lastFrameTime) lastFrameTime = now;
    const delta = now - lastFrameTime;
    lastFrameTime = now;
    if (!gameOver) {
      updateGame(delta);
      drawGame();
      requestAnimationFrame(animate);
    }
  }

  // Mise à jour de la logique du jeu
  function updateGame(delta) {
    const dt = delta / 16.6667; // normaliser par rapport à ~60 FPS
    spawnTimer += delta;
    // Plus le score est élevé, plus les objets apparaissent vite : on divise
    // l'intervalle par (1 + score/50).  Cela accélère progressivement
    // l'arrivée des légumes et des fourches au fil de la partie.
    const dynamicInterval = spawnIntervalBase / gameSpeed / (1 + score / 50);
    if (spawnTimer > dynamicInterval) {
      spawnTimer = 0;
      spawnObject();
    }
    // Mettre à jour les positions des objets
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      obj.y += obj.speed * gameSpeed * dt;
      // collision avec joueur
      if (
        obj.y + obj.size >= player.y &&
        obj.x < player.x + player.width &&
        obj.x + obj.size > player.x &&
        obj.y <= player.y + player.height
      ) {
        if (obj.type === 'veg') {
          // Attraper un légume : marquer des points et jouer un son
          score += 10;
          catchSound.currentTime = 0;
          catchSound.play();
        } else {
          // Fourche : perdre une vie
          lives--;
          hurtSound.currentTime = 0;
          hurtSound.play();
          if (lives <= 0) {
            showGameOver();
            return;
          }
        }
        // Retirer l'objet capturé
        objects.splice(i, 1);
        continue;
      }
      // Supprimer les objets hors du bas de l'écran
      if (obj.y > canvas.height) {
        // On ne pénalise pas si un légume tombe ; il est simplement perdu
        objects.splice(i, 1);
      }
    }
    // Déplacer le joueur selon la vélocité actuelle
    player.x += player.vx * dt;
    // Collision avec les bords
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    // Mettre à jour l'UI
    updateUI();
  }

  // Dessiner tous les éléments à l'écran
  function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dessiner le joueur.  L'image du capybara est désormais
    // entièrement détourée (capybara_running_clear.png) et ne
    // nécessite plus de recadrage.  On dessine donc la totalité
    // de l'image directement dans l'espace du joueur.
    ctx.drawImage(capyImg, player.x, player.y, player.width, player.height);
    // Dessiner les objets
    objects.forEach((obj) => {
      if (obj.type === 'veg') {
        const img = vegImgs[obj.vegIndex];
        ctx.drawImage(img, obj.x, obj.y, obj.size, obj.size);
      } else {
        drawFork(obj.x, obj.y, obj.size);
      }
    });
  }

  // Gestion des entrées clavier
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    updateVelocity();
  });
  window.addEventListener('keyup', (e) => {
    delete keys[e.key];
    updateVelocity();
  });
  // Mettre à jour la vitesse horizontale du joueur en fonction des
  // touches actuellement enfoncées.  Le joueur se déplace plus vite
  // avec le multiplicateur de vitesse.
  function updateVelocity() {
    let vx = 0;
    if (keys['ArrowLeft'] || keys['q'] || keys['Q']) vx -= player.speed * gameSpeed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) vx += player.speed * gameSpeed;
    player.vx = vx;
  }
  // Contrôle par la souris ou l'écran tactile : suivre la position
  // horizontale du curseur
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    player.x = posX - player.width / 2;
    // Bloquer aux bords
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
  });

  // Contrôles mobiles : bouton gauche et droite.  Ces boutons
  // modifient les entrées clavier virtuellement pour réutiliser la
  // logique existante.
  const leftBtn = document.getElementById('catch-left');
  const rightBtn = document.getElementById('catch-right');
  function mobileDown(dir) {
    if (dir === 'left') {
      keys['ArrowLeft'] = true;
    } else {
      keys['ArrowRight'] = true;
    }
    updateVelocity();
  }
  function mobileUp(dir) {
    if (dir === 'left') {
      delete keys['ArrowLeft'];
    } else {
      delete keys['ArrowRight'];
    }
    updateVelocity();
  }
  if (leftBtn && rightBtn) {
    const addEvents = (btn, dir) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        mobileDown(dir);
      });
      btn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        mobileUp(dir);
      });
      btn.addEventListener('pointerleave', (e) => {
        mobileUp(dir);
      });
      btn.addEventListener('pointercancel', (e) => {
        mobileUp(dir);
      });
    };
    addEvents(leftBtn, 'left');
    addEvents(rightBtn, 'right');
  }

  // Boutons du panneau latéral
  if (restartBtn) restartBtn.addEventListener('click', () => {
    restartGame();
  });
  if (menuBtn) menuBtn.addEventListener('click', () => {
    // Depuis capy/catch.html on remonte d'un répertoire pour atteindre Capy/games.html
    window.location.href = '../Capy/games.html';
  });
  // Boutons de l'écran de fin
  if (overReplayBtn) overReplayBtn.addEventListener('click', () => {
    restartGame();
  });
  if (overMenuBtn) overMenuBtn.addEventListener('click', () => {
    // Voir remarque précédente : corriger le chemin pour revenir au menu
    window.location.href = '../Capy/games.html';
  });

  // Initialiser et démarrer le jeu lorsque le DOM est prêt
  document.addEventListener('DOMContentLoaded', () => {
    resize();
    restartGame();
    // Démarrer la boucle d'animation
    requestAnimationFrame(animate);
    // Afficher les instructions si nécessaire
    try {
      const shown = localStorage.getItem('capyCatchInstructionsShown');
      if (!shown) {
        showInstructions();
      }
    } catch (e) {
      showInstructions();
    }
  });
})();