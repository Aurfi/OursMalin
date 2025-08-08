# Changelog

Toutes les modifications significatives apportées à ce projet seront consignées ici dans l'ordre chronologique inverse.

## [3.0.0] - 2025-08-05

### Added

* **Jumping Capy** : introduction d’un quatrième mode de jeu inspiré de Super Mario.  Ce nouveau mini‑jeu de plateforme permet de se déplacer vers la gauche ou la droite et de sauter pour éviter des trous, des plateformes et des ennemis.  Les niveaux sont prédéfinis dans des tableaux et peuvent être étendus en ajoutant de nouveaux objets sans modifier la logique du moteur.  Des bonus en forme de carotte ou de patate flottent dans des bulles jaunes translucides et augmentent le score, tandis qu’un drapeau marque la fin du niveau.  Sur mobile, des boutons tactiles (gauche/droite/saut) apparaissent automatiquement.
* **Menu modulaire** : la page d’accueil (`index.html`) a été complètement repensée.  Elle affiche désormais une carte centrale contenant un visuel héroïque généré via *imagegen* et une liste de cartes de jeux générée dynamiquement par `menu.js`.  Chaque carte affiche le titre du mode, son meilleur score et un bouton pour le lancer.  Le menu est extensible : pour ajouter un nouveau jeu, il suffit d’ajouter une entrée dans le tableau `games` de `menu.js`.
* **Contrôles tactiles** : ajout d’un conteneur `mobile-controls` dans `platform.html` contenant trois boutons circulaires (←, ↑, →) qui apparaissent uniquement sur mobile pour contrôler Jumping Capy sans clavier.
* **Image héroïque** : création d’une illustration personnalisée de capybara volant via l’outil `imagegen` (`assets/menu_hero.png`) pour orner le menu.

### Changed

* **Capybara vectoriel** : l’oreille du capybara a été redessinée et repositionnée dans tous les modes pour qu’elle ressemble à une véritable oreille et non plus à un museau mal placé.  Les proportions de l’oreille ont été ajustées et sa couleur harmonisée avec celle du corps.
* **Ragondin fatigué** : la durée avant que le chat ne rattrape le capybara dans le mode ragondin a été considérablement allongée (de 800 à 1 400 frames) et l’explosion de cœurs dure désormais six secondes.  Les joueurs ont ainsi plus de temps pour profiter de la promenade.
* **UI et graphismes** : les styles CSS ont été réorganisés pour accueillir la nouvelle page d’accueil.  Les cartes de jeu sont de couleur claire avec un ombrage, et le fond du site est un dégradé pastel.  Les boutons de volume et de musique sont présents sur chaque page de jeu.  Le menu s’adapte maintenant automatiquement au nombre de jeux.
* **Dépendances** : mise à jour de `tree.txt` pour refléter la nouvelle arborescence (ajout de `platform.html`, `platform.js` et de nombreux assets supplémentaires).

### Fixed

* **Crédits mis à jour** : le `README.md` a été restructuré pour décrire les quatre modes et le nouveau menu dynamique.  Les notes sur les anciennes versions ont été conservées dans le changelog.

## [0.1.0] - 2025-08-04

### Added

* Création initiale du projet : structure du dépôt `flappy_capybara/` avec les fichiers `README.md`, `agents.md`, `progress_log.md`, `CHANGELOG.md` et `tree.txt`.
* Premier remplissage des fichiers `README.md` et `agents.md` expliquant le but du jeu, la structure et les rôles.

### Changed

* Ajout des fichiers `index.html`, `style_v3.css` et `main.js` implémentant la structure initiale du jeu, sa logique principale, la génération des obstacles et des bonus ainsi que les effets sonores.
* Mise à jour de `tree.txt` pour refléter la nouvelle arborescence et ajout de l’auto‑redimensionnement du canvas.

## [1.0.0] - 2025-08-04

### Added

* Assemblage de la première version jouable de **Flappy Capybara**, avec menu principal, écran de jeu, obstacles générés aléatoirement, bonus (score et invincibilité), système de score et de meilleur score, effets sonores et écrans de Game Over.
* Fonctionnalités complètes pour mobile et bureau (clavier/souris/tactile) grâce aux écouteurs d'événements adaptés.
* Archivage du projet dans un fichier tar gz (`flappy_capybara.tar.gz`) en vue de la distribution.

### Fixed

* Ajustement des paramètres de gravité et de saut pour rendre le gameplay jouable et réactif.

### Notes

Cette version marque la complétion de la première itération du jeu décrite dans le plan.  Des améliorations visuelles et sonores peuvent être ajoutées ultérieurement, mais le jeu est pleinement fonctionnel et prêt à être joué localement via un simple serveur ou en ouvrant `index.html` dans un navigateur moderne.

## [1.1.0] - 2025-08-04

### Added

* Ajout d’un arrière‑plan dynamique au canvas : ciel en dégradé, nuages animés et sol herbeux.  Les nuages se déplacent lentement pour renforcer l’illusion de profondeur.

### Changed

* Réglages de la physique : la gravité a été réduite et l’impulsion de saut augmentée pour rendre le jeu plus facile et plus agréable.  Les intervalles entre les obstacles sont plus longs et les ouvertures ont été élargies.
* Augmentation de la taille et amélioration du design du capybara (queue, narine et pattes plus visibles), afin de le rendre plus lisible et plus mignon.
* Ajustement de la détection de collisions et de la génération des obstacles pour tenir compte de la nouvelle zone de sol et des nouveaux paramètres.
* Harmonisation du fond de la page avec les couleurs du ciel du jeu.

### Fixed

* Correction d’un problème où le sol n’était pas pris en compte lors du dessin des obstacles, provoquant un chevauchement.

## [1.2.0] - 2025-08-04

### Added

* Animation de battement d’ailes pour le capybara : les ailes sont visibles et changent d’orientation lors du saut, donnant l’impression qu’il bat des ailes.

### Changed

* Difficulté progressive : la taille des ouvertures et l’intervalle entre les obstacles sont désormais calculés en fonction du score. Les premiers obstacles ont de très grandes ouvertures et sont très espacés, puis la difficulté augmente en douceur.
* Ajustements supplémentaires de la physique (gravité abaissée, vitesse de défilement initiale réduite) et amélioration du contrôle du capybara.
* Réorganisation du calcul de l’intervalle de génération dans `update()` et suppression des incréments trop rapides de la difficulté.

## [1.3.0] - 2025-08-04

### Changed

* **Espacement accru des obstacles** : l’intervalle initial de génération est passé à 300 frames et ne descend plus en dessous de 240 frames. La diminution en fonction du score est extrêmement lente (0,1 frame par point) afin de conserver des obstacles rares pendant longtemps.
* **Ouvertures élargies** : les trous commencent à une hauteur de 400 px et ne passent jamais en dessous de 220 px, la fermeture étant très progressive (0,5 px par point). Cela rend le passage beaucoup plus facile, notamment au début de la partie.
* **Physique retouchée** : la gravité est abaissée à 0,06 et la vitesse horizontale initiale à 1 px/frame. La progression de la vitesse n’intervient plus qu’à partir de 8 points, augmentant de 0,08 à chaque fois.
* **Mécanique de plané améliorée** : un saut déclenche une impulsion plus faible (‑4,5) et active un plané de 30 frames. Pendant cette période, la chute est fortement ralentie et la vitesse verticale est plafonnée, offrant au joueur le temps de se réorienter.
* **Ailes redessinées façon Pégase** : de grandes ailes blanches composées de quatre plumes se déploient derrière le capybara. L’animation de battement dure 30 frames avec une amplitude de 60°, rendant le mouvement clairement visible pendant la phase de plané.

### Notes

Cette version se concentre sur l’accessibilité. Elle répond aux retours des utilisateurs en rendant le jeu beaucoup plus facile à prendre en main : obstacles espacés, plané efficace et ailes majestueuses. La difficulté augmente toujours avec le score, mais la progression est plus douce et laisse la place au plaisir de jouer.

## [1.4.0] - 2025-08-04

### Changed

* Le plané déclenché à chaque clic est légèrement raccourci (30 → 25 frames) et l’impulsion verticale réduite : le capybara plane un peu moins longtemps et monte moins haut après un clic.
* La vitesse horizontale initiale est augmentée (1,2 → 1,4 px/frame) pour rendre le déroulement du décor un peu plus rapide.
* La détection de collisions est plus permissive : la boîte de collision du capybara est réduite à 80 % de sa taille réelle, de sorte que seule la partie centrale du corps provoque une collision avec les obstacles.

### Notes

Cette itération finale ajuste finement la difficulté selon les derniers retours : un rythme légèrement plus vif, moins de plané et des collisions plus tolérantes. Elle conserve les ailes majestueuses et l’espacement généreux introduits précédemment, offrant un bon équilibre entre accessibilité et challenge.

## [2.0.0] - 2025-08-04

### Added

* **Page d’accueil revisitée** : ajout d’un visuel humoristique représentant un capybara ailé en style bande dessinée comme arrière‑plan du menu principal.  Ce visuel apporte une touche de fantaisie et améliore la lisibilité grâce à un léger voile sombre.
* **Capybara Runner (mode course)** : création d’un deuxième mini‑jeu inspiré du célèbre T‑Rex de Chrome.  Le capybara court dans un marais et doit sauter au‑dessus de troncs d’arbres.  Un chat noir le poursuit et saute automatiquement les obstacles, se rapprochant sans jamais le rattraper.  Un mode « ragondin fatigué » permet de jouer sans obstacles, avec des cœurs envoyés par le chat.
* **Fichiers `runner.html` et `runner.js`** : implémentation de la logique et de l’interface du jeu de course, gestion des états (menu, jeu, game over) et génération d'obstacles et de cœurs en mode ragondin.

### Changed

* **Navigation** : le menu principal (`index.html`) comporte désormais deux boutons : « Jouer » pour Flappy Capybara et « Mode Course » pour Capybara Runner.  Des liens permettent de revenir au menu depuis le second jeu.
* **Comportement au sol** : dans le mode course, toucher le sol ne provoque plus la fin de la partie ; le capybara continue à courir, comme dans le jeu original du dinosaure de Chrome.

### Fixed

* Correction d’un bug où la partie se terminait immédiatement au démarrage du mode course en raison d’un appel intempestif à `endGame()` lorsque le capybara touchait le sol.  Le jeu ne se termine plus que lors d’une collision avec un obstacle.

### Notes

Cette version marque un tournant dans le projet en ajoutant un second jeu complet et en soignant davantage l’interface.  L’utilisateur peut désormais choisir entre voler à travers des obstacles ou courir dans un marais poursuivi par un chat.  Le dépôt se rapproche de la vision finale décrite dans le plan initial, tout en conservant une esthétique cohérente et ludique.

## [2.1.0] - 2025-08-04

### Added

* **Carte de menu** : introduction d’une carte centrale au sein du menu principal pour afficher le titre « Capybara Games », le meilleur score et deux boutons repensés (« Flying Capy » et « Running Capy »).  Les écrans de menu et de Game Over du jeu de course utilisent désormais cette même carte pour plus de cohérence【798736409856352†screenshot】.
* **Nouveau décor de marais** : ajout d’une image de fond style cartoon avec nénuphars et roseaux pour embellir la partie basse de l’écran du mode Runner.  L’image est chargée depuis `assets/swamp_background.png` et dessinée dans le canvas.
* **Obstacles thématiques** : implémentation de cinq types d’obstacles spécifiques au marais (alligator, mangrove, porcupine, chasseur, marsupilami), chacun avec sa taille et son dessin personnalisé.

### Changed

* **Sauts améliorés dans Running Capy** : augmentation de la force de saut et ajout d’un temps de plané (gravité réduite pendant quelques frames) pour donner plus de contrôle au joueur.
* **Ragondin fatigué** : les cœurs envoyés par le chat apparaissent plus fréquemment, sont plus grands et se déplacent plus vite vers le capybara, rendant les bisous mieux visibles.
* **Interface épurée** : suppression du texte descriptif sur l’écran de démarrage du mode Runner et unification de la palette de couleurs et des polices pour améliorer l’esthétique générale.

### Fixed

* Correction d’un problème graphique où l’arrière‑plan du marais ne couvrait pas l’intégralité de la largeur du canvas sur certains formats d’écran.

### Notes

Cette version se concentre sur la qualité visuelle et l’ergonomie.  Les améliorations du saut rendent le mode course plus fluide et plaisant, tandis que les nouveaux obstacles et le décor enrichissent l’ambiance marécageuse.  L’interface est plus soignée grâce à l’introduction d’une carte centrale et à la suppression des textes inutiles.

## [2.2.0] - 2025-08-04

### Added

* **Nouvelles ressources graphiques** : ajout de deux sprites PNG pour les capybaras (`capybara_running.png` et `capybara_flying.png`) offrant un style cartoon plus abouti et une meilleure position du museau.  Ajout de trois images PNG pour les obstacles (`obstacle_gator.png`, `obstacle_log.png`, `obstacle_bush.png`) afin de remplacer les anciens dessins vectoriels.

### Changed

* **Mode Runner** : remplacement du dessin vectoriel du capybara par l’image importée, et refonte de la classe `RunnerObstacle` pour charger et afficher les PNG d’obstacles.  Les tailles des obstacles ont été recalibrées pour respecter les proportions des visuels.
* **Redimensionnement du canvas** : le canvas du mode course occupe désormais environ 90 % de la largeur de la fenêtre avec un ratio 16:9, ce qui recentre l’aire de jeu et empêche qu’elle ne reste confinée au coin inférieur gauche.
* **Physique ajustée** : réduction de la gravité (0,35) et abaissement de la vitesse initiale (3 px/frame) pour des sauts plus contrôlables et un démarrage moins rapide.  Le rythme d’apparition des obstacles est plus lent et la progression de la vitesse est adoucie (augmentation de 0,15 toutes les 5 points et diminution de 0,3 frame par point de score).
* **Interface uniforme** : harmonisation du centrage des canvas des deux jeux (`#gameCanvas` et `#runnerCanvas`) via la CSS.  Nettoyage de l’écran Runner (suppression des textes descriptifs) et remplacement du sol en bandes par un simple bandeau vert.

### Notes

Cette version apporte une série de retouches pour améliorer l’esthétique et l’ergonomie du projet.  Les nouveaux sprites donnent vie aux capybaras et aux obstacles tandis que les ajustements de la physique rendent le mode Runner plus progressif et mieux contrôlé.  Le repositionnement du canvas et l’uniformisation de l’interface terminent de polir l’ensemble.

## [2.3.1] - 2025-08-04

### Fixed

* **Bug de lancement des jeux** : correction d’un appel prématuré à `updateMenuScores()` dans `main.js` qui provoquait une erreur de référence et empêchait le démarrage du jeu Flying Capy.  Les scores sont désormais mis à jour après l’initialisation complète du DOM.

### Added

* **Méthode `getHitbox()`** pour les classes `RunnerObstacle` et `RunnerObstacle` (mode véhicule) afin de calculer une zone de collision réduite.  Cette amélioration rend la détection plus permissive et participe à l’assouplissement de la difficulté.

* **Voiture poursuivante conduite par un chat** : remplacement de l’ogre dans le mode véhicule par une voiture blanche avec un « G » bleu et une tête de chat animée.  La voiture suit le joueur à distance et saute les obstacles de manière moins mécanique grâce à un décalage aléatoire.

* **Tête de capybara dans la voiture du joueur** : la voiture bleue intègre un petit capybara qui dépasse du cockpit, renforçant l’identité visuelle du jeu.

### Changed

* **Collisions plus indulgentes** : utilisation des nouvelles hitboxes et désactivation des collisions avec les obstacles en mode ragondin fatigué.  Les obstacles restent visibles mais ne font plus perdre la partie dans ce mode.

* **Animation des pattes** : dans Running Capy, les pattes du capybara sont inclinées latéralement et animées rapidement pour un rendu plus comique.  Les pattes cessent de s’agiter lorsque l’animal est en l’air.

* **Comportement du chat** : le chat poursuivant dans Running Capy et le chat en voiture dans Ragondin Véhicule utilisent une distance d’anticipation aléatoire pour déclencher leurs sauts.  Cette modification évite les double‑sauts rigides et donne une impression plus réaliste.

* **Mode ragondin fatigué** : la vitesse des cœurs a été réduite et les obstacles ne déclenchent plus de collision.  Un nuage de cœurs apparaît avant la fin automatique du mode (30 secondes après que le chat rattrape le capybara).

* **Audio** : les mélodies 8 bits ont été raffinées et un bouton volume permanent est disponible sur toutes les pages de jeu.

* **Nettoyage** : suppression de toute référence textuelle à Enedis.  Le mode est renommé « Ragondin Véhicule » et utilise la clé `capyVehicleHighScore` pour stocker son score.

### Notes

Cette version poursuit l’amélioration du projet en corrigeant un bug bloquant et en réintroduisant des dessins vectoriels retravaillés pour le capybara, les obstacles et les véhicules.  La difficulté du Runner est assouplie grâce à des collisions plus permissives et un comportement de poursuite plus naturel.  L’ajout d’un chat en voiture et d’une tête de capybara dans la voiture bleue apporte une touche d’humour et d’homogénéité entre les modes.  Les joueurs bénéficient en outre d’une gestion du son intuitive et de mélodies plus abouties.

## [2.3.2] - 2025-08-06

### Added

* **Défilement parallaxe** : implémentation d’un décor à plusieurs couches pour les modes Runner et Ragon électrique.  Les différentes strates du marais se déplacent à des vitesses distinctes, créant un effet de profondeur.  Les couches se réinitialisent automatiquement lorsqu’elles ont entièrement défilé.

* **Progression de vitesse par palier** : la vitesse horizontale et la fréquence d’apparition des obstacles augmentent maintenant en deux phases : lente avant 50 points et plus rapide au‑delà.  Cette progression graduée rend le jeu accessible aux débutants tout en offrant un défi aux joueurs expérimentés.

* **Nouvelles anecdotes et blagues** : enrichissement des messages affichés à l’écran de Game Over avec des faits amusants sur les capybaras et le fromage.  Les images d’animaux utilisées en accompagnement se limitent désormais aux capybaras générés précédemment.

### Changed

* **Renommage du mode véhicule** : le mode « Ragondin Véhicule » devient **Ragon électrique**.  La page d’accueil, les boutons, les titres et la clé de stockage du meilleur score (`capyElectricHighScore`) ont été mis à jour pour refléter ce nouveau nom.

* **Voitures raccourcies et centrées** : les carrosseries des véhicules dans Ragon électrique ont été raccourcies (90 px) et repositionnées afin de libérer de l’espace et d’afficher clairement la voiture du chat.  La voiture poursuivante arbore désormais une lettre « G » et une tête de chat noire.

* **Poursuite adaptative** : le chat et la voiture du chat ajustent leur vitesse d’approche en fonction du score.  Ils se rapprochent progressivement du joueur sans le dépasser en mode normal.  En mode ragondin fatigué, le chat rejoint le capybara au bout d’environ 28 secondes, puis un nuage de cœurs s’affiche jusqu’à la fin automatique à 30 secondes.

* **Fin de partie améliorée** : suppression de la blague du fromage râpé et ajout de nouvelles anecdotes.  Les images d’animaux (capybaras) sont les seules utilisées pour illustrer les messages.

### Fixed

* Correction d’un problème d’alignement où la voiture du chat chevauchait la voiture du capybara sur certains écrans.  La position initiale de la voiture poursuivante est désormais ajustée pour rester visible sans chevauchement.

### Notes

Cette mise à jour mineure finalise la transition vers le mode Ragon électrique et ajoute une dimension visuelle supplémentaire grâce au défilement parallaxe.  Elle améliore l’accessibilité et la courbe de difficulté tout en consolidant la cohérence visuelle et narrative des jeux.

## [2.4.0] – 8 août 2025

### Changed

* **Suppression du parallaxe** : à la suite des retours négatifs, l’effet de défilement parallaxe a été retiré des modes Runner et Ragon électrique.  Le fond du marais est de nouveau statique, évitant les raccords disgracieux.
* **Difficulté et vitesse revisitées** : la vitesse de base et la fréquence des obstacles ont été augmentées pour les modes de course.  La vitesse croît désormais plus fortement après 50 points, et l’intervalle entre les obstacles diminue plus vite pour offrir une progression plus soutenue.
* **Flappy plus rapide** : dans Flying Capy, la vitesse horizontale initiale passe à 1,6 et l’intervalle de génération des obstacles est réduit.  Le rythme de jeu est ainsi plus dynamique dès les premières secondes.
* **Nouvelles anecdotes et images** : ajout d’une douzaine d’anecdotes et de blagues sur les capybaras et les fromages, et création de deux nouveaux visuels hybrides (capybara‑tortue et capybara‑pingouin) utilisés dans les écrans de fin.
* **Stockage du score électrique** : unification autour de la clé `capyElectricHighScore` et mise à jour des sélecteurs DOM (`best-score-electric`) dans le menu et dans le code des jeux.

### Fixed

* Correction de l’animation du chat : suppression de la tache blanche et repositionnement du corps pour laisser apparaître les pattes animées.  Les pattes pivotent légèrement pour un effet plus réaliste et comique.
* Correction de la logique de chargement dans `main.js` : le jeu volant s’initialise correctement après la mise à jour des identifiants et des clés de stockage.

### Removed

* Effet de parallaxe sur les arrières‑plans des modes Runner et Ragon électrique.

## [3.1.0] - 2025-08-05

### Added

* **Nuages et oiseaux dans Super Capy** : ajout de nuages et d’oiseaux décoratifs dans le ciel du jeu de plateforme.  Ces éléments se déplacent à une vitesse différente de la caméra pour créer un effet de parallaxe et donner une impression de vie même en l’absence d’obstacles.
* **Boîte et texte doré pour le score** : dans tous les modes, le score est désormais affiché au centre en haut de l’écran dans un texte doré en gras, avec une boîte sombre semi‑transparente pour améliorer la visibilité.  Les écrans de Game Over montrent uniquement la valeur numérique (sans « Score » ni « Record »).

### Changed

* **Jumping Capy renommé en Super Capy** : le mode plateforme est désormais intitulé « Super Capy » pour souligner son inspiration Mario.  Tous les fichiers HTML, le menu et les textes ont été mis à jour en conséquence.
* **Contrôles mobiles réparés** : les boutons tactiles (←, ↑, →) du mode Super Capy fonctionnent correctement grâce à l’ajout d’écouteurs `mousedown`/`mouseup` et `touchstart`/`touchend`, avec `preventDefault()` pour éviter les défilements accidentels.
* **Double saut et physique ajustée** : Super Capy permet maintenant d’effectuer deux sauts consécutifs avant de toucher le sol.  La gravité est réduite et l’impulsion de saut augmentée, donnant des sauts plus hauts et des retombées plus lentes.
* **Score basé sur les bonus** : dans Super Capy, le score n’augmente plus avec le temps ; seules les carottes et les patates collectées apportent respectivement 1 et 10 points.  Éliminer un ennemi ne rapporte plus de points.
* **Mode ragondin fatigué prolongé** : dans Running Capy, le chat met désormais environ 33 secondes à rattraper le capybara et la pluie de cœurs dure 10 secondes au lieu de 6.  Les joueurs disposent ainsi de davantage de temps pour profiter de ce mode paisible.

### Fixed

* **Format des scores** : suppression des préfixes « Score » et « Record » partout où ils apparaissaient.  Les valeurs numériques sont centrées et stylisées pour mieux ressortir.
* **Mobilité du capybara** : correction de l’oreille du capybara dans tous les modes (placée et dimensionnée correctement) et amélioration des dessins vectoriels pour donner un aspect plus naturel.


