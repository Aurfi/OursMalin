(() => {
  /**
   * Capy Mon – un mini RPG inspiré des jeux 8 bits.  Le joueur se
   * déplace sur une carte en vue du dessus et déclenche occasionnellement
   * des combats aléatoires contre des créatures sauvages.  Les graphismes
   * sont volontairement pixelisés pour rappeler l’esthétique rétro.
   */
  const canvas = document.getElementById('capymon-canvas');
  const ctx = canvas.getContext('2d');
  // Taille de chaque tuile en pixels (en coordonnées de canvas).  Le
  // canvas est dimensionné à 480×320 (15×10 tuiles).  Si la taille du
  // canvas est modifiée via CSS, le style image-rendering: pixelated
  // garantira un rendu net.
  const tileSize = 32;
  const mapWidth = Math.floor(canvas.width / tileSize);
  const mapHeight = Math.floor(canvas.height / tileSize);
  // Carte du monde sous forme de matrice de tuiles.  La valeur d'une
  // tuile est un nombre correspondant à un type :
  // 0 : sol praticable
  // 1 : eau/infranchissable
  // 2 : tente de soins (soigne l'équipe)
  // 3 : porte vers une autre zone
  let map = [];
  /**
   * Génère une nouvelle carte pour la zone en cours.  On remplit la
   * bordure de la carte avec de l'eau afin d'encadrer le joueur, puis
   * quelques flaques d'eau aléatoires.  On place ensuite une tente de
   * soins dans un coin et des portes pour passer à la zone suivante
   * (droite) ou précédente (gauche).  Les palettes de couleurs sont
   * mises à jour pour refléter la zone.
   */
  function generateMap() {
    // Utiliser le modèle de biome correspondant au modulo de l’index
    const zoneTemplate = zones[currentZoneIndex % zones.length];
    colors = zoneTemplate.colors;
    map = [];
    for (let y = 0; y < mapHeight; y++) {
      const row = [];
      for (let x = 0; x < mapWidth; x++) {
        // Bordures en eau
        if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
          row.push(1);
        } else {
          // Quelques flaques d'eau aléatoires
          row.push(Math.random() < 0.05 ? 1 : 0);
        }
      }
      map.push(row);
    }
    // Positionner la tente de soins (2) uniquement au départ (zone 0) et
    // toutes les cinq zones (zones dont le numéro est un multiple de 5).
    // Le numéro de zone est currentZoneIndex+1.  On place la tente dans
    // la zone 1 (marais) et dans les zones 5, 10, 15, etc., car ce sont
    // celles où un braconnier est présent.
    if (currentZoneIndex === 0 || ((currentZoneIndex + 1) % 5 === 0)) {
      map[1][1] = 2;
    }
    // Positionner des portes (3) pour changer de zone
    const doorY = Math.floor(mapHeight / 2);
    // Toujours placer une porte à droite car l’aventure continue à l’infini
    map[doorY][mapWidth - 2] = 3; // porte à droite
    // Placer une porte à gauche si l’on n’est pas dans la toute première zone
    if (currentZoneIndex > 0) {
      map[doorY][1] = 3; // porte à gauche
    }

    // Placer une boutique (4) dans chaque zone.  Le joueur peut y
    // vendre des Capys et acheter des objets.  On évite d’écraser
    // d’autres éléments en vérifiant la case.  La boutique est placée
    // près du coin inférieur gauche.
    const shopX = 2;
    const shopY = mapHeight - 2;
    if (map[shopY][shopX] === 0) {
      map[shopY][shopX] = 4;
    }
    // Position initiale du joueur : placer près de la tente (mais pas sur).
    player.x = 2;
    player.y = 2;

    // Déterminer la présence d'un braconnier.  Toutes les cinq zones
    // (zone numéro 5, 10, 15, etc. en comptant à partir de 1) abritent
    // un braconnier qui bloque le passage.  S’il n’a pas encore été
    // vaincu, on le place sur le chemin menant à la sortie.  Le
    // braconnier regarde vers la gauche afin de surprendre le joueur.
    if (((currentZoneIndex + 1) % 5 === 0) && !braconniersDefeated[currentZoneIndex]) {
      // Position horizontale : juste avant la porte de droite.  Si
      // l’emplacement est impraticable (flaque), reculer d’une case.
      let pX = mapWidth - 3;
      const pY = doorY;
      if (map[pY][pX] === 1) {
        pX = mapWidth - 4;
      }
      currentPoacher = { x: pX, y: pY, direction: 'left' };
      // Attribuer un nom au braconnier s’il n’en a pas déjà un
      if (!zonePoacherNames[currentZoneIndex]) {
        const idx = Math.floor(Math.random() * defaultPoacherNames.length);
        zonePoacherNames[currentZoneIndex] = defaultPoacherNames[idx];
        savePoacherNames();
      }
    } else {
      currentPoacher = null;
    }
  }

  /**
   * Change de zone en mettant à jour l'index courant, génère la nouvelle
   * carte et tente de faire apparaître des objets sur le sol.  Affiche
   * également une alerte informant le joueur du changement de zone.
   * @param {number} newIndex Index de la zone ciblée
   */
  function goToZone(newIndex) {
    // Interdire les indices négatifs
    if (newIndex < 0) return;
    // Mettre à jour l’index.  On ne limite pas la progression vers
    // l’infini ; les zones au-delà de zones.length utilisent le
    // modulo pour leur modèle de biome.
    currentZoneIndex = newIndex;
    generateMap();
    spawnItems();
    draw();
    // Lorsque la zone change, relancer l'ambiance adaptée au nouveau biome
    playAmbienceForCurrentZone();
    // Déterminer le nom du biome en utilisant le modulo
    const zoneTemplate = zones[currentZoneIndex % zones.length];
    alert('Vous entrez dans la zone : ' + zoneTemplate.name + ' (' + (currentZoneIndex + 1) + ').');
  }

  /**
   * Téléporte le joueur à la première zone (marais) et le place sur la
   * tente de soins.  Soigne l'ensemble de l'équipe et réinitialise
   * l'index du capy actif.  Utilisé lorsqu'aucun capy valide n'est
   * disponible après une défaite.
   */
  function teleportToStart() {
    currentZoneIndex = 0;
    generateMap();
    // Placer le joueur sur la tente (2)
    player.x = 1;
    player.y = 1;
    // Soigner tous les capys et lever les KO
    playerCapys.forEach((c) => {
      c.currentHP = c.maxHP;
      c.isKO = false;
    });
    currentCapyIndex = 0;
    savePlayerData();
    draw();
    // Jouer le son de soin et relancer l'ambiance du marais
    playEffect('heal');
    playAmbienceForCurrentZone();
    alert('Vos Capys ont été soignés à la tente du marais.');
  }

  // Définition des objets possibles et de leurs descriptions pour le Dex.
  const itemDefinitions = {
    'super-carotte': {
      name: 'Super-carotte',
      desc: 'un légume brillant qui fait gagner un niveau à un Capy.',
      rate: 0.02
    },
    potion: {
      name: 'Potion de soin',
      desc: 'un onguent qui restaure complètement les PV d’un Capy.',
      rate: 0.15
    },
    revolver: {
      name: 'Revolver',
      desc: 'un instrument déraisonnable qui abat instantanément un animal.',
      rate: 0.03
    },
    caillou: {
      name: 'Caillou',
      desc: 'un simple caillou à lancer pour distraire l’ennemi.',
      rate: 0.2
    },
    filet: {
      name: 'Filet',
      desc: 'un filet robuste qui augmentera la chance de capture du prochain Capy.',
      rate: 0.05
    },
    sifflet: {
      name: 'Sifflet',
      desc: 'un sifflet strident qui effraie les animaux sauvages et met fin au combat.',
      rate: 0.06
    }
  };

  /**
   * Fait apparaître des objets aléatoirement lorsqu'une zone est chargée.
   * Chaque objet possède un taux de spawn.  Si un objet apparaît, il est
   * ajouté à l'inventaire et un message d'alerte informe le joueur.
   */
  function spawnItems() {
    Object.keys(itemDefinitions).forEach((key) => {
      const def = itemDefinitions[key];
      if (Math.random() < (def.rate || 0)) {
        if (!inventory[key]) inventory[key] = 0;
        inventory[key]++;
        // Enregistrer l’objet dans le Dex des objets
        recordItem(key);
        savePlayerData();
        // Son de notification lors de l'apparition d'un objet
        playEffect('notification');
        alert('Vous trouvez ' + def.name + ' : ' + def.desc);
      }
    });
  }

  // Position du joueur en tuiles
  const player = { x: 2, y: 2 };

  // Gestion du mode combat et système de capture
  let inBattle = false;
  // Objet représentant le combat en cours : informations sur l'ennemi et sur
  // l'état du duel.  Exemple :
  // { enemy: { species: 'capybara', level: 3, currentHP: 10, maxHP: 10 }, myTurn: true }
  let battle = null;
  // Pointeurs vers les éléments UI du combat (overlay, message et actions)
  let battleUI = null;
  // Délai initial : désactivé le temps que l’événement capyGameStart
  // soit déclenché par config.js.
  let gameStarted = false;

  // Compteur d’ennemis vaincus.  Ce nombre est stocké dans localStorage
  // sous la clé capyMonHighScore afin d’afficher un record sur l’écran
  // d’accueil.  Chaque victoire incrémente ce compteur et met à jour
  // l’enregistrement si nécessaire.
  let defeatedCount = 0;
  try {
    const stored = localStorage.getItem('capyMonHighScore');
    if (stored !== null) defeatedCount = parseInt(stored, 10) || 0;
  } catch (e) {}

  /**
   * Gestion des combats contre les braconniers (PNJ).  Lorsqu’un
   * joueur tente de franchir une sortie toutes les cinq zones, un
   * braconnier le défie avec une équipe de cinq animaux.  Le
   * braconnier doit être vaincu pour progresser.  Les variables
   * suivantes décrivent l’état d’un combat de braconnier en cours.
   */
  let trainerBattle = false;
  let trainerTeam = [];
  let trainerZoneIndex = -1;
  let trainerTeamIndex = 0;
  // Braconniers déjà vaincus, enregistré dans localStorage
  let braconniersDefeated = {};
  // Monnaie du joueur (pièces).  Utilisée pour acheter des objets
  // et vendue en échange de Capys.
  let capyCoins = 0;
  // Bonus de capture temporaire accordé par l’utilisation d’un filet
  let nextCaptureBonus = 0;

  // -----------------------------------------------------------------------------
  // Gestion audio
  //
  // Le jeu intègre désormais plusieurs pistes audio afin d'accompagner
  // l'exploration, les combats et les actions du joueur.  Les fichiers sont
  // stockés dans assets/audio/ et sont référencés ici.  Les pistes
  // d'ambiance sont jouées en boucle selon le biome courant.  Les combats
  // disposent de leur propre musique (sauvage vs dresseur/braconnier).  Des
  // effets ponctuels (notification, ouverture de menu, soin, game over) sont
  // déclenchés par diverses actions.  L'implémentation sépare musique et
  // effets afin d'éviter que des pistes ne se chevauchent.  Les utilisateurs
  // peuvent désactiver le son via les réglages du jeu.

  // Chargement des fichiers audio.  Chaque entrée crée un objet Audio qui
  // pointera vers le fichier correspondant dans le dossier assets/audio.  Les
  // pistes de combat et d'ambiance sont paramétrées pour boucler.
  const audioFiles = {
    ambience_marais: new Audio('assets/audio/ambience_marais.ogg'),
    ambience_forest: new Audio('assets/audio/ambience_forest.ogg'),
    ambience_savane: new Audio('assets/audio/ambience_savane.ogg'),
    ambience_desert: new Audio('assets/audio/ambience_desert.ogg'),
    ambience_montagne: new Audio('assets/audio/ambience_montagne.ogg'),
    ambience_plage: new Audio('assets/audio/ambience_plage.ogg'),
    battle_wild: new Audio('assets/audio/battle_wild.ogg'),
    battle_trainer: new Audio('assets/audio/battle_trainer.ogg'),
    gameover: new Audio('assets/audio/gameover.ogg'),
    notification: new Audio('assets/audio/notification.ogg'),
    menu_open: new Audio('assets/audio/menu_open.ogg'),
    heal: new Audio('assets/audio/heal.ogg')
  };
  // Configurer la lecture en boucle pour les musiques d'ambiance et de combat
  [
    'ambience_marais', 'ambience_forest', 'ambience_savane', 'ambience_desert',
    'ambience_montagne', 'ambience_plage', 'battle_wild', 'battle_trainer'
  ].forEach((key) => {
    const a = audioFiles[key];
    if (a) a.loop = true;
  });
  // Variables globales pour suivre la piste actuelle
  let currentAmbienceKey = null;
  let currentBattleKey = null;
  // Liste des sons d'ambiance par biome.  L'index correspond à
  // currentZoneIndex % zones.length.
  const zoneAmbienceKeys = [
    'ambience_marais',
    'ambience_forest',
    'ambience_savane',
    'ambience_desert',
    'ambience_montagne',
    'ambience_plage'
  ];

  // ---------------------------------------------------------------------------
  // Déclaration des images des espèces
  //
  // Ce dictionnaire associe chaque clé d'espèce à son image (objet Image).
  // Il doit être initialisé avant toute tentative de chargement afin
  // d'éviter la fermeture temporelle (TDZ) provoquée par les déclarations
  // `const`.  Les images supplémentaires sont ajoutées plus bas lorsque
  // additionalSpeciesData est fusionné.  Si une espèce ne possède pas de
  // fichier PNG dans assets/capymon, son entrée restera undefined et un
  // placeholder sera généré dynamiquement.
  const speciesImages = {};

  // Orientation de chaque sprite.  Les images originales des animaux
  // peuvent être orientées soit vers la gauche soit vers la droite.
  // Pour que les animaux se fassent toujours face en combat, on
  // détermine ci‑dessous le sens dans lequel chaque fichier regarde.
  // Si une espèce est orientée vers la gauche, son image sera
  // retournée horizontalement lorsque le capy du joueur l’utilise
  // (le joueur regarde vers la droite), et inversement pour l’ennemi.
  const orientationMap = {
    'caracal': 'left',
    'whale': 'left',
    'butterfly': 'left',
    'gecko': 'left',
    'polar_bear': 'left',
    'iguana': 'left',
    'king_cheetah': 'left',
    'yak': 'left',
    'llama': 'left',
    'rabbit': 'left',
    'turkey': 'left',
    'duck': 'left',
    'fox': 'left',
    'giant_sloth': 'left',
    'centipede': 'left',
    'camel': 'left',
    'tortoise': 'left',
    'coati': 'left',
    'beetle': 'left',
    'snail': 'left',
    'puma': 'left',
    'squirrel': 'left',
    'bear': 'left',
    'myna': 'left',
    'goat': 'left',
    'falcon': 'left',
    'pig': 'left',
    'beaver': 'left',
    'kookaburra': 'left',
    'tamandua': 'left',
    'kingfisher': 'left',
    'cow': 'left',
    'caterpillar': 'left',
    'boar': 'left',
    'crocodile': 'left',
    'robin': 'left',
    'wren': 'left',
    'toucan': 'left',
    'lynx': 'left',
    'herisson': 'left',
    'blackbird': 'left',
    'quokka': 'left',
    'grenouille': 'left',
    'mole': 'left',
    'condor': 'left',
    'sea_lion': 'left',
    'green_snake': 'left',
    'monk_seal': 'left',
    'tigre': 'left',
    'tortue': 'left',
    'giant_armadillo': 'left',
    'kangaroo': 'left',
    'lorikeet': 'left',
    'serpent': 'left',
    'platypus': 'left',
    'hamster': 'left',
    'cricket': 'left',
    'leopard': 'left',
    'hippopotame': 'left',
    'parrot_green': 'left',
    'seal': 'left',
    'bison': 'left',
    'pigeon': 'left',
    'bobcat': 'left',
    'goose': 'left',
    'seahorse': 'left',
    'capybara': 'right',
    'lion': 'left',
    'penguin': 'left',
    'prairie_dog': 'left',
    'teal_duck': 'left',
    'toad': 'left',
    'jaguar': 'left',
    'zebra': 'left',
    'horse': 'left',
    'buffalo': 'left',
    'grasshopper': 'left',
    'owl': 'left',
    'fly': 'left',
    'moose': 'left',
    'capybara_volant': 'right',
    'red_panda': 'left',
    'echidna': 'left',
    'loup': 'left',
    'bee': 'left',
    'parrot_blue': 'left',
    'wild_yak': 'left',
    'capuchin': 'left',
    'marine_iguana': 'left',
    'lapin': 'left',
    'dingo': 'left',
    'anteater': 'left',
    'hare': 'left',
    'hyena': 'left',
    'crow': 'left',
    'chameau': 'left',
    'lizard': 'left',
    'ferret': 'left',
    'green_worm': 'left',
    'elephant': 'left',
    'emperor_penguin': 'left',
    'panda': 'left',
    'dauphin': 'left',
    'swan': 'left',
    'mallard': 'left',
    'paresseux': 'left',
    'quail': 'left',
    'hibou': 'left',
    'gorilla': 'left',
    'okapi': 'left',
    'eagle': 'left',
    'vulture': 'left',
    'monkey': 'left',
    'heron': 'left',
    'honey_badger': 'left',
    'worm': 'left',
    'sparrow': 'left',
    'ant': 'left',
    'armadillo': 'left',
    'baboon': 'left',
    'chameleon': 'left',
    'brown_snake': 'left',
    'mosquito': 'left',
    'civet': 'left',
    'chipmunk': 'left',
    'badger': 'left',
    'dodo': 'left',
    'zorilla': 'left',
    'raton': 'left',
    'wallaby': 'left',
    'hen': 'left',
    'xerus': 'left',
    'hedgehog': 'left',
    'rhinoceros': 'left',
    'parakeet': 'left',
    'cheetah': 'left',
    'alpaca': 'left',
    'water_buffalo': 'left',
    'sheep': 'left',
    'renard': 'left',
    'mouette': 'left',
    'turtle': 'left',
    'raccoon': 'left',
    'antelope': 'left',
    'millipede': 'left',
    'parrot': 'left',
    'walrus': 'left',
    'giant_tortoise': 'left',
    'seagull': 'left',
    'flamingo': 'left'
  };

  // -------------------------------------------------------------------------
  // Mécanismes avancés : mutants et évolutions
  //
  // Un petit pourcentage des rencontres sauvages sont des créatures « mutantes ».  Ces
  // animaux bénéficient de statistiques améliorées et d’une attaque exclusive.
  // Lorsqu’un mutant apparaît, une aura de paillettes entoure son sprite pour
  // le distinguer.  Les mutants apprennent automatiquement « Charge Mutante » au
  // niveau 25 et leurs PV de base sont augmentés de 50 %.
  //
  // Les évolutions apportent un nouveau souffle à l’équipe : certaines
  // espèces évoluent en une forme plus puissante à un niveau compris entre
  // 12 et 32 (déterminé aléatoirement au chargement).  Une animation de
  // transition avec message de félicitations est jouée lors de chaque
  // évolution.  La table evolutions définit pour chaque espèce son
  // évolution.  Les niveaux requis sont stockés dans evolutionLevels.
  const MUTANT_CHANCE = 0.01;
  // Tableau des évolutions : clé = espèce de départ, valeur = espèce résultante
  const evolutions = {
    capybara: 'capybara_volant',
    iguana: 'marine_iguana',
    lizard: 'chameleon',
    brown_snake: 'green_snake',
    tortue: 'turtle',
    lynx: 'bobcat'
  };
  const evolutionLevels = {};
  Object.keys(evolutions).forEach((key) => {
    // Niveau d’évolution aléatoire entre 12 et 32
    evolutionLevels[key] = 12 + Math.floor(Math.random() * 21);
  });

  // Indicateur de progression d'un tour.  Lorsqu'un tour est en cours
  // (le joueur vient d'attaquer ou de tenter une capture), les actions
  // sont temporairement bloquées.  showBattleActions() remet ce flag
  // à false pour permettre au joueur de jouer de nouveau.
  let turnInProgress = false;
  /**
   * Joue la piste d'ambiance correspondant au biome courant.  Met en pause
   * l'éventuelle piste précédente.  Si l'utilisateur est en combat, la
   * musique d'ambiance n'est pas lancée (la musique de combat a
   * priorité).
   */
  function playAmbienceForCurrentZone() {
    const key = zoneAmbienceKeys[currentZoneIndex % zoneAmbienceKeys.length];
    if (currentAmbienceKey === key) return;
    // Arrêter l'ambiance précédente
    if (currentAmbienceKey && audioFiles[currentAmbienceKey]) {
      const prev = audioFiles[currentAmbienceKey];
      prev.pause();
      prev.currentTime = 0;
    }
    currentAmbienceKey = key;
    // Ne pas jouer l'ambiance si on est en combat
    if (inBattle) return;
    const audio = audioFiles[key];
    if (!audio) return;
    audio.volume = 0.6;
    try {
      audio.play();
    } catch (e) {
      // Certains navigateurs exigent une interaction utilisateur pour démarrer
    }
  }
  /**
   * Joue la musique de combat adaptée au type de combat.  Met en pause
   * l'ambiance en cours et toute musique de combat précédente.
   * @param {boolean} isTrainer Indique si le combat oppose un dresseur/braconnier
   */
  function playBattleMusic(isTrainer = false) {
    // Mettre en pause l'ambiance
    if (currentAmbienceKey && audioFiles[currentAmbienceKey]) {
      audioFiles[currentAmbienceKey].pause();
    }
    // Arrêter l'ancienne musique de combat
    if (currentBattleKey && audioFiles[currentBattleKey]) {
      const prev = audioFiles[currentBattleKey];
      prev.pause();
      prev.currentTime = 0;
    }
    const key = isTrainer ? 'battle_trainer' : 'battle_wild';
    currentBattleKey = key;
    const audio = audioFiles[key];
    if (!audio) return;
    audio.volume = 0.8;
    audio.currentTime = 0;
    try {
      audio.play();
    } catch (e) {}
  }
  /**
   * Arrête la musique de combat en cours et redémarre l'ambiance de la zone.
   */
  function stopBattleMusic() {
    if (currentBattleKey && audioFiles[currentBattleKey]) {
      const prev = audioFiles[currentBattleKey];
      prev.pause();
      prev.currentTime = 0;
    }
    currentBattleKey = null;
    // Relancer l'ambiance seulement si les sons ne sont pas désactivés
    playAmbienceForCurrentZone();
  }
  /**
   * Joue un effet sonore ponctuel (non bouclé).  S'assure que le son
   * repart toujours depuis le début.  Le volume est conservé par défaut.
   * @param {string} key Clé du son à jouer (notification, menu_open, heal...)
   */
  function playEffect(key) {
    const audio = audioFiles[key];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    try {
      audio.play();
    } catch (e) {}
  }
  // --- Gestion visuelle et logique des braconniers ---
  // Objet courant représentant un braconnier dans la zone.  Les propriétés
  // x et y sont les coordonnées du braconnier, direction son sens ("left"
  // ou "right").  S’il est null, aucun braconnier n’est présent.
  let currentPoacher = null;
  // Dictionnaire de noms attribués aux braconniers par zone.  Persisté
  // dans localStorage afin que chaque braconnier conserve son nom
  // entre les sessions de jeu.  La clé est l’indice de zone et la
  // valeur est une chaîne (le nom).
  let zonePoacherNames = {};
  // Liste de noms par défaut pour les braconniers.  Ce tableau compte
  // plus d’une centaine d’entrées afin d’assurer une variété
  // suffisante.  Les mêmes noms sont également fournis dans le fichier
  // assets/poacher_names.json pour permettre une éventuelle mise à
  // jour sans modifier le code.
  const defaultPoacherNames = [
    'Bruno','Camille','Lucie','Maxime','Léa','Julien','Emma','Nathan','Sarah','Lucas','Chloé','Pierre','Marion','David','Sophie','Thomas','Laura','Hugo','Manon','Alexandre','Clara','Romain','Pauline','Guillaume','Julie','Vincent','Marine','Antoine','Elise','Sebastien','Charlotte','Benoit','Amandine','Xavier','Margot','Sylvain','Alice','Adrien','Elsa','Bastien','Noemie','Mathieu','Lola','Christophe','Coralie','Jonathan','Fanny','Nicolas','Audrey','Benjamin','Lucile','Martin','Valerie','Jean','Caroline','Kevin','Adeline','Boris','Sandrine','Philippe','Ines','Cedric','Agathe','Matthieu','Florence','Frederic','Amelie','Lionel','Helene','Mickael','Melanie','Thierry','Isabelle','Patrick','Jade','Olivier','Nathalie','Celine','Yann','Paul','Clemence','Roger','Mathilde','Didier','Luc','Veronique','Alain','Catherine','Christian','Aline','Marc','Dominique','Christine','Jerome','Karine','François','Delphine'
  ];
  // Moment jusqu’auquel l’icône d’exclamation est affichée au‑dessus
  // d’un braconnier lorsque le joueur entre dans son champ de vision.  Si
  // poacherAlertUntil <= Date.now(), l’icône ne s’affiche plus.
  let poacherAlertUntil = 0;
  // Indicateur d’événement en cours avec un braconnier.  Lorsque vrai,
  // les mouvements du joueur sont bloqués jusqu’au lancement du combat.
  let poacherEncountering = false;

  /**
   * Charge la table des braconniers vaincus depuis localStorage.
   * Cette fonction est fournie avant la création de la carte afin de
   * s’assurer que les braconniers déjà battus ne réapparaissent pas.
   */

  function loadBraconniers() {
    try {
      const data = localStorage.getItem('capyMonBraconniers');
      if (data) braconniersDefeated = JSON.parse(data) || {};
    } catch (e) {
      braconniersDefeated = {};
    }
  }
  function saveBraconniers() {
    try {
      localStorage.setItem('capyMonBraconniers', JSON.stringify(braconniersDefeated));
    } catch (e) {}
  }

  function loadCoins() {
    try {
      const d = localStorage.getItem('capyMonCoins');
      if (d) capyCoins = parseInt(d, 10) || 0;
    } catch (e) {
      capyCoins = 0;
    }
  }
  function saveCoins() {
    try {
      localStorage.setItem('capyMonCoins', String(capyCoins));
    } catch (e) {}
  }

  /**
   * Charge la correspondance des noms de braconniers depuis le stockage
   * local.  Chaque braconnier est associé à un nom unique par zone.
   */
  function loadPoacherNames() {
    try {
      const d = localStorage.getItem('capyMonPoacherNames');
      if (d) zonePoacherNames = JSON.parse(d) || {};
    } catch (e) {
      zonePoacherNames = {};
    }
  }
  /**
   * Sauvegarde les noms de braconniers dans le stockage local.
   */
  function savePoacherNames() {
    try {
      localStorage.setItem('capyMonPoacherNames', JSON.stringify(zonePoacherNames));
    } catch (e) {}
  }

  // Couleurs des tuiles (herbe et eau)
  // Définition des zones.  Chaque zone possède un nom, une palette de
  // couleurs et une répartition des rencontres.  Les clés des couleurs
  // 0 et 1 correspondent respectivement au sol et à l'eau.  La clé 2
  // correspond à une tente de soins (croix rouge) et la clé 3 à une
  // porte menant à une autre zone.  Vous pouvez ajouter d'autres zones
  // ici pour enrichir l'aventure.
  // Modèles de zones (biomes).  Le jeu utilise ces modèles en boucle
  // pour générer un nombre illimité de zones.  Le joueur progresse
  // constamment vers l’est, et tous les cinq biomes un braconnier
  // l’attend.  Les rencontres et les couleurs se répètent lorsqu’on
  // dépasse la longueur de ce tableau.
  const zones = [
    {
      name: 'Marais',
      colors: { 0: '#8ecf72', 1: '#76bdfb', 2: '#fdfdfd', 3: '#a67c52' },
      encounters: [ { key: 'capybara', prob: 1.0 } ]
    },
    {
      name: 'Forêt',
      colors: { 0: '#7dbd55', 1: '#5778a4', 2: '#fdfdfd', 3: '#a67c52' },
      // À partir de la deuxième zone, aucun capybara sauvage n’apparaît.  Les
      // rencontres se composent uniquement des autres espèces propres au biome.
      encounters: [
        { key: 'tortue', prob: 0.25 },
        { key: 'lapin', prob: 0.25 },
        { key: 'raton', prob: 0.25 },
        { key: 'paresseux', prob: 0.25 }
      ]
    },
    {
      name: 'Savane',
      colors: { 0: '#d4c26b', 1: '#8bb3e6', 2: '#fdfdfd', 3: '#a67c52' },
      encounters: [
        { key: 'tigre', prob: 0.35 },
        { key: 'hippopotame', prob: 0.35 },
        { key: 'lapin', prob: 0.15 },
        { key: 'raton', prob: 0.15 }
      ]
    }
    ,
    // Biome désertique : sables brûlants et créatures adaptées à la chaleur
    {
      name: 'Désert',
      colors: { 0: '#e2d8b0', 1: '#d0b093', 2: '#fdfdfd', 3: '#a67c52' },
      encounters: [
        { key: 'renard', prob: 0.3 },
        { key: 'chameau', prob: 0.4 },
        { key: 'serpent', prob: 0.3 }
      ]
    },
    // Biome montagneux : pics froids et faune robuste
    {
      name: 'Montagne',
      colors: { 0: '#a9b7c6', 1: '#6f869f', 2: '#fdfdfd', 3: '#a67c52' },
      encounters: [
        { key: 'herisson', prob: 0.2 },
        { key: 'tigre', prob: 0.15 },
        { key: 'hibou', prob: 0.25 },
        { key: 'loup', prob: 0.25 },
        { key: 'mouette', prob: 0.15 }
      ]
    },
    // Biome côtier : plages ensoleillées et animaux marins
    {
      name: 'Plage',
      colors: { 0: '#f0e0b0', 1: '#7ec7e8', 2: '#fdfdfd', 3: '#a67c52' },
      encounters: [
        { key: 'dauphin', prob: 0.35 },
        { key: 'mouette', prob: 0.35 },
        { key: 'grenouille', prob: 0.2 },
        { key: 'renard', prob: 0.1 }
      ]
    }
  ];
  // Index de la zone actuelle (par défaut : 0 = Marais).  Ce nombre peut
  // croître indéfiniment ; on utilisera currentZoneIndex % zones.length
  // pour déterminer le modèle de biome associé.
  let currentZoneIndex = 0;
  // Couleurs de tuiles actuellement utilisées (sera mis à jour lors du
  // changement de zone).
  let colors = zones[currentZoneIndex].colors;

  /**
   * Données des espèces rencontrables dans Capy Mon.  Chaque entrée définit le
   * nom humainement lisible, s'il est attrapable, sa réserve de points de
   * vie de base, les attaques qu'il utilise en combat et un court
   * descriptif humoristique pour le CapyDex.  Les capybaras sont les
   * seules créatures capturables.  Lorsqu'un joueur attrape un capybara,
   * il peut lui donner un nom et l'utiliser comme partenaire lors des
   * combats suivants.
   */
  const speciesData = {
    capybara: {
      name: 'Capybara',
      catchable: true,
      baseHP: 20,
      moves: ['Charge'],
      description: 'Le Capybara est le roi du chill : il passe ses journées à nager et à grignoter des carottes.'
    },
    tortue: {
      name: 'Tortue',
      catchable: false,
      baseHP: 18,
      moves: ['Charge', 'Carapace'],
      description: 'Cette tortue a la carapace solide comme une patate cuite. Elle avance lentement mais sûrement.'
    },
    raton: {
      name: 'Rat laveur',
      catchable: false,
      baseHP: 16,
      moves: ['Griffure', 'Jet de détritus'],
      description: 'Toujours en quête d’une poubelle à fouiller, ce raton laveur n’hésite pas à jeter des détritus.'
    },
    lapin: {
      name: 'Lapin',
      catchable: false,
      baseHP: 14,
      moves: ['Coups de pattes'],
      description: 'Un lapin bondissant qui aime dévorer les légumes des autres. On dit qu’il est rapide comme l’éclair.'
    }
    ,
    // Nouveaux adversaires : ces animaux ne sont pas capturables mais
    // ajoutent de la variété aux combats.  Chaque espèce possède ses
    // propres attaques et valeurs de vie.  Ces créatures sont stockées
    // dans le CapyDex lorsqu’elles sont rencontrées.
    tigre: {
      name: 'Tigre',
      catchable: false,
      baseHP: 25,
      moves: ['Rugissement', 'Griffe acérée'],
      description: 'Ce tigre redoutable rôde autour des rizières. Ses griffes font trembler les capybaras.'
    },
    paresseux: {
      name: 'Paresseux',
      catchable: false,
      baseHP: 22,
      moves: ['Bâillement', 'Griffure'],
      description: 'Ce paresseux bouge très lentement mais ses bâillements endorment ses adversaires (ou les amusent).'
    },
    hippopotame: {
      name: 'Hippopotame',
      catchable: false,
      baseHP: 30,
      moves: ['Morsure', 'Jet de boue'],
      description: 'Un hippopotame massif qui adore patauger dans la boue ; ses morsures font très mal.'
    }
  };

  /*
   * Ajout d’une vaste liste d’animaux supplémentaires afin d’atteindre
   * progressivement l’objectif de 151 espèces.  Ces entrées servent
   * d’exemple et peuvent être enrichies.  Chaque nouvelle espèce
   * possède un nom, un indicateur catchable (souvent false), une
   * quantité de PV de base et une liste d’attaques empruntées aux
   * définitions existantes.  Vous pouvez ajouter autant d’espèces que
   * nécessaire en suivant ce modèle.  Les images pour ces créatures
   * seront générées dynamiquement si aucun fichier PNG n’est fourni dans
   * assets/capymon (voir la fonction generatePlaceholder plus bas).
   */
  Object.assign(speciesData, {
    renard: {
      name: 'Renard',
      catchable: false,
      baseHP: 18,
      moves: ['Griffure', 'Jet de carotte'],
      description: 'Un renard malicieux qui bondit entre les buissons en quête de carottes à chaparder.'
    },
    grenouille: {
      name: 'Grenouille',
      catchable: false,
      baseHP: 16,
      moves: ['Jet de boue', 'Bâillement'],
      description: 'Cette grenouille bondissante adore éclabousser ses adversaires de boue.'
    },
    herisson: {
      name: 'Hérisson',
      catchable: false,
      baseHP: 20,
      moves: ['Griffe acérée', 'Carapace'],
      description: 'Un hérisson piquant qui se roule en boule pour se protéger avant d’attaquer.'
    },
    chameau: {
      name: 'Chameau',
      catchable: false,
      baseHP: 22,
      moves: ['Jet de boue', 'Rugissement'],
      description: 'Un chameau robuste qui peut cracher de la boue et grogner pour intimider.'
    },
    hibou: {
      name: 'Hibou',
      catchable: false,
      baseHP: 17,
      moves: ['Bâillement', 'Plongeon'],
      description: 'Ce hibou nocturne est maître du plongeon, surprenant ses proies depuis les airs.'
    },
    serpent: {
      name: 'Serpent',
      catchable: false,
      baseHP: 15,
      moves: ['Morsure', 'Jet de détritus'],
      description: 'Un serpent sinueux qui mord et lance des détritus avec perfidie.'
    },
    crocodile: {
      name: 'Crocodile',
      catchable: false,
      baseHP: 28,
      moves: ['Morsure', 'Jet de boue'],
      description: 'Terrifiant reptile des marécages qui mord violemment et projette de la boue.'
    },
    dauphin: {
      name: 'Dauphin',
      catchable: false,
      baseHP: 23,
      moves: ['Plongeon', 'Rugissement'],
      description: 'Un dauphin joueur qui saute hors de l’eau pour plonger sur ses adversaires.'
    },
    loup: {
      name: 'Loup',
      catchable: false,
      baseHP: 24,
      moves: ['Griffure', 'Rugissement'],
      description: 'Un loup farouche dont le hurlement glace le sang des capybaras.'
    },
    mouette: {
      name: 'Mouette',
      catchable: false,
      baseHP: 14,
      moves: ['Plongeon', 'Jet de détritus'],
      description: 'Une mouette vorace qui dérobe les frites et plonge sur tout ce qui brille.'
    }
  });

  // Ajout de nombreuses espèces supplémentaires provenant des assets pixelisés
  // fournis (animals_identified). Chaque entrée définit le nom anglais (clé),
  // conserve catchable à false, attribue des points de vie de base et une
  // liste d’attaques adaptées (mammifères, reptiles, oiseaux, insectes,
  // aquatiques).  La description informe le joueur du biome général où
  // l’animal vit.  Ces données sont fusionnées à speciesData avant la
  // génération des placeholders afin d’éviter l’incrémentation inutile de
  // clés "animalX".
  const additionalSpeciesData = {
    ant: { name: 'Ant', catchable: false, baseHP: 16, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce ant pixelisé vit principalement dans son biome.' },
    anteater: { name: 'Anteater', catchable: false, baseHP: 17, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce anteater pixelisé vit principalement dans son biome.' },
    armadillo: { name: 'Armadillo', catchable: false, baseHP: 18, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce armadillo pixelisé vit principalement dans son biome.' },
    baboon: { name: 'Baboon', catchable: false, baseHP: 19, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce baboon pixelisé vit principalement dans son biome.' },
    badger: { name: 'Badger', catchable: false, baseHP: 20, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce badger pixelisé vit principalement dans son biome.' },
    bear: { name: 'Bear', catchable: false, baseHP: 21, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce bear pixelisé vit principalement dans son biome.' },
    beaver: { name: 'Beaver', catchable: false, baseHP: 22, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce beaver pixelisé vit principalement dans son biome.' },
    bee: { name: 'Bee', catchable: false, baseHP: 23, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce bee pixelisé vit principalement dans son biome.' },
    beetle: { name: 'Beetle', catchable: false, baseHP: 24, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce beetle pixelisé vit principalement dans son biome.' },
    bison: { name: 'Bison', catchable: false, baseHP: 25, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce bison pixelisé vit principalement dans son biome.' },
    blackbird: { name: 'Blackbird', catchable: false, baseHP: 16, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce blackbird pixelisé vit principalement dans son biome.' },
    boar: { name: 'Boar', catchable: false, baseHP: 17, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce boar pixelisé vit principalement dans son biome.' },
    brown_snake: { name: 'Brown snake', catchable: false, baseHP: 18, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce brown snake pixelisé vit principalement dans son biome.' },
    buffalo: { name: 'Buffalo', catchable: false, baseHP: 19, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce buffalo pixelisé vit principalement dans son biome.' },
    butterfly: { name: 'Butterfly', catchable: false, baseHP: 20, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce butterfly pixelisé vit principalement dans son biome.' },
    camel: { name: 'Camel', catchable: false, baseHP: 21, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce camel pixelisé vit principalement dans son biome.' },
    caterpillar: { name: 'Caterpillar', catchable: false, baseHP: 22, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce caterpillar pixelisé vit principalement dans son biome.' },
    centipede: { name: 'Centipede', catchable: false, baseHP: 23, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce centipede pixelisé vit principalement dans son biome.' },
    chameleon: { name: 'Chameleon', catchable: false, baseHP: 24, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce chameleon pixelisé vit principalement dans son biome.' },
    cheetah: { name: 'Cheetah', catchable: false, baseHP: 25, moves: ['Charge', 'Jet de boue', 'Griffure', 'Hurlement'], description: 'Ce cheetah pixelisé vit principalement dans son biome.' },
    chipmunk: { name: 'Chipmunk', catchable: false, baseHP: 16, moves: ['Charge', 'Jet de boue', 'Griffure', 'Hurlement'], description: 'Ce chipmunk pixelisé vit principalement dans son biome.' },
    cow: { name: 'Cow', catchable: false, baseHP: 17, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce cow pixelisé vit principalement dans son biome.' },
    cricket: { name: 'Cricket', catchable: false, baseHP: 18, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce cricket pixelisé vit principalement dans son biome.' },
    crocodile: { name: 'Crocodile', catchable: false, baseHP: 19, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce crocodile pixelisé vit principalement dans son biome.' },
    crow: { name: 'Crow', catchable: false, baseHP: 20, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce crow pixelisé vit principalement dans son biome.' },
    dodo: { name: 'Dodo', catchable: false, baseHP: 21, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce dodo pixelisé vit principalement dans son biome.' },
    duck: { name: 'Duck', catchable: false, baseHP: 22, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce duck pixelisé vit principalement dans son biome.' },
    elephant: { name: 'Elephant', catchable: false, baseHP: 23, moves: ['Charge', 'Jet de boue', 'Griffure', 'Hurlement'], description: 'Ce elephant pixelisé vit principalement dans son biome.' },
    falcon: { name: 'Falcon', catchable: false, baseHP: 24, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce falcon pixelisé vit principalement dans son biome.' },
    ferret: { name: 'Ferret', catchable: false, baseHP: 25, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce ferret pixelisé vit principalement dans son biome.' },
    flamingo: { name: 'Flamingo', catchable: false, baseHP: 16, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce flamingo pixelisé vit principalement dans son biome.' },
    fly: { name: 'Fly', catchable: false, baseHP: 17, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce fly pixelisé vit principalement dans son biome.' },
    fox: { name: 'Fox', catchable: false, baseHP: 18, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce fox pixelisé vit principalement dans son biome.' },
    gecko: { name: 'Gecko', catchable: false, baseHP: 19, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce gecko pixelisé vit principalement dans son biome.' },
    goat: { name: 'Goat', catchable: false, baseHP: 20, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce goat pixelisé vit principalement dans son biome.' },
    goose: { name: 'Goose', catchable: false, baseHP: 21, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce goose pixelisé vit principalement dans son biome.' },
    grasshopper: { name: 'Grasshopper', catchable: false, baseHP: 22, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce grasshopper pixelisé vit principalement dans son biome.' },
    green_snake: { name: 'Green snake', catchable: false, baseHP: 23, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce green snake pixelisé vit principalement dans son biome.' },
    green_worm: { name: 'Green worm', catchable: false, baseHP: 24, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce green worm pixelisé vit principalement dans son biome.' },
    hamster: { name: 'Hamster', catchable: false, baseHP: 25, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce hamster pixelisé vit principalement dans son biome.' },
    hare: { name: 'Hare', catchable: false, baseHP: 16, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce hare pixelisé vit principalement dans son biome.' },
    hedgehog: { name: 'Hedgehog', catchable: false, baseHP: 17, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce hedgehog pixelisé vit principalement dans son biome.' },
    hen: { name: 'Hen', catchable: false, baseHP: 18, moves: ['Charge', 'Jet de boue', 'Griffure', 'Hurlement'], description: 'Ce hen pixelisé vit principalement dans son biome.' },
    heron: { name: 'Heron', catchable: false, baseHP: 19, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce heron pixelisé vit principalement dans son biome.' },
    horse: { name: 'Horse', catchable: false, baseHP: 20, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce horse pixelisé vit principalement dans son biome.' },
    hyena: { name: 'Hyena', catchable: false, baseHP: 21, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce hyena pixelisé vit principalement dans son biome.' },
    iguana: { name: 'Iguana', catchable: false, baseHP: 22, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce iguana pixelisé vit principalement dans son biome.' },
    kangaroo: { name: 'Kangaroo', catchable: false, baseHP: 23, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce kangaroo pixelisé vit principalement dans son biome.' },
    kingfisher: { name: 'Kingfisher', catchable: false, baseHP: 24, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce kingfisher pixelisé vit principalement dans son biome.' },
    leopard: { name: 'Leopard', catchable: false, baseHP: 25, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce leopard pixelisé vit principalement dans son biome.' },
    lion: { name: 'Lion', catchable: false, baseHP: 16, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce lion pixelisé vit principalement dans son biome.' },
    lizard: { name: 'Lizard', catchable: false, baseHP: 17, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce lizard pixelisé vit principalement dans son biome.' },
    llama: { name: 'Llama', catchable: false, baseHP: 18, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce llama pixelisé vit principalement dans son biome.' },
    lorikeet: { name: 'Lorikeet', catchable: false, baseHP: 19, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce lorikeet pixelisé vit principalement dans son biome.' },
    mallard: { name: 'Mallard', catchable: false, baseHP: 20, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce mallard pixelisé vit principalement dans son biome.' },
    millipede: { name: 'Millipede', catchable: false, baseHP: 21, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce millipede pixelisé vit principalement dans son biome.' },
    mole: { name: 'Mole', catchable: false, baseHP: 22, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce mole pixelisé vit principalement dans son biome.' },
    monkey: { name: 'Monkey', catchable: false, baseHP: 23, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce monkey pixelisé vit principalement dans son biome.' },
    moose: { name: 'Moose', catchable: false, baseHP: 24, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce moose pixelisé vit principalement dans son biome.' },
    mosquito: { name: 'Mosquito', catchable: false, baseHP: 25, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce mosquito pixelisé vit principalement dans son biome.' },
    myna: { name: 'Myna', catchable: false, baseHP: 16, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce myna pixelisé vit principalement dans son biome.' },
    owl: { name: 'Owl', catchable: false, baseHP: 17, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce owl pixelisé vit principalement dans son biome.' },
    parakeet: { name: 'Parakeet', catchable: false, baseHP: 18, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce parakeet pixelisé vit principalement dans son biome.' },
    parrot: { name: 'Parrot', catchable: false, baseHP: 19, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce parrot pixelisé vit principalement dans son biome.' },
    parrot_blue: { name: 'Parrot blue', catchable: false, baseHP: 20, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce parrot blue pixelisé vit principalement dans son biome.' },
    parrot_green: { name: 'Parrot green', catchable: false, baseHP: 21, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce parrot green pixelisé vit principalement dans son biome.' },
    penguin: { name: 'Penguin', catchable: false, baseHP: 22, moves: ['Plongeon', 'Jet de boue', 'Boue collante', 'Hurlement'], description: 'Ce penguin pixelisé vit principalement dans son biome.' },
    pig: { name: 'Pig', catchable: false, baseHP: 23, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce pig pixelisé vit principalement dans son biome.' },
    pigeon: { name: 'Pigeon', catchable: false, baseHP: 24, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce pigeon pixelisé vit principalement dans son biome.' },
    platypus: { name: 'Platypus', catchable: false, baseHP: 25, moves: ['Plongeon', 'Jet de boue', 'Boue collante', 'Hurlement'], description: 'Ce platypus pixelisé vit principalement dans son biome.' },
    prairie_dog: { name: 'Prairie dog', catchable: false, baseHP: 16, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce prairie dog pixelisé vit principalement dans son biome.' },
    quail: { name: 'Quail', catchable: false, baseHP: 17, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce quail pixelisé vit principalement dans son biome.' },
    rabbit: { name: 'Rabbit', catchable: false, baseHP: 18, moves: ['Charge', 'Jet de boue', 'Griffure', 'Hurlement'], description: 'Ce rabbit pixelisé vit principalement dans son biome.' },
    raccoon: { name: 'Raccoon', catchable: false, baseHP: 19, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce raccoon pixelisé vit principalement dans son biome.' },
    rhinoceros: { name: 'Rhinoceros', catchable: false, baseHP: 20, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce rhinoceros pixelisé vit principalement dans son biome.' },
    robin: { name: 'Robin', catchable: false, baseHP: 21, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce robin pixelisé vit principalement dans son biome.' },
    seagull: { name: 'Seagull', catchable: false, baseHP: 22, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce seagull pixelisé vit principalement dans son biome.' },
    seahorse: { name: 'Seahorse', catchable: false, baseHP: 23, moves: ['Plongeon', 'Jet de boue', 'Boue collante', 'Hurlement'], description: 'Ce seahorse pixelisé vit principalement dans son biome.' },
    seal: { name: 'Seal', catchable: false, baseHP: 24, moves: ['Plongeon', 'Jet de boue', 'Boue collante', 'Hurlement'], description: 'Ce seal pixelisé vit principalement dans son biome.' },
    sheep: { name: 'Sheep', catchable: false, baseHP: 25, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce sheep pixelisé vit principalement dans son biome.' },
    snail: { name: 'Snail', catchable: false, baseHP: 16, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce snail pixelisé vit principalement dans son biome.' },
    sparrow: { name: 'Sparrow', catchable: false, baseHP: 17, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce sparrow pixelisé vit principalement dans son biome.' },
    squirrel: { name: 'Squirrel', catchable: false, baseHP: 18, moves: ['Charge', 'Jet de boue', 'Griffure', 'Hurlement'], description: 'Ce squirrel pixelisé vit principalement dans son biome.' },
    swan: { name: 'Swan', catchable: false, baseHP: 19, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce swan pixelisé vit principalement dans son biome.' },
    teal_duck: { name: 'Teal duck', catchable: false, baseHP: 20, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce teal duck pixelisé vit principalement dans son biome.' },
    toad: { name: 'Toad', catchable: false, baseHP: 21, moves: ['Charge', 'Jet de boue', 'Griffure', 'Hurlement'], description: 'Ce toad pixelisé vit principalement dans son biome.' },
    tortoise: { name: 'Tortoise', catchable: false, baseHP: 22, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce tortoise pixelisé vit principalement dans son biome.' },
    toucan: { name: 'Toucan', catchable: false, baseHP: 23, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce toucan pixelisé vit principalement dans son biome.' },
    turkey: { name: 'Turkey', catchable: false, baseHP: 24, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce turkey pixelisé vit principalement dans son biome.' },
    turtle: { name: 'Turtle', catchable: false, baseHP: 25, moves: ['Morsure', 'Crocs venimeux', 'Carapace', 'Jet de boue'], description: 'Ce turtle pixelisé vit principalement dans son biome.' },
    vulture: { name: 'Vulture', catchable: false, baseHP: 16, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce vulture pixelisé vit principalement dans son biome.' },
    whale: { name: 'Whale', catchable: false, baseHP: 17, moves: ['Plongeon', 'Jet de boue', 'Boue collante', 'Hurlement'], description: 'Ce whale pixelisé vit principalement dans son biome.' },
    worm: { name: 'Worm', catchable: false, baseHP: 18, moves: ['Piqûre d\'insecte', 'Jet de détritus', 'Griffure', 'Charge'], description: 'Ce worm pixelisé vit principalement dans son biome.' },
    wren: { name: 'Wren', catchable: false, baseHP: 19, moves: ['Plongeon', 'Hurlement', 'Feuillage', 'Jet de détritus'], description: 'Ce wren pixelisé vit principalement dans son biome.' },
    yak: { name: 'Yak', catchable: false, baseHP: 20, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce yak pixelisé vit principalement dans son biome.' },
    zebra: { name: 'Zebra', catchable: false, baseHP: 21, moves: ['Charge', 'Morsure', 'Rugissement', 'Griffure'], description: 'Ce zebra pixelisé vit principalement dans son biome.' }
  };
  // Fusionner toutes ces nouvelles espèces au dictionnaire principal
  Object.assign(speciesData, additionalSpeciesData);

  // Toutes les créatures deviennent désormais attrapables.  On parcourt les
  // clés existantes de speciesData et on force la propriété catchable à true.
  Object.keys(speciesData).forEach((k) => {
    if (speciesData[k] && typeof speciesData[k] === 'object') {
      speciesData[k].catchable = true;
    }
  });
  // Charger les images correspondantes pour les nouvelles espèces.  Pour chaque
  // clé présente dans additionalSpeciesData, tenter de charger un fichier PNG
  // portant le même nom depuis assets/capymon/.  Si le fichier n’existe pas,
  // speciesImages[sp] restera undefined et generatePlaceholderImage sera utilisé.
  Object.keys(additionalSpeciesData).forEach((sp) => {
    const img = new Image();
    img.src = 'assets/capymon/' + sp + '.png';
    speciesImages[sp] = img;
  });

  // Définir des noms et attributs personnalisés pour les animaux générés
  // automatiquement (animal114 à animal150).  Chaque entrée possède un nom
  // français unique, un biome, des attaques et une description.  Elles sont
  // utilisées dans l’extension du bestiaire plus bas.

  // NOTE : placeholderDefinitions doit être déclaré **avant** d’être utilisé
  // dans l’IIFE extendSpeciesTo151() afin d’éviter l’erreur « Cannot access
  // 'placeholderDefinitions' before initialization ».  Initialement cette
  // constante était définie après l’IIFE, ce qui provoquait un écran noir au
  // lancement du jeu.  En la plaçant ici, nous garantissons que
  // extendSpeciesTo151() peut accéder aux définitions et créer des animaux
  // supplémentaires cohérents.
  // Cette définition principale des placeholders permet à extendSpeciesTo151()
  // d'utiliser ces valeurs sans provoquer d'erreur de portée.  Elle est
  // définie ici, avant l'IIFE, pour éviter toute fermeture temporelle.
  const placeholderDefinitions = [
    { name: 'Lynx', biome: 'forêt', moves: ['Charge','Griffure','Hurlement','Feuillage'] },
    { name: 'Panda', biome: 'forêt', moves: ['Charge','Griffure','Jet de carotte','Bain de boue'] },
    { name: 'Ours polaire', biome: 'plage', moves: ['Charge','Morsure','Hurlement','Plongeon'] },
    { name: 'Panda roux', biome: 'forêt', moves: ['Charge','Feuillage','Griffure','Boue collante'] },
    { name: 'Caracal', biome: 'désert', moves: ['Charge','Morsure','Rugissement','Piqûre d\'insecte'] },
    { name: 'Coati', biome: 'forêt', moves: ['Charge','Jet de détritus','Griffure','Hurlement'] },
    { name: 'Lynx roux', biome: 'montagne', moves: ['Charge','Morsure','Rugissement','Feuillage'] },
    { name: 'Guépard royal', biome: 'savane', moves: ['Charge','Jet de boue','Griffure','Hurlement'] },
    { name: 'Antilope', biome: 'savane', moves: ['Charge','Jet de boue','Feuillage','Boue collante'] },
    { name: 'Aigle', biome: 'montagne', moves: ['Plongeon','Hurlement','Feuillage','Jet de détritus'] },
    { name: 'Condor', biome: 'montagne', moves: ['Plongeon','Hurlement','Griffure','Jet de détritus'] },
    { name: 'Alpaga', biome: 'montagne', moves: ['Charge','Morsure','Rugissement','Griffure'] },
    { name: 'Buffle d\'eau', biome: 'savane', moves: ['Charge','Jet de boue','Rugissement','Griffure'] },
    { name: 'Dingo', biome: 'désert', moves: ['Charge','Morsure','Rugissement','Jet de boue'] },
    { name: 'Manchot empereur', biome: 'plage', moves: ['Plongeon','Boue collante','Hurlement','Jet de détritus'] },
    { name: 'Otarie', biome: 'plage', moves: ['Plongeon','Jet de boue','Boue collante','Feuillage'] },
    { name: 'Morse', biome: 'plage', moves: ['Plongeon','Morsure','Boue collante','Hurlement'] },
    { name: 'Phoque moine', biome: 'plage', moves: ['Plongeon','Jet de boue','Feuillage','Hurlement'] },
    { name: 'Tortue géante', biome: 'plage', moves: ['Morsure','Carapace','Jet de boue','Crocs venimeux'] },
    { name: 'Iguane marin', biome: 'plage', moves: ['Morsure','Crocs venimeux','Jet de boue','Hurlement'] },
    { name: 'Capucin', biome: 'forêt', moves: ['Charge','Griffure','Rugissement','Feuillage'] },
    { name: 'Civette', biome: 'forêt', moves: ['Charge','Morsure','Jet de détritus','Hurlement'] },
    { name: 'Échidné', biome: 'savane', moves: ['Charge','Crocs venimeux','Griffure','Jet de boue'] },
    { name: 'Gorille', biome: 'forêt', moves: ['Charge','Morsure','Rugissement','Griffure'] },
    { name: 'Jaguar', biome: 'forêt', moves: ['Charge','Morsure','Rugissement','Feuillage'] },
    { name: 'Kookaburra', biome: 'forêt', moves: ['Plongeon','Hurlement','Feuillage','Jet de détritus'] },
    { name: 'Okapi', biome: 'forêt', moves: ['Charge','Feuillage','Boue collante','Griffure'] },
    { name: 'Paresseux géant', biome: 'forêt', moves: ['Charge','Bâillement','Boue collante','Jet de détritus'] },
    { name: 'Puma', biome: 'montagne', moves: ['Charge','Morsure','Rugissement','Crocs venimeux'] },
    { name: 'Quokka', biome: 'savane', moves: ['Charge','Griffure','Hurlement','Feuillage'] },
    { name: 'Ratel', biome: 'savane', moves: ['Charge','Morsure','Crocs venimeux','Jet de détritus'] },
    { name: 'Tatou géant', biome: 'désert', moves: ['Charge','Carapace','Crocs venimeux','Jet de boue'] },
    { name: 'Tamandua', biome: 'désert', moves: ['Charge','Piqûre d\'insecte','Jet de détritus','Hurlement'] },
    { name: 'Wallaby', biome: 'savane', moves: ['Charge','Griffure','Hurlement','Jet de boue'] },
    { name: 'Xérus', biome: 'désert', moves: ['Charge','Griffure','Jet de détritus','Piqûre d\'insecte'] },
{ name: 'Yak sauvage', biome: 'montagne', moves: ['Charge','Morsure','Rugissement','Griffure'] },
    { name: 'Zorille', biome: 'savane', moves: ['Charge','Jet de détritus','Crocs venimeux','Hurlement'] }
  ];

  // Injection des nouvelles espèces réalistes juste avant la mise à jour des rencontres
  // Nous attendons que les listes de biomes (forestSpeciesList, savannaSpeciesList, etc.)
  // soient créées plus haut afin de pouvoir les mettre à jour ici.  Chaque nouvelle
  // espèce utilise une clé anglaise (pour le nom du fichier PNG) mais un nom
  // français pour l’affichage.  Toutes sont attrapables et se voient attribuer

  // Générer automatiquement des espèces factices jusqu'à atteindre 151 entrées.
  // Ces créatures génériques servent de place‑holders pour étoffer le bestiaire.
  // La fonction est définie ici mais appelée plus bas, après que les listes de
  // biomes (forestSpeciesList, savannaSpeciesList, etc.) ont été initialisées.
  function extendSpeciesTo151() {
    const existing = Object.keys(speciesData).length;
    const target = 150;
    if (existing < target) {
      // Index pour parcourir placeholderDefinitions.  Si nous manquons de
      // définitions personnalisées, on continue avec des noms génériques.
      let pdIndex = 0;
      for (let i = existing + 1; i <= target; i++) {
        const key = 'animal' + i;
        // Récupérer une définition si disponible
        const def = placeholderDefinitions[pdIndex++] || {};
        const pname = def.name || ('Mystérien ' + i);
        const biome = def.biome || ['forêt','savane','désert','montagne','plage'][i % 5];
        const moves = Array.isArray(def.moves) && def.moves.length >= 2 ? def.moves : ['Charge','Griffure','Jet de boue','Hurlement'];
        speciesData[key] = {
          name: pname,
          catchable: true,
          baseHP: 16 + (i % 10),
          moves: moves,
          description: def.description || (`Ce ${pname.toLowerCase()} mystérieux vit principalement dans ${biomeLabel(biome)}.`)
        };
        // Ajouter la clé à la liste du biome approprié afin que ces espèces
        // apparaissent dans les rencontres aléatoires.
        if (biome === 'forêt') forestSpeciesList.push(key);
        else if (biome === 'savane') savannaSpeciesList.push(key);
        else if (biome === 'désert') desertSpeciesList.push(key);
        else if (biome === 'montagne') mountainSpeciesList.push(key);
        else if (biome === 'plage') beachSpeciesList.push(key);
      }
    }
  }

  // Pour garantir qu’aucune espèce ne se contente de son attaque de base,
  // on ajoute automatiquement des attaques supplémentaires prises dans
  // une liste de capacités génériques.  Chaque créature aura au moins
  // quatre attaques (une de base plus trois supplémentaires).
  (function enrichSpeciesMoves() {
    const extras = ['Boue collante', 'Hurlement', 'Feuillage', 'Crocs venimeux', 'Écaille protectrice'];
    Object.keys(speciesData).forEach((key) => {
      const sp = speciesData[key];
      if (!Array.isArray(sp.moves)) sp.moves = ['Charge'];
      // S’assurer qu’il n’y a pas de doublons
      const set = new Set(sp.moves);
      while (set.size < 4) {
        const mv = extras[Math.floor(Math.random() * extras.length)];
        set.add(mv);
      }
      sp.moves = Array.from(set);
    });
  })();

  // Calculer un numéro unique pour chaque espèce afin de l'afficher dans le CapyDex.
  // Les clés sont triées alphabétiquement pour obtenir des numéros stables.
  const speciesNumbers = {};
  Object.keys(speciesData).sort().forEach((key, index) => {
    speciesNumbers[key] = index + 1;
  });

  // Répartition des nouvelles espèces dans des biomes cohérents.  Chaque tableau
  // contient les clés des espèces appartenant à un biome particulier.  Les
  // espèces existantes sont ajoutées plus bas lors de la construction des
  // rencontres des zones.
  const forestSpeciesList = ['badger','bear','beaver','blackbird','boar','butterfly','chipmunk','crow','ferret','fox','gecko','hamster','hare','hedgehog','hen','horse','mole','monkey','myna','owl','parakeet','parrot','parrot_blue','parrot_green','pigeon','quail','rabbit','raccoon','robin','sparrow','squirrel','turkey','wren','toad'];
  const savannaSpeciesList = ['baboon','bison','buffalo','camel','cheetah','cow','elephant','flamingo','hyena','kangaroo','leopard','lion','llama','moose','pig','prairie_dog','rhinoceros','sheep','zebra','vulture','crocodile','falcon'];
  const desertSpeciesList = ['ant','anteater','armadillo','bee','beetle','brown_snake','caterpillar','centipede','chameleon','cricket','fly','grasshopper','green_snake','green_worm','iguana','lizard','millipede','mosquito','snail','worm','tortoise'];
  const mountainSpeciesList = ['goat','yak','lorikeet'];
  const beachSpeciesList = ['duck','dodo','goose','penguin','seagull','seahorse','seal','swan','teal_duck','whale','kingfisher','platypus','mallard','heron','toucan','turtle'];

  // L'appel à extendSpeciesTo151() est déplacé plus bas, après la définition de
  // la fonction biomeLabel et l'application des traductions, afin de s'assurer
  // que toutes les dépendances sont prêtes.  Ne rien appeler ici.

  // -----------------------------------------------------------------------------
  // Traduction des noms anglais vers des noms français pour toutes les espèces
  // supplémentaires.  On associe également une description contextualisée selon
  // le biome principal de l’espèce.  Ce code est exécuté juste après la
  // définition des listes de biomes et avant la fusion dans speciesData afin
  // d’éviter des doublons de noms.  Chaque entrée du dictionnaire de
  // traduction correspond à la clé anglaise de additionalSpeciesData.  Les
  // descriptions sont générées dynamiquement en fonction du biome.
  const translationMap = {
    ant: 'Fourmi',
    anteater: 'Tamanoir',
    armadillo: 'Tatou',
    baboon: 'Babouin',
    badger: 'Blaireau',
    bear: 'Ours',
    beaver: 'Castor',
    bee: 'Abeille',
    beetle: 'Scarabée',
    bison: 'Bison',
    blackbird: 'Merle',
    boar: 'Sanglier',
    brown_snake: 'Serpent brun',
    buffalo: 'Buffle',
    butterfly: 'Papillon',
    camel: 'Dromadaire',
    caterpillar: 'Chenille',
    centipede: 'Millepattes',
    chameleon: 'Caméléon',
    cheetah: 'Guépard',
    chipmunk: 'Tamia',
    cow: 'Vache',
    cricket: 'Criquet',
    crocodile: 'Crocodile',
    crow: 'Corbeau',
    dodo: 'Dodo',
    duck: 'Canard',
    elephant: 'Éléphant',
    falcon: 'Faucon',
    ferret: 'Furet',
    flamingo: 'Flamant',
    fly: 'Mouche',
    fox: 'Fennec',
    gecko: 'Gecko',
    goat: 'Chèvre',
    goose: 'Oie',
    grasshopper: 'Sauterelle',
    green_snake: 'Serpent vert',
    green_worm: 'Ver vert',
    hamster: 'Hamster',
    hare: 'Lièvre',
    hedgehog: 'Hérisson brun',
    hen: 'Poule',
    heron: 'Héron',
    horse: 'Cheval',
    hyena: 'Hyène',
    iguana: 'Iguane',
    kangaroo: 'Kangourou',
    kingfisher: 'Martin-pêcheur',
    leopard: 'Léopard',
    lion: 'Lion',
    lizard: 'Lézard',
    llama: 'Lama',
    lorikeet: 'Loriquet',
    mallard: 'Colvert',
    millipede: 'Iule',
    mole: 'Taupe',
    monkey: 'Singe',
    moose: 'Élan',
    mosquito: 'Moustique',
    myna: 'Mainate',
    owl: 'Chouette',
    parakeet: 'Perruche',
    parrot: 'Perroquet',
    parrot_blue: 'Perruche bleue',
    parrot_green: 'Perruche verte',
    penguin: 'Manchot',
    pig: 'Cochon',
    pigeon: 'Pigeon',
    platypus: 'Ornithorynque',
    prairie_dog: 'Chien de prairie',
    quail: 'Caille',
    rabbit: 'Lapin sauvage',
    raccoon: 'Coati',
    rhinoceros: 'Rhinocéros',
    robin: 'Rouge-gorge',
    seagull: 'Goéland',
    seahorse: 'Hippocampe',
    seal: 'Phoque',
    sheep: 'Mouton',
    snail: 'Escargot',
    sparrow: 'Moineau',
    squirrel: 'Écureuil',
    swan: 'Cygne',
    teal_duck: 'Sarcelle',
    toad: 'Crapaud',
    tortoise: 'Tortue',
    toucan: 'Toucan',
    turkey: 'Dindon',
    turtle: 'Tortue marine',
    vulture: 'Vautour',
    whale: 'Baleine',
    worm: 'Ver',
    wren: 'Troglodyte',
    yak: 'Yak',
    zebra: 'Zèbre'
  };

  // Fonction utilitaire pour déterminer l’expression correcte selon le biome
  function biomeLabel(biome) {
    switch (biome) {
      case 'forêt':
        return 'la forêt';
      case 'savane':
        return 'la savane';
      case 'désert':
        return 'le désert';
      case 'montagne':
        return 'la montagne';
      case 'plage':
        return 'la plage';
      default:
        return 'la nature';
    }
  }

  // Appliquer la traduction et les descriptions sur les entrées supplémentaires
  Object.keys(additionalSpeciesData).forEach((key) => {
    const def = additionalSpeciesData[key];
    const frName = translationMap[key] || def.name;
    def.name = frName;
    // Déterminer le biome en consultant les listes
    let biome = '';
    if (forestSpeciesList.includes(key)) biome = 'forêt';
    else if (savannaSpeciesList.includes(key)) biome = 'savane';
    else if (desertSpeciesList.includes(key)) biome = 'désert';
    else if (mountainSpeciesList.includes(key)) biome = 'montagne';
    else if (beachSpeciesList.includes(key)) biome = 'plage';
    const label = biomeLabel(biome);
    def.description = `Ce ${frName.toLowerCase()} pixelisé vit principalement dans ${label}.`;
    // Rendre toutes les espèces attrapables
    def.catchable = true;
  });

  // Maintenant que les traductions ont été appliquées et que toutes les
  // dépendances (biomeLabel, listes de biomes, etc.) sont initialisées, on peut
  // générer les espèces factices supplémentaires.  Ceci appelle la fonction
  // extendSpeciesTo151 définie plus haut.  Si ce n’est pas fait après la
  // définition de biomeLabel, un ReferenceError serait déclenché car
  // biomeLabel n’existerait pas encore.
  extendSpeciesTo151();

  // Définir des noms et attributs personnalisés pour les animaux générés
  // automatiquement (animal114 à animal150).  Chaque entrée possède un nom
  // français unique, un biome, des attaques et une description.  Elles sont
  // utilisées dans l’extension du bestiaire plus bas.
  const placeholderDefinitions_unused = [
    { name: 'Lynx', biome: 'forêt', moves: ['Charge','Griffure','Hurlement','Feuillage'] },
    { name: 'Panda', biome: 'forêt', moves: ['Charge','Griffure','Jet de carotte','Bain de boue'] },
    { name: 'Ours polaire', biome: 'plage', moves: ['Charge','Morsure','Hurlement','Plongeon'] },
    { name: 'Panda roux', biome: 'forêt', moves: ['Charge','Feuillage','Griffure','Boue collante'] },
    { name: 'Caracal', biome: 'désert', moves: ['Charge','Morsure','Rugissement','Piqûre d\'insecte'] },
    { name: 'Coati', biome: 'forêt', moves: ['Charge','Jet de détritus','Griffure','Hurlement'] },
    { name: 'Lynx roux', biome: 'montagne', moves: ['Charge','Morsure','Rugissement','Feuillage'] },
    { name: 'Guépard royal', biome: 'savane', moves: ['Charge','Jet de boue','Griffure','Hurlement'] },
    { name: 'Antilope', biome: 'savane', moves: ['Charge','Jet de boue','Feuillage','Boue collante'] },
    { name: 'Aigle', biome: 'montagne', moves: ['Plongeon','Hurlement','Feuillage','Jet de détritus'] },
    { name: 'Condor', biome: 'montagne', moves: ['Plongeon','Hurlement','Griffure','Jet de détritus'] },
    { name: 'Alpaga', biome: 'montagne', moves: ['Charge','Morsure','Rugissement','Griffure'] },
    { name: 'Buffle d\'eau', biome: 'savane', moves: ['Charge','Jet de boue','Rugissement','Griffure'] },
    { name: 'Dingo', biome: 'désert', moves: ['Charge','Morsure','Rugissement','Jet de boue'] },
    { name: 'Manchot empereur', biome: 'plage', moves: ['Plongeon','Boue collante','Hurlement','Jet de détritus'] },
    { name: 'Otarie', biome: 'plage', moves: ['Plongeon','Jet de boue','Boue collante','Feuillage'] },
    { name: 'Morse', biome: 'plage', moves: ['Plongeon','Morsure','Boue collante','Hurlement'] },
    { name: 'Phoque moine', biome: 'plage', moves: ['Plongeon','Jet de boue','Feuillage','Hurlement'] },
    { name: 'Tortue géante', biome: 'plage', moves: ['Morsure','Carapace','Jet de boue','Crocs venimeux'] },
    { name: 'Iguane marin', biome: 'plage', moves: ['Morsure','Crocs venimeux','Jet de boue','Hurlement'] },
    { name: 'Capucin', biome: 'forêt', moves: ['Charge','Griffure','Rugissement','Feuillage'] },
    { name: 'Civette', biome: 'forêt', moves: ['Charge','Morsure','Jet de détritus','Hurlement'] },
    { name: 'Échidné', biome: 'savane', moves: ['Charge','Crocs venimeux','Griffure','Jet de boue'] },
    { name: 'Gorille', biome: 'forêt', moves: ['Charge','Morsure','Rugissement','Griffure'] },
    { name: 'Jaguar', biome: 'forêt', moves: ['Charge','Morsure','Rugissement','Feuillage'] },
    { name: 'Kookaburra', biome: 'forêt', moves: ['Plongeon','Hurlement','Feuillage','Jet de détritus'] },
    { name: 'Okapi', biome: 'forêt', moves: ['Charge','Feuillage','Boue collante','Griffure'] },
    { name: 'Paresseux géant', biome: 'forêt', moves: ['Charge','Bâillement','Boue collante','Jet de détritus'] },
    { name: 'Puma', biome: 'montagne', moves: ['Charge','Morsure','Rugissement','Crocs venimeux'] },
    { name: 'Quokka', biome: 'savane', moves: ['Charge','Griffure','Hurlement','Feuillage'] },
    { name: 'Ratel', biome: 'savane', moves: ['Charge','Morsure','Crocs venimeux','Jet de détritus'] },
    { name: 'Tatou géant', biome: 'désert', moves: ['Charge','Carapace','Crocs venimeux','Jet de boue'] },
    { name: 'Tamandua', biome: 'désert', moves: ['Charge','Piqûre d\'insecte','Jet de détritus','Hurlement'] },
    { name: 'Wallaby', biome: 'savane', moves: ['Charge','Griffure','Hurlement','Jet de boue'] },
    { name: 'Xérus', biome: 'désert', moves: ['Charge','Griffure','Jet de détritus','Piqûre d\'insecte'] },
    { name: 'Yak sauvage', biome: 'montagne', moves: ['Charge','Morsure','Rugissement','Griffure'] },
    { name: 'Zorille', biome: 'savane', moves: ['Charge','Jet de détritus','Crocs venimeux','Hurlement'] }
  ];

  // ---------------------------------------------------------------------------
  // Injection des nouvelles espèces réalistes juste avant la mise à jour des rencontres.
  // Les listes de biomes sont maintenant définies (forestSpeciesList, savannaSpeciesList,
  // desertSpeciesList, mountainSpeciesList, beachSpeciesList), ainsi que le tableau
  // speciesNumbers créé plus haut.  Nous pouvons donc ajouter nos nouvelles
  // créatures ici en toute sécurité.
  (function addNewSpecies() {
    const newSpecies = {
      lynx: { name: 'Lynx', catchable: true, baseHP: 20, moves: ['Charge','Griffure','Hurlement','Feuillage'], description: 'Ce lynx vit principalement dans la forêt.' },
      panda: { name: 'Panda', catchable: true, baseHP: 20, moves: ['Charge','Griffure','Jet de carotte','Bain de boue'], description: 'Ce panda vit principalement dans la forêt.' },
      polar_bear: { name: 'Ours polaire', catchable: true, baseHP: 21, moves: ['Charge','Morsure','Hurlement','Plongeon'], description: 'Cet ours polaire vit principalement sur la plage.' },
      red_panda: { name: 'Panda roux', catchable: true, baseHP: 19, moves: ['Charge','Feuillage','Griffure','Boue collante'], description: 'Ce panda roux vit principalement dans la forêt.' },
      caracal: { name: 'Caracal', catchable: true, baseHP: 20, moves: ['Charge','Morsure','Rugissement','Piqûre d\'insecte'], description: 'Ce caracal vit principalement dans le désert.' },
      coati: { name: 'Coati', catchable: true, baseHP: 19, moves: ['Charge','Jet de détritus','Griffure','Hurlement'], description: 'Ce coati vit principalement dans la forêt.' },
      bobcat: { name: 'Lynx roux', catchable: true, baseHP: 18, moves: ['Charge','Morsure','Rugissement','Feuillage'], description: 'Ce lynx roux vit principalement dans la montagne.' },
      king_cheetah: { name: 'Guépard royal', catchable: true, baseHP: 21, moves: ['Charge','Jet de boue','Griffure','Hurlement'], description: 'Ce guépard royal vit principalement dans la savane.' },
      antelope: { name: 'Antilope', catchable: true, baseHP: 18, moves: ['Charge','Jet de boue','Feuillage','Boue collante'], description: 'Cette antilope vit principalement dans la savane.' },
      eagle: { name: 'Aigle', catchable: true, baseHP: 20, moves: ['Plongeon','Hurlement','Feuillage','Jet de détritus'], description: 'Cet aigle vit principalement dans la montagne.' },
      condor: { name: 'Condor', catchable: true, baseHP: 20, moves: ['Plongeon','Hurlement','Griffure','Jet de détritus'], description: 'Ce condor vit principalement dans la montagne.' },
      alpaca: { name: 'Alpaga', catchable: true, baseHP: 19, moves: ['Charge','Morsure','Rugissement','Griffure'], description: 'Cet alpaga vit principalement dans la montagne.' },
      water_buffalo: { name: 'Buffle d\'eau', catchable: true, baseHP: 20, moves: ['Charge','Jet de boue','Rugissement','Griffure'], description: 'Ce buffle d\'eau vit principalement dans la savane.' },
      dingo: { name: 'Dingo', catchable: true, baseHP: 18, moves: ['Charge','Morsure','Rugissement','Jet de boue'], description: 'Ce dingo vit principalement dans le désert.' },
      emperor_penguin: { name: 'Manchot empereur', catchable: true, baseHP: 20, moves: ['Plongeon','Boue collante','Hurlement','Jet de détritus'], description: 'Ce manchot empereur vit principalement sur la plage.' },
      sea_lion: { name: 'Otarie', catchable: true, baseHP: 19, moves: ['Plongeon','Jet de boue','Boue collante','Feuillage'], description: 'Cette otarie vit principalement sur la plage.' },
      walrus: { name: 'Morse', catchable: true, baseHP: 21, moves: ['Plongeon','Morsure','Boue collante','Hurlement'], description: 'Ce morse vit principalement sur la plage.' },
      monk_seal: { name: 'Phoque moine', catchable: true, baseHP: 20, moves: ['Plongeon','Jet de boue','Feuillage','Hurlement'], description: 'Ce phoque moine vit principalement sur la plage.' },
      giant_tortoise: { name: 'Tortue géante', catchable: true, baseHP: 21, moves: ['Morsure','Carapace','Jet de boue','Crocs venimeux'], description: 'Cette tortue géante vit principalement sur la plage.' },
      marine_iguana: { name: 'Iguane marin', catchable: true, baseHP: 18, moves: ['Morsure','Crocs venimeux','Jet de boue','Hurlement'], description: 'Cet iguane marin vit principalement sur la plage.' },
      capuchin: { name: 'Capucin', catchable: true, baseHP: 20, moves: ['Charge','Griffure','Rugissement','Feuillage'], description: 'Ce capucin vit principalement dans la forêt.' },
      civet: { name: 'Civette', catchable: true, baseHP: 18, moves: ['Charge','Morsure','Jet de détritus','Hurlement'], description: 'Cette civette vit principalement dans la forêt.' },
      echidna: { name: 'Échidné', catchable: true, baseHP: 18, moves: ['Charge','Crocs venimeux','Griffure','Jet de boue'], description: 'Cet échidné vit principalement dans la savane.' },
      gorilla: { name: 'Gorille', catchable: true, baseHP: 22, moves: ['Charge','Morsure','Rugissement','Griffure'], description: 'Ce gorille vit principalement dans la forêt.' },
      jaguar: { name: 'Jaguar', catchable: true, baseHP: 21, moves: ['Charge','Morsure','Rugissement','Feuillage'], description: 'Ce jaguar vit principalement dans la forêt.' },
      kookaburra: { name: 'Kookaburra', catchable: true, baseHP: 17, moves: ['Plongeon','Hurlement','Feuillage','Jet de détritus'], description: 'Ce kookaburra vit principalement dans la forêt.' },
      okapi: { name: 'Okapi', catchable: true, baseHP: 20, moves: ['Charge','Feuillage','Boue collante','Griffure'], description: 'Cet okapi vit principalement dans la forêt.' },
      giant_sloth: { name: 'Paresseux géant', catchable: true, baseHP: 19, moves: ['Charge','Bâillement','Boue collante','Jet de détritus'], description: 'Ce paresseux géant vit principalement dans la forêt.' },
      puma: { name: 'Puma', catchable: true, baseHP: 21, moves: ['Charge','Morsure','Rugissement','Crocs venimeux'], description: 'Ce puma vit principalement dans la montagne.' },
      quokka: { name: 'Quokka', catchable: true, baseHP: 17, moves: ['Charge','Griffure','Hurlement','Feuillage'], description: 'Ce quokka vit principalement dans la savane.' },
      honey_badger: { name: 'Ratel', catchable: true, baseHP: 20, moves: ['Charge','Morsure','Crocs venimeux','Jet de détritus'], description: 'Ce ratel vit principalement dans la savane.' },
      tamandua: { name: 'Tamandua', catchable: true, baseHP: 18, moves: ['Charge','Piqûre d\'insecte','Jet de détritus','Hurlement'], description: 'Ce tamandua vit principalement dans le désert.' },
      giant_armadillo: { name: 'Tatou géant', catchable: true, baseHP: 21, moves: ['Charge','Carapace','Crocs venimeux','Jet de boue'], description: 'Ce tatou géant vit principalement dans le désert.' },
      wallaby: { name: 'Wallaby', catchable: true, baseHP: 18, moves: ['Charge','Griffure','Hurlement','Jet de boue'], description: 'Ce wallaby vit principalement dans la savane.' },
      xerus: { name: 'Xérus', catchable: true, baseHP: 17, moves: ['Charge','Griffure','Jet de détritus','Piqûre d\'insecte'], description: 'Ce xérus vit principalement dans le désert.' },
      wild_yak: { name: 'Yak sauvage', catchable: true, baseHP: 22, moves: ['Charge','Morsure','Rugissement','Griffure'], description: 'Ce yak sauvage vit principalement dans la montagne.' },
      zorilla: { name: 'Zorille', catchable: true, baseHP: 19, moves: ['Charge','Jet de détritus','Crocs venimeux','Hurlement'], description: 'Cette zorille vit principalement dans la savane.' }
    };
    Object.assign(speciesData, newSpecies);
    forestSpeciesList.push('lynx','panda','red_panda','coati','capuchin','civet','gorilla','jaguar','kookaburra','okapi','giant_sloth');
    savannaSpeciesList.push('king_cheetah','antelope','water_buffalo','quokka','honey_badger','wallaby','zorilla');
    desertSpeciesList.push('caracal','dingo','giant_armadillo','tamandua','xerus');
    mountainSpeciesList.push('bobcat','eagle','condor','alpaca','puma','wild_yak');
    beachSpeciesList.push('polar_bear','sea_lion','walrus','monk_seal','giant_tortoise','marine_iguana','emperor_penguin');
    Object.keys(speciesData).sort().forEach((key, index) => {
      speciesNumbers[key] = index + 1;
    });
  })();

  // Mise à jour des listes de rencontres des zones selon les biomes.  On conserve
  // le Marais (index 0) pour le Capybara.  Les rencontres sont uniformément
  // réparties sur les espèces de chaque biome ainsi que les créatures existantes
  // déjà assignées par le jeu original.
  (function updateZoneEncounters() {
    // Zone Forêt (index 1)
    const forestExisting = ['tortue','raton','lapin','paresseux'];
    const fList = forestSpeciesList.concat(forestExisting);
    const fProb = 1 / fList.length;
    zones[1].encounters = fList.map((k) => ({ key: k, prob: fProb }));
    // Zone Savane (index 2)
    const savannaExisting = ['tigre','hippopotame'];
    const sList = savannaSpeciesList.concat(savannaExisting);
    const sProb = 1 / sList.length;
    zones[2].encounters = sList.map((k) => ({ key: k, prob: sProb }));
    // Zone Désert (index 3)
    const desertExisting = ['renard','chameau','serpent'];
    const dList = desertSpeciesList.concat(desertExisting);
    const dProb = 1 / dList.length;
    zones[3].encounters = dList.map((k) => ({ key: k, prob: dProb }));
    // Zone Montagne (index 4)
    const mountainExisting = ['herisson','hibou','loup'];
    const mList = mountainSpeciesList.concat(mountainExisting);
    const mProb = 1 / mList.length;
    zones[4].encounters = mList.map((k) => ({ key: k, prob: mProb }));
    // Zone Plage (index 5)
    const beachExisting = ['dauphin','mouette','grenouille'];
    const bList = beachSpeciesList.concat(beachExisting);
    const bProb = 1 / bList.length;
    zones[5].encounters = bList.map((k) => ({ key: k, prob: bProb }));
  })();

  /*
   * -----------------------------------------------------------------------------
   *  CHARTE DE CONCEPTION POUR CAPY MON
   *
   *  Ce jeu repose sur une liste extensible d’espèces et d’attaques.  Pour
   *  ajouter de nouvelles créatures, il suffit d’ajouter une entrée dans
   *  speciesData avec les propriétés suivantes :
   *    - name : nom affiché dans l’interface.
   *    - catchable : booléen indiquant si l’espèce peut être capturée.
   *    - baseHP : points de vie de base.  Les PV définitifs sont calculés en
   *      ajoutant 2 PV par niveau.
   *    - moves : tableau des attaques disponibles.  Chaque attaque doit avoir
   *      été déclarée dans moveDefinitions.
   *    - description : court texte humoristique pour le CapyDex.
   *
   *  Pour équilibrer les espèces, privilégiez une base de PV comprise entre
   *  14 et 30, et limitez les attaques puissantes (power > 7) aux créatures
   *  rares.  Les créatures capturables (comme le Capybara) doivent rester
   *  suffisamment faibles pour encourager le joueur à composer une équipe
   *  variée.
   *
   *  Les attaques sont définies dans moveDefinitions.  Chaque attaque peut
   *  avoir une propriété `power` pour infliger des dégâts ou `heal` pour
   *  soigner.  Pour créer une nouvelle attaque, définissez une entrée avec
   *  un nom unique et attribuez-lui une puissance entre 2 et 10.  Pensez à
   *  varier les effets (soin, dégâts, altérations d’état) afin de renforcer
   *  l’intérêt tactique.
   *
   *  Les gains de niveaux sont calculés dans gainExperience() : chaque
   *  niveau augmente les PV de base et permet d’apprendre de nouvelles
   *  attaques.  Le barème d’expérience est volontairement progressif : un
   *  capy passe du niveau 1 au 2 après 20 XP, puis il faut 10 XP de plus
   *  pour chaque niveau suivant.  Adaptez ces valeurs pour moduler la durée
   *  de progression.
   *
   *  De nouveaux biomes peuvent être ajoutés en ajoutant des entrées au
   *  tableau `zones`.  Chaque zone définit un nom, une palette de couleurs
   *  pour les tuiles et une distribution d’apparition pour les espèces.  Pour
   *  étoffer le jeu, envisagez d’ajouter des déserts, des montagnes ou des
   *  plages, chacun avec des créatures et objets spécifiques.
   *
   *  L’objectif de long terme est d’atteindre 151 espèces uniques.  Cette
   *  architecture permet d’enrichir progressivement le bestiaire sans
   *  modifier le moteur du jeu : il suffit de compléter speciesData, de
   *  fournir des visuels vectoriels dans assets/capymon et d’ajouter les
   *  rencontres dans les biomes.
   * ---------------------------------------------------------------------------*/

  /**
   * Sprites pour chaque espèce.  Des illustrations vectorielles
   * détaillées sont chargées depuis le dossier assets/capymon.  Les
   * images sont créées à partir de la bibliothèque d’images générées
   * dynamiquement et stockées dans des fichiers PNG.  Si une espèce ne
   * possède pas d’illustration dédiée, l’entrée correspondante sera
   * undefined et aucune image ne s’affichera en combat.
   *
   *
   * La déclaration de cet objet a été déplacée en amont du fichier afin
   * d’éviter les erreurs liées à l’accès à la variable avant son
   * initialisation.  Auparavant, speciesImages était déclaré ici avec
   * `const`, mais il était déjà utilisé plus haut pour charger les
   * illustrations des espèces supplémentaires.  Comme les déclarations
   * `const` ne sont pas remontées (hoisted), cela provoquait une erreur
   * « Cannot access 'speciesImages' before initialization » et empêchait
   * le jeu de démarrer correctement.  Désormais, speciesImages est
   * défini avant toute référence, ce commentaire reste à titre
   * informatif.
   */
  // speciesImages est maintenant déclaré plus haut dans le fichier
  // pour être disponible lors du chargement des assets.
  (function loadSpeciesImages() {
    // Les images PNG fournies dans assets/capymon sont énumérées ici.  Les
    // espèces absentes seront illustrées via une image générée
    // dynamiquement (voir generatePlaceholderImage).  Pour ajouter un
    // nouveau fichier PNG, ajoutez simplement la clé correspondante à
    // cette liste.
    // Charger les PNG pour toutes les espèces prédéfinies qui disposent d'un fichier dans assets/capymon.
    // En plus des espèces initiales, on inclut celles ajoutées dans les mises à jour afin que leurs images
    // soient disponibles sans recourir au placeholder.  Les nouvelles espèces pixelisées sont chargées
    // séparément dans additionalSpeciesData.
    const keys = ['capybara', 'tortue', 'raton', 'lapin', 'tigre', 'paresseux', 'hippopotame', 'renard', 'grenouille', 'herisson', 'chameau', 'hibou', 'serpent', 'crocodile', 'dauphin', 'loup', 'mouette', 'capybara_volant'];
    keys.forEach((sp) => {
      const img = new Image();
      // Le chemin des images est relatif à capymon.html.  Lorsque cette page
      // est servie depuis /capy/, les assets se trouvent dans capy/assets/capymon.
      img.src = 'assets/capymon/' + sp + '.png';
      speciesImages[sp] = img;
    });
  })();

  /**
   * Génère dynamiquement une image de remplacement pour une espèce qui
   * ne possède pas de fichier PNG dédié.  L’image est créée sur un
   * canvas hors écran avec un fond pastel et l’initiale de l’espèce
   * (première lettre).  Cette approche maintient un style vectoriel
   * cohérent et évite la création de nombreux fichiers statiques.  Le
   * résultat est encodé en data URL et assigné dans speciesImages.
   * @param {string} speciesKey Clé de l’espèce
   */
  function generatePlaceholderImage(speciesKey) {
    const size = 80;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    // Générer une couleur à partir du hash du nom de l’espèce
    let hash = 0;
    for (let i = 0; i < speciesKey.length; i++) {
      hash += speciesKey.charCodeAt(i);
    }
    const hue = hash % 360;
    ctx.fillStyle = `hsl(${hue}, 60%, 80%)`;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    // Dessiner l’initiale en noir ou foncé
    ctx.fillStyle = '#333';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = speciesKey[0] ? speciesKey[0].toUpperCase() : '?';
    ctx.fillText(initial, size / 2, size / 2);
    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.src = dataUrl;
    speciesImages[speciesKey] = img;
    return img;
  }

  /**
   * Paramètres persistants du jeu Capy Mon.  Ils permettent au joueur
   * de personnaliser la vitesse du jeu, la vitesse de défilement du texte,
   * l’activation des animations, des sons et le mode sombre.  Ces
   * réglages sont enregistrés dans localStorage sous la clé
   * capyMonSettings et rechargés à chaque démarrage.
   */
  const capymonDefaultSettings = {
    speed: 1,
    textSpeed: 1,
    animationsOn: true,
    soundOn: true,
    darkMode: false
  };
  let capymonSettings = {};
  function loadCapymonSettings() {
    try {
      const data = localStorage.getItem('capyMonSettings');
      if (data) {
        capymonSettings = JSON.parse(data) || {};
      }
    } catch (e) {
      capymonSettings = {};
    }
    // Fusionner avec les valeurs par défaut pour garantir tous les champs
    capymonSettings = Object.assign({}, capymonDefaultSettings, capymonSettings);
  }
  function saveCapymonSettings() {
    try {
      localStorage.setItem('capyMonSettings', JSON.stringify(capymonSettings));
    } catch (e) {}
  }
  // Charger les paramètres au démarrage et appliquer le mode sombre si besoin
  loadCapymonSettings();
  document.body.classList.toggle('dark-mode', capymonSettings.darkMode);

  // Charger la progression des braconniers et la monnaie
  loadBraconniers();
  loadCoins();
  // Charger la correspondance des noms de braconniers
  loadPoacherNames();

  /**
   * Applique une classe d’animation CSS à un élément si les animations
   * sont activées dans les réglages.  La classe est retirée à la fin
   * de l’animation afin de permettre sa réutilisation.  Cette fonction
   * est utilisée pour animer les sprites lors des attaques ou soins.
   * @param {HTMLElement} el L’élément DOM à animer
   * @param {string} animClass Le nom de la classe d’animation à appliquer
   */
  function animateSprite(el, animClass) {
    if (!el || !animClass) return;
    if (!capymonSettings.animationsOn) return;
    el.classList.add(animClass);
    const cleanup = () => {
      el.classList.remove(animClass);
      el.removeEventListener('animationend', cleanup);
    };
    el.addEventListener('animationend', cleanup);
  }

  /**
   * Affiche un menu de réglages où le joueur peut personnaliser la
   * vitesse du jeu, la vitesse du texte, activer ou non les
   * animations, les sons et le mode sombre.  Les changements sont
   * sauvegardés immédiatement.
   */
  function openSettingsMenu() {
    // Ne pas ouvrir plusieurs overlays
    if (document.getElementById('capymon-settings-overlay')) return;
    // Jouer un son d'ouverture de menu
    playEffect('menu_open');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-settings-overlay';
    const card = document.createElement('div');
    card.className = 'menu-card';
    // Titre
    const h = document.createElement('h2');
    h.textContent = 'Options';
    card.appendChild(h);
    // Vitesse du jeu
    const speedContainer = document.createElement('div');
    speedContainer.style.display = 'flex';
    speedContainer.style.flexDirection = 'column';
    speedContainer.style.marginTop = '8px';
    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Vitesse du jeu';
    const speedInput = document.createElement('input');
    speedInput.type = 'range';
    speedInput.min = '1';
    speedInput.max = '3';
    speedInput.value = String(capymonSettings.speed);
    speedInput.addEventListener('input', () => {
      capymonSettings.speed = parseInt(speedInput.value, 10);
      saveCapymonSettings();
    });
    speedContainer.appendChild(speedLabel);
    speedContainer.appendChild(speedInput);
    card.appendChild(speedContainer);
    // Vitesse du texte
    const textContainer = document.createElement('div');
    textContainer.style.display = 'flex';
    textContainer.style.flexDirection = 'column';
    textContainer.style.marginTop = '8px';
    const textLabel = document.createElement('label');
    textLabel.textContent = 'Vitesse du texte';
    const textInput = document.createElement('input');
    textInput.type = 'range';
    textInput.min = '1';
    textInput.max = '3';
    textInput.value = String(capymonSettings.textSpeed);
    textInput.addEventListener('input', () => {
      capymonSettings.textSpeed = parseInt(textInput.value, 10);
      saveCapymonSettings();
    });
    textContainer.appendChild(textLabel);
    textContainer.appendChild(textInput);
    card.appendChild(textContainer);
    // Animations
    const animContainer = document.createElement('div');
    animContainer.style.display = 'flex';
    animContainer.style.alignItems = 'center';
    animContainer.style.marginTop = '8px';
    const animCheckbox = document.createElement('input');
    animCheckbox.type = 'checkbox';
    animCheckbox.checked = capymonSettings.animationsOn;
    animCheckbox.addEventListener('change', () => {
      capymonSettings.animationsOn = animCheckbox.checked;
      saveCapymonSettings();
    });
    animContainer.appendChild(animCheckbox);
    const animLabel = document.createElement('span');
    animLabel.textContent = 'Animations activées';
    animLabel.style.marginLeft = '6px';
    animContainer.appendChild(animLabel);
    card.appendChild(animContainer);
    // Sons
    const soundContainer = document.createElement('div');
    soundContainer.style.display = 'flex';
    soundContainer.style.alignItems = 'center';
    soundContainer.style.marginTop = '8px';
    const soundCheckbox = document.createElement('input');
    soundCheckbox.type = 'checkbox';
    soundCheckbox.checked = capymonSettings.soundOn;
    soundCheckbox.addEventListener('change', () => {
      capymonSettings.soundOn = soundCheckbox.checked;
      saveCapymonSettings();
    });
    soundContainer.appendChild(soundCheckbox);
    const soundLabel = document.createElement('span');
    soundLabel.textContent = 'Sons activés';
    soundLabel.style.marginLeft = '6px';
    soundContainer.appendChild(soundLabel);
    card.appendChild(soundContainer);
    // Mode sombre
    const darkContainer = document.createElement('div');
    darkContainer.style.display = 'flex';
    darkContainer.style.alignItems = 'center';
    darkContainer.style.marginTop = '8px';
    const darkCheckbox = document.createElement('input');
    darkCheckbox.type = 'checkbox';
    darkCheckbox.checked = capymonSettings.darkMode;
    darkCheckbox.addEventListener('change', () => {
      capymonSettings.darkMode = darkCheckbox.checked;
      saveCapymonSettings();
      document.body.classList.toggle('dark-mode', capymonSettings.darkMode);
    });
    darkContainer.appendChild(darkCheckbox);
    const darkLabel = document.createElement('span');
    darkLabel.textContent = 'Mode sombre';
    darkLabel.style.marginLeft = '6px';
    darkContainer.appendChild(darkLabel);
    card.appendChild(darkContainer);
    // Bouton de fermeture
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.style.marginTop = '12px';
    closeBtn.textContent = 'Fermer';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // Lier uniquement le bouton des réglages au menu d'options
  document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('capymon-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsMenu();
      });
    }
  });

  /**
   * Attaques possibles pour le joueur.  Chaque attaque a un nom et une
   * puissance de base.  Certaines attaques soignent plutôt que d’infliger
   * des dégâts, ce qui est indiqué par la propriété heal.
   */
  const moveDefinitions = {
    // Chaque attaque est dotée d’une puissance ou d’un soin ainsi que
    // d’une animation correspondante.  Les animations sont déclarées
    // dans style.css et activées lors des combats si animationsOn est
    // vrai dans les options.
    Charge: { power: 5, anim: 'anim-shake' },
    'Carapace': { power: 3, anim: 'anim-pulse' },
    Griffure: { power: 4, anim: 'anim-shake' },
    'Jet de détritus': { power: 5, anim: 'anim-flash' },
    'Coups de pattes': { power: 4, anim: 'anim-bounce' },
    Caresse: { heal: 6, anim: 'anim-pulse' },
    'Jet de carotte': { power: 7, anim: 'anim-flash' },
    'Méga Caresse': { heal: 12, anim: 'anim-pulse' }
    ,
    // Attaques supplémentaires pour les nouvelles espèces.  Rugissement
    // et Griffe acérée sont des coups puissants ; Bâillement a un
    // faible pouvoir d’attaque mais amuse la galerie ; Morsure et
    // Jet de boue offrent de nouveaux effets humoristiques.
    Rugissement: { power: 6, anim: 'anim-shake' },
    'Griffe acérée': { power: 7, anim: 'anim-shake' },
    Bâillement: { power: 2, anim: 'anim-bounce' },
    Morsure: { power: 8, anim: 'anim-shake' },
    'Jet de boue': { power: 5, anim: 'anim-flash' }
    ,
    // Attaque exclusive au Capybara volant.  Plongeon inflige un
    // dégât important en fondant sur l’adversaire comme un aigle.
    Plongeon: { power: 10, anim: 'anim-spin' }
    ,
    // Attaque exclusive aux mutants.  Inflige de lourds dégâts et
    // n’est disponible qu’aux créatures mutantes à partir du niveau 25.
    'Charge Mutante': { power: 110, anim: 'anim-flash' }
    ,
    // Nouvelles attaques pour enrichir le bestiaire.  Elles sont liées à
    // certains biomes et permettent à chaque espèce d’apprendre au moins
    // trois attaques supplémentaires.  « Boue collante » ralentit et
    // blesse, « Hurlement » effraie l’ennemi, « Feuillage » utilise
    // l’environnement, « Crocs venimeux » inflige de lourds dégâts et
    // « Écaille protectrice » soigne légèrement.
    'Boue collante': { power: 6, anim: 'anim-flash' },
    Hurlement: { power: 5, anim: 'anim-shake' },
    Feuillage: { power: 4, anim: 'anim-bounce' },
    'Crocs venimeux': { power: 7, anim: 'anim-shake' },
    'Écaille protectrice': { heal: 4, anim: 'anim-pulse' }
    ,
    // Nouvelles attaques exclusives au Capybara.  Ces attaques
    // apparaissent à différents niveaux d’expérience et offrent une
    // variété de capacités offensives et défensives.  Les animations
    // utilisent les effets existants pour conserver la cohérence visuelle.
    'Glissade': { power: 5, anim: 'anim-bounce' },
    'Relaxation': { heal: 4, anim: 'anim-pulse' },
    'Bombe de Carotte': { power: 9, anim: 'anim-flash' },
    'Bain de boue': { heal: 6, anim: 'anim-pulse' },
    'Course folle': { power: 7, anim: 'anim-shake' },
    'Lancer de fruit': { power: 6, anim: 'anim-flash' },
    'Piqûre d\'insecte': { power: 5, anim: 'anim-bounce' },
    'Buffet à volonté': { heal: 8, anim: 'anim-pulse' }
  };

  // -------------------------------------------------------------------------
  //
  // Enregistrement des attaques
  //
  // Dans la version originale du jeu, chaque attaque effectuée par le joueur
  // ou l’ennemi devait être consignée afin d’alimenter un MoveDex.
  // Lors d’une refactorisation, cette fonction avait été laissée vide,
  // empêchant l’ouverture du sous-menu « Attaques ».  Nous rétablissons ici
  // l’enregistrement effectif des attaques rencontrées.
  function recordMove(moveName) {
    moveDex[moveName] = true;
    saveMoveDex();
  }

  // Après la déclaration des attaques, on redéfinit les puissances selon
  // des paliers fixes afin d’apporter une variation plus marquée entre
  // attaques communes et rares.  Les valeurs initiales (2–10) sont
  // converties en 40/60/80/100 selon l’échelle suivante :
  // ≤4 → 40, ≤6 → 60, ≤8 → 80, >8 → 100.  Les attaques avec une
  // propriété heal conservent uniquement l’effet de soin et ne reçoivent
  // pas de valeur de puissance.
  Object.keys(moveDefinitions).forEach((mv) => {
    const def = moveDefinitions[mv];
    if (def && typeof def.power === 'number') {
      const p = def.power;
      if (p <= 4) def.power = 40;
      else if (p <= 6) def.power = 60;
      else if (p <= 8) def.power = 80;
      else def.power = 100;
    }
  });

  // *** Gestion des capybaras du joueur et de l'inventaire ***
  // Le joueur peut désormais posséder jusqu'à cinq capybaras.  Ces capys
  // sont stockés dans un tableau.  Chaque capy est un objet contenant
  // species (clé d'espèce), name (nom choisi), level, exp, maxHP,
  // currentHP, moves (liste des attaques) et un indicateur isKO
  // indiquant s'il est K.O. (impossible à appeler).  currentCapyIndex
  // représente l'index du capy actuellement utilisé en combat.  L'ensemble
  // des capys et de l'inventaire est sauvegardé dans localStorage
  // sous la clé capyMonPlayerData.
  let playerCapys = [];
  let currentCapyIndex = 0;
  // Inventaire des objets : clé = nom d'objet, valeur = quantité.
  let inventory = {};

  // Dictionnaire des attaques rencontrées pour le MoveDex.
  let moveDex = {};

  // Dictionnaire des objets rencontrés pour l’ItemDex.
  let itemDex = {};

  // Dictionnaire enregistrant toutes les espèces déjà rencontrées.  La clé
  // est l’identifiant de l’espèce et la valeur est true.  Cela sert
  // pour afficher le CapyDex.  Persisté dans localStorage sous la clé
  // capyDex.
  let capyDex = {};

  /**
   * Charge les capys du joueur et l'inventaire à partir du stockage local.
   * La structure sauvegardée est un objet { capys: [...], inventory: {...} }.
   * Si aucune donnée n'est trouvée, on initialise des valeurs par défaut.
   */
  function loadPlayerData() {
    try {
      const data = localStorage.getItem('capyMonPlayerData');
      if (data) {
        const obj = JSON.parse(data);
        if (Array.isArray(obj.capys)) {
          playerCapys = obj.capys;
        }
        if (obj && typeof obj.inventory === 'object') {
          inventory = obj.inventory;
        }
      }
    } catch (e) {
      /* ignore */
    }
    // S'assurer qu'on a au moins un tableau et un inventaire
    if (!Array.isArray(playerCapys)) playerCapys = [];
    if (!inventory || typeof inventory !== 'object') inventory = {};
    // Déterminer l'index du capy actif : si aucun, 0
    if (playerCapys.length === 0) {
      currentCapyIndex = 0;
    } else if (currentCapyIndex >= playerCapys.length) {
      currentCapyIndex = 0;
    }
  }

  /**
   * Sauvegarde les capys du joueur et l'inventaire dans localStorage.
   */
  function savePlayerData() {
    try {
      const data = {
        capys: playerCapys,
        inventory: inventory
      };
      localStorage.setItem('capyMonPlayerData', JSON.stringify(data));
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Charge le CapyDex à partir du stockage local.  Si aucun enregistrement
   * n’existe, un objet vide est utilisé.  Le CapyDex contient les
   * identifiants des espèces rencontrées.
   */
  function loadCapyDex() {
    try {
      const data = localStorage.getItem('capyDex');
      if (data) capyDex = JSON.parse(data) || {};
    } catch (e) {
      capyDex = {};
    }
  }

  /**
   * Sauvegarde le CapyDex dans le stockage local.
   */
  function saveCapyDex() {
    try {
      localStorage.setItem('capyDex', JSON.stringify(capyDex));
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Charge l’ItemDex (objets rencontrés) depuis le stockage local.
   */
  function loadItemDex() {
    try {
      const data = localStorage.getItem('itemDex');
      if (data) itemDex = JSON.parse(data) || {};
    } catch (e) {
      itemDex = {};
    }
  }

  /**
   * Sauvegarde l’ItemDex dans le stockage local.
   */
  function saveItemDex() {
    try {
      localStorage.setItem('itemDex', JSON.stringify(itemDex));
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Charge le MoveDex (attaques rencontrées) depuis le stockage local.
   */
  function loadMoveDex() {
    try {
      const data = localStorage.getItem('moveDex');
      if (data) moveDex = JSON.parse(data) || {};
    } catch (e) {
      moveDex = {};
    }
  }

  /**
   * Sauvegarde le MoveDex dans le stockage local.
   */
  function saveMoveDex() {
    try {
      localStorage.setItem('moveDex', JSON.stringify(moveDex));
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Enregistre un objet comme rencontré.
   * @param {string} key Nom interne de l’objet
   */
  function recordItem(key) {
    itemDex[key] = true;
    saveItemDex();
  }

  /**
   * Génère une équipe de cinq animaux pour un braconnier se trouvant
   * dans la zone spécifiée.  Les espèces sont tirées aléatoirement
   * parmi les rencontres de la zone actuelle et des quatre zones
   * précédentes.  Les niveaux sont majorés pour rendre le combat
   * difficile.
   * @param {number} zIndex Index de la zone du braconnier
   * @returns {Array<{species:string, level:number, maxHP:number, currentHP:number}>}
   */
  function generateTrainerTeam(zIndex) {
    const pool = [];
    for (let i = Math.max(0, zIndex - 4); i <= zIndex; i++) {
      // Utiliser le modèle de zone selon le modulo
      const template = zones[i % zones.length];
      template.encounters.forEach((e) => {
        // Éviter les capybaras comme adversaires de braconniers
        if (e.key !== 'capybara') {
          pool.push(e.key);
        }
      });
    }
    const team = [];
    for (let j = 0; j < 5; j++) {
      const spKey = pool[Math.floor(Math.random() * pool.length)];
      const level = zIndex + 1 + 3 + Math.floor(Math.random() * 3);
      const maxHP = (speciesData[spKey].baseHP || 10) + level * 2;
      team.push({ species: spKey, level: level, maxHP: maxHP, currentHP: maxHP });
    }
    return team;
  }

  /**
   * Démarre un combat contre le braconnier de la zone donnée.  Le
   * braconnier doit être vaincu pour passer à la zone suivante.  Un
   * message d’introduction est affiché et l’interface de combat est
   * initialisée.
   * @param {number} zIndex Index de la zone du braconnier
   */
  function startTrainerBattle(zIndex) {
    trainerBattle = true;
    trainerZoneIndex = zIndex;
    trainerTeamIndex = 0;
    trainerTeam = generateTrainerTeam(zIndex);
    // Choisir une phrase d’introduction pour ce braconnier
    const introPhrases = [
      'Hé toi ! Personne ne passe sans me battre !',
      'Je protège cette zone avec mes animaux, prépare‑toi !',
      'Tu ne franchiras pas cette porte tant que je serai là !',
      'Mes créatures sont invincibles ! Approche si tu l’oses !',
      'Le chemin est bloqué. Défi moi pour continuer !'
    ];
    const intro = introPhrases[zIndex % introPhrases.length];
    // Initialiser la structure battle avec le premier ennemi
    const first = trainerTeam[0];
    battle = {
      enemy: {
        species: first.species,
        level: first.level,
        maxHP: first.maxHP,
        currentHP: first.currentHP
      },
      playerTurn: true
    };
    inBattle = true;
    // Musique de combat contre un dresseur ou un braconnier
    playBattleMusic(true);
    // Jouer une introduction personnalisée avant de créer l’interface
    showBattleIntro(true, first.species, false, () => {
      createBattleOverlay('Braconnier');
      updateBattleUI(intro);
      setTimeout(() => {
        showBattleActions();
      }, 1200);
    });
  }

  /**
   * Traite la défaite d’un animal dans un combat de braconnier.  Si
   * d’autres animaux restent dans l’équipe du braconnier, ils sont
   * envoyés successivement.  Sinon, la victoire est accordée et le
   * joueur progresse.
   */
  function handleTrainerEnemyDefeat() {
    trainerTeamIndex++;
    if (trainerTeamIndex < trainerTeam.length) {
      const next = trainerTeam[trainerTeamIndex];
      battle.enemy = {
        species: next.species,
        level: next.level,
        maxHP: next.maxHP,
        currentHP: next.currentHP
      };
      updateBattleUI('Le braconnier envoie un autre animal !');
      setTimeout(() => {
        showBattleActions();
      }, 500);
    } else {
      // Braconnier vaincu
      updateBattleUI('Vous avez vaincu le braconnier !');
      braconniersDefeated[trainerZoneIndex] = true;
      saveBraconniers();
      // Terminer le combat et avancer d’une zone
      trainerBattle = false;
      setTimeout(() => {
        endBattle();
        // Aller à la zone suivante
        goToZone(trainerZoneIndex + 1);
      }, 1200);
    }
  }

  /**
   * En cas de défaite du joueur contre un braconnier, le joueur est
   * repoussé de quatre zones en arrière et soigné.  Un message
   * d’information est affiché pour renforcer la pression narrative.
   */
  function onTrainerDefeat() {
    // Jouer le son de défaite totale et arrêter la musique de combat
    playEffect('gameover');
    stopBattleMusic();
    updateBattleUI('Le braconnier vous a vaincu et vous chasse !');
    const newIndex = Math.max(0, trainerZoneIndex - 4);
    trainerBattle = false;
    setTimeout(() => {
      // Se téléporter et soigner
      currentZoneIndex = newIndex;
      generateMap();
      // Positionner le joueur à la tente ou à défaut près de l’origine
      player.x = 1;
      player.y = 1;
      playerCapys.forEach((c) => {
        c.currentHP = c.maxHP;
        c.isKO = false;
      });
      currentCapyIndex = 0;
      savePlayerData();
      draw();
      alert('Vous êtes repoussé de plusieurs zones et soigné. Préparez‑vous mieux pour affronter ce braconnier !');
      endBattle();
    }, 1200);
  }

  /**
   * Ouvre la boutique où le joueur peut vendre des Capys et acheter des
   * objets.  Un overlay est créé avec la liste des capys à vendre et
   * les articles disponibles à l’achat.  Des messages de
   * confirmation accompagnent chaque transaction.
   */
  function openShop() {
    // Ne pas ouvrir plusieurs boutiques à la fois
    if (document.getElementById('capymon-shop')) return;
    // Jouer un son d'ouverture de menu
    playEffect('menu_open');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-shop';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const h = document.createElement('h2');
    h.textContent = 'Boutique';
    card.appendChild(h);
    const moneyP = document.createElement('p');
    moneyP.textContent = `Pièces : ${capyCoins}`;
    card.appendChild(moneyP);
    // Liste des Capys à vendre
    if (playerCapys.length > 0) {
      const sellTitle = document.createElement('h3');
      sellTitle.textContent = 'Vendre un Capy';
      card.appendChild(sellTitle);
      playerCapys.forEach((capy, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        const price = capy.level * 10;
        btn.textContent = `${capy.name} (Niv ${capy.level}) – ${price} pièces`;
        btn.addEventListener('click', () => {
          // Guilt message
          alert(`${capy.name} vous regarde tristement vous éloigner ; il sait qu’il ne vous reverra plus jamais...`);
          capyCoins += price;
          // Retirer le capy de l’équipe
          playerCapys.splice(idx, 1);
          if (currentCapyIndex >= playerCapys.length) currentCapyIndex = 0;
          savePlayerData();
          saveCoins();
          overlay.remove();
          openShop();
        });
        card.appendChild(btn);
      });
    }
    // Liste des articles à acheter
    const shopTitle = document.createElement('h3');
    shopTitle.textContent = 'Acheter des objets';
    card.appendChild(shopTitle);
    const items = [
      { key: 'potion', name: 'Potion', price: 20 },
      { key: 'super-carotte', name: 'Super‑carotte', price: 50 },
      { key: 'revolver', name: 'Revolver', price: 100 },
      { key: 'filet', name: 'Filet', price: 30 },
      { key: 'sifflet', name: 'Sifflet', price: 25 }
    ];
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = `${item.name} – ${item.price} pièces`;
      btn.addEventListener('click', () => {
        if (capyCoins < item.price) {
          alert('Vous n’avez pas assez de pièces.');
          return;
        }
        capyCoins -= item.price;
        if (!inventory[item.key]) inventory[item.key] = 0;
        inventory[item.key]++;
        savePlayerData();
        saveCoins();
        alert(`Vous achetez ${item.name} !`);
        overlay.remove();
        openShop();
      });
      card.appendChild(btn);
    });
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.style.marginTop = '12px';
    closeBtn.textContent = 'Fermer';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
      // Mettre à jour la carte pour redessiner le joueur
      draw();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // Charger les données du joueur (capys et inventaire) au démarrage
  loadPlayerData();
  loadCapyDex();
  loadItemDex();
  loadMoveDex();

  /**
   * Donne de l’expérience au capybara du joueur.  Si suffisamment
   * d’expérience est accumulée, il monte de niveau, regagne tous ses
   * PV et peut apprendre de nouvelles attaques.  Au niveau 32, il
   * évolue en Capybara volant et voit sa jauge de PV augmenter.
   * @param {number} exp Le nombre de points d’expérience à ajouter
   */
  function gainExperience(exp) {
    // Donner de l'expérience au capy actuellement utilisé
    const capy = playerCapys[currentCapyIndex];
    if (!capy) return;
    capy.exp = (capy.exp || 0) + exp;
    // Formule simple : chaque niveau nécessite (niveau * 2 + 10) XP
    let expNeeded = capy.level * 2 + 10;
    while (capy.exp >= expNeeded) {
      capy.exp -= expNeeded;
      capy.level++;
      // Réinitialiser ses PV au nouveau maximum
      const baseHP = (speciesData[capy.species] || {}).baseHP || 10;
      capy.maxHP = baseHP + capy.level * 2;
      capy.currentHP = capy.maxHP;
      // Annoncer la montée de niveau
      playEffect('notification');
      updateBattleUI(`${capy.name} monte au niveau ${capy.level} !`);
      // Apprendre des attaques basiques à des niveaux définis
      if (!capy.moves.includes('Caresse') && capy.level >= 5) {
        capy.moves.push('Caresse');
        recordMove('Caresse');
      }
      if (!capy.moves.includes('Jet de carotte') && capy.level >= 12) {
        capy.moves.push('Jet de carotte');
        recordMove('Jet de carotte');
      }
      if (!capy.moves.includes('Méga Caresse') && capy.level >= 20) {
        capy.moves.push('Méga Caresse');
        recordMove('Méga Caresse');
      }
      // Évolution en Capybara volant au niveau 32
      if (capy.species === 'capybara' && capy.level >= 32) {
        capy.species = 'capybara_volant';
        if (!speciesData.capybara_volant) {
          speciesData.capybara_volant = {
            name: 'Capybara volant',
            catchable: false,
            baseHP: 28,
            moves: ['Charge', 'Jet de carotte', 'Plongeon'],
            description: 'Une légende vivante munie d’ailes. Il plane au‑dessus des carottes comme un aigle de la verdure.'
          };
        }
        if (!capy.moves.includes('Plongeon')) {
          capy.moves.push('Plongeon');
          recordMove('Plongeon');
        }
      }
      // Attaques exclusives aux capybaras réparties sur plusieurs niveaux
      if (capy.species === 'capybara' || capy.species === 'capybara_volant') {
        const extraList = [
          { move: 'Glissade', level: 2 },
          { move: 'Relaxation', level: 7 },
          { move: 'Bombe de Carotte', level: 10 },
          { move: 'Bain de boue', level: 14 },
          { move: 'Course folle', level: 18 },
          { move: 'Lancer de fruit', level: 22 },
          { move: "Piqûre d'insecte", level: 26 },
          { move: 'Buffet à volonté', level: 30 }
        ];
        extraList.forEach((cfg) => {
          if (!capy.moves.includes(cfg.move) && capy.level >= cfg.level) {
            capy.moves.push(cfg.move);
            recordMove(cfg.move);
          }
        });
      }
      // Apprentissage aléatoire d’une attaque toutes les 5 niveaux
      if (capy.level % 5 === 0) {
        const allMoves = Object.keys(moveDefinitions);
        const unknown = allMoves.filter((mv) => !capy.moves.includes(mv));
        if (unknown.length > 0) {
          const learned = unknown[Math.floor(Math.random() * unknown.length)];
          if (capy.moves.length < 4) {
            capy.moves.push(learned);
            recordMove(learned);
            updateBattleUI(`${capy.name} apprend ${learned} !`);
          } else {
            const confirmReplace = confirm(`${capy.name} veut apprendre ${learned}, mais connaît déjà 4 attaques. Voulez‑vous en remplacer une ? (Annuler pour conserver ses attaques actuelles)`);
            if (confirmReplace) {
              const promptMsg = `Quelle attaque remplacer ? Entrez le numéro correspondant :\n` + capy.moves.map((mv, i) => `${i + 1}. ${mv}`).join('\n');
              const choice = prompt(promptMsg);
              const idx = parseInt(choice, 10) - 1;
              if (!isNaN(idx) && idx >= 0 && idx < capy.moves.length) {
                const oldMove = capy.moves[idx];
                capy.moves[idx] = learned;
                recordMove(learned);
                updateBattleUI(`${capy.name} oublie ${oldMove} et apprend ${learned} !`);
              } else {
                updateBattleUI(`${capy.name} renonce à apprendre ${learned}.`);
              }
            } else {
              updateBattleUI(`${capy.name} renonce à apprendre ${learned}.`);
            }
          }
        }
      }
      // Si le capy est mutant et atteint le niveau 25, apprendre Charge Mutante
      if (capy.mutant && capy.level >= 25 && !capy.moves.includes('Charge Mutante')) {
        capy.moves.push('Charge Mutante');
        recordMove('Charge Mutante');
        updateBattleUI(`${capy.name} apprend Charge Mutante !`);
      }
      // Vérifier si ce capy doit évoluer en une nouvelle espèce
      const evoTarget = evolutions[capy.species];
      if (evoTarget && capy.level >= evolutionLevels[capy.species]) {
        // Éviter de répéter l’évolution si elle a déjà eu lieu
        if (capy.species !== evoTarget) {
          evolveCapy(capy, evoTarget);
        }
      }
      // Mise à jour de l’XP nécessaire pour le prochain niveau
      expNeeded = capy.level * 2 + 10;
    }
    savePlayerData();
  }

  /**
   * Crée et affiche l’interface de combat (overlay et carte).  La zone
   * d’actions est vide au départ et sera remplie par showBattleActions().
   * @param {string} enemyName Le nom humainement lisible de l’ennemi
   */
  function createBattleOverlay(enemyName) {
    // Supprimer toute overlay de combat existante
    const existing = document.getElementById('capymon-battle');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-battle';
    const card = document.createElement('div');
    card.className = 'menu-card';
    // Titre du combat
    const title = document.createElement('h2');
    title.textContent = 'Combat !';
    card.appendChild(title);
    // Conteneur pour les indicateurs de braconnier (équipe restante).
    const balls = document.createElement('div');
    balls.className = 'trainer-balls-container';
    balls.style.display = 'flex';
    balls.style.justifyContent = 'center';
    balls.style.gap = '4px';
    balls.style.marginBottom = '4px';
    card.appendChild(balls);
    // Zone des sprites des combattants : deux images côte à côte
    const spriteWrap = document.createElement('div');
    spriteWrap.style.display = 'flex';
    spriteWrap.style.justifyContent = 'space-between';
    spriteWrap.style.alignItems = 'center';
    spriteWrap.style.marginTop = '4px';
    // Conteneur joueur
    const playerImg = document.createElement('img');
    playerImg.style.width = '80px';
    playerImg.style.height = '80px';
    playerImg.style.objectFit = 'contain';
    // Conteneur ennemi : on enveloppe l'image pour pouvoir y ajouter une
    // aura de paillettes en cas de mutant
    const enemyWrap = document.createElement('div');
    enemyWrap.style.position = 'relative';
    const enemyImg = document.createElement('img');
    enemyImg.style.width = '80px';
    enemyImg.style.height = '80px';
    enemyImg.style.objectFit = 'contain';
    enemyWrap.appendChild(enemyImg);
    // Aura de paillettes, masquée par défaut.  Cette div contiendra
    // plusieurs étoiles qui tournent autour du sprite lorsque l’animal
    // est mutant.  Les styles sont définis dans capymon.html.
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle-container hidden';
    enemyWrap.appendChild(sparkle);
    // Ajout des sprites au conteneur
    spriteWrap.appendChild(playerImg);
    spriteWrap.appendChild(enemyWrap);
    card.appendChild(spriteWrap);
    // Zone d’état pour les PV des combattants (remplie dans updateBattleUI)
    const status = document.createElement('div');
    status.style.display = 'flex';
    status.style.flexDirection = 'column';
    status.style.gap = '4px';
    card.appendChild(status);
    // Message informatif
    const msg = document.createElement('div');
    msg.style.marginTop = '8px';
    msg.style.minHeight = '1.6em';
    card.appendChild(msg);
    // Zone des actions
    const actions = document.createElement('div');
    actions.style.display = 'grid';
    actions.style.gridTemplateColumns = '1fr 1fr';
    actions.style.gap = '6px';
    actions.style.marginTop = '10px';
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    battleUI = {
      overlay: overlay,
      messageEl: msg,
      actionsEl: actions,
      statusEl: status,
      playerImg: playerImg,
      enemyImg: enemyImg,
      enemyWrap: enemyWrap,
      sparkleEl: sparkle,
      trainerBallsEl: balls
    };
  }

  /**
   * Met à jour l’affichage des PV et le message dans l’interface de combat.
   * @param {string} message Message à afficher au-dessus des actions.
   */
  function updateBattleUI(message) {
    // Met à jour le texte et les barres d’état pendant un combat.  Cette
    // implémentation utilise un unique conteneur statusEl au lieu de
    // séparer explicitement les statuts joueur/ennemi.  Cela simplifie la
    // structure DOM et permet de réordonner facilement les éléments pour
    // afficher l’ennemi en haut et le joueur en bas.
    if (!battleUI) return;
    // Mettre à jour le message informatif
    battleUI.messageEl.textContent = message || '';
    const statusEl = battleUI.statusEl;
    if (!statusEl) return;
    // Nettoyer le conteneur des statuts
    statusEl.innerHTML = '';
    // Fonction utilitaire pour créer le bloc statut d’un capy
    function createStatusBlock(name, level, currentHP, maxHP, isPlayer, exp, capyLevel) {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      // Ligne nom + PV
      const nameLine = document.createElement('div');
      nameLine.textContent = `${name} (Niv ${level}) ${Math.max(0, currentHP)}/${maxHP} PV`;
      container.appendChild(nameLine);
      // Barre de PV
      const hpContainer = document.createElement('div');
      hpContainer.style.width = '100%';
      hpContainer.style.height = '6px';
      hpContainer.style.backgroundColor = '#444';
      hpContainer.style.borderRadius = '3px';
      hpContainer.style.marginTop = '2px';
      const hpBar = document.createElement('div');
      const ratio = Math.max(0, currentHP) / maxHP;
      hpBar.style.width = (ratio * 100) + '%';
      hpBar.style.height = '100%';
      hpBar.style.borderRadius = '3px';
      hpBar.style.backgroundColor = ratio < 0.15 ? 'red' : 'green';
      hpContainer.appendChild(hpBar);
      container.appendChild(hpContainer);
      // Barre d’XP uniquement pour le joueur
      if (isPlayer) {
        const xpNeeded = capyLevel * 2 + 10;
        const xpRatio = (exp || 0) / xpNeeded;
        const xpContainer = document.createElement('div');
        xpContainer.style.width = '100%';
        xpContainer.style.height = '4px';
        xpContainer.style.backgroundColor = '#444';
        xpContainer.style.borderRadius = '2px';
        xpContainer.style.marginTop = '2px';
        const xpBar = document.createElement('div');
        xpBar.style.width = (Math.min(1, xpRatio) * 100) + '%';
        xpBar.style.height = '100%';
        xpBar.style.borderRadius = '2px';
        xpBar.style.backgroundColor = '#00f';
        xpContainer.appendChild(xpBar);
        container.appendChild(xpContainer);
      }
      return container;
    }
    // Ajouter d’abord le statut de l’ennemi (en haut)
    if (battle && battle.enemy) {
      const e = battle.enemy;
      let spName = speciesData[e.species] ? speciesData[e.species].name : e.species;
      // Ajouter un préfixe si l’ennemi est mutant pour l’identifier clairement
      if (e.mutant) {
        spName = 'Mutant ' + spName;
      }
      const enemyBlock = createStatusBlock(spName, e.level, e.currentHP, e.maxHP, false);
      statusEl.appendChild(enemyBlock);
    }
    // Ensuite ajouter le statut du joueur (en bas)
    if (playerCapys.length > 0) {
      const capy = playerCapys[currentCapyIndex];
      if (capy) {
        const playerBlock = createStatusBlock(
          capy.name,
          capy.level,
          capy.currentHP,
          capy.maxHP,
          true,
          capy.exp || 0,
          capy.level
        );
        statusEl.appendChild(playerBlock);
      }
    } else {
      // Aucun capy : indiquer que le joueur n’en a pas
      const none = document.createElement('div');
      none.textContent = 'Vous n’avez pas de Capy !';
      statusEl.appendChild(none);
    }
    // Mettre à jour les images des sprites
    if (battleUI.playerImg) {
      if (playerCapys.length > 0) {
        const capy = playerCapys[currentCapyIndex];
        const sp = capy.species;
        if (speciesImages[sp]) {
          battleUI.playerImg.src = speciesImages[sp].src;
        } else {
          const img = generatePlaceholderImage(sp);
          battleUI.playerImg.src = img.src;
        }
        // Appliquer l'orientation pour le sprite du joueur : on veut que
        // l'animal du joueur regarde vers la droite.  Si l'image est
        // orientée à gauche, on la retourne horizontalement.
        const ori = orientationMap[sp] || 'left';
        battleUI.playerImg.style.transform = (ori === 'left') ? 'scaleX(-1)' : '';
      } else {
        battleUI.playerImg.removeAttribute('src');
      }
    }
    if (battleUI.enemyImg) {
      if (battle && battle.enemy) {
        const sp = battle.enemy.species;
        if (speciesImages[sp]) {
          battleUI.enemyImg.src = speciesImages[sp].src;
        } else {
          const img = generatePlaceholderImage(sp);
          battleUI.enemyImg.src = img.src;
        }
        // Appliquer l'orientation pour le sprite ennemi : l'ennemi
        // doit regarder vers la gauche.  Si l'image originale regarde
        // vers la droite, on la retourne horizontalement.
        const oriE = orientationMap[sp] || 'left';
        battleUI.enemyImg.style.transform = (oriE === 'right') ? 'scaleX(-1)' : '';
      } else {
        battleUI.enemyImg.removeAttribute('src');
      }
    }

    // Mettre à jour les indicateurs d’équipe lorsqu’on affronte un braconnier
    if (battleUI.trainerBallsEl) {
      if (trainerBattle) {
        const container = battleUI.trainerBallsEl;
        container.innerHTML = '';
        for (let i = 0; i < trainerTeam.length; i++) {
          const ball = document.createElement('span');
          ball.className = 'trainer-ball ' + (i < trainerTeamIndex ? 'defeated' : 'alive');
          container.appendChild(ball);
        }
        container.style.display = 'flex';
      } else {
        // Cacher l’indicateur hors des combats de braconnier
        battleUI.trainerBallsEl.style.display = 'none';
      }
    }
    // Afficher ou masquer l’aura de paillettes pour un ennemi mutant
    if (battleUI.sparkleEl) {
      if (battle && battle.enemy && battle.enemy.mutant) {
        battleUI.sparkleEl.classList.remove('hidden');
        // Créer les étoiles si ce n’est pas déjà fait
        if (battleUI.sparkleEl.children.length === 0) {
          for (let i = 0; i < 5; i++) {
            const star = document.createElement('img');
            star.src = 'assets/celebration_star.png';
            star.className = 'sparkle';
            battleUI.sparkleEl.appendChild(star);
          }
        }
      } else {
        battleUI.sparkleEl.classList.add('hidden');
      }
    }
  }

  /**
   * Affiche une courte scène d’introduction avant un combat.  Pour un combat
   * sauvage, on affiche le nom de l’espèce et éventuellement son statut
   * mutant.  Pour un braconnier, on affiche un message générique.  Une
   * fois l’animation terminée (environ 1 seconde), la fonction callback
   * est appelée pour poursuivre le déroulement du jeu.
   * @param {boolean} isTrainer Indique s’il s’agit d’un combat contre un braconnier
   * @param {string} speciesKey Clé de l’espèce sauvage (ignorée pour les braconniers)
   * @param {boolean} isMutant Indique si l’animal sauvage est mutant
   * @param {function} callback Fonction à exécuter après l’intro
   */
  function showBattleIntro(isTrainer, speciesKey, isMutant, callback) {
    // Créer un overlay plein écran
    const intro = document.createElement('div');
    intro.className = 'overlay battle-intro';
    intro.style.display = 'flex';
    intro.style.flexDirection = 'column';
    intro.style.alignItems = 'center';
    intro.style.justifyContent = 'center';
    intro.style.backgroundColor = 'rgba(0,0,0,0.8)';
    intro.style.zIndex = '200';
    // Message
    const msg = document.createElement('div');
    msg.style.fontSize = '20px';
    msg.style.color = '#fff';
    msg.style.marginBottom = '8px';
    if (isTrainer) {
      msg.textContent = 'Un braconnier vous défie !';
    } else {
      const spName = speciesData[speciesKey] ? speciesData[speciesKey].name : speciesKey;
      if (isMutant) {
        msg.textContent = 'Un ' + spName + ' mutant sauvage apparaît !';
      } else {
        msg.textContent = 'Un ' + spName + ' sauvage apparaît !';
      }
    }
    intro.appendChild(msg);
    // Image de l’animal pour une rencontre sauvage
    if (!isTrainer && speciesImages[speciesKey]) {
      const img = document.createElement('img');
      img.src = speciesImages[speciesKey].src;
      img.style.width = '96px';
      img.style.height = '96px';
      img.style.objectFit = 'contain';
      // Appliquer orientation pour qu’il regarde vers la droite (joueur) dans l’intro
      const ori = orientationMap[speciesKey] || 'left';
      img.style.transform = (ori === 'left') ? 'scaleX(-1)' : '';
      intro.appendChild(img);
    }
    document.body.appendChild(intro);
    // Supprimer l’overlay après un court délai et continuer
    setTimeout(() => {
      intro.remove();
      if (typeof callback === 'function') callback();
    }, 1000);
  }

  /**
   * Fait évoluer un capy en une nouvelle espèce avec une animation de
   * transition.  Affiche une image de l’ancienne forme et de la nouvelle
   * forme en fondu et affiche un message de félicitations.  Après
   * l’animation, la propriété species du capy est mise à jour ainsi que
   * ses statistiques de base.  Les attaques existantes sont conservées.
   * @param {Object} capy Objet représentant le capy à faire évoluer
   * @param {string} newSpecies Clé de la nouvelle espèce
   */
  function evolveCapy(capy, newSpecies) {
    const oldKey = capy.species;
    const newKey = newSpecies;
    const oldName = speciesData[oldKey] ? speciesData[oldKey].name : oldKey;
    const newName = speciesData[newKey] ? speciesData[newKey].name : newKey;
    // Créer l’overlay d’évolution
    const evo = document.createElement('div');
    evo.className = 'overlay evolution-overlay';
    evo.style.display = 'flex';
    evo.style.flexDirection = 'column';
    evo.style.alignItems = 'center';
    evo.style.justifyContent = 'center';
    evo.style.backgroundColor = 'rgba(0,0,0,0.8)';
    evo.style.zIndex = '200';
    // Image avant
    const oldImg = document.createElement('img');
    if (speciesImages[oldKey]) {
      oldImg.src = speciesImages[oldKey].src;
    } else {
      oldImg.src = '';
    }
    oldImg.style.width = '96px';
    oldImg.style.height = '96px';
    oldImg.style.objectFit = 'contain';
    // Image après
    const newImg = document.createElement('img');
    if (speciesImages[newKey]) {
      newImg.src = speciesImages[newKey].src;
    } else {
      newImg.src = '';
    }
    newImg.style.width = '96px';
    newImg.style.height = '96px';
    newImg.style.objectFit = 'contain';
    newImg.style.opacity = '0';
    // Message de félicitations
    const msg = document.createElement('div');
    msg.style.fontSize = '18px';
    msg.style.color = '#fff';
    msg.style.marginTop = '8px';
    msg.textContent = 'Félicitations ! ' + capy.name + ' évolue en ' + newName + ' !';
    // Ajouter au DOM
    evo.appendChild(oldImg);
    evo.appendChild(newImg);
    evo.appendChild(msg);
    document.body.appendChild(evo);
    // Animation : fondre l’ancien sprite vers le nouveau
    setTimeout(() => {
      oldImg.style.transition = 'opacity 0.6s';
      newImg.style.transition = 'opacity 0.6s';
      oldImg.style.opacity = '0';
      newImg.style.opacity = '1';
    }, 100);
    // Après la transition, mettre à jour le capy et retirer l’overlay
    setTimeout(() => {
      evo.remove();
      // Mettre à jour les propriétés du capy
      capy.species = newKey;
      // Recalculer ses statistiques de base
      const baseHP = (speciesData[newKey] && speciesData[newKey].baseHP) ? speciesData[newKey].baseHP : 10;
      capy.maxHP = baseHP + capy.level * 2;
      capy.currentHP = capy.maxHP;
      // Ajouter l’attaque spécifique de la nouvelle espèce s’il y en a une
      const defaultMoves = (speciesData[newKey] && speciesData[newKey].moves) ? speciesData[newKey].moves : [];
      defaultMoves.forEach((mv) => {
        if (!capy.moves.includes(mv)) {
          capy.moves.push(mv);
          recordMove(mv);
        }
      });
      // Conserver le statut mutant
      savePlayerData();
      updateBattleUI(capy.name + ' a évolué !');
    }, 1800);
  }

  /**
   * Affiche les actions disponibles dans le combat en fonction de
   * l’état du joueur (capy présent ou non) et de l’ennemi (capturable ou non).
   */
  function showBattleActions() {
    if (!battleUI || !battle) return;
    // Un nouveau tour commence : débloquer les actions pour le joueur
    turnInProgress = false;
    const actionsEl = battleUI.actionsEl;
    // Nettoyer les actions
    actionsEl.innerHTML = '';
    // Si le joueur possède des capys, proposer les actions principales :
    // Attaques, Sac, Capybaras, Fuir/Attraper
    if (playerCapys.length > 0 && !playerCapys[currentCapyIndex].isKO) {
      const btnAtk = document.createElement('button');
      btnAtk.className = 'btn';
      btnAtk.textContent = 'Attaques';
      btnAtk.addEventListener('click', () => {
        showMoveSelection();
      });
      actionsEl.appendChild(btnAtk);
      const btnBag = document.createElement('button');
      btnBag.className = 'btn';
      btnBag.textContent = 'Sac';
      btnBag.addEventListener('click', () => {
        showBagSelection();
      });
      actionsEl.appendChild(btnBag);
      const btnCapys = document.createElement('button');
      btnCapys.className = 'btn';
      btnCapys.textContent = 'Capybaras';
      btnCapys.addEventListener('click', () => {
        showCapySwitch();
      });
      actionsEl.appendChild(btnCapys);
      // Bouton Attraper si l’ennemi est capturable et l’équipe n’est pas pleine
      const spInfo = speciesData[battle.enemy.species];
      if (spInfo && spInfo.catchable && playerCapys.length < 5) {
        const btnCatch = document.createElement('button');
        btnCatch.className = 'btn';
        btnCatch.textContent = 'Attraper';
        btnCatch.addEventListener('click', () => {
          attemptCapture();
        });
        actionsEl.appendChild(btnCatch);
      }
      // Bouton Fuir uniquement en combat sauvage.  Impossible de fuir un
      // braconnier, car celui-ci bloque la sortie.
      if (!trainerBattle) {
        const btnFlee = document.createElement('button');
        btnFlee.className = 'btn';
        btnFlee.textContent = 'Fuir';
        btnFlee.addEventListener('click', () => {
          if (!inBattle) return;
          playerFlee();
        });
        actionsEl.appendChild(btnFlee);
      }
    } else {
      // Aucun capy disponible : option attraper si possible et fuir.  On ne
      // peut pas fuir un combat contre un braconnier/dresseur ; dans ce
      // cas, on désactive le bouton Fuir.
      const spInfo = speciesData[battle.enemy.species];
      if (spInfo && spInfo.catchable && playerCapys.length < 5) {
        const btnCatch = document.createElement('button');
        btnCatch.className = 'btn';
        btnCatch.textContent = 'Attraper';
        btnCatch.addEventListener('click', () => {
          if (!inBattle) return;
          attemptCapture();
        });
        actionsEl.appendChild(btnCatch);
      }
      if (!trainerBattle) {
        const btnFlee2 = document.createElement('button');
        btnFlee2.className = 'btn';
        btnFlee2.textContent = 'Fuir';
        btnFlee2.addEventListener('click', () => {
          if (!inBattle) return;
          playerFlee();
        });
        actionsEl.appendChild(btnFlee2);
      } else {
        // Indiquer clairement qu'on ne peut pas fuir ce combat
        const msgLine = document.createElement('div');
        msgLine.textContent = 'Impossible de fuir !';
        msgLine.style.fontStyle = 'italic';
        actionsEl.appendChild(msgLine);
      }
    }
  }

  /**
   * Affiche un sous-menu des attaques du capy actif.  Les boutons
   * sélectionnent directement l’attaque et exécutent performPlayerAttack.
   */
  function showMoveSelection() {
    const capy = playerCapys[currentCapyIndex];
    if (!capy) return;
    // Nettoyer les actions
    const actionsEl = battleUI.actionsEl;
    actionsEl.innerHTML = '';
    capy.moves.slice(0, 4).forEach((moveName) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = moveName;
      // Colorer le bouton selon le type d’attaque
      const mDef = moveDefinitions[moveName] || {};
      if (mDef.heal) {
        btn.classList.add('move-btn-heal');
      } else {
        btn.classList.add('move-btn-attack');
      }
      btn.addEventListener('click', () => {
        performPlayerAttack(moveName);
      });
      actionsEl.appendChild(btn);
    });
    // Ajouter un bouton retour
    const backBtn = document.createElement('button');
    backBtn.className = 'btn';
    backBtn.textContent = 'Retour';
    backBtn.addEventListener('click', () => {
      showBattleActions();
    });
    actionsEl.appendChild(backBtn);
  }

  /**
   * Affiche un sous-menu pour l'inventaire pendant un combat.  Les objets
   * utilisables sont listés avec leur quantité.  Cliquer sur un objet
   * applique son effet immédiatement et ne consomme pas de tour.  Un
   * bouton permet de revenir au menu principal des actions.
   */
  function showBagSelection() {
    // Nettoyer les actions
    const actionsEl = battleUI.actionsEl;
    actionsEl.innerHTML = '';
    const keys = Object.keys(inventory);
    if (keys.length === 0) {
      const none = document.createElement('div');
      none.textContent = 'Inventaire vide';
      actionsEl.appendChild(none);
    } else {
      keys.forEach((key) => {
        const count = inventory[key];
        if (count <= 0) return;
        const btn = document.createElement('button');
        btn.className = 'btn';
        const label = {
          'super-carotte': 'Super-carotte',
          potion: 'Potion',
          revolver: 'Revolver',
          caillou: 'Caillou',
          filet: 'Filet',
          sifflet: 'Sifflet'
        }[key] || key;
        btn.textContent = `${label} (×${count})`;
        btn.addEventListener('click', () => {
          useItem(key);
        });
        actionsEl.appendChild(btn);
      });
    }
    const backBtn = document.createElement('button');
    backBtn.className = 'btn';
    backBtn.textContent = 'Retour';
    backBtn.addEventListener('click', () => {
      showBattleActions();
    });
    actionsEl.appendChild(backBtn);
  }

  /**
   * Affiche un sous-menu pour changer de Capy pendant un combat.  Le
   * joueur peut sélectionner un autre membre de son équipe qui n'est pas
   * K.O.  Choisir un nouveau capy dépense le tour et l’ennemi attaque
   * immédiatement.  Si aucun autre capy n’est disponible, un message
   * informe le joueur.
   */
  function showCapySwitch() {
    const actionsEl = battleUI.actionsEl;
    actionsEl.innerHTML = '';
    let selectableFound = false;
    playerCapys.forEach((capy, index) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      let text = `${capy.name} Niv ${capy.level} (${capy.currentHP}/${capy.maxHP} PV)`;
      if (capy.isKO) text += ' (KO)';
      if (index === currentCapyIndex) text += ' (actif)';
      btn.textContent = text;
      if (capy.isKO || index === currentCapyIndex) {
        btn.disabled = true;
      } else {
        selectableFound = true;
        btn.addEventListener('click', () => {
          // Changer le capy actif
          currentCapyIndex = index;
          updateBattleUI(`${playerCapys[currentCapyIndex].name} entre en scène !`);
          // L'ennemi attaque immédiatement
          setTimeout(() => {
            enemyAttack();
          }, 800);
        });
      }
      actionsEl.appendChild(btn);
    });
    if (!selectableFound) {
      const msg = document.createElement('div');
      msg.textContent = 'Aucun autre Capy valide.';
      actionsEl.appendChild(msg);
    }
    const backBtn = document.createElement('button');
    backBtn.className = 'btn';
    backBtn.textContent = 'Retour';
    backBtn.addEventListener('click', () => {
      showBattleActions();
    });
    actionsEl.appendChild(backBtn);
  }

  /**
   * Utilise un objet de l'inventaire.  Les effets varient selon l'objet
   * utilisé.  Les objets ne consomment pas de tour du joueur.
   *
   * - super-carotte : augmente le niveau du capy actuel d'un niveau.
   * - potion : restaure complètement les PV du capy actuel et lève le KO.
   * - revolver : élimine instantanément l'ennemi (victoire immédiate).
   * - caillou : inflige 1 point de dégât et empêche l'ennemi d'attaquer ce tour-ci.
   *
   * @param {string} key Nom interne de l'objet
   */
  function useItem(key) {
    if (!inventory[key] || inventory[key] <= 0) {
      updateBattleUI('Cet objet n’est plus disponible.');
      return;
    }
    // Enregistrer l’objet comme rencontré/utilisé dans le Dex des objets
    recordItem(key);
    const capy = playerCapys[currentCapyIndex];
    switch (key) {
      case 'super-carotte':
        inventory[key]--;
        gainExperience(capy.level * 2 + 10); // gagner assez d'XP pour monter d'un niveau
        updateBattleUI(`${capy.name} grignote une super-carotte et monte de niveau !`);
        savePlayerData();
        break;
      case 'potion':
        inventory[key]--;
        capy.currentHP = capy.maxHP;
        capy.isKO = false;
        updateBattleUI(`${capy.name} est soigné !`);
        savePlayerData();
        break;
      case 'revolver':
        inventory[key]--;
        updateBattleUI('Bang ! L’ennemi est éliminé sur-le-champ !');
        savePlayerData();
        // Victoire immédiate
        setTimeout(() => {
          playerWins();
        }, 600);
        return; // ne pas afficher menu après
      case 'caillou':
        inventory[key]--;
        battle.enemy.currentHP -= 1;
        if (battle.enemy.currentHP <= 0) {
          updateBattleUI('Le caillou a achevé l’ennemi !');
          savePlayerData();
          setTimeout(() => {
            playerWins();
          }, 600);
          return;
        } else {
          updateBattleUI('Vous lancez un caillou ! L’ennemi est distrait.');
          savePlayerData();
          // On ne laisse pas l'ennemi attaquer ce tour
          setTimeout(() => {
            showBattleActions();
          }, 800);
          return;
        }
      case 'filet':
        // Le filet augmente la probabilité de capture de la prochaine tentative
        inventory[key]--;
        nextCaptureBonus = 0.3; // +30 % de chance de réussite
        updateBattleUI('Vous déployez un filet ! Votre prochaine capture sera plus facile.');
        savePlayerData();
        break;
      case 'sifflet':
        // Le sifflet met fin au combat contre un animal sauvage.  Inutilisable contre un braconnier.
        if (trainerBattle) {
          updateBattleUI('Le braconnier se moque de votre sifflet ; vous devez le combattre !');
          break;
        }
        inventory[key]--;
        updateBattleUI('Vous sifflez ! L’animal sauvage prend peur et s’enfuit.');
        savePlayerData();
        setTimeout(() => {
          endBattle();
        }, 600);
        return;
      default:
        updateBattleUI('Cet objet n’a aucun effet.');
        break;
    }
    // Après utilisation d’un objet (sauf revolver/caillou), proposer à nouveau les actions
    setTimeout(() => {
      showBattleActions();
    }, 600);
  }

  /**
   * Gère l’attaque du joueur via l’une de ses attaques.  Inflige des dégâts
   * à l’ennemi ou soigne le capy en fonction de l’attaque.  Lorsque le
   * tour du joueur est terminé, c’est au tour de l’ennemi d’attaquer.
   * @param {string} moveName Nom de l’attaque sélectionnée
   */
  function performPlayerAttack(moveName) {
    if (!battle || !inBattle) return;
    // Bloquer les actions si un tour est déjà en cours
    if (turnInProgress) return;
    // Marquer le début du tour du joueur
    turnInProgress = true;
    // Enregistrer l’attaque dans le CapyDex (no‑op si absent)
    recordMove(moveName);
    const def = moveDefinitions[moveName] || { power: 3 };
    const capy = playerCapys[currentCapyIndex];
    if (!capy) return;
    // Attaque de soin : restaurer des PV et laisser l’ennemi répliquer
    if (def.heal) {
      const healAmount = def.heal;
      capy.currentHP = Math.min(capy.currentHP + healAmount, capy.maxHP);
      updateBattleUI(`${capy.name} se soigne de ${healAmount} PV !`);
      animateSprite(battleUI.playerImg, def.anim);
      // Après un soin, l’ennemi attaque.  Le tour se terminera lorsque
      // showBattleActions() sera rappelé dans enemyAttack().
      setTimeout(() => {
        enemyAttack();
      }, 800);
      return;
    }
    // Attaque offensive : calculer des dégâts en fonction du niveau et de la puissance
    const attackerLevel = capy.level || 1;
    const defenderLevel = battle.enemy.level || 1;
    const basePower = def.power || 4;
    // Formule : puissance * 0,3 * (niveau attaquant / niveau défenseur), avec un minimum de 1
    let rawDamage = (basePower * 0.3) * (attackerLevel / defenderLevel);
    // Légère variation aléatoire pour éviter des combats trop déterministes
    rawDamage += Math.random() * 2;
    const damage = Math.max(1, Math.floor(rawDamage));
    battle.enemy.currentHP -= damage;
    updateBattleUI(`${capy.name} utilise ${moveName} ! Dégâts : ${damage}`);
    animateSprite(battleUI.playerImg, def.anim);
    if (battle.enemy.currentHP <= 0) {
      setTimeout(() => {
        playerWins();
      }, 800);
    } else {
      setTimeout(() => {
        enemyAttack();
      }, 800);
    }
  }

  /**
   * Attaque de l’ennemi contre le capy du joueur.  Choisit une attaque
   * aléatoire parmi celles de l’espèce.  En cas d’absence de capy, le
   * joueur ne peut pas se défendre et la fuite est imposée.
   */
  function enemyAttack() {
    if (!battle || !inBattle) return;
    // Si le joueur n’a pas de capy, il ne peut pas encaisser l’attaque
    const capy = playerCapys[currentCapyIndex];
    if (!capy) {
      updateBattleUI('Vous n’avez pas de Capy pour encaisser. Vous fuyez !');
      setTimeout(() => {
        playerFlee();
      }, 700);
      return;
    }
    const sp = speciesData[battle.enemy.species];
    const moves = sp.moves;
    const moveName = moves[Math.floor(Math.random() * moves.length)];
    // Enregistrer cette attaque dans le dex des attaques
    recordMove(moveName);
    const def = moveDefinitions[moveName] || { power: 3 };
    const attackerLevel = battle.enemy.level || 1;
    const defenderLevel = capy.level || 1;
    const basePower = def.power || 4;
    // Formule de dégâts identique à celle du joueur, avec un minimum de 1
    let rawDamage = (basePower * 0.3) * (attackerLevel / defenderLevel);
    rawDamage += Math.random() * 2;
    const damage = Math.max(1, Math.floor(rawDamage));
    capy.currentHP -= damage;
    updateBattleUI(`${sp.name} utilise ${moveName} ! Dégâts : ${damage}`);
    animateSprite(battleUI.enemyImg, def.anim);
    if (capy.currentHP <= 0) {
      setTimeout(() => {
        playerLose();
      }, 800);
    } else {
      setTimeout(() => {
        showBattleActions();
      }, 800);
    }
  }

  /**
   * Gestion de la victoire du joueur.  Donne de l’expérience, met à jour
   * le compteur de victoires et termine le combat après un court délai.
   */
  function playerWins() {
    // Si on affronte un braconnier, gérer la victoire d’un animal
    if (trainerBattle) {
      // Mettre à jour le compteur global de victoires
      defeatedCount++;
      try {
        const prev = localStorage.getItem('capyMonHighScore');
        const prevVal = prev ? parseInt(prev, 10) || 0 : 0;
        if (defeatedCount > prevVal) {
          localStorage.setItem('capyMonHighScore', String(defeatedCount));
        }
      } catch (e) {}
      // Accorder de l’XP au capy actif
      const capy = playerCapys[currentCapyIndex];
      if (capy) {
        const xp = battle.enemy.level * 5;
        gainExperience(xp);
        updateBattleUI(`${capy.name} gagne ${xp} XP !`);
      }
      // Après l’animation, passer à l’ennemi suivant ou terminer le combat
      setTimeout(() => {
        handleTrainerEnemyDefeat();
      }, 1200);
      return;
    }
    // Combat normal (contre un animal sauvage).  Mettre à jour le compteur
    defeatedCount++;
    try {
      const prev = localStorage.getItem('capyMonHighScore');
      const prevVal = prev ? parseInt(prev, 10) || 0 : 0;
      if (defeatedCount > prevVal) {
        localStorage.setItem('capyMonHighScore', String(defeatedCount));
      }
    } catch (e) {}
    // Donner de l’XP au capy du joueur
    const capy = playerCapys[currentCapyIndex];
    if (capy) {
      const xp = battle.enemy.level * 5;
      gainExperience(xp);
      updateBattleUI(`${capy.name} gagne ${xp} XP !`);
    } else {
      const spName = speciesData[battle.enemy.species] ? speciesData[battle.enemy.species].name : battle.enemy.species;
      updateBattleUI('Vous triomphez du ' + spName + '!');
    }
    setTimeout(() => {
      endBattle();
    }, 1200);
  }

  /**
   * Gestion de la défaite du joueur.  La partie s’achève et le capy du
   * joueur est ramené à 1 PV pour éviter une mort permanente.
   */
  function playerLose() {
    const capy = playerCapys[currentCapyIndex];
    if (capy) {
      updateBattleUI(`${capy.name} est vaincu !`);
      // Marquer ce capy comme KO
      capy.currentHP = 0;
      capy.isKO = true;
      // Trouver un autre capy valide
      let found = false;
      for (let i = 0; i < playerCapys.length; i++) {
        if (!playerCapys[i].isKO) {
          currentCapyIndex = i;
          found = true;
          break;
        }
      }
      savePlayerData();
    setTimeout(() => {
        if (!found) {
          // Aucun capy valide
          if (trainerBattle) {
            // Défaite contre un braconnier : repousser de plusieurs zones
            onTrainerDefeat();
          } else {
            // Défaite en combat sauvage : retour à la tente initiale
            endBattle();
            teleportToStart();
          }
        } else {
          // Continuer le combat si des capys restants.  Ne rien faire de
          // particulier dans un combat de braconnier : on envoie le capy
          // suivant automatiquement via endBattle() et showBattleActions().
          endBattle();
        }
      }, 1200);
    } else {
      // Pas de capy du tout : fuir immédiatement
      updateBattleUI('Vous n’avez pas de Capy ! Vous fuyez !');
      setTimeout(() => {
        endBattle();
      }, 1200);
    }
  }

  /**
   * Tente de capturer l’ennemi courant.  Si la capture réussit, on
   * demande un nom au joueur et on initialise son capy.  Sinon,
   * l’ennemi réplique.
   */
  function attemptCapture() {
    if (!battle || !inBattle) return;
    // Bloquer les actions pendant la tentative de capture
    turnInProgress = true;
    const spKey = battle.enemy.species;
    const spInfo = speciesData[spKey];
    if (!spInfo || !spInfo.catchable) {
      updateBattleUI('Vous ne pouvez pas attraper cet animal !');
      setTimeout(() => {
        enemyAttack();
      }, 800);
      return;
    }
    // Si le joueur possède déjà 5 capys, il ne peut pas en attraper un autre
    if (playerCapys.length >= 5) {
      updateBattleUI('Votre équipe est complète (5 Capys). Impossible d’en capturer un nouveau !');
      setTimeout(() => {
        enemyAttack();
      }, 800);
      return;
    }
    // Calcul du taux de capture.  Le capybara a une probabilité élevée de
    // capture (>50 %), les autres animaux voient leur chance décroître avec
    // leur niveau et augmenter lorsque leurs PV diminuent.  Un animal de
    // niveau 10 ou plus avec 100 % de PV a 1 % de chance d’être capturé,
    // augmentant de 1 % pour chaque pourcent de PV manquant.  Le bonus
    // temporaire (filet) est ajouté ensuite.
    let catchChance;
    if (spKey === 'capybara') {
      catchChance = 0.6; // Le capybara est plus facile à attraper
    } else {
      // Probabilité de base décroissante avec le niveau (au moins 1 %)
      const baseChance = Math.max(0.01, (11 - battle.enemy.level) / 100);
      const missingRatio = 1 - (battle.enemy.currentHP / battle.enemy.maxHP);
      catchChance = baseChance + missingRatio;
    }
    // Appliquer le bonus accordé par un filet et plafonner
    catchChance = Math.min(0.95, catchChance + nextCaptureBonus);
    const success = Math.random() < catchChance;
    // Réinitialiser le bonus pour la tentative suivante
    nextCaptureBonus = 0;
    if (!success) {
      updateBattleUI('Oh non ! Le Capy s’échappe !');
      setTimeout(() => {
        enemyAttack();
      }, 800);
      return;
    }
    // Demander un nom au joueur
    let nom = prompt('Vous avez attrapé un Capy ! Choisissez un nom :');
    if (!nom) nom = 'Capy';
    // Créer l’objet capy du joueur
    // Calculer les PV de base et le statut mutant pour la capture.  Les
    // mutants ont des PV accrus et conservent leur statut dans l’équipe.
    let baseHP = spInfo.baseHP + 2;
    let isMut = false;
    if (battle.enemy && battle.enemy.mutant) {
      baseHP = Math.round(baseHP * 1.5);
      isMut = true;
    }
    const newCapy = {
      species: spKey,
      name: nom,
      level: 1,
      exp: 0,
      maxHP: baseHP,
      currentHP: baseHP,
      moves: ['Charge'],
      isKO: false,
      mutant: isMut
    };
    playerCapys.push(newCapy);
    // Si c'est le premier capy, le définir comme actif
    if (playerCapys.length === 1) {
      currentCapyIndex = 0;
    }
    savePlayerData();
    // Compte comme une victoire pour le compteur de rencontres réussies
    defeatedCount++;
    try {
      const prev2 = localStorage.getItem('capyMonHighScore');
      const prevVal2 = prev2 ? parseInt(prev2, 10) || 0 : 0;
      if (defeatedCount > prevVal2) {
        localStorage.setItem('capyMonHighScore', String(defeatedCount));
      }
    } catch (e) {}
    updateBattleUI(`${nom} rejoint votre équipe !`);
    setTimeout(() => {
      endBattle();
    }, 1200);
  }

  /**
   * Permet au joueur de fuir un combat.  Se termine immédiatement
   * après un court message.
   */
  function playerFlee() {
    // 15 % de chances d’échec de fuite
    if (Math.random() < 0.15) {
      updateBattleUI('La fuite échoue !');
      // L’ennemi attaque si la fuite échoue
      setTimeout(() => {
        enemyAttack();
      }, 700);
    } else {
      updateBattleUI('Vous prenez la fuite...');
      setTimeout(() => {
        endBattle();
      }, 700);
    }
  }

  /**
   * Ouvre l’inventaire et le CapyDex dans un overlay.  Affiche les
   * informations du Capy du joueur (s’il existe) et la liste des
   * espèces rencontrées avec un descriptif.  Un bouton permet de
   * renommer le capy.  Un autre permet de fermer la fenêtre.
   */
  function openInventory() {
    // L'ancien inventaire a été remplacé par un menu unifié accessible via la touche Entrée.
    // Pour compatibilité, cette fonction appelle maintenant openMainMenu().
    openMainMenu();
  }

  // Dessiner la carte et le joueur
  function draw() {
    // Effacer
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dessiner le sol
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = map[y][x];
        ctx.fillStyle = colors[tile] || '#000';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        // Dessiner des éléments supplémentaires pour les tentes et les portes
        if (tile === 2) {
          // Tente de soins : dessin d’une croix rouge
          ctx.strokeStyle = '#d32f2f';
          ctx.lineWidth = 3;
          const cx = x * tileSize;
          const cy = y * tileSize;
          ctx.beginPath();
          // verticale
          ctx.moveTo(cx + tileSize / 2, cy + tileSize * 0.2);
          ctx.lineTo(cx + tileSize / 2, cy + tileSize * 0.8);
          // horizontale
          ctx.moveTo(cx + tileSize * 0.2, cy + tileSize / 2);
          ctx.lineTo(cx + tileSize * 0.8, cy + tileSize / 2);
          ctx.stroke();
        } else if (tile === 3) {
          // Porte : dessiner un rectangle sombre dans le tile
          ctx.fillStyle = '#5d4037';
          ctx.fillRect(x * tileSize + tileSize * 0.25, y * tileSize + tileSize * 0.25, tileSize * 0.5, tileSize * 0.5);
        } else if (tile === 4) {
          // Boutique : dessiner une petite icône de supermarché pour indiquer la boutique
          ctx.fillStyle = colors[0] || '#8ecf72';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          ctx.fillStyle = '#333';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const emoji = '🛒';
          ctx.fillText(emoji, x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
        }
      }
    }
    // Dessiner le joueur en 8 bits : un carré orangé avec un contour noir
    ctx.fillStyle = '#d79841';
    ctx.fillRect(player.x * tileSize + 4, player.y * tileSize + 4, tileSize - 8, tileSize - 8);
    ctx.strokeStyle = '#3b2619';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x * tileSize + 4, player.y * tileSize + 4, tileSize - 8, tileSize - 8);

    // Dessiner le braconnier s’il est présent et pas encore vaincu
    if (currentPoacher && !braconniersDefeated[currentZoneIndex]) {
      const px = currentPoacher.x;
      const py = currentPoacher.y;
      // corps du braconnier : carré rougeâtre avec contour
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(px * tileSize + 4, py * tileSize + 4, tileSize - 8, tileSize - 8);
      ctx.strokeStyle = '#4e0a0a';
      ctx.strokeRect(px * tileSize + 4, py * tileSize + 4, tileSize - 8, tileSize - 8);
      // Dessiner un signe d’exclamation temporaire au‑dessus de la tête
      if (poacherAlertUntil > Date.now()) {
        ctx.fillStyle = '#ffeb3b';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const exX = px * tileSize + tileSize / 2;
        const exY = py * tileSize - 4;
        ctx.fillText('!', exX, exY);
      }
    }
  }

  // Démarre un combat contre un ennemi aléatoire.  Le combat est
  // entièrement géré par cette fonction et les suivantes.  Une fois
  // appelée, la variable inBattle passe à true et la carte ne peut plus
  // être explorée jusqu’à la fin du combat.
  function startBattle() {
    if (inBattle) return;
    inBattle = true;
    // Musique de combat pour un animal sauvage
    playBattleMusic(false);
    // Choisir une espèce en fonction des probabilités de la zone actuelle
    let enemySpeciesKey;
    const distribution = zones[currentZoneIndex % zones.length].encounters;
    const r = Math.random();
    let cumulative = 0;
    for (const entry of distribution) {
      cumulative += entry.prob;
      if (r <= cumulative) {
        enemySpeciesKey = entry.key;
        break;
      }
    }
    if (!enemySpeciesKey) {
      // Fallback : capybara
      enemySpeciesKey = 'capybara';
    }
    const enemySpecies = speciesData[enemySpeciesKey];
    // Déterminer un niveau pour l’ennemi : dépend de la zone actuelle.  Plus
    // on s’éloigne du marais, plus les animaux sauvages sont puissants.  On
    // ajoute une légère variation aléatoire.  Le niveau minimum est 1.
    let enemyLevel = currentZoneIndex + 1;
    const variation = Math.floor(Math.random() * 3) - 1; // -1, 0 ou +1
    enemyLevel = Math.max(1, enemyLevel + variation);
    let enemyMaxHP = enemySpecies.baseHP + enemyLevel * 2;
    // Déterminer si l’ennemi est mutant.  Les mutants ont des statistiques
    // améliorées et peuvent apprendre Charge Mutante.  La probabilité est
    // définie par MUTANT_CHANCE.
    const isMutant = Math.random() < MUTANT_CHANCE;
    if (isMutant) {
      // Augmenter le niveau et les PV du mutant pour refléter sa puissance
      enemyLevel = enemyLevel + 1;
      enemyMaxHP = Math.round(enemyMaxHP * 1.5);
    }
    // Initialiser l’objet battle avec toutes les informations nécessaires
    battle = {
      enemy: {
        species: enemySpeciesKey,
        level: enemyLevel,
        maxHP: enemyMaxHP,
        currentHP: enemyMaxHP,
        mutant: isMutant
      },
      playerTurn: true
    };
    // Enregistrer l’espèce dans le CapyDex
    capyDex[enemySpeciesKey] = true;
    saveCapyDex();
    // Créer une intro animée avant le combat.  Après l’intro, afficher
    // l’overlay complet et les actions disponibles.  Si l’animal est mutant,
    // mentionner son statut dans le message.
    const introMessage = isMutant
      ? 'Un ' + enemySpecies.name + ' mutant apparaît !'
      : 'Un ' + enemySpecies.name + ' sauvage apparaît !';
    showBattleIntro(false, enemySpeciesKey, isMutant, () => {
      createBattleOverlay(enemySpecies.name);
      updateBattleUI(introMessage);
      showBattleActions();
    });
  }
  // Terminer un combat et supprimer l'overlay
  /**
   * Termine le combat en cours et nettoie l’interface.  Si un message
   * final est fourni, il peut être affiché avant de fermer l’overlay.
   */
  function endBattle() {
    inBattle = false;
    // Réinitialiser l'indicateur de tour afin de permettre de nouvelles actions
    turnInProgress = false;
    // Arrêter la musique de combat et relancer l'ambiance
    stopBattleMusic();
    battle = null;
    if (battleUI && battleUI.overlay) {
      battleUI.overlay.remove();
    }
    battleUI = null;
    // Redessiner la carte à la fin du combat
    draw();
  }

  // Tentative de déclencher un combat aléatoire après un déplacement
  /**
   * Tente de déclencher un combat aléatoire après un déplacement.  Le
   * pourcentage de chance est de 15 %.  Aucune rencontre n’a lieu si
   * un combat est déjà en cours.
   */
  function tryRandomBattle() {
    if (inBattle) return;
    if (Math.random() < 0.15) {
      startBattle();
    }
  }

  // Gestion des déplacements
  function handleMove(dx, dy) {
    // Ne pas permettre de se déplacer pendant un combat ou lors d’une
    // cinématique avec un braconnier
    if (inBattle || !gameStarted || poacherEncountering) return;
    const newX = player.x + dx;
    const newY = player.y + dy;
    // Vérifier qu'on reste dans la carte
    if (newX < 0 || newX >= mapWidth || newY < 0 || newY >= mapHeight) return;
    const tile = map[newY][newX];
    // Tuile eau (1) : infranchissable
    if (tile === 1) return;

    // Vérifier la détection du braconnier : si le joueur s’avance dans
    // le champ de vision d’un braconnier, déclencher la rencontre.
    if (currentPoacher && !braconniersDefeated[currentZoneIndex]) {
      const fovX = currentPoacher.direction === 'left' ? currentPoacher.x - 1 : currentPoacher.x + 1;
      const fovY = currentPoacher.y;
      if (newX === fovX && newY === fovY) {
        triggerPoacherEncounter();
        return;
      }
    }
    // Porte (3) : changer de zone.  Si un braconnier est présent dans
    // la zone actuelle (toutes les cinq zones), on bloque la sortie
    // tant que ce braconnier n’a pas été vaincu.  Les braconniers
    // apparaissent dans les zones dont le numéro (1 indexé) est
    // multiple de 5.
    if (tile === 3) {
      // Sortie vers la droite (zone suivante)
      if (newX === mapWidth - 2) {
        // Vérifier s’il faut affronter un braconnier avant de poursuivre
        if (((currentZoneIndex + 1) % 5 === 0) && !braconniersDefeated[currentZoneIndex]) {
          // Démarrer le combat contre le braconnier de cette zone
          startTrainerBattle(currentZoneIndex);
          return;
        }
        // Sinon, avancer d’une zone
        goToZone(currentZoneIndex + 1);
        return;
      }
      // Sortie vers la gauche (zone précédente)
      if (newX === 1) {
        // Reculer d’une zone si possible
        if (currentZoneIndex > 0) {
          goToZone(currentZoneIndex - 1);
        }
        return;
      }
    }
    // Déplacement autorisé
    player.x = newX;
    player.y = newY;
    draw();
    // Tente (2) : soigner l'équipe
    if (tile === 2) {
      playerCapys.forEach((c) => {
        c.currentHP = c.maxHP;
        c.isKO = false;
      });
      currentCapyIndex = 0;
      savePlayerData();
      // Effet sonore de soin
      playEffect('heal');
      alert('Vos Capys sont soignés et prêts pour l’aventure !');
    }
    // Essayer un combat aléatoire uniquement sur sol
    if (tile === 0) {
      tryRandomBattle();
    }
  }

  /**
   * Déclenche la séquence de rencontre avec un braconnier lorsque le
   * joueur entre dans son champ de vision.  Cette fonction affiche
   * d’abord un point d’exclamation au‑dessus du braconnier, déplace
   * celui‑ci jusqu’à une case adjacente au joueur, puis présente une
   * courte introduction avant de lancer le combat de braconnier.
   */
  function triggerPoacherEncounter() {
    // Bloquer les mouvements pendant la cinématique
    poacherEncountering = true;
    // Afficher l’icône d’exclamation pendant 0,8 seconde
    poacherAlertUntil = Date.now() + 800;
    draw();
    // Après l’alerte, déplacer le braconnier et lancer l’intro
    setTimeout(() => {
      if (currentPoacher && !braconniersDefeated[currentZoneIndex]) {
        // Positionner le braconnier juste à côté du joueur
        if (currentPoacher.direction === 'left') {
          currentPoacher.x = player.x + 1;
        } else {
          currentPoacher.x = player.x - 1;
        }
      }
      draw();
      showPoacherIntro();
    }, 800);
  }

  /**
   * Affiche un écran d’introduction pour un braconnier avant le
   * combat.  L’introduction mentionne le nom du braconnier et le nom
   * du biome.  Après un court délai, le combat contre le braconnier
   * démarre automatiquement.
   */
  function showPoacherIntro() {
    // Supprimer toute intro existante
    const existing = document.getElementById('capymon-poacher-intro');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-poacher-intro';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const name = zonePoacherNames[currentZoneIndex] || '???';
    const zoneName = zones[currentZoneIndex % zones.length].name;
    const h2 = document.createElement('h2');
    h2.textContent = name;
    card.appendChild(h2);
    const p = document.createElement('p');
    p.style.marginTop = '8px';
    p.textContent = `Je suis ${name}, la terreur du ${zoneName.toLowerCase()} ! Prépare‑toi !`;
    card.appendChild(p);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    // Après 1,5 seconde, démarrer le combat contre le braconnier
    setTimeout(() => {
      overlay.remove();
      // Lancer le combat uniquement si le braconnier n’a pas été vaincu entre temps
      if (!braconniersDefeated[currentZoneIndex]) {
        startTrainerBattle(currentZoneIndex);
      }
      // Fin de la cinématique : le combat prend le relais
      poacherEncountering = false;
    }, 1500);
  }

  // Écouter les touches directionnelles
  document.addEventListener('keydown', (e) => {
    if (inBattle) return;
    if (!gameStarted) return;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        handleMove(0, -1);
        break;
      case 'ArrowDown':
      case 's':
        handleMove(0, 1);
        break;
      case 'ArrowLeft':
      case 'a':
        handleMove(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
        handleMove(1, 0);
        break;
      case 'Enter':
        openMainMenu();
        break;
    }
  });

  // Lancer le jeu après l'événement déclenché par config.js.  Cet
  // événement est envoyé après un délai d'environ 2 secondes pour
  // permettre aux ressources de se charger.  Si l'événement n'est pas
  // déclenché (par exemple si config.js n'est pas chargé), démarrer
  // automatiquement après un petit délai.
  function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    // Générer la carte initiale et faire apparaître quelques objets
    // Pour les tests automatisés (par exemple vérifier le comportement des braconniers),
    // vous pouvez initialiser currentZoneIndex à une valeur spécifique ici.  En
    // production, currentZoneIndex reste à 0.  Décommenter la ligne ci‑dessous
    // pour commencer directement dans la cinquième zone (indice 4).  Cette
    // modification est destinée aux tests et doit être commentée ou supprimée
    // avant de livrer le jeu final.
    // currentZoneIndex = 4;
    generateMap();
    spawnItems();
    draw();
    // TEST: déclencher automatiquement la rencontre avec le braconnier si présent
    // Ce bloc a été utilisé pour tester la cinématique des braconniers.  Il est
    // volontairement désactivé afin de ne pas lancer de combat automatique à
    // chaque démarrage.  Pour réactiver le test, décommentez les lignes ci‑dessous.
    /*
    if (currentPoacher && !braconniersDefeated[currentZoneIndex]) {
      setTimeout(() => {
        triggerPoacherEncounter();
      }, 200);
    }
    */
    // Jouer immédiatement la musique d'ambiance pour la zone initiale
    playAmbienceForCurrentZone();
  }
  window.addEventListener('capyGameStart', startGame);
  // Démarrage automatique après 2,5 s si aucun événement n'est reçu
  setTimeout(() => {
    if (!gameStarted) startGame();
  }, 2500);
  // La navigation vers le menu principal n’est plus assurée par un
  // bouton spécifique.  Le joueur peut utiliser la touche Entrée
  // (capymon-btn-enter) pour accéder à l’inventaire et quitter le jeu
  // via les options.  Ainsi on évite de multiplier les boutons en
  // interface.

  // Contrôles tactiles et souris pour appareils mobiles
  // Les boutons directionnels et A/B sont créés dans capymon.html.  Ils
  // permettent de déplacer le joueur et d’effectuer des actions pendant
  // les combats sans clavier.
  const btnUp = document.getElementById('capymon-up');
  const btnDown = document.getElementById('capymon-down');
  const btnLeft = document.getElementById('capymon-left');
  const btnRight = document.getElementById('capymon-right');
  const btnA = document.getElementById('capymon-btn-a');
  const btnB = document.getElementById('capymon-btn-b');
  const btnEnter = document.getElementById('capymon-btn-enter');

  function attachControl(button, onPress) {
    if (!button) return;
    // Utiliser touchstart pour éviter le delay 300 ms sur mobile
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onPress();
    }, { passive: false });
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onPress();
    });
  }
  attachControl(btnUp, () => handleMove(0, -1));
  attachControl(btnDown, () => handleMove(0, 1));
  attachControl(btnLeft, () => handleMove(-1, 0));
  attachControl(btnRight, () => handleMove(1, 0));

  // Bouton A : attaque pendant un combat si l’overlay existe
  if (btnA) {
    btnA.addEventListener('click', (e) => {
      e.preventDefault();
      if (!gameStarted) return;
      // Si aucun combat n’est en cours et qu’aucun overlay de combat n’est présent,
      // ouvrir la boutique lorsque le joueur se tient sur une case boutique.
      const overlay = document.getElementById('capymon-battle');
      if (!overlay && !inBattle && map[player.y][player.x] === 4) {
        openShop();
        return;
      }
      // En combat : simuler la sélection du premier bouton d’action
      if (overlay) {
        const buttons = overlay.querySelectorAll('button.btn');
        if (buttons.length >= 1) {
          buttons[0].click();
        }
      }
    });
    btnA.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameStarted) return;
      const overlay = document.getElementById('capymon-battle');
      if (!overlay && !inBattle && map[player.y][player.x] === 4) {
        openShop();
        return;
      }
      if (overlay) {
        const buttons = overlay.querySelectorAll('button.btn');
        if (buttons.length >= 1) {
          buttons[0].click();
        }
      }
    }, { passive: false });
  }
  // Bouton B : fuir pendant un combat si l’overlay existe
  if (btnB) {
    btnB.addEventListener('click', (e) => {
      e.preventDefault();
      if (!gameStarted) return;
      const overlay = document.getElementById('capymon-battle');
      if (overlay) {
        const buttons = overlay.querySelectorAll('button.btn');
        if (buttons.length >= 2) {
          buttons[1].click();
        }
      }
    });
    btnB.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameStarted) return;
      const overlay = document.getElementById('capymon-battle');
      if (overlay) {
        const buttons = overlay.querySelectorAll('button.btn');
        if (buttons.length >= 2) {
          buttons[1].click();
        }
      }
    }, { passive: false });
  }

  // Bouton Enter : ouvre l’inventaire et le CapyDex en dehors des combats
  if (btnEnter) {
    const openInv = (e) => {
      e.preventDefault();
      openMainMenu();
    };
    btnEnter.addEventListener('click', openInv);
    btnEnter.addEventListener('touchstart', openInv, { passive: false });
  }

  // Contrôles clavier pour les boutons O et K (anciennement A et B).
  // La touche O simule en permanence l’appui sur le bouton O. En combat,
  // la touche K simule l’appui sur le bouton K (Sac ou Retour/Fuir). Les
  // touches sont insensibles à la casse.
  document.addEventListener('keydown', (e) => {
    if (!gameStarted) return;
    if (e.key === 'o' || e.key === 'O') {
      if (btnA) {
        e.preventDefault();
        btnA.click();
      }
    } else if (e.key === 'k' || e.key === 'K') {
      if (inBattle) {
        const overlay = document.getElementById('capymon-battle');
        if (overlay && btnB) {
          e.preventDefault();
          btnB.click();
        }
      }
    }
  });

  /**
   * Ouvre le menu principal en dehors des combats.  Ce menu propose
   * plusieurs options : CapyDex, Mes Capys, Sac, Options, Crédits et
   * Retour au menu principal du site.  Un overlay est créé pour bloquer
   * l'interaction avec la carte pendant la consultation du menu.
   */
  function openMainMenu() {
    if (inBattle) return;
    // Son d'ouverture du menu
    playEffect('menu_open');
    // Ne pas ouvrir plusieurs menus
    if (document.getElementById('capymon-mainmenu')) return;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-mainmenu';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const title = document.createElement('h2');
    title.textContent = 'Menu Capy Mon';
    card.appendChild(title);
    const menuList = document.createElement('div');
    menuList.style.display = 'flex';
    menuList.style.flexDirection = 'column';
    menuList.style.gap = '8px';
    // CapyDex option
    const btnDex = document.createElement('button');
    btnDex.className = 'btn';
    btnDex.textContent = 'CapyDex';
    btnDex.addEventListener('click', () => {
      openDex();
    });
    menuList.appendChild(btnDex);
    // Mes Capys
    const btnCapysMenu = document.createElement('button');
    btnCapysMenu.className = 'btn';
    btnCapysMenu.textContent = 'Mes Capys';
    btnCapysMenu.addEventListener('click', () => {
      openCapysMenu();
    });
    menuList.appendChild(btnCapysMenu);
    // Sac
    const btnBagMenu = document.createElement('button');
    btnBagMenu.className = 'btn';
    btnBagMenu.textContent = 'Sac';
    btnBagMenu.addEventListener('click', () => {
      openBagMenu();
    });
    menuList.appendChild(btnBagMenu);
    // Options
    const btnOptions = document.createElement('button');
    btnOptions.className = 'btn';
    btnOptions.textContent = 'Options';
    btnOptions.addEventListener('click', () => {
      openOptions();
    });
    menuList.appendChild(btnOptions);
    // Crédits
    const btnCredits = document.createElement('button');
    btnCredits.className = 'btn';
    btnCredits.textContent = 'Crédits';
    btnCredits.addEventListener('click', () => {
      openCredits();
    });
    menuList.appendChild(btnCredits);
    // Retour au menu principal du site
    const btnBackMenu = document.createElement('button');
    btnBackMenu.className = 'btn';
    btnBackMenu.textContent = 'Retour à l’accueil';
    btnBackMenu.addEventListener('click', () => {
      window.location.href = '../Capy/games.html';
    });
    menuList.appendChild(btnBackMenu);
    // Fermer
    const btnClose = document.createElement('button');
    btnClose.className = 'btn';
    btnClose.textContent = 'Fermer';
    btnClose.addEventListener('click', () => {
      overlay.remove();
    });
    menuList.appendChild(btnClose);
    card.appendChild(menuList);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * Affiche le CapyDex dans un overlay séparé.  Il liste toutes les
   * espèces rencontrées avec leur description.  Un bouton permet de
   * fermer la fenêtre et revenir au menu principal.
   */
  function openDex() {
    // Fermer menu principal
    const existingMenu = document.getElementById('capymon-mainmenu');
    if (existingMenu) existingMenu.remove();
    // Son d'ouverture du menu
    playEffect('menu_open');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-dex';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const title = document.createElement('h2');
    title.textContent = 'CapyDex';
    card.appendChild(title);
    const list = document.createElement('div');
    list.style.maxHeight = '220px';
    list.style.overflowY = 'auto';
    const keys = Object.keys(capyDex);
    if (keys.length === 0) {
      list.textContent = 'Aucune créature rencontrée pour le moment.';
    } else {
      // Trier les clés selon leur numéro dans speciesNumbers pour un affichage ordonné.
      keys.sort((a, b) => {
        const na = speciesNumbers[a] || 0;
        const nb = speciesNumbers[b] || 0;
        return na - nb;
      });
      keys.forEach((key) => {
        const sp = speciesData[key];
        if (!sp) return;
        // Conteneur flex pour numéro, image et texte
        const entry = document.createElement('div');
        entry.style.display = 'flex';
        entry.style.alignItems = 'center';
        entry.style.marginBottom = '6px';
        // Numéro (#)
        const numSpan = document.createElement('span');
        numSpan.textContent = '#' + (speciesNumbers[key] || '?');
        numSpan.style.width = '40px';
        entry.appendChild(numSpan);
        // Image miniature (ou placeholder généré si absente)
        let imgObj = speciesImages[key];
        if (!imgObj) {
          imgObj = generatePlaceholderImage(key);
        }
        const imgEl = document.createElement('img');
        imgEl.src = imgObj.src;
        imgEl.style.width = '32px';
        imgEl.style.height = '32px';
        imgEl.style.marginRight = '6px';
        entry.appendChild(imgEl);
        // Texte : nom et description
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<strong>${sp.name}</strong> : ${sp.description}`;
        entry.appendChild(textSpan);
        list.appendChild(entry);
      });
    }
    card.appendChild(list);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fermer';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    // Bouton pour ouvrir le dex des attaques
    const movesBtn = document.createElement('button');
    movesBtn.className = 'btn';
    movesBtn.textContent = 'Attaques';
    movesBtn.style.marginTop = '10px';
    movesBtn.addEventListener('click', (e) => {
      // Empêcher la propagation afin d'éviter la fermeture immédiate du nouveau menu
      e.preventDefault();
      e.stopPropagation();
      // Fermer le CapyDex avant d’ouvrir le menu des attaques
      overlay.remove();
      // Ouvrir le MoveDex immédiatement après la fermeture du CapyDex
      openMoveDex();
    });
    // Bouton pour ouvrir le dex des objets
    const itemsBtn = document.createElement('button');
    itemsBtn.className = 'btn';
    itemsBtn.textContent = 'Objets';
    itemsBtn.style.marginTop = '10px';
    itemsBtn.addEventListener('click', (e) => {
      // Empêcher la propagation pour que l'ItemDex reste affiché
      e.preventDefault();
      e.stopPropagation();
      // Fermer le CapyDex puis ouvrir l'ItemDex
      overlay.remove();
      openItemDex();
    });
    // Bouton pour accéder aux options depuis le CapyDex
    const optionsBtn = document.createElement('button');
    optionsBtn.className = 'btn';
    optionsBtn.textContent = 'Options';
    optionsBtn.style.marginTop = '10px';
    optionsBtn.addEventListener('click', () => {
      overlay.remove();
      openOptions();
    });
    card.appendChild(movesBtn);
    card.appendChild(itemsBtn);
    card.appendChild(optionsBtn);
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * Affiche la liste des capys du joueur avec des informations et
   * permet de changer leur nom.  Un bouton permet également de définir
   * un capy comme actif pour les prochaines rencontres.
   */
  function openCapysMenu() {
    // Fermer menu principal
    const existingMenu = document.getElementById('capymon-mainmenu');
    if (existingMenu) existingMenu.remove();
    // Son d'ouverture du menu
    playEffect('menu_open');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-capys';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const title = document.createElement('h2');
    title.textContent = 'Mes Capys';
    card.appendChild(title);
    const container = document.createElement('div');
    container.style.maxHeight = '220px';
    container.style.overflowY = 'auto';
    if (playerCapys.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'Vous n’avez pas encore de Capy. Capturez-en un !';
      container.appendChild(p);
    } else {
      playerCapys.forEach((capy, index) => {
        const entry = document.createElement('div');
        entry.style.marginBottom = '8px';
        entry.innerHTML = `<strong>${capy.name}</strong> (Espèce : ${speciesData[capy.species].name})<br/>Niv : ${capy.level} – PV : ${capy.currentHP}/${capy.maxHP}<br/>Attaques : ${capy.moves.join(', ')}`;
        const renameBtn = document.createElement('button');
        renameBtn.className = 'btn';
        renameBtn.textContent = 'Renommer';
        renameBtn.style.marginRight = '4px';
        renameBtn.addEventListener('click', () => {
          let newName = prompt('Nouveau nom pour votre Capy :', capy.name);
          if (newName) {
            capy.name = newName;
            savePlayerData();
            openCapysMenu();
          }
        });
        entry.appendChild(renameBtn);
        const chooseBtn = document.createElement('button');
        chooseBtn.className = 'btn';
        chooseBtn.textContent = 'Choisir';
        chooseBtn.disabled = (index === currentCapyIndex);
        chooseBtn.addEventListener('click', () => {
          currentCapyIndex = index;
          savePlayerData();
          alert(`${playerCapys[currentCapyIndex].name} est maintenant votre Capy actif.`);
          overlay.remove();
        });
        entry.appendChild(chooseBtn);
        container.appendChild(entry);
      });
    }
    card.appendChild(container);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fermer';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * Ouvre un sous-menu listant toutes les attaques rencontrées.  Les attaques
   * sont triées par ordre alphabétique et affichent leur description.  La
   * puissance exacte reste cachée afin de préserver la découverte.  Les
   * entrées sont lues depuis moveDex et moveDefinitions.  Un bouton permet
   * de fermer le menu.
   */
  function openMoveDex() {
    playEffect('menu_open');
    const existing = document.getElementById('capymon-movedex');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-movedex';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const title = document.createElement('h2');
    title.textContent = 'Attaques rencontrées';
    card.appendChild(title);
    const list = document.createElement('div');
    list.style.maxHeight = '220px';
    list.style.overflowY = 'auto';
    const keys = Object.keys(moveDex);
    if (keys.length === 0) {
      list.textContent = 'Aucune attaque enregistrée.';
    } else {
      keys.sort();
      keys.forEach((mv) => {
        const def = moveDefinitions[mv] || {};
        const entry = document.createElement('div');
        entry.style.marginBottom = '6px';
        const desc = def.description || 'Une attaque mystérieuse.';
        entry.innerHTML = `<strong>${mv}</strong> : ${desc}`;
        list.appendChild(entry);
      });
    }
    card.appendChild(list);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fermer';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * Ouvre un sous-menu listant les objets rencontrés.  Les objets sont
   * triés par ordre alphabétique et affichent leur description telle
   * qu’elle est définie dans itemDefinitions.  Si l’objet n’a pas de
   * description, une mention générique est utilisée.  Un bouton permet
   * de fermer le menu.
   */
  function openItemDex() {
    playEffect('menu_open');
    const existing = document.getElementById('capymon-itemdex');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-itemdex';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const title = document.createElement('h2');
    title.textContent = 'Objets rencontrés';
    card.appendChild(title);
    const list = document.createElement('div');
    list.style.maxHeight = '220px';
    list.style.overflowY = 'auto';
    const keys = Object.keys(itemDex);
    if (keys.length === 0) {
      list.textContent = 'Aucun objet enregistré.';
    } else {
      keys.sort();
      keys.forEach((it) => {
        const def = itemDefinitions[it] || { name: it, desc: 'Un objet mystérieux.' };
        const entry = document.createElement('div');
        entry.style.marginBottom = '6px';
        entry.innerHTML = `<strong>${def.name}</strong> : ${def.desc}`;
        list.appendChild(entry);
      });
    }
    card.appendChild(list);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fermer';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * Affiche l'inventaire complet en dehors des combats.  Le joueur peut
   * consulter le nombre d’objets possédés, mais ne peut pas les utiliser
   * directement ici (utilisation uniquement pendant les combats).  Un
   * bouton permet de fermer la fenêtre.
   */
  function openBagMenu() {
    // Fermer menu principal
    const existingMenu = document.getElementById('capymon-mainmenu');
    if (existingMenu) existingMenu.remove();
    // Son d'ouverture du menu
    playEffect('menu_open');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-bag';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const title = document.createElement('h2');
    title.textContent = 'Sac';
    card.appendChild(title);
    const list = document.createElement('div');
    list.style.maxHeight = '220px';
    list.style.overflowY = 'auto';
    const keys = Object.keys(inventory);
    if (keys.length === 0) {
      list.textContent = 'Votre sac est vide.';
    } else {
      keys.forEach((key) => {
        const count = inventory[key];
        if (count <= 0) return;
        const itemName = {
          'super-carotte': 'Super-carotte',
          potion: 'Potion de soin',
          revolver: 'Revolver',
          caillou: 'Caillou'
        }[key] || key;
        const entry = document.createElement('div');
        entry.style.marginBottom = '6px';
        entry.innerHTML = `<strong>${itemName}</strong> : ${count}`;
        list.appendChild(entry);
      });
    }
    card.appendChild(list);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fermer';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * Affiche un simple écran d'options.  Pour l’instant, ce menu ne
   * propose qu’un message informatif, mais il peut être étendu à
   * l’avenir.  Un bouton ferme la fenêtre.
   */
  function openOptions() {
    const existingMenu = document.getElementById('capymon-mainmenu');
    if (existingMenu) existingMenu.remove();
    // Son d'ouverture du menu
    playEffect('menu_open');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-options';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const title = document.createElement('h2');
    title.textContent = 'Options';
    card.appendChild(title);
    const msg = document.createElement('p');
    msg.textContent = 'Les options seront disponibles dans une future mise à jour.';
    card.appendChild(msg);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fermer';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * Affiche les crédits du jeu dans un overlay séparé.  Le contenu
   * reprend le fichier credits.html du site.  Un bouton permet de
   * fermer la fenêtre.
   */
  function openCredits() {
    const existingMenu = document.getElementById('capymon-mainmenu');
    if (existingMenu) existingMenu.remove();
    // Son d'ouverture du menu
    playEffect('menu_open');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'capymon-credits';
    const card = document.createElement('div');
    card.className = 'menu-card';
    const title = document.createElement('h2');
    title.textContent = 'Crédits';
    card.appendChild(title);
    const iframe = document.createElement('iframe');
    iframe.src = 'credits.html';
    iframe.style.width = '100%';
    iframe.style.height = '200px';
    iframe.style.border = 'none';
    card.appendChild(iframe);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fermer';
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }
})();