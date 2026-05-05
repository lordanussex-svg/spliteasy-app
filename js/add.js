'use strict';
let editId=null;
function renderAdd(prefill=null){
  destroyCharts();
  const g=activeGroup();if(!g){renderGroups();return;}
  editId=prefill?.id||null;
  const mbrs=g.members,cur=g.currency;
  const defSplitWith=prefill?.splits?Object.keys(prefill.splits):[...mbrs];
  const e=prefill||{date:today(),category:'Food & Dining',paidBy:mbrs[0],splitType:'Equal',splits:{},amount:'',description:'',notes:'',recurring:false};
  const catOpts=S.categories.map(c=>`<option value="${c.l}"${e.category===c.l?' selected':''}>${c.e} ${c.l}</option>`).join('');
  const mbrOpts=mbrs.map(m=>`<option value="${m}"${e.paidBy===m?' selected':''}>${m}</option>`).join('');
  setHeader(editId?'Edit Expense':'New Expense','',true,[]);
  $('hdr-back').onclick=()=>navigate('dashboard');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page==='add'));
  $('content').innerHTML=`
    <div class="card">
      <div class="field-row">
        <div class="field" style="flex:2"><label>Description *</label>
          <input id="f-desc" type="text" placeholder="e.g. Hawker dinner" value="${e.description}" autocomplete="off"></div>
        <div class="field" style="flex:1.1"><label>Amount (${cur})</label>
          <input id="f-amt" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00" value="${e.amount||''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Category</label><select id="f-cat">${catOpts}</select></div>
        <div class="field"><label>Paid by</label><select id="f-paid">${mbrOpts}</select></div>
      </div>
      <div class="field"><label>Split with</label>
        <div class="mbr-chips" id="sw-chips">
          ${mbrs.map(m=>`<div class="mbr-chip${defSplitWith.includes(m)?' on':''}" data-mbr="${m}">
            <div class="chip-dot"></div>${m}</div>`).join('')}
        </div>
      </div>
      <div class="field"><label>How to split</label>
        <div class="split-opts">
          ${SPLITS.map(s=>`<button class="split-btn${(e.splitType||'Equal')===s?' active':''}" data-split="${s}">${s}</button>`).join('')}
        </div>
        <div id="split-detail"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Date</label><input id="f-date" type="date" value="${e.date}"></div>
        <div class="field"><label>Notes</label><input id="f-notes" type="text" placeholder="Optional" value="${e.notes||''}"></div>
      </div>
      <div class="field" style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <input type="checkbox" id="f-rec" ${e.recurring?'checked':''} style="width:18px;height:18px;accent-color:var(--accent);flex-shrink:0">
        <label for="f-rec" style="font-size:0.85rem;color:var(--text);text-transform:none;letter-spacing:0;margin:0;cursor:pointer">
          Mark as recurring expense
        </label>
      </div>
      <button class="btn btn-primary" id="btn-save">${editId?'Update Expense':'Save Expense'}</button>
      ${editId?`<button class="btn btn-danger" style="margin-top:8px" id="btn-del">Delete Expense</button>`:''}
    </div>`;
  document.querySelectorAll('.mbr-chip').forEach(chip=>{
    chip.addEventListener('click',()=>{
      const on=[...document.querySelectorAll('.mbr-chip.on')];
      if(chip.classList.contains('on')&&on.length<=1){toast('At least 1 member required','err');return;}
      chip.classList.toggle('on');updateSplitDetail();
    });
  });
  document.querySelectorAll('.split-btn').forEach(b=>{
    b.addEventListener('click',()=>{document.querySelectorAll('.split-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');updateSplitDetail();});
  });
  updateSplitDetail();
  $('btn-save').addEventListener('click',saveExpense);
  if(editId)$('btn-del').addEventListener('click',deleteExpense);
}
function getSwMbrs(){return[...document.querySelectorAll('.mbr-chip.on')].map(c=>c.dataset.mbr);}
function getSplitType(){return document.querySelector('.split-btn.active')?.dataset.split||'Equal';}
function updateSplitDetail(){
  const st=getSplitType(),inM=getSwMbrs();
  if(!inM.length){$('split-detail').innerHTML='';return;}
  if(st==='Equal'){
    $('split-detail').innerHTML=`<div style="font-size:0.76rem;color:var(--text2)">${inM.length} member(s) each pay ${(100/inM.length).toFixed(1)}%</div>`;
  }else if(st==='Payer only'){
    $('split-detail').innerHTML=`<div style="font-size:0.76rem;color:var(--text2)">Only the payer owes — others owe nothing</div>`;
  }else{
    $('split-detail').innerHTML=`<div style="font-size:0.76rem;color:var(--text2);margin-bottom:6px">Enter % — must total 100%</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${inM.map(m=>`<div class="card-sm" style="flex:1;min-width:90px">
          <div style="font-size:0.68rem;color:var(--text2);margin-bottom:3px">${m}</div>
          <input class="split-pct" data-mbr="${m}" type="number" inputmode="decimal" min="0" max="100" step="5" value="${(100/inM.length).toFixed(1)}" style="padding:7px 8px"></div>`).join('')}
      </div>`;
  }
}
async function saveExpense(){
  const g=activeGroup();if(!g)return;
  const desc=$('f-desc').value.trim(),amt=parseFloat($('f-amt').value);
  const cat=$('f-cat').value,paid=$('f-paid').value;
  const st=getSplitType(),date=$('f-date').value;
  const notes=$('f-notes').value.trim(),rec=$('f-rec').checked;
  const inM=getSwMbrs();
  if(!desc){toast('Description required','err');return;}
  if(!amt||amt<=0){toast('Enter a valid amount','err');return;}
  if(!inM.length){toast('Select at least one member','err');return;}
  let splits=Object.fromEntries(g.members.map(m=>[m,0]));
  if(st==='Equal'){const pct=parseFloat((100/inM.length).toFixed(4));inM.forEach(m=>splits[m]=pct);}
  else if(st==='Payer only'){splits[paid]=100;}
  else{
    let total=0;
    document.querySelectorAll('.split-pct').forEach(inp=>{splits[inp.dataset.mbr]=parseFloat(inp.value)||0;total+=parseFloat(inp.value)||0;});
    if(Math.abs(total-100)>0.5){toast(`Splits total ${total.toFixed(1)}% — must be 100%`,'err');return;}
  }
  const now=Date.now();
  const expense={id:editId||uid(),groupId:g.id,date,description:desc,amount:amt,
    category:cat,paidBy:paid,splitType:st,splits,notes,recurring:rec,_ts:now,_del:false};
  await DB.put('expenses',expense);
  if(editId){const i=S.expenses.findIndex(e=>e.id===editId);if(i>=0)S.expenses[i]=expense;else S.expenses.push(expense);toast('Updated ✅','ok');}
  else{S.expenses.push(expense);toast('Expense saved 💰','ok');}
  editId=null;navigate('dashboard');
}
async function deleteExpense(){
  if(!editId)return;
  if(!confirm('Delete this expense?'))return;
  const e=S.expenses.find(x=>x.id===editId);
  if(e){e._del=true;e._ts=Date.now();await DB.put('expenses',e);}
  toast('Deleted','info');editId=null;navigate('history');
}
