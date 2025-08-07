(() => {
  /**
   * Capy Mémoire — jeu de mémoire sur un étang.
   * Neuf nénuphars sont disposés en grille.  Une séquence de nénuphars
   * est montrée au joueur en les illuminant successivement.  Le
   * joueur doit ensuite reproduire la séquence en cliquant les mêmes
   * nénuphars dans l'ordre.  À chaque tour, un nénuphar supplémentaire
   * est ajouté à la séquence.  Le score correspond au nombre de
   * séquences réussies (c.-à-d. la longueur de la séquence moins un).
   * Le meilleur score est conservé dans localStorage sous
   * capyMemoryHighScore.
   */

  // Canvas et contexte
  const canvas = document.getElementById('actionCanvas');
  const ctx = canvas.getContext('2d');
  // Éléments d'interface
  const scoreEl = document.getElementById('action-score');
  const levelEl = document.getElementById('action-level');
  const restartBtn = document.getElementById('action-restart');
  const menuBtn = document.getElementById('action-menu');
  const gameoverOverlay = document.getElementById('action-gameover');
  const overReplayBtn = document.getElementById('action-over-replay');
  const overMenuBtn = document.getElementById('action-over-menu');
  const currentScoreEl = document.getElementById('action-current-score');
  const highScoreEl = document.getElementById('action-high-score');
  const funMsgEl = document.getElementById('action-fun-message');
  const volumeBtn = document.getElementById('volume-toggle');
  const instructionsEl = document.getElementById('action-instructions');
  const instructionsOkBtn = document.getElementById('action-instructions-ok');

  // Messages satiriques pour les scores faibles (≤ 5).  Ces
  // formulations moqueuses apparaîtront sur l’écran de Game Over
  // lorsque la séquence mémorisée par le joueur est trop courte.  Elles
  // invitent à retenter la partie avec humour.
  const lowScoreMessages = [
    "Ta mémoire est aussi fluide qu'un marais… on refait une partie ?",
    "Même le capybara à la sieste a retenu plus de nénuphars que toi !",
    "Avec un score pareil, les grenouilles ne sont pas impressionnées."
  ];

  // Grille de nénuphars (3 x 3)
  const ROWS = 3;
  const COLS = 3;
  let holes = []; // chaque nénuphar : {x,y,w,h}

  // Images
  const bgImg = new Image();
  bgImg.src = 'assets/swamp_background.png';

  // Audio
  // Création d’une série de bips correspondant à chacun des 9 nénuphars.
  // Chaque son est un fichier court généré dynamiquement dans assets/sounds.
  const beepSounds = [];
  for (let i = 1; i <= 9; i++) {
    const snd = new Audio(`assets/sounds/beep${i}.wav`);
    beepSounds.push(snd);
  }
  const wrongSound = new Audio('assets/sounds/invalid.wav');
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
    // Appliquer le volume aux sons : chaque beep ainsi qu’aux autres
    // effets sonores.
    beepSounds.forEach((aud) => {
      aud.volume = vol;
    });
    [wrongSound, ambient].forEach((aud) => {
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

  // Variables de jeu
  let sequence = [];
  let playerIndex = 0;
  let showing = false;
  let highlightIndex = -1;
  let score = 0;
  let gameOver = false;
  // Le joueur dispose de deux vies.  En cas d'erreur, une vie est
  // consommée et la séquence en cours est rejouée.  Si aucune vie ne
  // subsiste, la partie se termine.
  let lives = 2;

  /**
   * Redimensionner le canevas et recalculer la position des nénuphars en
   * fonction de la taille de la fenêtre.  Inspiré des autres jeux afin
   * d'assurer une bonne responsivité.
   */
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
    // recalculer les positions des trous
    holes = [];
    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        holes.push({
          x: c * cellW,
          y: r * cellH,
          w: cellW,
          h: cellH
        });
      }
    }
    restartGame();
  }
  window.addEventListener('resize', resize);

  /**
   * Démarre une nouvelle partie.  Réinitialise la séquence et le score,
   * applique le volume et lance la musique.  Appelle ensuite
   * addStep() pour générer la première séquence.
   */
  function restartGame() {
    sequence = [];
    playerIndex = 0;
    showing = false;
    highlightIndex = -1;
    score = 0;
    gameOver = false;
    lives = 2;
    hideGameOver();
    updateUI();
    updateLives();
    applyVolume();
    if (ambient.paused) {
      try {
        ambient.play();
      } catch (e) {}
    }
    // commence la première séquence après un court délai pour laisser
    // au joueur le temps de se préparer.  Un délai d’environ
    // 700 ms offre une transition douce sans démarrer immédiatement.
    setTimeout(() => {
      addStep();
    }, 700);
  }

  /**
   * Ajoute un nouvel index aléatoire à la séquence et démarre l'affichage
   * de la séquence entière.  Le niveau correspond à la longueur de la
   * séquence.
   */
  function addStep() {
    // ajouter un index aléatoire entre 0 et holes.length-1
    sequence.push(Math.floor(Math.random() * holes.length));
    showing = true;
    highlightIndex = -1;
    playerIndex = 0;
    updateUI();
    // lancer l'animation de surbrillance
    showSequence(0);
  }

  /**
   * Affiche la séquence en illuminant les nénuphars un par un.
   * Utilise des délais pour créer un effet visuel.
   */
  function showSequence(i) {
    if (gameOver) return;
    if (i >= sequence.length) {
      // fin de l'affichage
      showing = false;
      highlightIndex = -1;
      return;
    }
    highlightIndex = sequence[i];
    // jouer un petit son différent pour chaque nénuphar
    const snd = beepSounds[sequence[i] % beepSounds.length];
    if (snd) {
      snd.currentTime = 0;
      snd.play();
    }
    // après 600 ms, arrêter la surbrillance
    setTimeout(() => {
      highlightIndex = -1;
      // après 200 ms de pause, passer au suivant
      setTimeout(() => {
        showSequence(i + 1);
      }, 200);
    }, 600);
  }

  /**
   * Met à jour l'affichage du score et du niveau dans la barre latérale.
   */
  function updateUI() {
    if (scoreEl) scoreEl.textContent = score;
    if (levelEl) levelEl.textContent = sequence.length;
    // mettre à jour l'affichage des vies
    updateLives();
  }

  /**
   * Met à jour l'affichage des vies dans la barre latérale.  Les vies
   * sont représentées par des cœurs.  Le nombre de cœurs correspond au
   * nombre de vies restantes (maximum 5 affichés).
   */
  function updateLives() {
    const livesEl = document.getElementById('action-lives');
    if (!livesEl) return;
    const count = Math.max(0, Math.min(lives, 5));
    livesEl.textContent = '❤️'.repeat(count);
  }

  /**
   * Masque l'overlay de fin de partie.
   */
  function hideGameOver() {
    gameoverOverlay.classList.add('hidden');
  }

  /**
   * Affiche l'overlay de fin de partie, met à jour le meilleur score
   * et montre un message amusant.
   */
  function showGameOver() {
    gameOver = true;
    ambient.pause();
    // le score correspond au nombre de tours réussis
    currentScoreEl.textContent = score;
    // charger record
    let record = 0;
    try {
      const stored = localStorage.getItem('capyMemoryHighScore');
      if (stored !== null) record = parseInt(stored, 10) || 0;
    } catch (e) {}
    if (score > record) {
      record = score;
      try {
        localStorage.setItem('capyMemoryHighScore', record);
      } catch (e) {}
    }
    highScoreEl.textContent = record;
    const messages = [
      "Quelle mémoire d'éléphant… ou plutôt de capybara !",
      "Ton cerveau est un marais sans fond, bravo !",
      "Tu mémorises mieux que Capy GIGN désamorce une bombe !",
      "Oups, un trou de mémoire… Mais quel progrès !"
    ];
    let msg;
    // Pour un score trop faible (≤ 5), choisir un message satirique
    // signalant la mauvaise performance.  Sinon, utiliser les messages
    // positifs habituels.
    if (score <= 5) {
      msg = lowScoreMessages[Math.floor(Math.random() * lowScoreMessages.length)];
    } else {
      msg = messages[Math.floor(Math.random() * messages.length)];
    }
    // Utiliser une illustration cohérente pour le jeu de mémoire.  Cette
    // image représente un capybara en train de réfléchir.
    funMsgEl.innerHTML = `<img src="assets/capybara_memory.png" alt="Capybara" /> <span>${msg}</span>`;
    gameoverOverlay.classList.remove('hidden');
  }

  /**
   * Dessine le décor, les nénuphars et la surbrillance éventuelle.
   */
  function drawGame() {
    // fond
    if (bgImg.complete && bgImg.naturalWidth) {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
      // dégradé simple si l'image n'est pas chargée
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#b3e5fc');
      grad.addColorStop(1, '#e8f5e9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Nénuphars : dessiner des feuilles plus détaillées avec dégradé,
    // nervures et ombre portée pour un rendu plus organique.  Nous
    // agrandissons légèrement les feuilles et ajoutons une ombre
    // semi‑transparente afin qu'elles se détachent mieux du fond.
    holes.forEach((h, idx) => {
      const cx = h.x + h.w / 2;
      const cy = h.y + h.h / 2;
      // Taille de la feuille : occupent une plus grande partie de la cellule
      const rx = h.w * 0.4;
      const ry = h.h * 0.3;
      // Dessiner une ombre portée légèrement décalée vers le bas
      const shadowOffsetX = rx * 0.05;
      const shadowOffsetY = ry * 0.1;
      ctx.beginPath();
      ctx.ellipse(
        cx + shadowOffsetX,
        cy + shadowOffsetY,
        rx * 0.95,
        ry * 0.95,
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fill();
      // Dégradé radial depuis le centre vers le bord pour simuler le volume
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      if (idx === highlightIndex) {
        // Couleurs plus chaudes et lumineuses pour la surbrillance
        grad.addColorStop(0, '#fff9c4');
        grad.addColorStop(0.6, '#fff59d');
        grad.addColorStop(1, '#ffe082');
      } else {
        grad.addColorStop(0, '#b2dfdb');
        grad.addColorStop(0.6, '#80cbc4');
        grad.addColorStop(1, '#4db6ac');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dessiner des nervures (veines) : plusieurs lignes qui partent
      // du centre vers le bord.  La couleur varie selon l'état de surbrillance.
      ctx.strokeStyle = idx === highlightIndex ? '#ffca28' : '#00695c';
      ctx.lineWidth = 1.2;
      const veins = 5;
      for (let i = 0; i < veins; i++) {
        // Angle entre -45° et +45° en radians pour répartir les nervures
        const angle = (-0.5 + i / (veins - 1)) * (Math.PI / 2);
        const x = cx + rx * Math.cos(angle) * 0.85;
        const y = cy + ry * Math.sin(angle) * 0.85;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    });
  }

  /**
   * Boucle d'animation appelée à chaque frame.  Elle dessine le jeu et
   * continue tant que la partie n'est pas terminée.  L'animation de la
   * séquence est gérée séparément par showSequence().
   */
  function animate() {
    drawGame();
    if (!gameOver) {
      requestAnimationFrame(animate);
    }
  }

  /**
   * Gestion des clics sur le canevas.  Si l'on est en train d'afficher
   * la séquence ou si la partie est terminée, le clic est ignoré.  Sinon,
   * on détermine quel nénuphar a été cliqué et on vérifie s'il
   * correspond à la séquence attendue.
   */
  function handleClick(e) {
    if (gameOver || showing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let idx = 0; idx < holes.length; idx++) {
      const h = holes[idx];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        // cliquer sur ce trou
        if (idx === sequence[playerIndex]) {
          // bonne réponse : jouer le bip correspondant au nénuphar
          const snd2 = beepSounds[idx % beepSounds.length];
          if (snd2) {
            snd2.currentTime = 0;
            snd2.play();
          }
          playerIndex += 1;
          // clignoter brièvement pour rétroaction
          highlightIndex = idx;
          setTimeout(() => {
            highlightIndex = -1;
          }, 200);
          if (playerIndex >= sequence.length) {
            // séquence réussie
            score += 1;
            updateUI();
            // ajouter un nouveau pas après un court délai
            setTimeout(() => {
              addStep();
            }, 600);
          }
        } else {
          // mauvaise réponse
          wrongSound.currentTime = 0;
          wrongSound.play();
          // Consommer une vie.  Si une vie subsiste, rejouer la séquence
          // actuelle après un court délai.  Sinon, terminer la partie.
          lives -= 1;
          updateLives();
          if (lives > 0) {
            playerIndex = 0;
            showing = true;
            highlightIndex = -1;
            setTimeout(() => {
              showSequence(0);
            }, 800);
          } else {
            showGameOver();
          }
        }
        break;
      }
    }
  }
  canvas.addEventListener('pointerdown', handleClick);

  // Boutons
  if (restartBtn) restartBtn.addEventListener('click', () => {
    restartGame();
  });
  if (menuBtn) menuBtn.addEventListener('click', () => {
    window.location.href = '../Capy/games.html';
  });
  if (overReplayBtn) overReplayBtn.addEventListener('click', () => {
    restartGame();
  });
  if (overMenuBtn) overMenuBtn.addEventListener('click', () => {
    window.location.href = '../Capy/games.html';
  });

  // Instructions
  function showInstructions() {
    instructionsEl.classList.remove('hidden');
  }
  function hideInstructions() {
    instructionsEl.classList.add('hidden');
    try {
      localStorage.setItem('capyMemoryInstructionsShown', 'true');
    } catch (e) {}
  }
  if (instructionsOkBtn) {
    instructionsOkBtn.addEventListener('click', hideInstructions);
  }

  // Initialisation après chargement du DOM
  document.addEventListener('DOMContentLoaded', () => {
    resize();
    // instructions la première fois
    try {
      const shown = localStorage.getItem('capyMemoryInstructionsShown');
      if (!shown) {
        showInstructions();
      }
    } catch (e) {
      showInstructions();
    }
    // boucler l'animation
    requestAnimationFrame(animate);
  });
})();