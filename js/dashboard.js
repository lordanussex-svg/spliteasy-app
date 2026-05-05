'use strict';
function renderDashboard(){
  destroyCharts();
  const g=activeGroup();if(!g){renderGroups();return;}
  const exps=gExps(),setts=gSetts(),buds=gBuds();
  const cur=g.currency,mbrs=g.members;
  const bals=LOGIC.balances(exps,setts,mbrs);
  const txns=LOGIC.simplify(bals);
  const mo=thisMonth();
  const mExps=exps.filter(e=>e.date.startsWith(mo));
  const mTotal=mExps.reduce((s,e)=>s+e.amount,0);
  const mPaid=Object.fromEntries(mbrs.map(m=>[m,mExps.filter(e=>e.paidBy===m).reduce((s,e)=>s+e.amount,0)]));
  const catTotals={};mExps.forEach(e=>{catTotals[e.category]=(catTotals[e.category]||0)+e.amount;});
  const topCats=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const moBuds=buds.filter(b=>b.month===mo);
  const budRows=topCats.slice(0,5).map(([cat,spent])=>{
    const bud=moBuds.find(b=>b.category===cat);if(!bud)return null;
    const pct=Math.min(100,Math.round(spent/bud.amount*100));
    const col=pct>=100?'var(--danger)':pct>=80?'var(--warn)':'var(--success)';
    const ci=catMap[cat]||{e:'💰'};
    return`<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;margin-bottom:3px">
      <span style="font-size:0.82rem;font-weight:600">${ci.e} ${cat}</span>
      <span style="font-size:0.7rem;color:var(--text2)">${fmt(spent,cur)} / ${fmt(bud.amount,cur)}</span>
    </div><div class="progress"><div class="progress-fill" style="width:${pct}%;background:${col}"></div></div></div>`;
  }).filter(Boolean);
  const monthMap={};exps.forEach(e=>{const m=e.date.slice(0,7);monthMap[m]=(monthMap[m]||0)+e.amount;});
  const tKeys=Object.keys(monthMap).sort().slice(-5);
  const recent=[...exps].sort((a,b)=>b.date.localeCompare(a.date)||b._ts-a._ts).slice(0,5);
  const balHtml=txns.length===0
    ?`<div class="badge success" style="width:100%;justify-content:center;padding:12px">🎉 All settled up!</div>`
    :txns.map(t=>`<div class="owe-row"><span style="font-size:0.86rem"><b>${t.debtor}</b> owes <b>${t.creditor}</b></span><span class="badge danger">${fmt(t.amount,cur)}</span></div>`).join('');
  setHeader(g.name,mbrs.join(' · '),true,[`<button class="hdr-btn" onclick="navigate('add')" title="Add">+</button>`]);
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page==='dashboard'));
  $('content').innerHTML=`
    <div class="card"><div class="label">Balance</div>${balHtml}</div>
    <div class="sec-title">📅 ${new Date().toLocaleString('en-SG',{month:'long',year:'numeric'})}</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Total spent</div><div class="val-sm">${fmt(mTotal,cur)}</div></div>
      ${mbrs.slice(0,3).map(m=>`<div class="stat-card"><div class="label">${m} paid</div><div class="val-sm">${fmt(mPaid[m]||0,cur)}</div></div>`).join('')}
    </div>
    ${budRows.length?`<div class="card"><div class="label">Budget Status</div>${budRows.join('')}</div>`:''}
    ${tKeys.length>1?`<div class="card"><div class="label">Monthly Trend</div><canvas id="cTrend" height="130"></canvas></div>`:''}
    ${topCats.length?`<div class="card"><div class="label">By Category</div><canvas id="cCat" height="160"></canvas></div>`:''}
    <div class="sec-title">🕐 Recent
      <button class="btn btn-sm btn-outline" onclick="navigate('history')" style="margin-left:auto;font-size:0.7rem;padding:3px 9px">View all</button>
    </div>
    <div class="card">${recent.length?recent.map(e=>{const ci=catMap[e.category]||{e:'💰',c:'#888'};
      return`<div class="txn" onclick="navigate('add',S.expenses.find(x=>x.id==='${e.id}'))" style="cursor:pointer">
        <div class="txn-ico" style="color:${ci.c}">${ci.e}</div>
        <div class="txn-info"><div class="txn-desc">${e.description}${e.recurring?'<span class="rec-icon">REC</span>':''}</div>
          <div class="txn-meta">${fmtDate(e.date)} · ${e.paidBy}</div></div>
        <div class="txn-amt">${fmt(e.amount,cur)}</div>
      </div>`;}).join(''):`<div class="empty"><div class="empty-ico">📭</div><p>No expenses yet. Tap + to add.</p></div>`}</div>`;
  setTimeout(()=>{
    if(tKeys.length>1&&$('cTrend')){
      charts.trend=new Chart($('cTrend'),{type:'bar',data:{
        labels:tKeys.map(k=>monthLabel(k)),
        datasets:[{data:tKeys.map(k=>monthMap[k]),backgroundColor:'rgba(124,111,238,0.75)',borderRadius:6,borderSkipped:false}]},
        options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#7777aa',font:{size:10}}},
          y:{grid:{color:'#2a2a45'},ticks:{color:'#7777aa',font:{size:10},callback:v=>`${cur} ${(v/1000).toFixed(1)}k`}}},responsive:true}});
    }
    if(topCats.length&&$('cCat')){
      const top6=topCats.slice(0,6);
      charts.cat=new Chart($('cCat'),{type:'doughnut',data:{
        labels:top6.map(([k])=>k),
        datasets:[{data:top6.map(([,v])=>v),backgroundColor:top6.map(([k])=>(catMap[k]||{c:'#888'}).c),borderWidth:0,hoverOffset:6}]},
        options:{plugins:{legend:{position:'bottom',labels:{color:'#9999bb',boxWidth:10,padding:8,font:{size:10}}}},cutout:'62%',responsive:true}});
    }
  },50);
}
