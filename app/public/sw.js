/*
 * Service-worker kill switch. The old PWA (frontend/, vite-plugin-pwa) registered /sw.js and
 * precached its app shell, so returning visitors would keep getting the old app from cache. Browsers
 * re-check /sw.js on navigation; this version clears every cache, unregisters itself and reloads open
 * tabs, after which the Expo web build is served straight from CloudFront.
 *
 * Keep it deployed for a few months after the switch, then delete it.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.navigate(client.url);
    })(),
  );
});
