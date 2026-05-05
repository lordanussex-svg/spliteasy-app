'use strict';
const DB=(()=>{
  let db=null;
  const open=()=>new Promise((res,rej)=>{
    if(db)return res(db);
    const r=indexedDB.open('spliteasy',3);
    r.onupgradeneeded=e=>{
      const d=e.target.result;
      ['expenses','settlements','budgets','groups'].forEach(s=>{
        if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});
      });
      if(!d.objectStoreNames.contains('config'))d.createObjectStore('config',{keyPath:'key'});
    };
    r.onsuccess=e=>{db=e.target.result;res(db);};
    r.onerror=rej;
  });
  const run=(s,m,fn)=>open().then(()=>new Promise((res,rej)=>{
    const t=db.transaction(s,m);t.onerror=rej;res(fn(t));
  }));
  return{
    all:s=>run(s,'readonly',t=>new Promise((r,j)=>{const q=t.objectStore(s).getAll();q.onsuccess=()=>r(q.result);q.onerror=j;})),
    put:(s,v)=>run(s,'readwrite',t=>new Promise((r,j)=>{const q=t.objectStore(s).put(v);q.onsuccess=()=>r(q.result);q.onerror=j;})),
    del:(s,id)=>run(s,'readwrite',t=>new Promise((r,j)=>{const q=t.objectStore(s).delete(id);q.onsuccess=()=>r();q.onerror=j;})),
    clear:s=>run(s,'readwrite',t=>new Promise((r,j)=>{const q=t.objectStore(s).clear();q.onsuccess=()=>r();q.onerror=j;})),
    getCfg:(k,d=null)=>run('config','readonly',t=>new Promise((r,j)=>{const q=t.objectStore('config').get(k);q.onsuccess=()=>r(q.result?q.result.val:d);q.onerror=j;})),
    setCfg:(k,v)=>DB.put('config',{key:k,val:v}),
  };
})();
