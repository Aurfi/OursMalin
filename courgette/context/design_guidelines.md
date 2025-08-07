# Charte graphique pour **Courgette Clicker**

Ce document définit les principes visuels et stylistiques à suivre pour la création de toutes les images et de l’interface utilisateur du jeu. L’objectif est d’obtenir une identité forte et cohérente qui mette en valeur l’humour potager tout en restant lisible et attractive sur navigateur.

## Style général

- **Ambiance potagère et rurale** : la majorité des visuels doivent se dérouler sur un fond de champ cultivé (alignements de courgettes, vues de potager, prairie). Ce fond doit rester le même pour tous les assets afin d’unifier l’esthétique. Préférez un *ciel bleu pastel* avec quelques nuages et des rangées de plants de courgettes vert tendre.
- **Technique** : opter pour un rendu **pixel art** ou **illustration vectorielle simplifiée**. Les contours doivent être nets et les volumes bien définis pour être lisibles à petite taille. Un style pixel art (16 bits) convient bien pour renforcer le côté rétro et ludique.
- **Palette de couleurs** : utiliser des verts variés (vert clair #A8C686, vert foncé #4E7D35), des bruns doux (#8E6642) pour la terre et des touches de jaune/orange (#F2C94C) pour apporter de la chaleur. La courgette‑chan peut avoir des joues légèrement rosées (#F59BB6) lorsqu’elle rougit.
- **Éléments humains/anthropomorphes** : la mascotte principale (*Courgette‑chan*) est une courgette personnifiée. Elle doit avoir un visage kawaii dans un style manga minimaliste (yeux ovales expressifs, petite bouche), des jambes et bras façon “stick figure” et des expressions timides ou espiègles selon l’action (rougir lorsqu’on clique, sourire satisfait lors des bonus). Les autres personnages (mamies, lycéens, traders…) peuvent être représentés de façon stylisée et humoristique mais restent secondaires : ils apparaîtront surtout sous forme d’icônes ou de petites illustrations sur les cartes des bâtiments.

## Interface utilisateur

- **Disposition** : les cartes de bâtiments et d’améliorations sont rectangulaires avec des bords arrondis. Elles sont disposées verticalement avec une marge constante. L’icône du bâtiment est placée à gauche, suivie du titre en gras, d’une courte description (texte par défaut gris foncé) et des statistiques alignées à droite (coût, possédés, bouton). Le bouton doit être bien visible, avec un fond vert lorsque la ressource est suffisante et gris/transparent lorsqu’il est désactivé.
- **Police** : utiliser une police sans‑serif simple et moderne (par exemple Poppins, Montserrat ou Inter) pour tout le texte. Les titres peuvent être légèrement plus gros et en gras. Les chiffres de production sont en monospace ou alignés pour faciliter la lecture.
- **Feedback visuel** : à chaque clic sur la courgette‑chan, celle‑ci doit “sursauter” légèrement (animation de type scale ou squash) et émettre un petit éclat lumineux. Les particules (petits +1, +10…) peuvent s’envoler en arc au dessus du bouton. Les messages d’actualité et d’achievements défilent dans un encart situé entre la courgette et la liste des bâtiments.

## Consignes pour la génération d’images

Lorsque vous préparez des prompts pour la génération d’assets :

- **Conservez toujours le même arrière‑plan** : un champ de courgettes en pixel art sous un ciel bleu clair. Cela garantit une cohérence d’ensemble et permet de détourer facilement les éléments au premier plan si nécessaire.
- **Spécifiez le style** : indiquez clairement “pixel art” ou “illustration vectorielle style cartoon” dans vos prompts. Évitez les styles réalistes qui jureraient avec l’interface.
- **Détourage et encadrement** : prévoyez que les icônes seront placées dans des cartes de l’UI. L’image générée doit donc comporter un sujet bien centré et suffisamment de marge transparente autour de lui pour faciliter le recadrage. Le fond sera soit conservé en totalité (pour les vignettes) soit partiellement masqué par des éléments d’interface.
- **Variété et humour** : chaque bâtiment ou amélioration doit avoir un visuel distinct mettant en scène l’idée de manière comique. Par exemple : une « Usine Ratatouille » montrera une chaîne de production de bocaux et un chef qui goûte la soupe ; le « Métavers Courgette » représentera des adolescents avec des casques VR tenant des courgettes flottantes ; le « CAC Courgette » montrera des traders excités devant un écran avec des courbes vertes en forme de courgettes.

## Accessibilité et lisibilité

- Assurez‑vous que les contrastes sont suffisants pour les utilisateurs ayant une vision réduite : texte foncé sur fond clair ou inversement.
- Les animations doivent être fluides mais discrètes. Évitez les clignotements rapides susceptibles de gêner les joueurs sensibles. Prévoyez une option pour désactiver les animations et les sons.

## Fichiers supplémentaires

Toutes les images générées devront être stockées dans un dossier `assets/` à la racine du projet (à créer lors de la génération) et référencées dans le manifeste `assets_manifest.md`. Chaque image doit être nommée avec un préfixe explicite (ex : `building_pot.png`, `global_up_tiktok.png`).

## Note sur le double sens de l’emoji 🍆

L’emoji de la courgette est souvent détourné de manière grivoise dans la culture internet. Le jeu exploite ce double sens avec humour : la mascotte Courgette‑chan peut rougir, détourner le regard ou afficher un air gêné lorsqu’on clique sur elle. Ces allusions restent suggestives et satiriques sans jamais tomber dans l’obscène, afin de conserver une tonalité amusante et accessible pour un public jeune.

Cette charte est évolutive : n’hésitez pas à la compléter au fur et à mesure que de nouveaux éléments visuels sont identifiés.