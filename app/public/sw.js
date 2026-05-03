const CACHE_NAME = 'doe-auto-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // blob URL, API 호출, chrome-extension 등은 Service Worker가 가로채지 않음
  if (
    url.startsWith('blob:') ||
    url.includes('/api/') ||
    url.startsWith('chrome-extension') ||
    e.request.method !== 'GET'
  ) {
    return; // 브라우저 기본 동작으로 위임
  }

  // 동일 출처의 GET 요청만 캐시 전략 적용
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
  }
});
