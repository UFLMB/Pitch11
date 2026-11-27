const CACHE_NAME='pitch11-shell-v7';
const SHELL=['./','./index.html','./manifest.webmanifest','./assets/pitch11-icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pitch11-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    const networkResponse=fetch(request);
    event.waitUntil(networkResponse.then(response=>{
      if(response.ok)return caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
    }).catch(()=>{}));
    event.respondWith(networkResponse.catch(()=>caches.match(request).then(cached=>cached||caches.match('./index.html'))));
    return;
  }
  // Scripts and ES modules must be refreshed from the network first. The old
  // cache-first policy could keep an outdated stadium runtime indefinitely.
  if(request.destination==='script'||/\\.(?:js|mjs|glb)$/.test(url.pathname)){
    const networkResponse=fetch(request);
    event.waitUntil(networkResponse.then(response=>{
      if(response.ok&&response.type==='basic')return caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
    }).catch(()=>{}));
    event.respondWith(networkResponse.catch(()=>caches.match(request)));
    return;
  }
  const networkResponse=fetch(request);
  event.waitUntil(networkResponse.then(response=>{
    if(response.ok&&response.type==='basic')return caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
  }).catch(()=>{}));
  event.respondWith(caches.match(request).then(cached=>cached||networkResponse));
});