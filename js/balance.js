'use strict';
function renderBalance(){
  destroyCharts();
  const g=activeGroup();if(!g){renderGroups();return;}
  const cur=g.currency,mbrs=g.members;
  const exps=gExps(),setts=gSetts();
  const bals=LOGIC.balances(exps,setts,mbrs);
  const txns=LOGIC.simplify(bals);
  const recS=[...setts].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  setHeader('Balance',g.name,true,[]);
  $('hdr-back').onclick=()=>navigate('dashboard');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page==='balance'));
  $('content').innerHTML=`
    <div class="sec-title">Settle Up</div>
    <div class="card">
      ${txns.length===0
        ?'<div class="badge success" style="width:100%;justify-content:center;padding:12px">🎉 All settled up!</div>'
        :txns.map(t=>`<div class="owe-row">
          <div><div style="font-size:0.88rem"><b>${t.debtor}</b> → <b>${t.creditor}</b></div>
            <div style="font-size:0.68rem;color:var(--text2)">Tap amount to auto-fill</div></div>
          <span class="badge danger" style="cursor:pointer" data-debtor="${t.debtor}" data-creditor="${t.creditor}" data-amt="${t.amount}">${fmt(t.amount,cur)}</span>
          </div>`).join('')}
    </div>
    <div class="sec-title">Net Position</div>
    <div class="stat-grid">
      ${mbrs.map(m=>{const v=bals[m]||0;const col=v>0.01?'var(--success)':v<-0.01?'var(--danger)':'var(--text2)';
        return`<div class="stat-card"><div class="label">${m}</div>
          <div class="val-sm" style="color:${col}">${v>=0?'+':''}${fmt(v,cur)}</div>
          <div style="font-size:0.68rem;color:var(--text2);margin-top:3px">${v>0.01?'is owed':v<-0.01?'owes':'settled'}</div>
        </div>`;}).join('')}
    </div>
    <div class="sec-title">Record Payment</div>
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Who pays</label><select id="b-payer">${mbrs.map(m=>`<option>${m}</option>`).join('')}</select></div>
        <div class="field"><label>To</label><select id="b-recv">${mbrs.map((m,i)=>`<option${i===1?' selected':''}>${m}</option>`).join('')}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Amount (${cur})</label><input id="b-amt" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00"></div>
        <div class="field"><label>Date</label><input id="b-date" type="date" value="${today()}"></div>
      </div>
      <div class="field"><label>Notes</label><input id="b-notes" type="text" placeholder="e.g. PayNow transfer"></div>
      <button class="btn btn-primary" id="b-save">Record Payment</button>
    </div>
    ${recS.length?`<div class="sec-title">Payment History</div>
      <div class="card" style="padding:0 14px">${recS.map(s=>`
        <div class="txn"><div class="txn-ico" style="color:var(--success)">💳</div>
          <div class="txn-info"><div class="txn-desc">${s.payer} paid ${s.receiver}</div>
            <div class="txn-meta">${fmtDate(s.date)}${s.notes?' · '+s.notes:''}</div></div>
          <div class="txn-amt" style="color:var(--success)">${fmt(s.amount,cur)}</div>
        </div>`).join('')}</div>`:''}`;
  document.querySelectorAll('[data-debtor]').forEach(badge=>{
    badge.addEventListener('click',()=>{
      $('b-payer').value=badge.dataset.debtor;$('b-recv').value=badge.dataset.creditor;
      $('b-amt').value=parseFloat(badge.dataset.amt).toFixed(2);
      $('b-amt').scrollIntoView({behavior:'smooth',block:'center'});
    });
  });
  $('b-save').addEventListener('click',async()=>{
    const payer=$('b-payer').value,recv=$('b-recv').value;
    const amt=parseFloat($('b-amt').value),date=$('b-date').value;
    const notes=$('b-notes').value.trim();
    if(payer===recv){toast('Payer and receiver must differ','err');return;}
    if(!amt||amt<=0){toast('Enter a valid amount','err');return;}
    const s={id:uid(),groupId:g.id,date,payer,receiver:recv,amount:amt,notes,_ts:Date.now(),_del:false};
    await DB.put('settlements',s);S.settlements.push(s);
    toast(`${payer} paid ${recv} ${fmt(amt,cur)}`,'ok');renderBalance();
  });
}
