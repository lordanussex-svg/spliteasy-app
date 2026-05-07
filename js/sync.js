'use strict';
function togglePw(id){const el=$(id);el.type=el.type==='password'?'text':'password';}

// ═══════════════════════════════════════════════
// EXPORT — encrypted JSON backup (all groups)
// ═══════════════════════════════════════════════
async function doExport(){
  const pw=$('ex-pw').value,pw2=$('ex-pw2').value;
  if(!pw){toast('Enter a password','err');return;}
  if(pw!==pw2){toast('Passwords do not match','err');return;}
  toast('Encrypting...','info',1500);
  try{
    const payload={expenses:S.expenses.filter(e=>!e._del),settlements:S.settlements.filter(s=>!s._del),
      budgets:S.budgets,groups:S.groups.filter(g=>!g._del),categories:S.categories,
      globalSettings:S.globalSettings,exportedAt:new Date().toISOString(),version:'3.0'};
    const enc=await CRYPTO.encrypt(payload,pw);
    const blob=new Blob([JSON.stringify(enc)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=`splitkira_backup_${today()}.json`;a.click();URL.revokeObjectURL(url);
    toast('Backup downloaded — share via AirDrop or iMessage','ok',3500);
  }catch(e){toast('Export failed: '+e.message,'err');}
}

// ═══════════════════════════════════════════════
// IMPORT Step 1 — decrypt file, show preview
// ═══════════════════════════════════════════════
async function doImport(){
  const file=$('im-file').files[0],pw=$('im-pw').value;
  if(!file){toast('Select a backup file','err');return;}
  if(!pw){toast('Enter the decryption password','err');return;}
  toast('Decrypting...','info',1500);
  try{
    const pkg=JSON.parse(await file.text());
    const remote=await CRYPTO.decrypt(pkg,pw);
    showImportPreview(remote);
  }catch(e){toast('Import failed — wrong password or corrupted file','err',4000);}
}

// ═══════════════════════════════════════════════
// IMPORT Step 2 — per-group selection modal
// ═══════════════════════════════════════════════
function showImportPreview(remote){
  window._pendingImport=remote;
  const bkGroups=(remote.groups||[]).filter(g=>!g._del);
  window._pendingGroups=bkGroups;
  if(!bkGroups.length){toast('No groups found in backup','err');return;}
  const localGroups=S.groups.filter(g=>!g._del);
  const expAt=remote.exportedAt
    ?new Date(remote.exportedAt).toLocaleString('en-SG',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
    :'Unknown';
  const groupRows=bkGroups.map((g,i)=>{
    const expCount=(remote.expenses||[]).filter(e=>!e._del&&e.groupId===g.id).length;
    const settCount=(remote.settlements||[]).filter(s=>!s._del&&s.groupId===g.id).length;
    const matchId=localGroups.find(l=>l.name.toLowerCase()===g.name.toLowerCase())?.id||'';
    const localOpts=localGroups.map(l=>`<option value="${l.id}"${l.id===matchId?' selected':''}>${l.emoji||''} ${l.name}</option>`).join('');
    return`<div class="card" style="padding:11px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">
        <span style="font-size:1.4rem;line-height:1">${g.emoji||'🏠'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:0.92rem">${g.name}</div>
          <div style="font-size:0.68rem;color:var(--text2)">${g.members.join(' · ')} &nbsp;·&nbsp; ${g.currency}</div>
          <div style="font-size:0.68rem;color:var(--text2)">${expCount} expense${expCount!==1?'s':''} &nbsp;·&nbsp; ${settCount} settlement${settCount!==1?'s':''}</div>
        </div>
      </div>
      <div class="field" style="margin-bottom:0">
        <label>Import into</label>
        <select id="imp-t-${i}">
          <option value="">+ Create as new group</option>
          ${localOpts}
          <option value="__skip__">— Skip this group —</option>
        </select>
      </div>
    </div>`;
  }).join('');
  showModal(`<div class="modal-title">Import Preview</div>
    <div style="font-size:0.75rem;color:var(--text2);margin-bottom:12px">
      Backup: <b style="color:var(--text)">${expAt}</b> &nbsp;·&nbsp;
      ${bkGroups.length} group${bkGroups.length!==1?'s':''} &nbsp;·&nbsp;
      ${(remote.expenses||[]).filter(e=>!e._del).length} expenses total
    </div>
    ${groupRows}
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:9px;margin:8px 0;font-size:0.77rem;color:#f59e0b;line-height:1.5">
      ⚠️ <b>Overwrite</b> replaces all data in that group. <b>Create as new</b> adds a fresh copy.
    </div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmImport()">Import Selected</button>
    </div>`);
}

// ═══════════════════════════════════════════════
// IMPORT Step 3 — execute selections
// ═══════════════════════════════════════════════
async function confirmImport(){
  const remote=window._pendingImport;
  const bkGroups=window._pendingGroups||[];
  const selections=bkGroups.map((_,i)=>document.getElementById('imp-t-'+i)?.value||'__skip__');
  const toProcess=bkGroups.filter((_,i)=>selections[i]!=='__skip__');
  if(!toProcess.length){toast('Nothing selected to import','err');return;}
  // Warn about overwrites
  const overwriteNames=[];
  bkGroups.forEach((g,i)=>{
    if(selections[i]&&selections[i]!=='__skip__'&&selections[i]!==''){
      const lg=S.groups.find(l=>l.id===selections[i]);
      if(lg)overwriteNames.push('"'+lg.name+'"');
    }
  });
  if(overwriteNames.length){
    if(!confirm('This will overwrite all data in: '+overwriteNames.join(', ')+'\n\nContinue?'))return;
  }
  closeModal();
  toast('Importing...','info',2000);
  try{
    let created=0,updated=0;
    for(let i=0;i<bkGroups.length;i++){
      if(selections[i]==='__skip__')continue;
      const isNew=selections[i]==='';
      await _importGroupData(remote,bkGroups[i],isNew?null:selections[i]);
      isNew?created++:updated++;
    }
    if(remote.categories?.length){S.categories=remote.categories;await saveCategories();}
    const parts=[];
    if(updated)parts.push(updated+' group'+(updated!==1?'s':'')+' updated');
    if(created)parts.push(created+' group'+(created!==1?'s':'')+' created');
    toast(parts.join(' · ')+' ✅','ok',4000);
    S.activeGroupId=null;showNav(false);renderGroups();
  }catch(e){toast('Import error: '+e.message,'err',4000);}
}

// ═══════════════════════════════════════════════
// IMPORT helper — import / overwrite one group
// ═══════════════════════════════════════════════
async function _importGroupData(remote,bkGroup,targetGroupId){
  const assignId=targetGroupId||uid();
  if(targetGroupId){
    // Overwrite: remove target group's records from memory
    S.expenses=S.expenses.filter(e=>e.groupId!==targetGroupId);
    S.settlements=S.settlements.filter(s=>s.groupId!==targetGroupId);
    S.budgets=S.budgets.filter(b=>b.groupId!==targetGroupId);
    // Update group settings to match backup
    const lg=S.groups.find(g=>g.id===targetGroupId);
    if(lg){
      Object.assign(lg,{name:bkGroup.name,emoji:bkGroup.emoji,color:bkGroup.color,
        members:bkGroup.members,currency:bkGroup.currency,_ts:Date.now()});
      await DB.put('groups',lg);
    }
  } else {
    // Create new group
    const ng={id:assignId,name:bkGroup.name,emoji:bkGroup.emoji,color:bkGroup.color||'#7c6fee',
      members:bkGroup.members,currency:bkGroup.currency,createdAt:Date.now(),_ts:Date.now()};
    await DB.put('groups',ng);
    S.groups.push(ng);
  }
  // Remap groupId and add to memory
  const newExps=(remote.expenses||[]).filter(e=>e.groupId===bkGroup.id).map(e=>({...e,groupId:assignId}));
  const newSetts=(remote.settlements||[]).filter(s=>s.groupId===bkGroup.id).map(s=>({...s,groupId:assignId}));
  const newBuds=(remote.budgets||[]).filter(b=>b.groupId===bkGroup.id).map(b=>({...b,groupId:assignId}));
  S.expenses.push(...newExps);
  S.settlements.push(...newSetts);
  S.budgets.push(...newBuds);
  // Persist all (clear + re-insert to avoid orphans)
  await DB.clear('expenses');for(const e of S.expenses)await DB.put('expenses',e);
  await DB.clear('settlements');for(const s of S.settlements)await DB.put('settlements',s);
  await DB.clear('budgets');for(const b of S.budgets)await DB.put('budgets',b);
}

// ═══════════════════════════════════════════════
// RESET (unchanged)
// ═══════════════════════════════════════════════
async function doReset(){
  const g=activeGroup();if(!g)return;
  if(!confirm(`Delete ALL data for "${g.name}"? This cannot be undone.`))return;
  const ids=new Set([
    ...S.expenses.filter(e=>e.groupId===g.id).map(e=>e.id),
    ...S.settlements.filter(s=>s.groupId===g.id).map(s=>s.id),
    ...S.budgets.filter(b=>b.groupId===g.id).map(b=>b.id),
  ]);
  S.expenses=S.expenses.filter(e=>!ids.has(e.id));
  S.settlements=S.settlements.filter(s=>!ids.has(s.id));
  S.budgets=S.budgets.filter(b=>!ids.has(b.id));
  await DB.clear('expenses');for(const e of S.expenses)await DB.put('expenses',e);
  await DB.clear('settlements');for(const s of S.settlements)await DB.put('settlements',s);
  await DB.clear('budgets');for(const b of S.budgets)await DB.put('budgets',b);
  toast('Group data cleared','info');navigate('dashboard');
}

// ═══════════════════════════════════════════════
// GLOBAL SYNC MODAL — accessible from groups page
// ═══════════════════════════════════════════════
function showSyncModal(){
  const groups=S.groups.filter(g=>!g._del);
  const grpOpts=groups.length
    ?groups.map(g=>`<option value="${g.id}">${g.emoji||''} ${g.name}</option>`).join('')
    :'<option value="">No groups yet</option>';
  showModal(`<div class="modal-title">Sync &amp; Backup</div>
    <div style="font-size:0.75rem;color:var(--text2);line-height:1.6;margin-bottom:14px">
      AES-256 encrypted · Nothing leaves your device
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <button class="btn btn-outline" style="padding:14px 8px;text-align:center;height:auto" onclick="showModal(_exportModalHTML())">
        <div style="font-size:1.6rem">📤</div>
        <div style="font-size:0.82rem;font-weight:700;margin-top:5px">Export</div>
        <div style="font-size:0.65rem;color:var(--text2);margin-top:2px">All groups · Encrypted</div>
      </button>
      <button class="btn btn-outline" style="padding:14px 8px;text-align:center;height:auto" onclick="showModal(_importModalHTML())">
        <div style="font-size:1.6rem">📥</div>
        <div style="font-size:0.82rem;font-weight:700;margin-top:5px">Import</div>
        <div style="font-size:0.65rem;color:var(--text2);margin-top:2px">Choose group to sync</div>
      </button>
      <button class="btn btn-outline" style="padding:14px 8px;text-align:center;height:auto" onclick="showQRExportPicker()">
        <div style="font-size:1.6rem">&#9729;</div>
        <div style="font-size:0.82rem;font-weight:700;margin-top:5px">Share QR</div>
        <div style="font-size:0.65rem;color:var(--text2);margin-top:2px">Last 90 days · 1 group</div>
      </button>
      <button class="btn btn-outline" style="padding:14px 8px;text-align:center;height:auto" onclick="closeModal();setTimeout(showQRScan,150)">
        <div style="font-size:1.6rem">📷</div>
        <div style="font-size:0.82rem;font-weight:700;margin-top:5px">Scan QR</div>
        <div style="font-size:0.65rem;color:var(--text2);margin-top:2px">Import via camera</div>
      </button>
    </div>
    <button class="btn btn-outline" onclick="closeModal()">Close</button>`);
}
function _exportModalHTML(){
  return`<div class="modal-title">Export Backup</div>
    <div style="font-size:0.78rem;color:var(--text2);margin-bottom:10px">Exports all groups, encrypted with your password.</div>
    <div class="field"><label>Password</label><div class="pw-wrap"><input id="ex-pw" type="password" placeholder="Choose a password"><button class="pw-eye" onclick="togglePw('ex-pw')">👁</button></div></div>
    <div class="field"><label>Confirm</label><div class="pw-wrap"><input id="ex-pw2" type="password" placeholder="Repeat password"><button class="pw-eye" onclick="togglePw('ex-pw2')">👁</button></div></div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="showSyncModal()">&#8592; Back</button>
      <button class="btn btn-primary" onclick="doExport()">Export</button>
    </div>`;
}
function _importModalHTML(){
  return`<div class="modal-title">Import Backup</div>
    <div style="font-size:0.78rem;color:var(--text2);margin-bottom:10px">You'll choose which group to sync after decryption.</div>
    <div class="field"><label>Backup file (.json)</label><input id="im-file" type="file" accept=".json"></div>
    <div class="field"><label>Password</label><div class="pw-wrap"><input id="im-pw" type="password" placeholder="Password used on export"><button class="pw-eye" onclick="togglePw('im-pw')">👁</button></div></div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="showSyncModal()">&#8592; Back</button>
      <button class="btn btn-primary" onclick="doImport()">Decrypt &amp; Preview</button>
    </div>`;
}

// ═══════════════════════════════════════════════
// QR EXPORT — pick group, generate QR code
// ═══════════════════════════════════════════════
function showQRExportPicker(){
  const groups=S.groups.filter(g=>!g._del);
  if(!groups.length){toast('No groups to share','err');return;}
  if(groups.length===1){showQRExport(groups[0].id);return;}
  const opts=groups.map(g=>`<option value="${g.id}">${g.emoji||''} ${g.name}</option>`).join('');
  showModal(`<div class="modal-title">Share via QR</div>
    <div class="field">
      <label>Choose group to share</label>
      <select id="qr-pick-grp">${opts}</select>
    </div>
    <div style="font-size:0.75rem;color:var(--text2);margin-bottom:10px">Includes last 90 days of expenses. Unencrypted — for device-to-device transfer only.</div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="showSyncModal()">&#8592; Back</button>
      <button class="btn btn-primary" onclick="showQRExport($('qr-pick-grp').value)">Generate QR</button>
    </div>`);
}

function showQRExport(groupId){
  if(!groupId){toast('Select a group','err');return;}
  const g=S.groups.find(x=>x.id===groupId);
  if(!g){toast('Group not found','err');return;}
  if(typeof QRCode==='undefined'){toast('QR library not loaded — need internet first','err',4000);return;}
  // Build compact payload — last 90 days
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
  const cutoffStr=cutoff.toISOString().slice(0,10);
  let exps=S.expenses.filter(e=>!e._del&&e.groupId===groupId&&e.date>=cutoffStr);
  let setts=S.settlements.filter(s=>!s._del&&s.groupId===groupId);
  const payload={v:'sk1',g:{id:g.id,name:g.name,emoji:g.emoji,color:g.color,members:g.members,currency:g.currency},e:exps,s:setts,ts:Date.now()};
  const json=JSON.stringify(payload);
  // Check size — QR max ~2900 bytes of data; LZString helps
  if(typeof LZString==='undefined'){toast('Compression library not loaded','err',4000);return;}
  let compressed=LZString.compressToEncodedURIComponent(json);
  // If still too big, trim to 30 days
  if(compressed.length>2800){
    const cutoff30=new Date();cutoff30.setDate(cutoff30.getDate()-30);
    const c30=cutoff30.toISOString().slice(0,10);
    exps=S.expenses.filter(e=>!e._del&&e.groupId===groupId&&e.date>=c30);
    const p2={...payload,e:exps,_trimmed:'30d'};
    compressed=LZString.compressToEncodedURIComponent(JSON.stringify(p2));
  }
  const dayLabel=compressed.length>2800?'14':'90';
  showModal(`<div class="modal-title">QR Code — ${g.name}</div>
    <div style="font-size:0.72rem;color:var(--text2);text-align:center;margin-bottom:10px">
      Last ${dayLabel} days &nbsp;·&nbsp; ${exps.length} expenses &nbsp;·&nbsp; Scan with SplitKira on another device
    </div>
    <div id="qr-wrap" style="display:flex;justify-content:center;align-items:center;padding:12px;background:#fff;border-radius:14px;margin-bottom:12px"></div>
    <div style="font-size:0.7rem;color:var(--text2);text-align:center;margin-bottom:10px">
      ⚠️ Not encrypted — for immediate device-to-device use only
    </div>
    <button class="btn btn-outline" onclick="closeModal()">Done</button>`);
  setTimeout(()=>{
    const wrap=document.getElementById('qr-wrap');
    if(!wrap)return;
    const canvas=document.createElement('canvas');
    wrap.appendChild(canvas);
    QRCode.toCanvas(canvas,compressed,{width:240,margin:1,color:{dark:'#0d0d1a',light:'#ffffff'}},err=>{
      if(err)toast('QR too large — try exporting as encrypted backup instead','err',4000);
    });
  },120);
}

// ═══════════════════════════════════════════════
// QR SCAN — camera → jsQR → import
// ═══════════════════════════════════════════════
let _qrStream=null,_qrRaf=null;

function showQRScan(){
  if(typeof jsQR==='undefined'){toast('QR scanner not loaded — need internet first','err',4000);return;}
  showModal(`<div class="modal-title">Scan QR Code</div>
    <div style="border-radius:14px;overflow:hidden;background:#000;margin-bottom:10px;position:relative;aspect-ratio:1">
      <video id="qr-vid" style="width:100%;height:100%;object-fit:cover;display:block" playsinline muted></video>
      <canvas id="qr-canvas" style="display:none"></canvas>
      <div style="position:absolute;inset:0;pointer-events:none">
        <div style="position:absolute;top:20%;left:20%;right:20%;bottom:20%;border:2.5px solid var(--accent);border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,0.45)"></div>
        <div style="position:absolute;bottom:12px;width:100%;text-align:center;font-size:0.72rem;color:rgba(255,255,255,0.8)">Align QR code inside the box</div>
      </div>
    </div>
    <button class="btn btn-outline" onclick="_stopQRScan();closeModal()">Cancel</button>`);
  setTimeout(_startQRScan,200);
}

async function _startQRScan(){
  const vid=document.getElementById('qr-vid');
  const cvs=document.getElementById('qr-canvas');
  if(!vid||!cvs)return;
  try{
    _qrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:1280}}});
    vid.srcObject=_qrStream;
    await vid.play();
    const ctx=cvs.getContext('2d');
    function scan(){
      if(!document.getElementById('qr-vid')){_stopQRScan();return;}
      if(vid.readyState>=vid.HAVE_ENOUGH_DATA){
        cvs.width=vid.videoWidth;cvs.height=vid.videoHeight;
        ctx.drawImage(vid,0,0);
        const imgData=ctx.getImageData(0,0,cvs.width,cvs.height);
        const code=jsQR(imgData.data,imgData.width,imgData.height,{inversionAttempts:'dontInvert'});
        if(code){_stopQRScan();closeModal();_processQRData(code.data);return;}
      }
      _qrRaf=requestAnimationFrame(scan);
    }
    _qrRaf=requestAnimationFrame(scan);
  }catch(e){
    toast('Camera access denied. Enable in browser settings.','err',4000);
    closeModal();
  }
}

function _stopQRScan(){
  if(_qrStream){_qrStream.getTracks().forEach(t=>t.stop());_qrStream=null;}
  if(_qrRaf){cancelAnimationFrame(_qrRaf);_qrRaf=null;}
}

function _processQRData(raw){
  try{
    if(typeof LZString==='undefined')throw new Error('Compression library not loaded');
    const json=LZString.decompressFromEncodedURIComponent(raw);
    if(!json)throw new Error('Invalid QR data');
    const payload=JSON.parse(json);
    if(payload.v!=='sk1')throw new Error('Not a SplitKira QR code');
    showQRImportPreview(payload);
  }catch(e){toast('Invalid QR — not a SplitKira code','err',3500);}
}

// ═══════════════════════════════════════════════
// QR IMPORT — preview & confirm
// ═══════════════════════════════════════════════
function showQRImportPreview(payload){
  window._pendingQR=payload;
  const qg=payload.g;
  const qExps=payload.e||[];
  const qSetts=payload.s||[];
  const ts=new Date(payload.ts).toLocaleString('en-SG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const localGroups=S.groups.filter(g=>!g._del);
  const matchId=localGroups.find(l=>l.name.toLowerCase()===qg.name.toLowerCase())?.id||'';
  const localOpts=localGroups.map(l=>`<option value="${l.id}"${l.id===matchId?' selected':''}>${l.emoji||''} ${l.name}</option>`).join('');
  const trimNote=payload._trimmed?`<div style="font-size:0.68rem;color:var(--warn);margin-top:3px">Last 30 days only (large dataset)</div>`:'';
  showModal(`<div class="modal-title">QR Sync</div>
    <div class="card" style="padding:12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.8rem;line-height:1">${qg.emoji||'🏠'}</span>
        <div>
          <div style="font-weight:700;font-size:1rem">${qg.name}</div>
          <div style="font-size:0.7rem;color:var(--text2)">${qg.members.join(' · ')} &nbsp;·&nbsp; ${qg.currency}</div>
          <div style="font-size:0.7rem;color:var(--text2)">${qExps.length} expenses &nbsp;·&nbsp; ${qSetts.length} settlements &nbsp;·&nbsp; ${ts}</div>
          ${trimNote}
        </div>
      </div>
    </div>
    <div class="field">
      <label>Sync into</label>
      <select id="qr-target">
        <option value="">+ Create as new group</option>
        ${localOpts}
        <option value="__skip__">— Cancel sync —</option>
      </select>
    </div>
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:9px;margin:8px 0;font-size:0.77rem;color:#f59e0b;line-height:1.5">
      ⚠️ Syncing into an existing group <b>overwrites</b> all its data with the scanned data.
    </div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmQRImport()">Sync Now</button>
    </div>`);
}

async function confirmQRImport(){
  const payload=window._pendingQR;
  if(!payload)return;
  const targetId=document.getElementById('qr-target')?.value;
  if(targetId==='__skip__'){closeModal();return;}
  if(targetId){
    const lg=S.groups.find(l=>l.id===targetId);
    if(!confirm('This will overwrite all data in "'+( lg?.name||'selected group')+'".\n\nContinue?'))return;
  }
  closeModal();
  toast('Syncing...','info',2000);
  try{
    const remotePayload={groups:[payload.g],expenses:payload.e||[],settlements:payload.s||[],budgets:[]};
    await _importGroupData(remotePayload,payload.g,targetId||null);
    toast('QR Sync complete ✅','ok',3500);
    S.activeGroupId=null;showNav(false);renderGroups();
  }catch(e){toast('Sync failed: '+e.message,'err',4000);}
}
