// Offline support for /guide only. Admin, orders, cart and API calls are never touched.
const VERSION = "guide-v1";
const STATIC = `${VERSION}-static`; // /_next/static (hashed files, safe to keep)
const PAGES = `${VERSION}-pages`; // /guide HTML + data
const OFFLINE_URL = "/offline.html";
const NET_TIMEOUT = 3000; // slow network: after 3 s use the saved copy

const isGuide = (u) => u.pathname === "/guide" || u.pathname.startsWith("/guide/");
const isStatic = (u) => u.pathname.startsWith("/_next/static/");
const cacheable = (res) => res.ok && !res.redirected && res.type !== "opaque";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res)) cache.put(req, res.clone()).catch(() => {});
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  const net = fetch(req).then((res) => {
    if (cacheable(res)) cache.put(req, res.clone()).catch(() => {});
    return res;
  });
  net.catch(() => {});
  const slow = new Promise((resolve) => setTimeout(() => resolve(null), NET_TIMEOUT));
  try {
    const first = await Promise.race([net, slow]);
    if (first) return first;
    return (await cache.match(req, { ignoreVary: true })) || (await net);
  } catch {
    const hit = await cache.match(req, { ignoreVary: true });
    if (hit) return hit;
    return req.mode === "navigate" ? (await cache.match(OFFLINE_URL)) || Response.error() : Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase etc. are handled by the app
  if (isStatic(url)) return event.respondWith(cacheFirst(req));
  if (isGuide(url)) return event.respondWith(networkFirst(req));
});

// The page sends the files it already loaded, so the very first visit is saved too.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "WARM") return;
  event.waitUntil(
    (async () => {
      for (const raw of event.data.urls ?? []) {
        let url;
        try {
          url = new URL(raw, self.location.origin);
        } catch {
          continue;
        }
        if (url.origin !== self.location.origin) continue;
        const name = isStatic(url) ? STATIC : isGuide(url) ? PAGES : null;
        if (!name) continue;
        const cache = await caches.open(name);
        if (await cache.match(url.href)) continue;
        try {
          const res = await fetch(url.href, isGuide(url) ? { headers: { Accept: "text/html" } } : undefined);
          if (cacheable(res)) await cache.put(url.href, res);
        } catch {}
      }
    })()
  );
});
