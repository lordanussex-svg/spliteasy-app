const V='v3';
const CACHE=['./','/index.html','js/config.js','js/db.js','js/crypto.js','js/logic.js',
  'js/state.js','js/ui.js','js/groups.js','js/dashboard.js','js/add.js','js/history.js',
  'js/balance.js','js/settings.js','js/export.js','js/sync.js','js/router.js',
  'manifest.json','icon.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.6.0/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CACHE.filter(u=>!u.startsWith('http')))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
