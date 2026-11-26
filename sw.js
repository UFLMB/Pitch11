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

  // Network-first for every same-origin GET. This prevents stale images,
  // audio, textures and configuration files from surviving a new deployment.
  // The previous response remains available as an offline fallback.
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&response.type==='basic'){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{}));
    }
    return response;
  }).catch(async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    if(request.mode==='navigate'){
      const shell=await caches.match('./index.html');
      if(shell)return shell;
    }
    throw new Error('PITCH 11 offline cache miss: '+url.pathname);
  }));
});
