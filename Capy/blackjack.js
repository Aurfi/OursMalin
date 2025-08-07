(() => {
  /*
   * Jeu de blackjack simple.  Le joueur affronte la banque et tente de
   * s'approcher de 21 sans dépasser.  Les As valent 11 ou 1.  Un
   * compteur de victoires est stocké dans localStorage sous la clé
   * 'capyBlackjackHighScore'.
   */
  const scoreKey = 'capyBlackjackHighScore';
  let deck = [];
  let playerHand = [];
  let dealerHand = [];
  // Score courant (série de victoires).  Il n’est remis à zéro qu’à
  // l’initialisation initiale ou lorsqu’une manche est perdue.  Cela
  // permet de continuer à accumuler des points en enchaînant les gains.
  let currentScore = 0;
  // Indique si la partie est lancée pour la première fois.  On utilise
  // ce drapeau pour réinitialiser la série de victoires une seule fois
  // au chargement de la page.  Au-delà, les appels à startGame()
  // consécutifs (par exemple si le script est rejoué) ne remettent pas
  // currentScore à zéro.
  let firstGame = true;

  // Sélecteurs d'éléments DOM
  const dealerEl = document.getElementById('dealer-hand');
  const playerEl = document.getElementById('player-hand');
  const scoreEl = document.getElementById('bj-score');
  const recordEl = document.getElementById('bj-record');
  const messageEl = document.getElementById('bj-message');
  const hitBtn = document.getElementById('hit-btn');
  const standBtn = document.getElementById('stand-btn');
  const replayBtn = document.getElementById('bj-replay-btn');
  const menuBtn = document.getElementById('bj-menu-btn');

  // Messages satiriques lorsque le joueur perd et retombe à un score de
  // zéro.  Ces phrases soulignent avec humour la contre-performance.
  const lowScoreMessages = [
    "Un zéro pointé ! Le croupier n’a même pas transpiré.",
    "On dirait que les cartes t’ont joué un mauvais tour… et quel tour !",
    "Ton capybara a perdu toute sa fortune en carottes !"
  ];

  // Gestion de l’aide : affiche les règles et les masque après un
  // certain délai ou lorsqu’on clique sur la croix.
  const helpBtn = document.getElementById('bj-help');
  const helpOverlay = document.getElementById('bj-help-overlay');
  const helpClose = document.getElementById('bj-help-close');
  let helpTimer;
  function showHelp() {
    if (!helpOverlay) return;
    helpOverlay.classList.remove('hidden');
    // Masquer l’aide après 25 secondes
    clearTimeout(helpTimer);
    helpTimer = setTimeout(() => {
      hideHelp();
    }, 25000);
  }
  function hideHelp() {
    if (!helpOverlay) return;
    helpOverlay.classList.add('hidden');
    clearTimeout(helpTimer);
  }
  helpBtn?.addEventListener('click', showHelp);
  helpClose?.addEventListener('click', hideHelp);

  function initDeck() {
    deck = [];
    // Ajouter 4 exemplaires de chaque carte de 2 à 10
    for (let i = 2; i <= 10; i++) {
      for (let j = 0; j < 4; j++) deck.push(i);
    }
    // Ajouter 4 exemplaires de 10 supplémentaires pour J/Q/K
    for (let j = 0; j < 12; j++) deck.push(10);
    // Ajouter 4 As valant 11 (ajustés dynamiquement)
    for (let j = 0; j < 4; j++) deck.push(11);
    // Mélanger le deck (Fisher–Yates)
    for (let i = deck.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[k]] = [deck[k], deck[i]];
    }
  }

  function drawCard() {
    if (deck.length === 0) initDeck();
    return deck.pop();
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      total += card;
      if (card === 11) aces++;
    }
    // Convertir les As de 11 à 1 si nécessaire
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function updateHands() {
    // Mettre à jour l'affichage des mains
    dealerEl.innerHTML = '';
    playerEl.innerHTML = '';
    dealerHand.forEach((card) => {
      const div = document.createElement('div');
      div.className = 'bj-card';
      div.textContent = card;
      dealerEl.appendChild(div);
    });
    playerHand.forEach((card) => {
      const div = document.createElement('div');
      div.className = 'bj-card';
      div.textContent = card;
      playerEl.appendChild(div);
    });
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

  function startGame() {
    messageEl.textContent = '';
    replayBtn.classList.add('hidden');
    hitBtn.disabled = false;
    standBtn.disabled = false;
    // Ne réinitialiser la série de victoires que lors du tout premier
    // démarrage du jeu.  Ainsi, lorsque le joueur clique sur
    // “Rejouer” après une victoire, currentScore est conservé.
    if (firstGame) {
      currentScore = 0;
      scoreEl.textContent = '0';
      firstGame = false;
    } else {
      // Dans les redémarrages suivants, afficher simplement la série en cours
      scoreEl.textContent = currentScore.toString();
    }
    // Mettre à jour le record affiché depuis localStorage
    recordEl.textContent = getRecord().toString();
    initRound();
  }

  function initRound() {
    initDeck();
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard()];
    updateHands();
    // Si le joueur obtient 21 avec ses deux premières cartes, c'est un Blackjack naturel.
    const playerVal = handValue(playerHand);
    if (playerVal === 21) {
      // Désactiver les boutons car la manche se termine immédiatement
      hitBtn.disabled = true;
      standBtn.disabled = true;
      replayBtn.classList.remove('hidden');
      // Incrémenter le score courant et mettre à jour le record
      currentScore++;
      scoreEl.textContent = currentScore.toString();
      const rec = getRecord();
      if (currentScore > rec) {
        setRecord(currentScore);
        recordEl.textContent = currentScore.toString();
      }
      // Afficher un message spécifique pour le Blackjack naturel
      messageEl.style.color = '#fbc02d';
      messageEl.textContent = 'Blackjack !';
    }
  }

  function endRound(result) {
    // result: 'win', 'lose', 'push'
    hitBtn.disabled = true;
    standBtn.disabled = true;
    replayBtn.classList.remove('hidden');
    if (result === 'win') {
      messageEl.style.color = '#388e3c';
      messageEl.textContent = 'Gagné !';
      currentScore++;
      scoreEl.textContent = currentScore.toString();
      const rec = getRecord();
      if (currentScore > rec) {
        setRecord(currentScore);
        recordEl.textContent = currentScore.toString();
      }
    } else if (result === 'push') {
      messageEl.style.color = '#fbc02d';
      messageEl.textContent = 'Égalité.';
    } else {
      // Défaite.  Si la série retombe à zéro, afficher un message satirique
      // pour souligner l’échec, sinon simplement “Perdu.”.
      currentScore = 0;
      scoreEl.textContent = '0';
      if (lowScoreMessages && lowScoreMessages.length > 0) {
        messageEl.style.color = '#d32f2f';
        messageEl.textContent = lowScoreMessages[Math.floor(Math.random() * lowScoreMessages.length)];
      } else {
        messageEl.style.color = '#d32f2f';
        messageEl.textContent = 'Perdu.';
      }
    }
  }

  function playerHit() {
    playerHand.push(drawCard());
    updateHands();
    const val = handValue(playerHand);
    if (val > 21) {
      endRound('lose');
    } else if (val === 21) {
      // Si le joueur atteint 21 en piochant, appliquer la même logique qu’un Blackjack
      // Nous lançons la séquence stand() pour évaluer la main du croupier, puis
      // remplaçons le message afin d’indiquer qu’il s’agit d’un Blackjack.
      playerStand();
      messageEl.style.color = '#fbc02d';
      messageEl.textContent = 'Blackjack !';
    }
  }

  function playerStand() {
    // Jouer la main du croupier
    while (handValue(dealerHand) < 17) {
      dealerHand.push(drawCard());
    }
    updateHands();
    const playerVal = handValue(playerHand);
    const dealerVal = handValue(dealerHand);
    if (dealerVal > 21 || playerVal > dealerVal) endRound('win');
    else if (playerVal < dealerVal) endRound('lose');
    else endRound('push');
  }

  // Gestion des boutons
  hitBtn?.addEventListener('click', playerHit);
  standBtn?.addEventListener('click', playerStand);
  replayBtn?.addEventListener('click', () => {
    messageEl.textContent = '';
    initRound();
    hitBtn.disabled = false;
    standBtn.disabled = false;
    replayBtn.classList.add('hidden');
  });
  menuBtn?.addEventListener('click', () => {
    // Rediriger vers le nouveau chemin du menu principal situé dans le dossier Capy
    window.location.href = '../Capy/games.html';
  });

  // Lancer une première partie au chargement
  startGame();
})();