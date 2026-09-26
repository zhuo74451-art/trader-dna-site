const CACHE_NAME="trader-dna-event-editorial-card-restored-20260926";
const PRECACHE=["./scan01.html","./cinema/detail04-a4b0c970666f.css","./cinema/detail04-53b019c46f38.js","./cinema/visual04-3e3d37bdb302.js","./cinema/detail-refine04-e55404caac86.js","./cinema/portraits-detail04-card-0dca88dce1bb.json","./cinema/core-event-persistence-0379480c0f31.js","./cinema/core-app-d11d974f04a1.js","./cinema/detail-weave-d39631e4ddf5.js","./cinema/core-visual-v4-result-365ae6c4bde4.js","./cinema/detail-update-f0ae51e6da72.js","./cinema/assets/scan-study.webp","./cinema/detail04-362b30692ca6.css","./cinema/detail04-17a04b5616ca.js","./cinema/detail-refine-dfc5ed80d4af.js",".","./index.html","./app.js","./event-persistence.js","./styles.css","./styles-responsive.css","./visual-v3.css","./visual-v3-motion.css","./visual-v3-polish.css","./visual-v3-refine.css","./visual-v3-result-depth.css","./visual-v4.css","./visual-v4-result.css","./director-v5-live.css","./visual-v3.js","./visual-v3-refine.js","./visual-v3-share-card.js","./visual-v4.js","./visual-v4-result.js","./director-v5-live.js","./data/questions-1.json","./data/questions-2.json","./data/questions-3.json","./data/types.json","./assets/portraits/warren-buffett.jpg","./assets/portraits/charles-darwin.jpg","./assets/portraits/charlie-munger.jpg","./assets/portraits/howard-marks.jpg","./assets/portraits/philip-fisher.svg","./assets/portraits/peter-thiel.jpg","./assets/portraits/marc-andreessen.jpg","./assets/portraits/paul-tudor-jones.jpg","./assets/portraits/chester-nimitz.jpg","./assets/portraits/stanley-druckenmiller.svg","./assets/portraits/jeff-bezos.jpg","./assets/portraits/jesse-livermore.svg","./assets/portraits/steve-jobs.jpg","./assets/portraits/nassim-nicholas-taleb.svg","./assets/portraits/george-soros.jpg","./assets/portraits/daniel-kahneman.svg","./assets/portraits/benjamin-graham.svg","./assets/portraits/michael-mauboussin.svg","./assets/portraits/peter-lynch.svg","./assets/portraits/li-lu.svg","./assets/portraits/dwight-eisenhower.jpg","./assets/portraits/marcus-aurelius.jpg","./assets/portraits/ed-seykota.svg","./assets/portraits/marie-curie.svg","./assets/portraits/jim-simons.jpg","./assets/portraits/edward-thorp.svg","./assets/portraits/jack-bogle.svg","./assets/portraits/elon-musk.jpg","./assets/portraits/david-tepper.svg","./assets/portraits/john-maynard-keynes.svg","./assets/portraits/john-d-rockefeller.svg","./assets/portraits/miyamoto-musashi.png","./data/portraits.json"];
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
    const isVisualPreview=/\/(?:editorial-(?:preview|reset)|cinema)/.test(url.pathname);
    if(isVisualPreview){
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
