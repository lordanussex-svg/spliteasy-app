'use strict';
const $=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c=='x'?r:(r&3|8)).toString(16);});
const fmt=(n,cur='SGD')=>`${cur} ${Number(n).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate=d=>new Date(d+'T00:00').toLocaleDateString('en-SG',{day:'numeric',month:'short',year:'numeric'});
const today=()=>new Date().toISOString().slice(0,10);
const thisMonth=()=>today().slice(0,7);
const monthLabel=m=>new Date(m+'-01').toLocaleString('en-SG',{month:'short',year:'numeric'});
function toast(msg,type='ok',dur=2500){
  const el=document.createElement('div');
  el.className=`toast ${type}`;el.textContent=msg;
  $('toast-wrap').appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(10px)';el.style.transition='all .3s';setTimeout(()=>el.remove(),300);},dur);
}
function showModal(html,onClose=null){
  $('modal-box').innerHTML=`<div class="modal-handle"></div>${html}`;
  $('overlay').classList.add('show');
  $('overlay').onclick=e=>{if(e.target===$('overlay')){closeModal();if(onClose)onClose();}};
}
function closeModal(){$('overlay').classList.remove('show');}
let charts={};
function destroyCharts(){Object.values(charts).forEach(c=>{try{c.destroy();}catch(e){}});charts={};}
function setHeader(title,sub='',showBack=false,actions=[]){
  $('hdr-title').textContent=title;
  $('hdr-sub').textContent=sub;
  $('hdr-back').style.display=showBack?'flex':'none';
  $('hdr-right').innerHTML=actions.join('');
}
function showNav(show){
  $('bottom-nav').style.display=show?'flex':'none';
}
