(() => {
  const words = ['CAROTTE', 'COURGETTE', 'TOMATE', 'PIMENT', 'PATATE'];
  let target = '';
  let answer = '';
  let time = 0;
  let timer = null;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function init() {
    target = words[Math.floor(Math.random() * words.length)];
    answer = '';
    time = 0;
    document.getElementById('scramble-time').textContent = '0';
    document.getElementById('scramble-answer').textContent = '';
    const scrambled = shuffle([...target]).join('');
    document.getElementById('scramble-scrambled').textContent = scrambled;
    const container = document.getElementById('scramble-letters');
    container.innerHTML = '';
    for (const ch of scrambled) {
      const btn = document.createElement('button');
      btn.textContent = ch;
      btn.className = 'scramble-letter';
      btn.addEventListener('click', () => {
        answer += ch;
        document.getElementById('scramble-answer').textContent = answer;
        btn.disabled = true;
        if (answer === target) endGame();
      });
      container.appendChild(btn);
    }
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      time++;
      document.getElementById('scramble-time').textContent = time;
    }, 1000);
  }

  function endGame() {
    clearInterval(timer);
    document.getElementById('scramble-current-time').textContent = time;
    let best = parseInt(localStorage.getItem('capyScrambleHighScore') || '0', 10);
    if (!best || time < best) {
      localStorage.setItem('capyScrambleHighScore', time);
      best = time;
    }
    document.getElementById('scramble-high-score').textContent = best;
    document.getElementById('scramble-gameover').classList.remove('hidden');
  }

  document.getElementById('scramble-restart').addEventListener('click', init);
  document.getElementById('scramble-over-replay').addEventListener('click', () => {
    document.getElementById('scramble-gameover').classList.add('hidden');
    init();
  });
  document.getElementById('scramble-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('scramble-over-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('scramble-instructions-ok').addEventListener('click', () => {
    document.getElementById('scramble-instructions').classList.add('hidden');
  });

  window.addEventListener('load', () => {
    document.getElementById('scramble-instructions').classList.remove('hidden');
    init();
  });
})();
