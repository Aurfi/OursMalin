# Manifest des assets à produire

Ce fichier répertorie les visuels nécessaires pour le jeu **Courgette Clicker**. Chaque entrée indique un nom de fichier cible (sans l’extension), une brève description de son contenu, et des remarques pour la génération (style, éléments à inclure). Tous les visuels doivent respecter la charte graphique définie dans `design_guidelines.md`.

## Liste des assets

| Nom de fichier | Description | Remarques |
|---|---|---|
| `icon_pot` | Pot de fleurs avec une petite courgette, sur le fond champ de courgettes | Style pixel art, couleurs douces |
| `icon_garden` | Jardin partagé avec plusieurs plants et un panneau « AMAP » | Ajoutez deux ados jardinant |
| `icon_grandma` | Mamie en tablier tenant une grosse courgette | Visage souriant, bonnet pastel |
| `icon_farm` | Ferme familiale avec grange rouge et champs | Un chien et un tracteur en arrière‑plan |
| `icon_market` | Marché de rue avec étals de légumes et pancartes | Inclure des jeunes qui achètent |
| `icon_ferme_xxl` | Exploitation XXL avec robots et drones au‑dessus des champs | Montrez des machines futuristes |
| `icon_usine_ratatouille` | Chaîne de production de bocaux de courgettes | Chef cuisinier avec toque |
| `icon_lab_cnrs` | Laboratoire avec éprouvettes et courgettes géantes | Scientifiques en blouses |
| `icon_culte_courgette` | Temple avec vitraux en forme de courgette et fidèles en robe verte | Ambiance mystique |
| `icon_cac_courgette` | Traders excités devant des écrans montrant des courbes de courgettes | Ajoutez un journal financier |
| `icon_base_kourou` | Fusée au décollage transportant des caisses de courgettes | Vue du centre spatial en pixel art |
| `icon_serres_montblanc` | Serres high‑tech sur fond de montagnes enneigées | Courgettes géantes sous verre |
| `icon_metavers` | Adolescents portant des casques VR manipulant des courgettes virtuelles | Arrière‑plan numérique |
| `icon_chatcourgette` | Robot/IA en forme de courgette avec bulles de dialogue | Inclure l’emoji 🍆 stylisé |
| `icon_bigbang` | Explosion cosmique transformant les étoiles en courgettes | Couleurs vives et halos |
| `icon_up_tiktok` | Icône d’engrais TikTok avec smartphone et courgettes dansantes | Logo TikTok stylisé |
| `icon_up_raclette` | Raclette Party : appareil à raclette avec courgettes et fromage | Ambiance conviviale |
| `icon_up_robots` | Robots étudiants récoltant des courgettes au lycée agricole | Casquettes et salopettes |
| `icon_up_pac` | Quotas PAC 2025 : documents administratifs et sacs de courgettes | Drapeau européen discret |

## Éléments réalisés

| Fichier | Détails |
|---|---|
| `assets/icon_pot.png` | Icône du Pot de fleurs générée en pixel art selon la charte : pot en terre cuite avec une petite courgette sur un champ de courgettes et un ciel bleu pastel. |
| `assets/icon_garden.png` | Icône du Jardin partagé : plusieurs plants de courgettes cultivés par deux adolescents. |
| `assets/icon_grandma.png` | Icône de Mamie Paulette : grand-mère souriante en tablier pastel tenant une grosse courgette. |
| `assets/icon_farm.png` | Icône de la Ferme familiale : grange rouge, rangées de courgettes, chien et tracteur. |

| `assets/background_field.png` | Image de fond principale utilisée pour l’interface : paysage de potager en pixel art avec un ciel pastel, des nuages et des rangées de plants de courgettes. |
| `assets/courgette_chan.png` | Sprite principal de Courgette‑chan : courgette anthropomorphe kawaii avec grands yeux et petit sourire, sur un fond de potager cohérent. |
| `assets/courgette_chan_blush.png` | Variante rougissante de Courgette‑chan affichée brièvement lors des clics : mêmes proportions mais joues rosies et sourire timide. |
| `assets/icon_lab.png` | Icône du Lab du CNRS : scientifiques en blouse modifiant l’ADN des courgettes. |
| `assets/icon_portal.png` | Icône du Métavers Courgette : adolescents portant des casques VR et manipulant des courgettes virtuelles. |
| `assets/icon_ai.png` | Icône de l’Algorithme ChatCourgette : robot en forme de courgette avec bulles de dialogue. |
| `assets/icon_singularity.png` | Icône du Big Bang Courgette : explosion cosmique transformant les étoiles en courgettes. |
| `assets/icon_up_engrais.png` | Icône de l’amélioration Engrais TikTok : smartphone avec courgettes dansantes et logo TikTok stylisé. |
| `assets/icon_up_raclette.png` | Icône Raclette Party : appareil à raclette, fromage et courgettes. |
| `assets/icon_up_robots.png` | Icône Robots du lycée agricole : élèves en salopette construisant des robots moissonneurs. |
| `assets/icon_up_pac.png` | Icône Quotas PAC 2025 : documents administratifs et sacs de courgettes devant un drapeau européen. |
| `assets/icon_up_influence.png` | Icône Influenceuse Courgette : streamer tendance photographiant des courgettes avec un smartphone et un micro. |
| `assets/icon_lycee.png` | Icône du Lycée agricole : bâtiment scolaire entouré de serres et de jeunes étudiants récoltant des courgettes. |
| `assets/icon_reseau.png` | Icône du Réseau Courgette : plusieurs fermes connectées par des fils lumineux ou des ondes symbolisant la blockchain. |

## Fichier audio

Des sons simples seront nécessaires : un son de « pop » ou de « miaulement kawaii » lors du clic sur la courgette, et un léger carillon pour la validation des achievements ou des easter eggs. Ces fichiers devront être au format `.mp3` ou `.ogg` et respecter des licences libres.

## Notes complémentaires

- Le nom de fichier définit le préfixe ; l’extension (.png ou .webp) sera choisie lors de la création. 
- Lors de la génération, veillez à conserver un fond cohérent comme indiqué dans la charte et à laisser des marges pour l’intégration dans l’UI.