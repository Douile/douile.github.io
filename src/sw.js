"use strict";

const version = "0.4.0";
const cacheName = `portfolio-${version}`;
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache
        .addAll([
          "/",
          "/projects",
          "/contact",
          "/src/index.js",
          "/src/styles.css",
          "/content/projects.json",
          "/assets/chevron-left.svg",
          "/assets/chevron-right.svg",
          "/assets/icon-github.svg",
          "/assets/icon-image.svg",
          "/assets/icon-link.svg",
          "/assets/symbol-dark.svg",
          "/assets/symbol-light.svg",
        ])
        .then(() => self.skipWaiting());
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .open(cacheName)
      .then((cache) => cache.match(event.request, { ignoreSearch: true }))
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
