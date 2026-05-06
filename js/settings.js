'use strict';
function renderSettings(tab=null){
  destroyCharts();
  const g=activeGroup();if(!g){renderGroups();return;}
  if(tab)S.settingsTab=tab;
  const t=S.settingsTab;
  setHeader('Settings',g.name,true,[]);
  $('hdr-back').onclick=()=>navigate('dashboard');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page==='settings'));
  const tabs=`<div class="stab-bar">
    ${['profile','categories','budgets','export','sync','about'].map(s=>`<div class="stab${t===s?' active':''}" data-stab="${s}">${{profile:'Profile',categories:'Categories',budgets:'Budgets',export:'Export',sync:'Sync',about:'About'}[s]}</div>`).join('')}
  </div>`;
  let body='';
  if(t==='profile'){
    body=`<div class="card">
      <div class="field"><label>Group Name</label><input id="s-gname" value="${g.name}"></div>
      <div class="field"><label>Currency</label>
        <select id="s-cur">${CURRENCIES.map(c=>`<option${c===g.currency?' selected':''}>${c}</option>`).join('')}</select></div>
      <div class="divider"></div>
      <div class="sec-title" style="margin-top:0">Members</div>
      <div id="s-mbrs">${g.members.map((m,i)=>`
        <div class="field-row" style="align-items:center;margin-bottom:7px">
          <div class="field" style="margin-bottom:0;flex:1"><input class="s-mbr" value="${m}" placeholder="Name"></div>
          ${g.members.length>2?`<button class="btn btn-danger btn-sm btn-icon" data-rm="${i}">✕</button>`:''}
        </div>`).join('')}
        <button class="btn btn-outline btn-sm" id="s-add-mbr">+ Add Member</button>
      </div>
      <button class="btn btn-primary" id="s-save" style="margin-top:14px">Save Settings</button>
    </div>`;
  }else if(t==='categories'){
    body=`<div class="card">
      <div id="cat-list">${S.categories.map((c,i)=>`
        <div class="set-row">
          <div style="display:flex;align-items:center;gap:9px">
            <span style="font-size:1.2rem">${c.e}</span>
            <div><div class="set-label">${c.l}</div>
              <div class="set-desc" style="display:flex;align-items:center;gap:4px">
                <span style="width:8px;height:8px;border-radius:50%;background:${c.c};display:inline-block"></span>${c.c}</div></div></div>
          <div style="display:flex;gap:5px">
            <button class="btn btn-outline btn-sm btn-icon" data-edit-cat="${i}">✏️</button>
            ${S.categories.length>3?`<button class="btn btn-danger btn-sm btn-icon" data-del-cat="${i}">✕</button>`:''}
          </div>
        </div>`).join('')}</div>
      <button class="btn btn-outline-accent btn-sm" id="add-cat-btn" style="margin-top:10px;width:100%">+ Add Category</button>
    </div>`;
  }else if(t==='budgets'){
    const mo=thisMonth(),moBuds=gBuds().filter(b=>b.month===mo);
    const mExps=gExps().filter(e=>e.date.startsWith(mo));
    const catSpent={};mExps.forEach(e=>{catSpent[e.category]=(catSpent[e.category]||0)+e.amount;});
    body=`<div class="card">
      <div style="font-size:0.78rem;color:var(--text2);margin-bottom:10px">Budgets for <b style="color:var(--text)">${monthLabel(mo)}</b>. Set 0 to disable.</div>
      ${S.categories.map(cat=>{
        const b=moBuds.find(x=>x.category===cat.l),amt=b?b.amount:0,spent=catSpent[cat.l]||0;
        const pct=amt>0?Math.min(100,Math.round(spent/amt*100)):0;
        const col=pct>=100?'var(--danger)':pct>=80?'var(--warn)':'var(--success)';
        return`<div style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:0.82rem;font-weight:600">${cat.e} ${cat.l}</span>
            <div style="display:flex;align-items:center;gap:7px">
              <span style="font-size:0.68rem;color:var(--text2)">${fmt(spent,g.currency)} spent</span>
              <input type="number" class="bud-input" data-cat="${cat.l}" data-month="${mo}"
                min="0" step="10" value="${amt}" style="width:85px;padding:4px 7px;font-size:0.8rem;text-align:right">
            </div>
          </div>
          ${amt>0?`<div class="progress"><div class="progress-fill" style="width:${pct}%;background:${col}"></div></div>`:''}
        </div>`;}).join('')}
      <button class="btn btn-primary" id="bud-save">Save Budgets</button>
    </div>`;
  }else if(t==='export'){
    body=`<div class="card">
      <div class="set-row"><div><div class="set-label">CSV Spreadsheet</div><div class="set-desc">Opens in Excel, Numbers, Google Sheets</div></div><button class="btn btn-outline btn-sm" id="btn-csv">Export</button></div>
      <div class="set-row"><div><div class="set-label">Excel Workbook (.xlsx)</div><div class="set-desc">4 sheets: transactions, summary, balances, settlements</div></div><button class="btn btn-outline btn-sm" id="btn-xlsx">Export</button></div>
      <div class="set-row"><div><div class="set-label">PDF Report</div><div class="set-desc">Formatted report with all data</div></div><button class="btn btn-primary btn-sm" id="btn-pdf">Export</button></div>
    </div>`;
  }else if(t==='sync'){
    body=`<div class="card">
      <div style="font-size:0.8rem;color:var(--text2);line-height:1.6;margin-bottom:10px">AES-256-GCM encrypted backup. Nothing sent to any server.</div>
      <div style="display:flex;gap:10px;margin-bottom:6px">
        <div style="flex:1;background:var(--card2);border-radius:9px;padding:9px;font-size:0.76rem"><b>Device A</b><br>Export, share via AirDrop</div>
        <div style="flex:1;background:var(--card2);border-radius:9px;padding:9px;font-size:0.76rem"><b>Device B</b><br>Import, auto CRDT merge</div>
      </div>
    </div>
    <div class="sec-title">Export Backup</div>
    <div class="card">
      <div class="field"><label>Password</label><div class="pw-wrap"><input id="ex-pw" type="password" placeholder="Choose a password"><button class="pw-eye" onclick="togglePw('ex-pw')">👁</button></div></div>
      <div class="field"><label>Confirm</label><input id="ex-pw2" type="password" placeholder="Repeat password"></div>
      <button class="btn btn-primary" id="btn-export">Export Encrypted Backup</button>
    </div>
    <div class="sec-title">Import & Merge</div>
    <div class="card">
      <div class="field"><label>Backup file (.json)</label><input id="im-file" type="file" accept=".json"></div>
      <div class="field"><label>Password</label><div class="pw-wrap"><input id="im-pw" type="password" placeholder="Password used on export"><button class="pw-eye" onclick="togglePw('im-pw')">👁</button></div></div>
      <button class="btn btn-outline" id="btn-import">Import & Merge</button>
    </div>
    <div class="sec-title" style="color:var(--danger)">Danger Zone</div>
    <div class="card"><button class="btn btn-danger" id="btn-reset">Reset This Group's Data</button></div>`;
  }else if(t==='about'){
    body=`<div class="card">
      <div style="text-align:center;padding:14px 0 6px">
        <div style="font-size:2.5rem;margin-bottom:6px">✦</div>
        <div style="font-size:1.25rem;font-weight:700;letter-spacing:-0.5px">SplitKira</div>
        <div style="font-size:0.72rem;color:var(--accent);font-weight:600;margin-top:2px;letter-spacing:0.5px">LOCAL · ENCRYPTED · FAIR</div>
        <div style="font-size:0.72rem;color:var(--text2);margin-top:4px">v1.0 · Split bills. Kira-kira together.</div>
      </div>
      <div class="divider"></div>
      <div class="set-row"><span>Version</span><span class="badge accent">v1.0</span></div>
      <div class="set-row"><span>Multi-group</span><span class="badge success">Yes</span></div>
      <div class="set-row"><span>Storage</span><span class="badge success">On-device only</span></div>
      <div class="set-row"><span>Encryption</span><span class="badge success">AES-256-GCM</span></div>
      <div class="set-row"><span>Server / account</span><span class="badge success">None — ever</span></div>
      <div class="set-row"><span>Ads</span><span class="badge success">Zero</span></div>
    </div>`;
  }
  $('content').innerHTML=tabs+body;
  document.querySelectorAll('.stab').forEach(s=>s.addEventListener('click',()=>renderSettings(s.dataset.stab)));
  if(t==='profile'){
    document.querySelectorAll('[data-rm]').forEach(btn=>btn.addEventListener('click',()=>{
      const cur=[...document.querySelectorAll('.s-mbr')].map(x=>x.value.trim()).filter(Boolean);
      if(cur.length<=2){toast('Minimum 2 members','err');return;}
      cur.splice(parseInt(btn.dataset.rm),1);g.members=cur;renderSettings('profile');
    }));
    $('s-add-mbr').addEventListener('click',()=>{
      const cur=[...document.querySelectorAll('.s-mbr')].map(x=>x.value.trim()).filter(Boolean);
      cur.push(`Member ${cur.length+1}`);g.members=cur;renderSettings('profile');
    });
    $('s-save').addEventListener('click',async()=>{
      const name=$('s-gname').value.trim();
      const mbrs=[...document.querySelectorAll('.s-mbr')].map(x=>x.value.trim()).filter(Boolean);
      const cur2=$('s-cur').value;
      if(!name){toast('Group name required','err');return;}
      if(mbrs.length<2){toast('At least 2 members required','err');return;}
      if(new Set(mbrs).size!==mbrs.length){toast('Member names must be unique','err');return;}
      Object.assign(g,{name,members:mbrs,currency:cur2,_ts:Date.now()});
      await DB.put('groups',g);toast('Saved','ok');navigate('dashboard');
    });
  }
  if(t==='categories'){
    document.querySelectorAll('[data-edit-cat]').forEach(btn=>btn.addEventListener('click',()=>showCatModal(parseInt(btn.getAttribute('data-edit-cat')))));
    document.querySelectorAll('[data-del-cat]').forEach(btn=>btn.addEventListener('click',async()=>{
      const i=parseInt(btn.getAttribute('data-del-cat'));
      if(!confirm(`Delete "${S.categories[i].l}"?`))return;
      S.categories.splice(i,1);await saveCategories();renderSettings('categories');
    }));
    $('add-cat-btn').addEventListener('click',()=>showCatModal(-1));
  }
  if(t==='budgets'){
    $('bud-save').addEventListener('click',async()=>{
      for(const inp of document.querySelectorAll('.bud-input')){
        const cat=inp.dataset.cat,mo=inp.dataset.month,amt=parseFloat(inp.value)||0;
        const id=`${mo}-${cat}-${g.id}`;
        const bv={id,groupId:g.id,month:mo,category:cat,amount:amt,_ts:Date.now()};
        await DB.put('budgets',bv);
        const idx=S.budgets.findIndex(b=>b.id===id);
        if(idx>=0)S.budgets[idx]=bv;else S.budgets.push(bv);
      }
      toast('Budgets saved','ok');renderSettings('budgets');
    });
  }
  if(t==='export'){$('btn-csv').addEventListener('click',exportCSV);$('btn-xlsx').addEventListener('click',exportXLSX);$('btn-pdf').addEventListener('click',exportPDF);}
  if(t==='sync'){$('btn-export').addEventListener('click',doExport);$('btn-import').addEventListener('click',doImport);$('btn-reset').addEventListener('click',doReset);}
}
function showCatModal(idx){
  const ex=idx>=0?S.categories[idx]:{e:'💰',l:'',c:'#888888'};
  showModal(`<div class="modal-title">${idx>=0?'Edit':'New'} Category</div>
    <div class="field"><label>Emoji</label><input id="cm-e" type="text" value="${ex.e}" maxlength="4" style="font-size:1.4rem;text-align:center"></div>
    <div class="field"><label>Name *</label><input id="cm-n" type="text" value="${ex.l}" placeholder="e.g. Subscriptions" autocomplete="off"></div>
    <div class="field"><label>Colour</label>
      <div style="display:flex;gap:9px;align-items:center">
        <input id="cm-col" type="color" value="${ex.c}" style="width:48px;height:38px;padding:2px;border-radius:8px;cursor:pointer;flex-shrink:0">
        <input id="cm-hex" type="text" value="${ex.c}" placeholder="#888888" style="flex:1"></div></div>
    <div class="btn-row"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="cm-save">Save</button></div>`);
  $('cm-col').addEventListener('input',()=>$('cm-hex').value=$('cm-col').value);
  $('cm-hex').addEventListener('input',()=>{if(/^#[0-9a-f]{6}$/i.test($('cm-hex').value))$('cm-col').value=$('cm-hex').value;});
  $('cm-save').addEventListener('click',async()=>{
    const e=$('cm-e').value.trim()||'💰',l=$('cm-n').value.trim(),c=$('cm-hex').value.trim()||'#888888';
    if(!l){toast('Name required','err');return;}
    if(idx>=0)S.categories[idx]={e,l,c};else S.categories.push({e,l,c});
    await saveCategories();closeModal();renderSettings('categories');
  });
}
function showExportMenu(){
  showModal(`<div class="modal-title">Export Options</div>
    <div style="display:flex;flex-direction:column;gap:9px">
      <button class="btn btn-outline" onclick="closeModal();exportCSV()">CSV (Excel / Google Sheets)</button>
      <button class="btn btn-outline" onclick="closeModal();exportXLSX()">Excel Workbook (.xlsx)</button>
      <button class="btn btn-primary" onclick="closeModal();exportPDF()">PDF Report</button>
    </div>`);
}
