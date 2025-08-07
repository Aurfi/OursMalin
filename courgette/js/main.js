// Courgette Clicker main script
console.log(">>> VERSION DEBUG 99 <<<");
// Main script runs in global scope so game state and helpers are directly
// accessible. This simplifies debugging and integration at the cost of
// exposing the internals publicly.

// When defined before this script executes, setting window.COURGETTE_NO_CSS
// to true prevents the game from altering page-wide CSS. This is useful when
// the host page wants to fully control styling without interference.
const CSS_LOCKED = Boolean(window.COURGETTE_NO_CSS);

function safeAppend(parent, el) {
  if (!CSS_LOCKED) parent.appendChild(el);
}

function safeAddClass(el, cls) {
  if (!CSS_LOCKED) el.classList.add(cls);
}

function safeRemoveClass(el, cls) {
  if (!CSS_LOCKED) el.classList.remove(cls);
}

// Default locale and runtime dictionary. The language can be changed via the
// settings menu; currentLocale holds the active locale.
const DEFAULT_LOCALE = 'fr';
let currentLocale = DEFAULT_LOCALE;
let dict = {};
// Slightly lower cost multiplier to make early progression more addictive
const costMultiplier = 1.13;

// Absolute URL for the external news feed so it can be fetched
// regardless of the current page's directory.
const NEWS_JSON_URL = document.currentScript
  ? new URL('../news.json', document.currentScript.src).href
  : 'news.json';

// LocalStorage key for saving
// Bump the save key to force a complete reset on the next load.  By changing
// this key and incrementing the version below we ensure that any previous
// progress stored in localStorage is ignored.  This allows us to wipe
// everything clean for the new New Game+ experience.
const SAVE_KEY = 'courgetteClickerSaveV2';

// Game state. It includes persistent settings for sound, animations and
// language; these values are saved to and loaded from localStorage.
const state = {
  score: 0,
  total: 0,
  perSecond: 0,
  // clickPower can be upgraded later
  clickPower: 1,
  // Track the total number of clicks performed by the player. Used for statistics.
  clicks: 0,
  // Timestamp when the game started (used to compute time spent)
  startTime: Date.now(),
  // Enable god mode (hidden setting). When true, purchases cost nothing.
  godMode: false,
  buildings: [],
  // Seeds cosmiques pour la mécanique de prestige (non utilisée pour l’instant)
  seeds: 0,
  // Liste des identifiants d'achievements déjà débloqués
  achievementsUnlocked: [],
  // Multiplicateur global s'appliquant à toute la production (upgrades)
  globalMultiplier: 1,
  // Tableau des améliorations globales achetées (true/false par id)
  globalUpgrades: [],
  // Suivi des easter eggs déjà déclenchés (clé -> boolean)
  easterEggs: {},
  // User settings (sound, animations, language)
  settings: {
    sound: true,
    anim: true,
    language: DEFAULT_LOCALE,
    contrast: false,
  },
  // Tableau des améliorations achetées avec des graines cosmiques. Chaque entrée
  // correspond à un élément de seedUpgradeTemplates. false signifie non acheté.
  seedsUpgrades: [],
  // Liste des défis quotidiens actuellement actifs. Chaque défi est un objet
  // décrivant son type (clicks ou produce), sa progression, son objectif et
  // l'état d'achèvement. Les défis sont sauvegardés dans localStorage et
  // régénérés chaque jour. Les défis hebdomadaires pourront être ajoutés
  // ultérieurement en suivant la même structure.
  challenges: [],
  // Ajout de nouvelles propriétés pour la mécanique New Game+.  La propriété
  // autoClick active un clic automatique toutes les secondes.  autoClickRate
  // représente des clics supplémentaires par seconde ajoutés par certaines
  // améliorations.  costReduction applique un rabais proportionnel sur le prix
  // des bâtiments (ex : 0.1 équivaut à -10 %).  prestigeBonus augmente les
  // graines cosmiques gagnées lors d'une réinitialisation.  eventBonus
  // augmente la probabilité des événements aléatoires.
  autoClick: false,
  autoClickRate: 0,
  costReduction: 0,
  prestigeBonus: 0,
  eventBonus: 0,

  // Indique si le skin Aubergine a été acheté via l'offre spéciale.  Lorsqu'il est
  // débloqué, le joueur peut l'activer dans les options pour changer l'apparence
  // de Courgette‑Chan. skinAubergineActive contrôle si le skin est actuellement
  // appliqué au personnage.
  skinAubergineUnlocked: false,
  skinAubergineActive: false,

  // État du skin Banane.  Le skin Banane ne peut pas être acheté dans la boutique
  // (il est marqué SOON) et ne peut être débloqué qu'en saisissant "BANANA"
  // en majuscules dans le champ secret.  Une fois débloqué, le joueur peut
  // l'activer via le sélecteur de skins.  Ces propriétés sont sauvegardées
  // et réinitialisées lors d'un reset complet.
  skinBananeUnlocked: false,
  skinBananeActive: false,

  // Suivi des phrases secrètes saisies par le joueur pour déverrouiller
  // certains succès cachés. Chaque clé correspond à l'identifiant d'un
  // succès secret (findSecret, secretMagic, secretAubergine). La valeur
  // boolean indique si la phrase appropriée a déjà été saisie. Ces valeurs
  // sont sauvegardées afin que les succès restent débloqués d'une session à l'autre.
  secretUnlocks: {},
};

// Flag to lock the face expression during click animations. When true, mouse events
// won't alter the face. It resets automatically after a short delay in animateCourgette().
let faceLock = false;

  // ---------------------------------------------------------------------------
  // Détermination du préfixe des ressources
  //
  // Lorsque le jeu est chargé depuis la page « clicker.html » à la racine, les
  // ressources (images, icônes) se trouvent dans le dossier « assets/ » à
  // proximité immédiate. Lorsque le jeu est chargé depuis « clicker/index.html »
  // dans un sous‑répertoire, ces mêmes ressources se trouvent un niveau plus
  // haut, dans « ../assets/ ». Pour éviter des liens brisés, on calcule un
  // préfixe en fonction du chemin courant puis on l’utilise via une fonction
  // helper pour composer les chemins vers les fichiers.
  const currentPath = window.location.pathname;
  const ASSET_PREFIX =
    currentPath.includes('/clicker/') || currentPath.endsWith('/clicker')
      ? '../assets/'
      : 'assets/';

  // Comme pour les assets, les fichiers de traduction se trouvent à un
  // emplacement différent selon que le jeu est chargé depuis la page
  // clicker.html à la racine ou depuis clicker/index.html dans un
  // sous-dossier.  On calcule donc un préfixe équivalent pour les locales
  // afin d'éviter des requêtes vers un dossier inexistant (ex. clicker/locales).
  const LOCALE_PREFIX =
    currentPath.includes('/clicker/') || currentPath.endsWith('/clicker')
      ? '../locales/'
      : 'locales/';

  /**
   * Construit le chemin complet vers une ressource en préfixant son nom par
   * le chemin calculé précédemment.  Cela permet de référencer correctement
   * toutes les images quel que soit l’emplacement de la page HTML.
   *
   * @param {string} fileName Nom du fichier (ex: « courgette_base.png »)
   * @returns {string} Chemin résolu vers l’image
   */
  function getAssetPath(fileName) {
    return ASSET_PREFIX + fileName;
  }

// Helper to show a particular facial expression. The face element is an <img> whose
// source changes according to the requested expression. Valid names: 'neutral',
// 'open', 'half', 'click'.
function showFace(name) {
  // Met à jour l'image du visage pour refléter l'expression courante. Le corps reste fixe.
  const faceEl = document.getElementById('courgette-face');
  if (!faceEl) return;
  // Map each expression to the corresponding latest face image with black, white and pink colors
  const imgMap = {
    neutral: 'face_neutral_user_latest.png',
    open: 'face_open_user_latest.png',
    half: 'face_half_user_latest.png',
    click: 'face_click_user_latest.png',
  };
  const fileName = imgMap[name] || imgMap.neutral;
  // Utiliser la fonction helper pour générer un chemin d’image correct quel
  // que soit le dossier dans lequel se trouve la page. Sans cela, les
  // expressions faciales peuvent ne pas apparaître lorsque l’on navigue via
  // clicker/index.html.
  faceEl.setAttribute('src', getAssetPath(fileName));
}

// Define building templates with translation keys. Each building now has an
// unlockAt threshold (in total courgettes produites) determining when it
// becomes visible. This permet de cacher les bâtiments avant que le joueur
// n’atteigne un certain palier, afin d’éviter de révéler tout le contenu dès le
// départ et de renforcer la découverte.
const buildingTemplates = [
  // Première amélioration : chaque pot augmente aussi la puissance de clic.
  // Ajustement de l'équilibrage : la puissance de clic conférée par le pot est conservée,
  // mais son coût initial est légèrement relevé et une croissance exponentielle
  // spécifique lui est appliquée. Cela permet de limiter l'avantage des clics
  // sans pénaliser les autres bâtiments.
  // The flower pot is the first building. It also boosts click power by 1 but its price starts
  // higher and scales faster to avoid click spam dominating late game. Base cost increased
  // and a slightly stronger cost multiplier applied for better balance.
  // Le pot de fleurs ne produit plus de courgettes par seconde, mais augmente
  // uniquement la puissance de clic. Son coût initial reste bas et sa progression
  // exponentielle est abaissée à +20 % pour préserver l’équilibre.
  { key: 'pot', cps: 0, baseCost: 30, unlockAt: 0, clickBoost: 1, costMultiplier: 1.2 },
  { key: 'garden', cps: 5, baseCost: 100, unlockAt: 50 },
  { key: 'grandma', cps: 10, baseCost: 1100, unlockAt: 200 },
  { key: 'farm', cps: 50, baseCost: 12000, unlockAt: 1000 },
  { key: 'market', cps: 100, baseCost: 130000, unlockAt: 5000 },
  // Lycée agricole repositionné entre le marché fermier et la ferme XXL.  Cet établissement
  // mineur forme de jeunes agriculteurs qui pratiquent aussi le pixel art de courgettes
  // sur PixelCanvas. Il apporte un bonus de production modéré.
  // Lycée agricole repositionné entre le marché fermier et la Ferme XXL.  C'est un bâtiment
  // mineur, ses coûts et sa production doivent donc rester modestes. On réduit
  // son rendement et son prix pour l’inscrire entre le marché et la ferme XXL.
  { key: 'lycee', cps: 150, baseCost: 250000, unlockAt: 10000 },
  { key: 'industrialFarm', cps: 500, baseCost: 1400000, unlockAt: 20000 },
  { key: 'cannery', cps: 1000, baseCost: 20000000, unlockAt: 100000 },
  { key: 'lab', cps: 5000, baseCost: 330000000, unlockAt: 500000 },
  { key: 'temple', cps: 20000, baseCost: 5100000000, unlockAt: 2000000 },
  { key: 'stockExchange', cps: 100000, baseCost: 75000000000, unlockAt: 10000000 },
  { key: 'spaceStation', cps: 500000, baseCost: 1000000000000, unlockAt: 50000000 },
  { key: 'titan', cps: 5000000, baseCost: 14000000000000, unlockAt: 200000000 },
  { key: 'portal', cps: 50000000, baseCost: 170000000000000, unlockAt: 1000000000 },
  { key: 'ai', cps: 300000000, baseCost: 2100000000000000, unlockAt: 5000000000 },
  { key: 'singularity', cps: 1000000000, baseCost: 26000000000000000, unlockAt: 10000000000 },
  // Nouveaux bâtiments pour diversifier la progression
  { key: 'reseau', cps: 6000000000, baseCost: 100000000000000000, unlockAt: 50000000000000 },
];

// Définition des améliorations globales. Chaque entrée possède un identifiant de clé
// correspondant à une clé de traduction (nom et description), un facteur multiplicatif
// appliqué à la production globale lors de l'achat, un coût de base et éventuellement
// une condition de déblocage. Ces conditions peuvent dépendre du score total ou du nombre
// de bâtiments achetés. Les coûts sont exprimés en nombre de courgettes.
const globalUpgradeTemplates = [
  {
    key: 'upEngrais',
    factor: 2,
    cost: 100000,
    condition: () => state.total >= 1000,
  },
  {
    key: 'upRatatouille',
    factor: 2,
    cost: 500000,
    condition: () => state.total >= 10000,
  },
  {
    key: 'upRobots',
    factor: 1.5,
    cost: 2000000,
    condition: () => state.total >= 100000,
  },
  {
    key: 'upSubventions',
    factor: 1.5,
    cost: 5000000,
    condition: () => state.total >= 1000000,
  },
  // Influence d'une influenceuse courgette : booste la visibilité et la production
  {
    key: 'upInfluence',
    factor: 2,
    cost: 20000000,
    condition: () => state.total >= 5000000,
  },
  // Nouvelles améliorations globales pour offrir plus de contenu et inciter la progression
  {
    key: 'upAbeilles',
    factor: 1.5,
    cost: 50000000,
    condition: () => state.total >= 1000000,
  },
  {
    key: 'upHydro',
    factor: 2,
    cost: 200000000,
    condition: () => state.total >= 10000000,
  },
  // Amélioration de puissance de clic : augmente durablement la puissance de clic
  {
    key: 'upClickPower',
    factor: 1,
    cost: 20000,
    // Un seuil modéré pour débloquer cette amélioration relativement tôt
    condition: () => state.total >= 1000,
    // Multiplie la puissance de clic par 5 à chaque achat. Plus de simple bonus additive !
    clickMultiplier: 5,
  },

  // Courgette génétiquement modifiée : multiplie votre production par 2 pour un prix exorbitant.
  {
    key: 'upGMO',
    factor: 2,
    cost: 100000000000000, // 1e14
    condition: () => state.total >= 10000000000, // déblocage à 1e10
  },
  // Nano‑bots jardiniers : de minuscules robots cultiveront chaque courgette et tripleront votre production.
  {
    key: 'upNanoBots',
    factor: 3,
    cost: 5000000000000000, // 5e15
    condition: () => state.total >= 100000000000, // 1e11
  },
  // Machine à remonter le temps : plantez hier, récoltez aujourd’hui. Un boost colossal.
  {
    key: 'upTimeMachine',
    factor: 10,
    cost: 100000000000000000, // 1e17
    condition: () => state.total >= 1000000000000, // 1e12
  },
];

// Mapping des clés d'améliorations globales vers les noms de fichiers d'icône. Ces
// fichiers sont stockés dans le dossier assets/ et permettent d'afficher un
// petit visuel représentatif à gauche de chaque carte d'amélioration. Si une
// clé n'existe pas dans ce tableau, aucune icône ne sera affichée. Les icônes
// créées manuellement servent de placeholders quand des visuels pixel art ne
// sont pas disponibles.
const UPGRADE_ICON_MAP = {
  upEngrais: 'icon_up_engrais.png',
  upRatatouille: 'icon_up_raclette.png',
  upRobots: 'icon_up_robots.png',
  upSubventions: 'icon_up_pac.png',
  // Icône pour l’amélioration d’influence (influenceuse courgette)
  upInfluence: 'icon_up_influence.png',
  // Icônes pour les nouvelles améliorations
  upAbeilles: 'icon_up_engrais.png',
  upHydro: 'icon_up_robots.png',
  // Icône de l'amélioration de puissance de clic : utiliser l'icône du curseur
  upClickPower: 'cursor.png',
  // Icônes pour les nouvelles améliorations globales.  On réutilise des icônes existantes
  // en attendant que des graphismes spécifiques soient ajoutés.
  upGMO: 'icon_up_engrais.png',
  upNanoBots: 'icon_up_robots.png',
  upTimeMachine: 'icon_up_pac.png',
};

// -----------------------------------------------------------------------------
// Définition des améliorations achetables avec des graines cosmiques.
// Chaque entrée possède une clé (utilisée pour les traductions), un coût en graines
// et une fonction d'effet qui modifie la progression de façon permanente.
// Ces améliorations ne sont disponibles que via la boutique de graines et
// constituent des bonus de New Game+ pour donner une seconde vie au jeu.
const seedUpgradeTemplates = [
  {
    key: 'seedClick',
    // Un coût de départ plus élevé pour équilibrer la progression des graines.
    cost: 10,
    // Augmente la puissance de clic de 1 à chaque achat. Idéal pour booster les débuts de partie.
    effect: () => {
      state.clickPower += 1;
    },
  },
  {
    key: 'seedMulti',
    // Coût moyen : augmente sensiblement la production globale.
    cost: 25,
    // Augmente le multiplicateur global de 0,5 à chaque achat, ce qui améliore tous les revenus.
    effect: () => {
      state.globalMultiplier += 0.5;
    },
  },
  {
    key: 'seedAuto',
    // Coût plus élevé : réserve cette amélioration aux joueurs ayant déjà plusieurs graines.
    cost: 50,
    // Déverrouille un clic automatique qui ajoute la puissance de clic à chaque seconde.
    effect: () => {
      if (!state.autoClick) {
        state.autoClick = true;
      }
    },
  },
  {
    key: 'seedUltra',
    // Amélioration ultime avec un coût conséquent.
    cost: 75,
    // Augmente le multiplicateur global de 1 (équivalent à doubler la production) à chaque achat.
    effect: () => {
      state.globalMultiplier += 1;
    },
  },
  // Nouvelle amélioration : une remise paysanne de 10 % sur les coûts des bâtiments.
  {
    key: 'seedDiscount',
    cost: 30,
    effect: () => {
      // Chaque achat ajoute 10 % de réduction supplémentaire.  On limite la réduction
      // maximale à 90 % pour éviter de rendre les bâtiments gratuits.
      if (!state.costReduction) state.costReduction = 0;
      state.costReduction = Math.min(state.costReduction + 0.1, 0.9);
    },
  },
  // Boost de prestige : augmente de 50 % les graines gagnées à chaque réinitialisation.
  {
    key: 'seedPrestigeBoost',
    cost: 80,
    effect: () => {
      if (!state.prestigeBonus) state.prestigeBonus = 0;
      state.prestigeBonus += 0.5;
    },
  },
  // Chance accrue d'événements aléatoires : +20 % de probabilité par achat.
  {
    key: 'seedLuck',
    cost: 50,
    effect: () => {
      if (!state.eventBonus) state.eventBonus = 0;
      state.eventBonus += 0.2;
    },
  },
  // Ami Capybara : ajoute 5 clics automatiques par seconde à la production.
  {
    key: 'seedCapyFriend',
    cost: 150,
    effect: () => {
      if (!state.autoClickRate) state.autoClickRate = 0;
      state.autoClickRate += 5;
    },
  },
];

// Définition des événements aléatoires (mini-jeu). Chaque événement indique un
// multiplicateur appliqué à la production globale, une durée en millisecondes
// et une clé de message de traduction. Lorsqu'un événement se déclenche, sa
// production est appliquée temporairement puis retirée une fois la durée
// écoulée. Ces mécaniques permettent de dynamiser la partie avec des boosts
// surprise.
const randomEvents = [
  {
    key: 'happyHour',
    multiplier: 2,
    duration: 30000, // 30 secondes
    messageKey: 'eventHappyHour',
  },
  {
    key: 'festival',
    multiplier: 3,
    duration: 15000, // 15 secondes
    messageKey: 'eventFestival',
  },
  // Nouvelle manifestation des gilets jaunes : réduit temporairement la production
  {
    key: 'manifestation',
    multiplier: 0.5,
    duration: 20000, // 20 secondes
    messageKey: 'eventManifestation',
  },

  // Nouvel événement : Tempête de courgettes. Une pluie de légumes s'abat
  // sur vos champs, donnant un coup de fouet temporaire à la production.
  {
    key: 'zucchiniStorm',
    multiplier: 4,
    duration: 20000, // 20 secondes
    messageKey: 'eventZucchiniStorm',
  },
];


// Achievement definitions
const achievements = [
  {
    id: 'click10',
    nameKey: 'achClick10',
    descKey: 'achClick10Desc',
    condition: () => state.total >= 10,
  },
  {
    id: 'click100',
    nameKey: 'achClick100',
    descKey: 'achClick100Desc',
    condition: () => state.total >= 100,
  },
  {
    id: 'click1000',
    nameKey: 'achClick1000',
    descKey: 'achClick1000Desc',
    condition: () => state.total >= 1000,
  },
  {
    id: 'firstPot',
    nameKey: 'achFirstPot',
    descKey: 'achFirstPotDesc',
    condition: () => state.buildings[0] && state.buildings[0].owned >= 1,
  },
  {
    id: 'tenPots',
    nameKey: 'achTenPots',
    descKey: 'achTenPotsDesc',
    condition: () => state.buildings[0] && state.buildings[0].owned >= 10,
  },
  {
    id: 'firstGrandma',
    nameKey: 'achFirstGrandma',
    descKey: 'achFirstGrandmaDesc',
    condition: () => state.buildings[2] && state.buildings[2].owned >= 1,
  },
  {
    id: 'tenGrandma',
    nameKey: 'achTenGrandma',
    descKey: 'achTenGrandmaDesc',
    condition: () => state.buildings[2] && state.buildings[2].owned >= 10,
  },
  // Nouveaux succès pour les bâtiments Lycée agricole et Réseau Courgette
  {
    id: 'firstLycee',
    nameKey: 'achFirstLycee',
    descKey: 'achFirstLyceeDesc',
    // Après réorganisation, le lycée agricole se trouve à l'index 5 de state.buildings
    condition: () => state.buildings[5] && state.buildings[5].owned >= 1,
  },
  {
    id: 'tenLycee',
    nameKey: 'achTenLycee',
    descKey: 'achTenLyceeDesc',
    condition: () => state.buildings[5] && state.buildings[5].owned >= 10,
  },
  {
    id: 'firstReseau',
    nameKey: 'achFirstReseau',
    descKey: 'achFirstReseauDesc',
    condition: () => state.buildings[16] && state.buildings[16].owned >= 1,
  },
  {
    id: 'tenReseau',
    nameKey: 'achTenReseau',
    descKey: 'achTenReseauDesc',
    condition: () => state.buildings[16] && state.buildings[16].owned >= 10,
  },
  // Succès cachés : ils n’apparaissent pas avant d’être débloqués. Ces conditions secrètes récompensent
  // les joueurs persévérants et ajoutent du mystère. Lorsque la condition est remplie, la réussite
  // devient visible et lue dans la liste des succès.
  {
    id: 'secretCollector',
    nameKey: 'achSecretCollector',
    descKey: 'achSecretCollectorDesc',
    condition: () => state.total >= 123456,
    hidden: true,
  },
  {
    id: 'secretMillion',
    nameKey: 'achSecretMillion',
    descKey: 'achSecretMillionDesc',
    condition: () => state.total >= 10000000,
    hidden: true,
  },
  // ------------------------------
  // Succès liés aux graines cosmiques
  // Ces succès récompensent l'accumulation de graines de prestige. Ils sont
  // visibles afin d'inciter le joueur à utiliser la mécanique New Game+ et
  // donnent des objectifs à long terme. Les conditions vérifient la
  // quantité totale de graines dans l'état du jeu.
  {
    id: 'firstSeed',
    nameKey: 'achFirstSeed',
    descKey: 'achFirstSeedDesc',
    condition: () => state.seeds >= 1,
  },
  {
    id: 'seedCollector',
    nameKey: 'achSeedCollector',
    descKey: 'achSeedCollectorDesc',
    condition: () => state.seeds >= 10,
  },
  {
    id: 'seedMaster',
    nameKey: 'achSeedMaster',
    descKey: 'achSeedMasterDesc',
    condition: () => state.seeds >= 100,
  },

  // ------------------------------
  // Succès basés sur la date et l'heure. Ces succès sont cachés par
  // défaut et se déclenchent automatiquement lorsque le joueur joue à
  // certaines dates ou heures spécifiques. On utilise l'heure locale
  // récupérée via new Date(). Ces succès apportent de la surprise et
  // encouragent les joueurs à revenir régulièrement.
  {
    id: 'christmas',
    nameKey: 'achChristmas',
    descKey: 'achChristmasDesc',
    condition: () => {
      const now = new Date();
      return now.getMonth() === 11 && now.getDate() === 25;
    },
    hidden: true,
  },
  {
    id: 'newYear',
    nameKey: 'achNewYear',
    descKey: 'achNewYearDesc',
    condition: () => {
      const now = new Date();
      return now.getMonth() === 0 && now.getDate() === 1;
    },
    hidden: true,
  },
  {
    id: 'birthday',
    nameKey: 'achBirthday',
    descKey: 'achBirthdayDesc',
    condition: () => {
      const now = new Date();
      // Le mois d'août est 7 car les mois commencent à 0 en JavaScript
      return now.getMonth() === 7 && now.getDate() === 7;
    },
    hidden: true,
  },
  {
    id: 'midnight',
    nameKey: 'achMidnight',
    descKey: 'achMidnightDesc',
    condition: () => {
      const now = new Date();
      const hour = now.getHours();
      return hour >= 0 && hour < 1;
    },
    hidden: true,
  },
  {
    id: 'weekend',
    nameKey: 'achWeekend',
    descKey: 'achWeekendDesc',
    condition: () => {
      const day = new Date().getDay();
      // 0 correspond au dimanche et 6 au samedi
      return day === 0 || day === 6;
    },
    hidden: true,
  },

  // ------------------------------
  // Succès déclenchés par des phrases secrètes saisies dans le champ d'options.
  // Chaque succès est associé à une clé de l'objet state.secretUnlocks. Lorsque
  // la phrase correcte est saisie, la clé correspondante est définie sur true
  // et la condition ci‑dessous se trouve satisfaite. Ces succès restent
  // invisibles jusqu'à déblocage et n'ont pas d'autre condition.
  {
    id: 'findSecret',
    nameKey: 'achFindSecret',
    descKey: 'achFindSecretDesc',
    condition: () => state.secretUnlocks && state.secretUnlocks.findSecret === true,
    hidden: true,
  },
  {
    id: 'secretMagic',
    nameKey: 'achSecretMagic',
    descKey: 'achSecretMagicDesc',
    condition: () => state.secretUnlocks && state.secretUnlocks.secretMagic === true,
    hidden: true,
  },
  {
    id: 'secretAubergine',
    nameKey: 'achSecretAubergine',
    descKey: 'achSecretAubergineDesc',
    condition: () => state.secretUnlocks && state.secretUnlocks.secretAubergine === true,
    hidden: true,
  },
  // Succès secret supplémentaire lié au skin Banane.  Débloqué lorsque le
  // joueur saisit la commande BANANA.  Le succès reste caché jusqu'à ce
  // qu'il soit activé via cette entrée et se base sur l'état du skin.
  {
    id: 'secretBanane',
    nameKey: 'achSecretBanane',
    descKey: 'achSecretBananeDesc',
    condition: () => state.skinBananeUnlocked === true,
    hidden: true,
  },
];

// Définition des easter eggs. Chaque entrée associe un seuil de production
// totale (threshold) à une clé de traduction définie dans le fichier de langue.
const easterEggDefs = [
  { threshold: 69, key: 'easter69' },
  { threshold: 420, key: 'easter420' },
  { threshold: 1312, key: 'easter1312' },
  { threshold: 2025, key: 'easter2025' },
  // Le chiffre du diable : offrez un clin d’œil potager
  { threshold: 666, key: 'easter666' },
];

// ---------- Sound and particle helpers ----------

// Play a tone using the Web Audio API. Frequency and duration (seconds) can be
// specified. If sound is disabled in settings, no sound will play.
function playSound(frequency, duration) {
  if (!state.settings.sound) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = frequency;
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (err) {
    console.warn('Erreur lecture audio', err);
  }
}

// Click sound (short pop)
function playClickSound() {
  playSoundFile('click');
}

// Achievement / easter egg sound (longer, higher pitch)
function playAchievementSound() {
  playSoundFile('achievement');
}

// Spawn a floating particle above the clicker showing the amount gained. Uses
// CSS animations defined in style_v2.css. The particle is removed after
// animation completes.
function spawnParticle(amount) {
  if (!state.settings.anim) return;
  const area = document.getElementById('clicker-area');
  if (!area) return;
  const particle = document.createElement('span');
  particle.className = 'particle';
  // Display a rounded number without decimals.  When players click the
  // courgette the floating particles should never show fractional courgettes.
  const rounded = Math.round(amount);
  particle.textContent = `+${rounded}`;
  // Position near the center of the clicker with random horizontal offset
  const rect = area.getBoundingClientRect();
  const xOffset = (Math.random() - 0.5) * 40;
  particle.style.left = `${rect.width / 2 + xOffset}px`;
  particle.style.top = `${rect.height / 2}px`;
  area.appendChild(particle);
  // Remove after animation (1s)
  setTimeout(() => {
    if (particle.parentNode) particle.parentNode.removeChild(particle);
  }, 1000);
}

// Générer une pluie de confettis colorés autour du clicker. Chaque confetti est un
// petit carré de couleur aléatoire qui se déplace vers le haut et disparaît. Cette
// animation s’exécute rapidement et ne s’active que si les animations sont activées.
function spawnConfetti() {
  if (!state.settings.anim) return;
  const colors = ['#F7A8B8', '#F4E285', '#8EDCE6', '#A8C686', '#F2C94C', '#F59BB6'];
  // Les confettis sont créés à l’intérieur du conteneur de la courgette afin que leurs
  // positions absolues se rapportent directement à cette zone et non à tout le document.
  const wrapper = document.getElementById('courgette-wrapper');
  if (!wrapper) return;
  const rect = wrapper.getBoundingClientRect();
  // Calcule le point de départ : centre horizontal de la courgette, légèrement au‑dessus (5 px)
  const xStart = rect.width / 2;
  // On place les confettis juste au bord supérieur du wrapper pour qu’ils émergent de l’intérieur
  const yStart = 0;
  for (let i = 0; i < 8; i++) {
    const conf = document.createElement('div');
    conf.className = 'confetti';
    const color = colors[Math.floor(Math.random() * colors.length)];
    conf.style.position = 'absolute';
    conf.style.width = '6px';
    conf.style.height = '6px';
    conf.style.backgroundColor = color;
    // Position relative au wrapper : commencer au centre et au‑dessus de la courgette
    conf.style.left = `${xStart}px`;
    conf.style.top = `${yStart}px`;
    conf.style.pointerEvents = 'none';
    // Les confettis se situent derrière la courgette en utilisant un indice z inférieur
    conf.style.zIndex = '0';
    wrapper.appendChild(conf);
    const xOffset = (Math.random() - 0.5) * 80;
    const yOffset = -Math.random() * 80 - 40;
    const rotate = Math.random() * 360;
    const duration = 800 + Math.random() * 400;
    conf.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${xOffset}px, ${yOffset}px) rotate(${rotate}deg)`, opacity: 0 }
      ],
      { duration: duration, easing: 'ease-out' }
    );
    setTimeout(() => {
      if (conf.parentNode) conf.parentNode.removeChild(conf);
    }, duration + 100);
  }
}

// Affiche une animation plein écran lors d'un prestige.  Un voile coloré
// apparaît, s'éclaircit puis disparaît, accompagné d'une pluie de confettis
// supplémentaires.  Cette animation ne se déclenche que si les animations
// sont activées dans les options.  La durée est courte pour ne pas
// bloquer la progression du jeu.
function showPrestigeAnimation() {
  if (!state.settings.anim) return;
  // Créer un voile couvrant tout l'écran avec la classe CSS dédiée.  Le
  // voile est ajouté dans le corps du document pour recouvrir toutes les
  // sections (inclus l'overlay) mais ne bloque pas les interactions car
  // pointer-events est désactivé dans la classe CSS.
  const overlay = document.createElement('div');
  overlay.className = 'prestige-overlay';
  safeAppend(document.body, overlay);
  // Retirer le voile après 2 secondes pour libérer la vue.  La disparition
  // progressive est gérée via CSS.
  setTimeout(() => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 2000);
  // Générer plusieurs salves de confettis pour célébrer le prestige
  for (let i = 0; i < 20; i++) {
    setTimeout(() => spawnConfetti(), i * 50);
  }
}

// Spawn a floating number at the position of a click. It displays the amount
// gained from the click and floats upwards while fading out. The element is
// removed automatically after the animation completes.
function spawnFloatingNumber(e, amount) {
  if (!state.settings.anim) return;
  const wrapper = document.getElementById('courgette-wrapper');
  if (!wrapper) return;
  const rect = wrapper.getBoundingClientRect();
  // Coordinates relative to the wrapper
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const numEl = document.createElement('div');
  numEl.className = 'floating-number';
  // Always round the floating amount to the nearest integer so no decimals appear.
  // Using Math.round ensures 0.5 values are rounded up.  Then formatNumber is
  // applied so large numbers still receive suffixes (K, M, etc.) when
  // appropriate.  This satisfies the requirement that per‑click values and
  // floating numbers never display fractional parts.
  numEl.textContent = `+${formatNumber(Math.round(amount))}`;
  // Position the element at the click location; account for its own size via transform
  numEl.style.left = `${x}px`;
  numEl.style.top = `${y}px`;
  wrapper.appendChild(numEl);
  // Remove after the animation (0.5s) completes
  setTimeout(() => {
    if (numEl.parentNode) numEl.parentNode.removeChild(numEl);
  }, 500);
}

// Anime Courgette‑chan lors d'un clic. Cette fonction gère les mouvements des
// bras, l'expression du visage, l'effet de profondeur via l'overlay, un
// léger rebond (squash and stretch) et déclenche une pluie de confettis.
// Elle doit être appelée uniquement si les animations sont activées afin de
// respecter les préférences d'accessibilité de l'utilisateur.
function animateCourgette() {
  if (!state.settings.anim) return;
  // References to wrapper and overlay
  const wrapper = document.getElementById('courgette-wrapper');
  const overlayImg = document.getElementById('courgette-overlay');
  // Lors d'un clic, déclencher l'animation des membres et afficher le visage "click".
  // La variable faceLock empêche les mouvements de souris de modifier l'expression pendant l'animation.
  if (wrapper) {
    wrapper.classList.add('animate-limbs');
    // Remove the animation class after the animation has completed (0.6 s for legs
    // but arms bounce is also 0.6 s).  Use 650 ms to account for easing.
    setTimeout(() => wrapper.classList.remove('animate-limbs'), 650);
  }
  // Afficher le visage avec les yeux plissés lorsque l'utilisateur clique
  faceLock = true;
  showFace('click');
  // Après un court délai, revenir au visage neutre et réactiver la détection
  setTimeout(() => {
    faceLock = false;
    showFace('neutral');
  }, 400);
  // Overlay : un bref éclaircissement pour accentuer le relief
  if (overlayImg) {
    overlayImg.animate([
      { opacity: 1.0 },
      { opacity: 0.5 },
      { opacity: 0.8 }
    ], { duration: 300, easing: 'ease-out' });
  }
  // Effet de rebond (squash and stretch) sur le conteneur complet.
  if (wrapper) {
    wrapper.animate([
      { transform: 'scale(1,1)' },
      { transform: 'scale(0.92,0.88)' },
      { transform: 'scale(1.05,0.98)' },
      { transform: 'scale(1,1)' }
    ], { duration: 350, easing: 'ease-out' });
  }
  // Confettis colorés pour célébrer le clic
  spawnConfetti();
}

// État courant de l'événement aléatoire. S'il est non nul, un boost de
// production est appliqué au multiplicateur global via event.multiplier. Ce
// champ contient l'objet événement actif ainsi que son timer de fin.
state.currentEvent = null;

// Déclenche un événement aléatoire donné. Applique le multiplicateur,
// affiche le message et programme la fin de l'événement. Si un événement
// est déjà en cours, cette fonction ne fait rien.
function triggerEvent(eventDef) {
  if (state.currentEvent) return;
  if (!eventDef) return;
  // Enregistrer l'événement actif
  state.currentEvent = {
    def: eventDef,
    timeoutId: null,
  };
  // Appliquer le multiplicateur
  state.globalMultiplier *= eventDef.multiplier;
  updateStats();
  // Afficher le message d'événement dans la zone news
  // Display event message in the news speech bubble
  const newsTextEl = document.getElementById('news-text');
  if (newsTextEl) {
    newsTextEl.textContent = t(eventDef.messageKey);
  }
  // Programmer la fin de l'événement
  state.currentEvent.timeoutId = setTimeout(() => {
    // Retirer le multiplicateur
    state.globalMultiplier /= eventDef.multiplier;
    state.currentEvent = null;
    // Informer le joueur de la fin
    const nEl = document.getElementById('news-text');
    if (nEl) {
      nEl.textContent = t('eventEnded');
    }
    updateStats();
  }, eventDef.duration);
  // Jouer un son spécifique pour les événements aléatoires
  playSoundFile('event');
}

// Peut déclencher un événement aléatoire en fonction d'une probabilité. Si
// aucun événement n'est en cours, on tire au hasard et on lance l'un des
// événements définis. À appeler lors des clics ou des mises à jour périodiques.
function maybeTriggerRandomEvent() {
  if (state.currentEvent) return;
  // Probabilité de base de 1 % par appel.  Les améliorations de chance
  // augmentent cette probabilité via state.eventBonus.
  const baseProb = 0.01;
  const probability = baseProb * (1 + (state.eventBonus || 0));
  if (Math.random() < probability) {
    const eventDef = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    triggerEvent(eventDef);
  }
}

// Persist user settings to localStorage. This is separate from game save so
// settings remain available even if the game data version changes.
function saveSettings() {
  try {
    localStorage.setItem('courgetteClickerSettingsV1', JSON.stringify(state.settings));
  } catch (err) {
    console.warn('Impossible de sauvegarder les paramètres utilisateur', err);
  }
}

// Vérifie si des easter eggs doivent être déclenchés. Si un seuil est atteint
// pour la première fois, on affiche un message dédié et on marque l’easter egg
// comme déclenché pour éviter de le répéter.
function checkEasterEggs() {
  if (!state.easterEggs) state.easterEggs = {};
  easterEggDefs.forEach((def) => {
    if (!state.easterEggs[def.threshold] && state.total >= def.threshold) {
      const newsEl = document.getElementById('news-text');
      if (newsEl) {
        // Mettre à jour seulement le contenu de la bulle sans retirer le capybara.
        newsEl.textContent = t(def.key);
      }
      console.log('Easter egg déclenché :', def.threshold);
      state.easterEggs[def.threshold] = true;
      saveGame();

      // Play sound for easter egg
      playAchievementSound();
    }
  });
}

// Fallback translation dictionary in case the JSON file can't be loaded (e.g. file protocol)
const fallbackDict = {
  gameTitle: 'Courgette Clicker',
  score: 'courgettes récoltées',
  perSecond: 'par seconde',
  // Nouvelle clé pour afficher le stock de courgettes (score actuel).
  scoreCurrent: 'courgettes en stock',
  // Production par minute et par clic
  perMinute: 'par minute',
  perClick: 'par clic',
  // Section titre et lignes pour la page de statistiques (onglet succès)
  statsTitle: 'Statistiques',
  statClicks: 'Nombre total de clics : {clicks}',
  statTime: 'Temps passé sur le jeu : {time}',
  statReal: 'Courgettes réelles que tu aurais pu planter : {count}',
  buy: 'Acheter',
  cost: 'Coût',
  owned: 'Possédés',
  production: 'Production',
  notEnough: 'Pas assez de courgettes',
  pot: 'Pot de fleurs sur le balcon',
  potDesc:
    "Votre première courgette pousse timidement dans un pot. Chaque pot augmente durablement votre récolte par clic, mais il ne produit plus tout seul. Rien ne vaut un peu d'huile de coude ! Perceval dirait 'c'est pas faux' en arrosant et Karadoc lui piquerait le pot pour faire une soupe.",
  garden: 'Jardin partagé (AMAP)',
  gardenDesc:
    'Un carré potager communautaire où les voisins cultivent des courgettes avec vous. On y débat comme dans OSS 117 et on partage les potins comme à Kaamelott. Produit 5 courgettes par seconde.',
  grandma: 'Mamie Paulette',
  grandmaDesc:
    "Une grand‑mère experte en jardinage s’ennuyait depuis la mort de Papi ; elle se met à cultiver des courgettes dans son potager. Elle murmure des recettes de potion magique à la Panoramix et raconte des blagues d'OSS 117. Produit 10 courgettes par seconde.",
  farm: 'Ferme familiale',
  farmDesc:
    'À la ferme familiale, Karadoc et Perceval plantent des courgettes entre deux banquets. Ils discutent de la meilleure manière de dire « C\'est pas faux » tout en cassant du pain. Produit 50 courgettes par seconde.',
  market: 'Marché fermier',
  marketDesc:
    'Au marché fermier, Panoramix troque ses potions contre des courgettes, Obélix s\'agace qu\'il n\'y ait pas de sangliers et un poissonnier moustachu hurle « il est frais mon poisson ! ». Tes légumes partent plus vite qu\'un menhir. Produit 100 courgettes par seconde.',
  industrialFarm: 'Ferme XXL',
  // Ferme XXL : des machines partout, des robots chantent « Je suis un soldat comme les autres » (OSS 117) et Karadoc se demande où est la bouffe. Les écologistes hurlent, mais la production explose.
  industrialFarmDesc:
    'Une ferme XXL où les machines sont plus nombreuses que les agriculteurs. Des robots chantent « Je suis un soldat comme les autres » (OSS 117) et Karadoc se demande où est la bouffe. Les écologistes hurlent, mais la production explose. Produit 500 courgettes par seconde.',
  cannery: 'Usine Ratatouille',
  // Usine Ratatouille : un petit rat sous la toque prépare ratatouilles, raclettes et mets de chevalier ; Astérix et Obélix repartent avec des paniers.
  canneryDesc:
    'Dans l\'usine Ratatouille, un petit rat sous la toque cuisine des courgettes en ratatouille, raclette et bouffe de chevalier. Astérix et Obélix repartent avec des paniers. Produit 1 000 courgettes par seconde.',
  lab: 'Lab du CNRS',
  // Laboratoire du CNRS : des chercheurs mélangent ADN et potion magique pour créer la courgette ultime ; OSS 117 enfile une blouse et dit « j\'aime me beurrer la biscotte ». Même ton prof de bio n’y comprend rien.
  labDesc:
    'Au labo du CNRS, des chercheurs mélangent ADN et potion magique pour créer la courgette ultime. OSS 117 enfile une blouse et dit « j\'aime me beurrer la biscotte  ». Même ton prof de bio n’y comprend rien. Produit 5 000 courgettes par seconde.',
  temple: 'Culte de Sainte Courgette',
  // Culte de Sainte Courgette : des fidèles en robe verte prient à la gloire du légume sacré ; Perceval tente de comprendre la liturgie et Astérix vole quelques courgettes bénies.
  templeDesc:
    'Dans le Culte de Sainte Courgette, des fidèles en robe verte prient à la gloire du légume sacré. Perceval essaye de comprendre la liturgie et Astérix en profite pour voler quelques courgettes bénies. Produit 20 000 courgettes par seconde.',
  stockExchange: 'CAC Courgette',
  // CAC Courgette : des traders en sandales misent sur ton légume préféré. OSS 117 cherche la cabine téléphonique tandis qu’une mamie vend des parts.
  stockExchangeDesc:
    'Au CAC Courgette, des traders en sandales misent sur ton légume préféré. OSS 117 demande « où est la cabine téléphonique ? » pendant qu\'une mamie vend des parts. Produit 100 000 courgettes par seconde.',
  spaceStation: 'Base Courgette Kourou',
  // Base Courgette Kourou : tu lances des courgettes dans l’espace. Obélix demande si la Lune est faite en fromage et un astronaute grille des courgettes en apesanteur.
  spaceStationDesc:
    'À la base Courgette Kourou, tu lances des courgettes dans l\'espace. Obélix demande si la Lune est faite en fromage, et un astronaute grille des courgettes en apesanteur. Produit 500 000 courgettes par seconde.',
  titan: 'Serres du Mont‑Blanc',
  // Serres du Mont‑Blanc : des courgettes géantes poussent dans l’air alpin. Panoramix cueille des plantes, Karadoc glisse sur la neige et s’exclame « c\'est pas faux ».
  titanDesc:
    'Les serres du Mont‑Blanc cultivent des courgettes géantes dans l\'air alpin. Panoramix cueille des plantes, Karadoc glisse sur la neige et s\'exclame « c\'est pas faux ». Produit 5 000 000 courgettes par seconde.',
  portal: 'Métavers Courgette',
  // Métavers Courgette : tu navigues entre la Table Ronde et les pyramides d’Égypte en VR. Kaamelott, OSS 117 et Cléopâtre s’y croisent et achètent des NFTs de courgette.
  portalDesc:
    'Dans le Métavers Courgette, tu navigues entre la Table Ronde et les pyramides d\'Égypte en VR. Kaamelott, OSS 117 et Cléopâtre s\'y croisent et achètent des NFTs de courgettes. C’est déroutant mais rentable. Produit 50 000 000 courgettes par seconde.',
  ai: 'Algorithme ChatCourgette',
  // Algorithme ChatCourgette : une IA raconte des blagues à la Kaamelott tout en optimisant la production. Un LLM propose des recettes de courgette farcie et OSS 117 essaye de lui apprendre des répliques.
  aiDesc:
    'L\'algorithme ChatCourgette est une IA qui raconte des blagues à la Kaamelott tout en optimisant ta production. Un LLM propose des recettes de courgette farcie et OSS 117 essaye de lui apprendre des répliques. Produit 300 000 000 courgettes par seconde.',
  singularity: 'Big Bang Courgette',
  // Big Bang Courgette : l’univers entier se transforme en courgettes. César capitule, Kaamelott fête la nouvelle ère et OSS 117 demande où est le pastis.
  singularityDesc: 'Au Big Bang Courgette, l\'univers entier se transforme en courgettes. César capitule, Kaamelott fête la nouvelle ère et OSS 117 demande « mais où est le pastis ? ». Produit 1 000 000 000 courgettes par seconde.',
  // Messages d’actualité et clins d’œil à la culture pop et aux nouvelles de l’été 2025.
  newsMessages: [
    "Orelsan sort un clip dédié à la courgette : la vidéo fait exploser les vues sur YouTube et TikTok.",
    "ZEvent 2025 : des streamers comme Mastu et Joyca cultivent des courgettes en live pour récolter des dons sur Twitch.",
    "Squid Game saison 2 introduit une épreuve ‘courgette géante’ : c’est le nouveau meme sur Insta.",
    "Vice‑Versa 2 inspire un défi #ÉmotionCourgette : les ados montrent leur humeur avec un légume sur TikTok.",
    "Fortnite dévoile un skin ‘Courgette Knight’ dans sa collab de juin : tout le monde le veut.",
    "Ton chat devient une star CourgetteTok et dépasse les 100 000 abonnés sur TikTok.",
    "Ton lycée lance un concours cosplay ‘Sainte Courgette’ à la Japan Expo : le live Twitch explose.",
    // Messages romantiques et humoristiques sur PixelCanvas et la Garde de la nuit
    "Sur PixelCanvas, Courgette‑Chan dessine un cœur géant pour sa dulcinée – la toile fond.",
    "La Garde de la nuit jure de protéger vos courgettes au‑delà du Mur, contre des carottes jalouses.",
    "Courgette‑Chan lâche une blague potagère : ce n’est pas la taille qui compte, mais le goût.",
    "Un fan glisse une lettre d’amour à Courgette‑Chan : l’histoire d’amour la plus mignonne depuis Roméo et Juliette… version courgette.",
    "Un matin, Courgette‑Chan récite un poème à sa douce courgette sur PixelCanvas ; la communauté verse une larme.",
    "La Garde de la nuit se met à fredonner ‘Ah vous dirai‑je Courgette’ – l’ambiance est électrique.",
    "La Garde de la nuit danse un slow au milieu d'un champ de courgettes, romantisme post‑apocalyptique.",
    "Courgette‑Chan poste un pixel‑art coquin sur PixelCanvas et casse Internet.",
    "Un champ de courgettes en fleurs inspire un haïku romantique – la Garde de la nuit applaudit.",
    // Indices cryptiques et secrets
    "🏆 Quelque chose se cache derrière Courgette‑Chan... 🤫",
    "🏆 Des rumeurs parlent d'une aubergine mystique... 🍆🏆",
    "🏆 Des paroles magiques ouvrent des secrets... ✨🏆",
    // Viralité du capybara journaliste
    "Un mème du capybara journaliste envahit TikTok : tout le monde veut sa casquette de reporter.",
    // Actualités majeures d’août 2025 en France
    "🔔 Breaking news : à partir du 1er août, la TVA sur les abonnements d’électricité et de gaz passe de 5,5 % à 20 %. Karadoc s’interroge : va‑t‑il devoir choisir entre raclette et chauffage ?",
    "💡 Le taux du Livret A tombe à 1,7 % le 1ᵉʳ août. Perceval sort sa calculette et décide d’acheter des courgettes plutôt que d’épargner.",
    "🔥 Météo France place le sud de la France en alerte rouge incendies. Panoramix arrose vos courgettes avec la potion pour les protéger.",
    "🚴‍♀️ La dernière étape du Tour de France Femmes 2025 grimpe jusqu’à Châtel : un dénivelé tellement fou qu’Obélix préfère rester au banquet.",
    "🎆 La Fête de la Saint‑Louis à Sète bat son plein du 21 au 26 août : des joutes nautiques et des courgettes farcies au menu.",
    "🌞 Le 15 août, c’est l’Assomption : un jour férié parfait pour faire griller des courgettes en famille.",
    "🏉 La Coupe du monde de rugby féminine commence le 22 août en Angleterre ; les Bleues affrontent l’Italie. Mamie Paulette tricote des écharpes pour l’équipe.",
    // Actualités IA et LLM
    "🌍 Breaking news : sortie de Qwen‑Image le 4 août 2025 ! Ce modèle open‑source génère des images de courgettes locales. Sandrine Rousseau n’a pas tout compris mais elle fait la fête.",
    "🤖 Exclusif : les LLM apprennent à parler courgette et Kaamelott. ChatCourgette prévoit un crossover avec OSS 117 – humour garanti.",
    "🎬 Un nouveau film OSS 117 annonce un caméo de Courgette‑Chan ! Hubert Bonisseur de la Bath prononce enfin ‘Je suis un légume’.",
    "🔮 Une prophétie de Panoramix prévoit la sortie d’un LLM capable de cloner Obélix en NFT."
  ],
  ownedUnits: 'Possédés : {owned}',
  costUnits: 'Coût : {cost}',
  produces: 'Produit {cps} par seconde',
  noDesc: 'Pas de description disponible'
  ,
  achClick10: 'Premières caresses',
  achClick10Desc: 'Tu as récolté 10 courgettes !',
  achClick100: 'Centimètre cubique',
  achClick100Desc: '100 courgettes récoltées. Petit producteur devient grand.',
  achClick1000: 'Kilo-courge',
  achClick1000Desc: '1 000 courgettes récoltées, continue comme ça !',
  achFirstPot: 'Pousse timide',
  achFirstPotDesc: 'Acheter votre premier Pot de fleurs.',
  achTenPots: 'Main verte',
  achTenPotsDesc: 'Posséder 10 Pots de fleurs.',
  achFirstGrandma: 'Mamie recrue',
  achFirstGrandmaDesc: 'Engager votre première Mamie Paulette.',
  achTenGrandma: 'Armée de mamies',
  achTenGrandmaDesc: 'Recruter 10 Mamie Paulette.'
  ,
  // Section des améliorations globales et du prestige
  // Renommé en « Boutique » pour clarifier qu’il s’agit d’une boutique d’améliorations
  globalUpgradesTitle: 'Boutique',
  upEngrais: 'Engrais TikTok viral',
  upEngraisDesc: 'Grâce à un challenge TikTok #EngraisSurvital, la jeunesse arrose tes courgettes en dansant. La croissance explose : production globale multipliée par 2.',
  upRatatouille: 'Raclette Party',
  upRatatouilleDesc: 'Tu organises des soirées raclette à base de courgettes vegan. Les étudiants en raffolent : toute la production est doublée.',
  upRobots: 'Robots du lycée agricole',
  upRobotsDesc: 'Les élèves du lycée agricole construisent des robots moissonneurs qui travaillent sans relâche : production multipliée par 1,5.',
  upSubventions: 'Quotas PAC 2025',
  upSubventionsDesc: 'La Politique Agricole Commune revoit ses quotas : tu profites des subventions de la PAC 2025. Moins de charges, plus de courgettes : production multipliée par 1,5.',
  // Ajout de nouveaux boosts globaux
  upAbeilles: 'Abeilles hyperactives',
  upAbeillesDesc: 'Des abeilles survitaminées pollinisent tes fleurs plus vite qu’un like sur TikTok. La production est multipliée par 1,5.',
  upHydro: 'Serre hydroponique',
  upHydroDesc: 'Tu investis dans une serre hydroponique high‑tech où les courgettes poussent dans des solutions nutritives contrôlées. La production globale est doublée.',
  // Amélioration de puissance de clic renommée pour plus de fun
  // Nom et description humoristiques pour l’amélioration de puissance de clic
  upClickPower: 'Tapotage Turbo',
  // La description précise désormais que l’amélioration multiplie le gain de clic par 5
  upClickPowerDesc: 'Tes doigts zappent la courgette ! Chaque achat multiplie ta récolte par clic par 5 — c’est ça, le tapotage turbo !',
  upClickPowerCongrats: 'Tes doigts crépitent de puissance ! Tes clics valent 5 fois plus !',
  prestigeBtn: 'Graines',
  // Libellé du bouton d’accès à la boutique des améliorations globales
  globalBtn: 'Boutique',
  prestigeInfo: 'Graines cosmiques : {seeds}. Si vous réinitialisez maintenant, vous gagnerez {gain} graines.',
  prestigeConfirm: 'Réinitialiser la partie pour gagner {gain} graines cosmiques ? Cette action ne peut pas être annulée.'
  ,
  // Message lorsque la boutique des boosts globaux est vide
  // Message affiché lorsque la boutique des améliorations spéciales est vide. Le texte
  // invite le joueur à revenir plus tard avec humour.
  shopEmpty: "Il n'y a aucun objet spécial à vendre pour le moment. Un employé te demande de revenir quand tu seras plus riche, sale prolo.",
  // Nouveaux libellés pour les défis hebdomadaires et les succès supplémentaires
  weeklyChallengesTitle: 'Défis hebdomadaires',
  challengeSeeds: 'Gagne {target} graines cosmiques',
  achFirstSeed: 'Graine cosmique',
  achFirstSeedDesc: 'Gagner 1 graine cosmique.',
  achSeedCollector: 'Germination cosmique',
  achSeedCollectorDesc: 'Gagner 10 graines cosmiques.',
  achSeedMaster: 'Maître des graines',
  achSeedMasterDesc: 'Gagner 100 graines cosmiques.',
  achChristmas: 'Joyeux Noël',
  achChristmasDesc: 'Jouer le 25 décembre et recevoir vos cadeaux courgettes.',
  achNewYear: 'Bonne année !',
  achNewYearDesc: "Se connecter le 1ᵉʳ janvier pour célébrer l'an nouveau de la courgette.",
  achBirthday: 'Anniversaire de Courgette‑Chan',
  achBirthdayDesc: 'Jouer le 7 août, jour de naissance de Courgette‑Chan ! 🎉',
  achMidnight: 'Oiseau de nuit',
  achMidnightDesc: 'Jouer entre minuit et une heure du matin.',
  achWeekend: 'Jardinier du week‑end',
  achWeekendDesc: 'Jouer un samedi ou un dimanche.',
  achFindSecret: 'Secret dévoilé',
  achFindSecretDesc: 'Vous avez découvert le secret caché derrière Courgette‑Chan.',
  achSecretMagic: 'Magie de la courgette',
  achSecretMagicDesc: 'Vous avez prononcé une phrase magique.',
  achSecretAubergine: 'Égérie aubergine',
  achSecretAubergineDesc: 'Vous avez invoqué l’aubergine mystique.',
  specialOfferTitle: 'Offre spéciale !',
  specialOfferAubergine: 'Skin Aubergine',
  specialOfferPrice: 'Seulement 9,99 €',
  buySkinBtn: 'Acheter',
  paypalPopupTitle: 'Acheter le skin Aubergine pour 9,99 € ?',
  paypalBtn: 'Payer avec PayPal 😎💸',
  cancelBtn: '💀 Retour',
  skinPurchased: 'Skin Aubergine débloqué !',
  // Libellé pour l’option qui permet d’activer ou de désactiver le skin
  // Aubergine.  On ajoute une note humoristique “mode super‑légume” pour
  // rappeler qu’il s’agit d’un skin spécial déblocable.
  skinOption: 'Activer le skin Aubergine (mode super‑légume)',
  skinLocked: 'Skin Aubergine non acheté',

  // ---------------------------------------------------------------------
  // Nouvelles entrées de traduction pour les fonctionnalités ajoutées.
  // Label générique pour le sélecteur de skin dans les options.  Affiche
  // “Choisir un skin” afin d’indiquer qu’il s’agit d’un menu déroulant.
  optSkin: 'Choisir un skin',
  // Statistiques amusantes faisant référence à Kaamelott, Astérix/Obélix et OSS 117.
  statKaamelott: 'Perceval dirait « c\'est pas faux » {clicks} fois !',
  statAsterix: 'Obélix n’a jamais mangé autant de sangliers que vous n’avez cliqué !',
  statOSS: 'Hubert Bonisseur de la Bath serait fier de vos {clicks} clics !',
  // Succès secret lié au skin Banane.  Déclenché lorsque le joueur tape BANANA.
  achSecretBanane: 'Banane suprême',
  achSecretBananeDesc: 'Vous avez découvert le pouvoir de la banane.',
  // Messages relatifs au skin Banane et à l’offre à venir dans la boutique.
  specialOfferBanane: 'Skin Banane',
  specialOfferBananePrice: 'Seulement 99 €',
  skinBananaSoon: 'Bientôt disponible',
  skinBananaUnlocked: 'Skin Banane débloqué !',

  // Libellés pour la boutique des graines cosmiques
  seedsTitle: 'Boutique des graines',
  seedsCount: 'Vous avez {seeds} graines',
  seedClick: 'Amélioration de clic',
  seedClickDesc: 'Augmente la puissance de clic de 1.',
  seedMulti: 'Multiplicateur',
  seedMultiDesc: 'Augmente le multiplicateur global de 0,5.',
  seedAuto: 'Auto‑clic',
  seedAutoDesc: 'Déclenche automatiquement un clic toutes les secondes.',
  seedUltra: 'Ultra boost',
  seedUltraDesc: 'Augmente le multiplicateur global de 1.',
  // Message affiché lorsque la boutique des graines cosmiques est vide.
  seedsEmpty: "Il n'y a aucun objet à vendre pour le moment. Un employé te demande de revenir quand tu seras plus riche, sale prolo.",

  // Succès cachés (dévoilés uniquement après déblocage)
  achSecretCollector: 'Collectionneur secret',
  achSecretCollectorDesc: 'Tu as récolté 123 456 courgettes ! Un chiffre rond… ou presque.',
  achSecretMillion: 'Millionnaire des courges',
  achSecretMillionDesc: 'Tu as dépassé les 10 millions de courgettes au total. Ta passion devient un empire.',
  // Messages des easter eggs
  easter69: '😏 Tu viens d’atteindre 69 courgettes. Coïncidence ? Je ne crois pas.',
  easter420: '🌿 420 courgettes ! On dirait que tu as roulé un gros joint de ratatouille.',
  easter1312: '1312 courgettes : ACAB – All Courgettes Are Beautiful.',
  easter2025: '🎉 2025 courgettes ! L’année de la courgette reine n’est que le début.',
  // Options
  optSound: 'Son',
  optAnim: 'Animations',
  optLang: 'Langue',
  // Libellé pour l'option de mode sombre (anciennement "contraste élevé")
  optContrast: 'Mode sombre',
  capybaraAlt: 'Capybara journaliste',
  helpTitle: 'Comment jouer ?',
  helpText1: 'Clique sur la courgette pour récolter des courgettes.',
  helpText2: 'Achète des bâtiments pour produire automatiquement.',
  helpText3: 'Les améliorations globales multiplient ta production.',
  close: 'Fermer',

  // Événements aléatoires / mini-jeux
  eventHappyHour: 'Heure magique ! Ta production est doublée pendant 30 secondes.',
  eventFestival: 'Festival de la courgette ! Production multipliée par 3 pendant 15 secondes.',
  eventEnded: 'L’événement est terminé, la production revient à la normale.',
  // Nouvelle manifestation des gilets jaunes
  eventManifestation: 'Manifestation des gilets jaunes ! La production est divisée par 2 pendant 20 secondes.',

  // Nouvelle tempête de courgettes : augmente fortement la production pendant
  // un court instant.
  eventZucchiniStorm: 'Tempête de courgettes ! Une pluie de légumes booste votre production pendant 20 secondes.',

  // Nouveaux bâtiments spécifiquement ajoutés pour diversifier le jeu
  lycee: 'Lycée agricole',
  lyceeDesc:
    "Un lycée agricole où les élèves apprennent l'agroécologie et s'entraînent à dessiner des courgettes sur PixelCanvas. Entre deux cours, des romances naissent dans les serres et la Garde de la nuit vient goûter vos ratatouilles. Produit 150 courgettes par seconde.",
  reseau: 'Réseau Courgette',
  // Réseau Courgette : des fermes connectées sur blockchain échangent astuces et potins ; Perceval essaie de comprendre la blockchain, sans succès.
  reseauDesc:
    'Un réseau décentralisé de fermes connectées s’appuie sur la blockchain pour optimiser la production. Chaque nœud échange astuces et potins ; Perceval essaie de comprendre la blockchain, sans succès. Produit 6 000 000 000 courgettes par seconde.',

  // Nouvelle amélioration globale mettant en scène une influenceuse courgette
  upInfluence: 'Influenceuse Courgette',
  upInfluenceDesc:
    'Ton compte Courgette‑gram devient viral : un million d’abonnés, des partenariats rémunérés et des live Twitch boostent ta visibilité. La production globale est doublée.',

  // Succès associés aux nouveaux bâtiments
  achFirstLycee: 'Première classe verte',
  achFirstLyceeDesc: 'Acheter votre premier Lycée agricole.',
  achTenLycee: 'Réseau éducatif',
  achTenLyceeDesc: 'Posséder 10 Lycées agricoles.',
  achFirstReseau: 'Connexion courgette',
  achFirstReseauDesc: 'Créer le premier nœud du Réseau Courgette.',
  achTenReseau: 'Maître du réseau',
  achTenReseauDesc: 'Posséder 10 Réseaux Courgette.',

  // Nouvel easter egg pour le nombre 666
  easter666: '👹 666 courgettes : l’ombre du diable plane sur ton potager...',

  // Libellés et textes pour la page des succès
  achievementsBtn: 'Succès',
  achievementsTitle: 'Succès',
  achievementsProgress: '{unlocked} succès débloqués sur {total}',

  // -------------------------------------------------------------------------
  // Nouveau contenu pour la boutique des graines cosmiques et la page des options
  // Titre de la boutique
  seedsTitle: 'Boutique des graines',
  // Texte indiquant le nombre de graines en possession
  seedsCount: 'Tu as {seeds} graines cosmiques.',
  // Affichage du nombre d'améliorations achetées par rapport au total dans la boutique des graines.
  // La chaîne utilise les tokens {purchased} et {total} pour générer "Améliorations : X/Y".
  shopProgress: 'Améliorations : {purchased}/{total}',
  // Nom et description des améliorations de graines. Chaque clé correspond à
  // l’entrée définie dans seedUpgradeTemplates.
  seedClick: 'Super graine de clic',
  seedClickDesc: 'Augmente la puissance de clic de 1 à chaque achat.',
  seedMulti: 'Graine multiplicatrice',
  seedMultiDesc: 'Augmente la production globale de 50 %.',
  seedAuto: 'Graine auto‑clic',
  seedAutoDesc: 'Débloque un clic automatique supplémentaire chaque seconde.',
  seedUltra: 'Graine ultime',
  seedUltraDesc: 'Double ta production globale.',
  // Traductions pour les nouvelles améliorations de graines (New Game+).  Ces clés
  // complètent le dictionnaire de secours pour que la boutique affiche
  // correctement leurs noms et descriptions lorsque le fichier de langue
  // externe ne peut pas être chargé ou qu'il est partiellement invalide.
  seedDiscount: 'Remise paysanne',
  seedDiscountDesc: 'Réduit le coût de tous les bâtiments de 10 %. Vos courgettes sont sponsorisées par la région.',
  seedPrestigeBoost: 'Boost prestige',
  seedPrestigeBoostDesc: 'Augmente les graines cosmiques gagnées lors de chaque réinitialisation de 50 %.',
  seedLuck: 'Patte porte‑bonheur',
  seedLuckDesc: 'Une petite patte de capybara augmente les chances d’événements aléatoires. +20 % de chance de bonus.',
  seedCapyFriend: 'Ami Capybara',
  seedCapyFriendDesc: 'Un capybara vous aide à récolter. Ajoute 5 clics automatiques par seconde.',
  // Libellé indiquant qu’une amélioration a déjà été achetée
  bought: 'Acheté',
  // Message affiché après l’achat d’une amélioration
  purchasedMsg: 'acheté !',

  // Libellés pour la réinitialisation complète de la partie.  Ces entrées
  // complètent celles du fichier fr.json afin que le menu des options
  // affiche correctement le bouton de remise à zéro et les messages
  // associés lorsque le fichier de langue externe ne peut pas être
  // chargé (par exemple en mode file://).  Voir locales/fr.json pour les
  // variantes traduites et humoristiques.
  optReset: 'Retour à la graine',
  resetConfirm: 'Êtes‑vous sûr de vouloir effacer toute votre progression ? Comme dirait Karadoc, « y\'a pas de honte à repartir de zéro tant qu\'il y a du gras ». Votre empire redeviendra une simple graine.',
  resetDone: 'Tout a été remis à zéro ! Retournez au potager.',

  // Message de confirmation lorsqu'on clique sur l'œil du capybara
  visitPrompt: 'Découvrir d\'autres jeux sur OursMalin.ovh ?',
  // Titre de la page des options
  settingsTitle: 'Options',
};

  /**
   * Load localized news messages from an external JSON file. The JSON
   * structure should be an object whose values are objects keyed by
   * language codes (e.g. { "fr": "...", "en": "..." }). For the
   * currently selected locale, we gather all available messages into an
   * array and assign it to dict.newsMessages. If the locale is not
   * present on a given entry, the French ("fr") translation is used as
   * a fallback, then English ("en"). Errors while fetching or parsing
   * the file are silently ignored, leaving the existing news messages
   * untouched. See news.json for details.
   *
   * @param {string} locale The target locale (e.g. 'fr' or 'en').
   */
  async function loadNewsJSON(locale) {
    try {
      const res = await fetch(NEWS_JSON_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newsData = await res.json();
      // Build the list of messages for the given locale. Fallback to FR, then EN.
      // If the special "capy" locale is requested, try to pull from the
      // "capybara" field present in news.json.  Some news entries use the
      // key "capybara" instead of "capy" to store the absurd capy‑language
      // translation.  See news.json for details.
      const messages = [];
      const targetKey = locale === 'capy' ? 'capybara' : locale;
      for (const key in newsData) {
        if (!Object.prototype.hasOwnProperty.call(newsData, key)) continue;
        const entry = newsData[key];
        // Choose the appropriate translation based on the locale. If the exact
        // requested locale is not found, fall back to French, then English.
        const msg = entry[targetKey] || entry['fr'] || entry['en'];
        if (msg) messages.push(msg);
      }
      // Only override if messages were successfully parsed
      if (messages.length > 0) {
        if (!dict) dict = {};
        dict.newsMessages = messages;
      }
    } catch (err) {
      console.warn('Impossible de charger les nouvelles du capybara à partir de news.json', err);
      // On échec, utiliser les messages intégrés si disponibles pour la langue
      // courante ; sinon retomber sur le dictionnaire de secours français afin
      // d'éviter que le bandeau d'actualité reste dans l'ancienne langue.
      const fallbackMessages =
        (embeddedLocales[locale] && embeddedLocales[locale].newsMessages) ||
        fallbackDict.newsMessages || [];
      if (!dict) dict = {};
      dict.newsMessages = fallbackMessages.slice();
    }
  }

// Embedded locale definitions used when running over the file protocol or when
// fetching JSON files fails. The French locale reuses fallbackDict; the
// English locale contains approximate translations for UI strings. These
// objects mirror the JSON files in the locales/ directory but are embedded
// to avoid CORS/file protocol restrictions.
const embeddedLocales = {
  fr: fallbackDict,
  en: {
    gameTitle: 'Zucchini Clicker',
    score: 'zucchinis harvested',
    perSecond: 'per second',
    buy: 'Buy',
    cost: 'Cost',
    owned: 'Owned',
    production: 'Production',
    notEnough: 'Not enough zucchinis',
    pot: 'Balcony flower pot',
    potDesc: 'Your first zucchini timidly grows in a pot. Each pot permanently increases your harvest per click, but it no longer produces on its own. A little elbow grease never hurts!',
    garden: 'Community garden (CSA)',
    gardenDesc: 'A shared vegetable patch where neighbours grow zucchinis with you. Produces 5 zucchinis per second.',
    grandma: 'Granny Paulette',
    grandmaDesc: 'A gardening expert grandma was bored since Grandpa passed away, she now cultivates zucchinis in her garden. Produces 10 zucchinis per second.',
    farm: 'Family farm',
    farmDesc: 'A small family-run farm dedicated to zucchinis. Produces 50 zucchinis per second.',
    market: "Farmers' market",
    marketDesc: 'A local market where you sell zucchinis, reinvesting profits into production. Produces 100 zucchinis per second.',
    industrialFarm: 'XXL Farm',
    industrialFarmDesc: 'A vast ultramechanised operation: drones, robots and self-guided tractors fuel the insatiable demand for zucchinis. Environmentalists are outraged. Produces 500 zucchinis per second.',
    cannery: 'Ratatouille factory',
    canneryDesc: 'You turn your zucchinis into purées, soups and ratatouilles that sell like hotcakes. Maximum valorisation. Produces 1,000 zucchinis per second.',
    lab: 'CNRS Lab',
    labDesc: 'Researchers at the CNRS tinker with zucchini DNA to create amazing varieties. Even your science teacher is baffled. Produces 5,000 zucchinis per second.',
    temple: 'Cult of Saint Zucchini',
    templeDesc: 'A vegetable cult develops around Saint Zucchini. Devotees in green robes pray day and night. Produces 20,000 zucchinis per second.',
    stockExchange: 'ZUC Stock Exchange',
    stockExchangeDesc: 'The zucchini enters the stock market: young traders in tracksuits push its price on Boursorama while news channels talk about it non-stop. Produces 100,000 zucchinis per second.',
    spaceStation: 'Kourou Zucchini Base',
    spaceStationDesc: 'From the Kourou base in French Guiana you send zucchinis into orbit. In microgravity they grow faster; an astronaut takes the opportunity to have a barbecue. Produces 500,000 zucchinis per second.',
    titan: 'Mont‑Blanc greenhouses',
    titanDesc: 'High-tech greenhouses on the slopes of Mont-Blanc produce giant zucchinis thanks to the alpine air. No need to colonise Saturn! Produces 5,000,000 zucchinis per second.',
    portal: 'Zucchini metaverse',
    portalDesc: 'You launch a metaverse where everyone cultivates virtual zucchinis: their success influences real production. It’s baffling but profitable. Produces 50,000,000 zucchinis per second.',
    ai: 'ChatZucchini algorithm',
    aiDesc: 'A conversational AI optimises every stage of cultivation and chats with teens about the secrets of zucchinis. Production multiplied. Produces 300,000,000 zucchinis per second.',
    singularity: 'Zucchini Big Bang',
    singularityDesc: 'Reality collapses: the entire universe turns into zucchinis. World leaders bow before your empire. Produces 1,000,000,000 zucchinis per second.',
    newsMessages: [
      // Pop‑culture news tailored to a teen TikTok/Twitch audience.  These
      // humorous events reference current trends and well‑known streamers.
      "Drake drops a zucchini‑themed diss track that breaks YouTube.",
      "ZEvent 2025: Kai Cenat and xQc farm zucchinis live for charity!",
      "Squid Game Season 2 has a deadly zucchini challenge – will you survive?",
      "Inside Out 2 inspires a #MoodZucchini trend on TikTok.",
      "Fortnite’s new collab includes the 'Zucchini Knight' skin.",
      "Your cat becomes a ZucchiniTok sensation with 100k followers.",
      "Your high school hosts a 'Saint Zucchini' cosplay contest at Japan Expo."
    ,
    // Additional flavourful news with nods to PixelCanvas, the Night's Watch and cheeky romance
    "On PixelCanvas, Courgette-Chan draws a giant heart for their sweetheart – the canvas swoons.",
    "The Night's Watch vows to guard your zucchinis beyond the Wall, against jealous carrots.",
    "Courgette-Chan cracks a cheeky veggie joke: it’s not the size that counts, it’s the flavour.",
    "A fan hands Courgette-Chan a love letter: the cutest romance since Romeo & Juliet… but with zucchinis."
    ,
    "One morning, Courgette-Chan recites a poem to their beloved zucchini on PixelCanvas; the community sheds a tear.",
    "The Night's Watch bursts into a 'Twinkle, twinkle little zucchini' remix – the mood is electric.",
    // More playful touches: a slow dance, cheeky pixel art and a romantic haiku
    "The Night's Watch slow-dances among zucchinis, a post‑apocalyptic romance.",
    "Courgette-Chan posts a cheeky pixel-art on PixelCanvas and breaks the Internet.",
    "A field of blooming zucchinis inspires a romantic haiku – the Night's Watch applauds."
    ,
    // New Easter‑egg news: the capybara journalist becomes a viral meme on social media.
    // This references the in‑game capybara and imagines its sudden celebrity status.
    "A capybara journalist meme takes over TikTok: everyone wants the reporter hat."
    ],
    ownedUnits: 'Owned: {owned}',
    costUnits: 'Cost: {cost}',
    produces: 'Produces {cps} per second',
    noDesc: 'No description available',
    achClick10: 'First strokes',
    achClick10Desc: 'You have harvested 10 zucchinis!',
    achClick100: 'Square centimetre',
    achClick100Desc: '100 zucchinis harvested. The small producer grows.',
    achClick1000: 'Kilo-courgette',
    achClick1000Desc: '1,000 zucchinis harvested, keep going!',
    achFirstPot: 'Shy sprout',
    achFirstPotDesc: 'Purchase your first flower pot.',
    achTenPots: 'Green thumb',
    achTenPotsDesc: 'Own 10 flower pots.',
    achFirstGrandma: 'First granny recruit',
    achFirstGrandmaDesc: 'Hire your first Granny Paulette.',
    achTenGrandma: 'Army of grannies',
    achTenGrandmaDesc: 'Recruit 10 Granny Paulettes.',

    // Hidden achievements (revealed only when unlocked)
    achSecretCollector: 'Secret collector',
    achSecretCollectorDesc: 'You have harvested 123,456 zucchinis! A strangely satisfying number.',
    achSecretMillion: 'Millionaire of squashes',
    achSecretMillionDesc: 'You exceeded 10 million zucchinis in total. Your passion is now an empire.',
    // Rename to "Shop" to clarify the purpose of the button and overlay
    globalUpgradesTitle: 'Shop',
    upEngrais: 'Viral TikTok fertiliser',
    upEngraisDesc: 'Thanks to a viral TikTok #FertiliserSurvival challenge, young people water your zucchinis while dancing. Growth explodes: global production multiplied by 2.',
    upRatatouille: 'Raclette party',
    upRatatouilleDesc: 'You organise vegan raclette evenings based on zucchinis. Students love it: production is doubled.',
    upRobots: 'Agricultural high school robots',
    upRobotsDesc: 'Students at the agricultural high school build harvesting robots that work tirelessly: production multiplied by 1.5.',
    upSubventions: 'PAC 2025 quotas',
    upSubventionsDesc: 'The Common Agricultural Policy revises its quotas: you benefit from CAP 2025 subsidies. Lower costs, more zucchinis: production multiplied by 1.5.',

    // New global boost translations
    upAbeilles: 'Hyperactive bees',
    upAbeillesDesc: 'Supercharged bees pollinate your flowers faster than a TikTok like. Production is multiplied by 1.5.',
    upHydro: 'Hydroponic greenhouse',
    upHydroDesc: 'You invest in a high‑tech hydroponic greenhouse where zucchinis grow in carefully controlled nutrient solutions. Global production is doubled.',

    // Power click upgrade: humorous name and description in English
    // Defines how the click power upgrade appears when the external locale file can't be loaded.
    upClickPower: 'Zucchini Zap',
    upClickPowerDesc: 'Your fingers electrify zucchinis! Every purchase multiplies your click yield by 5 — a true zucchini zap!',
    upClickPowerCongrats: 'Your fingers crackle with power! Clicks now produce 5× more zucchinis!',
    prestigeBtn: 'Seeds',
    prestigeInfo: 'Cosmic seeds: {seeds}. If you reset now, you will gain {gain} seeds.',
    prestigeConfirm: 'Reset the game to gain {gain} cosmic seeds? This action cannot be undone.',
    easter69: '😏 You just reached 69 zucchinis. Coincidence? I don\'t think so.',
    easter420: '🌿 420 zucchinis! Looks like you rolled a giant ratatouille joint.',
    easter1312: '1312 zucchinis: ACAB – All Courgettes Are Beautiful.',
    easter2025: '🎉 2025 zucchinis! The year of the zucchini queen is just the beginning.',
    optSound: 'Sound',
    optAnim: 'Animations',
    optLang: 'Language',
    optContrast: 'High contrast',
    capybaraAlt: 'Capybara journalist',
    helpTitle: 'How to play?',
    helpText1: 'Click on the zucchini to harvest zucchinis.',
    helpText2: 'Buy buildings to produce automatically.',
    helpText3: 'Global upgrades multiply your production.',
    close: 'Close'
    ,
    // Random events / mini-games messages
    eventHappyHour: 'Happy hour! Your production is doubled for 30 seconds.',
    eventFestival: 'Zucchini festival! Production multiplied by 3 for 15 seconds.',
    eventEnded: 'The event ended, production returns to normal.',
    // New yellow‑vest protest event
    eventManifestation: 'Yellow‑vest protest! Production is halved for 20 seconds.',

    // New random event: zucchini storm. A shower of vegetables rains down on
    // your fields and temporarily supercharges production.
    eventZucchiniStorm: 'Zucchini storm! A shower of veggies supercharges your production for 20 seconds.',

    // Newly added late‑game buildings
    lycee: 'Agricultural high school',
    lyceeDesc: 'An agricultural high school where students study agro‑ecology and practise drawing zucchinis on PixelCanvas. Between classes, budding romances blossom in the greenhouses and the Night\'s Watch stops by to taste your stews. Produces 150 zucchinis per second.',
    reseau: 'Zucchini network',
    reseauDesc: 'A decentralised network of connected farms leverages the blockchain to optimise production. Each node exchanges tips and data in real time. Produces 6,000,000,000 zucchinis per second.',

    // New global upgrade featuring a zucchini influencer
    upInfluence: 'Influencer boost',
    upInfluenceDesc: 'Your zucchini‑themed account goes viral: a million followers, paid partnerships and Twitch streams propel your visibility. Global production is doubled.',

    // Achievements for the new buildings
    achFirstLycee: 'First class of farmers',
    achFirstLyceeDesc: 'Own 1 agricultural high school.',
    achTenLycee: 'School network',
    achTenLyceeDesc: 'Own 10 agricultural high schools.',
    achFirstReseau: 'Connected network',
    achFirstReseauDesc: 'Establish the first node of the zucchini network.',
    achTenReseau: 'Master of networks',
    achTenReseauDesc: 'Own 10 zucchini networks.',

    // Achievements overlay labels
    achievementsBtn: 'Achievements',
    achievementsTitle: 'Achievements',
    achievementsProgress: '{unlocked} achievements unlocked out of {total}',

    // -------------------------------------------------------------------
    // Cosmic seeds shop and settings translations (English)
    seedsTitle: 'Seed shop',
    seedsCount: 'You have {seeds} cosmic seeds.',
    seedClick: 'Click power seed',
    seedClickDesc: 'Increase click power by 1 each purchase.',
    seedMulti: 'Multiplier seed',
    seedMultiDesc: 'Increase global production by 50%.',
    seedAuto: 'Auto-click seed',
    seedAutoDesc: 'Unlock an extra auto click every second.',
    seedUltra: 'Ultimate seed',
    seedUltraDesc: 'Double your global production.',
    // Additional English labels for the new New Game+ seed upgrades.  These
    // entries mirror those found in locales/en.json so that the shop
    // remains fully translated even when the external locale file cannot
    // be loaded (e.g. file:// protocol).  Without these, the shop
    // would display raw keys like "seedDiscount" instead of user‑friendly
    // names and descriptions.
    // Traductions françaises pour la boutique des graines cosmiques et les options.
    seedDiscount: 'Remise du fermier',
    seedDiscountDesc: 'Réduit le coût de tous les bâtiments de 10 %. Tes courgettes sont subventionnées.',
    seedPrestigeBoost: 'Boost de prestige',
    seedPrestigeBoostDesc: 'Augmente les graines cosmiques gagnées à chaque réinitialisation de 50 %.',
    seedLuck: 'Patte de chance',
    seedLuckDesc: 'Une petite patte de capybara augmente la chance d’événements aléatoires. +20 % de bonus.',
    seedCapyFriend: 'Ami capybara',
    seedCapyFriendDesc: 'Un capybara t’aide à récolter. Ajoute 5 auto‑clics par seconde.',
    bought: 'Acheté',
    purchasedMsg: 'acheté !',
    settingsTitle: 'Options',
    // Labels for full game reset.  These mirror the entries in
    // locales/en.json to ensure the reset button and confirmation
    // messages are properly localised even when the external language
    // file cannot be loaded.  Without these, the game would display
    // untranslated keys like "optReset" when run over the file://
    // protocol.
    optReset: 'Réinitialiser la partie',
    resetConfirm: 'Êtes‑vous sûr de vouloir effacer toute votre progression ? Vous redeviendrez une graine de courgette !',
    resetDone: 'Réinitialisation effectuée !',
    // Libellé du bouton qui ouvre la boutique des améliorations globales
    globalBtn: 'Boutique',

    // Message affiché lorsque la boutique des boosts globaux est vide.  Invitez le joueur à revenir plus tard avec humour.
    shopEmpty: "Aucun objet spécial n'est en vente actuellement. Reviens plus tard quand tu seras plus riche.",

    // Message affiché lorsque la boutique des graines n’a pas d’articles disponibles
    seedsEmpty: 'Aucun objet n’est disponible actuellement. Reviens quand tu pourras te les offrir.',

    // Easter egg supplémentaire pour le nombre du diable
    easter666: '👹 666 courgettes : l’ombre du diable plane sur ton jardin…'
  }
};

// Ajout dynamique de langues supplémentaires.  Ces entrées pointent vers
// fallbackDict de manière à réutiliser toutes les traductions françaises par
// défaut lorsque les fichiers JSON correspondants ne sont pas encore
// disponibles.  Grâce à ces affectations, les sélecteurs de langue peuvent
// proposer le russe (ru), le chinois simplifié (zh) et le japonais (ja)
// même lorsque l’application est exécutée via file:// et que les
// requêtes fetch vers locales/ru.json, locales/zh.json ou locales/ja.json
// échouent.  L’anglais n’est plus proposé comme choix aux joueurs.
embeddedLocales.ru = fallbackDict;
embeddedLocales.zh = fallbackDict;
embeddedLocales.ja = fallbackDict;
  // Ajout d’un langage Capybara fictif.  Le fichier locales/capy.json est
  // désormais précaché par le service worker, ce qui permet de récupérer
  // correctement les traductions capybarisées même en mode file://.  On ne
  // définit plus embeddedLocales.capy ici pour éviter de forcer un retour
  // systématique au français lorsque le fetch réussit.  En cas d’échec de
  // fetch (par exemple si le fichier est manquant), loadLocale() tombera
  // automatiquement sur fallbackDict via embeddedLocales[targetLocale] || fallbackDict.

// Load locale JSON; falls back to built-in dictionary on error. Accepts an
// optional locale override. If the game is already initialized, this
// function will apply translations without resetting state.
async function loadLocale(locale) {
  const targetLocale = locale || state.settings.language || DEFAULT_LOCALE;
  currentLocale = targetLocale;
  try {
    // Utiliser le préfixe calculé pour accéder au dossier de traductions
    // correct, que l'on soit sur clicker.html ou sur clicker/index.html.
    const res = await fetch(`${LOCALE_PREFIX}${targetLocale}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    dict = await res.json();
  } catch (err) {
    // If running over file:// or fetch fails, fall back to embedded locale
    console.warn('Impossible de charger le fichier de langue externe, utilisation du dictionnaire intégré ou embarqué. Détail :', err);
    dict = embeddedLocales[targetLocale] || fallbackDict;
  }

  // After loading the base dictionary, attempt to merge in the localized news
  // messages from the external JSON. We await this to ensure that the
  // newsMessages array is available before the game initializes. Failure
  // silently retains whatever newsMessages are already in the dictionary.
  //
  // We explicitly fetch `news.json` here because the news feed contains many
  // more entries than the handful of messages embedded in the locale files.
  // When new translations are added to `news.json` they will automatically
  // appear in the game for the currently selected language.  If the fetch
  // fails (for example when running via the `file://` protocol or offline),
  // the messages already present in the dictionary are left untouched as a
  // fallback.  See loadNewsJSON() for details.
  await loadNewsJSON(targetLocale);
  // If game not initialized yet, start it; otherwise just update the text
  if (!initialized) {
    initGame();
  } else {
    applyTranslations();
  }
}

// Translation helper
//
// We also define fallback texts for daily challenges. If the translation
// file does not contain the keys used for challenges (e.g. 'dailyChallengesTitle',
// 'challengeClicks', 'challengeProduce', 'challengeCompleted'), the game
// will fall back to these hardcoded strings. The structure maps keys to
// per‑locale values. Placeholders such as {target} are replaced in
// renderChallenges() using a small helper.
const CHALLENGE_TEXTS = {
  weeklyChallengesTitle: {
    fr: 'Défis hebdomadaires',
    en: 'Weekly challenges',
    ru: 'Еженедельные задачи',
    zh: '每周挑战',
    ja: '週間チャレンジ',
    // Langue capybaréenne absurde : version délirante du titre des défis hebdomadaires
    capy: 'Weekly capy',
  },
  challengeClicks: {
    fr: 'Clique {target} fois',
    en: 'Click {target} times',
    ru: 'Кликните {target} раз',
    zh: '点击 {target} 次',
    ja: '{target} 回クリック',
    // Version capybarisée : chaque deuxième mot est remplacé par un terme capy
    capy: 'Click {target} capytruc',
  },
  challengeProduce: {
    fr: 'Récolte {target} courgettes',
    en: 'Harvest {target} zucchinis',
    ru: 'Соберите {target} кабачков',
    zh: '收集 {target} 个西葫芦',
    ja: '{target} 個のズッキーニを収穫',
    capy: 'Harvest {target} capyglou',
  },
  challengeSeeds: {
    fr: 'Gagne {target} graines cosmiques',
    en: 'Collect {target} cosmic seeds',
    ru: 'Получите {target} космических семян',
    zh: '获得 {target} 个宇宙种子',
    ja: '{target} 個の宇宙の種を獲得',
    capy: 'Collect {target} capyfoudre seeds',
  },
  challengeCompleted: {
    fr: 'Défi relevé\u00a0!',
    en: 'Challenge complete!',
    ru: 'Задание выполнено\u00a0!',
    zh: '挑战完成！',
    ja: 'チャレンジ完了！',
    capy: 'Challenge bambourlé',
  },
};
function t(key, vars = {}) {
  let str = dict[key] || fallbackDict[key] || key;
  // replace placeholders
  Object.keys(vars).forEach((v) => {
    const re = new RegExp(`{${v}}`, 'g');
    str = str.replace(re, vars[v]);
  });
  return str;
}

// Apply current translations to static elements and re-render dynamic lists.
function applyTranslations() {
  // Update title
  const titleEl = document.getElementById('game-title');
  if (titleEl) titleEl.textContent = t('gameTitle');
  // Update all data-i18n labelled elements
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  // Update elements that store their translation key in data-i18n-alt by
  // refreshing the alt attribute. This is used by images whose descriptive
  // text should change when the locale switches (e.g. option icons).
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    const key = el.getAttribute('data-i18n-alt');
    el.setAttribute('alt', t(key));
  });

  // Update options select language label and current value
  const langSelect = document.getElementById('settings-language');
  if (langSelect) {
    langSelect.value = state.settings.language;
  }

  // Reflect the current language in the root <html> element so that assistive
  // technologies and the browser know which locale is active.
  document.documentElement.setAttribute('lang', state.settings.language);

  // Re-render upgrades and global upgrades to update labels and descriptions
  renderUpgrades();
  renderGlobalUpgrades();
  updateUpgradeButtons();
  updateGlobalUpgradeButtons();
  updatePrestigeInfo();

  // Lorsque la langue change, mettre à jour immédiatement le message d'actualité afin de refléter la nouvelle langue sans attendre la prochaine actualité.
  showRandomMessage();

  // Re-render daily challenges so that their texts update with the new locale.
  renderChallenges();
}

// Format large numbers with suffixes
function formatNumber(num) {
  const suffixes = ['', 'K', 'M', 'Md', 'Bn', 'T', 'P', 'E'];
  let value = num;
  let suffixIndex = 0;
  while (value >= 1000 && suffixIndex < suffixes.length - 1) {
    value /= 1000;
    suffixIndex++;
  }
  // round to 2 decimal max if needed
  const rounded = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${rounded}${suffixes[suffixIndex]}`;
}

// Track whether initialization has already occurred
let initialized = false;

// Audio context for sound effects
let audioCtx;

// Déterminer dynamiquement le chemin vers le dossier audio en se basant sur
// l'emplacement du script courant. Ainsi, les sons fonctionnent aussi bien
// lorsque le jeu est servi depuis la racine que depuis le sous‑dossier
// "/clicker/" où les chemins relatifs diffèrent.
const audioBasePath = (() => {
  const script = document.currentScript;
  if (!script) return 'assets/audio/';
  return new URL('../assets/audio/', script.src).href;
})();

// Preload sound files.  These audio elements point to files in the
// assets/audio/ directory.  If a file is missing or cannot be loaded,
// playback will fail silently.  Background music loops indefinitely
// when sound is enabled.  Additional sounds can be added by extending
// this object and creating corresponding play functions.
const audioFiles = {
  click: new Audio(`${audioBasePath}click.mp3`),
  purchase: new Audio(`${audioBasePath}purchase.mp3`),
  achievement: new Audio(`${audioBasePath}achievement.mp3`),
  // Son joué lors des événements aléatoires (bonus temporaires). Ce fichier doit
  // rester distinct du gémissement de Courgette‑Chan afin de permettre aux
  // utilisateurs de personnaliser facilement chaque effet.
  event: new Audio(`${audioBasePath}event.mp3`),
  // Placeholder de gémissement. Ce fichier est joué après un nombre aléatoire de
  // clics et peut être remplacé par le joueur. Placez votre propre fichier
  // MP3 nommé `moan.mp3` dans le dossier assets/audio pour personnaliser le
  // gémissement de Courgette‑Chan.
  moan: new Audio(`${audioBasePath}moan.mp3`),
  music: new Audio(`${audioBasePath}background_music.mp3`),
};
// Loop the background music if it exists
if (audioFiles.music) {
  audioFiles.music.loop = true;
}

// ---------------------------------------------------------------------------
// Gémissements aléatoires
//
// Pour ajouter un peu de variété sonore et accentuer le caractère kawaii de
// Courgette‑chan, un gémissement est déclenché après un nombre aléatoire de
// clics compris entre 15 et 50.  Deux variables sont utilisées :
//
//  * clicksSinceLastMoan : nombre de clics effectués depuis le dernier
//    gémissement.
//  * nextMoanThreshold : prochain nombre de clics à atteindre pour déclencher
//    un gémissement.  Ce seuil est recalculé aléatoirement après chaque
//    déclenchement.
//
// Ces variables sont déclarées au niveau du module afin de persister entre
// différentes exécutions de la fonction de clic.  Elles sont mises à jour
// dans le gestionnaire de clic de initGame().
let clicksSinceLastMoan = 0;
let nextMoanThreshold = Math.floor(Math.random() * (50 - 15 + 1)) + 15;

/**
 * Play a named sound file.  If sound is disabled in settings or the
 * requested file does not exist, nothing happens.  The currentTime is
 * reset to 0 on each call so that rapid successive sounds start over.
 * Playback is wrapped in a catch to suppress uncaught promise rejections.
 * @param {string} name The key in the audioFiles object
 */
function playSoundFile(name) {
  if (!state.settings.sound) return;
  const audio = audioFiles[name];
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (err) {
    console.warn('Erreur lecture audio', err);
  }
}

/**
 * Assure que la musique de fond est en cours de lecture si le son est activé.
 * Les navigateurs modernes bloquent souvent la lecture automatique de l’audio
 * tant qu’une interaction utilisateur n’a pas eu lieu. Pour contourner cette
 * restriction, cette fonction peut être appelée après un clic ou toute
 * autre interaction afin de démarrer la musique en boucle.  Elle vérifie si
 * la musique existe, si le son est activé et si elle n’est pas déjà en
 * lecture avant d’essayer de la lancer.
 */
function ensureBackgroundMusic() {
  if (!state.settings.sound) return;
  const music = audioFiles.music;
  if (!music) return;
  // Si la musique est en pause ou n’a jamais été lancée, la démarrer
  if (music.paused) {
    try {
      // Revenir au début pour s’assurer que la boucle commence correctement
      music.currentTime = 0;
      music.play().catch(() => {});
    } catch (err) {
      console.warn('Erreur démarrage musique', err);
    }
  }
}

// Initialize game elements
function initGame() {
  // Initialize building state based on templates
  state.buildings = buildingTemplates.map((tmpl) => {
    return {
      key: tmpl.key,
      cps: tmpl.cps,
      cost: tmpl.baseCost,
      owned: 0,
      unlockAt: tmpl.unlockAt || 0,
      // Copie du bonus de puissance de clic, s'il existe
      clickBoost: typeof tmpl.clickBoost === 'number' ? tmpl.clickBoost : 0,
      // Propagation du multiplicateur de coût spécifique si défini pour ce bâtiment
      costMultiplier: typeof tmpl.costMultiplier === 'number' ? tmpl.costMultiplier : undefined,
    };
  });
  // Set translations for static labels
  applyTranslations();

  // Réinitialiser les compteurs de gémissements lors d'un démarrage ou d'un chargement.
  // Sans cela, un gémissement pourrait survenir immédiatement après un chargement si
  // clicksSinceLastMoan avait été laissé à une valeur élevée.  On remet donc
  // le compteur à zéro et on recalcule un seuil aléatoire entre 15 et 50.
  clicksSinceLastMoan = 0;
  nextMoanThreshold = Math.floor(Math.random() * (50 - 15 + 1)) + 15;

  // Charger ou générer les défis quotidiens et rendre l'interface
  loadChallenges();
  renderChallenges();
  // Set clicker event
  const clicker = document.getElementById('clicker');
    clicker.addEventListener('click', (e) => {
      // Compute the amount gained per click (clickPower times global multiplier)
      const clickGain = state.clickPower * state.globalMultiplier;
      // Increment stock and total by the click gain, unless god mode is disabled (god mode bypasses cost but still increments)
      state.score += clickGain;
      state.total += clickGain;
      // Increment click counter
      state.clicks += 1;
      // Mettre à jour la progression des défis de type "clic"
      updateChallengeProgress('click', 1);
      // Trigger random events
      maybeTriggerRandomEvent();
      // Play click sound
      playClickSound();

      // Démarrer la musique de fond si nécessaire.  Cette appel est placé
      // après la première interaction utilisateur afin de contourner les
      // restrictions d’autoplay des navigateurs.
      ensureBackgroundMusic();
      // Le son « event » ne se déclenche plus automatiquement toutes les 20 secondes.
      // À la place, un gémissement (basé sur le même fichier audio) est joué après un
      // nombre aléatoire de clics compris entre 15 et 50.  La logique du gémissement
      // est gérée via deux variables : `clicksSinceLastMoan` et `nextMoanThreshold`.
      // Ces variables sont définies dans la portée englobante et mises à jour ici.
      clicksSinceLastMoan++;
      if (clicksSinceLastMoan >= nextMoanThreshold) {
        // Un gémissement est joué.  Nous utilisons le fichier « moan.mp3 » comme
        // placeholder pour ce son.  Les joueurs peuvent remplacer ce fichier
        // par leur propre gémissement dans le dossier assets/audio.
        playSoundFile('moan');
        // Réinitialiser le compteur et générer un nouveau seuil aléatoire pour le
        // prochain gémissement (entre 15 et 50 clics inclus).
        clicksSinceLastMoan = 0;
        nextMoanThreshold = Math.floor(Math.random() * (50 - 15 + 1)) + 15;
      }
      // Visual feedback: confetti, arm movement and floating number
      if (state.settings.anim) {
        clicker.classList.add('clicked');
        spawnParticle(clickGain);
        animateCourgette();
        // Spawn floating number at click position
        spawnFloatingNumber(e, clickGain);
        setTimeout(() => clicker.classList.remove('clicked'), 100);
      }
      // Update stats and UI
      updateStats();
      updateUpgradeButtons();
      updateGlobalUpgradeButtons();
      // Check achievements and easter eggs
      checkAchievements();
      checkEasterEggs();
      // Save progress
      saveGame();
    });
  // Créer les listes de bâtiments et d'améliorations globales une première fois
  renderUpgrades();
  renderGlobalUpgrades();
  // Charger éventuellement une sauvegarde
  loadSavedGame();
  // Appliquer l'apparence de la Courgette‑Chan en fonction du skin actif et
  // mettre à jour la visibilité du réglage du skin dans le menu options.
  applyCourgetteSkin();
  updateSkinSettingVisibility();
  // Après le chargement, re-render pour prendre en compte les bâtiments déjà possédés et les seuils de déblocage
  renderUpgrades();
  renderGlobalUpgrades();
  // Mettre à jour l'affichage des coûts et des possédés après chargement
  updateUpgradeButtons();
  updateGlobalUpgradeButtons();
  // Start production loop
  setInterval(produce, 1000);
  // Random news messages in console
  setInterval(showRandomMessage, 30000);
  updateStats();
  // Afficher un premier message immédiatement
  showRandomMessage();

  // Mettre à jour l'info de prestige et définir le texte du bouton
  updatePrestigeInfo();
  const prestigeBtn = document.getElementById('prestige-btn');
  if (prestigeBtn) {
    prestigeBtn.addEventListener('click', handlePrestige);
  }

  // S’assurer que les overlays sont masqués au démarrage. Cela évite que l’overlay des boosts
  // globaux reste visible après un rafraîchissement si l’utilisateur l’avait ouvert.
  const globalOverlayInit = document.getElementById('global-upgrades-overlay');
  if (globalOverlayInit) {
    globalOverlayInit.hidden = true;
    globalOverlayInit.style.display = 'none';
  }
  const achOverlayInit = document.getElementById('achievements-overlay');
  if (achOverlayInit) {
    achOverlayInit.hidden = true;
    achOverlayInit.style.display = 'none';
  }

  // -----------------------------------------------------------------------
  // Paramètres et boutiques : configuration des overlays et des boutons
  // Bouton des options (engrenage) : affiche l'overlay des paramètres
  const settingsBtn = document.getElementById('settings-btn');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');
  if (settingsBtn && settingsOverlay) {
    settingsBtn.addEventListener('click', () => {
      // Mettre à jour l'état des cases à cocher et du sélecteur de langue selon les paramètres actuels
      const sSound = document.getElementById('settings-sound');
      const sAnim = document.getElementById('settings-anim');
      const sContrast = document.getElementById('settings-contrast');
      const sLang = document.getElementById('settings-language');
      if (sSound) sSound.checked = !!state.settings.sound;
      if (sAnim) sAnim.checked = !!state.settings.anim;
      if (sContrast) sContrast.checked = !!state.settings.contrast;

      if (sLang) {
        sLang.value = state.settings.language;
        // Mettre à jour la mise en surbrillance des drapeaux en fonction de
        // la langue courante dans les paramètres.  Cela garantit que le
        // drapeau sélectionné est correctement indiqué à chaque ouverture
        // du menu d'options.
        const flagsContainer = document.getElementById('language-flags');
        if (flagsContainer) {
          const buttons = flagsContainer.querySelectorAll('.lang-flag');
          buttons.forEach((btn) => {
            btn.classList.toggle('selected', btn.dataset.lang === state.settings.language);
          });
        }
      }

      // Mettre à jour la visibilité et l'état de la case du skin Aubergine à chaque ouverture
      updateSkinSettingVisibility();
      settingsOverlay.hidden = false;
      settingsOverlay.style.display = 'flex';
    });
  }
  if (settingsClose && settingsOverlay) {
    settingsClose.addEventListener('click', () => {
      settingsOverlay.hidden = true;
      settingsOverlay.style.display = 'none';
    });
  }
  // Bouton de réinitialisation de la partie.  Lorsqu'un joueur clique sur ce
  // bouton dans le menu des paramètres, on affiche une confirmation puis on
  // supprime la sauvegarde et on recharge la page.  Cela remet à zéro
  // complètement la progression tout en conservant les paramètres (sons,
  // animations, langue, contraste).
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const msg = t('resetConfirm');
      const ok = window.confirm(msg);
      if (!ok) return;
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (err) {
        console.warn('Erreur lors de la suppression de la sauvegarde', err);
      }
      // Informer l'utilisateur via la zone de news
      const newsEl = document.getElementById('news-text');
      if (newsEl) {
        newsEl.textContent = t('resetDone');
      }
      // Recharger la page pour appliquer la réinitialisation
      setTimeout(() => {
        location.reload();
      }, 200);
    });
  }
  // Écouteurs de paramètres : mise à jour de state.settings et sauvegarde
  const sSound = document.getElementById('settings-sound');
  if (sSound) {
    sSound.addEventListener('change', () => {
      state.settings.sound = sSound.checked;
      // Activer ou désactiver la musique de fond selon l'option
      if (state.settings.sound) {
        if (audioFiles.music) {
          try {
            audioFiles.music.currentTime = 0;
            audioFiles.music.play().catch(() => {});
          } catch (err) {
            console.warn('Erreur lecture musique', err);
          }
        }
      } else {
        if (audioFiles.music) {
          audioFiles.music.pause();
        }
      }
      saveSettings();
    });
  }
  const sAnim = document.getElementById('settings-anim');
  if (sAnim) {
    sAnim.addEventListener('change', () => {
      state.settings.anim = sAnim.checked;
      saveSettings();
    });
  }
  const sContrast = document.getElementById('settings-contrast');
  if (sContrast) {
    // Appliquer immédiatement le contraste élevé en modifiant la classe du body
    sContrast.addEventListener('change', () => {
      state.settings.contrast = sContrast.checked;
      if (state.settings.contrast) {
        safeAddClass(document.body, 'high-contrast');
      } else {
        safeRemoveClass(document.body, 'high-contrast');
      }
      saveSettings();
    });
  }
  const sLang = document.getElementById('settings-language');
  if (sLang) {
    sLang.addEventListener('change', () => {
      state.settings.language = sLang.value;
      saveSettings();
      // Recharger la langue et appliquer les traductions
      loadLocale(sLang.value);
      // Mettre immédiatement à jour le message d’actualité dans la nouvelle langue
      showRandomMessage();
      // Mettre à jour la sélection visuelle des drapeaux lorsque la valeur change
      const flagsContainer = document.getElementById('language-flags');
      if (flagsContainer) {
        const buttons = flagsContainer.querySelectorAll('.lang-flag');
        buttons.forEach((btn) => {
          btn.classList.toggle('selected', btn.dataset.lang === sLang.value);
        });
      }
    });
  }

  // Gestion des clics sur les drapeaux de langue.  Chaque bouton de drapeau a
  // un attribut data-lang correspondant au code ISO de la langue.  Lorsque
  // l'utilisateur clique dessus, on met à jour le sélecteur caché et on
  // déclenche son événement 'change' pour réutiliser la logique existante.
  const flagsContainer = document.getElementById('language-flags');
  if (flagsContainer && sLang) {
    flagsContainer.addEventListener('click', (ev) => {
      const target = ev.target.closest('.lang-flag');
      if (!target) return;
      const lang = target.getAttribute('data-lang');
      if (!lang) return;
      // Ne rien faire si la langue est déjà sélectionnée
      if (sLang.value === lang) return;
      // Mettre à jour la valeur du select caché
      sLang.value = lang;
      // Déclencher l'événement de changement pour appliquer la langue
      const event = new Event('change');
      sLang.dispatchEvent(event);
    });
    // Initialiser la sélection active lorsque la page est chargée
    const initBtns = flagsContainer.querySelectorAll('.lang-flag');
    initBtns.forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.lang === state.settings.language);
    });
  }
  // Gestion de la boutique des graines : rétablir une boutique distincte. Lorsque le bouton
  // des graines (étoile violette) est cliqué, on affiche l’overlay des graines et on
  // rend les améliorations disponibles. Un clic sur le bouton de fermeture la masque.
  const seedsBtn = document.getElementById('seeds-shop-btn');
  const seedsOverlay = document.getElementById('seeds-overlay');
  const seedsClose = document.getElementById('seeds-close');
  if (seedsBtn && seedsOverlay) {
    seedsBtn.addEventListener('click', () => {
      // Rendre les améliorations de graines et afficher l’overlay
      renderSeedUpgrades();
      seedsOverlay.hidden = false;
      seedsOverlay.style.display = 'flex';
    });
  }
  if (seedsClose && seedsOverlay) {
    seedsClose.addEventListener('click', () => {
      seedsOverlay.hidden = true;
      seedsOverlay.style.display = 'none';
    });
  }
  // Mettre à jour l’affichage du nombre de graines sur le bouton dès l’initialisation
  updateSeedsDisplay();

  // Gestion du réglage du skin Aubergine.  Lorsqu'on change l'état de la case,
  // on active ou désactive le skin immédiatement et on sauvegarde.
  const skinToggle = document.getElementById('settings-skin');
  if (skinToggle) {
    skinToggle.addEventListener('change', () => {
      state.skinAubergineActive = skinToggle.checked;
      applyCourgetteSkin();
      saveGame();
    });
  }
  // Gestion des boutons de la pop-up d'achat du skin Aubergine
  const paypalBtnEl = document.getElementById('paypal-btn');
  if (paypalBtnEl) {
    paypalBtnEl.addEventListener('click', confirmSkinPurchase);
  }
  const cancelSkinBtn = document.getElementById('skin-cancel-btn');
  if (cancelSkinBtn) {
    cancelSkinBtn.addEventListener('click', closeSkinPopup);
  }

  // -----------------------------------------------------------------------
  // Easter egg : mode Dieu (activation via champ de texte)
  // Un champ de texte discret est présent dans le menu options (voir index.html).
  // Lorsque l’utilisateur saisit exactement « dieu est grand », le mode dieu
  // s’active et toutes les améliorations deviennent gratuites.  Saisir
  // « dieu est petit » désactive le mode.  Toute autre chaîne est ignorée.
  const godInput = document.getElementById('god-input');
  if (godInput) {
    const handleGodInput = () => {
      // Conserver la valeur brute afin de détecter des commandes sensibles à la casse
      const raw = godInput.value.trim();
      if (!raw) return;
      // Débloquer le skin Banane lorsque le joueur saisit BANANA en majuscules.
      if (raw === 'BANANA') {
        // Si le skin n'est pas encore déverrouillé, l'activer et annoncer un succès caché.
        if (!state.skinBananeUnlocked) {
          state.skinBananeUnlocked = true;
          state.skinBananeActive = true;
          applyCourgetteSkin();
          updateSkinSettingVisibility();
          // Ajouter l'achievement secret correspondant
          const achDef = achievements.find((a) => a.id === 'secretBanane');
          if (achDef && !state.achievementsUnlocked.includes('secretBanane')) {
            state.achievementsUnlocked.push('secretBanane');
            announceAchievement(achDef);
          }
          saveGame();
          const newsEl = document.getElementById('news-text');
          if (newsEl) {
            newsEl.textContent = t('skinBananaUnlocked');
          }
        }
        godInput.value = '';
        return;
      }
      // Convertir la saisie en minuscules pour toutes les autres commandes
      const value = raw.toLowerCase();
      // Activer ou désactiver le mode Dieu selon la commande saisie
      if (value === 'dieu est grand') {
        if (!state.godMode) {
          state.godMode = true;
          const newsEl = document.getElementById('news-text');
          if (newsEl) {
            newsEl.textContent = '🌟 Mode Dieu activé : toutes les améliorations sont gratuites !';
          }
        }
        godInput.value = '';
        return;
      }
      if (value === 'dieu est petit') {
        if (state.godMode) {
          state.godMode = false;
          const newsEl = document.getElementById('news-text');
          if (newsEl) {
            newsEl.textContent = 'Mode Dieu désactivé.';
          }
        }
        godInput.value = '';
        return;
      }
      // Détection des phrases secrètes pour les succès cachés.  On définit un
      // mapping entre les phrases et l'identifiant de succès correspondant.
      const secretMap = {
        'je suis courgette': 'findSecret',
        'magie courgette': 'secretMagic',
        'aubergine mystique': 'secretAubergine',
      };
      const achId = secretMap[value];
      if (achId) {
        // Marquer la phrase comme découverte
        if (!state.secretUnlocks) state.secretUnlocks = {};
        if (!state.secretUnlocks[achId]) {
          state.secretUnlocks[achId] = true;
          // Chercher la définition d'achievement correspondante
          const achDef2 = achievements.find((a) => a.id === achId);
          if (achDef2) {
            // Ajouter manuellement l'achievement et l'annoncer
            state.achievementsUnlocked.push(achDef2.id);
            announceAchievement(achDef2);
          }
        }
        godInput.value = '';
        return;
      }
      // Si aucune commande n'a été reconnue, ne rien faire mais ne pas
      // effacer le champ afin que le joueur puisse poursuivre la saisie.
    };
    // React on each keystroke and when the field loses focus.  This makes
    // detection robust to quick typing and copy/paste.
    godInput.addEventListener('input', handleGodInput);
    godInput.addEventListener('change', handleGodInput);
  }

  // -----------------------------------------------------------------------
  // Ajout d'un easter egg : cliquer sur l'œil du capybara déclenche une
  // proposition de redirection vers un site externe. On détecte un clic
  // uniquement lorsque l'utilisateur touche approximativement le centre de
  // l’œil droit (vers la droite de la tête). La distance est mesurée en
  // pourcentage de la largeur de l'image pour rester cohérente quel que
  // soit l'écran. Si la condition est remplie, un message de confirmation
  // s'affiche. Si l'utilisateur accepte, le site s'ouvre dans un nouvel onglet.
  // Ajoute un écouteur sur le conteneur du capybara pour détecter un clic
  // et proposer un lien vers d'autres jeux. Plutôt que de calculer
  // précisément l'œil, on déclenche la pop‑up dès que l'utilisateur clique
  // sur la zone du capybara. Cela simplifie l'interaction tout en
  // respectant l'intention de découvrir des jeux supplémentaires.
  const capyHolder = document.querySelector('.capybara-holder');
  if (capyHolder) {
    capyHolder.addEventListener('click', (e) => {
      // Détecter un clic dans la zone centrale (10 % du diamètre) de la tête du capybara.
      const rect = capyHolder.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      // Rayon seuil : 10 % de la largeur (ou de la hauteur) de l’image
      const threshold = Math.min(rect.width, rect.height) * 0.1;
      if (dist <= threshold) {
        const msg = t('visitPrompt');
        if (window.confirm(msg)) {
          // Ouvrir la page d'accueil du site Ours Malin. La version courgette
          // est désormais accessible via /courgette/clicker.html.
          window.open('https://oursmalin.ovh/', '_blank');
        }
      }
    });
  }

  // -----------------------------------------------------------------------
  // Gestion des expressions faciales en fonction de la position de la souris.
  // Lorsque l'utilisateur survole la courgette, on affiche l'expression "open".
  // Lorsqu'il s'approche du centre, on affiche l'expression "half" (yeux plissés).
  // Lorsque la souris quitte la courgette, on revient à l'expression neutre.
  const clickerEl = document.getElementById('clicker');
  const wrapperEl = document.getElementById('courgette-wrapper');
  if (clickerEl && wrapperEl) {
    clickerEl.addEventListener('mouseenter', () => {
      if (!faceLock) showFace('open');
    });
    clickerEl.addEventListener('mouseleave', () => {
      if (!faceLock) showFace('neutral');
    });
    clickerEl.addEventListener('mousemove', (e) => {
      if (faceLock) return;
      const rect = wrapperEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Déterminer le seuil pour passer à l'expression "half" (yeux plissés).
      // Si le curseur est dans un rayon de 25 % de la largeur du wrapper, on considère qu'il
      // est suffisamment proche du centre. Au-delà, la courgette affiche son expression
      // "open" (bouche ouverte) lorsqu'elle perçoit le curseur en approche. Ce seuil réduit
      // la zone pour les yeux plissés afin que l'expression ouverte s'affiche plus tôt.
      // Determine thresholds: a smaller radius triggers the half‑closed eyes, while
      // anything beyond that but within the courgette shows the open mouth. A
      // value of 15 % of the width provides a small centre zone for the
      // half‑expression, so the open expression appears as soon as the cursor
      // moves towards the courgette.
      if (dist < rect.width * 0.15) {
        showFace('half');
      } else {
        showFace('open');
      }
    });
  }



  // Help overlay listeners
  const helpBtn = document.getElementById('help-btn');
  const helpOverlay = document.getElementById('help-overlay');
  const helpClose = document.getElementById('help-close');
  if (helpBtn && helpOverlay) {
    helpBtn.addEventListener('click', () => {
      helpOverlay.hidden = false;
    });
  }
  if (helpClose && helpOverlay) {
    helpClose.addEventListener('click', () => {
      helpOverlay.hidden = true;
    });
  }

  // Achievements overlay listeners
  const achBtn = document.getElementById('achievements-btn');
  const achOverlay = document.getElementById('achievements-overlay');
  const achClose = document.getElementById('achievements-close');
  if (achBtn && achOverlay) {
    achBtn.addEventListener('click', () => {
      // Render the achievements list each time the overlay is opened
      renderAchievementsOverlay();
      achOverlay.hidden = false;
      // Ensure overlay is visible (display flex) when shown
      achOverlay.style.display = 'flex';
    });
  }
  if (achClose && achOverlay) {
    achClose.addEventListener('click', () => {
      achOverlay.hidden = true;
      // Hide overlay by removing display style
      achOverlay.style.display = 'none';
    });
  }

  // Global upgrades overlay listeners
  const globalBtn = document.getElementById('global-upgrades-btn');
  const globalOverlay = document.getElementById('global-upgrades-overlay');
  const globalClose = document.getElementById('global-upgrades-close');
  if (globalBtn && globalOverlay) {
    globalBtn.addEventListener('click', () => {
      // Render the global upgrades list when opening the overlay
      renderGlobalUpgrades();
      globalOverlay.hidden = false;
      globalOverlay.style.display = 'flex';
    });
  }
  if (globalClose && globalOverlay) {
    globalClose.addEventListener('click', () => {
      globalOverlay.hidden = true;
      globalOverlay.style.display = 'none';
    });
  }

  // Démarrer la musique de fond si le son est activé et qu'un fichier est disponible.
  // L'appel est encapsulé dans ensureBackgroundMusic() pour gérer les restrictions
  // d'autoplay : si la lecture est bloquée, elle sera relancée après la première
  // interaction utilisateur.
  ensureBackgroundMusic();

  initialized = true;

  // Service worker registration has been disabled for local development to prevent stale caches.
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.register('sw.js').catch((err) => {
  //     console.warn('ServiceWorker registration failed', err);
  //   });
  // }
}

// Production per tick
function produce() {
  let delta = 0;
  state.buildings.forEach((b) => {
    delta += b.cps * b.owned;
  });
  // Appliquer le multiplicateur global
  delta *= state.globalMultiplier;
  state.score += delta;
  state.total += delta;
  // Mettre à jour la progression des défis de production avec la quantité produite ce tick
  updateChallengeProgress('produce', delta);
  // Traiter les clics automatiques.  Si autoClick est activé, on ajoute une
  // occurrence de clic par seconde.  Certaines améliorations peuvent ajouter
  // plusieurs clics automatiques via autoClickRate.  Chaque clic automatique
  // ajoute la puissance de clic sans appliquer le multiplicateur global afin
  // de ne pas rendre ces améliorations trop puissantes.
  const extraClicks = (state.autoClick ? 1 : 0) + (state.autoClickRate || 0);
  if (extraClicks > 0) {
    const autoGain = state.clickPower * extraClicks;
    state.score += autoGain;
    state.total += autoGain;
    updateChallengeProgress('produce', autoGain);
  }
  updateStats();
  // Vérifier les easter eggs et afficher les messages correspondants
  checkEasterEggs();
  // Re-rendre les listes d'upgrades afin de révéler les nouveaux bâtiments ou
  // améliorations globales lorsque les conditions sont remplies. Cela peut
  // sembler coûteux mais l'empreinte reste faible vu le nombre limité de cartes.
  renderUpgrades();
  renderGlobalUpgrades();
  // Mettre à jour la disponibilité des boutons
  updateUpgradeButtons();
  updateGlobalUpgradeButtons();
  updatePrestigeInfo();
  // Auto-save every tick
  saveGame();
}

// Update scoreboard
function updateStats() {
  // compute per second
  let totalPerSec = 0;
  state.buildings.forEach((b) => {
    totalPerSec += b.cps * b.owned;
  });
  // Appliquer le multiplicateur global aux bâtiments
  totalPerSec *= state.globalMultiplier;
  // Ajouter la production des clics automatiques sans multiplicateur global.  Le
  // nombre de clics automatiques par seconde est déterminé par autoClick
  // (1 clic) et autoClickRate (clics supplémentaires).  Chaque clic génère
  // la puissance de clic brute (pas de multiplicateur).  Cela permet de
  // refléter correctement la production affichée dans la statistique.
  const autoClicks = (state.autoClick ? 1 : 0) + (state.autoClickRate || 0);
  totalPerSec += state.clickPower * autoClicks;
  state.perSecond = totalPerSec;
  // Update current stock displayed prominently.  Always round down to the
  // nearest integer before formatting so that fractional zucchinis are never
  // shown on screen.  This makes the display less confusing when
  // fractional income is generated by multipliers or auto‑clickers.
  const scoreEl = document.getElementById('score');
  if (scoreEl) scoreEl.textContent = formatNumber(Math.floor(state.score));
  // Compute production per minute (courgettes per second * 60) and update
  const perMinVal = state.perSecond * 60;
  const perMinEl = document.getElementById('perMin');
  if (perMinEl) perMinEl.textContent = formatNumber(perMinVal);
  // Compute production per click (clickPower multiplied by global multiplier)
  // Compute production per click (clickPower multiplied by global multiplier).
  // Round to nearest integer to avoid displaying fractional courgettes per click.
  const perClickVal = state.clickPower * state.globalMultiplier;
  const perClickRounded = Math.round(perClickVal);
  const perClickEl = document.getElementById('perClick');
  if (perClickEl) perClickEl.textContent = formatNumber(perClickRounded);
  // Mettre à jour la barre de progression vers le prochain déblocage
  updateProgressBar();
  // Vérifier les achievements après la mise à jour des stats
  checkAchievements();

  // En fin de mise à jour des statistiques, mettre à jour l'état des boutons
  // d'améliorations. Ceci permet de rafraîchir l'affichage des boutons
  // d'achat dès que le score change (par exemple après un clic ou une
  // production automatique) et d'éviter qu'un bouton reste activé alors que
  // le joueur ne peut plus se permettre l'achat. Sans cet appel, les boutons
  // pouvaient sembler de nouveau verts malgré un solde insuffisant car
  // updateUpgradeButtons() n'était invoqué qu'à des moments précis (au
  // rendu initial et après l'achat). De même, on met à jour les boutons
  // d'améliorations globales pour qu'ils reflètent correctement l'état
  // d'accessibilité en fonction des fonds et des conditions de déblocage.
  if (typeof updateUpgradeButtons === 'function') updateUpgradeButtons();
  if (typeof updateGlobalUpgradeButtons === 'function') updateGlobalUpgradeButtons();
}

// -----------------------------------------------------------------------------
// Progress bar handling
//
// Met à jour la barre de progression affichée sous les statistiques. La barre
// représente la progression vers le prochain élément déverrouillable (bâtiment
// ou amélioration). Elle se base sur le score total accumulé.  Si tous les
// éléments sont déjà débloqués, la barre est remplie à 100 %.
function updateProgressBar() {
  const barEl = document.getElementById('progress-bar');
  const labelEl = document.getElementById('progress-label');
  if (!barEl || !labelEl) return;
  // Déterminer le prochain bâtiment déjà débloqué mais pas encore acheté. La barre
  // de progression reflète l'avancée vers l'acquisition de cet élément plutôt que
  // vers le prochain déblocage. On parcourt les bâtiments dans l'ordre et on
  // sélectionne le premier pour lequel le total cumulé dépasse le seuil de
  // déblocage et possédé vaut 0.
  let targetBuilding = null;
  for (let i = 0; i < state.buildings.length; i++) {
    const b = state.buildings[i];
    const tmpl = buildingTemplates[i];
    // Débloqué ?
    const unlockThreshold = tmpl.unlockAt || 0;
    if (state.total >= unlockThreshold && b.owned === 0) {
      targetBuilding = { instance: b, template: tmpl };
      break;
    }
  }
  // Si aucun bâtiment débloqué n'est disponible à l'achat, revenir à l'ancien
  // comportement : progression vers le prochain bâtiment non débloqué.
  if (!targetBuilding) {
    let nextThreshold = Infinity;
    let nextTemplate = null;
    for (const tmpl of buildingTemplates) {
      const threshold = tmpl.unlockAt || 0;
      if (state.total < threshold && threshold > 0) {
        if (threshold < nextThreshold) {
          nextThreshold = threshold;
          nextTemplate = tmpl;
        }
      }
    }
    // Calcul du ratio pour le prochain déblocage
    let ratio = 1;
    if (nextThreshold !== Infinity) {
      ratio = state.total / nextThreshold;
    }
    ratio = Math.max(0, Math.min(1, ratio));
    barEl.style.width = `${(ratio * 100).toFixed(2)}%`;
    if (nextTemplate) {
      const current = Math.min(state.total, nextThreshold);
      const name = t(nextTemplate.key) || nextTemplate.key;
      const formattedCurrent = formatNumber(current);
      const formattedTarget = formatNumber(nextThreshold);
      labelEl.textContent = `${name} : ${formattedCurrent}/${formattedTarget}`;
    } else {
      labelEl.textContent = 'Tous débloqués !';
    }
    return;
  }
  // Calcul du ratio pour le bâtiment ciblé : proportion du stock actuel par
  // rapport à son coût. Bornage à 1 (100 %).
  const currentScore = state.score;
  const cost = targetBuilding.instance.cost;
  let ratio = currentScore / cost;
  ratio = Math.max(0, Math.min(1, ratio));
  barEl.style.width = `${(ratio * 100).toFixed(2)}%`;
  // Mise à jour de l'étiquette : nom et progression
  const name = t(targetBuilding.template.key) || targetBuilding.template.key;
  const formattedCurrent = formatNumber(Math.min(currentScore, cost));
  const formattedTarget = formatNumber(cost);
  labelEl.textContent = `${name} : ${formattedCurrent}/${formattedTarget}`;
}

// -----------------------------------------------------------------------------
// Weekly challenges system
//
// Les défis hebdomadaires remplacent l'ancien système de défis quotidiens.
// Chaque semaine ISO, trois défis sont générés : un défi de clics, un défi
// de production et un défi de graines cosmiques.  Les objectifs sont plus
// élevés que ceux des défis quotidiens afin d'encourager une progression
// sur plusieurs jours.  Les progrès sont conservés dans localStorage sous
// une clé contenant l'identifiant de la semaine (ex : « 2025-W32 »).  Si
// la semaine change, de nouveaux défis sont générés.

/**
 * Retourne une chaîne représentant la date actuelle au format AAAA-MM-JJ.
 * Utilisé comme clé pour vérifier si les défis du jour doivent être
 * régénérés.
 */
function getTodayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retourne une chaîne représentant la semaine ISO courante au format
 * AAAA-Wnn.  Les semaines commencent le lundi et la première semaine de
 * l'année est celle contenant le 4 janvier (selon ISO 8601).  Cette
 * fonction est utilisée pour stocker et charger les défis hebdomadaires.
 */
function getWeekStr() {
  const now = new Date();
  // Convertir la date en UTC pour éviter les effets des fuseaux horaires
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  // Ajuster au jeudi de cette semaine, base du calcul ISO
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.floor(((d - yearStart) / 86400000 + 1) / 7) + 1;
  const weekStr = String(weekNo).padStart(2, '0');
  return `${d.getUTCFullYear()}-W${weekStr}`;
}

/**
 * Charge les défis depuis localStorage.  Si aucun défi n'est enregistré ou
 * si la date enregistrée est différente de la date actuelle, de nouveaux
 * défis sont générés.  Les défis sont stockés dans state.challenges.
 */
function loadChallenges() {
  try {
    const key = 'courgetteChallengesWeekV1';
    const savedStr = localStorage.getItem(key);
    if (savedStr) {
      const saved = JSON.parse(savedStr);
      if (saved && saved.week === getWeekStr() && Array.isArray(saved.challenges)) {
        state.challenges = saved.challenges;
        return;
      }
    }
  } catch (err) {
    console.warn('Erreur chargement défis', err);
  }
  // Générer de nouveaux défis hebdomadaires si aucune sauvegarde valide n'est trouvée
  state.challenges = generateWeeklyChallenges();
  saveChallenges();
}

/**
 * Sauvegarde les défis actuels dans localStorage avec la date du jour.  Les
 * défis sont sérialisés en JSON.  Toute erreur est silencieusement ignorée.
 */
function saveChallenges() {
  try {
    const key = 'courgetteChallengesWeekV1';
    const data = { week: getWeekStr(), challenges: state.challenges };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Erreur sauvegarde défis', err);
  }
}

/**
 * Génère un ensemble de défis quotidiens avec des objectifs réalistes.  Ces
 * objectifs peuvent être ajustés pour équilibrer l'effort requis.  Les
 * récompenses sont exprimées en graines (pour la mécanique de prestige).  On
 * peut ajouter ou supprimer des défis ici pour varier le gameplay.
 */
function generateWeeklyChallenges() {
  // Compute targets based on the current week number to gradually increase
  // difficulty over the year.  The click challenge starts at 200 and grows
  // by 50 per week, the production challenge starts at 2 000 and grows by
  // 500 per week, and the seeds challenge requires a modest number of
  // cosmic seeds.  Rewards for click and produce give extra seeds.
  const weekNo = parseInt(getWeekStr().split('W')[1], 10);
  const clickTarget = 200 + weekNo * 50;
  const produceTarget = 2000 + weekNo * 500;
  const seedsTarget = 3 + Math.floor(weekNo / 4);
  return [
    {
      id: 'weeklyClicks',
      type: 'click',
      target: clickTarget,
      progress: 0,
      reward: { seeds: 2 },
      completed: false,
    },
    {
      id: 'weeklyProduce',
      type: 'produce',
      target: produceTarget,
      progress: 0,
      reward: { seeds: 2 },
      completed: false,
    },
    {
      id: 'weeklySeeds',
      type: 'seeds',
      target: seedsTarget,
      progress: 0,
      reward: {},
      completed: false,
    },
  ];
}

/**
 * Met à jour la progression d'un type de défi.  Pour chaque défi du type
 * correspondant, la progression est augmentée du montant fourni.  Si un
 * défi atteint ou dépasse son objectif, il est marqué comme complété et la
 * récompense est appliquée.  Un message est affiché dans la zone des
 * actualités pour féliciter le joueur.  Après modification, les défis
 * sont sauvegardés et l'interface est rafraîchie.
 * @param {string} type Le type de défi ('click', 'produce' ou 'seeds')
 * @param {number} amount Le nombre d'événements à ajouter (clics, courgettes ou graines)
 */
function updateChallengeProgress(type, amount) {
  if (!state.challenges || state.challenges.length === 0) return;
  let changed = false;
  state.challenges.forEach((ch) => {
    if (!ch.completed && ch.type === type) {
      ch.progress += amount;
      if (ch.progress >= ch.target) {
        ch.progress = ch.target;
        ch.completed = true;
        // Appliquer la récompense (graines) si définie
        const seedsReward = ch.reward && ch.reward.seeds ? ch.reward.seeds : 0;
        if (seedsReward > 0) {
          state.seeds += seedsReward;
          updateSeedsDisplay();
          // Mettre à jour la progression du défi de graines lorsqu'on
          // gagne des graines (par exemple suite à la complétion d'un défi
          // de clics ou de production).  Cela incrémente la progression
          // du défi weeklySeeds sans attribuer de récompense supplémentaire.
          updateChallengeProgress('seeds', seedsReward);
        }
        // Afficher un message de félicitations
        const newsEl = document.getElementById('news-text');
        if (newsEl) {
          // Utiliser la même logique que pour renderChallenges pour gérer un éventuel manque de traduction
          const locale = state.settings.language || currentLocale || DEFAULT_LOCALE;
          // Obtenir la traduction, sinon fallback
          let msg = t('challengeCompleted');
          if (!msg || msg === 'challengeCompleted') {
            msg = (CHALLENGE_TEXTS.challengeCompleted && CHALLENGE_TEXTS.challengeCompleted[locale]) || 'challengeCompleted';
          }
          newsEl.textContent = msg;
        }
        // Jouer un son de réussite
        playAchievementSound();
        changed = true;
      }
    }
  });
  if (changed) {
    saveChallenges();
    renderChallenges();
  } else {
    // Mettre à jour l'affichage des progrès même si aucun défi n'est terminé
    renderChallenges();
  }
}

/**
 * Génère l'interface des défis dans l'élément HTML #challenges.  Chaque défi
 * est représenté par une ligne avec sa description et sa progression.  Les
 * descriptions utilisent les clés de traduction challengeClicks et
 * challengeProduce afin d'être localisées.  Les défis complétés sont
 * affichés avec un style barré.
 */
function renderChallenges() {
  const container = document.getElementById('challenges');
  if (!container) return;
  // Vider le contenu actuel
  container.innerHTML = '';
  if (!state.challenges || state.challenges.length === 0) return;
  // Helper to retrieve challenge text. It attempts to use the translation
  // function first. If no translation is available (the key equals the
  // original key), it falls back to CHALLENGE_TEXTS for the current locale.
  const getChallengeText = (key, vars = {}) => {
    const translated = t(key, vars);
    // If the translated string equals the key itself or is empty, use the fallback
    if (!translated || translated === key) {
      const locale = state.settings.language || currentLocale || DEFAULT_LOCALE;
      let str = CHALLENGE_TEXTS[key] && CHALLENGE_TEXTS[key][locale];
      if (!str) str = key;
      // Replace placeholders
      Object.keys(vars).forEach((v) => {
        const re = new RegExp(`{${v}}`, 'g');
        str = str.replace(re, vars[v]);
      });
      return str;
    }
    return translated;
  };

  // Titre de la section
  const title = document.createElement('h3');
  // Utiliser le libellé hebdomadaire.  Si la traduction n'existe pas,
  // fallback vers le texte codé en dur.
  title.textContent = getChallengeText('weeklyChallengesTitle');
  container.appendChild(title);
  // Chaque défi
  state.challenges.forEach((ch) => {
    const item = document.createElement('div');
    item.className = 'challenge-item';
    if (ch.completed) item.classList.add('challenge-completed');
    // Description localisée
    const desc = document.createElement('span');
    desc.className = 'challenge-desc';
    let descText = '';
    if (ch.type === 'click') {
      descText = getChallengeText('challengeClicks', { target: ch.target });
    } else if (ch.type === 'produce') {
      descText = getChallengeText('challengeProduce', { target: ch.target });
    } else if (ch.type === 'seeds') {
      descText = getChallengeText('challengeSeeds', { target: ch.target });
    } else {
      descText = ch.id;
    }
    desc.textContent = descText;
    item.appendChild(desc);
    // Progression actuelle
    const prog = document.createElement('span');
    prog.className = 'challenge-progress';
    const progressVal = Math.min(ch.progress, ch.target);
    prog.textContent = `${progressVal}/${ch.target}`;
    item.appendChild(prog);
    container.appendChild(item);
  });
}

// Vérifier et débloquer les achievements
function checkAchievements() {
  achievements.forEach((ach) => {
    if (!state.achievementsUnlocked.includes(ach.id) && ach.condition()) {
      state.achievementsUnlocked.push(ach.id);
      announceAchievement(ach);
      // Sauvegarder la progression après un achievement
      saveGame();
    }
  });
}

// Annoncer un achievement via la zone news
function announceAchievement(ach) {
  // Show achievement in the news speech bubble with a medal emoji
  const newsTextEl = document.getElementById('news-text');
  if (newsTextEl) {
    newsTextEl.textContent = `🏅 ${t(ach.nameKey)} : ${t(ach.descKey)}`;
  }
  console.log('Achievement débloqué :', ach.id);
  // Play special sound
  playAchievementSound();
}

// Render the achievements overlay. It builds a list of all achievements,
// marking locked ones with a reduced opacity and displaying progress.
function renderAchievementsOverlay() {
  const listEl = document.getElementById('achievements-list');
  const progressEl = document.getElementById('achievements-progress');
  if (!listEl || !progressEl) return;
  listEl.innerHTML = '';
  let unlockedCount = 0;
  // Clear list and compute progress
  achievements.forEach((ach) => {
    const unlocked = state.achievementsUnlocked.includes(ach.id);
    // Skip hidden achievements entirely until they are unlocked
    if (ach.hidden && !unlocked) {
      return;
    }
    if (unlocked) unlockedCount++;
    const item = document.createElement('div');
    item.className = 'achievement-item' + (unlocked ? '' : ' locked');
    const title = document.createElement('div');
    title.className = 'ach-title';
    title.textContent = t(ach.nameKey);
    const desc = document.createElement('div');
    desc.className = 'ach-desc';
    desc.textContent = t(ach.descKey);
    item.appendChild(title);
    item.appendChild(desc);
    listEl.appendChild(item);
  });
  // Calculate total visible achievements (non-hidden or unlocked)
  const totalAch = achievements.filter((ach) => !ach.hidden || state.achievementsUnlocked.includes(ach.id)).length;
  progressEl.textContent = t('achievementsProgress', { unlocked: unlockedCount, total: totalAch });

  // Update the statistics section with various fun metrics
  const statsEl = document.getElementById('achievements-stats');
  if (statsEl) {
    // Total clicks performed by the player
    const clicks = state.clicks || 0;
    // Time spent playing (since start) in seconds
    const seconds = Math.floor((Date.now() - state.startTime) / 1000);
    // Format time as HH:MM:SS for readability
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const timeStr = [hours, minutes, secs]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
    // Estimate how many real zucchinis could have been planted if the player spent this time farming.
    // We assume 1 courgette could be planted every 10 seconds of real time.
    const realCount = Math.floor(seconds / 10);
    // Assemble lines using translations
    const lines = [];
    lines.push(t('statClicks', { clicks: formatNumber(clicks) }));
    lines.push(t('statTime', { time: timeStr }));
    lines.push(t('statReal', { count: formatNumber(realCount) }));
    // Ajouter des statistiques bonus pour divertir les joueurs.  Les textes
    // font référence à Kaamelott, Astérix/Obélix et OSS 117.  On réutilise
    // le nombre de clics formaté lorsque cela est pertinent.
    lines.push(t('statKaamelott', { clicks: formatNumber(clicks) }));
    lines.push(t('statAsterix'));
    lines.push(t('statOSS', { clicks: formatNumber(clicks) }));
    statsEl.innerHTML = `<strong>${t('statsTitle')}</strong><br>` + lines.join('<br>');
  }
}

// Render the list of upgrades
function renderUpgrades() {
  const container = document.getElementById('upgrades');
  container.innerHTML = '';
  state.buildings.forEach((b, idx) => {
    // Ne pas afficher les bâtiments verrouillés sauf le tout premier. Un bâtiment
    // est visible si l’on possède déjà au moins un exemplaire, si le total de
    // courgettes produites dépasse son seuil de déblocage (unlockAt), ou si
    // l’un des bâtiments deux rangs avant (n‑2) a été acheté. Cela permet de
    // masquer les bâtiments futurs pendant un new game+ tant que le joueur
    // n’a pas suffisamment progressé.
    if (idx !== 0 && b.owned === 0 && state.total < (b.unlockAt || 0) && (idx < 2 || state.buildings[idx - 2].owned === 0)) {
      return;
    }
    const card = document.createElement('div');
    card.className = 'upgrade';
    // Info
    // Icon
    const iconImg = document.createElement('img');
    iconImg.className = 'icon';
    // Utiliser getAssetPath afin de résoudre correctement le chemin quelle que
    // soit la page (ex : clicker/index.html ajoute automatiquement « ../assets/ »)
    iconImg.src = getAssetPath(`icon_${b.key}.png`);
    // Définir un texte alternatif pour l'accessibilité
    iconImg.alt = t(b.key);
    // Info
    const info = document.createElement('div');
    info.className = 'upgrade-info';
    const title = document.createElement('div');
    title.className = 'upgrade-title';
    title.textContent = t(b.key);
    const desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    const descKey = b.key + 'Desc';
    desc.textContent = dict[descKey] || t('noDesc');
    info.appendChild(title);
    info.appendChild(desc);
    // Stats and button
    const stats = document.createElement('div');
    stats.className = 'upgrade-stats';
    const owned = document.createElement('div');
    owned.className = 'owned-count';
    owned.id = `owned-${idx}`;
    owned.textContent = t('ownedUnits', { owned: b.owned });
    const cost = document.createElement('div');
    cost.className = 'cost-count';
    cost.id = `cost-${idx}`;
    cost.textContent = t('costUnits', { cost: formatNumber(b.cost) });
    const btn = document.createElement('button');
    btn.id = `buy-${idx}`;
    btn.textContent = t('buy');
    btn.addEventListener('click', () => buyBuilding(idx));
    stats.appendChild(owned);
    stats.appendChild(cost);
    stats.appendChild(btn);
    card.appendChild(iconImg);
    card.appendChild(info);
    card.appendChild(stats);
    container.appendChild(card);
  });
  updateUpgradeButtons();
}

// Update only costs, owned, and disabled state
function updateUpgradeButtons() {
  state.buildings.forEach((b, idx) => {
    const ownedEl = document.getElementById(`owned-${idx}`);
    const costEl = document.getElementById(`cost-${idx}`);
    const btn = document.getElementById(`buy-${idx}`);
    if (!ownedEl || !costEl || !btn) return;
    ownedEl.textContent = t('ownedUnits', { owned: b.owned });
    // Calculer le prix réel en tenant compte d'une éventuelle réduction des coûts.
    const discount = state.costReduction || 0;
    const realCost = Math.ceil(b.cost * (1 - discount));
    costEl.textContent = t('costUnits', { cost: formatNumber(realCost) });
    // Déterminer si le joueur peut se permettre l'achat. En mode Dieu, les achats
    // restent toujours possibles.
    const cannotAfford = !state.godMode && state.score < realCost;
    btn.disabled = cannotAfford;
    // Ajout d'une classe spécifique afin d'appliquer un style visuel gris lorsque
    // le bouton est inabordable. Cela complète l'attribut disabled, qui peut être
    // surchargé par certains styles (ex. contraste élevé).
    btn.classList.toggle('unaffordable', cannotAfford);
  });
}

// Purchase a building
function buyBuilding(index) {
  const b = state.buildings[index];
  // Déterminer le coût réel en appliquant la réduction le cas échéant.  La
  // réduction ne s'applique pas en mode Dieu (les achats sont gratuits).
  const discount = state.costReduction || 0;
  const realCost = Math.ceil(b.cost * (1 - discount));
  // Si le mode Dieu est activé, ignorer les coûts et autoriser l'achat gratuit
  if (state.godMode || state.score >= realCost) {
    if (!state.godMode) {
      state.score -= realCost;
    }
    b.owned += 1;
    // Augmenter la puissance de clic si le bâtiment confère un bonus spécifique
    if (typeof b.clickBoost === 'number' && b.clickBoost > 0) {
      state.clickPower += b.clickBoost;
    }
    // Augmenter le coût pour le prochain achat (sauf en mode Dieu pour ne pas l'influencer)
    if (!state.godMode) {
      // Appliquer un multiplicateur de coût spécifique au bâtiment si présent,
      // sinon utiliser le multiplicateur global pour tous les bâtiments.
      const mult = typeof b.costMultiplier === 'number' && b.costMultiplier > 0 ? b.costMultiplier : costMultiplier;
      b.cost = Math.ceil(b.cost * mult);
    }
    updateStats();
    updateUpgradeButtons();
    saveGame();
    // Son d'achat
    playSoundFile('purchase');
  }
}

// Show random humorous message in console (could be extended to UI)
function showRandomMessage() {
  if (!dict.newsMessages || dict.newsMessages.length === 0) return;
  const msg = dict.newsMessages[Math.floor(Math.random() * dict.newsMessages.length)];
  // Convert hashtags to spoken style. If the message begins with '#', replace it with
  // a spoken prefix depending on the current language to evoke a street crier. For French
  // we use "Oyez! ", for English "Hear ye! ". Otherwise simply use the message.
  const prefix = currentLocale === 'fr' ? 'Oyez! ' : currentLocale === 'en' ? 'Hear ye! ' : '';
  let spokenMsg = msg;
  if (msg.startsWith('#')) {
    spokenMsg = prefix + msg.slice(1);
  }
  // Display the spoken message in the news bubble and log it
  const newsTextEl = document.getElementById('news-text');
  if (newsTextEl) newsTextEl.textContent = spokenMsg;
  console.log(spokenMsg);
}

// ---------------------------------------------------------------------------
// Gestion du skin Aubergine et de l'offre spéciale

// Appliquer le skin choisi à l'image du corps de Courgette‑Chan.  Si le skin
// Aubergine est activé, le corps utilise l'image courgette_aubergine.png.
// Sinon, on revient à l'image de base courgette_base.png.  Appelée lors du
// chargement de la sauvegarde et quand l'utilisateur bascule l'option dans
// les paramètres.
function applyCourgetteSkin() {
  const bodyImg = document.getElementById('courgette-body');
  if (!bodyImg) return;
  // Ordre de priorité : le skin Banane prime sur Aubergine, sinon on utilise
  // la courgette classique.  Chaque skin résout correctement le chemin quel
  // que soit le contexte (clicker.html ou clicker/index.html).
  if (state.skinBananeActive) {
    bodyImg.setAttribute('src', getAssetPath('courgette_banane.png'));
  } else if (state.skinAubergineActive) {
    bodyImg.setAttribute('src', getAssetPath('courgette_aubergine.png'));
  } else {
    bodyImg.setAttribute('src', getAssetPath('courgette_base.png'));
  }
}

// Mettre à jour la visibilité du réglage du skin dans les options.  Si le
// skin n'est pas débloqué, l'item reste caché.  Sinon, il est affiché et
// la case à cocher reflète l'état actif du skin.  Appelée après le chargement
// de la sauvegarde et après l'achat.
function updateSkinSettingVisibility() {
  const item = document.getElementById('skin-setting');
  if (!item) return;
  // Déterminer les skins disponibles.  Le skin de base est toujours
  // disponible.  On ajoute Aubergine et Banane uniquement s'ils sont
  // débloqués (achat ou secret).  Chaque entrée contient une valeur et
  // l'étiquette à afficher (avec un emoji pour plus de clarté).
  const skins = [];
  skins.push({ value: 'base', label: '🥒 Courgette' });
  if (state.skinAubergineUnlocked) skins.push({ value: 'aubergine', label: '🍆 Aubergine' });
  if (state.skinBananeUnlocked) skins.push({ value: 'banane', label: '🍌 Banane' });
  // Si aucun skin supplémentaire n'est disponible, on cache complètement
  // l'élément de réglage.
  if (skins.length <= 1) {
    item.hidden = true;
    return;
  }
  // Afficher l'élément et construire dynamiquement un sélecteur si nécessaire.
  item.hidden = false;
  // Rechercher un sélecteur existant dans l'élément.  Si absent,
  // supprimer l'ancien contenu (éventuel toggle) et créer un nouveau
  // label + select.
  let select = item.querySelector('select');
  if (!select) {
    // Vider l'élément pour retirer l'ancien interrupteur
    while (item.firstChild) item.removeChild(item.firstChild);
    // Étiquette du paramètre
    const label = document.createElement('span');
    label.setAttribute('data-i18n', 'optSkin');
    label.textContent = t('optSkin');
    item.appendChild(label);
    // Sélecteur des skins
    select = document.createElement('select');
    select.id = 'settings-skin-select';
    item.appendChild(select);
    // Gestionnaire de changement : activer le skin choisi et sauvegarder.
    select.addEventListener('change', () => {
      const val = select.value;
      // Réinitialiser toutes les activations
      state.skinAubergineActive = false;
      state.skinBananeActive = false;
      if (val === 'aubergine') {
        state.skinAubergineActive = true;
      } else if (val === 'banane') {
        state.skinBananeActive = true;
      }
      applyCourgetteSkin();
      saveGame();
    });
  }
  // Mettre à jour les options du sélecteur
  select.innerHTML = '';
  skins.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.value;
    opt.textContent = s.label;
    select.appendChild(opt);
  });
  // Déterminer l'option actuellement sélectionnée
  let selected = 'base';
  if (state.skinBananeActive) selected = 'banane';
  else if (state.skinAubergineActive) selected = 'aubergine';
  select.value = selected;
  // Appliquer les traductions sur l'étiquette pour refléter la langue courante
  applyTranslations();
}

// Ouvrir la pop-up de paiement pour le skin Aubergine.  Cette fonction
// affiche un overlay sombre et propose deux boutons : PayPal et Retour.
// Sur certaines versions du jeu, une variable interne pouvait être modifiée
// accidentellement provoquant l'affichage immédiat de la pop‑up à
// l'ouverture de la page. Pour prévenir tout affichage non désiré,
// on force désormais le masquage de la pop‑up à l'initialisation.
// La pop‑up ne s'affichera ensuite que suite à une interaction utilisateur via
// openSkinPopup().
window.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('skin-popup');
  if (popup) {
    // Le fait de définir l'attribut hidden garantit un affichage masqué.
    // Même si le code HTML initial ne comporte pas l'attribut hidden ou qu'un
    // autre script l'a retiré, cette instruction s'assure qu'à l'initialisation
    // le composant reste invisible tant qu'un utilisateur ne le demande pas.
    popup.setAttribute('hidden', '');
  }
});

function openSkinPopup(ev) {
  // Éviter d'ouvrir automatiquement la pop‑up si la fonction est appelée sans
  // interaction utilisateur. Certains navigateurs peuvent déclencher des
  // appels programmatiques lors du chargement ; dans ce cas on quitte
  // immédiatement pour que l'offre ne s'affiche pas à l'ouverture de la page.
  if (!ev || !ev.isTrusted) return;

  // Certaines pages (comme clicker.html) ne contiennent pas la pop‑up de skin
  // dans leur HTML statique. Si elle est absente, on la génère dynamiquement
  // ici afin d'ouvrir un overlay cohérent pour l'achat du skin Aubergine.
  let popup = document.getElementById('skin-popup');
  if (!popup) {
    // Créer la structure de la pop‑up conformément à clicker/index.html
    popup = document.createElement('div');
    popup.id = 'skin-popup';
    popup.className = 'popup-overlay';
    popup.hidden = true;
    // Contenu de la pop‑up
    const content = document.createElement('div');
    content.className = 'popup-content';
    const title = document.createElement('h3');
    title.setAttribute('data-i18n', 'paypalPopupTitle');
    title.textContent = t('paypalPopupTitle');
    const buttons = document.createElement('div');
    buttons.className = 'popup-buttons';
    // Bouton PayPal (confirm)
    const paypalBtn = document.createElement('button');
    paypalBtn.id = 'paypal-btn';
    paypalBtn.className = 'paypal-btn';
    paypalBtn.setAttribute('data-i18n', 'paypalBtn');
    paypalBtn.textContent = t('paypalBtn');
    paypalBtn.addEventListener('click', confirmSkinPurchase);
    // Bouton Annuler
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'skin-cancel-btn';
    cancelBtn.className = 'cancel-btn';
    cancelBtn.setAttribute('data-i18n', 'cancelBtn');
    cancelBtn.textContent = t('cancelBtn');
    cancelBtn.addEventListener('click', closeSkinPopup);
    buttons.appendChild(paypalBtn);
    buttons.appendChild(cancelBtn);
    content.appendChild(title);
    content.appendChild(buttons);
    popup.appendChild(content);
    // Insérer l'overlay au début du corps afin qu'il ne soit pas dans
    // d'autres conteneurs aux styles spécifiques. Cela garantit que le
    // positionnement fixed couvre l'écran.
    safeAppend(document.body, popup);
    // Appliquer les traductions sur les nouveaux éléments
    applyTranslations();
  }
  // Afficher la pop‑up uniquement si l'action est autorisée
  popup.removeAttribute('hidden');
}

// Fermer la pop-up de paiement sans effectuer d'achat.  Utilisée lorsque
// l'utilisateur clique sur le bouton Retour.
function closeSkinPopup() {
  const popup = document.getElementById('skin-popup');
  if (!popup) return;
  popup.setAttribute('hidden', '');
}

// Confirmer l'achat du skin Aubergine.  Cette fonction simule un paiement
// PayPal : on joue un son de réussite, on débloque le skin et on l'active
// automatiquement.  L'information est sauvegardée et un message est
// affiché dans la bulle d'actualités.  La pop-up est fermée ensuite.
function confirmSkinPurchase() {
  // Débloquer et activer le skin
  state.skinAubergineUnlocked = true;
  state.skinAubergineActive = true;
  applyCourgetteSkin();
  updateSkinSettingVisibility();
  // Jouer un son d'achievement
  playAchievementSound();
  // Afficher un message dans la bulle de news
  const newsEl = document.getElementById('news-text');
  if (newsEl) {
    newsEl.textContent = t('skinPurchased');
  }
  // Fermer la pop-up
  closeSkinPopup();
  // Sauvegarder le jeu
  saveGame();
}

// ---------- Gestion des améliorations globales ----------

// Rendu des améliorations globales
function renderGlobalUpgrades() {
  // Determine container: if an overlay list exists (global‑upgrades‑list), use it; otherwise fall back to legacy
  let container = document.getElementById('global-upgrades-list');
  if (!container) {
    container = document.getElementById('global-upgrades');
  }
  if (!container) return;
  container.innerHTML = '';
  // Initialiser l'état des achats si vide
  if (!Array.isArray(state.globalUpgrades) || state.globalUpgrades.length === 0) {
    state.globalUpgrades = globalUpgradeTemplates.map(() => false);
  }
  globalUpgradeTemplates.forEach((upg, idx) => {
    // Ne créer la carte que si la condition de déblocage est remplie. On n'exclut plus
    // les cartes uniquement parce que le joueur manque de courgettes. Au lieu de
    // masquer complètement l'amélioration, son bouton sera désactivé (et grisé) si
    // le joueur n'a pas assez de ressources.
    const purchased = Array.isArray(state.globalUpgrades) && state.globalUpgrades[idx];
    if (!purchased && !upg.condition()) {
      return;
    }
    // Créer la carte de l'amélioration
    const card = document.createElement('div');
    card.className = 'upgrade';
    // Icône éventuelle
    const iconImg = document.createElement('img');
    iconImg.className = 'icon';
    const iconFile = UPGRADE_ICON_MAP[upg.key];
    if (iconFile) {
      // Résoudre le chemin de l’icône via la fonction helper. Cela évite
      // d’obtenir des images cassées lorsque la page est dans un sous‑dossier.
      iconImg.src = getAssetPath(iconFile);
    } else {
      // Fallback : essayer un fichier du même nom que la clé via le helper.
      iconImg.src = getAssetPath(`icon_${upg.key}.png`);
    }
    // Texte alternatif avec nom de l'amélioration
    iconImg.alt = t(upg.key);
    card.appendChild(iconImg);
    // Info (titre + description)
    const info = document.createElement('div');
    info.className = 'upgrade-info';
    const title = document.createElement('div');
    title.className = 'upgrade-title';
    title.textContent = t(upg.key);
    const desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    const descKey = upg.key + 'Desc';
    desc.textContent = dict[descKey] || t('noDesc');
    info.appendChild(title);
    info.appendChild(desc);
    // Stats & button
    const stats = document.createElement('div');
    stats.className = 'upgrade-stats';
    const cost = document.createElement('div');
    cost.id = `gcost-${idx}`;
    cost.textContent = t('costUnits', { cost: formatNumber(upg.cost) });
    const btn = document.createElement('button');
    btn.id = `gbuy-${idx}`;
    btn.textContent = t('buy');
    btn.addEventListener('click', () => buyGlobalUpgrade(idx));
    stats.appendChild(cost);
    stats.appendChild(btn);
    card.appendChild(info);
    card.appendChild(stats);
    container.appendChild(card);
  });

  // Mettre à jour l'état des boutons pour les boosts globaux classiques
  updateGlobalUpgradeButtons();

  // Si aucune carte n'a été rendue, afficher un message de boutique vide.
  if (container.children.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'shop-empty';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.padding = '20px';
    emptyMsg.textContent = t('shopEmpty');
    container.appendChild(emptyMsg);
  }

  // Afficher la progression (nombre d'améliorations achetées) dans le titre de
  // la boutique.  On récupère l'élément de titre et on y insère le nombre
  // d'améliorations achetées et le total.  Le texte est traduit via
  // shopProgress, qui accepte les tokens {purchased} et {total}.
  const titleEl = document.getElementById('global-upgrades-title');
  if (titleEl) {
    const purchased = Array.isArray(state.globalUpgrades)
      ? state.globalUpgrades.filter((v) => v).length
      : 0;
    const total = globalUpgradeTemplates.length;
    // Préserver le nom de la boutique à partir de la traduction existante puis ajouter
    // la progression entre parenthèses.
    titleEl.textContent = `${t('globalUpgradesTitle')} (${purchased}/${total})`;
  }
}

// -----------------------------------------------------------------------------
// Rendu de la boutique de graines cosmiques. Cette fonction crée les cartes
// d'améliorations disponibles en fonction de l'état des seedsUpgrades et du
// nombre de graines possédées. Elle met également à jour l'affichage du
// nombre de graines dans l'overlay et sur le bouton dans la barre d'options.
function renderSeedUpgrades() {
  const listEl = document.getElementById('seeds-list');
  const countEl = document.getElementById('seeds-count');
  if (!listEl || !countEl) return;
  listEl.innerHTML = '';
  // Afficher le nombre de graines possédées ainsi que le nombre d'améliorations
  // achetées par rapport au total.  La chaîne shopProgress est traduite
  // dynamiquement.  Par exemple : "Vous avez 10 graines — Améliorations :
  // 2/8".
  const purchased = Array.isArray(state.seedsUpgrades)
    ? state.seedsUpgrades.filter((v) => v).length
    : 0;
  const total = seedUpgradeTemplates.length;
  const progressStr = t('shopProgress', { purchased: purchased, total: total });
  countEl.textContent = `${t('seedsCount', { seeds: state.seeds })} — ${progressStr}`;

  // Mettre à jour le titre de l'overlay avec la progression des améliorations achetées.
  const titleEl = document.querySelector('#seeds-overlay h2');
  if (titleEl) {
    titleEl.textContent = `${t('seedsTitle')} (${purchased}/${total})`;
  }
  // Initialiser le tableau des achats si nécessaire
  if (!Array.isArray(state.seedsUpgrades) || state.seedsUpgrades.length === 0) {
    state.seedsUpgrades = seedUpgradeTemplates.map(() => false);
  }
  seedUpgradeTemplates.forEach((upg, idx) => {
    const purchased = state.seedsUpgrades[idx];
    // Ne pas afficher si déjà acheté et sans effet récurrent
    // Ici, les améliorations restent visibles mais désactivées.
    const item = document.createElement('div');
    item.className = 'seeds-item';
    if (purchased) item.classList.add('locked');
    // Info container
    const info = document.createElement('div');
    info.style.flex = '1';
    const title = document.createElement('div');
    title.className = 'seed-title';
    title.textContent = t(upg.key);
    const desc = document.createElement('div');
    desc.className = 'seed-desc';
    desc.textContent = t(upg.key + 'Desc');
    info.appendChild(title);
    info.appendChild(desc);
    // Cost
    const costEl = document.createElement('div');
    costEl.className = 'seed-cost';
    costEl.textContent = `${upg.cost} ✨`;
    // Button
    const btn = document.createElement('button');
    btn.textContent = purchased ? t('bought') : t('buy');
    const cannotAfford = !state.godMode && state.seeds < upg.cost;
    btn.disabled = purchased || cannotAfford;
    btn.classList.toggle('unaffordable', !purchased && cannotAfford);
    btn.addEventListener('click', () => buySeedUpgrade(idx));
    item.appendChild(info);
    item.appendChild(costEl);
    item.appendChild(btn);
    listEl.appendChild(item);
  });

  // ---------------------------------------------------------------------
  // Ajout d'une offre spéciale pour le skin Aubergine.  Cette carte
  // s'affiche sous les améliorations de graines tant que le skin n'a pas été
  // acheté. Elle comporte un bouton qui ouvre une pop-up pour simuler
  // l'achat. Si le skin est déjà débloqué, la carte n'est pas affichée.
  const seedsContent = document.querySelector('#seeds-overlay .seeds-content');
  if (seedsContent) {
    // Retirer la carte existante si elle a été générée lors d'un rendu précédent.
    const existing = document.getElementById('special-offer-js');
    if (existing) existing.remove();
    if (!state.skinAubergineUnlocked) {
      const card = document.createElement('div');
      card.id = 'special-offer-js';
      card.className = 'special-offer-card';
      const h3 = document.createElement('h3');
      h3.setAttribute('data-i18n', 'specialOfferTitle');
      h3.textContent = t('specialOfferTitle');
      const img = document.createElement('img');
      // Utiliser getAssetPath pour que l’aperçu du skin Aubergine se charge
      // correctement aussi bien depuis clicker.html que depuis clicker/index.html.
      img.setAttribute('src', getAssetPath('courgette_aubergine.png'));
      img.setAttribute('alt', 'Aubergine skin');
      const p = document.createElement('p');
      const span = document.createElement('span');
      span.setAttribute('data-i18n', 'specialOfferAubergine');
      span.textContent = t('specialOfferAubergine');
      const strong = document.createElement('strong');
      strong.setAttribute('data-i18n', 'specialOfferPrice');
      strong.textContent = t('specialOfferPrice');
      p.appendChild(span);
      p.appendChild(document.createTextNode(' — '));
      p.appendChild(strong);
      // Bouton d'achat
      const btn = document.createElement('button');
      btn.className = 'special-buy-btn';
      btn.setAttribute('data-i18n', 'buySkinBtn');
      btn.textContent = t('buySkinBtn');
      btn.addEventListener('click', openSkinPopup);
      card.appendChild(h3);
      card.appendChild(img);
      card.appendChild(p);
      card.appendChild(btn);
      // Insérer la carte juste avant le bouton de fermeture pour qu'elle soit
      // visible en bas de l'overlay, après la liste des améliorations.
      const closeBtn = document.getElementById('seeds-close');
      if (closeBtn) {
        seedsContent.insertBefore(card, closeBtn);
      } else {
        seedsContent.appendChild(card);
      }
      applyTranslations();
    }
    // Insérer une carte pour le skin Banane.  Cette carte indique que le
    // contenu est à venir (SOON) et n’est pas cliquable.  Elle apparaît
    // uniquement si le skin Banane n’a pas encore été débloqué par le
    // joueur. On retire toute carte précédente identifiée par banane-offer-js
    // avant de créer une nouvelle instance.
    {
      const existingBan = document.getElementById('banane-offer-js');
      if (existingBan) existingBan.remove();
      if (!state.skinBananeUnlocked) {
        const bCard = document.createElement('div');
        bCard.id = 'banane-offer-js';
        bCard.className = 'special-offer-card banana-offer';
        const bH3 = document.createElement('h3');
        bH3.setAttribute('data-i18n', 'specialOfferTitle');
        bH3.textContent = t('specialOfferTitle');
        const bImg = document.createElement('img');
        bImg.setAttribute('src', getAssetPath('courgette_banane.png'));
        bImg.setAttribute('alt', 'Banane skin');
        const pBan = document.createElement('p');
        const spanBan = document.createElement('span');
        spanBan.setAttribute('data-i18n', 'specialOfferBanane');
        spanBan.textContent = t('specialOfferBanane');
        const strongBan = document.createElement('strong');
        strongBan.setAttribute('data-i18n', 'specialOfferBananePrice');
        strongBan.textContent = t('specialOfferBananePrice');
        pBan.appendChild(spanBan);
        pBan.appendChild(document.createTextNode(' — '));
        pBan.appendChild(strongBan);
        bCard.appendChild(bH3);
        bCard.appendChild(bImg);
        bCard.appendChild(pBan);
        // Bandeau SOON non cliquable
        const overlay = document.createElement('div');
        overlay.className = 'soon-banner';
        overlay.textContent = 'SOON';
        bCard.appendChild(overlay);
        // Insérer la carte avant le bouton de fermeture pour qu'elle apparaisse
        // en bas de l'overlay, après la liste des améliorations.
        const closeBtn2 = document.getElementById('seeds-close');
        if (closeBtn2) {
          seedsContent.insertBefore(bCard, closeBtn2);
        } else {
          seedsContent.appendChild(bCard);
        }
        applyTranslations();
      }
    }
  }
  // Display a message if no seed upgrades are available (all purchased or unavailable)
  const emptyMsgEl = document.getElementById('seeds-empty-msg');
  if (emptyMsgEl) {
    if (listEl.children.length === 0) {
      emptyMsgEl.textContent = t('seedsEmpty');
      emptyMsgEl.hidden = false;
    } else {
      emptyMsgEl.hidden = true;
    }
  }
  updateSeedsDisplay();
}

// Achète une amélioration de graines cosmique si le joueur possède assez de graines.
function buySeedUpgrade(idx) {
  const upg = seedUpgradeTemplates[idx];
  if (!upg) return;
  // initialiser le tableau si nécessaire
  if (!Array.isArray(state.seedsUpgrades) || state.seedsUpgrades.length === 0) {
    state.seedsUpgrades = seedUpgradeTemplates.map(() => false);
  }
  const purchased = state.seedsUpgrades[idx];
  if (purchased) return;
  // Vérifier les ressources en graines, sauf en mode Dieu
  if (!state.godMode && state.seeds < upg.cost) return;
  // Payer uniquement si le mode Dieu n'est pas actif
  if (!state.godMode) {
    state.seeds -= upg.cost;
  }
  state.seedsUpgrades[idx] = true;
  // Appliquer l'effet de l'amélioration
  upg.effect();
  // Mettre à jour la production en cas de changement de multiplicateur ou de clickPower
  updateStats();
  updatePrestigeInfo();
  updateSeedsDisplay();
  saveGame();
  // Réafficher la boutique
  renderSeedUpgrades();
  // Afficher un message de news pour informer l'achat
  const newsEl = document.getElementById('news-text');
  if (newsEl) {
    newsEl.textContent = `${t(upg.key)} ${t('purchasedMsg')}`;
  }
}

// Met à jour l'affichage du nombre de graines dans le bouton de la boutique
function updateSeedsDisplay() {
  const btnAmount = document.getElementById('seeds-amount');
  if (btnAmount) {
    btnAmount.textContent = state.seeds;
  }
}

// Mettre à jour l'état (disabled, coût) des boutons d'améliorations globales
function updateGlobalUpgradeButtons() {
  globalUpgradeTemplates.forEach((upg, idx) => {
    const btn = document.getElementById(`gbuy-${idx}`);
    const costEl = document.getElementById(`gcost-${idx}`);
    if (!btn || !costEl) return;
    // Mise à jour du coût (pas dynamique pour l'instant)
    costEl.textContent = t('costUnits', { cost: formatNumber(upg.cost) });
    const purchased = state.globalUpgrades[idx];
    const insufficient = !state.godMode && state.score < upg.cost;
    const locked = !upg.condition();
    if (purchased) {
      btn.disabled = true;
      btn.textContent = '✔';
      btn.classList.remove('unaffordable');
    } else {
      btn.disabled = insufficient || locked;
      btn.textContent = t('buy');
      // Gray out the button when the player lacks funds.
      btn.classList.toggle('unaffordable', insufficient);
    }
  });
}

// Acheter une amélioration globale
function buyGlobalUpgrade(index) {
  const upg = globalUpgradeTemplates[index];
  if (!upg) return;
  // Vérifier les ressources et l'état
  if (state.globalUpgrades[index] || (!state.godMode && (state.score < upg.cost)) || !upg.condition()) return;
  // Déduire le coût uniquement si le mode Dieu n'est pas actif
  if (!state.godMode) {
    state.score -= upg.cost;
  }
  // Appliquer le multiplicateur de production
  state.globalMultiplier *= upg.factor;
  // Appliquer le bonus de puissance de clic. Certaines améliorations multiplient
  // la puissance de clic plutôt que de l’additionner. Pour la mise à jour
  // Tapotage Turbo/Zucchini Zap, utilise clickMultiplier pour multiplier le
  // clic, sinon applique un bonus additif via clickBoost si défini.
  if (typeof upg.clickMultiplier === 'number' && upg.clickMultiplier > 1) {
    state.clickPower *= upg.clickMultiplier;
  } else if (typeof upg.clickBoost === 'number' && upg.clickBoost > 0) {
    state.clickPower += upg.clickBoost;
  }
  // Marquer comme achetée
  state.globalUpgrades[index] = true;
  // Mettre à jour les stats et l'affichage
  updateStats();
  updateGlobalUpgradeButtons();
  // Sauvegarder la partie
  saveGame();
  // Annoncer l'achat via la news sans supprimer le capybara.  On met à jour
  // uniquement le texte de l'élément news-text. Pour l'amélioration de
  // puissance de clic, on affiche un message distinct afin d'éviter une
  // répétition.
  const newsTextEl = document.getElementById('news-text');
  if (newsTextEl) {
    if (upg.key !== 'upClickPower') {
      // Utiliser un libellé de confirmation traduit si disponible, sinon un fallback
      const suffix = t('purchasedMsg') || 'obtenu\u00a0!';
      newsTextEl.textContent = `${t(upg.key)} ${suffix}`;
    } else {
      newsTextEl.textContent = t('upClickPowerCongrats') || '';
    }
  }
  console.log(`Amélioration globale achetée : ${upg.key}`);
  // Son d'achat
  playSoundFile('purchase');
}

// ---------- Gestion du prestige ----------

// Calculer le gain potentiel de prestige en fonction du total produit
function calculatePrestigeGain() {
  // Utiliser un calcul de racine carrée pour une progression douce
  // Ajuster le gain selon le bonus de prestige (ex: +50 % par amélioration).  La
  // formule de base utilise la racine carrée pour adoucir la progression.  Le
  // multiplicateur (1 + prestigeBonus) augmente le nombre de graines obtenues.
  const base = Math.sqrt(state.total / 1000000);
  const multiplier = 1 + (state.prestigeBonus || 0);
  const gain = Math.floor(base * multiplier);
  return gain;
}

// Mettre à jour l'affichage des informations de prestige et l'état du bouton
function updatePrestigeInfo() {
  const infoEl = document.getElementById('prestige-info');
  const btn = document.getElementById('prestige-btn');
  if (!infoEl || !btn) return;
  const gain = calculatePrestigeGain();
  infoEl.textContent = t('prestigeInfo', { seeds: state.seeds, gain: gain });
  // Activer le bouton uniquement si le gain est au moins 1
  btn.disabled = gain < 1;
}

// Gestion du clic sur le bouton de prestige
function handlePrestige() {
  const gain = calculatePrestigeGain();
  if (gain < 1) return;
  // Message de confirmation
  const confirmMsg = t('prestigeConfirm', { gain: gain });
  const ok = window.confirm(confirmMsg);
  if (!ok) return;
  // Déclencher une animation de prestige sur tout l'écran
  showPrestigeAnimation();
  // Accorder les graines
  state.seeds += gain;
  // Mettre à jour le défi de graines hebdomadaire avec le nombre de graines
  // gagnées lors de ce prestige.  Aucun risque de récursion car la
  // récompense de ce défi ne contient pas de graines.
  updateChallengeProgress('seeds', gain);
  // Réinitialiser score, total et bâtiments
  state.score = 0;
  state.total = 0;
  // Réinitialiser la puissance de clic à sa valeur de base. Sans cela,
  // la puissance resterait indexée sur la valeur avant prestige, ce qui
  // provoquerait une accumulation indésirable d'avantages. Les améliorations
  // permanentes (semences cosmiques) n'influencent pas la puissance de clic.
  state.clickPower = 1;
  // Réinitialiser les bâtiments
  state.buildings = buildingTemplates.map((tmpl) => {
    return {
      key: tmpl.key,
      cps: tmpl.cps,
      cost: tmpl.baseCost,
      owned: 0,
    };
  });
  // Réinitialiser les améliorations globales
  state.globalUpgrades = globalUpgradeTemplates.map(() => false);
  // Recalculer le multiplicateur global à partir des seeds
  state.globalMultiplier = 1 + state.seeds * 0.1;

  // Après une réinitialisation, réappliquer toutes les améliorations de graines
  // déjà achetées.  Sans cela, leurs effets (bonus de multiplicateur, clics
  // automatiques, réductions de coûts, etc.) seraient perdus.  Chaque entrée
  // de seedsUpgrades correspond à un modèle dans seedUpgradeTemplates.  On
  // appelle son effet si elle a été achetée (true).  Note : les effets
  // s'additionnent et sont conçus pour être appliqués plusieurs fois si
  // l'amélioration a été achetée plusieurs fois.
  if (Array.isArray(state.seedsUpgrades)) {
    seedUpgradeTemplates.forEach((upg, idx) => {
      if (state.seedsUpgrades[idx]) {
        // Appeler l'effet.  Les effets mettent à jour clickPower, globalMultiplier,
        // autoClick, autoClickRate, costReduction, prestigeBonus et eventBonus.
        if (typeof upg.effect === 'function') {
          upg.effect();
        }
      }
    });
  }
  // Réafficher
  renderUpgrades();
  renderGlobalUpgrades();
  updateStats();
  updateUpgradeButtons();
  updateGlobalUpgradeButtons();
  updatePrestigeInfo();
  saveGame();
  // Annoncer le prestige via la bulle d'actualité sans supprimer le capybara.
  const newsTextEl = document.getElementById('news-text');
  if (newsTextEl) {
    newsTextEl.textContent = `✨ Prestige ! Vous avez gagné ${gain} graines cosmiques.`;
  }
  console.log(`Prestige effectué : +${gain} graines cosmiques, total now ${state.seeds}`);
}

// Save the current state to localStorage
function saveGame() {
  try {
    const saveObj = {
      score: state.score,
      total: state.total,
      buildings: state.buildings.map((b) => ({ owned: b.owned, cost: b.cost })),
      seeds: state.seeds,
      clickPower: state.clickPower,
      achievementsUnlocked: state.achievementsUnlocked,
      globalUpgrades: state.globalUpgrades,
      // Enregistrer l'état des améliorations de graines cosmiques afin de ne pas les perdre après un rechargement
      seedsUpgrades: state.seedsUpgrades,
      easterEggs: state.easterEggs,
      // Timestamp for offline progress
      lastTime: Date.now(),
      // Version 2 du format de sauvegarde.  Incrémenter ce nombre permet de
      // invalider les anciennes sauvegardes et d'éviter de charger des formats
      // incompatibles.
      version: 2,
      // Sauvegarde des nouvelles propriétés pour la mécanique New Game+
      autoClick: state.autoClick,
      autoClickRate: state.autoClickRate,
      costReduction: state.costReduction,
      prestigeBonus: state.prestigeBonus,
      eventBonus: state.eventBonus,

      // Sauvegarder l'état des phrases secrètes.  Cela évite de perdre
      // l'avancement des succès secrets lorsque le joueur recharge la page.
      secretUnlocks: state.secretUnlocks,

      // Sauvegarder l'état des skins.  skinAubergineUnlocked indique si l'offre
      // spéciale a été achetée et skinAubergineActive indique si le skin est
      // actuellement actif.  skinBananeUnlocked est débloqué via un code secret
      // et skinBananeActive permet de basculer sur ce skin.
      skinAubergineUnlocked: state.skinAubergineUnlocked,
      skinAubergineActive: state.skinAubergineActive,
      skinBananeUnlocked: state.skinBananeUnlocked,
      skinBananeActive: state.skinBananeActive,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveObj));
    // Save settings separately
    localStorage.setItem('courgetteClickerSettingsV1', JSON.stringify(state.settings));
  } catch (err) {
    console.warn('Impossible de sauvegarder la partie', err);
  }
}

// Load saved state if available
function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const save = JSON.parse(raw);
    // Ne charger que les sauvegardes de version 2.  Les versions précédentes
    // sont ignorées afin de réinitialiser complètement la progression pour la
    // nouvelle version du jeu.
    if (save.version !== 2) return;
    // restore values
    state.score = save.score || 0;
    state.total = save.total || 0;
    state.seeds = save.seeds || 0;
    // Restaurer la liste des améliorations de graines achetées. Si absente, initialiser à vide.
    if (Array.isArray(save.seedsUpgrades)) {
      // Adapter la longueur du tableau au nombre actuel d'améliorations
      state.seedsUpgrades = seedUpgradeTemplates.map((_, i) => {
        return !!save.seedsUpgrades[i];
      });
    } else {
      state.seedsUpgrades = seedUpgradeTemplates.map(() => false);
    }
    state.clickPower = save.clickPower || 1;
    state.achievementsUnlocked = Array.isArray(save.achievementsUnlocked)
      ? save.achievementsUnlocked.slice()
      : [];
    // Restaurer les easter eggs déclenchés
    state.easterEggs = save.easterEggs || {};
    // Restore purchased global upgrades
    if (Array.isArray(save.globalUpgrades)) {
      // Adapter la longueur au nombre actuel d'améliorations globales.  Les nouvelles
      // améliorations seront considérées comme non achetées.
      state.globalUpgrades = globalUpgradeTemplates.map((_, i) => {
        return !!save.globalUpgrades[i];
      });
      // Recalculer le multiplicateur global en fonction des améliorations déjà achetées
      state.globalMultiplier = 1 + state.seeds * 0.1;
      globalUpgradeTemplates.forEach((upg, idx) => {
        if (state.globalUpgrades[idx]) {
          state.globalMultiplier *= upg.factor;
        }
      });
    }
    if (Array.isArray(save.buildings)) {
      save.buildings.forEach((sav, idx) => {
        if (state.buildings[idx]) {
          state.buildings[idx].owned = sav.owned || 0;
          state.buildings[idx].cost = sav.cost || state.buildings[idx].cost;
        }
      });
    }

    // Restaurer les nouvelles propriétés de la mécanique New Game+.  Si elles
    // ne sont pas définies dans la sauvegarde, conserver leur valeur par défaut.
    state.autoClick = !!save.autoClick;
    state.autoClickRate = save.autoClickRate || 0;
    state.costReduction = save.costReduction || 0;
    state.prestigeBonus = save.prestigeBonus || 0;
    state.eventBonus = save.eventBonus || 0;

    // Restaurer les phrases secrètes déjà saisies.  Si aucune sauvegarde n'est
    // présente, laisser l'objet vide.  Cela permet de persister le déblocage des
    // succès secrets sur plusieurs sessions.
    state.secretUnlocks = save.secretUnlocks || {};

    // Restaurer l'état du skin Aubergine.  Par défaut, il est verrouillé et
    // désactivé.  Si la sauvegarde contient ces propriétés, on les applique.
    state.skinAubergineUnlocked = !!save.skinAubergineUnlocked;
    state.skinAubergineActive = !!save.skinAubergineActive;
    // Restaurer l'état du skin Banane.  Ces propriétés sont absentes sur
    // d'anciennes sauvegardes ; on applique la valeur par défaut (false).
    state.skinBananeUnlocked = !!save.skinBananeUnlocked;
    state.skinBananeActive = !!save.skinBananeActive;

    // Restore settings from separate key if available
    const savedSettings = localStorage.getItem('courgetteClickerSettingsV1');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        state.settings = Object.assign({}, state.settings, parsed);
      } catch (err) {
        console.warn('Impossible de charger les paramètres utilisateur', err);
      }
    }

    // Appliquer le mode sombre (contraste élevé) immédiatement après avoir restauré les paramètres.
    // Si l'utilisateur avait activé le contraste élevé lors de la dernière session,
    // on ajoute la classe correspondante au body afin que le mode soit actif
    // dès le chargement. Inversement, si le mode n'était pas activé, on veille
    // à retirer la classe pour éviter un état incohérent entre le bouton et l'affichage.
    if (state.settings.contrast) {
      safeAddClass(document.body, 'high-contrast');
    } else {
      safeRemoveClass(document.body, 'high-contrast');
    }

    // Offline progress: compute production since last session (max 24h)
    if (save.lastTime) {
      const now = Date.now();
      const diff = now - save.lastTime;
      const maxMs = 24 * 60 * 60 * 1000; // 24 hours
      const effectiveDiff = Math.min(diff, maxMs);
      // compute per second based on buildings and global upgrades
      let perSec = 0;
      state.buildings.forEach((b) => {
        perSec += b.cps * b.owned;
      });
      perSec *= state.globalMultiplier;
      const offlineGain = perSec * (effectiveDiff / 1000);
      if (offlineGain > 0) {
        state.score += offlineGain;
        state.total += offlineGain;
      }
    }

    // Apply loaded language if different from default
    if (state.settings.language && state.settings.language !== currentLocale) {
      loadLocale(state.settings.language);
    }
  } catch (err) {
    console.warn('Impossible de charger la sauvegarde', err);
  }
}

// Start the locale loading
loadLocale();

