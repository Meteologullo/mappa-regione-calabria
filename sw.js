// sw.js
const VERSION = 'v4';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const PRECACHE_URLS = [
  '/',                     // index prerenderizzato
  '/index.html',
  '/src/mlgmap.html',      // sorgente (fallback)
  '/scripts/stazioni.json' // snapshot stazioni (se presente)
];

// CDN/Libs usate dalla pagina (aggiungi qui le tue, se servono)
const LIBS = [
  'https://unpkg.com/leaflet/dist/leaflet.css',
  'https://unpkg.com/leaflet/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js',
  'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css'
];
PRECACHE_URLS.push(...LIBS);

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE_URLS).catch(()=>{}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('static-') || k.startsWith('runtime-')) && k !== STATIC_CACHE && k !== RUNTIME_CACHE ? caches.delete(k) : undefined));
    await self.clients.claim();
  })());
});

// runtime caching:
// - Tiles OSM → cache-first (con fallback rete) + TTL implicito
// - JSON/dati → stale-while-revalidate
const OSM_RE = /^https:\/\/[abc]\.tile\.openstreetmap\.org\//;

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // ignora metodi non-GET
  if (req.method !== 'GET') return;

  // tiles OSM: cache-first
  if (OSM_RE.test(req.url)) {
    e.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req, {mode:'cors'});
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return hit || Response.error();
      }
    })());
    return;
  }

  // tutto il resto: stale-while-revalidate
  e.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const hit = await cache.match(req);
    const fetchPromise = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => hit || Response.error());
    return hit || fetchPromise;
  })());
});
