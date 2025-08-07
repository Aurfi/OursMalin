(() => {
  /*
   * Mini-jeu de roulette simplifié.  Le joueur parie sur la couleur
   * (Rouge ou Noir).  La roue génère un nombre aléatoire de 0 à 36
   * associé à une couleur.  Chaque pari gagnant augmente la série de
   * victoires.  Les meilleurs scores sont stockés dans
   * capyRouletteHighScore.
   */
  const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const blackNumbers = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);
  const scoreKey = 'capyRouletteHighScore';
  let currentStreak = 0;
  // Elements DOM
  const scoreEl = document.getElementById('rl-score');
  const recordEl = document.getElementById('rl-record');
  const resultEl = document.getElementById('roulette-result');
  const messageEl = document.getElementById('roulette-message');
  // Saisie de la mise et bouton de validation
  const betInput = document.getElementById('roulette-bet-input');
  const placeBetBtn = document.getElementById('roulette-place-bet');
  // Bouton d’aide et overlay d’aide
  const helpBtn = document.getElementById('roulette-help');
  const helpOverlay = document.getElementById('roulette-help-overlay');
  const helpClose = document.getElementById('roulette-help-close');
  // Boutons de rejouer et menu
  const replayBtn = document.getElementById('rl-replay');
  const menuBtn = document.getElementById('rl-menu');

  // Index du segment actuellement mis en surbrillance sur la roue.  Lorsque
  // null, aucun segment n'est illuminé.  Cette variable est utilisée
  // dans drawMiniWheel() pour colorer un secteur spécifique.
  let highlightSegment = null;
  // Identifiant d'intervalle pour l'animation de la roue.  Permet de
  // stopper proprement l'animation en cas de nouveau tirage.
  let spinIntervalId = null;

  /**
   * Dessine une roue de roulette miniature sur le canvas décoratif.
   *
   * Ce visuel n'a aucun impact sur le gameplay.  La roue comporte 37
   * secteurs : un vert pour le zéro et une alternance de rouge et de noir
   * pour les numéros 1–36, conformément aux règles de la roulette
   * française.  Les numéros ne sont pas inscrits pour préserver la
   * lisibilité sur un format réduit.
   */
  function drawMiniWheel() {
    const canvas = document.getElementById('roulette-wheel');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const segments = 37;
    const angle = (2 * Math.PI) / segments;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 2;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    // Nettoyer le canevas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dessiner chaque secteur
    for (let i = 0; i < segments; i++) {
      let color;
      if (i === 0) {
        color = '#388e3c'; // vert pour le zéro
      } else if (redNumbers.has(i)) {
        color = '#c62828'; // rouge
      } else {
        color = '#263238'; // noir/bleu très sombre
      }
      // Si ce segment est en cours d'animation, utiliser une couleur
      // brillante pour l'illuminer.  La couleur jaune vif permet de
      // distinguer clairement le secteur sélectionné.  La variable
      // highlightSegment est définie lors de l'animation.
      let segColor = color;
      if (highlightSegment !== null && i === highlightSegment) {
        segColor = '#ffea00';
      }
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const start = i * angle - Math.PI / 2;
      const end = start + angle;
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = segColor;
      ctx.fill();
    }
    // Contour extérieur pour un rendu net
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 1, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function getRecord() {
    try {
      const stored = localStorage.getItem(scoreKey);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function setRecord(val) {
    try {
      localStorage.setItem(scoreKey, String(val));
    } catch (e) {}
  }

  function resetGame() {
    currentStreak = 0;
    scoreEl.textContent = '0';
    recordEl.textContent = getRecord().toString();
    resultEl.textContent = '';
    messageEl.textContent = '';
    replayBtn.classList.add('hidden');
    // Les anciens boutons de couleur n'existent plus : la mise se fait via le champ texte.

    // Réinitialiser l'animation de la roue.  Aucun segment n'est
    // mis en surbrillance tant qu'un tirage n'a pas lieu.
    highlightSegment = null;
    clearInterval(spinIntervalId);
    drawMiniWheel();
  }

  /**
   * Effectue un tirage de roulette et évalue le pari selon son type.
   * @param {string} type - 'number', 'color' ou 'parity'
   * @param {*} value - nombre parié, 'red'/'black' ou 'pair'/'impair'
   */
  function spinWheelWithGuess(type, value) {
    // Générer un nombre aléatoire de 0 à 36
    const n = Math.floor(Math.random() * 37);
    let color;
    if (n === 0) color = 'green';
    else if (redNumbers.has(n)) color = 'red';
    else color = 'black';
    // Afficher le résultat et la couleur
    resultEl.textContent = n.toString();
    resultEl.style.color = color === 'red' ? '#d32f2f' : color === 'black' ? '#263238' : '#388e3c';
    let win = false;
    if (type === 'number') {
      win = (n === value);
    } else if (type === 'color') {
      win = (color === value);
    } else if (type === 'parity') {
      if (value === 'pair') {
        win = (n !== 0 && n % 2 === 0);
      } else if (value === 'impair') {
        win = (n % 2 === 1);
      }
    }
    if (win) {
      // Victoire
      currentStreak++;
      scoreEl.textContent = currentStreak.toString();
      messageEl.style.color = '#388e3c';
      messageEl.textContent = 'Gagné !';
      // Déclencher des confettis uniquement lorsqu'un nombre est deviné
      // exactement.  Les paris sur les couleurs ou la parité ne génèrent
      // pas d'animation afin de conserver une célébration spéciale pour
      // les victoires les plus difficiles.
      if (type === 'number') {
        try {
          showConfetti();
        } catch (e) {
          /* ignore */
        }
      }
      const rec = getRecord();
      if (currentStreak > rec) {
        setRecord(currentStreak);
        recordEl.textContent = currentStreak.toString();
      }
    } else {
      // Défaite
      messageEl.style.color = '#d32f2f';
      messageEl.textContent = 'Perdu.';
      currentStreak = 0;
      scoreEl.textContent = '0';
      replayBtn.classList.remove('hidden');
    }

    // Démarrer l'animation de la roue.  L'index du segment à mettre en
    // évidence correspond au numéro tiré (0 – 36).  L'animation éclaire
    // successivement chaque segment pendant environ 600 ms, puis se
    // termine sur le résultat.
    animateWheel(n);
  }

  /**
   * Anime la miniature de la roulette en mettant en surbrillance chaque
   * segment successivement pendant une courte durée.  Après un tour
   * complet, le segment correspondant au résultat reste allumé.  Cette
   * animation simule visuellement la roue qui tourne.
   * @param {number} finalSegment - numéro (0–36) du résultat du tirage
   */
  function animateWheel(finalSegment) {
    // Arrêter toute animation précédente
    clearInterval(spinIntervalId);
    const segmentsCount = 37;
    let seg = 0;
    // Durée totale de l'animation en millisecondes
    const totalDuration = 600;
    const interval = totalDuration / segmentsCount;
    spinIntervalId = setInterval(() => {
      highlightSegment = seg % segmentsCount;
      drawMiniWheel();
      seg++;
      if (seg > segmentsCount) {
        clearInterval(spinIntervalId);
        highlightSegment = finalSegment;
        drawMiniWheel();
      }
    }, interval);
  }

  // Gestion du bouton Parier
  if (placeBetBtn) {
    placeBetBtn.addEventListener('click', () => {
      if (!betInput) return;
      const raw = betInput.value.trim();
      betInput.value = '';
      if (!raw) return;
      // Seules les mises numériques (0 – 36) sont acceptées via le champ texte.
      if (!/^\d+$/.test(raw)) {
        messageEl.style.color = '#d32f2f';
        messageEl.textContent = 'Entrez un numéro entre 0 et 36.';
        return;
      }
      const num = parseInt(raw, 10);
      if (isNaN(num) || num < 0 || num > 36) {
        messageEl.style.color = '#d32f2f';
        messageEl.textContent = 'Mise invalide.';
        return;
      }
      spinWheelWithGuess('number', num);
    });
  }

  // Ajout de boutons de pari pour les couleurs et la parité.  Ces
  // boutons sont définis dans roulette.html et déclenchent directement
  // un tirage avec le type approprié.
  const betRedBtn = document.getElementById('roulette-bet-red');
  const betBlackBtn = document.getElementById('roulette-bet-black');
  const betPairBtn = document.getElementById('roulette-bet-pair');
  const betImpairBtn = document.getElementById('roulette-bet-impair');
  betRedBtn?.addEventListener('click', () => spinWheelWithGuess('color', 'red'));
  betBlackBtn?.addEventListener('click', () => spinWheelWithGuess('color', 'black'));
  betPairBtn?.addEventListener('click', () => spinWheelWithGuess('parity', 'pair'));
  betImpairBtn?.addEventListener('click', () => spinWheelWithGuess('parity', 'impair'));

  /**
   * Affiche temporairement des confettis colorés qui tombent depuis le haut
   * de l'écran.  Cette célébration est utilisée uniquement lorsque le
   * joueur devine exactement le bon numéro.  Les confettis sont
   * représentés par de petits rectangles colorés animés via les
   * propriétés CSS.
   */
  function showConfetti() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    container.style.zIndex = '9999';
    const colors = ['#ffeb3b', '#ff9800', '#f06292', '#ba68c8', '#4fc3f7', '#81c784'];
    const pieceCount = 40;
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('div');
      const size = Math.random() * 8 + 4;
      piece.style.position = 'absolute';
      piece.style.width = `${size}px`;
      piece.style.height = `${size}px`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = '-10px';
      piece.style.opacity = '0.9';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.transition = 'transform 2s ease-in, top 2s ease-in, opacity 2s ease-in';
      container.appendChild(piece);
      // déclencher la chute après une micro tâche
      setTimeout(() => {
        piece.style.top = `${100 + Math.random() * 20}vh`;
        piece.style.transform = `rotate(${360 + Math.random() * 360}deg)`;
        piece.style.opacity = '0';
      }, 20);
    }
    document.body.appendChild(container);
    // retirer le conteneur après la fin de l'animation
    setTimeout(() => {
      container.remove();
    }, 2200);
  }
  // Bouton Menu
  menuBtn?.addEventListener('click', () => { window.location.href = '../Capy/games.html'; });
  // Bouton Rejouer (affiché après une défaite)
  replayBtn?.addEventListener('click', () => resetGame());
  // Gestion de l’aide
  function showHelp() {
    if (!helpOverlay) return;
    helpOverlay.classList.remove('hidden');
    // Masquer après 25 s si pas fermé manuellement
    const timer = setTimeout(() => hideHelp(), 25000);
    helpOverlay.dataset.timer = timer;
  }
  function hideHelp() {
    if (!helpOverlay) return;
    helpOverlay.classList.add('hidden');
    const t = helpOverlay.dataset.timer;
    if (t) {
      clearTimeout(t);
      helpOverlay.dataset.timer = '';
    }
  }
  helpBtn?.addEventListener('click', showHelp);
  helpClose?.addEventListener('click', hideHelp);

  // Initialiser
  resetGame();
  // Dessiner la roulette décorative après la réinitialisation
  drawMiniWheel();
})();