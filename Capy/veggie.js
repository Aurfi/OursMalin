(() => {
  /**
   * Veggie Crush – mini‑jeu de type match‑3.
   * L’objectif est de permuter des légumes adjacents pour former des
   * alignements d’au moins trois éléments identiques.  Les légumes
   * disparaissent, les éléments au‑dessus tombent et de nouveaux
   * légumes apparaissent.  Le joueur dispose d’un temps limité pour
   * marquer un maximum de points.
   */
  const canvas = document.getElementById('veggieCanvas');
  const ctx = canvas.getContext('2d');
  const rows = 8;
  const cols = 8;
  const cellSize = Math.floor(Math.min(canvas.width, canvas.height) / cols);
  canvas.width = cellSize * cols;
  canvas.height = cellSize * rows;
  // Charger les images des légumes
  const vegNames = ['veg_carrot.png', 'veg_tomato.png', 'veg_potato.png', 'veg_lettuce.png', 'veg_pepper.png'];
  const vegImgs = [];
  vegNames.forEach((src) => {
    const img = new Image();
    img.src = 'assets/' + src;
    vegImgs.push(img);
  });
  // Plateau de jeu sous forme de tableau de valeurs 0..4
  let board = [];
  let selected = null;
  let score = 0;
  let highScore = 0;
  // Timer (en secondes)
  let timeLeft = 60;
  let timerId = null;
  // Audio
  let isMuted = false;
  let isMusicMuted = false;
  const volumeBtn = document.getElementById('volume-toggle');
  const musicBtn = document.getElementById('music-toggle');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      volumeBtn.textContent = isMuted ? '🔇' : '🔊';
      if (isMuted) {
        stopMusic();
      } else {
        startMusic();
      }
    });
  }
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      isMusicMuted = !isMusicMuted;
      musicBtn.textContent = isMusicMuted ? '🔕' : '🎵';
      if (isMusicMuted) {
        stopMusic();
      } else {
        startMusic();
      }
    });
  }
  function startMusic() {
    stopMusic();
    if (isMusicMuted) return;
    if (typeof window.stopAllMelodies === 'function') window.stopAllMelodies();
    if (typeof window.playRelaxMelodyLoop === 'function') window.playRelaxMelodyLoop();
  }
  function stopMusic() {
    if (typeof window.stopAllMelodies === 'function') window.stopAllMelodies();
  }
  function getHighScore() {
    let val = 0;
    try {
      const stored = localStorage.getItem('capyVeggieHighScore');
      if (stored !== null) val = parseInt(stored, 10) || 0;
    } catch (e) {
      val = 0;
    }
    return val;
  }
  function saveHighScore(val) {
    try {
      localStorage.setItem('capyVeggieHighScore', String(val));
    } catch (e) {}
  }
  function initBoard() {
    board = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(randomVeg());
      }
      board.push(row);
    }
    // Éliminer les combinaisons initiales
    while (removeMatches()) {
      dropTiles();
      fillBoard();
    }
  }
  function randomVeg() {
    return Math.floor(Math.random() * vegImgs.length);
  }
  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const veg = board[r][c];
        const x = c * cellSize;
        const y = r * cellSize;
        // Surbrillance si sélectionné
        if (selected && selected.row === r && selected.col === c) {
          ctx.fillStyle = 'rgba(255,255,0,0.3)';
          ctx.fillRect(x, y, cellSize, cellSize);
        }
        ctx.drawImage(vegImgs[veg], x + 4, y + 4, cellSize - 8, cellSize - 8);
      }
    }
  }
  function areAdjacent(a, b) {
    return (Math.abs(a.row - b.row) + Math.abs(a.col - b.col)) === 1;
  }
  function swapCells(a, b) {
    const temp = board[a.row][a.col];
    board[a.row][a.col] = board[b.row][b.col];
    board[b.row][b.col] = temp;
  }
  function removeMatches() {
    // Marquer les cellules à supprimer
    const remove = [];
    for (let r = 0; r < rows; r++) {
      remove[r] = new Array(cols).fill(false);
    }
    let found = false;
    // Lignes
    for (let r = 0; r < rows; r++) {
      let count = 1;
      for (let c = 1; c < cols; c++) {
        if (board[r][c] === board[r][c - 1]) {
          count++;
        } else {
          if (count >= 3) {
            found = true;
            for (let k = 0; k < count; k++) remove[r][c - 1 - k] = true;
          }
          count = 1;
        }
      }
      if (count >= 3) {
        found = true;
        for (let k = 0; k < count; k++) remove[r][cols - 1 - k] = true;
      }
    }
    // Colonnes
    for (let c = 0; c < cols; c++) {
      let count = 1;
      for (let r = 1; r < rows; r++) {
        if (board[r][c] === board[r - 1][c]) {
          count++;
        } else {
          if (count >= 3) {
            found = true;
            for (let k = 0; k < count; k++) remove[r - 1 - k][c] = true;
          }
          count = 1;
        }
      }
      if (count >= 3) {
        found = true;
        for (let k = 0; k < count; k++) remove[rows - 1 - k][c] = true;
      }
    }
    if (found) {
      // Supprimer et compter
      let removedCount = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (remove[r][c]) {
            board[r][c] = null;
            removedCount++;
          }
        }
      }
      // Ajouter des points (1 par légume supprimé)
      score += removedCount;
    }
    return found;
  }
  function dropTiles() {
    for (let c = 0; c < cols; c++) {
      let pointer = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (board[r][c] !== null) {
          board[pointer][c] = board[r][c];
          if (pointer !== r) board[r][c] = null;
          pointer--;
        }
      }
    }
  }
  function fillBoard() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] === null) {
          board[r][c] = randomVeg();
        }
      }
    }
  }
  function update() {
    // Pas de logique de mise à jour continue : le plateau est mis à
    // jour uniquement après une action du joueur ou la suppression de
    // combinaisons.
  }
  function gameLoop() {
    drawBoard();
    requestAnimationFrame(gameLoop);
  }
  function handleClick(event) {
    if (timeLeft <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const cell = { row, col };
    if (!selected) {
      selected = cell;
    } else {
      if (selected.row === cell.row && selected.col === cell.col) {
        selected = null;
      } else if (areAdjacent(selected, cell)) {
        swapCells(selected, cell);
        if (removeMatches()) {
          do {
            dropTiles();
            fillBoard();
          } while (removeMatches());
        } else {
          // Pas de combinaison, annuler l'échange
          swapCells(selected, cell);
        }
        selected = null;
      } else {
        selected = cell;
      }
    }
  }
  function startTimer() {
    const timerSpan = document.getElementById('veggie-current-score');
    const recordSpan = document.getElementById('veggie-high-score');
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endGame();
      }
    }, 1000);
    recordSpan.textContent = getHighScore();
    timerSpan.textContent = 0;
  }
  function startGame() {
    // Préparer la partie
    score = 0;
    timeLeft = 60;
    highScore = getHighScore();
    initBoard();
    startMusic();
    startTimer();
  }
  function endGame() {
    stopMusic();
    // Afficher l'overlay de fin
    const overlay = document.getElementById('veggie-gameover');
    const scoreEl = document.getElementById('veggie-current-score');
    const highEl = document.getElementById('veggie-high-score');
    overlay.classList.remove('hidden');
    scoreEl.textContent = score;
    if (score > highScore) {
      saveHighScore(score);
      highScore = score;
    }
    highEl.textContent = highScore;
  }
  canvas.addEventListener('click', handleClick);
  // Boutons overlay
  const replayBtn = document.getElementById('veggie-replay-button');
  const menuBtn2 = document.getElementById('veggie-menu-button');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      const overlay = document.getElementById('veggie-gameover');
      overlay.classList.add('hidden');
      startGame();
    });
  }
  if (menuBtn2) {
    menuBtn2.addEventListener('click', () => {
      // Corriger le chemin vers la page d'accueil située dans le dossier Capy
      window.location.href = '../Capy/games.html';
    });
  }
  // Démarrer le jeu lorsque les images sont chargées
  let readyCount = 0;
  vegImgs.forEach((img) => {
    img.onload = () => {
      readyCount++;
      if (readyCount === vegImgs.length) {
        startGame();
        gameLoop();
      }
    };
  });
})();