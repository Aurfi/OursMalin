(() => {
  /**
   * Capy Puzzle – un jeu de taquin classique où il faut reconstituer
   * l'ordre des nombres de 1 à 15.  Le plateau se compose de 4×4
   * tuiles dont une est vide.  Les utilisateurs cliquent ou touchent
   * une tuile adjacente à la case vide pour la déplacer.  Le temps
   * écoulé et le nombre de coups sont comptabilisés, et le meilleur
   * temps est enregistré localement.  Le jeu s'adapte à toutes les
   * tailles d'écran via un redimensionnement dynamique du canvas.
   */
  const canvas = document.getElementById('puzzleCanvas');
  const ctx = canvas.getContext('2d');
  const timeEl = document.getElementById('puzzle-time');
  const movesEl = document.getElementById('puzzle-moves');
  const restartBtn = document.getElementById('puzzle-restart');
  const menuBtn = document.getElementById('puzzle-menu');
  const gameoverOverlay = document.getElementById('puzzle-gameover');
  const currentTimeEl = document.getElementById('puzzle-current-time');
  const highScoreEl = document.getElementById('puzzle-high-score');
  const funMsgEl = document.getElementById('puzzle-fun-message');
  const overReplayBtn = document.getElementById('puzzle-over-replay');
  const overMenuBtn = document.getElementById('puzzle-over-menu');
  const volumeBtn = document.getElementById('volume-toggle');
  const instructionsEl = document.getElementById('puzzle-instructions');
  const instructionsOkBtn = document.getElementById('puzzle-instructions-ok');

  // Contrôle de la taille : slider et label
  const sizeSlider = document.getElementById('puzzle-size-slider');
  const sizeLabel = document.getElementById('puzzle-size-label');

  // Paramètre dynamique du jeu : dimension du puzzle (3×3 à 6×6)
  let size = 4;
  let board; // tableau 2D des valeurs (0 pour la case vide)
  let emptyRow;
  let emptyCol;
  let moves;
  let startTime;
  let timer;
  let gameOver = false;

  // Paramètres audio : bien que le puzzle soit silencieux par défaut,
  // nous réutilisons les fonctions de réglage du volume pour
  // l'homogénéité avec les autres jeux.
  const ambient = new Audio('assets/sounds/ambient_platform.wav');
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
    ambient.volume = vol;
  }

  // Ajoute un petit bip lorsque le joueur déplace une tuile.  On utilise
  // l'API Web Audio pour générer un ton court.  Les paramètres
  // (fréquence, durée, volume) sont choisis pour être discrets.
  const AudioContextPuzzle = window.AudioContext || window.webkitAudioContext;
  let audioCtxPuzzle;
  try {
    audioCtxPuzzle = new AudioContextPuzzle();
  } catch (e) {
    audioCtxPuzzle = null;
  }
  function playBeepPuzzle(frequency = 660, duration = 0.05, volume = 0.1) {
    if (!audioCtxPuzzle || isMuted) return;
    const osc = audioCtxPuzzle.createOscillator();
    const gain = audioCtxPuzzle.createGain();
    osc.type = 'square';
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtxPuzzle.destination);
    const now = audioCtxPuzzle.currentTime;
    osc.start(now);
    osc.stop(now + duration);
  }
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      applyVolume();
      volumeBtn.textContent = isMuted ? '🔈' : '🔇';
    });
  }

  function showInstructions() {
    instructionsEl.classList.remove('hidden');
  }
  function hideInstructions() {
    instructionsEl.classList.add('hidden');
    try {
      localStorage.setItem('capyPuzzleInstructionsShown', 'true');
    } catch (e) {}
  }
  if (instructionsOkBtn) {
    instructionsOkBtn.addEventListener('click', hideInstructions);
  }

  // Mettre à jour la taille du puzzle via le slider
  if (sizeSlider) {
    // Afficher la taille initiale
    sizeLabel.textContent = size + '×' + size;
    sizeSlider.value = size;
    sizeSlider.addEventListener('input', () => {
      const val = parseInt(sizeSlider.value, 10);
      // Autoriser des puzzles de 2×2 à 6×6 pour les joueurs débutants.
      if (!isNaN(val) && val >= 2 && val <= 6) {
        size = val;
        sizeLabel.textContent = size + '×' + size;
        // Réinitialiser le plateau lorsque la taille change
        initBoard();
      }
    });
  }

  // Initialisation du plateau : rempli les cases de 1 à 15 et place la
  // case vide en bas à droite.  Un mélange est réalisé en effectuant
  // plusieurs déplacements aléatoires de la case vide pour garantir la
  // solvabilité du puzzle.
  function initBoard() {
    // créer tableau initial
    board = [];
    let n = 1;
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        if (r === size - 1 && c === size - 1) {
          row.push(0);
        } else {
          row.push(n);
          n++;
        }
      }
      board.push(row);
    }
    emptyRow = size - 1;
    emptyCol = size - 1;
    // mélanger en effectuant des déplacements aléatoires
    const movesToShuffle = 200;
    for (let i = 0; i < movesToShuffle; i++) {
      const neighbors = [];
      if (emptyRow > 0) neighbors.push({ r: emptyRow - 1, c: emptyCol });
      if (emptyRow < size - 1) neighbors.push({ r: emptyRow + 1, c: emptyCol });
      if (emptyCol > 0) neighbors.push({ r: emptyRow, c: emptyCol - 1 });
      if (emptyCol < size - 1) neighbors.push({ r: emptyRow, c: emptyCol + 1 });
      const choice = neighbors[Math.floor(Math.random() * neighbors.length)];
      // swap with empty
      board[emptyRow][emptyCol] = board[choice.r][choice.c];
      board[choice.r][choice.c] = 0;
      emptyRow = choice.r;
      emptyCol = choice.c;
    }
    moves = 0;
    startTime = performance.now();
    updateUI();
    gameOver = false;
    if (timer) clearInterval(timer);
    timer = setInterval(updateTime, 100);
    drawBoard();
    try {
      ambient.play();
    } catch (e) {}
  }

  function updateTime() {
    if (gameOver) return;
    const elapsed = (performance.now() - startTime) / 1000;
    timeEl.textContent = elapsed.toFixed(1);
  }
  function updateUI() {
    movesEl.textContent = moves;
    timeEl.textContent = '0.0'; // sera mis à jour par updateTime()
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const tileSize = canvas.width / size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = board[r][c];
        const x = c * tileSize;
        const y = r * tileSize;
        if (val !== 0) {
          // Déterminer une couleur de fond graduée selon la valeur de la tuile.
          const maxVal = size * size - 1;
          const ratio = (val - 1) / maxVal;
          const hue = 200 - ratio * 140; // bleu vers jaune
          const light = 65 + ratio * 20; // plus clair pour les grands nombres
          ctx.fillStyle = `hsl(${hue}, 70%, ${light}% )`;
          ctx.strokeStyle = '#607d8b';
          ctx.lineWidth = tileSize * 0.05;
          // fond arrondi
          const radius = tileSize * 0.1;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + tileSize - radius, y);
          ctx.quadraticCurveTo(x + tileSize, y, x + tileSize, y + radius);
          ctx.lineTo(x + tileSize, y + tileSize - radius);
          ctx.quadraticCurveTo(x + tileSize, y + tileSize, x + tileSize - radius, y + tileSize);
          ctx.lineTo(x + radius, y + tileSize);
          ctx.quadraticCurveTo(x, y + tileSize, x, y + tileSize - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // numéro
          ctx.fillStyle = '#263238';
          ctx.font = tileSize * 0.5 + 'px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(val), x + tileSize / 2, y + tileSize / 2);
        } else {
          // pour la case vide, dessiner un léger cadre afin que la structure de la grille reste visible
          ctx.strokeStyle = '#90a4ae';
          ctx.lineWidth = tileSize * 0.02;
          ctx.strokeRect(x + (ctx.lineWidth / 2), y + (ctx.lineWidth / 2), tileSize - ctx.lineWidth, tileSize - ctx.lineWidth);
        }
      }
    }
  }

  function isSolved() {
    let k = 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r === size - 1 && c === size - 1) {
          if (board[r][c] !== 0) return false;
        } else {
          if (board[r][c] !== k) return false;
          k++;
        }
      }
    }
    return true;
  }

  function handleClick(e) {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tileSize = canvas.width / size;
    const c = Math.floor(x / tileSize);
    const r = Math.floor(y / tileSize);
    // si la tuile est à côté de la case vide, échanger
    const dr = Math.abs(r - emptyRow);
    const dc = Math.abs(c - emptyCol);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      // échanger
      board[emptyRow][emptyCol] = board[r][c];
      board[r][c] = 0;
      emptyRow = r;
      emptyCol = c;
      moves++;
      // Émettre un bip de retour pour signaler le déplacement
      playBeepPuzzle(700, 0.05, 0.1);
      drawBoard();
      movesEl.textContent = moves;
      if (isSolved()) {
        endGame();
      }
    }
  }

  function endGame() {
    gameOver = true;
    clearInterval(timer);
    ambient.pause();
    const elapsed = (performance.now() - startTime) / 1000;
    currentTimeEl.textContent = elapsed.toFixed(1);
    // charger record actuel
    let record = Infinity;
    try {
      const stored = localStorage.getItem('capyPuzzleHighScore');
      if (stored !== null) {
        const val = parseFloat(stored);
        if (!isNaN(val)) record = val;
      }
    } catch (e) {}
    if (elapsed < record) {
      record = elapsed;
      try {
        localStorage.setItem('capyPuzzleHighScore', elapsed.toFixed(1));
      } catch (e) {}
    }
    highScoreEl.textContent = record === Infinity ? '–' : record.toFixed(1);
    // Ajouter une image de capybara tortue pour illustrer le puzzle.
    funMsgEl.innerHTML = `<img src="assets/capybara_turtle.png" alt="Capybara" /> <span>Bravo ! Puzzle complété.</span>`;
    gameoverOverlay.classList.remove('hidden');
  }

  // Redimensionnement du canvas en fonction de l'orientation et de la taille
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
    initBoard();
  }
  window.addEventListener('resize', resize);

  // Boutons
  if (restartBtn) restartBtn.addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    resize();
  });
  if (menuBtn) menuBtn.addEventListener('click', () => {
    // Rediriger vers la page d'accueil située dans le dossier Capy.  Comme ce script
    // est chargé depuis « capy/puzzle.html », il faut remonter d'un niveau.
    window.location.href = '../Capy/games.html';
  });
  if (overReplayBtn) overReplayBtn.addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    resize();
  });
  if (overMenuBtn) overMenuBtn.addEventListener('click', () => {
    // Même remarque que ci-dessus : le lien est relatif au dossier « capy »
    window.location.href = '../Capy/games.html';
  });

  // Gestion des clics/touches
  canvas.addEventListener('pointerdown', handleClick);

  document.addEventListener('DOMContentLoaded', () => {
    resize();
    applyVolume();
    // afficher instructions si pas déjà vu
    try {
      const shown = localStorage.getItem('capyPuzzleInstructionsShown');
      if (!shown) showInstructions();
    } catch (e) {
      showInstructions();
    }
  });
})();