const CACHE_NAME = 'bhusetu-cache-v1';
const QUEUE_NAME = 'bhusetu-sync-queue';

// URLs to precache for offline shell
const PRECACHE_URLS = [
  '/',
  '/workspace',
  '/manifest.json',
  '/icon512_rounded.png',
  '/icon512_maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET and POST/PATCH
  if (request.method === 'GET') {
    // Network-first for API, Cache-first for static assets
    if (request.url.includes('/api/')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
            return response;
          })
          .catch(() => caches.match(request))
      );
    } else {
      // Stale-while-revalidate for pages and assets
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
            return networkResponse;
          }).catch(() => {});
          return cachedResponse || fetchPromise;
        })
      );
    }
  } else if (['POST', 'PATCH', 'PUT'].includes(request.method) && request.url.includes('/api/')) {
    // Handle offline mutations
    event.respondWith(
      fetch(request.clone()).catch(async (error) => {
        // If offline, store the request in IndexedDB
        await storeRequestForSync(request.clone());
        
        // Return 503 Service Unavailable with a specific header/body 
        // so the UI knows it was queued for offline sync, rather than a generic mock success
        return new Response(JSON.stringify({ 
          success: false, 
          queued: true,
          message: 'You are offline. Your changes have been saved locally and will sync when you reconnect.' 
        }), {
          headers: { 'Content-Type': 'application/json', 'X-Offline-Queued': 'true' },
          status: 503
        });
      })
    );
  }
});

// Background Sync (if supported by browser)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-mutations') {
    event.waitUntil(syncOfflineMutations());
  }
});

// IndexedDB Helper for storing failed requests
async function storeRequestForSync(request) {
  const db = await openDB();
  const body = await request.text();
  const tx = db.transaction('requests', 'readwrite');
  const store = tx.objectStore('requests');
  store.add({
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body: body,
    timestamp: Date.now()
  });
}

// Replay stored requests (Now handled primarily by OfflineSyncUI in the frontend)
async function syncOfflineMutations() {
  // We leave this mostly empty since the main thread handles sync with idempotency and UI feedback
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BhuSetuOfflineDB', 2);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
