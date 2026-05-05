'use strict';
const PAGES={
  dashboard:renderDashboard,
  add:()=>renderAdd(),
  history:renderHistory,
  balance:renderBalance,
  settings:()=>renderSettings(),
};
function navigate(page,data=null){
  S.page=page;
  if(page==='add'&&data)renderAdd(data);
  else PAGES[page]?.();
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('content').scrollTop=0;
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
  (async()=>{
    await loadState();
    await migrateIfNeeded();
    await maybeSeed();
    renderGroups();
    if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  })();
});
