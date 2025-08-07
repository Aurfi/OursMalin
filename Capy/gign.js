(() => {
  /**
   * Capy GIGN – variante démineur.  Révélez les cases sans déclencher
   * de bombes.  Marquez les bombes en maintenant la pression pour
   * poser un drapeau.  Un capybara équipé façon GIGN est dessiné
   * sur la droite.  Le score est le temps mis à dévoiler toutes les
   * cases sûres.
   */
  const canvas = document.getElementById('gignCanvas');
  const ctx = canvas.getContext('2d');
  const bombsEl = document.getElementById('gign-bombs');
  const timeEl = document.getElementById('gign-time');
  const restartBtn = document.getElementById('gign-restart');
  const menuBtn = document.getElementById('gign-menu');
  const gameoverOverlay = document.getElementById('gign-gameover');
  const currentScoreEl = document.getElementById('gign-current-score');
  const highScoreEl = document.getElementById('gign-high-score');
  const funMsgEl = document.getElementById('gign-fun-message');
  const overReplayBtn = document.getElementById('gign-over-replay');
  const overMenuBtn = document.getElementById('gign-over-menu');
  const volumeBtn = document.getElementById('volume-toggle');
  const instructionsEl = document.getElementById('gign-instructions');
  const instructionsOkBtn = document.getElementById('gign-instructions-ok');

  // Configuration de la grille
  const ROWS = 10;
  const COLS = 10;
  const NUM_BOMBS = 15;
  let gridSize;
  let tileSize;
  let figureWidth;
  let board;
  let flagsRemaining;
  let startTime;
  let timer;
  let gameOver = false;
  let success = false;

  // Mode drapeau activé par le joueur (mobile) : lorsqu'il est vrai,
  // chaque appui sur une case pose/retire un drapeau au lieu de
  // révéler la case.  Ce mode est commuté via un bouton dans l'interface.
  let flagMode = false;

  // Image du capybara GIGN – utilise un fichier PNG décoré.  Le
  // fichier doit être fourni dans les assets et détourné du fond.
  const capyImg = new Image();
  capyImg.src = 'assets/capy_gign.png';
  // Assurer que la grille et la figure sont redessinées lorsque l'image du
  // capybara GIGN est chargée.  Certains navigateurs n'affichent pas
  // l'image si draw() est appelé avant le chargement.  Ce rappel
  // déclenche un redraw lorsque l'image est prête.
  capyImg.onload = () => {
    try {
      if (board) draw();
    } catch (e) {}
  };

  // Audio
  const explosionSound = new Audio('assets/sounds/invalid.wav');
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

  // Affichage/cacher les instructions
  function showInstructions() {
    instructionsEl.classList.remove('hidden');
  }
  function hideInstructions() {
    instructionsEl.classList.add('hidden');
    try {
      localStorage.setItem('capyGIGNInstructionsShown', 'true');
    } catch (e) {}
  }
  if (instructionsOkBtn) {
    instructionsOkBtn.addEventListener('click', hideInstructions);
  }

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
    // Réserver 80 % pour la grille, 20 % pour la figure
    gridSize = canvas.width * 0.8;
    tileSize = gridSize / COLS;
    figureWidth = canvas.width - gridSize;
    draw();
  }
  window.addEventListener('resize', resize);

  function initBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push({ bomb: false, revealed: false, flagged: false, number: 0 });
      }
      board.push(row);
    }
    // Placer les bombes
    let placed = 0;
    while (placed < NUM_BOMBS) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (!board[r][c].bomb) {
        board[r][c].bomb = true;
        placed++;
      }
    }
    // Calculer les nombres
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].bomb) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              if (board[nr][nc].bomb) count++;
            }
          }
        }
        board[r][c].number = count;
      }
    }
    flagsRemaining = NUM_BOMBS;
    bombsEl.textContent = flagsRemaining;
    gameOver = false;
    success = false;
    startTime = performance.now();
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (gameOver) return;
      const elapsed = (performance.now() - startTime) / 1000;
      timeEl.textContent = elapsed.toFixed(1);
    }, 100);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Plateau
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        const cell = board[r][c];
        // Couleurs adoucies pour un rendu plus moderne.  On utilise des
        // teintes légèrement plus claires que précédemment afin que la
        // grille soit moins sombre et plus agréable à l’œil.
        ctx.strokeStyle = '#c5d3de';
        ctx.lineWidth = 1;
        ctx.fillStyle = cell.revealed ? '#f2f5f7' : '#aabccd';
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeRect(x, y, tileSize, tileSize);
        if (cell.revealed) {
          if (cell.number > 0) {
            ctx.fillStyle = ['#1565c0', '#1b5e20', '#c62828', '#6a1b9a', '#ff6f00', '#00838f', '#d84315', '#424242'][cell.number - 1];
            ctx.font = tileSize * 0.6 + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(cell.number), x + tileSize / 2, y + tileSize / 2);
          }
        } else if (cell.flagged) {
          // drapeau : triangle rouge vif avec une hampe pour plus de clarté.
          ctx.fillStyle = '#e53935';
          ctx.beginPath();
          ctx.moveTo(x + tileSize * 0.25, y + tileSize * 0.75);
          ctx.lineTo(x + tileSize * 0.75, y + tileSize * 0.5);
          ctx.lineTo(x + tileSize * 0.25, y + tileSize * 0.25);
          ctx.closePath();
          ctx.fill();
          // hampe du drapeau
          ctx.strokeStyle = '#8d6e63';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + tileSize * 0.25, y + tileSize * 0.2);
          ctx.lineTo(x + tileSize * 0.25, y + tileSize * 0.8);
          ctx.stroke();
        }
      }
    }
    // Dessiner la figure GIGN
    const fx = gridSize + figureWidth / 2;
    const fy = canvas.height / 2;
    const fSize = Math.min(figureWidth * 0.8, canvas.height * 0.8);
    ctx.save();
    // Positionner au centre de l'espace figure puis retourner
    ctx.translate(fx, fy);
    ctx.scale(-1, 1);
    // Dessiner l'image en la centrant
    ctx.drawImage(capyImg, -fSize / 2, -fSize / 2, fSize, fSize);
    ctx.restore();
  }

  function revealCell(r, c) {
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    if (cell.bomb) {
      endGame(false);
      return;
    }
    if (cell.number === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (!board[nr][nc].revealed) revealCell(nr, nc);
          }
        }
      }
    }
  }

  function toggleFlag(r, c) {
    const cell = board[r][c];
    if (cell.revealed) return;
    if (cell.flagged) {
      cell.flagged = false;
      flagsRemaining++;
    } else {
      if (flagsRemaining <= 0) return;
      cell.flagged = true;
      flagsRemaining--;
    }
    bombsEl.textContent = flagsRemaining;
  }

  function checkWin() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (!cell.bomb && !cell.revealed) return false;
      }
    }
    return true;
  }

  function endGame(successful) {
    if (gameOver) return;
    gameOver = true;
    success = successful;
    clearInterval(timer);
    ambient.pause();
    if (!successful) {
      explosionSound.currentTime = 0;
      explosionSound.play();
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].bomb) board[r][c].revealed = true;
      }
    }
    draw();
    // Score = temps en secondes
    let record = Infinity;
    try {
      const stored = localStorage.getItem('capyGIGNHighScore');
      if (stored !== null) {
        const val = parseFloat(stored);
        if (!isNaN(val)) record = val;
      }
    } catch (e) {}
    const elapsed = (performance.now() - startTime) / 1000;
    currentScoreEl.textContent = elapsed.toFixed(1);
    if (successful && elapsed < record) {
      try {
        localStorage.setItem('capyGIGNHighScore', elapsed.toFixed(1));
      } catch (e) {}
      record = elapsed;
    }
    highScoreEl.textContent = record === Infinity ? '–' : record;
    // Afficher une image du capybara commando et le message.
    const msg = successful ? 'Mission réussie !' : 'Boummm ! Essaye encore.';
    funMsgEl.innerHTML = `<img src="assets/capybara_gign_new.png" alt="Capybara" /> <span>${msg}</span>`;
    document.getElementById('gign-gameover-title').textContent = successful ? 'Victoire !' : 'Game Over';
    gameoverOverlay.classList.remove('hidden');
  }

  // Interaction joueur
  canvas.addEventListener('pointerdown', (e) => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / tileSize);
    const r = Math.floor(y / tileSize);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    // Sur mobile, si le mode drapeau est activé, tous les clics
    // révèlent ou retirent un drapeau.  Sur desktop, clic droit ou
    // Ctrl+clic posent un drapeau.  Sinon, révélation standard.
    const wantFlag = flagMode || (e.pointerType === 'mouse' && (e.button === 2 || e.ctrlKey));
    if (wantFlag) {
      toggleFlag(r, c);
      draw();
    } else {
      revealCell(r, c);
      draw();
      if (!gameOver && checkWin()) {
        endGame(true);
      }
    }
  });
  // Support appui long pour mobile
  let longPressTimeout;
  canvas.addEventListener('touchstart', (e) => {
    if (gameOver) return;
    if (e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      const c = Math.floor(x / tileSize);
      const r = Math.floor(y / tileSize);
      longPressTimeout = setTimeout(() => {
        toggleFlag(r, c);
        draw();
      }, 500);
    }
  });
  canvas.addEventListener('touchend', (e) => {
    clearTimeout(longPressTimeout);
  });

  // Boutons
  if (restartBtn) restartBtn.addEventListener('click', () => {
    initBoard();
    applyVolume();
    ambient.play();
    draw();
  });
  if (menuBtn) menuBtn.addEventListener('click', () => {
    // Revenir au menu principal dans Capy
    window.location.href = '../Capy/games.html';
  });
  if (overReplayBtn) overReplayBtn.addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    initBoard();
    applyVolume();
    ambient.play();
    draw();
  });
  if (overMenuBtn) overMenuBtn.addEventListener('click', () => {
    // Chemin corrigé
    window.location.href = '../Capy/games.html';
  });

  document.addEventListener('DOMContentLoaded', () => {
    resize();
    initBoard();
    applyVolume();
    ambient.play();
    draw();
    try {
      const shown = localStorage.getItem('capyGIGNInstructionsShown');
      if (!shown) showInstructions();
    } catch (e) {
      showInstructions();
    }
    // Activer/désactiver le mode drapeau via le bouton.  Le bouton
    // indique l'état actuel par un style actif et un texte.  On
    // utilise la classe CSS .active pour indiquer l'état.
    const flagBtn = document.getElementById('gign-flag-mode');
    if (flagBtn) {
      flagBtn.addEventListener('click', () => {
        flagMode = !flagMode;
        flagBtn.classList.toggle('active', flagMode);
        // Lorsque le mode drapeau est activé, on indique
        // « Révéler » pour signaler que le prochain appui sur le
        // bouton reviendra en mode révélation.  Lorsque le mode
        // drapeau est désactivé, on indique « Drapeau » pour
        // inviter l'utilisateur à activer le marquage des bombes.
        flagBtn.textContent = flagMode ? 'Révéler' : 'Drapeau';
      });
      // Initialiser le texte en fonction de l'état actuel
      flagBtn.textContent = flagMode ? 'Révéler' : 'Drapeau';
    }
  });
})();