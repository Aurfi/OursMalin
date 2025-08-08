(() => {
  function CapyBattle({
    playerImg = document.getElementById('player'),
    enemyImg = document.getElementById('enemy'),
    playerHpEl = document.getElementById('player-hp'),
    enemyHpEl = document.getElementById('enemy-hp'),
    playerNameEl = document.getElementById('player-name'),
    enemyNameEl = document.getElementById('enemy-name'),
    msgEl = document.getElementById('message'),
    attackBtn = document.getElementById('attack-btn'),
    menuBtn = document.getElementById('menu-btn'),
    resultOverlay = document.getElementById('result-overlay'),
    restartBtn = document.getElementById('restart-btn'),
    resultText = document.getElementById('result-text'),
    starImg = resultOverlay ? resultOverlay.querySelector('.star') : null,
    onEnd = null,
    menuAction = null,
    playerName = 'Capy',
    enemyName = 'Ennemi',
    playerHpStart = 100,
    enemyHpStart = 100
  } = {}) {
    let playerHp = playerHpStart;
    let enemyHp = enemyHpStart;
    if (playerNameEl) playerNameEl.textContent = playerName;
    if (enemyNameEl) enemyNameEl.textContent = enemyName;
    let inBattle = true;
    let buttons = [];
    let selectedIdx = 0;
    let handleKey;

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

    function updateFocus() {
      buttons.forEach((btn, i) => {
        if (!btn) return;
        if (i === selectedIdx) {
          btn.classList.add('selected');
          btn.focus();
        } else {
          btn.classList.remove('selected');
        }
      });
    }

    function setupKeyboard() {
      buttons = [attackBtn, menuBtn].filter(Boolean);
      selectedIdx = 0;
      updateFocus();
      handleKey = (e) => {
        if (inBattle) {
          if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
            selectedIdx = (selectedIdx + buttons.length - 1) % buttons.length;
            updateFocus();
            e.preventDefault();
          } else if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
            selectedIdx = (selectedIdx + 1) % buttons.length;
            updateFocus();
            e.preventDefault();
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            buttons[selectedIdx].click();
          }
        } else if (resultOverlay && resultOverlay.classList.contains('visible')) {
          if ((e.key === 'Enter' || e.key === ' ') && restartBtn) {
            e.preventDefault();
            restartBtn.click();
          }
        }
      };
      document.addEventListener('keydown', handleKey);
    }

    function cleanupKeyboard() {
      document.removeEventListener('keydown', handleKey);
    }

    function updateBars() {
      if (playerHpEl) playerHpEl.style.height = `${playerHp}%`;
      if (enemyHpEl) enemyHpEl.style.height = `${enemyHp}%`;
    }

    function showMessage(text) {
      if (msgEl) msgEl.textContent = text;
    }

    function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

    async function enemyAttack() {
      if (!inBattle) return;
      showMessage(`${enemyName} attaque !`);
      enemyImg.classList.add('enemy-attack-anim');
      attackSound.currentTime = 0;
      attackSound.play();
      const dmg = Math.floor(Math.random() * 15) + 5;
      await delay(300);
      enemyImg.classList.remove('enemy-attack-anim');
      playerImg.classList.add('player-hit');
      playerHp = Math.max(0, playerHp - dmg);
      updateBars();
      showMessage(`${enemyName} inflige ${dmg} dégâts !`);
      await delay(300);
      playerImg.classList.remove('player-hit');
      if (playerHp <= 0) {
        endBattle(false);
      } else {
        attackBtn.disabled = false;
      }
    }

    async function playerAttack() {
      if (!inBattle) return;
      attackBtn.disabled = true;
      showMessage(`${playerName} attaque !`);
      playerImg.classList.add('attack-anim');
      attackSound.currentTime = 0;
      attackSound.play();
      const dmg = Math.floor(Math.random() * 15) + 5;
      await delay(300);
      playerImg.classList.remove('attack-anim');
      enemyImg.classList.add('enemy-hit');
      enemyHp = Math.max(0, enemyHp - dmg);
      updateBars();
      showMessage(`${playerName} inflige ${dmg} dégâts !`);
      await delay(300);
      enemyImg.classList.remove('enemy-hit');
      if (enemyHp <= 0) {
        endBattle(true);
      } else {
        await enemyAttack();
      }
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
        buttons = [restartBtn];
        selectedIdx = 0;
        updateFocus();
        restartBtn.textContent = 'Continuer';
        restartBtn.addEventListener('click', () => {
          cleanupKeyboard();
          if (resultOverlay) resultOverlay.classList.remove('visible');
          if (typeof onEnd === 'function') onEnd(victory);
        }, { once: true });
      } else if (typeof onEnd === 'function') {
        cleanupKeyboard();
        onEnd(victory);
      }
    }

    if (attackBtn) {
      attackBtn.addEventListener('click', playerAttack);
    }
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        cleanupKeyboard();
        if (typeof menuAction === 'function') {
          menuAction();
        } else {
          window.location.href = '../Capy/games.html';
        }
      });
    }

    setupKeyboard();

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
