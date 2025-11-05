// public/pwabuilder-sw.js
const CACHE = "pwabuilder-v1";
const OFFLINE_URL = "/offline.html"; // 없으면 이 라인과 관련 처리 제거

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cache.addAll([
            "/",
            "/index.html",
            "/manifest.json",
            "/icons/icon-192.png",
            "/icons/icon-512.png"
            // OFFLINE_URL // 오프라인 페이지를 둘 경우 포함
        ]);
        self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => k !== CACHE && caches.delete(k)));
        self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    event.respondWith((async () => {
        try {
            // 네트워크 우선, 실패 시 캐시
            const net = await fetch(req);
            const cache = await caches.open(CACHE);
            cache.put(req, net.clone());
            return net;
        } catch {
            const cached = await caches.match(req);
            if (cached) return cached;
            // return caches.match(OFFLINE_URL); // 오프라인 페이지 있을 경우
            return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        }
    })());
});
