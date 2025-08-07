(() => {
  /**
   * Capy Ninja – inspiré de Fruit Ninja.  Des légumes jaillissent
   * aléatoirement sur l'écran et doivent être tranchés en glissant le
   * doigt ou la souris.  Touchez ou découpez les légumes pour marquer
   * des points et évitez de toucher les bombes, qui mettent fin à la
   * partie.  Le temps est limité et le score final est comparé au
   * meilleur score enregistré.
   */
  const canvas = document.getElementById('tapCanvas');
  const ctx = canvas.getContext('2d');
  // Interface
  const scoreEl = document.getElementById('tap-score');
  const timeEl = document.getElementById('tap-time');
  const restartBtn = document.getElementById('tap-restart');
  const menuBtn = document.getElementById('tap-menu');
  const gameoverOverlay = document.getElementById('tap-gameover');
  const currentScoreEl = document.getElementById('tap-current-score');
  const highScoreEl = document.getElementById('tap-high-score');
  const funMsgEl = document.getElementById('tap-fun-message');
  const overReplayBtn = document.getElementById('tap-over-replay');
  const overMenuBtn = document.getElementById('tap-over-menu');
  const volumeBtn = document.getElementById('volume-toggle');

  // Fenêtre d'instructions pour Capy Ninja
  const instructionsEl = document.getElementById('tap-instructions');
  const instructionsOkBtn = document.getElementById('tap-instructions-ok');
  function showInstructions() {
    instructionsEl.classList.remove('hidden');
  }
  function hideInstructions() {
    instructionsEl.classList.add('hidden');
    try {
      localStorage.setItem('capyNinjaInstructionsShown', 'true');
    } catch (e) {}
  }
  if (instructionsOkBtn) {
    instructionsOkBtn.addEventListener('click', hideInstructions);
  }

  // Charger les images des légumes
  const vegSources = ['veg_carrot_final.png', 'veg_tomato_final.png', 'veg_courgette_final.png'];
  const vegImgs = vegSources.map((src) => {
    const img = new Image();
    img.src = 'assets/' + src;
    return img;
  });
  // Aucun fichier d'image pour les bombes : on les dessine via le canvas

  // Audio
  const clickSound = new Audio('assets/sounds/match.wav');
  const bombSound = new Audio('assets/sounds/invalid.wav');
  const ambient = new Audio('assets/sounds/ambient_courgette.wav');
  // Son joué lorsqu’un légume atteint le sol et qu’une vie est perdue.
  // On utilise un bip distinct pour alerter le joueur.  Le fichier
  // beep5.wav a été choisi parmi les sons existants pour sa tonalité
  // claire et courte.
  const dropSound = new Audio('assets/sounds/beep5.wav');
  ambient.loop = true;
  // Volume global
  let isMuted = false;
  function getGlobalVolume() {
    let v = 0.5;
    try {
      const stored = localStorage.getItem('capyGlobalVolume');
      if (stored !== null) v = parseFloat(stored);
    } catch (e) {}
    return isNaN(v) ? 0.5 : v;
  }
  function applyVolume() {
    const vol = isMuted ? 0 : getGlobalVolume();
    [clickSound, bombSound, ambient, dropSound].forEach((aud) => {
      aud.volume = vol;
    });
  }
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      applyVolume();
      volumeBtn.textContent = isMuted ? '🔈' : '🔇';
    });
  }

  // Configuration du jeu
  const items = [];
  let score = 0;
  let timeLeft = 30; // durée en secondes
  let lives = 5; // nombre de vies (5 cœurs)
  let gameOver = false;
  let lastFrameTime = 0;
  let spawnTimer = 0;
  // Intervalle de génération de nouveaux objets (en ms).  Les
  // fruits tombent plus souvent pour créer des groupes rapides de
  // trois ou quatre fruits dans un laps de temps court.
  // Intervalle de base pour la génération de lots de fruits et de bombes.  Réduit
  // pour que les fruits tombent plus fréquemment et permettent des combos.
  let spawnIntervalBase = 400;
  let gameSpeed = 1;

  // Effet de tranche : nous stockons les segments dessinés lors des
  // mouvements de souris ou de doigt pour créer des traces éphémères.
  const slices = [];
  let lastPointer = null;

  // Tableau de particules (« shards ») générées lors de la coupe des fruits.
  // Chaque élément contient des coordonnées, une vitesse, une taille,
  // une couleur et une opacité.  Les shards disparaissent rapidement.
  const shards = [];

  function applySpeed() {
    gameSpeed = window.getGameSpeed ? window.getGameSpeed('tap') : 1;
  }
  window.addEventListener('capySpeedUpdated', applySpeed);
  applySpeed();

  // Redimensionnement du canvas et redémarrage
  function resize() {
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
    restartGame();
  }
  window.addEventListener('resize', resize);

  function restartGame() {
    score = 0;
    timeLeft = 30;
    lives = 5;
    items.length = 0;
    gameOver = false;
    spawnTimer = 0;
    lastFrameTime = performance.now();
    hideGameOver();
    updateUI();
    applyVolume();
    if (ambient.paused) {
      try { ambient.play(); } catch (e) {}
    }
  }

  function hideGameOver() {
    gameoverOverlay.classList.add('hidden');
  }

  function showGameOver() {
    gameOver = true;
    ambient.pause();
    currentScoreEl.textContent = score;
    // enregistrer record
    let record = 0;
    try {
      const stored = localStorage.getItem('capyNinjaHighScore');
      if (stored !== null) record = parseInt(stored, 10) || 0;
    } catch (e) {}
    if (score > record) {
      record = score;
      try {
        localStorage.setItem('capyNinjaHighScore', record);
      } catch (e) {}
    }
    highScoreEl.textContent = record;
    const messages = [
      "Hi‑ya ! Les légumes ont volé en éclats !",
      "Attention, ces bombes ninja sont vicieuses !",
      "Tes coups de sabre sont précis comme un maître !",
      "Quelle agilité ! Encore une manche ?",
      "Les fruits ont été tranchés sans pitié !"
    ];
    // Afficher un capybara ninja et le message choisi.
    const msg = messages[Math.floor(Math.random() * messages.length)];
    funMsgEl.innerHTML = `<img src="assets/capybara_ninja_new.png" alt="Capybara" /> <span>${msg}</span>`;
    gameoverOverlay.classList.remove('hidden');
  }

  function updateUI() {
    scoreEl.textContent = score;
    timeEl.textContent = Math.max(0, Math.ceil(timeLeft));
  }

  // spawnItem –> sliceMeBaby : parce que manger des fruits c'est la vie.
  function sliceMeBaby() {
    const isVeg = Math.random() < 0.8; // 80 % de légumes (veggie powa!)
    const size = canvas.width / 12;
    const x = Math.random() * (canvas.width - size);
    const y = -size; // commencer hors de l'écran
    // Avant de générer un nouvel item, limiter le nombre d’objets présents
    // simultanément.  On autorise au maximum 12 éléments en même temps,
    // dont 7 légumes et 5 bombes.  Si ces limites sont atteintes, on
    // annule la création de l’objet.
    const currentVeg = items.reduce((acc, it) => acc + (it.type === 'veg' ? 1 : 0), 0);
    const currentBombs = items.reduce((acc, it) => acc + (it.type === 'bomb' ? 1 : 0), 0);
    const currentTotal = items.length;
    if (currentTotal >= 12 || (isVeg && currentVeg >= 7) || (!isVeg && currentBombs >= 5)) {
      return;
    }
    // Vitesse verticale : augmente légèrement avec le score pour accroître
    // progressivement la difficulté.  Le multiplicateur global est également
    // pris en compte pour que le comportement soit cohérent sur tous les
    // appareils.
    const speedFactor = 1 + score / 50;
    const vy = (canvas.height / 600) * (0.8 + Math.random() * 0.5) * gameSpeed * speedFactor;
    if (isVeg) {
      const vegIndex = Math.floor(Math.random() * vegImgs.length);
      items.push({ x, y, size, vy, type: 'veg', vegIndex });
    } else {
      items.push({ x, y, size, vy, type: 'bomb' });
    }
  }

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

  function updateGame(delta) {
    const dt = delta / 16.6667; // normaliser à ~60 FPS
    // Décompte du temps
    timeLeft -= delta / 1000;
    if (timeLeft <= 0) {
      showGameOver();
      return;
    }
    // Générer de nouveaux items lorsque l'intervalle est écoulé
    spawnTimer += delta;
    if (spawnTimer >= spawnIntervalBase / gameSpeed) {
      spawnTimer = 0;
      // Générer un lot d'items : 1 à 3 objets selon un tirage aléatoire,
      // afin de créer des grappes de légumes tombant coup sur coup.
      const count = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < count; j++) {
        sliceMeBaby();
      }
    }
    // Mettre à jour les positions des items
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy * dt;
      // Supprimer les items dépassant le bas de l'écran
      if (it.y > canvas.height) {
        if (it.type === 'veg') {
          // Un légume est tombé : perdre une vie et jouer un son d’alerte.
          lives--;
          try {
            dropSound.currentTime = 0;
            dropSound.play();
          } catch (e) {}
          if (lives <= 0) {
            showGameOver();
            return;
          }
        }
        // Supprimer quel que soit le type
        items.splice(i, 1);
        continue;
      }
    }
    // Diminuer progressivement l'opacité des segments de coupe
    // Estomper progressivement les segments de trace.  Auparavant,
    // l'opacité diminuait très rapidement (dt*4) ce qui rendait
    // l'effet quasiment invisible.  Nous réduisons le facteur
    // d'atténuation pour que la trace persiste quelques centièmes
    // de seconde et soit bien visible même lorsque la lame passe
    // dans le vide.  L'alpha est décrémenté de dt*0.5, ce qui
    // correspond à une diminution d'environ 50 % par seconde à
    // 60 FPS.  Lorsque l'opacité atteint zéro, le segment est
    // supprimé.
    for (let i = slices.length - 1; i >= 0; i--) {
      // Prolonger la persistance des traces.  Le facteur de
      // diminution de l’alpha est réduit pour que la trace reste
      // visible plus longtemps à l’écran.  À 60 FPS, un facteur de
      // 0.2 diminue l’opacité d’environ 20 % par seconde contre 50 %
      // auparavant, offrant une meilleure sensation de mouvement.
      slices[i].alpha -= dt * 0.2;
      if (slices[i].alpha <= 0) {
        slices.splice(i, 1);
      }
    }
    // Mettre à jour les éclats de fruits
    for (let i = shards.length - 1; i >= 0; i--) {
      const sh = shards[i];
      // déplacement
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      // gravité
      sh.vy += 0.2 * dt;
      sh.alpha -= dt * 3;
      if (sh.alpha <= 0) {
        shards.splice(i, 1);
      }
    }
    updateUI();
  }

  function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dessiner chaque item
    items.forEach((it) => {
      if (it.type === 'veg') {
        const img = vegImgs[it.vegIndex];
        ctx.drawImage(img, it.x, it.y, it.size, it.size);
      } else {
        // Bombe améliorée : sphère gris foncé avec une mèche enflammée
        ctx.save();
        const cx = it.x + it.size / 2;
        const cy = it.y + it.size / 2;
        const r = it.size / 2;
        // Corps de la bombe
        ctx.fillStyle = '#424242';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Reflet
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Mèche
        ctx.strokeStyle = '#6d4c41';
        ctx.lineWidth = it.size * 0.05;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.4, cy - r * 0.6);
        ctx.lineTo(cx + r * 0.7, cy - r * 1.0);
        ctx.stroke();
        // Flamme
        ctx.fillStyle = '#ffca28';
        ctx.beginPath();
        ctx.arc(cx + r * 0.75, cy - r * 1.05, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // Dessiner les cœurs représentant les vies.  Ils sont alignés
    // horizontalement en haut à gauche.  Lorsque des vies sont perdues,
    // seules les cœurs restants sont remplis, les autres sont dessinés
    // en contour.
    const heartSize = canvas.width * 0.05;
    for (let i = 0; i < 5; i++) {
      const x = 10 + i * (heartSize + 8);
      const y = 10;
      ctx.save();
      ctx.beginPath();
      const s = heartSize;
      ctx.moveTo(x + s * 0.5, y + s * 0.35);
      ctx.bezierCurveTo(x, y, x, y + s * 0.6, x + s * 0.5, y + s * 0.8);
      ctx.bezierCurveTo(x + s, y + s * 0.6, x + s, y, x + s * 0.5, y + s * 0.35);
      if (i < lives) {
        ctx.fillStyle = '#e53935';
        ctx.fill();
      }
      ctx.strokeStyle = '#b71c1c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Dessiner les traces de coupure.  Chaque élément du tableau
    // slices représente un segment avec une transparence décroissante.
    slices.forEach((sl) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,' + sl.alpha.toFixed(2) + ')';
      // Augmenter légèrement l'épaisseur des traces pour un effet
      // visuel plus marqué.  La largeur est maintenant 1.5 % de la
      // largeur du canvas au lieu de 1 %, ce qui la rend plus
      // visible tout en conservant une esthétique douce.
      ctx.lineWidth = canvas.width * 0.015;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sl.x1, sl.y1);
      ctx.lineTo(sl.x2, sl.y2);
      ctx.stroke();
      ctx.restore();
    });

    // Dessiner les éclats de fruits (shards).  Chaque éclat est un
    // petit triangle de la couleur du fruit qui s'éloigne rapidement
    // du point d'impact.  L'opacité décroît pour donner l'impression
    // d'une explosion éphémère.
    shards.forEach((sh) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sh.alpha);
      ctx.fillStyle = sh.color;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x + sh.size * Math.cos(sh.angle), sh.y + sh.size * Math.sin(sh.angle));
      ctx.lineTo(sh.x + sh.size * Math.cos(sh.angle + Math.PI / 6), sh.y + sh.size * Math.sin(sh.angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  // Gestion des clics/touches
  // Gestion du début d'une tranche : initialiser la position du doigt
  function handleSliceStart(e) {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPointer = { x, y };
    // Traiter la collision immédiatement
    processHit(x, y);
  }
  // Gestion du mouvement de tranche : créer un segment et traiter les collisions
  function handleSliceMove(e) {
    if (gameOver || !lastPointer) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Ajouter un segment de trace
    slices.push({ x1: lastPointer.x, y1: lastPointer.y, x2: x, y2: y, alpha: 1 });
    // Mettre à jour la position précédente
    lastPointer = { x, y };
    // Traiter les collisions le long de ce mouvement en utilisant la position actuelle
    processHit(x, y);
  }
  function handleSliceEnd() {
    lastPointer = null;
  }
  // Vérifie si une position (x,y) se trouve sur un item et applique l'effet
  function processHit(x, y) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (x >= it.x && x <= it.x + it.size && y >= it.y && y <= it.y + it.size) {
        if (it.type === 'veg') {
          score += 10;
          clickSound.currentTime = 0;
          clickSound.play();
          // Générer des éclats de couleur correspondant au légume.  On
          // place l'origine des éclats au centre de la pièce et on crée
          // plusieurs particules se dispersant dans toutes les
          // directions avec des vitesses aléatoires.  La couleur est
          // extraite en échantillonnant l'image du légume via un
          // canvas temporaire.  Si l'extraction échoue, on utilise une
          // couleur prédéfinie.
          const veg = it;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 1;
          tempCanvas.height = 1;
          const tctx = tempCanvas.getContext('2d');
          try {
            tctx.drawImage(vegImgs[veg.vegIndex], 0, 0, 1, 1);
            const data = tctx.getImageData(0, 0, 1, 1).data;
            const color = `rgb(${data[0]},${data[1]},${data[2]})`;
            for (let p = 0; p < 8; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = (Math.random() * 2 + 1) * (canvas.width / 300);
              shards.push({
                x: veg.x + veg.size / 2,
                y: veg.y + veg.size / 2,
                vx: speed * Math.cos(angle),
                vy: speed * Math.sin(angle),
                angle: angle,
                size: veg.size * 0.4,
                color: color,
                alpha: 1
              });
            }
          } catch (e) {
            const fallbackColor = '#ff7043';
            for (let p = 0; p < 8; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = (Math.random() * 2 + 1) * (canvas.width / 300);
              shards.push({
                x: veg.x + veg.size / 2,
                y: veg.y + veg.size / 2,
                vx: speed * Math.cos(angle),
                vy: speed * Math.sin(angle),
                angle: angle,
                size: veg.size * 0.4,
                color: fallbackColor,
                alpha: 1
              });
            }
          }
          items.splice(i, 1);
        } else {
          bombSound.currentTime = 0;
          bombSound.play();
          showGameOver();
        }
        break;
      }
    }
  }
  canvas.addEventListener('pointerdown', handleSliceStart);
  canvas.addEventListener('pointermove', handleSliceMove);
  canvas.addEventListener('pointerup', handleSliceEnd);
  canvas.addEventListener('pointercancel', handleSliceEnd);

  // Boutons
  if (restartBtn) restartBtn.addEventListener('click', () => {
    restartGame();
  });
  if (menuBtn) menuBtn.addEventListener('click', () => {
    // Revenir au menu principal dans le dossier Capy
    window.location.href = '../Capy/games.html';
  });
  if (overReplayBtn) overReplayBtn.addEventListener('click', () => {
    restartGame();
  });
  if (overMenuBtn) overMenuBtn.addEventListener('click', () => {
    // Chemin corrigé vers Capy/games.html
    window.location.href = '../Capy/games.html';
  });

  // Lancement
  document.addEventListener('DOMContentLoaded', () => {
    resize();
    restartGame();
    requestAnimationFrame(animate);
    // Afficher les instructions la première fois
    try {
      const shown = localStorage.getItem('capyNinjaInstructionsShown');
      if (!shown) {
        showInstructions();
      }
    } catch (e) {
      showInstructions();
    }
  });
})();