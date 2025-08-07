// Script pour la sélection des niveaux de Super Capy
document.addEventListener('DOMContentLoaded', () => {
  // Le jeu Super Capy comporte désormais 30 niveaux.  Ce nombre doit être
  // cohérent avec la génération automatique des niveaux dans platform.js.
  // Nombre total de niveaux pour Super Capy : augmenté à 45 pour
  // offrir davantage de défis aux joueurs.  Le fichier platform.js
  // génère dynamiquement les niveaux supplémentaires.
  const TOTAL_LEVELS = 45;
  // Récupérer le niveau le plus élevé débloqué.  La valeur est stockée dans
  // localStorage sous la clé capyPlatformMaxLevel.  Si rien n'est stocké,
  // seul le niveau 1 est disponible.
  let maxUnlocked = 1;
  try {
    const stored = localStorage.getItem('capyPlatformMaxLevel');
    if (stored !== null) maxUnlocked = parseInt(stored, 10) || 1;
  } catch (e) {
    maxUnlocked = 1;
  }
  const levelGrid = document.getElementById('level-grid');
  // Définir le nombre de colonnes selon la largeur de l'écran pour un agencement
  // flexible.  Par défaut, 4 colonnes.
  const cols = 4;
  levelGrid.style.display = 'grid';
  levelGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  levelGrid.style.gap = '12px';
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const cell = document.createElement('button');
    cell.textContent = i;
    cell.className = 'level-cell btn';
    if (i > maxUnlocked) {
      cell.disabled = true;
      cell.classList.add('level-locked');
    } else {
      cell.addEventListener('click', () => {
        window.location.href = `platform.html?level=${i}`;
      });
    }
    levelGrid.appendChild(cell);
  }
  // Bouton retour
  const backBtn = document.getElementById('back-to-menu');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Rediriger vers le nouveau menu principal situé dans le dossier Capy
      // Corriger le lien pour revenir au menu depuis capy/supercapy.html
      window.location.href = '../Capy/games.html';
    });
  }
});