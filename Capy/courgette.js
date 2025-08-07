(() => {
  /**
   * Courgette Crush – mini‑jeu de type match‑3 amélioré.
   * Le joueur déplace des légumes adjacents pour former des lignes ou colonnes
   * de trois éléments ou plus.  Des animations visuelles et sonores sont
   * ajoutées pour rendre l’expérience plus vivante : les échanges sont
   * animés, les disparitions se font en fondu et un effet « feu d’artifice »
   * est déclenché lorsqu’au moins cinq pièces disparaissent simultanément.
   */
  const canvas = document.getElementById('courgetteCanvas');
  const ctx = canvas.getContext('2d');
  // Taille de la grille (8×8).  Les cellules sont recalculées en fonction de
  // la taille disponible à l'écran.  Nous déclarons cellSize en dehors de
  // resize() afin qu'il soit accessible dans drawBoard.
  const rows = 8;
  const cols = 8;
  let cellSize;

  /**
   * Ajuste dynamiquement la taille du canvas en fonction de la taille
   * de l'écran et de l'orientation.  En mode portrait le plateau est
   * affiché au-dessus de la barre latérale, tandis qu'en mode paysage
   * ils sont côte à côte.  La fonction calcule également la taille
   * des cellules (cellSize) utilisée par drawBoard pour positionner
   * correctement les images.
   */
  function resize() {
    const container = document.getElementById('courgette-container');
    const sidebar = container.querySelector('.courgette-sidebar');
    const portrait = window.innerHeight > window.innerWidth;
    let boardSize;
    if (portrait) {
      // Orienté verticalement : le plateau occupe la largeur de l'écran
      container.style.flexDirection = 'column';
      // Taille du plateau : 90 % de la largeur ou 65 % de la hauteur
      boardSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.65);
      // La barre latérale prend toute la largeur sous le plateau
      sidebar.style.width = '100%';
      sidebar.style.alignSelf = 'center';
    } else {
      // Orienté horizontalement : plateau à gauche, barre latérale à droite
      container.style.flexDirection = 'row';
      sidebar.style.width = '';
      sidebar.style.alignSelf = '';
      // Taille du plateau : limitée par la hauteur (80 %) et la largeur (60 %)
      boardSize = Math.min(window.innerHeight * 0.8, window.innerWidth * 0.6);
    }
    // Appliquer la taille en CSS pour l'affichage
    canvas.style.width = boardSize + 'px';
    canvas.style.height = boardSize + 'px';
    // Calcule la taille d'une cellule en pixels réels et ajuste les
    // dimensions internes du canvas (attributs width/height) pour une
    // meilleure précision de dessin.
    // Utiliser getBoundingClientRect pour obtenir la taille réelle après
    // l'application des styles.
    const rect = canvas.getBoundingClientRect();
    cellSize = Math.floor(Math.min(rect.width, rect.height) / cols);
    canvas.width = cellSize * cols;
    canvas.height = cellSize * rows;
    // Redessiner le plateau avec la nouvelle taille
    drawBoard();
  }

  // Appliquer le redimensionnement initial et lors des changements de taille
  window.addEventListener('resize', resize);

  // Ne pas appeler resize() immédiatement : sur certains navigateurs,
  // l'élément canvas n'a pas encore de dimensions lors du chargement du
  // script.  Nous attendons que le DOM soit prêt avant de calculer
  // la taille du plateau.
  document.addEventListener('DOMContentLoaded', () => {
    resize();
  });

  // Rendre la fonction accessible globalement afin que le script
  // orientation.js puisse l'invoquer lorsqu'il détecte un changement
  // d'orientation.  Sans cette affectation, resize() reste local à
  // l'IIFE et ne peut être appelée depuis l'extérieur.
  window.resize = resize;

  // La partie ne démarre qu'une fois toutes les images chargées.  Ne pas
  // démarrer prématurément pour éviter un plateau vide si les SVG ne
  // sont pas encore prêts.  La fonction startGame() sera appelée
  // automatiquement par onImageLoad() plus bas.

  // Images des légumes – versions détourées stockées dans assets/
  // Fichiers des légumes en format SVG.  L'usage de SVG garantit une
  // netteté parfaite quel que soit le zoom ou la taille du plateau.
  // Utiliser des fichiers PNG pour les légumes.  Les SVG peuvent poser
  // problème lorsqu'ils sont dessinés directement sur un canvas.  Les
  // PNG détourés conservent une bonne qualité tout en étant compatibles
  // avec drawImage().
  const vegNames = [
    'veg_carrot_final.png',
    'veg_tomato_final.png',
    'veg_potato_final.png',
    'veg_pepper_final.png',
    'veg_courgette_final.png'
  ];
  // Créer et précharger les objets Image
  const vegImgs = vegNames.map((src) => {
    const img = new Image();
    img.src = 'assets/' + src;
    return img;
  });

  /**
   * Images des pouvoirs spéciaux.  Lorsque le joueur aligne quatre légumes ou
   * plus, un bonbon spécial est généré.  Pour conserver la logique de
   * Candy Crush, nous distinguons deux types :
   *  - Les arrosoirs colorés (un par type de légume), qui effacent la ligne
   *    ou la colonne entière lorsqu'ils sont combinés à un match.
   *  - Le soleil (bonbon ultra puissant) qui efface tout le plateau.
   *
   * Les fichiers des arrosoirs et du soleil seront générés et placés dans
   * assets/.  Leur nom suit le modèle power_watering_X.png où X est
   * l'index du légume (0..4), et power_sun.png pour le soleil.
   */
  // Images des pouvoirs spéciaux : utiliser des PNG pour assurer une
  // compatibilité avec drawImage() sur tous les navigateurs.  Un
  // arrosoir est généré pour chaque couleur de légume (orange, rouge,
  // marron, jaune, vert).  Le soleil multicolore est également un
  // PNG qui contient un dégradé arc‑en‑ciel.
  const powerWaterNames = [
    'power_watering_0.png',
    'power_watering_1.png',
    'power_watering_2.png',
    'power_watering_3.png',
    'power_watering_4.png'
  ];
  const powerWaterImgs = powerWaterNames.map((src) => {
    const img = new Image();
    img.src = 'assets/' + src;
    return img;
  });
  const sunImg = new Image();
  // Utiliser la version PNG du soleil pour un affichage sans problème sur canvas.
  sunImg.src = 'assets/power_sun.png';


  // Plateaux de jeu : valeurs 0..4 pour identifier l’image correspondante.
  /**
   * Le plateau de jeu contient des codes numériques pour représenter les
   * différentes pièces :
   *   0..4    – légumes normaux (carotte, tomate, etc.)
   *   5..9    – arrosoirs rayés horizontaux qui effacent la ligne complète (indice couleur = code % 5)
   *   10..14  – arrosoirs rayés verticaux qui effacent la colonne (indice couleur = code % 5)
   *   15      – soleil (bombe de couleur) qui efface le plateau entier lorsqu’il est activé ou combiné
   *   16..20  – pelles emballées (bonbons emballés) qui explosent en 3×3 autour d’elles lorsque
   *             elles sont activées (indice couleur = code % 5)
   *   21..25  – légumes géants (poisson 2×2) qui ciblent et détruisent une pièce aléatoire lors de leur activation
   */
  let board = [];
  let selected = null;
  let score = 0;
  let highScore = 0;
  // Nombre maximum de mouvements pour une partie.  Le joueur dispose
  // de ce nombre de coups pour réaliser le meilleur score possible.
  const maxMoves = 30;
  let movesLeft = maxMoves;

  // Il n'y a plus de minuteur : la durée de la partie dépend
  // uniquement du nombre de mouvements restants.  Les variables
  // timeLeft et timerId sont donc supprimées.

  // Indique si une animation est en cours (échange ou disparition).  Les
  // clics sont ignorés pendant les animations pour éviter les conflits.
  let animating = false;

  // Objets audio.  Les fichiers sont des place‑holders silencieux qui
  // pourront être remplacés par de véritables sons sans changer le code.
  const ambient = new Audio('assets/sounds/ambient_courgette.wav');
  ambient.loop = true;
  const moveSound = new Audio('assets/sounds/move.wav');
  const invalidSound = new Audio('assets/sounds/invalid.wav');
  const matchSound = new Audio('assets/sounds/match.wav');
  const fireworksSound = new Audio('assets/sounds/fireworks.wav');

  // Récupérer le volume global enregistré par le menu (0..1)
  function getGlobalVolume() {
    let v = 0.5;
    try {
      const stored = localStorage.getItem('capyGlobalVolume');
      if (stored !== null) v = parseFloat(stored);
    } catch (e) {}
    return isNaN(v) ? 0.5 : v;
  }

  // Applique le volume à toutes les pistes
  function applyVolume() {
    const vol = isMuted ? 0 : getGlobalVolume();
    [ambient, moveSound, invalidSound, matchSound, fireworksSound].forEach((aud) => {
      aud.volume = vol;
    });
  }

  let isMuted = false;
  // Bouton muet
  const volumeBtn = document.getElementById('volume-toggle');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      volumeBtn.textContent = isMuted ? '🔇' : '🔊';
      applyVolume();
      if (isMuted) {
        ambient.pause();
      } else {
        ambient.play();
      }
    });
  }

  // Élément affichant le nombre de mouvements restants.  Il est mis à
  // jour à chaque coup.
  const movesLeftEl = document.getElementById('moves-left');
  // Élément affichant le score en temps réel
  const scoreEl = document.getElementById('courgette-score');
  function updateMovesDisplay() {
    if (movesLeftEl) movesLeftEl.textContent = movesLeft;
  }

  /**
   * Met à jour l'affichage du score.  Cette fonction est appelée après
   * chaque combinaison afin que le joueur puisse suivre sa progression.
   */
  function updateScoreDisplay() {
    if (scoreEl) scoreEl.textContent = score;
  }

  // Initialiser le plateau sans combinaisons initiales
  function initBoard() {
    board = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(randomVeg());
      board.push(row);
    }
    // Supprimer d’éventuelles combinaisons initiales
    while (true) {
      const groups = findMatchGroups();
      // convertir les groupes en liste plate de positions
      let flat = [];
      groups.forEach((g) => {
        g.cells.forEach((p) => flat.push(p));
      });
      if (flat.length === 0) break;
      removeMatchesImmediate(flat);
      dropTilesImmediate();
      fillBoardImmediate();
    }
  }

  function randomVeg() {
    return Math.floor(Math.random() * vegImgs.length);
  }

  /**
   * Convertit une couleur hexadécimale (#rrggbb) en objet {r,g,b} avec
   * valeurs dans [0,255].
   * @param {string} hex Hexadecimal color code (#rrggbb)
   */
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }

  /**
   * Ajuste la luminosité d'une couleur en espace HSL.  Un facteur
   * positif éclaircit la couleur, un facteur négatif l'assombrit.
   * @param {string} hex Couleur hexadécimale d'entrée
   * @param {number} factor Valeur entre -1 et 1
   * @returns {string} Nouvelle couleur hexadécimale
   */
  function adjustColor(hex, factor) {
    // Convertir en HSL
    const { r, g, b } = hexToRgb(hex);
    let rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    let h, s, l;
    l = (max + min) / 2;
    if (max === min) {
      h = s = 0; // achromatique
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rn:
          h = (gn - bn) / d + (gn < bn ? 6 : 0);
          break;
        case gn:
          h = (bn - rn) / d + 2;
          break;
        case bn:
          h = (rn - gn) / d + 4;
          break;
      }
      h /= 6;
    }
    // Ajuster luminosité
    l = Math.min(1, Math.max(0, l + factor));
    // Convertir en RGB
    let r2, g2, b2;
    if (s === 0) {
      r2 = g2 = b2 = l;
    } else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r2 = hue2rgb(p, q, h + 1 / 3);
      g2 = hue2rgb(p, q, h);
      b2 = hue2rgb(p, q, h - 1 / 3);
    }
    const ri = Math.round(r2 * 255);
    const gi = Math.round(g2 * 255);
    const bi = Math.round(b2 * 255);
    return '#' + ri.toString(16).padStart(2, '0') + gi.toString(16).padStart(2, '0') + bi.toString(16).padStart(2, '0');
  }

  /**
   * Dessine un arrosoir stylisé à l'intérieur d'une cellule.  Le dessin
   * s'inspire du fichier SVG d'origine et est mis à l'échelle pour
   * s'adapter à la taille de la cellule.  Les couleurs sont
   * paramétrables afin de générer un arrosoir par type de légume.
   * @param {CanvasRenderingContext2D} ctx Contexte de rendu
   * @param {number} x Coin supérieur gauche de la cellule
   * @param {number} y Coin supérieur gauche de la cellule
   * @param {number} size Taille d'une cellule (côté)
   * @param {string} baseColor Couleur principale de l'arrosoir
   */
  function drawWateringCan(ctx, x, y, size, baseColor) {
    const highlight = adjustColor(baseColor, 0.25);
    const dark = adjustColor(baseColor, -0.4);
    const scale = size / 512;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // Corps principal
    ctx.beginPath();
    ctx.moveTo(180, 200);
    ctx.lineTo(180, 380);
    // courbe bas
    ctx.bezierCurveTo(180, 420, 330, 420, 330, 380);
    ctx.lineTo(330, 200);
    ctx.closePath();
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.stroke();
    // Dessus (ellipse)
    ctx.beginPath();
    ctx.ellipse(256, 200, 70, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = highlight;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 8;
    ctx.fill();
    ctx.stroke();
    // Anse (courbe)
    ctx.beginPath();
    ctx.moveTo(160, 230);
    ctx.bezierCurveTo(80, 140, 400, 140, 340, 230);
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';
    ctx.strokeStyle = dark;
    ctx.stroke();
    // Bec (petite pièce en trapèze)
    ctx.beginPath();
    ctx.moveTo(330, 260);
    ctx.lineTo(380, 220);
    ctx.lineTo(420, 230);
    ctx.lineTo(370, 270);
    ctx.closePath();
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.stroke();
    // Embout rond du bec
    ctx.beginPath();
    ctx.arc(440, 230, 40, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 12;
    ctx.fill();
    ctx.stroke();
    // Trous de l'embout
    const holes = [
      [425, 220],[425,240],[440,220],[440,240],[455,220],[455,240]
    ];
    holes.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = dark;
      ctx.fill();
    });
    ctx.restore();
  }

  /**
   * Dessine un soleil arc‑en‑ciel à l'intérieur d'une cellule.  Ce soleil
   * sert de bonbon spécial puissant qui efface tout le plateau lorsqu'il
   * est activé.  Un dégradé radial multicolore est utilisé pour
   * approcher l'effet d'une boule à facettes.
   * @param {CanvasRenderingContext2D} ctx Contexte de rendu
   * @param {number} x Coin supérieur gauche
   * @param {number} y Coin supérieur gauche
   * @param {number} size Taille du carré
   */
  function drawSun(ctx, x, y, size) {
    ctx.save();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const radius = size * 0.35;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0.0, '#ff5555');
    grad.addColorStop(0.2, '#ffa500');
    grad.addColorStop(0.4, '#ffff55');
    grad.addColorStop(0.6, '#55ff55');
    grad.addColorStop(0.8, '#55aaff');
    grad.addColorStop(1.0, '#cc55ff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    // Dessiner un halo extérieur
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = size * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + size * 0.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dessine une pelle emballée (bonbon emballé) avec un ruban croisé.
   * La forme est une boîte légèrement arrondie avec deux bandes en croix.
   * @param {CanvasRenderingContext2D} ctx Contexte de rendu
   * @param {number} x Coin supérieur gauche
   * @param {number} y Coin supérieur gauche
   * @param {number} size Taille de la cellule
   * @param {string} baseColor Couleur principale
   */
  function drawWrapped(ctx, x, y, size, baseColor) {
    const highlight = adjustColor(baseColor, 0.25);
    const dark = adjustColor(baseColor, -0.4);
    ctx.save();
    // Boîte principale
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = dark;
    ctx.lineWidth = size * 0.05;
    const radius = size * 0.15;
    // Dessiner un rectangle à coins arrondis
    const w = size - 8;
    const h = size - 8;
    const x0 = x + 4;
    const y0 = y + 4;
    ctx.beginPath();
    ctx.moveTo(x0 + radius, y0);
    ctx.lineTo(x0 + w - radius, y0);
    ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + radius);
    ctx.lineTo(x0 + w, y0 + h - radius);
    ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - radius, y0 + h);
    ctx.lineTo(x0 + radius, y0 + h);
    ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - radius);
    ctx.lineTo(x0, y0 + radius);
    ctx.quadraticCurveTo(x0, y0, x0 + radius, y0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Ruban vertical
    ctx.fillStyle = highlight;
    const bandW = size * 0.15;
    ctx.fillRect(x0 + w * 0.45, y0, bandW, h);
    // Ruban horizontal
    ctx.fillRect(x0, y0 + h * 0.45, w, bandW);
    ctx.restore();
  }

  /**
   * Dessine un légume géant (poisson) sous forme de grosse goutte colorée.
   * La forme est une ellipse aplatie qui évoque un poisson ou un gros fruit.
   * @param {CanvasRenderingContext2D} ctx Contexte de rendu
   * @param {number} x Coin supérieur gauche
   * @param {number} y Coin supérieur gauche
   * @param {number} size Taille de la cellule
   * @param {string} baseColor Couleur principale
   */
  function drawBanana(ctx, x, y, size, baseColor) {
    const highlight = adjustColor(baseColor, 0.3);
    const dark = adjustColor(baseColor, -0.4);
    ctx.save();
    // Déplacer et pivoter pour donner une forme incurvée
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(-0.4);
    const w = size * 0.55;
    const h = size * 0.25;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, 0);
    ctx.quadraticCurveTo(0, -h, w * 0.5, 0);
    ctx.quadraticCurveTo(0, h, -w * 0.5, 0);
    ctx.closePath();
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = dark;
    ctx.lineWidth = size * 0.05;
    ctx.fill();
    ctx.stroke();
    // Dessiner un léger éclat sur la partie supérieure pour donner du volume
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, -h * 0.15);
    ctx.quadraticCurveTo(0, -h * 0.4, w * 0.4, -h * 0.15);
    ctx.quadraticCurveTo(0, -h * 0.2, -w * 0.4, -h * 0.15);
    ctx.closePath();
    ctx.fillStyle = highlight;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Dessine des rayures colorées sur un bonbon.  Les rayures sont
   * dessinées au-dessus de la forme principale pour indiquer son
   * orientation (horizontal ou vertical) tout en laissant entrevoir
   * l'arrosoir en dessous.  La couleur est basée sur celle du légume.
   * @param {CanvasRenderingContext2D} ctx Contexte de rendu
   * @param {number} x Coin supérieur gauche
   * @param {number} y Coin supérieur gauche
   * @param {number} size Taille de la cellule
   * @param {'horizontal'|'vertical'} orientation Sens des rayures
   * @param {string} color Couleur principale
   */
  function drawStripes(ctx, x, y, size, orientation, color) {
    ctx.save();
    /*
     * Dessiner des rayures plus visibles.  Afin d’améliorer la lisibilité
     * des bonbons rayés, on augmente l’opacité et la luminosité des
     * bandes.  La couleur est éclaircie d’environ 40 % et la largeur
     * des bandes est légèrement plus importante.  Les rayures ne
     * recouvrent pas entièrement l’arrosoir afin de laisser entrevoir
     * sa forme et sa couleur d’origine.
     */
    ctx.globalAlpha = 0.7;
    // Éclaircir fortement la couleur d’origine pour obtenir une teinte
    // vive.  adjustColor prend une valeur entre -1 et 1 : 0.4 augmente
    // fortement la luminosité.
    ctx.fillStyle = adjustColor(color, 0.4);
    const stripeWidth = size * 0.2;
    if (orientation === 'horizontal') {
      // Dessiner plusieurs bandes horizontales.  Les bandes sont espacées
      // régulièrement et dépassent légèrement des bords pour recouvrir
      // toute la cellule.
      for (let i = 1; i <= 3; i++) {
        const yPos = y + i * size / 4 - stripeWidth / 2;
        ctx.fillRect(x + 1, yPos, size - 2, stripeWidth);
      }
    } else {
      // Bandes verticales
      for (let i = 1; i <= 3; i++) {
        const xPos = x + i * size / 4 - stripeWidth / 2;
        ctx.fillRect(xPos, y + 1, stripeWidth, size - 2);
      }
    }
    ctx.restore();
  }

  /**
   * Dessine le plateau complet en tenant compte des décalages et de l’opacité
   * définis pour l’animation.  Les cellules peuvent posséder des propriétés
   * temporaires : offsetX, offsetY (déplacements en px) et alpha (0..1).
   */
  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Mettre à jour et dessiner les étincelles avant d'afficher les légumes
    updateSparks();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const code = board[r][c];
        if (code === null) continue;
        const x = c * cellSize;
        const y = r * cellSize;
        // Offsets et alpha pour l'animation
        let offX = 0;
        let offY = 0;
        let alpha = 1;
        const key = `${r},${c}`;
        if (animOffsets[key]) {
          offX = animOffsets[key].x;
          offY = animOffsets[key].y;
        }
        if (fadeMap[key] !== undefined) {
          alpha = fadeMap[key];
        }
        // Surbrillance de la sélection
        if (selected && selected.row === r && selected.col === c) {
          ctx.fillStyle = 'rgba(255,255,0,0.35)';
          ctx.fillRect(x, y, cellSize, cellSize);
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        // Sélectionner l'image appropriée en fonction du type de bonbon
        if (code < vegImgs.length) {
          // légume normal
          ctx.drawImage(vegImgs[code], x + offX + 4, y + offY + 4, cellSize - 8, cellSize - 8);
        } else if (code >= 5 && code <= 14) {
          // Arrosoirs rayés (ligne ou colonne) : dessiner l'image puis superposer les rayures
          const colorIndex = code % 5;
          ctx.drawImage(powerWaterImgs[colorIndex], x + offX + 4, y + offY + 4, cellSize - 8, cellSize - 8);
          // Choisir la couleur de base pour les rayures
          const colors = ['#F57C00', '#D32F2F', '#8D6E63', '#FBC02D', '#7CB342'];
          const baseColor = colors[colorIndex] || '#CCCCCC';
          // Orientation des rayures : codes 5..9 → rayures horizontales (efface ligne), 10..14 → verticales (efface colonne)
          const orientation = (code >= 5 && code <= 9) ? 'horizontal' : 'vertical';
          drawStripes(ctx, x + offX, y + offY, cellSize, orientation, baseColor);
        } else if (code === 15) {
          // Soleil
          ctx.drawImage(sunImg, x + offX + 4, y + offY + 4, cellSize - 8, cellSize - 8);
        } else if (code >= 16 && code <= 20) {
          // Pelles emballées : dessiner avec un ruban croisé
          const colorIndex = code % 5;
          const colors = ['#F57C00', '#D32F2F', '#8D6E63', '#FBC02D', '#7CB342'];
          const baseColor = colors[colorIndex] || '#CCCCCC';
          drawWrapped(ctx, x + offX, y + offY, cellSize, baseColor);
        } else if (code >= 21 && code <= 25) {
          // Légumes géants : dessiner une banane stylisée (courbe colorée)
          const colorIndex = code % 5;
          const colors = ['#F57C00', '#D32F2F', '#8D6E63', '#FBC02D', '#7CB342'];
          const baseColor = colors[colorIndex] || '#CCCCCC';
          drawBanana(ctx, x + offX, y + offY, cellSize, baseColor);
        }
        ctx.restore();
      }
    }
  }

  /**
   * Recherche toutes les combinaisons de trois pièces ou plus.  Renvoie un
   * tableau de groupes.  Chaque groupe est un objet {
   *   cells: [{row,col}, ...],
   *   direction: 'horizontal' ou 'vertical',
   *   color: index de couleur 0..4
   * }.  Le code des pièces spéciales (arrosoir ou soleil) est converti
   * en couleur via (code % 5).  Les soleils (code 15) ne participent pas
   * aux combinaisons.
   */
  function findMatchGroups() {
    const groups = [];
    // Horizontal
    for (let r = 0; r < rows; r++) {
      let count = 1;
      for (let c = 1; c < cols; c++) {
        const val = board[r][c];
        const prev = board[r][c - 1];
        // Calcule la couleur (code % 5) pour comparer les couleurs identiques
        const valColor = (val !== null && val !== 15) ? val % 5 : null;
        const prevColor = (prev !== null && prev !== 15) ? prev % 5 : null;
        if (valColor !== null && prevColor !== null && valColor === prevColor) {
          count++;
        } else {
          if (count >= 3) {
            const cells = [];
            for (let k = 0; k < count; k++) {
              cells.push({ row: r, col: c - 1 - k });
            }
            groups.push({ cells: cells, direction: 'horizontal', color: prevColor });
          }
          count = 1;
        }
      }
      if (count >= 3) {
        const cells = [];
        for (let k = 0; k < count; k++) {
          cells.push({ row: r, col: cols - 1 - k });
        }
        const colorIdx = (board[r][cols - 1] !== null && board[r][cols - 1] !== 15) ? board[r][cols - 1] % 5 : null;
        groups.push({ cells: cells, direction: 'horizontal', color: colorIdx });
      }
    }
    // Vertical
    for (let c = 0; c < cols; c++) {
      let count = 1;
      for (let r = 1; r < rows; r++) {
        const val = board[r][c];
        const prev = board[r - 1][c];
        const valColor = (val !== null && val !== 15) ? val % 5 : null;
        const prevColor = (prev !== null && prev !== 15) ? prev % 5 : null;
        if (valColor !== null && prevColor !== null && valColor === prevColor) {
          count++;
        } else {
          if (count >= 3) {
            const cells = [];
            for (let k = 0; k < count; k++) {
              cells.push({ row: r - 1 - k, col: c });
            }
            groups.push({ cells: cells, direction: 'vertical', color: prevColor });
          }
          count = 1;
        }
      }
      if (count >= 3) {
        const cells = [];
        for (let k = 0; k < count; k++) {
          cells.push({ row: rows - 1 - k, col: c });
        }
        const colorIdx = (board[rows - 1][c] !== null && board[rows - 1][c] !== 15) ? board[rows - 1][c] % 5 : null;
        groups.push({ cells: cells, direction: 'vertical', color: colorIdx });
      }
    }
    return groups;
  }

  /**
   * Supprime immédiatement les positions indiquées sans animation et met à
   * jour le score.  Utilisé pendant l’initialisation pour préparer un
   * plateau sans alignements.
   */
  function removeMatchesImmediate(matches) {
    let removed = 0;
    matches.forEach(({ row, col }) => {
      if (board[row][col] !== null) {
        board[row][col] = null;
        removed++;
      }
    });
    score += removed;
  }

  // Tableaux temporaires utilisés pour l’animation
  let animOffsets = {};
  let fadeMap = {};

  // Effets de feux d'artifice
  // Le tableau `sparks` contient des particules représentant de petites
  // étincelles colorées qui s'éloignent de leur centre. Chaque objet
  // possède une position de départ (x,y), un angle, une vitesse, une
  // couleur, une heure de début et une durée de vie (life).
  const sparks = [];

  /**
   * Met à jour et dessine toutes les étincelles.  Les particules sont
   * dessinées sous forme de petits segments colorés qui s'estompent avec le
   * temps.  Lorsqu'une particule dépasse sa durée de vie, elle est
   * retirée du tableau.
   */
  function updateSparks() {
    const now = performance.now();
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      const t = (now - sp.start) / sp.life;
      if (t >= 1) {
        sparks.splice(i, 1);
        continue;
      }
      // Position courante en fonction du temps et de la vitesse
      const dist = sp.speed * t;
      const px = sp.x + Math.cos(sp.angle) * dist;
      const py = sp.y + Math.sin(sp.angle) * dist;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(sp.angle) * 5, py + Math.sin(sp.angle) * 5);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Déclenche un feu d’artifice en créant des étincelles aux positions des
   * matchs.  Chaque cellule génère plusieurs particules de couleurs
   * différentes qui se déplacent vers l'extérieur.
   */
  function triggerFireworks(matches) {
    const colors = ['#FFD700', '#FF6F00', '#FFEA00', '#FF8F00', '#FFC107'];
    matches.forEach(({ row, col }) => {
      const cx = col * cellSize + cellSize / 2;
      const cy = row * cellSize + cellSize / 2;
      const count = 8;
      for (let k = 0; k < count; k++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 80 + 40;
        sparks.push({
          x: cx,
          y: cy,
          angle: angle,
          speed: speed,
          start: performance.now(),
          life: 600,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    });
  }

  /**
   * Déclenche une pluie de confettis sur l'écran.  Des petites pastilles
   * colorées sont générées et tombent du haut de la fenêtre vers le bas
   * avec une rotation aléatoire.  Chaque confetti est supprimé après
   * l’achèvement de son animation.  Cette fonction utilise des éléments
   * HTML positionnés en fixe et ne dépend pas du canvas.
   */
  function triggerConfettiEffect(count = 30) {
    const colors = ['#FFC107', '#FF5722', '#FFEB3B', '#8BC34A', '#00BCD4', '#9C27B0'];
    for (let i = 0; i < count; i++) {
      const div = document.createElement('div');
      div.className = 'confetti-piece';
      // Taille aléatoire entre 4 et 10 px
      const size = 4 + Math.random() * 6;
      div.style.width = `${size}px`;
      div.style.height = `${size}px`;
      // Couleur aléatoire
      div.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      // Position horizontale au hasard sur toute la fenêtre
      div.style.left = Math.random() * window.innerWidth + 'px';
      // Durée d'animation entre 1 et 2 secondes
      const duration = 1 + Math.random();
      div.style.animationDuration = `${duration}s`;
      // Rotation initiale aléatoire
      const initialRotate = Math.floor(Math.random() * 360);
      div.style.transform = `rotate(${initialRotate}deg)`;
      document.body.appendChild(div);
      // Supprimer l'élément après son animation
      setTimeout(() => {
        div.remove();
      }, duration * 1000);
    }
  }

  /**
   * Anime un mouvement invalide en secouant légèrement les deux cellules
   * sélectionnées.  Cette animation dure 200 ms et crée un effet de
   * vibration horizontal.  La fonction callback est appelée à la fin.
   */
  function animateInvalid(a, b, callback) {
    animating = true;
    const startTime = performance.now();
    const dur = 200;
    function step(now) {
      const t = Math.min(1, (now - startTime) / dur);
      const shake = Math.sin(t * Math.PI * 4) * cellSize * 0.05;
      animOffsets[`${a.row},${a.col}`] = { x: shake, y: 0 };
      animOffsets[`${b.row},${b.col}`] = { x: -shake, y: 0 };
      drawBoard();
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        delete animOffsets[`${a.row},${a.col}`];
        delete animOffsets[`${b.row},${b.col}`];
        animating = false;
        callback();
      }
    }
    requestAnimationFrame(step);
  }

  /**
   * Anime l’échange entre deux cellules adjacentes.  L’animation dure
   * environ 200 ms et déplace les deux pièces vers la position de l’autre.
   * Une fois l’animation terminée, la fonction callback est appelée.
   */
  function animateSwap(a, b, callback) {
    animating = true;
    const startTime = performance.now();
    const dur = 200;
    const startOffA = { x: 0, y: 0 };
    const startOffB = { x: 0, y: 0 };
    const dx = (b.col - a.col) * cellSize;
    const dy = (b.row - a.row) * cellSize;
    function step(now) {
      const t = Math.min(1, (now - startTime) / dur);
      // Easing (smooth)
      const ease = t * (2 - t);
      animOffsets[`${a.row},${a.col}`] = {
        x: dx * ease,
        y: dy * ease
      };
      animOffsets[`${b.row},${b.col}`] = {
        x: -dx * ease,
        y: -dy * ease
      };
      drawBoard();
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Reset offsets
        delete animOffsets[`${a.row},${a.col}`];
        delete animOffsets[`${b.row},${b.col}`];
        animating = false;
        callback();
      }
    }
    requestAnimationFrame(step);
  }

  /**
   * Anime la disparition des pièces listées.  Chaque pièce s’efface sur
   * environ 300 ms.  Lorsque toutes les pièces sont effacées, elles sont
   * remplacées par des valeurs null et on appelle callback.  Si au moins 5
   * pièces sont supprimées, un effet de feu d’artifice est joué.
   */
  function animateRemoval(matches, callback) {
    animating = true;
    const startTime = performance.now();
    const dur = 300;
    // Initialise la carte d’opacité
    matches.forEach(({ row, col }) => {
      fadeMap[`${row},${col}`] = 1;
    });
    // Jouer le son de disparition et déclencher les effets spéciaux.  Si
    // au moins cinq pièces disparaissent, jouer un son de feu d'artifice
    // et générer des étincelles.  Les confettis sont affichés quelle que
    // soit la configuration audio afin d'améliorer l'expérience visuelle.
    if (!isMuted) {
      matchSound.currentTime = 0;
      matchSound.play();
      if (matches.length >= 5) {
        fireworksSound.currentTime = 0;
        fireworksSound.play();
        triggerFireworks(matches);
      }
    } else {
      // Si le son est coupé, déclencher quand même les étincelles visuelles
      if (matches.length >= 5) {
        triggerFireworks(matches);
      }
    }
    // Déclencher l'effet de confettis si au moins cinq pièces disparaissent
    if (matches.length >= 5) {
      // Augmenter le nombre de confettis pour un rendu plus festif
      // Plus la combinaison est grande, plus on envoie de confettis.  Le nombre
      // de confettis est proportionnel aux pièces supprimées, avec un minimum
      // généreux pour les petites cascades.
      const confettiCount = Math.max(100, matches.length * 15);
      triggerConfettiEffect(confettiCount);
    }
    function step(now) {
      const t = Math.min(1, (now - startTime) / dur);
      const alpha = 1 - t;
      matches.forEach(({ row, col }) => {
        fadeMap[`${row},${col}`] = alpha;
      });
      drawBoard();
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Après le fondu, retirer les pièces et nettoyer les cartes
        matches.forEach(({ row, col }) => {
          board[row][col] = null;
          delete fadeMap[`${row},${col}`];
        });
        animating = false;
        callback();
      }
    }
    requestAnimationFrame(step);
  }

  /**
   * Fait tomber les pièces sans animation.  Utilisé après une disparition.
   */
  function dropTilesImmediate() {
    for (let c = 0; c < cols; c++) {
      let pointer = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (board[r][c] !== null) {
          board[pointer][c] = board[r][c];
          if (pointer !== r) board[r][c] = null;
          pointer--;
        }
      }
    }
  }

  /**
   * Fait tomber les pièces avec animation.  Chaque pièce tombe à la vitesse
   * d’une cellule par 120 ms environ.  Lorsqu’aucune pièce ne tombe
   * davantage, on appelle callback.
   */
  function dropTilesAnimated(callback) {
    animating = true;
    const dropSpeed = cellSize / 120; // pixels per ms
    // Prépare une liste de chutes pour chaque colonne
    const drops = [];
    for (let c = 0; c < cols; c++) {
      let pointer = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (board[r][c] !== null) {
          if (pointer !== r) {
            drops.push({ fromRow: r, toRow: pointer, col: c });
          }
          pointer--;
        }
      }
    }
    const startTime = performance.now();
    function step(now) {
      const dt = now - startTime;
      let stillDropping = false;
      // Reset offsets
      animOffsets = {};
      drops.forEach((d) => {
        const totalDist = (d.toRow - d.fromRow) * cellSize;
        const currentDist = Math.min(totalDist, dt * dropSpeed);
        if (currentDist < totalDist) stillDropping = true;
        animOffsets[`${d.fromRow},${d.col}`] = { x: 0, y: currentDist };
      });
      drawBoard();
      if (stillDropping) {
        requestAnimationFrame(step);
      } else {
        // Mettre à jour les données réelles
        for (let c = 0; c < cols; c++) {
          let pointer = rows - 1;
          for (let r = rows - 1; r >= 0; r--) {
            if (board[r][c] !== null) {
              board[pointer][c] = board[r][c];
              if (pointer !== r) board[r][c] = null;
              pointer--;
            }
          }
        }
        animOffsets = {};
        animating = false;
        callback();
      }
    }
    if (drops.length === 0) {
      callback();
    } else {
      requestAnimationFrame(step);
    }
  }

  /**
   * Remplit les cellules nulles avec de nouveaux légumes (animation).  Les
   * nouveaux légumes tombent depuis l’extérieur du plateau.  Ensuite,
   * callback est appelé.
   */
  function fillBoardAnimated(callback) {
    animating = true;
    const newEntries = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (board[r][c] === null) {
          board[r][c] = randomVeg();
          newEntries.push({ row: r, col: c });
        }
      }
    }
    const startTime = performance.now();
    const dropSpeed = cellSize / 120;
    function step(now) {
      const dt = now - startTime;
      let stillDropping = false;
      animOffsets = {};
      newEntries.forEach((n) => {
        const totalDist = (n.row + 1) * cellSize;
        const currentDist = Math.max(0, totalDist - dt * dropSpeed);
        if (currentDist > 0) stillDropping = true;
        animOffsets[`${n.row},${n.col}`] = { x: 0, y: -currentDist };
      });
      drawBoard();
      if (stillDropping) {
        requestAnimationFrame(step);
      } else {
        animOffsets = {};
        animating = false;
        callback();
      }
    }
    if (newEntries.length === 0) {
      callback();
    } else {
      requestAnimationFrame(step);
    }
  }

  /**
   * Remplit les cellules nulles sans animation.  Utilisé pour
   * l’initialisation et les tests rapides.
   */
  function fillBoardImmediate() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] === null) board[r][c] = randomVeg();
      }
    }
  }

  /**
   * Gère le clic du joueur.  Sélectionne une cellule ou tente un échange
   * avec la cellule précédemment sélectionnée.  Si l’échange ne produit
   * aucune combinaison, l’échange est annulé et un son d’erreur est joué.
   */
  function handleClick(event) {
    // Si une animation est en cours ou si le joueur n'a plus de mouvements, ignorer le clic
    if (animating || movesLeft <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const cell = { row, col };
    if (!selected) {
      selected = cell;
      drawBoard();
    } else {
      if (selected.row === cell.row && selected.col === cell.col) {
        selected = null;
        drawBoard();
      } else if (Math.abs(selected.row - cell.row) + Math.abs(selected.col - cell.col) === 1) {
        // Tentative d’échange
        const a = selected;
        const b = cell;
        // Jouer le son de déplacement
        if (!isMuted) {
          moveSound.currentTime = 0;
          moveSound.play();
        }
        // Décrémenter le nombre de mouvements et mettre à jour l'affichage
        movesLeft--;
        updateMovesDisplay();
        // Déterminer si ce coup sera le dernier afin de déclencher la fin
        // de partie après l’animation
        const noMovesAfter = movesLeft <= 0;
        swapCells(a, b);
        animateSwap(a, b, () => {
          const groups = findMatchGroups();
          if (groups.length > 0) {
            // Élimination puis chute et remplissage tant qu’il y a des matches
            chainRemoval(groups, a, b, true);
          } else {
            // Aucun alignement classique.  On examine les valeurs échangées pour
            // déterminer si un ou plusieurs bonbons spéciaux sont impliqués et
            // appliquer des interactions inspirées de Candy Crush.
            const valA = board[a.row][a.col];
            const valB = board[b.row][b.col];
            // Liste de toutes les cellules du plateau, utilisée pour les effets
            // couvrant l'intégralité du plateau.
            function getAllCells() {
              const all = [];
              for (let rr = 0; rr < rows; rr++) {
                for (let cc = 0; cc < cols; cc++) {
                  if (board[rr][cc] !== null) {
                    all.push({ row: rr, col: cc });
                  }
                }
              }
              return all;
            }
            // Fonction utilitaire pour construire un groupe à partir d'une liste de cellules
            function groupFromCells(cells) {
              return [{ cells: cells, direction: 'horizontal', color: null }];
            }
            // Déterminer si les deux pièces échangées sont des bonbons spéciaux
            const isSunA = valA === 15;
            const isSunB = valB === 15;
            // Sont considérées comme bonbons spéciaux toutes les valeurs ≥5 à l'exception du soleil (15).
            const isSpecA = valA !== null && valA >= 5 && valA !== 15;
            const isSpecB = valB !== null && valB >= 5 && valB !== 15;
            let performed = false;
            // Combinaison de deux soleils : effacer tout le plateau
            if (isSunA && isSunB) {
              const cells = getAllCells();
              chainRemoval(groupFromCells(cells), null, null, false);
              performed = true;
            } else if ((isSunA && valB !== null && valB < 5) || (isSunB && valA !== null && valA < 5)) {
              // Soleil + légume normal : effacer toutes les pièces de cette couleur
              const color = isSunA ? (valB % 5) : (valA % 5);
              const cells = [];
              for (let rr = 0; rr < rows; rr++) {
                for (let cc = 0; cc < cols; cc++) {
                  const v = board[rr][cc];
                  if (v !== null && (v % 5) === color) {
                    cells.push({ row: rr, col: cc });
                  }
                }
              }
              chainRemoval(groupFromCells(cells), null, null, false);
              performed = true;
            } else if ((isSunA && isSpecB) || (isSunB && isSpecA)) {
              // Soleil avec un autre bonbon spécial : effacer tout le plateau
              const cells = getAllCells();
              chainRemoval(groupFromCells(cells), null, null, false);
              performed = true;
            } else if (isSpecA && isSpecB) {
              // Deux bonbons spéciaux.  Déterminer le type de combinaison.
              // Extraire les valeurs pour traiter en fonction de leur type.
              function isStriped(val) {
                return val >= 5 && val <= 14;
              }
              function isWrapped(val) {
                return val >= 16 && val <= 20;
              }
              function isFish(val) {
                return val >= 21 && val <= 25;
              }
              let specialCells = [];
              const val1 = valA;
              const val2 = valB;
              // Stripe + stripe → croix : ligne de la première pièce et colonne de la seconde
              if (isStriped(val1) && isStriped(val2)) {
                // Ligne de a et colonne de b
                for (let cc = 0; cc < cols; cc++) {
                  specialCells.push({ row: a.row, col: cc });
                }
                for (let rr = 0; rr < rows; rr++) {
                  specialCells.push({ row: rr, col: b.col });
                }
              } else if ((isStriped(val1) && isWrapped(val2)) || (isWrapped(val1) && isStriped(val2))) {
                // Stripe + wrapped → croix étendue : ligne et colonne du striped + zone 3x3 autour du wrapped
                const stripePos = isStriped(val1) ? a : b;
                const wrapPos = isWrapped(val1) ? a : b;
                // Ligne et colonne selon position du stripe
                for (let cc = 0; cc < cols; cc++) {
                  specialCells.push({ row: stripePos.row, col: cc });
                }
                for (let rr = 0; rr < rows; rr++) {
                  specialCells.push({ row: rr, col: stripePos.col });
                }
                // Zone 3x3 autour du wrapped
                for (let rr = wrapPos.row - 1; rr <= wrapPos.row + 1; rr++) {
                  for (let cc = wrapPos.col - 1; cc <= wrapPos.col + 1; cc++) {
                    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
                      specialCells.push({ row: rr, col: cc });
                    }
                  }
                }
              } else {
                // Toute autre combinaison de spéciaux → effacer tout le plateau
                specialCells = getAllCells();
              }
              chainRemoval(groupFromCells(specialCells), null, null, false);
              performed = true;
            } else if (isSpecA || isSpecB) {
              // Un seul bonbon spécial (arrosoir ou soleil) sans combinaison particulière
              // Appliquer son effet de ligne/colonne ou plateau via un groupe factice
              const specials = [];
              if (isSpecA) specials.push({ row: a.row, col: a.col });
              if (isSpecB) specials.push({ row: b.row, col: b.col });
              const fakeGroups = specials.map((p) => {
                return { cells: [p], direction: 'horizontal', color: null };
              });
              chainRemoval(fakeGroups, null, null, false);
              performed = true;
            }
            if (!performed) {
              // Aucun effet spécial n'est appliqué : annuler le déplacement
              if (!isMuted) {
                invalidSound.currentTime = 0;
                invalidSound.play();
              }
              swapCells(a, b);
              // Animation de retour puis secousse pour indiquer que le déplacement est invalide
              animateSwap(a, b, () => {
                animateInvalid(a, b, () => {
                  selected = null;
                });
              });
            }
          }
          // Si aucun mouvement ne reste après l'échange, terminer la partie
          if (noMovesAfter) {
            // Laisser le temps aux animations de se terminer avant d'afficher
            // l'écran de fin
            setTimeout(endGame, 500);
          }
        });
        selected = null;
      } else {
        // Choisir une nouvelle cellule sans échange
        selected = cell;
        drawBoard();
      }
    }
  }

  /**
   * Supprime les pièces animées, fait tomber et remplit, puis vérifie s’il
   * existe d’autres combinaisons.  Cette fonction appelle elle‑même
   * animateRemoval, dropTilesAnimated et fillBoardAnimated de manière
   * récursive jusqu’à ce qu’il n’y ait plus de combinaisons.
   */
  // Ancienne version de chainRemoval supprimée : voir la nouvelle définition plus bas.

  /**
   * Calcule la valeur en points d'un groupe de longueur donnée.  On attribue
   * davantage de points pour les longues combinaisons afin d'encourager les
   * gros coups.  Cette fonction peut être ajustée pour équilibrer le jeu.
   *
   * @param {number} len Taille du groupe
   * @returns {number} Nombre de points gagnés
   */
  function computeScore(len) {
    if (len < 3) return 0;
    if (len === 3) return 3 * 20; // 60 points pour un alignement de trois
    if (len === 4) return 4 * 25; // 100 points pour quatre pièces
    // Pour 5 ou plus, on augmente nettement la récompense
    return len * 40; // p. ex. 200 points pour cinq
  }

  /**
   * Flatten groups into a unique array of cell positions.  Utilise une
   * table de hachage pour supprimer les doublons.
   *
   * @param {Array} groups Liste de groupes renvoyés par findMatchGroups
   * @returns {Array} Liste de positions uniques {row, col}
   */
  function flattenGroups(groups) {
    const seen = {};
    const out = [];
    groups.forEach((g) => {
      g.cells.forEach((p) => {
        const key = `${p.row},${p.col}`;
        if (!seen[key]) {
          seen[key] = true;
          out.push({ row: p.row, col: p.col });
        }
      });
    });
    return out;
  }

  /**
   * Nouvelle version de chainRemoval.  Cette fonction gère la suppression
   * animée, le calcul du score, la création éventuelle de bonbons spéciaux
   * et le déclenchement de cascades.  Elle prend en paramètre la liste
   * de groupes trouvés par findMatchGroups et les coordonnées du swap qui
   * a déclenché la combinaison.
   *
   * @param {Array} groups Liste de groupes de positions
   * @param {Object|null} originA Case initiale du swap (non utilisée ici)
   * @param {Object|null} originB Case d'arrivée du swap (utilisée pour placer un bonbon spécial)
   * @param {boolean} firstMove Indique s'il s'agit du premier appel après un clic du joueur
   */
  function chainRemoval(groups, originA, originB, firstMove) {
    // Mettre à plat les groupes en liste de positions
    let matchCells = flattenGroups(groups);
    // Mettre à jour le score en fonction des groupes
    groups.forEach((g) => {
      score += computeScore(g.cells.length);
    });
    updateScoreDisplay();
    // Ajouter les effets des bonbons spéciaux présents dans matchCells.  Si un
    // arrosoir ou un soleil est supprimé, on ajoute les cellules de sa
    // ligne/colonne/plateau à la liste et on attribue des points de base
    // (10 par cellule) pour chaque pièce supplémentaire.  Les doublons
    // seront éliminés lors du flatten final.
    let bonusCells = [];
    let bonusScore = 0;
    matchCells.forEach(({ row, col }) => {
      const val = board[row][col];
      if (val === null) return;
      if (val >= 5 && val <= 14) {
        // Arrosoirs rayés (ligne ou colonne)
        if (val >= 5 && val <= 9) {
          // Ligne
          for (let cc = 0; cc < cols; cc++) {
            bonusCells.push({ row: row, col: cc });
          }
        } else {
          // Colonne
          for (let rr = 0; rr < rows; rr++) {
            bonusCells.push({ row: rr, col: col });
          }
        }
      } else if (val === 15) {
        // Soleil : efface tout le plateau
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            bonusCells.push({ row: rr, col: cc });
          }
        }
      } else if (val >= 16 && val <= 20) {
        // Pelle emballée : explosion 3×3 autour de la pièce
        for (let rr = row - 1; rr <= row + 1; rr++) {
          for (let cc = col - 1; cc <= col + 1; cc++) {
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
              bonusCells.push({ row: rr, col: cc });
            }
          }
        }
      } else if (val >= 21 && val <= 25) {
        // Légume géant : sélectionner une position aléatoire non nulle sur le plateau
        // et l'ajouter comme bonus.  On choisit un nombre fixe de cibles
        // (par exemple 3) pour accentuer l'effet sans tout effacer.
        const targets = [];
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            if (board[rr][cc] !== null) targets.push({ row: rr, col: cc });
          }
        }
        const numTargets = Math.min(3, targets.length);
        for (let i = 0; i < numTargets; i++) {
          const idx = Math.floor(Math.random() * targets.length);
          const t = targets.splice(idx, 1)[0];
          bonusCells.push(t);
        }
      }
    });
    // Retirer de bonusCells les positions déjà dans matchCells pour éviter le double comptage
    if (bonusCells.length > 0) {
      const all = matchCells.concat(bonusCells);
      matchCells = flattenGroups([{ cells: all }]);
      // Points supplémentaires pour chaque cellule en bonus
      bonusScore = bonusCells.length * 10;
      score += bonusScore;
      updateScoreDisplay();
    }
    // Déterminer le bonbon spécial à créer lors du premier coup.  La priorité est
    // la suivante : combinaison en T ou L → pelle emballée ; combinaison
    // 2×2 → légume géant ; combinaison de cinq ou plus en ligne droite → soleil ;
    // combinaison de quatre en ligne → arrosoir rayé.
    let specialCode = null;
    // Position où placer le bonbon spécial (ligne, colonne).  Elle est
    // calculée pour apparaître au centre de la ligne ou de la forme qui
    // déclenche la création du bonbon.  Par défaut, on utilisera
    // originB si aucune position n'est trouvée.
    let specialPos = null;
    if (firstMove && originB) {
      /**
       * Détermination fiable du type et de la couleur du bonbon spécial.  La
       * couleur ne dépend pas simplement de la case d'arrivée, mais de la
       * couleur des combinaisons créées.  Nous recherchons d'abord un
       * groupe qui inclut l'une des positions échangées (originA ou
       * originB).  Si aucun groupe ne les contient, on prend la couleur
       * du premier groupe de la liste.
       */
      let chosenColor = null;
      for (const g of groups) {
        if (g.cells.some((p) => (originA && p.row === originA.row && p.col === originA.col) || (originB && p.row === originB.row && p.col === originB.col))) {
          chosenColor = g.color;
          break;
        }
      }
      if (chosenColor === null && groups.length > 0) {
        chosenColor = groups[0].color;
      }
      const colorIndex = chosenColor !== null ? chosenColor : 0;
      // Restreindre l'analyse aux groupes qui participent à la combinaison
      // créée par le swap.  Cela évite que des groupes de la même couleur
      // situés ailleurs sur le plateau influencent la détection (par exemple
      // une ligne de 5 distante ne doit pas transformer un alignement de 4
      // en soleil).  On sélectionne donc uniquement les groupes de la
      // couleur choisie qui contiennent l'une des positions échangées.
      const groupsOfColor = groups.filter((g) => g.color === colorIndex);
      const candidateGroups = groupsOfColor.filter((g) =>
        g.cells.some((p) => (originA && p.row === originA.row && p.col === originA.col) || (originB && p.row === originB.row && p.col === originB.col))
      );
      // S'il n'y a pas de groupe candidat (ce qui peut arriver lors de
      // cascades), on considère quand même tous les groupes de couleur
      // comme candidats pour ne pas bloquer la création d'un spécial.
      const analysisGroups = candidateGroups.length > 0 ? candidateGroups : groupsOfColor;
      // Aplatir toutes les cases des groupes à analyser
      const matchCellsColor = flattenGroups(analysisGroups);
      // Détection T/L : une croix se forme lorsqu'il existe un point
      // d'intersection entre un groupe horizontal et vertical de la même couleur.
      let hasCross = false;
      let crossCell = null;
      const cellMap = {};
      analysisGroups.forEach((g) => {
        g.cells.forEach((p) => {
          const key2 = `${p.row},${p.col}`;
          if (!cellMap[key2]) cellMap[key2] = { h: 0, v: 0 };
          if (g.direction === 'horizontal') cellMap[key2].h++;
          if (g.direction === 'vertical') cellMap[key2].v++;
        });
      });
      for (const k in cellMap) {
        if (cellMap[k].h > 0 && cellMap[k].v > 0) {
          hasCross = true;
          // Enregistrer cette cellule comme point d'intersection pour y
          // placer éventuellement le bonbon spécial
          const [rStr, cStr] = k.split(',');
          crossCell = { row: parseInt(rStr, 10), col: parseInt(cStr, 10) };
          break;
        }
      }
      // Détection d'un carré 2×2 parmi les cellules de la couleur
      let hasSquare = false;
      let squareCell = null;
      for (let i = 0; i < matchCellsColor.length; i++) {
        const { row, col } = matchCellsColor[i];
        if (row < rows - 1 && col < cols - 1) {
          const hasA = matchCellsColor.some((p) => p.row === row + 1 && p.col === col);
          const hasB = matchCellsColor.some((p) => p.row === row && p.col === col + 1);
          const hasC = matchCellsColor.some((p) => p.row === row + 1 && p.col === col + 1);
          if (hasA && hasB && hasC) {
            hasSquare = true;
            // Enregistrer la position de ce carré (coin supérieur gauche)
            squareCell = { row, col };
            break;
          }
        }
      }
      // Détection d'une ligne de cinq ou plus
      let hasFiveLine = false;
      let fiveGroup = null;
      analysisGroups.forEach((g) => {
        if (g.cells.length >= 5) {
          hasFiveLine = true;
          if (!fiveGroup || g.cells.length > fiveGroup.cells.length) {
            fiveGroup = g;
          }
        }
      });
      // Détection d'une ligne de quatre
      let stripeGroup = null;
      analysisGroups.forEach((g) => {
        if (g.cells.length === 4 && !stripeGroup) {
          stripeGroup = g;
        }
      });
      // Choix du bonbon spécial selon la priorité
      if (hasCross) {
        // Pelle emballée (wrapped candy)
        specialCode = 16 + colorIndex;
        // Placer la pelle au point d'intersection du T/L
        specialPos = crossCell;
      } else if (hasSquare) {
        // Légume géant (2×2)
        specialCode = 21 + colorIndex;
        // Placer le légume géant au coin supérieur gauche du carré
        specialPos = squareCell;
      } else if (hasFiveLine) {
        // Soleil (bombe de couleur)
        specialCode = 15;
        // Trouver la position centrale dans la ligne de cinq ou plus
        if (fiveGroup) {
          // Trier les cellules par colonne ou par ligne selon la direction
          const sorted = fiveGroup.cells.slice().sort((a, b) => {
            return fiveGroup.direction === 'horizontal' ? a.col - b.col : a.row - b.row;
          });
          specialPos = sorted[Math.floor(sorted.length / 2)];
        }
      } else if (stripeGroup) {
        // Arrosoir rayé : sens inverse de la combinaison
        if (stripeGroup.direction === 'horizontal') {
          // Alignement horizontal → rayures verticales → efface colonne
          specialCode = 10 + colorIndex;
        } else {
          // Alignement vertical → rayures horizontales → efface ligne
          specialCode = 5 + colorIndex;
        }
        // Placer l'arrosoir au centre de la ligne de quatre
        const sorted = stripeGroup.cells.slice().sort((a, b) => {
          return stripeGroup.direction === 'horizontal' ? a.col - b.col : a.row - b.row;
        });
        specialPos = sorted[Math.floor(sorted.length / 2)];
      }
    }
    // Démarrer l'animation de disparition
    animateRemoval(matchCells, () => {
      dropTilesAnimated(() => {
        fillBoardAnimated(() => {
          // Si un bonbon spécial doit être créé, le placer à l'emplacement calculé.
          if (specialCode !== null) {
            const pos = specialPos || originB;
            if (pos) {
              board[pos.row][pos.col] = specialCode;
            }
          }
          // Vérifier s'il existe d'autres combinaisons après la cascade
          const newGroups = findMatchGroups();
          if (newGroups.length > 0) {
            // Pour les cascades, originA et originB n'ont plus d'importance
            chainRemoval(newGroups, null, null, false);
          }
        });
      });
    });
  }

  /**
   * Démarre le minuteur de 60 secondes et met à jour le score affiché.
   */
  // Le minuteur n'est plus utilisé : le jeu se termine lorsque
  // les mouvements sont épuisés.  Par conséquent startTimer est supprimé.

  /**
   * Commence une nouvelle partie.
   */
  function startGame() {
    score = 0;
    // Réinitialiser le nombre de mouvements restants
    movesLeft = maxMoves;
    try {
      highScore = parseInt(localStorage.getItem('capyCourgetteHighScore'), 10) || 0;
    } catch (e) {
      highScore = 0;
    }
    initBoard();
    // Appliquer le volume et démarrer l’ambiance
    applyVolume();
    if (!isMuted) ambient.play();
    // Mettre à jour l'affichage des mouvements
    updateMovesDisplay();
    drawBoard();
    requestAnimationFrame(gameLoop);
  }

  /**
   * Boucle de rendu continue pour dessiner le plateau.  Elle ne met pas à
   * jour l’état mais assure que l’animation reste fluide.
   */
  function gameLoop() {
    drawBoard();
    if (movesLeft > 0) {
      requestAnimationFrame(gameLoop);
    }
  }

  function endGame() {
    // Arrêter la musique
    ambient.pause();
    // Mettre à jour le high score
    if (score > highScore) {
      highScore = score;
      try {
        localStorage.setItem('capyCourgetteHighScore', String(highScore));
      } catch (e) {}
    }
    // Afficher l’overlay
    const overlay = document.getElementById('courgette-gameover');
    const scoreEl = document.getElementById('courgette-current-score');
    const highEl = document.getElementById('courgette-high-score');
    const funEl = document.getElementById('courgette-fun-message');
    overlay.classList.remove('hidden');
    scoreEl.textContent = score;
    highEl.textContent = highScore;
    // Choisir un message amusant à afficher
    const endMessages = [
      "Un ragondin farceur te regarde depuis les champs !",
      "Capybara volant repéré dans la cordillère des Andes !",
      "Les ragondins raffolent des courgettes volées.",
      "Attention aux montgolfières capybara, elles sont imprévisibles !",
      "Les légumes n’ont qu’à bien se tenir…"
    ];
    if (funEl) {
      const idx = Math.floor(Math.random() * endMessages.length);
      funEl.textContent = endMessages[idx];
    }
  }

  // Échanges utilitaires
  function swapCells(a, b) {
    const tmp = board[a.row][a.col];
    board[a.row][a.col] = board[b.row][b.col];
    board[b.row][b.col] = tmp;
  }

  // Gestion des clics et du démarrage
  canvas.addEventListener('click', handleClick);
  // Boutons de la barre latérale (pendant la partie)
  const sidebarRestart = document.getElementById('courgette-sidebar-restart');
  const sidebarMenu = document.getElementById('courgette-sidebar-menu');
  if (sidebarRestart) {
    sidebarRestart.addEventListener('click', () => {
      startGame();
    });
  }
  if (sidebarMenu) {
    sidebarMenu.addEventListener('click', () => {
      // Le jeu Courgette Crush se trouve dans le dossier capy.  Remonter d'un niveau
      // pour revenir au menu principal situé dans Capy.
      window.location.href = '../Capy/games.html';
    });
  }
  // Boutons de l'overlay de fin de partie
  const overReplay = document.getElementById('courgette-over-replay');
  const overMenu = document.getElementById('courgette-over-menu');
  if (overReplay) {
    overReplay.addEventListener('click', () => {
      const overlay = document.getElementById('courgette-gameover');
      overlay.classList.add('hidden');
      startGame();
    });
  }
  if (overMenu) {
    overMenu.addEventListener('click', () => {
      // Chemin corrigé vers le menu principal
      window.location.href = '../Capy/games.html';
    });
  }

  // Démarrer lorsque toutes les images (légumes et pouvoirs) sont chargées.
  let ready = 0;
  const totalImages = vegImgs.length + powerWaterImgs.length + 1;
  function onImageLoad() {
    ready++;
    if (ready === totalImages) {
      startGame();
    }
  }
  vegImgs.forEach((img) => {
    img.onload = onImageLoad;
  });
  powerWaterImgs.forEach((img) => {
    img.onload = onImageLoad;
  });
  sunImg.onload = onImageLoad;

  // Dans certains environnements (notamment en local), les images SVG
  // peuvent se charger instantanément avant que l'attribut onload ne
  // soit défini.  Pour éviter de manquer ces événements et de ne
  // jamais démarrer la partie, vérifions si chaque image est déjà
  // chargée et appelons onImageLoad manuellement.  Cette boucle
  // garantit que le compteur "ready" atteint le total attendu même
  // lorsque les images sont dans le cache.
  vegImgs.forEach((img) => {
    if (img.complete) onImageLoad();
  });
  powerWaterImgs.forEach((img) => {
    if (img.complete) onImageLoad();
  });
  if (sunImg.complete) onImageLoad();

  // Par sécurité, lancer la partie même si certaines images SVG ne
  // déclenchent pas l'événement onload (par exemple lorsque le fichier
  // est chargé via file:// sur certains navigateurs).  Cette minuterie
  // démarre le jeu après un court délai si le compteur ready n'a pas
  // atteint le total attendu.  La valeur de ready est comparée
  // afin de ne pas lancer deux fois la partie.
  setTimeout(() => {
    if (ready < totalImages) {
      startGame();
    }
  }, 1000);
})();