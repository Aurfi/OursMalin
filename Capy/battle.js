(() => {
  const playerImg = document.getElementById('player');
  const enemyImg = document.getElementById('enemy');
  const playerHpEl = document.getElementById('player-hp');
  const enemyHpEl = document.getElementById('enemy-hp');
  const msgEl = document.getElementById('message');
  const attackBtn = document.getElementById('attack-btn');
  const menuBtn = document.getElementById('menu-btn');
  const resultOverlay = document.getElementById('result-overlay');
  const restartBtn = document.getElementById('restart-btn');
  const resultText = document.getElementById('result-text');
  const starImg = resultOverlay.querySelector('.star');

  let playerHp = 100;
  let enemyHp = 100;
  let inBattle = true;

  // Charger les sons en utilisant le volume global s'il est défini.
  const attackSound = new Audio('assets/sounds/beep6.wav');
  const victorySound = new Audio('assets/sounds/fireworks.wav');
  const bgMusic = new Audio('assets/audio/battle_trainer.ogg');
  bgMusic.loop = true;
  function applyVolume(audio) {
    try {
      const vol = parseFloat(localStorage.getItem('capyGlobalVolume'));
      if (!isNaN(vol)) audio.volume = vol;
    } catch (e) {}
  }
  [attackSound, victorySound, bgMusic].forEach(applyVolume);

  function updateBars() {
    playerHpEl.style.width = `${playerHp}%`;
    enemyHpEl.style.width = `${enemyHp}%`;
  }

  function showMessage(text) {
    msgEl.textContent = text;
  }

  function enemyAttack() {
    if (!inBattle) return;
    enemyImg.classList.add('enemy-attack-anim');
    attackSound.currentTime = 0;
    attackSound.play();
    const dmg = Math.floor(Math.random() * 15) + 5;
    setTimeout(() => {
      enemyImg.classList.remove('enemy-attack-anim');
      playerImg.classList.add('hit-anim');
      playerHp = Math.max(0, playerHp - dmg);
      updateBars();
      showMessage(`L'ennemi inflige ${dmg} dégâts !`);
      setTimeout(() => {
        playerImg.classList.remove('hit-anim');
        if (playerHp <= 0) {
          endBattle(false);
        } else {
          attackBtn.disabled = false;
        }
      }, 300);
    }, 300);
  }

  function playerAttack() {
    if (!inBattle) return;
    attackBtn.disabled = true;
    playerImg.classList.add('attack-anim');
    attackSound.currentTime = 0;
    attackSound.play();
    const dmg = Math.floor(Math.random() * 15) + 5;
    setTimeout(() => {
      playerImg.classList.remove('attack-anim');
      enemyImg.classList.add('hit-anim');
      enemyHp = Math.max(0, enemyHp - dmg);
      updateBars();
      showMessage(`Capy inflige ${dmg} dégâts !`);
      setTimeout(() => {
        enemyImg.classList.remove('hit-anim');
        if (enemyHp <= 0) {
          endBattle(true);
        } else {
          enemyAttack();
        }
      }, 300);
    }, 300);
  }

  function endBattle(victory) {
    inBattle = false;
    if (victory) {
      resultText.textContent = 'Victoire !';
      starImg.style.display = 'block';
      victorySound.play();
    } else {
      resultText.textContent = 'Défaite…';
      starImg.style.display = 'none';
      bgMusic.pause();
    }
    resultOverlay.classList.add('visible');
  }

  // Boutons
  if (attackBtn) {
    attackBtn.addEventListener('click', playerAttack);
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      window.location.href = '../Capy/games.html';
    });
  }
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // Démarrage de la musique lorsque le jeu commence
  window.addEventListener('capyGameStart', () => {
    applyVolume(bgMusic);
    try { bgMusic.play(); } catch (e) {}
  });

  updateBars();
})();
