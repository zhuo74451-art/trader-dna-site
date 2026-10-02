const CACHE_NAME="trader-dna-event-audit-fixes-20261002-10";
const PRECACHE=["./scan01.html","./scan01-authority-preview.html","./index.html","./cinema/detail04-a4b0c970666f.css","./cinema/scan01-authority-preview.css?v=20261002-10","./cinema/core-event-persistence-0379480c0f31.js","./cinema/core-app18-20260927.js?v=20261002-10","./cinema/visual04-3e3d37bdb302.js","./cinema/detail-refine04-e55404caac86.js","./cinema/detail-weave-d39631e4ddf5.js","./cinema/core-visual-v4-result-365ae6c4bde4.js","./cinema/detail04-18only-20260927.js","./cinema/detail-update-f0ae51e6da72.js","./cinema/scan01-authority-preview.js?v=20261002-10","./cinema/portraits-detail04-card-0dca88dce1bb.json","./cinema/assets/scan-study.webp","./cinema/assets/terrain.webp","./data/questions-1.json","./data/types.json"];
const CACHE_PREFIX='trader-dna-event-';

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    const isAuthorityImage=/\/cinema\/assets\/(?:identity-cards|hero-characters)\/.*\.webp$/i.test(url.pathname);
    if(isAuthorityImage){
      try{
        const fresh=await fetch(request,{cache:'no-store'});
        if(fresh&&fresh.ok){
          const cache=await caches.open(CACHE_NAME);
          await cache.put(request,fresh.clone());
        }
        return fresh;
      }catch(error){
        const cached=await caches.match(request,{ignoreSearch:false});
        if(cached) return cached;
        throw error;
      }
    }
    const isCinemaImage=/\/cinema\/assets\/.*\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname);
    if(isCinemaImage){
      const cached=await caches.match(request,{ignoreSearch:true});
      if(cached) return cached;
      const response=await fetch(request,{cache:'force-cache'});
      if(response&&response.ok){
        const cache=await caches.open(CACHE_NAME);
        await cache.put(request,response.clone());
      }
      return response;
    }
    const isVisualPreview=/\/(?:scan01(?:-authority-preview)?\.html|editorial-(?:preview|reset)|cinema)/.test(url.pathname);
    const isLiveData=/\/data\/(?:types|questions-1)\.json$/.test(url.pathname);
    if(isVisualPreview||isLiveData){
      try{
        const fresh=await fetch(request,{cache:'no-store'});if(fresh.ok){const c=await caches.open(CACHE_NAME);await c.put(request,fresh.clone());}return fresh;
      }catch(error){
        const previewCached=await caches.match(request,{ignoreSearch:false});
        if(previewCached) return previewCached;
        throw error;
      }
    }
    const cached=await caches.match(request,{ignoreSearch:true});
    if(cached) return cached;
    try{
      const response=await fetch(request);
      if(response&&response.ok){
        const cache=await caches.open(CACHE_NAME);
        await cache.put(request,response.clone());
      }
      return response;
    }catch(error){
      if(request.mode==='navigate'){
        const fallback=await caches.match(new URL('./index.html',self.registration.scope).href,{ignoreSearch:true});
        if(fallback) return fallback;
      }
      throw error;
    }
  })());
});

self.addEventListener("message",event=>{if(event.data?.type==="TRADERDNA_VERSION")event.ports?.[0]?.postMessage({cacheName:CACHE_NAME});});
