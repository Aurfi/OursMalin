# Flappy Capybara

**Flappy Capybara** est une collection de mini‑jeux web mettant en scène un capybara malicieux.  Ce projet a démarré avec un jeu inspiré de **Flappy Bird** dans lequel le capybara s'envole entre des obstacles.  Au fil des versions, l'univers s'est enrichi : un jeu de course dans un marais, un jeu de véhicule électrique et désormais un jeu de plateforme façon **Super Mario** viennent compléter l'ensemble.  L'accueil du site a été entièrement revu : un menu dynamique liste automatiquement tous les modes disponibles (Flying Capy, Running Capy, Ragon électrique et **Super Capy**) et affiche le meilleur score enregistré pour chacun.  Chaque mode conserve une esthétique cartoon cohérente mais offre des mécaniques de gameplay distinctes.

Depuis la version 2, ce dépôt inclut également **Capybara Runner**, un jeu de course dans l’esprit du dinosaure de Chrome.  Le capybara court à travers un marais et doit sauter au‑dessus d’obstacles thématiques (alligators, troncs, buissons) tandis qu’un chat noir le suit au loin.  Le chat saute automatiquement les obstacles et se rapproche doucement sans jamais l’attraper.  Un mode « ragondin fatigué » permet de courir librement sans obstacles ; le chat envoie des cœurs en guise de bisous et ce mode dure maintenant beaucoup plus longtemps avant de s’achever afin que le joueur puisse flâner.

La version 3 introduit **Super Capy** (anciennement **Jumping Capy**), un jeu de plateforme à défilement horizontal inspiré de Super Mario.  Le capybara peut se déplacer vers la gauche ou la droite et sauter (avec la possibilité d’enchaîner un double saut) pour franchir des trous, des plateformes et des ennemis.  Les niveaux ne sont pas générés procéduralement : ils sont définis sous forme de tableaux, ce qui permet d’en créer de nouveaux très facilement sans toucher à la logique du moteur.  Des ennemis patrouillent sur les plateformes et peuvent être écrasés en leur sautant dessus, mais éliminer un ennemi ne rapporte plus de points.  Les bonus en forme de carotte ou de patate (entourés d’une bulle jaune translucide) sont placés à des positions fixes et constituent la seule source de points : chaque carotte vaut 1 point et chaque patate vaut 10 points.  Le score ne dépend plus du temps qui passe et s’affiche désormais au centre en haut de l’écran, en gras et en doré, sans mention « Score ».  Un drapeau marque la fin du niveau.  Sur mobile, des flèches directionnelles et un bouton de saut apparaissent à l’écran pour piloter le capybara sans clavier.

Ce dépôt contient le code du jeu, les ressources graphiques et sonores, un journal de progression et des informations sur les agents.  Il est structuré pour faciliter le suivi du projet et la compréhension du code.

## Fonctionnalités principales

* **Personnage :** un capybara mignon en style cartoon, rendu via Canvas.  Les oreilles ont été retravaillées et repositionnées pour ressembler à de vraies oreilles au lieu d’un museau mal placé dans les premiers prototypes.
* **Contrôles :** un clic de souris ou la touche Espace/Flèche haut déclenche un saut dans le mode Flying Capy.  Dans Running Capy et Ragon électrique, un clic/taper déclenche un saut par-dessus les obstacles.  Dans Jumping Capy, les flèches gauche/droite permettent de se déplacer latéralement et un saut est déclenché par la touche Flèche haut/Espace ou par le bouton tactile.
* **Obstacles :** des paires d’éléments verticaux générés procéduralement défilent horizontalement.
* **Score :** un point est gagné à chaque passage d’un obstacle (ou par la collecte de bonus selon le mode).  Le score est affiché sous forme de nombre doré centré en haut de l’écran, sans préfixe « Score ».  Une boîte sombre semi‑transparente améliore la lisibilité, et le meilleur score est sauvegardé dans `localStorage`.
* **Bonus :** des objets bonus apparaissent aléatoirement et offrent des points supplémentaires ou une invincibilité temporaire.
* **Effets sonores :** un petit bruit au saut, à la collision et lors de la collecte d’un bonus.
* **Multiplateforme :** jouable sur mobile et bureau sans installation, dans un navigateur moderne.

### Interface

* **Menu central** : un menu unique affiche automatiquement toutes les variantes du jeu (« Flying Capy », « Running Capy », « Ragon électrique » et « Jumping Capy »).  Chaque entrée indique le meilleur score enregistré et un bouton « Jouer » lance directement le mode choisi.  Le menu est entièrement dynamique : pour ajouter un nouveau mode, il suffit d’insérer une nouvelle entrée dans le tableau de configuration (`menu.js`).  L’image de tête de menu est un visuel héroïque généré via *imagegen* (un capybara sautant dans un décor pastel), entouré d’une légère ombre pour ressortir.

### Mode course (Capybara Runner)

* **Course infinie :** un capybara animé court à travers un décor de marais.  Une image de fond générée stylise la zone aquatique avec des nénuphars et des roseaux, tandis qu’un chat noir stylisé suit le joueur et saute automatiquement les obstacles générés.
* **Obstacles thématiques :** les anciens tuyaux sont remplacés par des obstacles variés inspirés du marais : alligators ouvrant leurs mâchoires, mangroves touffues, porcs‑épics hérissés, chasseurs avec fusil et marsupilamis au long appendice.  Ces obstacles sont sélectionnés aléatoirement et dessinés via Canvas.
* **Gravité et saut :** le saut est plus puissant qu'auparavant et déclenche une courte phase de plané pendant laquelle la gravité est réduite.  Cela offre plus de contrôle et permet de franchir les obstacles confortablement.  Toucher le sol ne termine pas la partie ; le capybara continue à courir.
* **Mode ragondin fatigué** : après une défaite, le joueur peut relancer une partie sans obstacles.  Le capybara court paisiblement tandis que le chat envoie des bisous plus gros et plus rapides qui se dirigent vers le joueur.  Ce mode dure maintenant beaucoup plus longtemps : le chat n'atteint le capybara qu'au bout d'environ 33 secondes, puis une pluie de cœurs se poursuit pendant près de 10 secondes avant la fin automatique de la partie.  Cette prolongation permet de savourer la scène et de se détendre.

### Mode plateforme (**Super Capy**)

* **Plateforme à la Mario** : le capybara court et saute à travers un niveau prédéfini.  Les segments de sol, les plateformes suspendues et les trous forment un parcours exigeant.  Le joueur peut déclencher un double saut (deux sauts consécutifs sans toucher le sol) et bénéficie d'une gravité plus douce pour retomber lentement.
* **Contrôles mobiles et clavier** : les flèches gauche/droite et la touche haut (ou espace) permettent d'avancer et de sauter.  Sur mobile, des boutons tactiles (←, ↑, →) apparaissent en bas de l'écran pour reproduire ces contrôles et fonctionnent aussi bien au toucher qu'au clic.
* **Niveaux modulaires** : les niveaux sont stockés dans des tableaux et peuvent être ajoutés ou modifiés sans toucher au moteur.  Le premier niveau comporte des plateformes surélevées, plusieurs trous dans le sol, des ennemis qui patrouillent et un drapeau final.  Des nuages et des oiseaux décoratifs défilent dans le ciel pour donner de la profondeur et une sensation de vitesse.
* **Ennemis et bonus** : des créatures simples (inspirées des goombas) marchent d'un bord à l'autre d'une plateforme.  Sauter sur un ennemi le fait disparaître sans ajouter de points ; un contact latéral termine la partie.  Des bonus en forme de carotte ou de patate flottent dans des bulles jaunes semi‑transparentes.  Chaque carotte vaut 1 point, chaque patate vaut 10 points.  Les bonus sont placés à des positions fixes et le score ne dépend plus de la durée de la partie.
* **But du niveau** : un drapeau marque la fin du niveau ; l'atteindre déclenche un écran de victoire avec le score final.  Comme dans les autres modes, le score est affiché en haut de l'écran sous forme de numéro doré au centre, sans préfixe.


## Améliorations récentes

La version 1.3 a introduit plusieurs améliorations majeures pour rendre le jeu plus accessible et plus esthétique :

* **Difficulté progressive adoucie :** les obstacles sont beaucoup plus espacés au début de la partie et les ouvertures sont très larges. La fréquence et la taille des passages se resserrent très lentement avec le score.
* **Plané réaliste :** un clic déclenche désormais une courte phase de plané d’environ 0,5 seconde pendant laquelle la chute est fortement ralentie. Cela permet de contrôler la hauteur avec plus de précision et réduit la frustration.
* **Ailes de Pégase animées :** le capybara arbore désormais deux grandes ailes blanches. Celles‑ci se déploient lors du saut et battent pendant toute la phase de plané, ajoutant une touche magique au personnage.
* **Physique retravaillée :** gravité adoucie, vitesse horizontale initiale réduite et progression plus lente de la vitesse pour un jeu plus serein.

## Structure du dépôt

La structure générale est décrite dans le fichier `tree.txt` généré à chaque étape importante du développement.  Les fichiers les plus importants sont :

* `index.html` : page web principale qui charge le jeu.
* `main.js` : logique JavaScript du jeu (mouvement, collisions, interface, bonus, etc.).
* `style.css` : styles CSS pour l’interface.
* `assets/` : contient les images SVG/PNG et éventuellement les sons générés.
* `progress_log.md` : journal chronologique des étapes réalisées, avec date et explications.
* `agents.md` : description des rôles et tâches lors de la conception.

## Installation et utilisation
L’archive finale contient tout le nécessaire pour jouer aux deux jeux localement.

Pour lancer les jeux :

1. **Extraire l’archive** dans un dossier de votre choix (par exemple `tar -xzf flappy_capybara_final_v2.tar.gz`).
2. **Servir localement ou ouvrir les fichiers** : vous pouvez ouvrir directement `index.html` et `runner.html` dans votre navigateur, mais certains navigateurs imposent des restrictions sur l’audio et le stockage en local.  La méthode la plus fiable consiste à servir le dossier avec un serveur HTTP :

   ```bash
   python3 -m http.server 8000
   ```

   Puis rendez‑vous sur `http://localhost:8000/index.html` pour jouer à Flappy Capybara ou sur `http://localhost:8000/runner.html` pour jouer à Capybara Runner.
3. **Utilisation** :
   * Sur la page d’accueil, cliquez sur **Jouer** pour lancer Flappy Capybara, ou sur **Mode Course** pour démarrer Capybara Runner.  Le décor de la page d’accueil met en avant un capybara ailé en style bande dessinée pour donner une touche humoristique au menu.
   * Les jeux répondent aux clics de souris, aux pressions du doigt (tactile) et aux touches `Espace`/`Flèche haut` du clavier.

Le projet est maintenant stable et complet. Les étapes détaillées de développement et les versions successives sont décrites dans `progress_log.md` et `CHANGELOG.md`.
