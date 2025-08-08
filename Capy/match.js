(() => {
  const allImages = [
    'assets/veg_carrot_final.png',
    'assets/veg_courgette_final.png',
    'assets/veg_pepper_final.png',
    'assets/veg_tomato_final.png',
    'assets/veg_potato_final.png',
    'assets/capybara_penguin.png',
    'assets/capybara_ninja_new.png',
    'assets/capybara_super.png',
    'assets/capybara_electric.png',
    'assets/capybara_unicorn.png',
    'assets/capybara_flying_new.png',
    'assets/capybara_turtle.png'
  ];
  let level = 1;
  let pairsTarget = 6;
  let deck = [];
  let first = null;
  let lock = false;
  let pairs = 0;
  let timeLeft = 0;
  let elapsed = 0;
  let attemptsLeft = 0;
  let timer = null;
  const baseTime = 60;
  let isMuted = false;
  const flipSound = new Audio('../courgette/assets/audio/click.mp3');
  const matchSound = new Audio('../courgette/assets/audio/achievement.mp3');
  const winSound = new Audio('../courgette/assets/audio/event.mp3');
  const loseSound = new Audio('../courgette/assets/audio/moan.mp3');
  const volumeBtn = document.getElementById('volume-toggle');

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildDeck() {
    const selected = shuffle(allImages.slice()).slice(0, pairsTarget);
    deck = shuffle(selected.concat(selected));
    const grid = document.getElementById('match-grid');
    grid.innerHTML = '';
    const cols = Math.ceil(Math.sqrt(deck.length));
    grid.style.gridTemplateColumns = `repeat(${cols}, 70px)`;
    deck.forEach((src, idx) => {
      const card = document.createElement('div');
      card.className = 'match-card';
      card.dataset.index = idx.toString();
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      card.appendChild(img);
      card.addEventListener('click', () => onCard(card));
      grid.appendChild(card);
    });
  }

  function onCard(card) {
    if (lock || card.classList.contains('revealed') || card.classList.contains('matched')) return;
    flipSound.currentTime = 0;
    flipSound.play();
    card.classList.add('revealed');
    if (!first) {
      first = card;
    } else {
      lock = true;
      const second = card;
      const same = deck[first.dataset.index] === deck[second.dataset.index];
      setTimeout(() => {
        if (same) {
          first.classList.add('matched');
          second.classList.add('matched');
          matchSound.currentTime = 0;
          matchSound.play();
          pairs++;
          document.getElementById('match-pairs').textContent = pairs;
          if (pairs === deck.length / 2) endGame();
          first = null;
          lock = false;
        } else {
          first.classList.add('shake');
          second.classList.add('shake');
          setTimeout(() => {
            first.classList.remove('shake');
            second.classList.remove('shake');
            first.classList.remove('revealed');
            second.classList.remove('revealed');
            attemptsLeft--;
            document.getElementById('match-attempts').textContent = attemptsLeft;
            first = null;
            lock = false;
            if (attemptsLeft <= 0) loseGame();
          }, 300);
        }
      }, 600);
    }
  }

  function getGlobalVolume() {
    let v = 0.5;
    try {
      const stored = localStorage.getItem('capyVolume');
      if (stored !== null) v = parseFloat(stored);
    } catch (e) {}
    return v;
  }

  function applyVolume() {
    const vol = isMuted ? 0 : getGlobalVolume();
    [flipSound, matchSound, winSound, loseSound].forEach((a) => (a.volume = vol));
  }

  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      volumeBtn.textContent = isMuted ? '🔇' : '🔊';
      applyVolume();
    });
    volumeBtn.textContent = '🔊';
  }
  applyVolume();

  function init() {
    pairs = 0;
    timeLeft = Math.max(20, baseTime - (level - 1) * 5);
    elapsed = 0;
    first = null;
    lock = false;
    attemptsLeft = pairsTarget * 2;
    document.getElementById('match-pairs').textContent = '0';
    document.getElementById('match-total').textContent = pairsTarget;
    document.getElementById('match-level').textContent = level;
    document.getElementById('match-time').textContent = timeLeft;
    document.getElementById('match-attempts').textContent = attemptsLeft;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      timeLeft--;
      elapsed++;
      document.getElementById('match-time').textContent = timeLeft;
      if (timeLeft <= 0) loseGame();
    }, 1000);
    buildDeck();
  }

  function endGame() {
    clearInterval(timer);
    winSound.currentTime = 0;
    winSound.play();
    document.getElementById('match-current-time').textContent = elapsed;
    let best = parseInt(localStorage.getItem('capyMatchHighScore') || '0', 10);
    if (!best || elapsed < best) {
      localStorage.setItem('capyMatchHighScore', elapsed);
      best = elapsed;
    }
    document.getElementById('match-high-score').textContent = best;
    showOverlay('match-gameover');
  }

  function loseGame() {
    clearInterval(timer);
    loseSound.currentTime = 0;
    loseSound.play();
    showOverlay('match-lose');
  }

  function showOverlay(id) {
    const el = document.getElementById(id);
    el.classList.remove('hidden');
    el.classList.add('show');
  }

  function hideOverlay(id) {
    const el = document.getElementById(id);
    el.classList.add('hidden');
    el.classList.remove('show');
  }

  document.getElementById('match-restart').addEventListener('click', () => {
    level = 1;
    pairsTarget = 6;
    init();
  });
  document.getElementById('match-over-next').addEventListener('click', () => {
    hideOverlay('match-gameover');
    level++;
    pairsTarget = Math.min(allImages.length, pairsTarget + 1);
    init();
  });
  document.getElementById('match-over-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('match-lose-replay').addEventListener('click', () => {
    hideOverlay('match-lose');
    level = 1;
    pairsTarget = 6;
    init();
  });
  document.getElementById('match-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('match-lose-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('match-instructions-ok').addEventListener('click', () => {
    document.getElementById('match-instructions').classList.add('hidden');
  });

  window.addEventListener('load', () => {
    document.getElementById('match-instructions').classList.remove('hidden');
    init();
  });
})();
