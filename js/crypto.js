'use strict';
const CRYPTO={
  async key(pw,salt){
    const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  },
  async encrypt(data,pw){
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const k=await this.key(pw,salt);
    const enc=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(data)));
    return{v:1,salt:[...salt],iv:[...iv],ct:[...new Uint8Array(enc)]};
  },
  async decrypt(pkg,pw){
    const k=await this.key(pw,new Uint8Array(pkg.salt));
    const dec=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(pkg.iv)},k,new Uint8Array(pkg.ct));
    return JSON.parse(new TextDecoder().decode(dec));
  },
};
