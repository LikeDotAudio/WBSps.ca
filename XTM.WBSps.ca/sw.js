/*! Copyright (c) 2026 Ward-Beck Systems (Ward-Beck.ca). All rights reserved. */
// Cache-first service worker.
//
// First visit: the site is served from the network and every app file is stored on the
// user's machine (Cache Storage). Every later visit: the page is served instantly from that
// local copy, then the network copy is fetched in the background and compared with the
// stored one. If it changed, the new version is stored (and its new assets pre-fetched) and
// the page is told an update is ready; it is used on the next load.

const CACHE = 'wbs-xtm-app';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './meter-dsp.js',
  './meter-dsp.wasm',
  './meter-processor.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async (c) => {
        await Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
        // Also store the page's own hashed script/stylesheet so the very next load works offline
        const page = await c.match(new URL('./', self.registration.scope).href);
        if (page) {
          const html = await page.clone().text();
          const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
          await Promise.all(assets.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isHashedAsset = (url) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.[a-z0-9]+$/.test(url.pathname);
// Only the app's own page (scope root or scope/index.html); any other page is left to the network.
const isPage = (req, url) => {
  const root = new URL('./', self.registration.scope).pathname;
  return url.pathname === root || url.pathname === root + 'index.html';
};

async function notifyClients(msg) {
  const all = await self.clients.matchAll({ type: 'window' });
  all.forEach((c) => c.postMessage(msg));
}

/** Background compare: fetch the page fresh; if it differs from the stored copy, store it,
 *  pre-fetch the assets it references, drop assets no longer referenced, and notify. */
async function revalidatePage(req) {
  const cache = await caches.open(CACHE);
  const key = new URL('./', self.registration.scope).href;
  let fresh;
  try {
    fresh = await fetch(req.url, { cache: 'no-store' });
  } catch (_) {
    return; // offline: keep serving the stored copy
  }
  if (!fresh || !fresh.ok) return;
  const freshText = await fresh.clone().text();
  const stored = await cache.match(key);
  const storedText = stored ? await stored.text() : null;
  if (freshText === storedText) return; // unchanged

  const assets = [...freshText.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => new URL(m[1], key).href);
  await Promise.all(assets.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
  for (const u of ['./meter-dsp.js', './meter-dsp.wasm', './meter-processor.js', './manifest.json']) {
    await cache.add(new Request(new URL(u, key).href, { cache: 'reload' })).catch(() => {});
  }
  await cache.put(key, new Response(freshText, { headers: fresh.headers }));
  await cache.put(new URL('./index.html', key).href, new Response(freshText, { headers: fresh.headers }));

  // Remove hashed assets the new page no longer uses
  const keep = new Set(assets);
  for (const r of await cache.keys()) {
    const u = new URL(r.url);
    if (isHashedAsset(u) && !keep.has(r.url)) await cache.delete(r);
  }
  if (storedText !== null) notifyClients({ type: 'xtm-update-ready' });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return; // the browser checks the worker itself

  // Page: serve stored copy at once, compare with the network in the background
  if (isPage(req, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const key = new URL('./', self.registration.scope).href;
      const stored = await cache.match(key);
      if (stored) {
        event.waitUntil(revalidatePage(req));
        return stored;
      }
      // First visit: network, then store
      const res = await fetch(req);
      if (res.ok) {
        await cache.put(key, res.clone());
      }
      return res;
    })());
    return;
  }

  // Any other page on the site: network first, stored copy only when offline
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(async () => (await caches.match(req)) || Response.error()));
    return;
  }

  // Everything else: cache first; on a miss, fetch and store.
  // Un-hashed files (wasm, worklet, icons) are also refreshed in the background.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: !isHashedAsset(url) });
    if (hit) {
      if (!isHashedAsset(url)) {
        event.waitUntil(fetch(req, { cache: 'no-store' }).then((r) => r.ok && cache.put(req, r)).catch(() => {}));
      }
      return hit;
    }
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  })());
});
