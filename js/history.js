'use strict';
function renderHistory(){
  destroyCharts();
  const g=activeGroup();if(!g){renderGroups();return;}
  const cur=g.currency,mbrs=g.members;
  const exps=gExps();
  const months=[...new Set(exps.map(e=>e.date.slice(0,7)))].sort().reverse().slice(0,18);
  setHeader('Ledger',g.name,true,[`<button class="hdr-btn" onclick="showExportMenu()" title="Export">&#8679;</button>`]);
  $('hdr-back').onclick=()=>navigate('dashboard');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page==='history'));
  $('content').innerHTML=`
    <div class="card" style="padding:10px">
      <input id="h-search" type="text" placeholder="Search..." style="margin-bottom:8px;font-size:0.88rem">
      <div class="field-row" style="margin-bottom:0">
        <select id="h-month" style="font-size:0.82rem;padding:8px 10px">
          <option value="">All months</option>
          ${months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join('')}
        </select>
        <select id="h-cat" style="font-size:0.82rem;padding:8px 10px">
          <option value="">All categories</option>
          ${S.categories.map(c=>`<option value="${c.l}">${c.e} ${c.l}</option>`).join('')}
        </select>
        <select id="h-mbr" style="font-size:0.82rem;padding:8px 10px">
          <option value="">All members</option>
          ${mbrs.map(m=>`<option value="${m}">${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="h-list"></div>`;
  function refresh(){
    const q=$('h-search').value.toLowerCase().trim();
    const mo=$('h-month').value,ct=$('h-cat').value,mb=$('h-mbr').value;
    let list=[...exps];
    if(q)list=list.filter(e=>e.description.toLowerCase().includes(q)||(e.notes||'').toLowerCase().includes(q));
    if(mo)list=list.filter(e=>e.date.startsWith(mo));
    if(ct)list=list.filter(e=>e.category===ct);
    if(mb)list=list.filter(e=>e.paidBy===mb||(mb in(e.splits||{})&&e.splits[mb]>0));
    list.sort((a,b)=>b.date.localeCompare(a.date)||b._ts-a._ts);
    const total=list.reduce((s,e)=>s+e.amount,0);
    if(!list.length){$('h-list').innerHTML=`<div class="empty"><div class="empty-ico">🔍</div><p>No transactions found</p></div>`;return;}
    $('h-list').innerHTML=`
      <div style="font-size:0.73rem;color:var(--text2);margin-bottom:7px;display:flex;justify-content:space-between">
        <span>${list.length} transactions</span><span>${fmt(total,cur)}</span></div>
      <div class="card" style="padding:0 14px">${list.map(e=>{
        const ci=catMap[e.category]||{e:'💰',c:'#888'};
        const sp=Object.entries(e.splits||{}).filter(([,p])=>p>0).map(([m,p])=>`${m.split(' ')[0]}: ${p.toFixed(0)}%`).join(' · ');
        return`<div class="txn" data-id="${e.id}" style="cursor:pointer">
          <div class="txn-ico" style="color:${ci.c}">${ci.e}</div>
          <div class="txn-info">
            <div class="txn-desc">${e.description}${e.recurring?'<span class="rec-icon">REC</span>':''}</div>
            <div class="txn-meta">${fmtDate(e.date)} · ${e.category}</div>
            <div class="txn-meta"><b>${e.paidBy}</b>${e.notes?' · '+e.notes:''}</div>
          </div>
          <div class="txn-amt">${fmt(e.amount,cur)}<div class="split">${sp}</div></div>
        </div>`;}).join('')}</div>`;
    $('h-list').querySelectorAll('.txn').forEach(row=>{
      row.addEventListener('click',()=>{const exp=S.expenses.find(e=>e.id===row.dataset.id);if(exp)navigate('add',exp);});
    });
  }
  $('h-search').addEventListener('input',refresh);
  $('h-month').addEventListener('change',refresh);
  $('h-cat').addEventListener('change',refresh);
  $('h-mbr').addEventListener('change',refresh);
  refresh();
}
