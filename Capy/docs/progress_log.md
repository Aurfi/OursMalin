# Journal de progression

Ce journal retrace les différentes étapes de développement du jeu **Flappy Capybara**. Chaque entrée comporte la date, l'agent responsable et un résumé des actions effectuées.

## 4 août 2025

**Agent Plan / Gestionnaire / Développeur**

* Lecture du document « Plan détaillé pour créer un mini‑jeu Flappy Capybara ». Le contenu décrit l'objectif (adaptation de Flappy Bird avec un capybara) et les étapes de réalisation : choix technologiques, design vectoriel, implantation du moteur de jeu, génération des obstacles, score, bonus, sons, polissage et optimisations.
* Création de la structure de base du projet dans le répertoire `flappy_capybara/`.  Mise en place des fichiers suivants : `README.md` (description du jeu et des fonctionnalités), `agents.md` (rôles et responsabilités), `progress_log.md` (journal de progression), `CHANGELOG.md` (historique des versions), `tree.txt` (sera mis à jour automatiquement). Remplissage initial des fichiers README et agents.
* Préparation des futures tâches : le développement du jeu suivra étape par étape le plan et inclura la génération d’assets vectoriels et sonores.

**Agent Développeur / Designer**

* Mise en place de l’ossature du jeu en HTML, CSS et JavaScript :
  * Création de `index.html` avec un canvas pour afficher le jeu et deux overlays (menu principal et écran Game Over) comportant boutons et score.
  * Élaboration de `style_v3.css` pour styliser le fond, les boutons et les overlays de manière simple et cohérente.
  * Implémentation du fichier `main.js` contenant l’ensemble de la logique du jeu : gestion des états (menu, jeu, fin de partie), classe Capybara avec sa propre physique (gravité, saut, rotation pour l’inertie), génération et dessin des obstacles ainsi que des bonus, détection de collisions et gestion des scores.
  * Ajout d’un système de bonus (« score » et « invincible ») et d’une invincibilité temporaire après ramassage, conformément aux recommandations du plan【443107290259958†screenshot】. Les bonus s’attachent occasionnellement à un obstacle et sont récupérés lorsque le capybara les touche, accordant des points supplémentaires ou une invincibilité temporaire.
  * Intégration d’effets sonores simples grâce à l’API Web Audio (bip de saut, score, bonus et fin de partie). La première interaction de l’utilisateur déclenche l’initialisation de l’AudioContext, en accord avec les contraintes des navigateurs mobiles.
  * Implémentation d’un système de meilleur score utilisant `localStorage`, d’un compteur de score et d’une augmentation progressive de la difficulté en fonction du score (vitesse et fréquence d’apparition des obstacles).
  * Ajout d’un redimensionnement automatique du canvas pour s’adapter à la taille de la fenêtre tout en conservant le ratio original (portrait), assurant ainsi la compatibilité mobile/desktop.

* Mise à jour du fichier `tree.txt` pour refléter la structure actuelle et du changelog (`CHANGELOG.md`), et ajout des entrées correspondantes.

**Agent Gestionnaire / Documentaliste**

* Compression finale du projet en archive `flappy_capybara.tar.gz` pour distribution.  La structure complète comprend le code du jeu (`index.html`, `main.js`, `style_v3.css`), les fichiers de documentation (`README.md`, `agents.md`, `progress_log.md`, `CHANGELOG.md` et `tree.txt`) et un dossier `assets/` prêt à recevoir d’éventuelles ressources supplémentaires.
* Test rapide du jeu dans un navigateur local pour vérifier le bon fonctionnement du menu, du gameplay, de la génération d’obstacles et de bonus, des sons et des écrans de fin de partie.
* Synchronisation du fichier archive avec l’utilisateur via l’outil `computer.sync_file`.

## 4 août 2025 (suite)

**Agent Designer / Développeur**

* Suite aux retours utilisateur, ajustement de plusieurs paramètres afin d’adoucir la difficulté et d’améliorer l’esthétique :
  * **Gameplay** : réduction de la gravité et augmentation de la vitesse du saut pour que le capybara tombe plus lentement et soit plus facile à contrôler. Augmentation de la largeur du gap et allongement de l’intervalle entre les obstacles pour permettre au joueur de s’habituer.
  * **Capybara** : agrandissement du personnage et amélioration de son dessin (ajout de queue, narine, pattes plus visibles) pour un rendu plus mignon.
  * **Fond** : implémentation d’un arrière‑plan complet dans le canvas (ciel en dégradé, nuages animés et sol herbeux) et harmonisation du fond de page avec ces couleurs. Les nuages se déplacent lentement, créant un effet de profondeur.
  * **Détection des collisions** : adaptation des obstacles et du sol pour tenir compte de la nouvelle zone de sol afin que le capybara puisse atterrir correctement et que les tuyaux s’arrêtent avant le sol.

## 5 août 2025

**Agent Développeur / Designer / UI**

* Réorganisation de l’architecture pour proposer une **page d’accueil unique** (`index.html`) qui affiche les records individuels pour chaque mode et permet de lancer directement chacun des jeux sans passer par un écran intermédiaire.  Un nouveau script `menu.js` gère l’affichage des scores et la redirection des boutons vers les pages dédiées.
* Création de **pages autonomes** pour chaque jeu : `flappy.html` (Flying Capy), `runner.html` (Running Capy) et `energy.html` (Ragondin Véhicule).  Chaque page contient son propre canvas, un bouton de volume et un écran de fin de partie avec un message amusant aléatoire (blagues ou anecdotes sur le fromage) et des visuels réutilisés.  Les jeux démarrent automatiquement dès que la page est chargée et ne requièrent plus de clic supplémentaire.
* Ajout d’un **contrôle du volume** permanent via un bouton circulaire placé en haut à droite.  Le son (mélodie 8 bits et bips) peut être coupé et réactivé à tout moment dans tous les modes.
* Correction d’un **bug bloquant** : le script principal (`main.js`) accédait à des éléments DOM inexistants (notamment `playBtn` et `menuOverlay`) lorsque l’on utilisait une page de jeu autonome.  Les gestionnaires d’événements sont désormais ajoutés seulement si les éléments existent, et `startGame()` et `returnMenu()` vérifient l’existence des overlays avant de les manipuler.
* **Séparation de la logique du menu et des jeux** : le fichier `menu.js` se charge uniquement de la récupération des scores et de la navigation.  Le fichier `main.js` est utilisé pour le jeu Flying Capy sur `flappy.html` et a été adapté pour démarrer automatiquement lorsque le bouton Play est absent.
* Renommage complet du mode « Enedis » en **mode « Ragondin Véhicule »** afin de supprimer toute référence textuelle à une marque.  Les clés de stockage du score ont été renommées en `capyVehicleHighScore` et les fichiers `enedis.html`/`enedis.js` sont désormais remplacés par `energy.html`/`energy.js`.
* **Amélioration du runner** : repositionnement des pattes du capybara du mode course pour qu’elles soient attachées au corps et animation plus rapide des pattes au sol.  Limitation du saut à deux impulsions avant de toucher le sol.  Ajustement de la taille du canvas (environ 80 % de la hauteur de l’écran) pour une meilleure utilisation de l’espace sur mobile et desktop.
* **Ajout de messages ludiques** : les écrans de Game Over affichent désormais une anecdote humoristique sur le fromage accompagnée d’un visuel réutilisé (capybara ou marais), sélectionnés aléatoirement parmi une liste variée afin d’offrir un contenu différent à chaque fin de partie.
* **Mise à jour de `style_v3.css`** : le sélecteur du canvas pour le mode véhicule est passé de `#enedisCanvas` à `#energyCanvas` et de légers ajustements ont été réalisés pour harmoniser les marges et le centrage des canvases.
* Mise à jour de `README.md`, `tree.txt` et du `CHANGELOG.md` pour documenter ces évolutions.

**Agent Designer / Développeur**

* Nouvelle itération suite à un retour supplémentaire de l’utilisateur :
  * Mise en place d’une **difficulté progressive** : la taille de l’ouverture et l’intervalle entre les obstacles sont larges au début (grande marge de manœuvre) et se réduisent doucement à mesure que le score augmente. Le calcul se fait dynamiquement lors de la génération des obstacles et de l’incrémentation du score.
  * Ajustement supplémentaire de la physique : gravité réduite (0,18), vitesse horizontale initiale légèrement plus faible et réduction de l’accélération pour une descente plus douce. L’intervalle de génération initial a été augmenté à 140 frames.
  * **Animation des ailes** : ajout de petites ailes au capybara, animées lors du saut (battement vers le haut pendant quelques frames). Les ailes sont dessinées en arrière du corps et changent d’angle selon qu’elles battent ou non.
  * Amélioration visuelle des ailes (couleur plus claire et léger contour) pour les rendre visibles.
  * Mise à jour du code pour recalculer l’intervalle de génération et augmenter progressivement la vitesse uniquement toutes les quatre unités de score.

**Agent Développeur / Designer**

* Nouvelle itération pour tenir compte des retours signalant que le jeu restait encore trop difficile. Les changements majeurs sont axés sur l’accessibilité et la lisibilité :
  * **Espacement accru des obstacles** : l’intervalle initial entre les tuyaux passe à 300 frames (soit ~5 secondes à 60 FPS) et ne descend jamais en dessous de 240 frames. La réduction de cet intervalle en fonction du score est très lente (0,1 frame par point), garantissant un espacement généreux très longtemps.
  * **Ouvertures élargies** : les trous dans les obstacles commencent à une hauteur de 400 px et ne descendent jamais en dessous de 220 px. La fermeture du trou est extrêmement progressive (0,5 px par point de score).
  * **Glisse améliorée** : le clic déclenche désormais une impulsion plus modérée (vélocité verticale initiale : ‑4,5) et active un chrono de plané de 30 frames (~0,5 s). Pendant cette période, l’accélération verticale est très faible et la vitesse de descente est plafonnée à 1 px/frame, donnant réellement l’impression de planer. Une limitation empêche aussi de remonter trop haut si l’utilisateur clique rapidement.
  * **Ailes de style Pégase** : les ailes ont été entièrement redessinées. Elles sont désormais plus grandes (120 % de la largeur et de la hauteur du corps) et composées de quatre ellipses qui se chevauchent. L’animation de battement a été étendue à 30 frames avec une amplitude de 60° afin que le mouvement soit visible sur toute la phase de plané.
  * **Progression de la vitesse adoucie** : l’augmentation de la vitesse horizontale ne se produit plus qu’à partir de 8 points et en incréments de 0,08, évitant ainsi un emballement trop rapide du jeu.
  * **Correction des ajustements internes** : la gravité a été encore abaissée (0,06) pour ralentir la chute globale et la vitesse horizontale initiale diminuée à 1.

* Après ces modifications, le jeu a été testé localement. Le capybara plane plus longtemps après un clic, les obstacles apparaissent rarement au début et les ouvertures sont extrêmement larges, ce qui permet de jouer sans stress. Les nouvelles ailes blanches apportent un aspect majestueux et leur battement est clairement visible.  Ces changements répondent aux retours en rendant le jeu beaucoup plus accessible tout en conservant un défi progressif.

**Agent Développeur**

* Ajustements supplémentaires suite à un dernier retour utilisateur demandant un jeu légèrement plus dynamique :
  * **Plané raccourci et saut adouci :** la phase de plané déclenchée à chaque clic passe de 30 frames à 25 frames (≈0,42 s) et la vélocité initiale de saut est réduite de ‑4,5 à ‑4,2. Le capybara monte donc un peu moins haut et plane un peu moins longtemps.
  * **Défilement plus rapide :** la vitesse horizontale initiale est augmentée de 1,2 à 1,4 px/frame pour dynamiser le jeu tout en conservant une progression lente des obstacles.
  * **Détection de collisions plus permissive :** la boîte de collision du capybara a été réduite à 80 % de sa taille réelle afin de pardonner davantage les contacts rapprochés avec les tuyaux. Seule la partie centrale du corps est désormais prise en compte pour les collisions【202637067747329†screenshot】.
* Ces modifications rendent le gameplay légèrement plus rythmé tout en restant beaucoup plus accessible que la version initiale. Le capybara se déplace un peu plus vite, plane moins longtemps et bénéficie d’une zone de collision plus tolérante.

## 4 août 2025 (suite 2)

**Agent Designer / Développeur**

* **Amélioration de la page d’accueil** : pour rendre l’interface plus attrayante, un visuel humoristique d’un capybara ailé a été généré via l’outil d’image en style bande dessinée.  Cette image a été intégrée comme arrière‑plan du menu principal (`#menu.overlay`) et un léger voile sombre a été appliqué afin que le texte reste lisible.  Le fond général du site reprend le dégradé de ciel du jeu pour assurer la cohérence visuelle.
* Le menu a été enrichi d’un deuxième bouton « Mode Course » permettant de lancer un nouveau jeu de style runner.

**Agent Développeur**

* **Implémentation du second jeu « Capybara Runner »** : création des fichiers `runner.html` et `runner.js` avec un canvas dédié et deux overlays (menu et game over).  Ce jeu s’inspire du dinosaure de Chrome : le capybara court dans un marais et doit sauter au‑dessus de troncs d’arbres tandis qu’un chat noir le poursuit en sautant automatiquement les obstacles.  Les classes `RunnerCapy`, `RunnerCat`, `RunnerObstacle` et `Heart` gèrent respectivement le joueur, l’adversaire, les obstacles et les cœurs envoyés en mode ragondin.
* **Gameplay et contrôles** : le capybara ne perd plus lorsqu’il touche le sol ; il continue simplement à courir.  La collision avec un obstacle déclenche l’écran de fin de partie.  Le chat s’approche doucement sans jamais atteindre le capybara et saute automatiquement quand un obstacle est en approche.  Un mode « ragondin fatigué » est disponible depuis l’écran de Game Over pour désactiver totalement les obstacles et afficher des cœurs qui s’envolent derrière le chat.
* Les événements clavier, souris et tactile permettent de sauter (touche `Espace`, `Flèche haut`, clic ou toucher).  Un système de score et de meilleur score est intégré (stockage via `localStorage`).
* **Tests et corrections** : lors des premiers tests, toucher le sol déclenchait immédiatement le `Game Over` en raison d’un appel à `endGame()` dans la méthode `update()` de `RunnerCapy`.  Ce comportement a été corrigé afin que le capybara puisse continuer à courir.  La détection de collision se fait désormais uniquement avec les obstacles.
* **Documentation** : mise à jour du fichier `tree.txt` pour inclure les nouveaux fichiers et de `README.md` pour décrire le mode course et fournir un tutoriel d’utilisation.  Le changelog a été incrémenté à la version 2.0.0 pour consigner l’ajout du nouveau jeu et l’amélioration de la page d’accueil.

## 4 août 2025 (suite 3)

**Agent UI Designer**

* Refonte de l’interface du menu principal : création d’une **carte** centrale (`.menu-card`) au sein de l’overlay pour afficher le titre « Capybara Games », le meilleur score et deux grands boutons alignés.  Les boutons ont été renommés « Flying Capy » et « Running Capy » pour clarifier les modes disponibles.  La carte dispose d’un fond semi‑transparent, d’un arrondi et d’une ombre portée afin de mieux se détacher du visuel de fond【798736409856352†screenshot】.
* Uniformisation du style des écrans de menu et de Game Over du **Capybara Runner** : les contenus sont désormais encapsulés dans une carte au design similaire à celui du menu principal, améliorant la lisibilité et la cohérence visuelle.

**Agent Gameplay Specialist**

* **Amélioration du saut et du plané dans Running Capy** : augmentation de l’impulsion de saut (`jumpStrength` passé de −8,5 à −10) et ajout d’un **glideTimer** pour réduire temporairement la gravité après un saut.  Le capybara saute plus haut et plane quelques instants, rendant la prise en main plus agréable.
* Modification de la mécanique des **bisous** en mode ragondin : les cœurs apparaissent plus souvent (toutes les 45 frames au lieu de 60), sont plus gros et se déplacent plus rapidement vers le joueur, restant ainsi visibles à l’écran plus longtemps.

**Agent Graphic Designer**

* Génération d’un décor de marais en style cartoon via l’outil d’image : ce visuel est intégré en bas de l’écran du Runner pour remplacer les bandes vertes et donner une ambiance « marécage » plus réaliste.  Le décor comporte des nénuphars, des roseaux et une végétation luxuriante.
* Remplacement des anciens obstacles rectangulaires par des **obstacles thématiques** : alligator avec dents, mangrove, porc‑épic, chasseur et marsupilami.  Chaque type a été dessiné directement sur le canvas en utilisant des formes géométriques simples (rectangles, ellipses, arcs), des couleurs harmonieuses et quelques détails (dents, chapeau, fusil, queue ondulée).  Les obstacles sont choisis aléatoirement à la génération et conservent un comportement identique (se déplacer de droite à gauche et provoquer la fin de partie lors d’une collision).

**Agent Développeur**

* Intégration technique du visuel marais : chargement d’une image PNG dans `runner.js` et dessin dans la fonction `drawBackground()` pour occuper environ 40 % de la hauteur au‑dessus du sol.  Ajustement du ciel dégradé pour couvrir le reste du canvas.
* Ajout d’une propriété `glideTimer` au `RunnerCapy` et modification de la méthode `update()` pour appliquer une gravité réduite pendant la glisse.  Adaptation de la méthode `jump()` pour initialiser ce timer.
* Refactorisation de `RunnerObstacle` afin de supporter plusieurs types d’obstacles avec des tailles spécifiques et un dessin dédié.  Le choix du type est aléatoire à la construction et l’affichage est géré dans la méthode `draw()` en fonction du type.
* Mise à jour du fichier `tree.txt` pour refléter l’ajout de la nouvelle image (`swamp_background.png`) et adaptation du `CHANGELOG.md` à la version 2.1.0 pour consigner ces améliorations.

## 4 août 2025 (suite 4)

**Agent UI Designer / Graphic Designer / Gameplay Specialist**

* Suite à un nouveau retour utilisateur, un travail approfondi a été mené pour rendre le mode **Running Capy** plus agréable visuellement et plus accessible.
* **Nouveaux visuels** : plusieurs ressources graphiques ont été générées via l’outil d’image afin de remplacer les dessins vectoriels provisoires.  Deux capybaras entièrement redessinés (un pour la course, l’autre pour le vol) ont été ajoutés aux assets (`capybara_running.png` et `capybara_flying.png`).  Ces images corrigent notamment la position du museau jugée disgracieuse et proposent un style cartoon plus soigné.  Des obstacles thématiques sous forme de PNG (tête de crocodile, tronc d’arbre, buisson) ont été créés et intégrés, remplaçant les anciennes formes vectorielles peu lisibles.  Les obstacles sont sélectionnés aléatoirement lors de la génération.
* **Refonte du mode Runner** : le `RunnerCapy` utilise désormais l’image importée pour le dessin du capybara.  La classe `RunnerObstacle` a été réécrite pour charger et afficher les nouvelles images.  Les dimensions ont été ajustées pour respecter les proportions des PNG.  Le redimensionnement du canvas a été revu pour qu’il occupe environ 90 % de la largeur de la fenêtre avec un ratio 16:9, recentrant ainsi l’aire de jeu et évitant que l’action ne se déroule uniquement dans un coin【798736409856352†screenshot】.
* **Physique revue** : la gravité dans Running Capy a été réduite (0,35 au lieu de 0,4) afin de ralentir la chute et de permettre un meilleur contrôle.  La vitesse horizontale initiale a été abaissée à 3 px/frame et l’intervalle entre les obstacles a été augmenté à 150 frames.  La progression de la vitesse et du rythme d’apparition des obstacles est plus douce (augmentation de 0,15 toutes les 5 points et diminution de l’intervalle de 0,3 frame par point), garantissant un démarrage lent qui s’accélère progressivement.
* **Interface unifiée** : les canvas des deux jeux sont maintenant centrés horizontalement via une règle CSS commune (`#gameCanvas, #runnerCanvas`).  Le sol du mode runner est un simple bandeau vert uniforme.  Les textes inutiles ont été supprimés et les boutons conservent un aspect uniforme avec l’écran principal.

**Agent Gestionnaire**

* Mise à jour du fichier `tree.txt` pour inclure les nouvelles ressources (`capybara_running.png`, `capybara_flying.png`, `obstacle_gator.png`, `obstacle_log.png`, `obstacle_bush.png`).  Ajout d’une entrée dans le `CHANGELOG.md` pour la version 2.2.0 afin de consigner les ajouts et modifications décrits ci‑dessus.

## 4 août 2025 (suite 5)

**Agent Développeur / UI Designer / Gameplay Specialist**

* **Correction du bug de lancement des jeux** : un appel précoce à `updateMenuScores()` dans `main.js` tentait d'accéder à des éléments DOM non initialisés (variables `const` en zone TDZ), provoquant un arrêt du script et l'absence d'affichage dans `flappy.html`.  Le code a été réorganisé pour ne mettre à jour les scores qu'après la création des éléments.  `menu.js` gère désormais exclusivement la page d’accueil.

* **Hitbox des obstacles plus permissive** : ajout d’une méthode `getHitbox()` dans `RunnerObstacle` et `RunnerObstacle` (mode véhicule) pour réduire de 10 % la largeur et de 20 % la hauteur des obstacles.  La détection de collision utilise cette zone réduite et est désactivée lorsqu’on joue en mode ragondin fatigué, ce qui permet de frôler les arbres et buissons sans perdre immédiatement.

* **Animation comique des pattes** : dans `runner.js`, les pattes du capybara sont désormais attachées au corps et inclinées vers la gauche ou la droite à chaque phase d’animation, créant un effet « dessin animé » où les jambes bougent plus vite que le terrain.

* **Saute automatique du chat amélioré** : le chat poursuivant utilise désormais une distance d’anticipation aléatoire pour déclencher ses sauts (120–180 px) et reste actif en mode ragondin, de sorte qu’il continue à franchir les obstacles tout en envoyant des cœurs.

* **Mode ragondin fatigué retravaillé** : les obstacles sont affichés mais ne provoquent plus de collision ; les bisous voyagent plus lentement (vitesse de 2,5 px/frame).  Un nuage de cœurs apparaît dans les dernières secondes avant la fin automatique du mode.

* **Mode Ragondin Véhicule réinventé** : l’ogre a été remplacé par une voiture blanche conduite par un chat noir (`CarCat`), rappelant le mode Runner classique.  Cette voiture suit le capybara avec un décalage et saute les obstacles grâce à la même logique aléatoire.  La voiture du joueur comporte désormais une petite tête de capybara qui dépasse du toit.  Une hitbox réduite est utilisée pour les collisions.

* **Améliorations audio** : les mélodies 8 bits de chaque mode ont été retravaillées pour être plus variées.  Un bouton de volume accessible en permanence permet de couper ou réactiver tous les sons.

* **Nettoyage et renommage** : suppression de toute mention textuelle à Enedis.  Le mode véhicule utilise la clé `capyVehicleHighScore` dans le `localStorage`.  Mise à jour des commentaires pour refléter les nouveaux comportements.

* **Mises à jour de la documentation** : les fichiers `CHANGELOG.md` et `tree.txt` ont été mis à jour pour la version 2.3.1.  Les changements ont été consignés, y compris le retour aux dessins vectoriels pour certains éléments (capybaras, obstacles), les nouvelles classes `CarCat` et `getHitbox()`, et les ajustements de physique.

## 6 août 2025

**Agent Développeur / UI Designer / Gameplay Specialist**

* **Défilement en parallaxe** : ajout d’un fond qui défile sur plusieurs couches pour les modes Running Capy et Ragon électrique.  Deux couches du marais se déplacent à des vitesses différentes et se réinitialisent lorsque leur position dépasse la largeur du canvas, créant un effet de profondeur permanent.

* **Accélération dynamique du jeu** : mise en place d’une progression de difficulté liée au score.  Avant 50 points, la vitesse augmente de 0,15 px/frame toutes les cinq unités de score et l’intervalle entre les obstacles se resserre doucement.  Après 50 points, la vitesse augmente de 0,25 px/frame toutes les cinq unités et l’intervalle diminue plus rapidement (jusqu’à un minimum de 80 frames), rendant le jeu plus palpitant pour les joueurs avancés.

* **Poursuite réaliste** : le chat dans Running Capy et la voiture du chat dans Ragon électrique s’approchent maintenant du capybara en fonction du score : la vitesse d’approche augmente progressivement sans jamais permettre un dépassement en mode normal.  En mode ragondin fatigué, le chat finit par rattraper le capybara au bout d’environ 28 secondes, donnant lieu à un nuage de cœurs avant la fin automatique à 30 secondes.

* **Nouveau nom et stockage du mode véhicule** : pour éviter toute référence textuelle à Enedis, le mode « Ragondin Véhicule » devient **Ragon électrique**.  Les éléments de l’interface (bouton du menu et titre de la page) ont été mis à jour, et le meilleur score est désormais stocké sous la clé `capyElectricHighScore`.

* **Amélioration des voitures** : les voitures ont été raccourcies (90 px) et centrées pour libérer de l’espace à l’écran.  La voiture poursuivante arbore un logo « G » bleu avec une petite tête de chat noire dépassant du cockpit.  La voiture du joueur affiche toujours une tête de capybara.  Ces modifications améliorent la lisibilité et donnent une apparence plus soignée.

* **Blagues et anecdotes enrichies** : suppression de la blague sur le fromage râpé et ajout de nombreuses anecdotes et blagues nouvelles (capybara nageur, gruyère qui s’enfuit, parmesan utilisé comme monnaie, etc.).  Les messages de fin de partie offrent désormais davantage de variété et d’humour.

* **Images de fin de partie** : seules des images d’animaux (capybaras comique, volant et courant) sont utilisées dans les bulles d’anecdotes.  Les visuels de décor et d’obstacles ont été retirés pour ne pas distraire le joueur.

* **Réglages divers** : ajustement du positionnement initial de la voiture du chat afin qu’elle ne chevauche plus la voiture du capybara sur les petits écrans, mise à jour des animations des pattes pour un effet cartoon synchronisé, et correction d’un bug où la page du jeu ne chargeait plus en raison d’une clef obsolète.  Mise à jour du `CHANGELOG.md` vers la version 2.3.2 et du `tree.txt` pour inclure les nouveaux assets et scripts.

## 8 août 2025

**Agent Développeur / UI Designer / Gameplay Specialist**

* **Suppression du parallaxe** : suite aux retours des testeurs, l’effet de défilement parallaxe a été retiré des modes Runner et Ragon électrique.  Le décor du marais redevient statique afin d’éviter les raccords disgracieux.
* **Ajustements de difficulté** : la vitesse de base des modes de course est augmentée (`gameSpeed` fixé respectivement à 4.0 pour Runner et 3.5 pour Ragon électrique) et l’intervalle initial entre obstacles est réduit (170 frames).  Les accélérations progressives sont renforcées après 50 points, rendant la montée en difficulté plus marquée.
* **Flappy Capy plus rapide** : la vitesse de défilement horizontale initiale passe de 1.4 à 1.6 et l’intervalle de génération des obstacles est réduit à 250 frames.  La vitesse augmente désormais de 0,1 px/frame toutes les 8 unités de score (0,15 px/frame après 50 points) et l’intervalle se contracte plus rapidement.
* **Nouvelles anecdotes et blagues** : ajout d’une douzaine de blagues et anecdotes supplémentaires (capybaras « rois du chill », fromage de yak, fromage pour le clavier…) et retrait définitif de la blague du fromage râpé.  Ces messages enrichissent les bulles d’information lors des Game Over.
* **Visuels hybrides supplémentaires** : deux nouveaux dessins (capybara‑tortue et capybara‑pingouin) générés via `imagegen` ont été ajoutés dans `assets/`.  Les listes `funImages` des trois modes ont été mises à jour pour inclure ces images, offrant plus de variété lors des écrans de fin.
* **Mise à jour du stockage des scores** : la clé de stockage du meilleur score du mode électrique a été uniformisée (`capyElectricHighScore`) et les sélecteurs DOM ont été mis à jour (`best-score-electric`).  Le menu affiche désormais « Record Ragon électrique ».
* **Corrections diverses** : repositionnement du chat pour mieux voir ses pattes, suppression de la tache blanche, optimisation des animations de pattes pour un rendu plus fluide et suppression des restes de parallaxe dans le code.  Les fichiers `CHANGELOG.md`, `tree.txt` et `progress_log.md` ont été mis à jour pour refléter ces changements.

## 5 août 2025

**Agent Développeur / UI Designer / Gameplay Specialist / Documentaliste**

* **Création d’un nouveau mode « Jumping Capy »** : conception d’un mini‑jeu de plateforme en 2D inspiré de Super Mario.  Les niveaux sont définis manuellement dans des tableaux (segments de sol, plateformes, ennemis, bonus et drapeau) pour permettre une extension ultérieure sans modifier la logique du moteur.  Le capybara peut se déplacer latéralement (flèches gauche/droite ou boutons mobiles) et sauter (flèche haut/Espace).  Les ennemis patrouillent et peuvent être éliminés en leur sautant dessus.  Les bonus en forme de carotte ou de patate flottent dans des bulles jaunes et rapportent des points.  Une musique rétro et des bips accompagnent les actions du joueur.  Un écran de victoire s’affiche lorsque le drapeau est atteint.
* **Refonte du menu principal** : remplacement des boutons statiques par une liste dynamique de cartes de jeux générée dans `menu.js` à partir d’un tableau `games`.  Le menu est désormais entièrement modulaire : on peut ajouter de nouveaux modes en ajoutant simplement une nouvelle entrée dans ce tableau.  Un visuel héroïque généré via *imagegen* est affiché en haut de la carte du menu pour améliorer l’esthétique et donner une cohérence graphique.
* **Interface tactile** : ajout d’un conteneur `mobile-controls` dans `platform.html` comportant des boutons circulaires gauche/droite/saut afin de jouer au nouveau mode sur mobile sans clavier.  Les événements `touchstart` et `touchend` ont été ajoutés dans `platform.js` pour gérer ces contrôles.
* **Amélioration du capybara vectoriel** : repositionnement et agrandissement de l’oreille du capybara dans les dessins vectoriels de tous les modes (`main.js`, `runner.js`, `energy.js` et `platform.js`).  La forme et la couleur de l’oreille ont été revues pour éviter l’effet de museau mal placé.
* **Prolongation du mode ragondin fatigué** : allongement de la durée avant que le chat ne rattrape le capybara (1 400 frames au lieu de 800) et prolongation de la pluie de cœurs (360 frames au lieu de 240) afin que le joueur puisse profiter plus longtemps de la promenade.  Mise à jour de la logique dans `runner.js` pour refléter ces changements.
* **Amélioration de l’interface et des graphismes** : restructuration du CSS (`style_v3.css`) pour accueillir le nouveau menu et les cartes de jeux.  Le fond du site est désormais un dégradé pastel et les cartes ont été ombrées pour mieux ressortir.  Ajout d’une image héroïque dans les assets (`menu_hero.png`) et mise à jour de l’arborescence dans `tree.txt` pour inclure toutes les nouvelles ressources et fichiers (`platform.html`, `platform.js`, nouveaux PNG de capybaras et obstacles).  Mise à jour de la documentation (`README.md`, `CHANGELOG.md`, `tree.txt`) pour décrire ces changements.

## 6 août 2025

**Agent Développeur / UI Designer / Gameplay Specialist / Documentaliste**

* **Renommage et corrections de Super Capy** : renommage du mode Jumping Capy en **Super Capy** dans toutes les pages HTML, dans `menu.js` et dans les textes du site.  Ajustement des écouteurs d’événements dans `platform.js` pour corriger le fonctionnement des boutons mobiles en ajoutant des gestionnaires `mousedown`/`mouseup` en plus des `touchstart`/`touchend` afin d’activer le déplacement lorsque l’on maintient les flèches.  Application de `preventDefault()` pour éviter le défilement du navigateur.
* **Double saut et saut plus haut** : modification de la classe `Player` dans `platform.js` afin de permettre deux sauts consécutifs avant de retoucher le sol (propriété `jumpCount`).  Augmentation de la force de saut (12 → 14) et réduction de la gravité (‑0,45 → ‑0,35) pour que le capybara saute légèrement plus haut et retombe moins vite.  Adaptation du message de beep en fonction du nombre de sauts.
* **Score basé sur les bonus** : suppression de l’incrémentation automatique du score dans Super Capy.  Le score provient désormais uniquement des bonus placés dans le niveau : chaque carotte vaut 1 point et chaque patate vaut 10 points.  Les ennemis éliminés ne rapportent plus de points.
* **Affichage du score uniformisé** : mise à jour de `main.js`, `runner.js`, `energy.js` et `platform.js` pour afficher le score sans préfixe « Score ».  Le nombre est centré en haut de l’écran, en gras et en doré, avec une boîte sombre semi‑transparente pour améliorer la lisibilité.  Ajustement des écrans de Game Over pour afficher uniquement les valeurs numériques (score et record) dans tous les modes.
* **Décors animés dans Super Capy** : création de classes `Cloud` et `BirdDeco` dans `platform.js` pour ajouter des nuages et des oiseaux décoratifs qui se déplacent à vitesse réduite par rapport à la caméra.  Un tableau de nuages est généré lors du chargement d’un niveau (`spawnClouds()`) et les oiseaux apparaissent aléatoirement pendant la partie (`spawnBird()`).  Ces éléments offrent un décor vivant et renforcent la sensation de vitesse.
* **Prolongation supplémentaire du mode ragondin fatigué** : deuxième ajustement de `runner.js` pour porter l’attente avant la rencontre à 2 000 frames (~33 s) et la durée de la pluie de cœurs à 600 frames (~10 s), conformément aux retours utilisateurs.  Les commentaires et le changelog ont été mis à jour pour refléter ces nouvelles valeurs.
* **Documentation et journal** : révision du `README.md` pour renommer Jumping Capy en Super Capy, décrire la nouvelle mécanique de double saut et expliquer que le score dépend maintenant uniquement des bonus.  Ajout d’une nouvelle entrée dans `CHANGELOG.md` (version 3.1.0) détaillant les changements récents.  Le présent `progress_log.md` a été complété avec cette session.

## 5 août 2025 (suite)

**Agent Développeur / Designer / UI**

Suite aux retours supplémentaires sur Courgette Crush et Running Capy, plusieurs améliorations ont été apportées :

* **Effet confettis** : l’animation de confettis déclenchée lors des grands alignements est intensifiée. Désormais, au moins une centaine de confettis sont générés lorsqu’une combinaison de cinq légumes ou plus disparaît, et le nombre de confettis augmente en proportion de la taille de la combinaison.
* **Bonbons spéciaux** : la logique des soleils et des arrosoirs s’inspire directement de Candy Crush. Un alignement de quatre génère un arrosoir coloré (détruisant sa ligne ou sa colonne selon l’orientation). Un alignement de cinq ou plus crée un soleil. Les combinaisons entre bonbons produisent des effets clairs : deux soleils ou deux arrosoirs effacent tout le plateau ; un soleil associé à un légume supprime toutes les pièces de cette couleur ; un soleil combiné à un autre bonbon efface également tout le plateau. Ces règles sont codées dans `courgette.js` et remplacent l’ancienne logique peu intuitive.
* **Détourage et recoloration des assets** : les images de l’arrosoir et du soleil ont été nettoyées pour enlever le damier d’arrière‑plan et enregistrées en PNG transparents. Un script Python identifie les couleurs de fond et recolore automatiquement l’arrosoir pour correspondre aux cinq légumes (orange, vert, jaune, marron, rouge). Les anciennes images et répertoires inutiles ont été supprimés afin de réduire le poids de l’archive.
* **Mode ragondin fatigué revu** : dans `runner.js`, le capybara commence désormais au centre de l’écran et le chat l’approche beaucoup plus lentement. La distance d’écart initiale est accrue et décroît doucement, et la rencontre intervient après environ 26 secondes (1 600 frames) au lieu de 33 s. Le redimensionnement du canvas conserve ces positions.
* **Autres ajustements** : les positions sont recalculées correctement lors des changements de taille de fenêtre, le texte splash est légèrement agrandi et des corrections mineures ont été apportées aux fonctions de cascade et de score. Le journal de progression et le changelog ont été mis à jour en conséquence.

## 5 août 2025 (fin de journée)

**Agent Développeur / Designer / UI**

Pour terminer la refonte de Courgette Crush et améliorer la lisibilité sur mobiles, un ensemble complet de modifications a été réalisé :

* **Assets vectoriels** : les légumes et le soleil d’origine ont été remplacés par leurs versions vectorielles (SVG) fournies par l’utilisateur.  Un script Python (`generate_tinted_watering_sun.py`) a été ajouté pour recolorer automatiquement le modèle d’arrosoir en cinq variantes (orange, rouge, marron, jaune, vert) et générer un nouveau soleil multicolore à partir d’une grille radiale arc‑en‑ciel.  Les spouts de l’arrosoir ont également été recolorés.  Les anciens fichiers PNG ont été supprimés pour alléger l’archive.

* **Intégration des SVG** : `courgette.js` a été modifié pour charger les fichiers SVG dans le canvas au lieu des PNG.  Le tableau `vegNames` pointe désormais vers `veg_*.svg` et les arrosoirs et le soleil utilisent `power_watering_*.svg` et `power_sun.svg`.  La logique de chargement a été renforcée : chaque image déclenche un compteur `ready`, et une minuterie de secours lance automatiquement la partie au bout d’une seconde si certains navigateurs ne déclenchent pas correctement l’événement `onload` pour les SVG (cas du chargement `file://`).

* **Responsive design et orientation** : pour s’adapter aux écrans d’iPhone en mode portrait et paysage, une fonction `resize()` calcule dynamiquement la taille du plateau (canvas) et réorganise la barre latérale.  En mode portrait, le plateau est centré au-dessus des contrôles et occupe jusqu’à 65 % de la hauteur ; en paysage, il est affiché à gauche avec la barre latérale à droite.  Tous les jeux ont été munis d’un script `orientation.js` qui affiche un message lorsque le mode paysage est requis (Flying Capy, Running Capy, Super Capy, Ragon électrique) et qui rappelle la fonction de redimensionnement pour les pages adaptatives (page d’accueil et Courgette Crush).

* **Corrections diverses** : suppression de l’appel de débogage à `startGame()` qui démarrait la partie avant le chargement des images ; ajout d’une sauvegarde du score et du record; nettoyage de l’archive en retirant les fichiers inutilisés.  Mise à jour du `CHANGELOG.md` et du présent journal pour refléter ces changements.

