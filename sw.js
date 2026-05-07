const V='splitkira-v2';
const CACHE=['./','/index.html','js/config.js','js/db.js','js/crypto.js','js/logic.js',
  'js/state.js','js/ui.js','js/groups.js','js/dashboard.js','js/add.js','js/history.js',
  'js/balance.js','js/settings.js','js/export.js','js/sync.js','js/router.js',
  'manifest.json','icon.svg',
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(CACHE)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(resp=>{
        // Dynamically cache CDN scripts for offline use
        if(resp&&resp.status===200&&(
          e.request.url.includes('cdnjs.cloudflare.com')||
          e.request.url.includes('cdn.jsdelivr.net')
        )){
          caches.open(V).then(c=>c.put(e.request,resp.clone()));
        }
        return resp;
      });
    })
  );
});
