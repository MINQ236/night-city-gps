/* Cache local app shell only. NEVER cache live GPS, tile images, addresses, or routes. */
const CACHE='night-city-shell-v1-2026-10-26';
const FILES=['./','./index.html','./styles.css','./app.mjs','./nav-core.mjs','./providers.mjs','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('night-city-shell-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==self.location.origin||e.request.method!=='GET')return;const scope=new URL(self.registration.scope);if(!u.pathname.startsWith(scope.pathname))return;
 // Always attempt latest app files first. Fall back to cached shell only when offline.
 e.respondWith((async()=>{try{const response=await fetch(e.request);if(response.ok){const cache=await caches.open(CACHE);cache.put(e.request,response.clone()).catch(()=>{});}return response}catch(_){return (await caches.match(e.request,{ignoreSearch:true}))||Response.error()}})());
});
