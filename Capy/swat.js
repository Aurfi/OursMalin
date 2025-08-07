(() => {
  /**
   * Capy Swat – un jeu de démineur simplifié.  Révélez les cases
   * sans déclencher de bombes.  Marquez les bombes en restant
   * appuyé pour placer un drapeau.  Terminez le jeu en révélant
   * toutes les cases sûres.  Le score est basé sur le temps de
   * résolution.  Une figure de capybara en tenue SWAT est
   * dessinée à droite de la grille.
   */
  const canvas = document.getElementById('swatCanvas');
  const ctx = canvas.getContext('2d');
  const bombsEl = document.getElementById('swat-bombs');
  const timeEl = document.getElementById('swat-time');
  const restartBtn = document.getElementById('swat-restart');
  const menuBtn = document.getElementById('swat-menu');
  const gameoverOverlay = document.getElementById('swat-gameover');
  const currentScoreEl = document.getElementById('swat-current-score');
  const highScoreEl = document.getElementById('swat-high-score');
  const funMsgEl = document.getElementById('swat-fun-message');
  const overReplayBtn = document.getElementById('swat-over-replay');
  const overMenuBtn = document.getElementById('swat-over-menu');
  const volumeBtn = document.getElementById('volume-toggle');
  const instructionsEl = document.getElementById('swat-instructions');
  const instructionsOkBtn = document.getElementById('swat-instructions-ok');

  // Configuration de la grille
  const ROWS = 10;
  const COLS = 10;
  const NUM_BOMBS = 15;
  let gridSize; // dimension de la partie grille
  let tileSize; // taille d'une case
  let figureWidth; // largeur réservée au capybara SWAT
  // Structure de la grille : chaque élément est un objet
  // {bomb:bool, revealed:bool, flagged:bool, number:int}
  let board;
  let flagsRemaining;
  let startTime;
  let timer;
  let gameOver = false;
  let success = false;

  // Chargement de l'image du capybara SWAT : nous utilisons
  // l'image de capybara_running et dessinons un gilet pare-balles et
  // un casque sur le canvas.
  const capyImg = new Image();
  capyImg.src = 'assets/capybara_running.png';

  // Son pour explosion (échec)
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

  // Afficher/cacher les instructions
  function showInstructions() {
    instructionsEl.classList.remove('hidden');
  }
  function hideInstructions() {
    instructionsEl.classList.add('hidden');
    try {
      localStorage.setItem('capySwatInstructionsShown', 'true');
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
    // Allouer 80 % de la largeur à la grille et le reste au capy SWAT
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
    // Placer les bombes aléatoirement
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
    // Dessiner le plateau
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        const cell = board[r][c];
        // Fond de la case
        ctx.strokeStyle = '#b0bec5';
        ctx.lineWidth = 1;
        ctx.fillStyle = cell.revealed ? '#eceff1' : '#90a4ae';
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeRect(x, y, tileSize, tileSize);
        if (cell.revealed) {
          // Numéros
          if (cell.number > 0) {
            ctx.fillStyle = ['#1565c0', '#1b5e20', '#c62828', '#6a1b9a', '#ff6f00', '#00838f', '#d84315', '#424242'][cell.number - 1];
            ctx.font = tileSize * 0.6 + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(cell.number), x + tileSize / 2, y + tileSize / 2);
          }
        } else if (cell.flagged) {
          // Drapeau : triangle rouge
          ctx.fillStyle = '#d32f2f';
          ctx.beginPath();
          ctx.moveTo(x + tileSize * 0.2, y + tileSize * 0.8);
          ctx.lineTo(x + tileSize * 0.8, y + tileSize * 0.5);
          ctx.lineTo(x + tileSize * 0.2, y + tileSize * 0.2);
          ctx.fill();
        }
      }
    }
    // Dessiner la silhouette SWAT sur la droite
    const fx = gridSize + figureWidth / 2;
    const fy = canvas.height / 2;
    const fSize = Math.min(figureWidth * 0.6, canvas.height * 0.6);
    ctx.save();
    ctx.translate(fx, fy);
    const s = fSize;
    // Corps
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15, s * 0.25, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tête
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Casque SWAT
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, s * 0.27, 0, Math.PI * 2);
    ctx.fill();
    // Visière du casque
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(0, -s * 0.18, s * 0.18, Math.PI * 0.1, Math.PI * 0.9);
    ctx.fill();
    // Gilet pare‑balles
    ctx.fillStyle = '#263238';
    ctx.fillRect(-s * 0.2, s * 0.1, s * 0.4, s * 0.25);
    // Bras
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, s * 0.1);
    ctx.lineTo(-s * 0.4, s * 0.25);
    ctx.moveTo(s * 0.2, s * 0.1);
    ctx.lineTo(s * 0.4, s * 0.25);
    ctx.stroke();
    ctx.restore();
  }

  function revealCell(r, c) {
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    // Si c'est une bombe : échec
    if (cell.bomb) {
      endGame(false);
      return;
    }
    // Si c'est un zéro, révéler les voisins
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

  // Vérifie si toutes les cases sûres sont révélées
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
    // Révéler toutes les bombes
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].bomb) board[r][c].revealed = true;
      }
    }
    draw();
    // Mettre à jour scores
    if (successful) {
      const elapsed = parseFloat(timeEl.textContent);
      currentScoreEl.textContent = elapsed.toFixed(1) + ' s';
      let record = Infinity;
      try {
        const stored = localStorage.getItem('capySwatHighScore');
        if (stored !== null) record = parseFloat(stored);
      } catch (e) {}
      if (elapsed < record) {
        record = elapsed;
        try {
          localStorage.setItem('capySwatHighScore', String(record));
        } catch (e) {}
      }
      highScoreEl.textContent = (record === Infinity ? '—' : record.toFixed(1) + ' s');
      // Afficher une image du capybara gendarme et le message de réussite.
      funMsgEl.innerHTML = `<img src="assets/capybara_gign_new.png" alt="Capybara" /> <span>Mission accomplie ! Terrain sécurisé.</span>`;
      document.getElementById('swat-gameover-title').textContent = 'Victoire !';
    } else {
      currentScoreEl.textContent = timeEl.textContent + ' s';
      let record = 0;
      try {
        const stored = localStorage.getItem('capySwatHighScore');
        if (stored !== null) record = parseFloat(stored);
      } catch (e) {}
      highScoreEl.textContent = record ? record.toFixed(1) + ' s' : '—';
      // Afficher une image du capybara gendarme et le message d'échec.
      funMsgEl.innerHTML = `<img src="assets/capybara_gign_new.png" alt="Capybara" /> <span>BOOM ! Le SWAT devra recommencer...</span>`;
      document.getElementById('swat-gameover-title').textContent = 'Game Over';
    }
    gameoverOverlay.classList.remove('hidden');
  }

  // Gestion des clics : distinguer reveal et flag via durée d'appui
  let pressTimer;
  canvas.addEventListener('pointerdown', (e) => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Vérifier si dans la zone grille
    if (x < gridSize && y < tileSize * ROWS) {
      const c = Math.floor(x / tileSize);
      const r = Math.floor(y / tileSize);
      // Démarrer un timer pour détecter un appui long
      pressTimer = setTimeout(() => {
        toggleFlag(r, c);
        draw();
        pressTimer = null;
      }, 500);
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
      if (x < gridSize && y < tileSize * ROWS) {
        const c = Math.floor(x / tileSize);
        const r = Math.floor(y / tileSize);
        revealCell(r, c);
        if (checkWin()) endGame(true);
        draw();
      }
    }
  });
  canvas.addEventListener('pointercancel', () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  });

  // Boutons
  if (restartBtn) restartBtn.addEventListener('click', () => {
    bombsEl.textContent = '';
    timeEl.textContent = '0';
    gameoverOverlay.classList.add('hidden');
    initBoard();
    ambient.play();
    draw();
  });
  if (menuBtn) menuBtn.addEventListener('click', () => {
    // Revenir au menu principal depuis capy/swat.html
    window.location.href = '../Capy/games.html';
  });
  if (overReplayBtn) overReplayBtn.addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    initBoard();
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
    try {
      const shown = localStorage.getItem('capySwatInstructionsShown');
      if (!shown) showInstructions();
    } catch (e) {
      showInstructions();
    }
  });
})();