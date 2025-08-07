(() => {
  const canvas = document.getElementById('whackCanvas');
  const ctx = canvas.getContext('2d');
  const startOverlay = document.getElementById('whack-start');
  const gameOverOverlay = document.getElementById('whack-gameover');
  const scoreEl = document.getElementById('whack-score');
  const timeEl = document.getElementById('whack-time');
  const finalScoreEl = document.getElementById('whack-final-score');
  const highScoreEl = document.getElementById('whack-high-score');

  const sprite = new Image();
  sprite.src = 'assets/capybara_super_transparent.png';

  let capyX = 0;
  let capyY = 0;
  const size = 80;
  let score = 0;
  let time = 30;
  let timerId = null;
  let running = false;

  function randomPos() {
    capyX = Math.random() * (canvas.width - size);
    capyY = Math.random() * (canvas.height - size);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sprite, capyX, capyY, size, size);
  }

  function startGame() {
    score = 0;
    time = 30;
    scoreEl.textContent = '0';
    timeEl.textContent = '30';
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    randomPos();
    draw();
    running = true;
    timerId = setInterval(() => {
      time--;
      timeEl.textContent = time;
      if (time <= 0) {
        endGame();
      } else {
        randomPos();
        draw();
      }
    }, 1000);
  }

  function endGame() {
    running = false;
    clearInterval(timerId);
    finalScoreEl.textContent = score;
    let high = 0;
    try {
      const stored = localStorage.getItem('capyWhackHighScore');
      if (stored !== null) high = parseInt(stored, 10) || 0;
    } catch (e) {
      high = 0;
    }
    if (score > high) {
      high = score;
      try {
        localStorage.setItem('capyWhackHighScore', String(high));
      } catch (e) {}
    }
    highScoreEl.textContent = high;
    gameOverOverlay.classList.remove('hidden');
  }

  canvas.addEventListener('click', (e) => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x >= capyX && x <= capyX + size && y >= capyY && y <= capyY + size) {
      score++;
      scoreEl.textContent = score;
      randomPos();
      draw();
    }
  });

  document.getElementById('whack-start-btn').addEventListener('click', startGame);
  document.getElementById('whack-replay').addEventListener('click', startGame);
  document.getElementById('whack-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('whack-menu-start').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
})();
