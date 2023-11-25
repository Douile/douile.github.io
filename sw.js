"use strict";const version="0.4.0",cacheName="portfolio-"+version;self.addEventListener("install",s=>{s.waitUntil(caches.open(cacheName).then(s=>s.addAll(["/","/projects","/contact","/src/index.js","/src/styles.css","/content/projects.json","/assets/chevron-left.svg","/assets/chevron-right.svg","/assets/icon-github.svg","/assets/icon-image.svg","/assets/icon-link.svg","/assets/symbol-dark.svg","/assets/symbol-light.svg"]).then(()=>self.skipWaiting())))}),self.addEventListener("activate",s=>{s.waitUntil(self.clients.claim())}),self.addEventListener("fetch",e=>{e.respondWith(caches.open(cacheName).then(s=>s.match(e.request,{ignoreSearch:!0})).then(s=>s||fetch(e.request)))});