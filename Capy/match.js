(() => {
  const images = [
    'assets/veg_carrot_final.png',
    'assets/veg_courgette_final.png',
    'assets/veg_pepper_final.png',
    'assets/veg_tomato_final.png'
  ];
  let deck = [];
  let first = null;
  let lock = false;
  let pairs = 0;
  let time = 0;
  let timer = null;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildDeck() {
    deck = shuffle(images.concat(images));
    const grid = document.getElementById('match-grid');
    grid.innerHTML = '';
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
    if (!timer) {
      timer = setInterval(() => {
        time++;
        document.getElementById('match-time').textContent = time;
      }, 1000);
    }
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
          pairs++;
          document.getElementById('match-pairs').textContent = pairs;
          if (pairs === deck.length / 2) endGame();
        } else {
          first.classList.remove('revealed');
          second.classList.remove('revealed');
        }
        first = null;
        lock = false;
      }, 600);
    }
  }

  function init() {
    pairs = 0;
    time = 0;
    first = null;
    lock = false;
    document.getElementById('match-pairs').textContent = '0';
    document.getElementById('match-time').textContent = '0';
    if (timer) clearInterval(timer);
    timer = null;
    buildDeck();
  }

  function endGame() {
    clearInterval(timer);
    document.getElementById('match-current-time').textContent = time;
    let best = parseInt(localStorage.getItem('capyMatchHighScore') || '0', 10);
    if (!best || time < best) {
      localStorage.setItem('capyMatchHighScore', time);
      best = time;
    }
    document.getElementById('match-high-score').textContent = best;
    document.getElementById('match-gameover').classList.remove('hidden');
  }

  document.getElementById('match-restart').addEventListener('click', init);
  document.getElementById('match-over-replay').addEventListener('click', () => {
    document.getElementById('match-gameover').classList.add('hidden');
    init();
  });
  document.getElementById('match-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('match-over-menu').addEventListener('click', () => {
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
