(() => {
  /**
   * Script de la page d'accueil (index.html).
   * Cette page affiche un menu permettant de lancer les différents jeux et
   * de consulter les meilleurs scores.  Aucune logique de gameplay n'est
   * présente ici : chaque jeu est chargé dans sa propre page (flappy.html,
   * runner.html, energy.html) qui gère le démarrage automatique.
   */

  // Récupérer une valeur de score dans localStorage, avec protection si la clé est absente ou inaccessible.
  function getScore(key) {
    let val = 0;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) val = parseInt(stored, 10) || 0;
    } catch (e) {
      val = 0;
    }
    return val;
  }

  // Définition des jeux disponibles.  Chaque entrée contient l'identifiant
  // interne, le titre à afficher, la clé de stockage du meilleur score et
  // la page HTML à charger pour démarrer le jeu.  En ajoutant un nouvel
  // objet ici, le menu se mettra automatiquement à jour.
  // Liste des jeux disponibles.  Chaque objet définit les propriétés suivantes :
  // id (identifiant interne), title (nom affiché), scoreKey (clé pour le
  // meilleur score dans localStorage), page (page HTML du jeu), category
  // (catégorie pour le filtrage) et image (illustration affichée dans la carte).
  const games = [
    {
      id: 'flappy',
      title: 'Flying Capy',
      scoreKey: 'flappyCapybaraHighScore',
      page: 'flappy_phaser.html',
      // La catégorie « action » est renommée « arcade » pour une
      // classification plus évocatrice des jeux d’adresse.
      category: 'arcade',
      image: 'assets/capybara_flying_new.png'
    },
    {
      id: 'runner',
      title: 'Running Capy',
      scoreKey: 'capyRunnerHighScore',
      page: 'runner.html',
      category: 'arcade',
      image: 'assets/capybara_running_new.png'
    },
    {
      id: 'electric',
      title: 'Ragon électrique',
      scoreKey: 'capyElectricHighScore',
      page: 'energy.html',
      // Ce jeu appartient maintenant à la catégorie arcade.
      category: 'arcade',
      image: 'assets/capybara_electric.png'
    // Ce jeu n'est plus mis en avant dans la sélection de la semaine.
    },
    {
      id: 'platform',
      title: 'Super Capy',
      scoreKey: 'capyPlatformHighScore',
      page: 'supercapy.html',
      category: 'arcade',
      image: 'assets/capybara_super.png'
    },
    {
      id: 'courgette',
      title: 'Courgette Crush',
      scoreKey: 'capyCourgetteHighScore',
      page: 'courgette.html',
      category: 'logique',
      image: 'assets/veg_courgette_final.png'
    ,
      // Ce jeu reste en vedette mais descend dans l'ordre.  On lui
      // attribue un trophée de bronze et on l'affiche en troisième
      // position (index 2) dans l'onglet « En vedette ».
      featured: true,
      trophy: 'bronze',
      featuredIndex: 2
    },
    {
      id: 'catch',
      title: 'Capy Catch',
      scoreKey: 'capyCatchHighScore',
      page: 'catch.html',
      category: 'arcade',
      // Nouveau visuel : capybara attrapant des carottes.
      image: 'assets/capybara_catch.png'
    },
    {
      id: 'tap',
      title: 'Capy Ninja',
      scoreKey: 'capyNinjaHighScore',
      page: 'tap.html',
      category: 'arcade',
      // Nouveau visuel : capybara ninja avec bandeau.
      image: 'assets/capybara_ninja_new.png'
    },
    {
      id: 'tapcapy',
      title: 'Tap Capy',
      scoreKey: 'tapCapyHighScore',
      page: 'tap_phaser.html',
      category: 'arcade',
      image: 'assets/capybara_running_clear.png'
    },
    {
      id: 'whack',
      title: 'Whack‑a‑Capy',
      scoreKey: 'capyWhackHighScore',
      page: 'whack.html',
      category: 'arcade',
      image: 'assets/capybara_super_transparent.png'
    },
    {
      id: 'bombercapy',
      title: 'Bomber Capy',
      scoreKey: 'bomberCapyHighScore',
      page: 'bomber_levels.html',
      category: 'arcade',
      // Nouveau visuel : capybara équipé d'un sac de dynamite.
      image: 'assets/capybara_bomber.png'
    },
    // L'entrée du jeu Capy GIGN est temporairement retirée car
    // le jeu de démineur ne fonctionne pas correctement et les
    // contrôles se superposent.  Lorsque le bug sera résolu,
    // cet objet pourra être réintroduit dans la liste des jeux.
    {
      id: 'puzzle',
      title: 'Capy Puzzle',
      scoreKey: 'capyPuzzleHighScore',
      page: 'puzzle.html',
      category: 'logique',
      image: 'assets/puzzle_icon.png',
      // Capy Puzzle figure dans la sélection des vedettes.  Un trophée
      // chocolat est affiché et la propriété featured permet de le
      // filtrer dans l’onglet dédié.
      featured: true,
      trophy: 'chocolat',
      featuredIndex: 3
    },
    {
      id: 'memory',
      // Nouveau jeu de mémoire : reproduis la séquence de nénuphars qui s'illuminent.
      // Icône personnalisée représentant un capybara en pleine réflexion.
      // Renommer Capy Mémoire en Capy Memory pour utiliser un
      // terme anglais cohérent avec les autres titres.
      title: 'Capy Memory',
      scoreKey: 'capyMemoryHighScore',
      page: 'action.html',
      category: 'logique',
      // Utilise l’icône vectorielle conçue spécialement pour ce jeu
      image: 'assets/capy_memory_icon.png',
      // Ce titre est en vedette et reçoit un trophée d’argent
      featured: true,
      trophy: 'argent'
      , featuredIndex: 1
    }
    ,
    // Nouveau jeu d'aventure style Pokémon : le joueur explore une carte 8 bits et affronte
    // des capybaras sauvages.  Ce titre appartient à la catégorie arcade.
    {
      id: 'capymon',
      title: 'Capy Mon',
      scoreKey: 'capyMonHighScore',
      page: 'capymon.html',
      category: 'arcade',
      // Utiliser l'icône de la tortue en attendant un visuel dédié
      image: 'assets/capybara_turtle.png'
    ,
      // Capy Mon est désormais le champion de la semaine : il prend la première
      // place dans les jeux en vedette.  On lui attribue un trophée d’or et
      // l’index 0 afin qu’il apparaisse en premier dans l’onglet “En vedette”.
      featured: true,
      trophy: 'or',
      featuredIndex: 0
    },
    // Jeu de blackjack : affrontez la banque en tentant d'atteindre 21.  Le score
    // correspond à la plus longue série de victoires consécutives.
    {
      id: 'blackjack',
      title: 'Capy Blackjack',
      scoreKey: 'capyBlackjackHighScore',
      page: 'blackjack.html',
      // Les jeux de hasard sont regroupés dans la nouvelle catégorie Casino
      category: 'casino',
      // Icone échangée : on utilise l'illustration de mémoire pour le jeu de blackjack
      image: 'assets/capybara_memory.png'
    },
    // Jeu de roulette : pariez sur la couleur et tentez votre chance.  Le score
    // correspond à la plus longue série de paris gagnants.
    {
      id: 'roulette',
      title: 'Capy Roulette',
      scoreKey: 'capyRouletteHighScore',
      page: 'roulette.html',
      category: 'casino',
      image: 'assets/roulette_icon.png'
    }
    ,
    // Mini-jeu de bataille simple avec animations et retour positif.
    {
      id: 'battle',
      title: 'Capy Battle',
      scoreKey: 'capyBattleHighScore',
      page: 'battle.html',
      category: 'arcade',
      image: 'assets/capybara_super.png'
    }
    // (Entrée de jeu Courgette Clicker retirée.  Ce jeu externe est désormais
    // accessible via un bouton dédié dans l’en‑tête de la page d’accueil.)
  ];

  // Si le menu est servi depuis un sous‑répertoire (par ex. `/Capy/`),
  // il faut ajuster les chemins relatifs vers les pages et les images.
  // On détecte la présence du dossier `Capy` dans l’URL actuelle et,
  // le cas échéant, on préfixe chaque lien par `../` pour remonter
  // d’un niveau vers la racine du site.  Cette logique garantit que
  // les jeux restent accessibles que le menu soit placé à la racine
  // ou dans un sous‑dossier.
  (function adjustPathsForSubdir() {
    try {
      const loc = window.location.pathname.toLowerCase();
      const inCapy = loc.includes('/capy/');
      // Déterminer le préfixe à appliquer : lorsqu’on est dans /Capy/,
      // il faut remonter d’un niveau pour accéder aux jeux et aux assets.
      // Lorsque le menu est servi depuis /Capy/, toutes les ressources
      // internes (pages et images) se trouvent dans le dossier "capy" au
      // même niveau que Capy.  On remonte donc d’un niveau et on entre
      // dans capy/ pour accéder aux jeux et aux assets.
      const prefix = inCapy ? '../Capy/' : '';
      games.forEach((game) => {
        // Ajuster le chemin de la page si ce n’est pas un lien externe
        if (game.page && !game.external) {
          game.page = prefix + game.page;
        }
        // Ajuster l’image si elle ne commence pas par http(s)
        if (game.image && !/^https?:\/\//.test(game.image)) {
          game.image = prefix + game.image;
        }
      });
    } catch (e) {
      // En cas d’erreur, ne pas modifier les chemins
    }
  })();

  // Générer dynamiquement les cartes de jeu dans la liste.  Ceci permet de
  // maintenir la modularité : un jeu peut être ajouté ou retiré en
  // modifiant simplement le tableau ci‑dessus.
  const listEl = document.getElementById('game-list');
  if (listEl) {
    games.forEach((game) => {
      const card = document.createElement('div');
      card.className = 'game-card';
      // Attribut data-category pour le filtrage principal
      card.dataset.category = game.category;
      // Attribut optionnel pour les jeux vedettes.  Il est utilisé
      // lorsqu’on filtre sur la catégorie “featured”.
      if (game.featured) {
        card.dataset.featured = 'true';
      }
      // Image illustrant le jeu
      const img = document.createElement('img');
      img.src = game.image;
      img.alt = '';
      card.appendChild(img);
      // Les trophées sont désormais insérés à côté du titre afin de ne
      // pas masquer l’illustration.  L’icône est ajoutée après
      // l’élément de titre lors de la création de titleSpan plus bas.
      // L’animation de célébration pour Courgette Crush reste
      // positionnée sur la carte.
      if (game.trophy === 'or') {
        const star = document.createElement('img');
        // Adapte le chemin de l'étoile en fonction du sous‑répertoire.
        // Lorsque le menu est servi depuis /Capy/, il faut remonter d'un niveau
        // pour atteindre les assets à la racine du site.  On réutilise la
        // logique de détection utilisée pour les cartes de jeu plus haut.
        try {
          const loc = window.location.pathname.toLowerCase();
          const inCapy = loc.includes('/capy/');
          // Lorsque le menu est servi depuis /Capy/, l’image de l’étoile est
          // située dans le dossier capy/assets.  On ajuste en conséquence.
          const starPrefix = inCapy ? '../Capy/' : '';
          star.src = starPrefix + 'assets/celebration_star.png';
        } catch (e) {
          star.src = 'assets/celebration_star.png';
        }
        star.className = 'celebration-star';
        card.appendChild(star);
      }
      // Conteneur de texte
      const info = document.createElement('div');
      info.className = 'game-card-info';
      const titleSpan = document.createElement('span');
      titleSpan.className = 'game-card-title';
      // Affecter le titre puis, le cas échéant, ajouter une icône de trophée
      // directement à côté du texte.  Ceci évite de recouvrir l’illustration
      // et place le trophée derrière le nom du jeu.
      titleSpan.textContent = game.title;
      if (game.trophy) {
        const trophyInline = document.createElement('img');
        // Ajuster le chemin du trophée en fonction du sous‑répertoire.
        try {
          const loc = window.location.pathname.toLowerCase();
          const inCapy = loc.includes('/capy/');
          const trophyPrefix = inCapy ? '../Capy/' : '';
          trophyInline.src = `${trophyPrefix}assets/trophies/trophy_${game.trophy}.png`;
        } catch (e) {
          trophyInline.src = `assets/trophies/trophy_${game.trophy}.png`;
        }
        trophyInline.className = 'trophy-inline';
        titleSpan.appendChild(trophyInline);
      }
      const recordSpan = document.createElement('span');
      recordSpan.className = 'game-card-record';
      // Afficher le record uniquement si le jeu possède une clé de score et n’est pas externe.
      if (game.scoreKey && !game.external) {
        const scoreVal = getScore(game.scoreKey);
        recordSpan.textContent = `Record : ${scoreVal}`;
      } else {
        // Pour les jeux externes, afficher un libellé neutre ou laisser vide.
        recordSpan.textContent = '';
      }
      info.appendChild(titleSpan);
      info.appendChild(recordSpan);
      card.appendChild(info);
      // La carte entière est cliquable
      card.addEventListener('click', () => {
        // Si la propriété external est vraie, ouvrir le lien dans un nouvel onglet.  Sinon,
        // naviguer vers la page interne du jeu comme auparavant.
        if (game.external) {
          window.open(game.page, '_blank');
        } else {
          window.location.href = game.page;
        }
      });
      // Conserver l'ordre original dans listEl mais ajouter un index
      // spécifique pour les jeux vedettes afin de pouvoir trier la
      // section “En vedette” plus tard.  Ce data‑attribut est ignoré
      // pour les autres catégories.
      if (game.featuredIndex !== undefined) {
        card.dataset.featuredIndex = game.featuredIndex;
      }
      listEl.appendChild(card);
    });
  }
  // Filtrage par catégorie : met à jour l'affichage des cartes en
  // fonction du bouton sélectionné.  Le bouton actif reçoit la classe
  // .active et seules les cartes correspondantes sont visibles.
  const categoryButtons = document.querySelectorAll('.category-btn');
  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.category;
      categoryButtons.forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.game-card').forEach((card) => {
        // Filtrage par catégorie : pour l’onglet “featured”, on sélectionne
        // uniquement les cartes marquées data-featured=true.  Pour “all”,
        // on affiche tout.  Sinon on compare la catégorie de la carte.
        if (target === 'featured') {
          card.style.display = card.dataset.featured === 'true' ? '' : 'none';
        } else if (target === 'all') {
          card.style.display = '';
        } else {
          card.style.display = (card.dataset.category === target) ? '' : 'none';
        }
      });
      // Appliquer un affichage en grille pour les jeux en vedette afin de
      // disposer les quatre titres de la semaine en 2×2.  Retirer cette
      // classe dans les autres onglets.
      if (target === 'featured') {
        if (listEl) listEl.classList.add('featured-grid');
        // Réordonner les cartes en vedette selon l'indice de vedette.
        const cardsArray = Array.from(listEl.children);
        const visible = cardsArray.filter((c) => c.dataset.featured === 'true');
        visible.sort((a, b) => {
          const ai = parseInt(a.dataset.featuredIndex || '99', 10);
          const bi = parseInt(b.dataset.featuredIndex || '99', 10);
          return ai - bi;
        });
        // Réinsérer dans l'ordre trié
        visible.forEach((card) => listEl.appendChild(card));
      } else {
        if (listEl) listEl.classList.remove('featured-grid');
      }
    });
  });

  // Afficher une citation drôle sous le menu.  Quelques phrases sont
  // sélectionnées aléatoirement parmi une liste définie ci‑dessous.  Seules
  // les phrases les plus amusantes ont été conservées.
  const quotes = [
    "La légende raconte qu'un Capybara s'est déjà endormi dans un concert de rock.",
    "On dit qu'un Capybara a terminé un marathon en nageant dans toutes les flaques.",
    "Un jour, un Capybara aurait refusé une carotte trop croquante.",
    "Les Capybaras ont inventé la sieste, c'est connu.",
    "Un Capybara a déjà confondu un nuage avec une barbe à papa.",
    "Il paraît que les Capybaras battent des records de calme olympique." 
  ];
  const quoteEl = document.getElementById('menu-quote');
  if (quoteEl) {
    const idx = Math.floor(Math.random() * quotes.length);
    quoteEl.textContent = quotes[idx];
  }

  // Liste de phrases courtes pour le splash, inspirées des textes de
  // lancement de Minecraft.  Chaque phrase est concise et humoristique.
  const splashPhrases = [
    'Capy power !',
    'Vol de légumes !',
    'Ragondin espiègle !',
    'Courgette party !',
    'Sieste volante !',
    'Maître du chill !',
    'Amoureux des carottes'
  ];
  const splashEl = document.getElementById('splash-text');
  if (splashEl) {
    const idx = Math.floor(Math.random() * splashPhrases.length);
    splashEl.textContent = splashPhrases[idx];
  }

  // Choisir aléatoirement une mascotte parmi deux images pour l'accueil afin
  // d'éviter d'afficher la même illustration que le fond.  Le script sélectionne
  // soit capybara_unicorn.png soit capybara_dinde.png.  Si l'élément
  // #hero-image n'est pas présent, rien ne se passe.
  const heroEl = document.getElementById('hero-image');
  if (heroEl) {
    // Utiliser une mascotte fixe : le capybara licorne.  On retourne horizontalement
    // pour qu'il regarde vers la droite.  On retire la sélection aléatoire.
    // Ajuster également le chemin de la mascotte lorsque la page se trouve
    // dans le sous‑répertoire /Capy/.  On applique un préfixe ../ pour
    // remonter à la racine des fichiers.  Si une erreur survient, on
    // conserve le chemin relatif par défaut.
    try {
      const loc = window.location.pathname.toLowerCase();
      const inCapy = loc.includes('/capy/');
      // Lorsque la page est servie depuis un sous-répertoire « /capy/ »,
      // l'arborescence contient un dossier capy/ au même niveau que Capy.
      // Afin de pointer correctement vers l'image de la mascotte, on
      // préfixe le chemin par '../Capy/' au lieu de simplement '../'.
      const heroPrefix = inCapy ? '../Capy/' : '';
      heroEl.src = heroPrefix + 'assets/capybara_unicorn.png';
    } catch (e) {
      heroEl.src = 'assets/capybara_unicorn.png';
    }
    heroEl.style.transform = 'scaleX(-1)';
    // Rediriger vers la page de crédits lorsqu'on clique sur la mascotte.
    // Ne diriger vers la page des crédits que si l'utilisateur clique
    // précisément sur l'œil de la mascotte.  On estime la zone de
    // l'œil comme étant une petite région dans le quart supérieur
    // droit de l'image (de 60 % à 80 % en largeur et de 30 % à 60 %
    // en hauteur).  Un clic en dehors de cette zone est ignoré.
    heroEl.addEventListener('click', (e) => {
      const rect = heroEl.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width;
      const ry = (e.clientY - rect.top) / rect.height;
      // Réduire la zone active pour mieux dissimuler l'accès aux crédits.
      if (rx > 0.65 && rx < 0.85 && ry > 0.25 && ry < 0.55) {
        // Ouvrir la page des crédits qui a été déplacée dans le dossier « capy ».
        // Depuis la page située dans /Capy/, il faut remonter d'un niveau pour
        // atteindre capy/credits.html.  L'utilisation d'un chemin relatif sans
        // ce préfixe entraînerait la recherche de /Capy/credits.html qui n'existe plus.
        window.location.href = '../Capy/credits.html';
      }
    });
  }

  // Gestion des boutons audio : on récupère l'état depuis localStorage et on
  // inverse l'état au clic.  Chaque bouton met à jour la classe 'active'
  // pour refléter visuellement l'état activé/désactivé.
  const ambientBtn = document.getElementById('toggle-ambient');
  const effectsBtn = document.getElementById('toggle-effects');
  function loadAudioSettings() {
    try {
      const amb = localStorage.getItem('capyAmbientEnabled');
      const eff = localStorage.getItem('capyEffectsEnabled');
      if (ambientBtn) ambientBtn.classList.toggle('active', amb !== 'false');
      if (effectsBtn) effectsBtn.classList.toggle('active', eff !== 'false');
    } catch (e) {}
  }
  loadAudioSettings();
  function toggleSetting(key, btn) {
    try {
      const current = localStorage.getItem(key);
      const newVal = current === 'false' ? 'true' : 'false';
      localStorage.setItem(key, newVal);
      btn.classList.toggle('active', newVal !== 'false');
    } catch (e) {}
  }
  if (ambientBtn) {
    ambientBtn.addEventListener('click', () => toggleSetting('capyAmbientEnabled', ambientBtn));
  }
  if (effectsBtn) {
    effectsBtn.addEventListener('click', () => toggleSetting('capyEffectsEnabled', effectsBtn));
  }

  // Gestion du bouton de thème sombre/clair.  Lorsque l’utilisateur
  // clique sur l’icône, on inverse la valeur dans le localStorage et on
  // applique immédiatement le nouveau thème.  Les fonctions sont
  // définies dans config.js.
  const darkBtn = document.getElementById('dark-mode-toggle');
  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      if (window.toggleTheme) window.toggleTheme();
    });
    // Appliquer l’icône correcte lors du chargement du menu
    if (window.applyTheme) window.applyTheme();
  }

  // Gestion du contrôle de volume global.  La valeur est lue depuis localStorage
  // à l'initialisation et stockée à chaque modification.  Tous les jeux peuvent
  // récupérer cette valeur pour régler leurs pistes audio.
  const volumeSlider = document.getElementById('volume-slider');
  if (volumeSlider) {
    try {
      const saved = localStorage.getItem('capyGlobalVolume');
      if (saved !== null) volumeSlider.value = saved;
    } catch (e) {
      /* ignore */
    }
    volumeSlider.addEventListener('input', () => {
      try {
        localStorage.setItem('capyGlobalVolume', volumeSlider.value);
      } catch (e) {
        /* ignore */
      }
    });
  }
})();