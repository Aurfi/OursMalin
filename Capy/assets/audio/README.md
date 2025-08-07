# Répertoire des sons pour Capy Mon

Ce dossier contient tous les fichiers audio utilisés par le jeu **Capy Mon**.  Les fichiers présents ici sont des *espaces réservés* (placeholders) : ils sont vides ou très courts et servent uniquement à assurer que le chargement des ressources fonctionne.  Vous pouvez les remplacer par vos propres sons au format OGG pour enrichir l'expérience de jeu.

## Sons d’ambiance par biome

Chaque biome dispose de son propre son d’ambiance.  Ces fichiers seront lus en boucle lorsque le joueur explore la zone correspondante :

| Fichier                     | Description                           |
|-----------------------------|---------------------------------------|
| `ambience_forest.ogg`      | Ambiance de la forêt (chants d’oiseaux, vent). |
| `ambience_desert.ogg`      | Ambiance du désert (vent, bruissements). |
| `ambience_savane.ogg`      | Ambiance de la savane (insectes, herbes). |
| `ambience_marais.ogg`      | Ambiance du marais (grenouilles, eau stagnante). |
| `ambience_montagne.ogg`    | Ambiance des montagnes (vent froid, écho). |
| `ambience_plage.ogg`       | Ambiance de la plage (vagues, mouettes). |

## Sons de combat

Ces sons sont déclenchés lorsqu’un combat démarre :

| Fichier                | Utilisation                                          |
|------------------------|------------------------------------------------------|
| `battle_wild.ogg`      | Combat contre un animal sauvage.                     |
| `battle_trainer.ogg`   | Combat contre un dresseur ou un braconnier.          |

## Sons système

Ces sons ponctuent les différentes actions et menus du jeu :

| Fichier             | Description                                             |
|---------------------|---------------------------------------------------------|
| `gameover.ogg`      | Joué lorsque l’équipe du joueur est entièrement vaincue. |
| `notification.ogg`  | Notification générique (apparition d’objet, message).   |
| `menu_open.ogg`     | Ouverture d’un menu (boutique, options, etc.).          |
| `heal.ogg`          | Utilisation d’un objet de soin ou passage à la tente.    |

## Remplacement des sons

Chaque fichier audio est actuellement vide.  Pour personnaliser les effets sonores :

1. Préparez vos propres fichiers OGG (format recommandé pour le web).
2. Renommez-les pour qu’ils correspondent aux noms de fichiers ci-dessus.
3. Remplacez les fichiers existants dans ce dossier par vos versions.

Veillez à conserver les mêmes noms de fichiers afin que le jeu continue de charger correctement les sons.