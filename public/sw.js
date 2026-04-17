const buildId = new URL(self.location.href).searchParams.get("build") || "dev";
const cachePrefix = "aya-mobile";
const staticCacheName = `${cachePrefix}-static-${buildId}`;
const pageCacheName = `${cachePrefix}-pages-${buildId}`;
const precacheUrls = ["/", "/login", "/unsupported-device", "/aya-icon-192.png", "/aya-icon-512.png"];

function isSensitivePath(pathname) {
  return pathname.startsWith("/api/") || pathname.startsWith("/auth/") || pathname.startsWith("/supabase/");
}

async function cacheFirst(request) {
  const cache = await caches.open(staticCacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(pageCacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    throw new Error("Offline and no cached page is available.");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(staticCacheName);
      await cache.addAll(precacheUrls);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key.startsWith(cachePrefix) && key !== staticCacheName && key !== pageCacheName)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (isSensitivePath(url.pathname) || url.pathname === "/manifest.webmanifest") {
    return;
  }

  if (request.mode === "navigate") {
    if (isSensitivePath(url.pathname)) {
      return;
    }

    event.respondWith(networkFirstPage(request));
    return;
  }

  if (request.destination === "script" || request.destination === "style" || request.destination === "image" || request.destination === "font") {
    event.respondWith(cacheFirst(request));
  }
});
