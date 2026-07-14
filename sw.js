// 極簡 service worker：唯一目的是讓「加入主畫面／安裝為應用程式」可以運作。
// 策略固定用 network-first（永遠優先拿最新內容，離線時才退回快取），
// 避免像 GitHub Pages CDN 快取那樣把舊內容卡住的問題。
const CACHE_NAME = 'daily-english-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
