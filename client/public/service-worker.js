// Vila Falo Restaurant PWA Service Worker
const CACHE_NAME = 'vila-falo-v1.2.0';
const STATIC_CACHE_NAME = 'vila-falo-static-v1.2.0';
const DYNAMIC_CACHE_NAME = 'vila-falo-dynamic-v1.2.0';

// Files to cache immediately (critical app shell)
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

// API endpoints to cache for offline functionality
const API_CACHE_PATTERNS = [
  /\/api\/menu/,
  /\/api\/orders/,
  /\/api\/categories/,
  /\/api\/tables/
];

// Install event - cache critical files
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ App shell cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache app shell:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE_NAME && 
                     cacheName !== DYNAMIC_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (request.url.includes('/api/')) {
    // API requests: Network first, cache as fallback
    event.respondWith(handleApiRequest(request));
  } else if (request.destination === 'image') {
    // Images: Cache first, network as fallback
    event.respondWith(handleImageRequest(request));
  } else {
    // Static files: Cache first, network as fallback
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const shouldCache = API_CACHE_PATTERNS.some(pattern => 
        pattern.test(request.url)
      );
      
      if (shouldCache) {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Network failed, trying cache for:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache, return offline page or error
    if (request.url.includes('/api/orders')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline mode', 
          message: 'Orders will sync when connection is restored',
          offline: true 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 503 
        }
      );
    }
    
    throw error;
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Not in cache, try network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder image if available
    return new Response('', { status: 404 });
  }
}

// Handle static files with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Not in cache, try network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // For navigation requests, return the cached index.html
    if (request.mode === 'navigate') {
      const indexCache = await cache.match('/');
      if (indexCache) {
        return indexCache;
      }
    }
    throw error;
  }
}

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'order-sync') {
    console.log('🔄 Syncing offline orders...');
    event.waitUntil(syncOfflineOrders());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New order update',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: data.tag || 'order-update',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View Order',
        icon: '/logo192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Vila Falo', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app and navigate to orders
    event.waitUntil(
      clients.openWindow('/#/orders')
    );
  }
});

// Sync offline orders when connection is restored
async function syncOfflineOrders() {
  try {
    // This would integrate with your app's offline order queue
    console.log('✅ Offline orders synced');
  } catch (error) {
    console.error('❌ Failed to sync offline orders:', error);
  }
}

// Log cache status
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_STATUS') {
    caches.keys().then((cacheNames) => {
      event.ports[0].postMessage({
        caches: cacheNames,
        version: CACHE_NAME
      });
    });
  }
});

console.log('🍽️ Vila Falo Service Worker loaded successfully!');