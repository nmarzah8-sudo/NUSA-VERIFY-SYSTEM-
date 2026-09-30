const CACHE_NAME = "nusa-verify-shell-v1";
const SHELL_FILES = [
  "./css/style.css",
  "./js/config.js",
  "./js/supabase.js",
  "./js/auth.js",
  "./js/dashboard.js",
  "./js/verify.js",
  "./js/qr.js",
  "./js/pwa.js",
  "./manifest.json",
  "./assets/app-icon.svg",
  "./index.html",
  "./login.html",
  "./dashboard.html",
  "./verify.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_FILES.map((file) => new URL(file, self.registration.scope)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("nusa-verify-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.mode === "navigate") return;
  if (!/\/(?:css|js)\/|\/manifest\.json$|\/assets\/app-icon\.svg$/.test(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fetch(request);
  })());
});