(() => {
  const size = 5;
  const canvas = document.getElementById('lightsCanvas');
  const ctx = canvas.getContext('2d');
  const tileSize = canvas.width / size;
  let grid = [];
  let moves = 0;
  let time = 0;
  let timer = null;

  function init() {
    grid = Array.from({ length: size }, () => Array.from({ length: size }, () => Math.random() < 0.5));
    moves = 0;
    time = 0;
    updateUI();
    draw();
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      time++;
      document.getElementById('lights-time').textContent = time;
    }, 1000);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = grid[y][x] ? '#ffc107' : '#37474f';
        ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
      }
    }
  }

  function toggle(x, y) {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      grid[y][x] = !grid[y][x];
    }
  }

  function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / tileSize);
    const y = Math.floor((e.clientY - rect.top) / tileSize);
    toggle(x, y);
    toggle(x + 1, y);
    toggle(x - 1, y);
    toggle(x, y + 1);
    toggle(x, y - 1);
    moves++;
    updateUI();
    draw();
    if (checkWin()) endGame();
  }

  function checkWin() {
    return grid.every(row => row.every(cell => !cell));
  }

  function endGame() {
    clearInterval(timer);
    document.getElementById('lights-current-time').textContent = time;
    let best = parseInt(localStorage.getItem('capyLightsHighScore') || '0', 10);
    if (!best || time < best) {
      localStorage.setItem('capyLightsHighScore', time);
      best = time;
    }
    document.getElementById('lights-high-score').textContent = best;
    document.getElementById('lights-gameover').classList.remove('hidden');
  }

  function updateUI() {
    document.getElementById('lights-moves').textContent = moves;
  }

  canvas.addEventListener('click', handleClick);

  document.getElementById('lights-restart').addEventListener('click', init);
  document.getElementById('lights-over-replay').addEventListener('click', () => {
    document.getElementById('lights-gameover').classList.add('hidden');
    init();
  });
  document.getElementById('lights-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('lights-over-menu').addEventListener('click', () => {
    window.location.href = 'games.html';
  });
  document.getElementById('lights-instructions-ok').addEventListener('click', () => {
    document.getElementById('lights-instructions').classList.add('hidden');
  });

  window.addEventListener('load', () => {
    document.getElementById('lights-instructions').classList.remove('hidden');
    init();
  });
})();
