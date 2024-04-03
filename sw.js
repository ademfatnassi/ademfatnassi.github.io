/*
 Copyright 2016 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// Names of the two caches used in this version of the service worker.
// Change to v2, etc. when you update any of the local resources, which will
// in turn trigger the install event again.
const PRECACHE = "precache-v1";
const RUNTIME = "runtime";

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
  "index.html",
  "./", // Alias for index.html
  "./assets/css/main.css",
  "./assets/documents/resume.pdf",
  "./assets/js/main.js",
  "./assets/images/profile-image.webp",
  "./assets/images/work-afce.webp",
  "./assets/images/work-CllgChat.webp",
  "./assets/images/work-ebp.webp",
  "./assets/images/work-lys.webp",
  "./assets/images/work-mizy.webp",
  "./icon-192x192.png",
  "./icon-256x256.png",
  "./icon-384x384.png",
  "./icon-512x512.png",
  "./maskable_icon.png",
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await cache.addAll(PRECACHE_URLS);
    })()
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener("activate", (event) => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener("fetch", (event) => {
  if (
    !(
      event.request.url.startsWith("http:") ||
      event.request.url.startsWith("https:")
    )
  ) {
    return;
  }

  // Skip cross-origin requests, like those for Google Analytics.
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(PRECACHE);
      const cachedResponse = await cache.match(event.request);

      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const response = await fetch(event.request);
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone the response as the fetch operation consumes the response stream
        const responseToCache = response.clone();
        cache.put(event.request, responseToCache);
        return response;
      } catch (error) {
        // Handle exceptions (e.g., network issues)
        console.error("Fetch failed; returning cached response.", error);
        return cachedResponse;
      }
    })()
  );
});
