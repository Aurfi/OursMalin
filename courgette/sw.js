// Bump the cache version whenever core files such as main.js or style_v2.css change.
// This invalidates the previous cache and forces the service worker to fetch
// updated files from disk instead of serving stale resources. Without this, any
// changes to the JavaScript or styling would be ignored until the user clears
// their browser data.
// Incrémenter la version du cache pour forcer la mise à jour et inclure de nouveaux assets composites
// Bump cache version due to new face assets, updated confetti behaviour and enlarged courgette
// Bump cache version due to UI redesign: centered courgette, repositioned boutique button and new settings layout
// Bump the cache version to force users' browsers to pick up the new assets.
// A new version is necessary whenever we add files to the cache list (like
// additional locale JSON files or when style/js has been updated).  Without
// bumping the version the service worker might continue serving the old
// cache and ignore the newly added capybara language file, causing the
// dropdown to revert to French.  See README for details.
// Cache version bumped to include news.json for offline news headlines.
// Incrémenter le nom du cache pour invalider l'ancien et forcer le service
// worker à récupérer les nouvelles versions des scripts et feuilles de style.
const CACHE_NAME = 'courgette-cache-v19';
const urlsToCache = [
  '/',
  'clicker.html',
  'css/style_v2.css',
  'js/main.js',
  'news.json', // Dynamic news feed
  'manifest.webmanifest',
  'locales/fr.json',
  'locales/en.json',
  // Precache other locale files so they can be fetched when running over
  // file://.  Without adding these to the cache, fetch() will fail and
  // languages such as Russian, Japanese and the capybara tongue will
  // silently fall back to French.  The capybara language in particular
  // lives in locales/capy.json, so we cache it here too.
  'locales/ru.json',
  'locales/zh.json',
  'locales/ja.json',
  'locales/capy.json',
  // Core icons needed at launch
  'assets/icon_pot.png',
  'assets/icon_garden.png',
  'assets/icon_grandma.png',
  'assets/icon_farm.png',
  // New layered courgette assets to ensure they are available offline
  'assets/courgette_body.png',
  'assets/courgette_arms_down.png',
  'assets/courgette_arms_up.png',
  'assets/courgette_arms_wiggle.png',
  // Separate face layers used for dynamic expressions
  'assets/face_neutral.png',
  'assets/face_blush.png',
  'assets/face_surprise.png',
  // Overlay remains for lighting
  'assets/courgette_overlay.png',
  // Capybara journalist for the news banner
  'assets/capybara.png'
  ,
  // Nouvelles images composites de Courgette‑chan (visages intégrés)
  'assets/courgette_body_neutral.png',
  'assets/courgette_body_open.png',
  'assets/courgette_body_half.png',
  'assets/courgette_body_click.png',
  // Nouvelle base sans visage et calques de visage nettoyés
  'assets/courgette_body_no_face_user.png',
  'assets/face_neutral_overlay.png',
  'assets/face_open_overlay.png',
  'assets/face_half_overlay.png',
  'assets/face_click_overlay.png',
  // Nouvelle base et expressions utilisées dans la version 2025
  'assets/courgette_base.png',
  'assets/face_neutral_user_new.png',
  'assets/face_open_user_new.png',
  'assets/face_half_user_new.png',
  'assets/face_click_user_new.png'
  ,
  // Latest face assets with improved design (rosy cheeks)
  'assets/face_neutral_user_latest.png',
  'assets/face_open_user_latest.png',
  'assets/face_half_user_latest.png',
  'assets/face_click_user_latest.png'
  ,
  // Versioned files to bypass cache when styles or scripts change.  These
  // correspond to the query-string versions defined in clicker.html.  By
  // caching the new version numbers, the service worker will serve the
  // up-to-date CSS and JS rather than the older v8/v14.  Should you bump
  // the version number in clicker.html later on, remember to update
  // these entries and increment CACHE_NAME accordingly.
  'css/style_v2.css?v=19',
  // Prise en compte de la nouvelle version du script principal afin que
  // l’application récupère bien main.js?v=35 lors du précaching.
  'js/main.js?v=35'
  ,
  // Gear icon used for the settings button
  'assets/icon_gear.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});