(() => {
  /**
   * Capy Bomber – inspiré de Bomberman.  Déplacez le capybara à
   * travers un labyrinthe, posez des bombes pour détruire des blocs
   * destructibles et éliminer les chats.  Terminez les niveaux en
   * détruisant tous les chats.  Le score augmente à chaque ennemi
   * vaincu.  Si le joueur touche un chat ou une flamme, la partie est
   * terminée.
   */
  const canvas = document.getElementById('bomberCanvas');
  const ctx = canvas.getContext('2d');
  const levelEl = document.getElementById('bomber-level');
  const scoreEl = document.getElementById('bomber-score');
  const restartBtn = document.getElementById('bomber-restart');
  const menuBtn = document.getElementById('bomber-menu');
  const gameoverOverlay = document.getElementById('bomber-gameover');
  const currentScoreEl = document.getElementById('bomber-current-score');
  const highScoreEl = document.getElementById('bomber-high-score');
  const funMsgEl = document.getElementById('bomber-fun-message');
  const overReplayBtn = document.getElementById('bomber-over-replay');
  const overMenuBtn = document.getElementById('bomber-over-menu');
  const volumeBtn = document.getElementById('volume-toggle');

  // Fenêtre d'instructions pour Capy Bomber
  const instructionsEl = document.getElementById('bomber-instructions');
  const instructionsOkBtn = document.getElementById('bomber-instructions-ok');
  function showInstructions() {
    instructionsEl.classList.remove('hidden');
  }
  function hideInstructions() {
    instructionsEl.classList.add('hidden');
    try {
      localStorage.setItem('bomberCapyInstructionsShown', 'true');
    } catch (e) {}
  }
  if (instructionsOkBtn) {
    instructionsOkBtn.addEventListener('click', hideInstructions);
  }

  // Dimensions de la grille : 11 lignes x 13 colonnes pour un ratio
  // rectangulaire agréable.  Les bordures sont des murs indestructibles.
  const ROWS = 11;
  const COLS = 13;
  // Types de cellules : 0 = vide, 1 = mur indestructible, 2 = bloc destructible
  const EMPTY = 0;
  const WALL = 1;
  const BLOCK = 2;
  // Bombes et flammes sont stockées séparément

  let tileSize;
  let board;
  let player;
  let cats;
  let bombs;
  let fires;
  // Niveau courant.  Le niveau est chargé à partir du stockage
  // local lors du lancement pour permettre de rejouer les niveaux
  // précédents via la sélection de niveaux.  Valeur par défaut : 1.
  let level = 1;
  let score = 0;
  let gameOver = false;
  let lastTime = 0;
  // Timers pour déplacement des chats
  let catTimer = 0;
  const CAT_INTERVAL_BASE = 800; // ms
  let gameSpeed = 1;

  // Nombre de bombes restantes pour le niveau actuel.  Ce nombre est
  // calculé lors de initLevel() en fonction du nombre d'ennemis et
  // d'obstacles.  Lorsqu'il atteint zéro, il n'est plus possible de
  // poser de bombe.
  let bombsRemaining = 0;

  // Charger l'image du capybara pour le joueur
  const capyImg = new Image();
  // Utiliser la version détourée pour supprimer le halo blanc autour du capybara
  capyImg.src = 'assets/capybara_running_clear.png';
  // Les chats sont dessinés via le canvas

  // Son simple pour explosion
  const explosionSound = new Audio('assets/sounds/fireworks.wav');
  const ambient = new Audio('assets/sounds/ambient_courgette.wav');
  ambient.loop = true;
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
    [explosionSound, ambient].forEach((aud) => (aud.volume = vol));
  }
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      applyVolume();
      volumeBtn.textContent = isMuted ? '🔈' : '🔇';
    });
  }

  function applySpeed() {
    gameSpeed = window.getGameSpeed ? window.getGameSpeed('bomber') : 1;
  }
  window.addEventListener('capySpeedUpdated', applySpeed);
  applySpeed();

  // Générer un nouveau niveau
  function initLevel() {
    // Initialiser la grille
    board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) {
          row.push(WALL);
        } else if (r % 2 === 1 && c % 2 === 1) {
          // Murs fixes au motif damier
          row.push(WALL);
        } else {
          // 30 % de blocs destructibles
          row.push(Math.random() < 0.3 ? BLOCK : EMPTY);
        }
      }
      board.push(row);
    }
    // Zones sûres autour du joueur et des ennemis (vider les blocs)
    const safe = [
      { r: 1, c: 1 },
      { r: 1, c: 2 },
      { r: 2, c: 1 },
      { r: ROWS - 2, c: COLS - 2 },
      { r: ROWS - 2, c: COLS - 3 },
      { r: ROWS - 3, c: COLS - 2 }
    ];
    safe.forEach((p) => {
      board[p.r][p.c] = EMPTY;
    });
    // Initialiser joueur
    player = { row: 1, col: 1, alive: true, moved: false };
    // Créer les chats selon le niveau (1 chat au niv 1, +1 par niveau)
    cats = [];
    const numCats = Math.min(4, level); // max 4 chats
    let attempts = 0;
    while (cats.length < numCats && attempts < 1000) {
      const r = ROWS - 2 - Math.floor(Math.random() * 3);
      const c = COLS - 2 - Math.floor(Math.random() * 3);
      if (board[r][c] === EMPTY && !(r === player.row && c === player.col)) {
        cats.push({ row: r, col: c, alive: true });
      }
      attempts++;
    }
    bombs = [];
    fires = [];
    catTimer = 0;
    // Mettre à jour l'affichage du niveau
    levelEl.textContent = level;

    // Déterminer le nombre de bombes disponibles.  Nous attribuons
    // autant de bombes que d'ennemis plus deux pour laisser une
    // marge d'erreur.  Cette valeur ne se réinitialise pas lors des
    // explosions : une bombe utilisée est définitivement consommée.
    // Attribuer une bombe supplémentaire par rapport à la version précédente
    bombsRemaining = cats.length + 3;
    const bombsEl = document.getElementById('bomber-bombs');
    if (bombsEl) bombsEl.textContent = bombsRemaining;
  }

  // Ajuste la taille du canvas et la taille des tuiles
  function resize() {
    const widthLimit = window.innerWidth * 0.6;
    const heightLimit = window.innerHeight * 0.8;
    const size = Math.min(widthLimit, heightLimit);
    canvas.style.width = size + 'px';
    canvas.style.height = size * (ROWS / COLS) + 'px';
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    tileSize = Math.min(canvas.width / COLS, canvas.height / ROWS);
  }
  window.addEventListener('resize', resize);

  // Dessiner la grille, le joueur, les chats, bombes et flammes
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dessiner le terrain
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        if (board[r][c] === WALL) {
          // Murs indestructibles : teinte sombre mais moins terne
          ctx.fillStyle = '#37474f';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else if (board[r][c] === BLOCK) {
          // Blocs destructibles : couleur pastel chaleureuse
          ctx.fillStyle = '#c5e1a5';
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
        } else {
          // Sol clair
          ctx.fillStyle = '#fafafa';
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }
    // Dessiner bombes
    bombs.forEach((b) => {
      const x = b.col * tileSize;
      const y = b.row * tileSize;
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // fusible
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = tileSize * 0.05;
      ctx.beginPath();
      ctx.moveTo(x + tileSize / 2 + tileSize * 0.2, y + tileSize / 2 - tileSize * 0.4);
      ctx.lineTo(x + tileSize / 2 + tileSize * 0.35, y + tileSize / 2 - tileSize * 0.6);
      ctx.stroke();
    });
    // Dessiner flammes
    fires.forEach((f) => {
      const x = f.col * tileSize;
      const y = f.row * tileSize;
      ctx.fillStyle = 'rgba(255,112,67,0.8)';
      ctx.fillRect(x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
    });
    // Dessiner chats
    cats.forEach((cat) => {
      if (!cat.alive) return;
      drawCat(cat.row, cat.col);
    });
    // Dessiner joueur
    if (player.alive) drawPlayer();
  }

  function drawPlayer() {
    const x = player.col * tileSize;
    const y = player.row * tileSize;
    // Dessiner le capybara sans recadrage.  L'image
    // capybara_running_clear.png est déjà détourée et ne nécessite
    // plus de suppression de halo.  Nous la dessinons directement
    // dans la cellule du joueur avec une petite marge pour laisser
    // apparaître le fond.
    ctx.drawImage(capyImg, x + tileSize * 0.1, y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
  }
  function drawCat(r, c) {
    const x = c * tileSize;
    const y = r * tileSize;
    const size = tileSize;
    ctx.save();
    // Corps du chat noir
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Oreilles
    ctx.beginPath();
    ctx.moveTo(x + size * 0.25, y + size * 0.25);
    ctx.lineTo(x + size * 0.3, y + size * 0.05);
    ctx.lineTo(x + size * 0.35, y + size * 0.25);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.65, y + size * 0.25);
    ctx.lineTo(x + size * 0.7, y + size * 0.05);
    ctx.lineTo(x + size * 0.75, y + size * 0.25);
    ctx.fill();
    // Yeux blancs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + size * 0.4, y + size * 0.5, size * 0.05, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y + size * 0.5, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    // Pupilles
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + size * 0.4, y + size * 0.5, size * 0.02, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y + size * 0.5, size * 0.02, 0, Math.PI * 2);
    ctx.fill();
    // Nez
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.55);
    ctx.lineTo(x + size * 0.47, y + size * 0.6);
    ctx.lineTo(x + size * 0.53, y + size * 0.6);
    ctx.fill();
    ctx.restore();
  }

  function update(dt) {
    // Mettre à jour bombes
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.timer -= dt;
      if (b.timer <= 0) {
        // Explosion : créer des flammes autour
        explodeBomb(b);
        bombs.splice(i, 1);
        explosionSound.currentTime = 0;
        explosionSound.play();
      }
    }
    // Mettre à jour flammes (durée de 500ms)
    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i];
      f.timer -= dt;
      if (f.timer <= 0) {
        fires.splice(i, 1);
      }
    }
    // Mise à jour des chats
    catTimer += dt;
    if (catTimer >= CAT_INTERVAL_BASE / gameSpeed) {
      catTimer = 0;
      cats.forEach((cat) => {
        if (!cat.alive) return;
        const dirs = [
          { dr: -1, dc: 0 },
          { dr: 1, dc: 0 },
          { dr: 0, dc: -1 },
          { dr: 0, dc: 1 }
        ];
        // Mélanger les directions pour un déplacement aléatoire
        for (let i = dirs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        for (const d of dirs) {
          const nr = cat.row + d.dr;
          const nc = cat.col + d.dc;
          // Les chats ne traversent pas les murs, les blocs ou les bombes
          if (
            nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
            board[nr][nc] === EMPTY &&
            !bombs.some((b) => b.row === nr && b.col === nc)
          ) {
            cat.row = nr;
            cat.col = nc;
            break;
          }
        }
      });
    }
    // Collision chats – joueur
    cats.forEach((cat) => {
      if (cat.alive && player.alive && cat.row === player.row && cat.col === player.col) {
        endGame();
      }
    });
    // Collision flammes
    fires.forEach((f) => {
      // Joueur touché
      if (player.alive && player.row === f.row && player.col === f.col) {
        endGame();
      }
      // Chats touchés
      cats.forEach((cat) => {
        if (cat.alive && cat.row === f.row && cat.col === f.col) {
          cat.alive = false;
          score += 50;
        }
      });
      // Détruire blocs destructibles
      if (board[f.row][f.col] === BLOCK) {
        board[f.row][f.col] = EMPTY;
      }
    });
    // Vérifier la fin du niveau
    if (cats.every((c) => !c.alive) && !gameOver) {
      // Passer au niveau suivant
      level++;
      if (level > 3) {
        // Jeu terminé avec succès
        endGame(true);
      } else {
        initLevel();
      }
    }
    // Mettre à jour l'affichage
    scoreEl.textContent = score;
  }

  // Explosion d'une bombe : génère des flammes sur la case et les
  // directions (haut, bas, gauche, droite) jusqu'à rencontrer un mur.
  function explodeBomb(b) {
    const positions = [];
    positions.push({ row: b.row, col: b.col });
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];
    for (const d of dirs) {
      let nr = b.row;
      let nc = b.col;
      for (let step = 0; step < 2; step++) {
        nr += d.dr;
        nc += d.dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
        if (board[nr][nc] === WALL) break;
        positions.push({ row: nr, col: nc });
        if (board[nr][nc] === BLOCK) break;
      }
    }
    positions.forEach((p) => {
      fires.push({ row: p.row, col: p.col, timer: 500 });
    });
  }

  // Gestion des entrées clavier
  const keyState = {};
  window.addEventListener('keydown', (e) => {
    keyState[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') {
      placeBomb();
    }
    handleMove();
  });
  window.addEventListener('keyup', (e) => {
    delete keyState[e.key];
  });

  function handleMove() {
    if (!player.alive || gameOver) return;
    const moves = [];
    if (keyState['ArrowUp'] || keyState['z'] || keyState['Z']) moves.push({ dr: -1, dc: 0 });
    if (keyState['ArrowDown'] || keyState['s'] || keyState['S']) moves.push({ dr: 1, dc: 0 });
    if (keyState['ArrowLeft'] || keyState['q'] || keyState['Q']) moves.push({ dr: 0, dc: -1 });
    if (keyState['ArrowRight'] || keyState['d'] || keyState['D']) moves.push({ dr: 0, dc: 1 });
    if (moves.length > 0) {
      const mv = moves[moves.length - 1]; // dernière direction appuyée
      const nr = player.row + mv.dr;
      const nc = player.col + mv.dc;
      if (
        nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
        board[nr][nc] === EMPTY &&
        !bombs.some((b) => b.row === nr && b.col === nc)
      ) {
        player.row = nr;
        player.col = nc;
      }
    }
  }

  function placeBomb() {
    if (!player.alive) return;
    // Vérifier qu'il reste des bombes disponibles
    if (bombsRemaining <= 0) return;
    // Vérifier s'il y a déjà une bombe à cet endroit
    if (bombs.some((b) => b.row === player.row && b.col === player.col)) return;
    bombs.push({ row: player.row, col: player.col, timer: 2000 });
    bombsRemaining--;
    const bombsEl = document.getElementById('bomber-bombs');
    if (bombsEl) bombsEl.textContent = bombsRemaining;
  }

  function endGame(success) {
    if (gameOver) return;
    gameOver = true;
    ambient.pause();
    currentScoreEl.textContent = score;
    let record = 0;
    try {
      const stored = localStorage.getItem('bomberCapyHighScore');
      if (stored !== null) record = parseInt(stored, 10) || 0;
    } catch (e) {}
    if (score > record) {
      record = score;
      try {
        localStorage.setItem('bomberCapyHighScore', record);
      } catch (e) {}
    }
    highScoreEl.textContent = record;
    if (success) {
      // Ajouter une image de capybara bombardier lors de la victoire
      funMsgEl.innerHTML = `<img src="assets/capybara_bomber.png" alt="Capybara" /> <span>Bravo ! Tous les chats ont été vaincus !</span>`;
      document.getElementById('bomber-gameover-title').textContent = 'Victoire !';
    } else {
      funMsgEl.innerHTML = `<img src="assets/capybara_bomber.png" alt="Capybara" /> <span>Les chats ont eu raison de toi...</span>`;
      document.getElementById('bomber-gameover-title').textContent = 'Game Over';
    }
    gameoverOverlay.classList.remove('hidden');
  }

  // Boutons
  if (restartBtn) restartBtn.addEventListener('click', () => {
    level = 1;
    score = 0;
    gameOver = false;
    initLevel();
    ambient.play();
  });
  if (menuBtn) menuBtn.addEventListener('click', () => {
    // Chemin corrigé vers le menu principal dans Capy
    window.location.href = '../Capy/games.html';
  });
  if (overReplayBtn) overReplayBtn.addEventListener('click', () => {
    level = 1;
    score = 0;
    gameOver = false;
    gameoverOverlay.classList.add('hidden');
    initLevel();
    ambient.play();
  });
  if (overMenuBtn) overMenuBtn.addEventListener('click', () => {
    // Idem pour l'écran de fin
    window.location.href = '../Capy/games.html';
  });

  function gameLoop(now) {
    // Suspendre la boucle tant que la pop‑up de pré‑lancement est affichée
    if (window.CAPY_PRESTART_ACTIVE) {
      requestAnimationFrame(gameLoop);
      return;
    }
    if (!lastTime) lastTime = now;
    const delta = now - lastTime;
    lastTime = now;
    if (!gameOver) {
      update(delta);
      draw();
    }
    requestAnimationFrame(gameLoop);
  }

  document.addEventListener('DOMContentLoaded', () => {
    resize();
    // Charger le niveau sélectionné depuis la page de sélection de niveaux
    try {
      const sel = localStorage.getItem('bomberCapySelectedLevel');
      if (sel !== null) {
        const num = parseInt(sel, 10);
        if (!isNaN(num) && num >= 1) {
          level = num;
        }
      }
    } catch (e) {}
    initLevel();
    score = 0;
    applyVolume();
    ambient.play();
    requestAnimationFrame(gameLoop);
    // Afficher les instructions la première fois
    try {
      const shown = localStorage.getItem('bomberCapyInstructionsShown');
      if (!shown) showInstructions();
    } catch (e) {
      showInstructions();
    }
  });

  // Démarrer la partie lorsque l’overlay de pré‑lancement disparaît.  Sur la page
  // bomber.html, la partie démarre automatiquement mais est bloquée par
  // CAPY_PRESTART_ACTIVE.  Lorsque l’événement capyGameStart est émis, on
  // initialise le niveau, réinitialise le score et lance la musique.
  window.addEventListener('capyGameStart', () => {
    // Si aucune partie n’a encore commencé (lastTime indéfini), initialiser
    if (!lastTime) {
      score = 0;
      gameOver = false;
      initLevel();
      applyVolume();
      try { ambient.play(); } catch (e) {}
    }
  });
})();