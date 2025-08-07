# Suivi d’avancement

## 05 août 2025

Début du projet **Courgette Clicker**. Mise en place de l’arborescence initiale :

- Création des répertoires `js`, `css`, `locales`, `logs`, `context`, `agents`, `tree`.
- Ajout d’une page HTML de base (`index.html`) avec une structure centrale comprenant le compteur, le bouton de clic (emoji 🍆) et une liste d’achats.
- Implémentation d’une feuille de styles CSS simple (`css/style_v2.css`) pour un affichage agréable : centrage, boutons stylés, cartes d’upgrades.
- Mise en place d’un système de localisation : création du fichier `locales/fr.json` contenant toutes les chaînes de l’interface, des noms et descriptions des bâtiments, ainsi qu’une série de messages humoristiques.
- Écriture du script principal `js/main.js` : chargement du fichier de langue, initialisation de l’état du jeu, boucle de production, formatage des nombres, affichage et mise à jour dynamique des bâtiments et de leurs coûts, gestion du clic, affichage de messages aléatoires.
- Ajout de fichiers de contexte et de documentation dans `agents`, `context`, et `tree`.

Cette première étape fournit une version fonctionnelle minimale du jeu, qui peut être enrichie par la suite en ajoutant de nouvelles mécaniques (prestige, compétences actives, succès, événements spéciaux) et du contenu (bâtiments supplémentaires, upgrades, skins). L’objectif est de poser les bases pour permettre une traduction facile et une évolution modulable.

## 05 août 2025 – suite du développement

Les fonctionnalités suivantes ont été ajoutées pour étoffer le prototype et se rapprocher du plan détaillé :

- **Extension du contenu** : ajout de nombreux bâtiments décrits dans le plan (usine de conserves, laboratoire OGM, temple de la courgette sacrée, bourse, station spatiale, colonie sur Titan, portail interdimensionnel, IA « Courg‑Elon », etc.) avec leurs coûts exponentiels et leurs descriptions humoristiques.
- **Système d’achievements** : ajout d’un ensemble de succès qui se débloquent en fonction du nombre de clics ou de bâtiments achetés (premier pot, dix pots, première mamie, dix mamies…). Lorsqu’un achievement est débloqué, un message apparaît dans la zone d’actualité.
 - **Améliorations globales** : création d’une section « Améliorations globales » (traduite) proposant des upgrades uniques. Chaque amélioration multiplie la production totale d’un certain facteur. Un système de conditions et de coûts a été mis en place pour déverrouiller ces upgrades et un indicateur ✔ apparaît lorsque l’amélioration est achetée. Les noms et descriptions de ces améliorations ont été revisités par la suite pour mieux coller à l’univers lycéen et satirique du jeu.
- **Système de Prestige** : ajout d’une mécanique de reset inspirée des idle games classiques. Un bouton « Prestige » affiche le nombre de graines cosmiques détenues et le nombre qui serait gagné en cas de réinitialisation (calculé à partir du total de courgettes produites). Lors de la réinitialisation, les bâtiments et les améliorations globales sont remis à zéro, mais le joueur conserve ses graines cosmiques qui procurent un bonus permanent (+10 % de production par graine). La partie est sauvegardée à chaque tick.
- **Traduction et localisation** : ajout de nouvelles clés dans `locales/fr.json` et dans le dictionnaire de secours pour les textes relatifs au prestige et aux améliorations globales. Toutes les chaînes d’interface sont centralisées pour préparer une éventuelle traduction.
- **Interface** : ajout d’une section prestige avec un bouton stylé et une zone d’information, ainsi que d’un nouveau style pour les cartes d’améliorations globales. Mise à jour de `index.html` et `style_v2.css` en conséquence.
- **Persistance** : la sauvegarde dans `localStorage` inclut désormais l’état des améliorations globales et des graines cosmiques, et le système de chargement rétablit correctement le multiplicateur global à partir des graines et des upgrades achetées.

Ces ajouts enrichissent considérablement l’expérience de jeu en offrant une progression long terme (prestige), des paliers intermédiaires (achievements, upgrades), et une satyre humoristique constante à travers les descriptions et messages d’actualité.

## 05 août 2025 – ajustements et différenciation

Afin de mieux différencier **Courgette Clicker** de son modèle et d’ancrer l’univers dans la réalité des ados français de 2025, plusieurs ajustements ont été réalisés :

- **Nouveaux noms et thématiques** : les bâtiments et améliorations qui rappelaient trop *Cookie Clicker* ont été rebaptisés. Par exemple, la **Ferme industrielle** est devenue **Ferme XXL**, l’**Usine de conserves** → **Usine Ratatouille**, le **Laboratoire OGM** → **Lab du CNRS**, le **Temple de la Courgette Sacrée** → **Culte de Sainte Courgette**, la **Bourse de la Courgette** → **CAC Courgette**, la **Station spatiale maraîchère** → **Base Courgette Kourou**, la **Colonie sur Titan** → **Serres du Mont‑Blanc**, le **Portail interdimensionnel** → **Métavers Courgette**, l’**IA Courg‑Elon** → **Algorithme ChatCourgette** et la **Singularité de la Courgette** → **Big Bang Courgette**. Ces nouvelles appellations incorporent des références à la culture lycéenne (méta‑vers, CNRS, Kourou), à la politique (PAC 2025, Macron) et à l’humour potager.
- **Améliorations globales revisitées** : les upgrades globales ont été renommées pour éviter toute association avec des streamers et refléter des codes adolescents. « Engrais premium ZeratoR », « Ratatouille géante », « Main d’œuvre robotique » et « Subventions gouvernementales » sont devenues **Engrais TikTok viral**, **Raclette Party**, **Robots du lycée agricole** et **Quotas PAC 2025**. Elles n’apparaissent à l’écran que lorsque le joueur dispose du capital nécessaire et que la condition de déblocage est remplie.
- **Nouvelle génération de messages** : les news aléatoires ont été réécrites pour se détourner des influences du streaming. Elles évoquent désormais des challenges TikTok, des gilets jaunes envahissant vos serres, des scandales (#CourgetteGate), des clips de rap, des SwissLeaks et même la désorganisation d’un concours « Miss Courgette » au lycée. Ces messages satiriques collent à l’actualité et au langage des jeunes.
- **Easter eggs** : un système d’easter eggs a été ajouté. Lorsque le compteur total atteint 69, 420, 1312 ou 2025 courgettes, un message cocasse s’affiche (par exemple « 😏 Tu viens d’atteindre 69 courgettes. Coïncidence ? Je ne crois pas. » ou « 1312 courgettes : ACAB – All Courgettes Are Beautiful. »). Ces easter eggs apportent une touche de surprise et d’irrévérence.
- **Déblocage progressif** : chaque bâtiment est désormais lié à un seuil `unlockAt` en nombre de courgettes produites. Tant qu’un palier n’est pas atteint et qu’aucun exemplaire n’est possédé, la carte correspondante reste cachée. Les améliorations globales adoptent également ce principe : elles ne se révèlent qu’une fois les conditions remplies et les ressources suffisantes, renforçant l’effet de découverte.
- **Gestion de l’état et persistance** : pour gérer ces nouvelles mécaniques, l’état du jeu inclut un tableau `easterEggs` et un tableau `globalUpgrades`. Des fonctions comme `checkEasterEggs()`, `renderGlobalUpgrades()` et `renderUpgrades()` ont été adaptées pour afficher dynamiquement les cartes en fonction du score et des conditions. La sauvegarde dans `localStorage` stocke désormais ces variables, assurant une reprise fidèle de la partie.
- **Préparation artistique** : deux nouveaux fichiers ont été créés pour planifier la réalisation des visuels : `design_guidelines.md` décrit la charte graphique (pixel art rural, palette de couleurs, animations, UI) et `assets_manifest.md` liste les icônes et éléments à générer avec des descriptions précises et des indications de style. Ainsi, l’étape de production des assets graphiques pourra être lancée plus tard avec des prompts cohérents et des noms de fichiers standardisés.

Ces ajustements donnent à **Courgette Clicker** une identité propre, ancrée dans la culture française et la satire potagère, tout en conservant la mécanique addictive du clicker. Le projet est désormais prêt à accueillir du contenu supplémentaire (mini‑jeux, compétences actives, système de prestige enrichi) et à être habillé visuellement selon la charte définie.

## 05 août 2025 – amélioration de l’expérience utilisateur et internationalisation

Dans cette nouvelle itération, plusieurs fonctionnalités ont été développées afin de rendre **Courgette Clicker** plus complet et agréable :

- **Menu des options** : ajout d’une zone de paramètres sous les statistiques permettant d’activer/désactiver le son et les animations et de choisir la langue de l’interface. Ces préférences sont sauvegardées dans `localStorage` afin d’être persistantes entre les sessions.
- **Internationalisation** : mise en place d’une sélection de langue dynamique. L’anglais a été ajouté via un fichier `locales/en.json` ainsi qu’un dictionnaire embarqué dans le script pour contourner les restrictions du protocole `file://`. La fonction `loadLocale()` récupère désormais la langue dans les paramètres et recharge les traductions à la volée sans réinitialiser la partie. Un utilitaire `applyTranslations()` remet à jour toutes les étiquettes et descriptions après changement de langue.
- **Effets sonores et animations** : intégration d’une ambiance sonore via l’API Web Audio. Un petit son “pop” est émis à chaque clic sur la courgette, et un son plus aigu se déclenche lors du déblocage d’un succès ou d’un easter egg. Ces sons respectent l’option “Son”. Côté visuel, une animation de mise à l’échelle et un flash lumineux sont appliqués sur la mascotte lors du clic. Des particules flottantes affichent le “+1” (ou la valeur du clic) et disparaissent en douceur. L’option “Animations” permet de désactiver ces effets.
- **Progression hors ligne** : le jeu enregistre désormais l’horodatage de la dernière sauvegarde. Lors du chargement, il calcule la production manquée en se basant sur la production par seconde et crédite automatiquement le joueur (dans la limite de 24 heures). Cette mécanique améliore la sensation de progression continue typique des idle games.
- **Persistance des paramètres** : une fonction `saveSettings()` a été ajoutée pour sauvegarder séparément les préférences utilisateur (son, animations, langue). Cela garantit que les réglages sont restaurés même si le format de sauvegarde du jeu évolue.
- **Icônes visuelles** : création d’un dossier `assets/` et génération d’une première icône en pixel art pour le « Pot de fleurs » via l’outil de génération d’images. Cette icône est intégrée à la carte de bâtiment grâce à un `<img>` aligné à gauche. Un style a été ajouté dans `css/style_v2.css` pour harmoniser la taille et l’espacement des icônes.
- **Refonte du CSS** : ajout de styles pour la section des options, l’animation de clic et les particules. La zone du bouton de clic est désormais positionnée en relatif pour accueillir les éléments flottants.

Ces améliorations rendent l’interface plus riche et personnalisable, tout en préparant le terrain pour l’intégration future d’autres langues et de nouveaux assets graphiques. L’expérience utilisateur est désormais plus dynamique grâce aux effets sonores et visuels, et les joueurs bénéficient d’une progression hors ligne. Les prochaines étapes envisagées comprennent la création des autres icônes décrites dans le manifeste, l’ajout d’un tutoriel, et l’implémentation d’une version PWA pour une installation sur mobile.

## 05 août 2025 – tutoriel, accessibilité et PWA

Pour pousser encore plus loin l’amélioration du jeu, plusieurs fonctionnalités ont été ajoutées dans cette phase :

- **Génération d’icônes supplémentaires** : trois nouvelles icônes en pixel art ont été produites et intégrées pour les bâtiments « Jardin partagé », « Mamie Paulette » et « Ferme familiale ». Elles illustrent respectivement des adolescents dans un potager, une grand‑mère souriante tenant une grosse courgette, et une ferme avec grange rouge, chien et tracteur. Les fichiers correspondants (`icon_garden.png`, `icon_grandma.png`, `icon_farm.png`) sont enregistrés dans `assets/` et référencés automatiquement par le code.
- **Tutoriel et aide intégrée** : un bouton d’aide (« ? ») a été ajouté dans la barre des options. En cliquant dessus, un panneau modal s’affiche avec des explications simples sur les mécaniques du jeu (cliquer pour récolter, acheter des bâtiments, utiliser les améliorations globales). Un bouton « Fermer » permet de revenir au jeu. Tous les textes sont localisés via de nouvelles clés (`helpTitle`, `helpText1`, etc.).
- **Mode contraste élevé** : une case à cocher « Contraste élevé » a été ajoutée. Lorsqu’elle est activée, une classe `high-contrast` est appliquée au `<body>`, modifiant les couleurs de fond et de texte pour améliorer la lisibilité (fond sombre, textes clairs, cartes recontrastées). Ce réglage est sauvegardé dans les préférences et restauré au chargement.
- **Progressive Web App (PWA)** : un fichier `manifest.webmanifest` a été créé pour définir le nom, les couleurs et les icônes de l’application. Un service worker (`sw.js`) est désormais généré afin de mettre en cache les fichiers statiques du jeu (HTML, CSS, JS, manifest, locales et icônes). Le service worker est enregistré lors de l’initialisation si le navigateur le permet, offrant ainsi un fonctionnement hors ligne et la possibilité d’installer le jeu comme application autonome. Un lien vers le manifeste a été ajouté dans `<head>`.
- **Interface et styles complémentaires** : le CSS comprend désormais des règles pour le bouton d’aide, le panneau d’aide, la classe `high-contrast`, ainsi que les variations de couleurs associées. Les nouveaux boutons ont été stylisés pour s’intégrer harmonieusement à l’UI existante.
- **Traductions** : des clés de traduction ont été ajoutées pour le contraste élevé et les textes du tutoriel en français et en anglais. La version anglaise a été enrichie en conséquence dans `locales/en.json` et dans le dictionnaire embarqué.

Avec ces ajouts, **Courgette Clicker** dispose maintenant d’un tutoriel intégré, de réglages d’accessibilité, d’un système de PWA pour le jeu hors ligne et d’un ensemble d’icônes plus complet. L’architecture est prête pour intégrer de nouveaux contenus (mini‑jeux, équilibrage avancé, leaderboards) et pour être empaquetée et distribuée facilement.

## 05 août 2025 – icônes avancées, événements et accessibilité

Dans cette ultime phase avant l’archivage final, nous avons poursuivi l’achèvement du jeu en ajoutant de nouveaux visuels, en améliorant l’accessibilité et en introduisant des événements aléatoires :

- **Génération d’icônes supplémentaires** : grâce à l’outil de génération d’images, plusieurs nouvelles icônes en pixel art ont été produites et intégrées : 
  - `icon_market.png` : marché fermier animé avec étals de légumes et adolescents faisant leurs courses. 
  - `icon_industrialFarm.png` : exploitation ultra‑mécanisée avec robots et drones sur des champs de courgettes. 
  - `icon_cannery.png` : usine de ratatouille avec un chef en toque supervisant la mise en bocaux. 
  - `icon_temple.png` : temple mystique dédié à la courgette avec vitraux et fidèles en robe verte. 
  - `icon_stockExchange.png` : traders en liesse devant des écrans affichant des courbes de courgettes. 
  - `icon_spaceStation.png` : base de Kourou avec fusée décollant et caisses de courgettes à l’avant‑plan. 
  - `icon_titan.png` : serres high‑tech sur fond de montagnes enneigées (Serres du Mont‑Blanc). 
  
  D’autres visuels (laboratoire, métavers, IA et Big Bang) n’ont pas pu être générés à cause d’une erreur de l’outil d’images. Afin de ne pas bloquer l’intégration, des **icônes de secours** ont été créées à l’aide de `Pillow` : des carrés colorés portant les textes “Lab”, “Meta”, “AI” et “Bang” permettent d’illustrer temporairement les bâtiments `Lab`, `Portal`, `AI` et `Singularity` (`icon_lab.png`, `icon_portal.png`, `icon_ai.png`, `icon_singularity.png`).

- **Icônes d’améliorations globales** : quatre icônes colorées ont été générées par script pour illustrer les améliorations globales `Engrais`, `Raclette`, `Robots` et `Subventions` (`icon_up_engrais.png`, `icon_up_raclette.png`, `icon_up_robots.png`, `icon_up_pac.png`). Ces fichiers servent de placeholders jusqu’à la création de véritables visuels.

- **Affichage des icônes et accessibilité** : dans `main.js`, une table `UPGRADE_ICON_MAP` associe désormais chaque amélioration globale à son fichier d’icône. La fonction `renderGlobalUpgrades()` ajoute une balise `<img>` au début de chaque carte et renseigne un attribut `alt` avec le nom traduit de l’amélioration. De même, la fonction `renderUpgrades()` définit l’attribut `alt` des icônes de bâtiments pour améliorer l’accessibilité aux lecteurs d’écran.

- **Événements aléatoires (mini‑jeux)** : deux événements ont été implémentés pour dynamiser la partie : “Heure magique” (production ×2 pendant 30 s) et “Festival de la courgette” (production ×3 pendant 15 s). Ces événements se déclenchent aléatoirement (1 % de chance à chaque clic) via `maybeTriggerRandomEvent()`, appliquent un multiplicateur à `state.globalMultiplier` et affichent un message traduit dans la zone “news”. Au terme de la durée, un message “eventEnded” informe le joueur du retour à la normale. Tous les textes correspondants ont été ajoutés au dictionnaire embarqué en français et en anglais. La fonction `triggerEvent()` gère l’application du bonus, l’affichage et la remise à zéro. Un son différent est joué pour les événements.

- **Mise à jour des interactions** : l’événement de clic sur la courgette appelle désormais `maybeTriggerRandomEvent()` et met à jour les boutons d’achats des bâtiments et des améliorations globales après chaque clic. Les achievements et easter eggs sont toujours vérifiés à chaque interaction, et la partie est automatiquement sauvegardée.

Grâce à ces ajouts, **Courgette Clicker** bénéficie d’une production visuelle plus riche, d’un meilleur support pour les technologies d’assistance, et d’un système d’événements qui renouvelle l’expérience de manière surprenante. Les icônes manquantes sont remplies par des placeholders en attendant un support graphique complet. L’application est maintenant prête à être empaquetée et distribuée.