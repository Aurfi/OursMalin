(() => {
  function CapyBattle({
    playerImg = document.getElementById('player'),
    enemyImg = document.getElementById('enemy'),
    playerHpEl = document.getElementById('player-hp'),
    enemyHpEl = document.getElementById('enemy-hp'),
    msgEl = document.getElementById('message'),
    attackBtn = document.getElementById('attack-btn'),
    menuBtn = document.getElementById('menu-btn'),
    resultOverlay = document.getElementById('result-overlay'),
    restartBtn = document.getElementById('restart-btn'),
    resultText = document.getElementById('result-text'),
    starImg = resultOverlay ? resultOverlay.querySelector('.star') : null,
    onEnd = null,
    menuAction = null
  } = {}) {
    let playerHp = 100;
    let enemyHp = 100;
    let inBattle = true;

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
      if (playerHpEl) playerHpEl.style.width = `${playerHp}%`;
      if (enemyHpEl) enemyHpEl.style.width = `${enemyHp}%`;
    }

    function showMessage(text) {
      if (msgEl) msgEl.textContent = text;
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
        if (resultText) resultText.textContent = 'Victoire !';
        if (starImg) starImg.style.display = 'block';
        victorySound.play();
      } else {
        if (resultText) resultText.textContent = 'Défaite…';
        if (starImg) starImg.style.display = 'none';
        bgMusic.pause();
      }
      if (resultOverlay) resultOverlay.classList.add('visible');
      if (restartBtn) {
        restartBtn.textContent = 'Continuer';
        restartBtn.addEventListener('click', () => {
          if (resultOverlay) resultOverlay.classList.remove('visible');
          if (typeof onEnd === 'function') onEnd(victory);
        }, { once: true });
      } else if (typeof onEnd === 'function') {
        onEnd(victory);
      }
    }

    if (attackBtn) {
      attackBtn.addEventListener('click', playerAttack);
    }
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        if (typeof menuAction === 'function') {
          menuAction();
        } else {
          window.location.href = '../Capy/games.html';
        }
      });
    }

    window.addEventListener('capyGameStart', () => {
      applyVolume(bgMusic);
      try { bgMusic.play(); } catch (e) {}
    });

    updateBars();
  }

  window.CapyBattle = CapyBattle;

  if (document.getElementById('attack-btn')) {
    CapyBattle();
  }
})();
