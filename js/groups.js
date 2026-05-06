'use strict';
function renderGroups(){
  destroyCharts();
  showNav(false);
  setHeader('SplitKira','Local · Encrypted · Fair',false,[
    `<button class="hdr-btn" onclick="showGroupModal()" title="New group">+</button>`
  ]);
  const grps=S.groups.filter(g=>!g._del).sort((a,b)=>b.createdAt-a.createdAt);
  $('content').innerHTML= grps.length===0
    ?`<div class="empty" style="margin-top:60px">
        <div class="empty-ico">💸</div>
        <p style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:6px">No groups yet</p>
        <p>Create your first group to start tracking shared expenses.</p>
        <button class="btn btn-primary" style="margin-top:20px;max-width:260px;margin-left:auto;margin-right:auto" onclick="showGroupModal()">+ Create First Group</button>
      </div>`
    :`<div class="sec-title">${grps.length} group${grps.length!==1?'s':''}</div>
      ${grps.map(g=>{
        const exps=S.expenses.filter(e=>!e._del&&e.groupId===g.id);
        const total=exps.reduce((s,e)=>s+e.amount,0);
        const mo=thisMonth();
        const moTotal=exps.filter(e=>e.date.startsWith(mo)).reduce((s,e)=>s+e.amount,0);
        return`<div class="group-card" data-gid="${g.id}">
          <div class="group-ico" style="background:${g.color}22;color:${g.color}">${g.emoji}</div>
          <div class="group-info">
            <div class="group-name">${g.name}</div>
            <div class="group-meta">${g.members.join(' · ')} &nbsp;|&nbsp; ${g.currency}</div>
            <div class="group-meta" style="margin-top:3px">
              This month: <b style="color:var(--text)">${fmt(moTotal,g.currency)}</b>
              &nbsp;·&nbsp; Total: ${fmt(total,g.currency)}
            </div>
          </div>
          <div class="group-actions" onclick="event.stopPropagation()">
            <button class="btn btn-outline btn-sm btn-icon" onclick="showGroupModal('${g.id}')" title="Edit">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteGroup('${g.id}')" title="Delete">✕</button>
          </div>
        </div>`;
      }).join('')}
      <button class="btn btn-outline-accent" style="margin-top:6px" onclick="showGroupModal()">+ New Group</button>`;
  $('content').querySelectorAll('.group-card').forEach(card=>{
    card.addEventListener('click',()=>enterGroup(card.dataset.gid));
  });
}

function showGroupModal(gid=null){
  const g=gid?S.groups.find(x=>x.id===gid):null;
  const selEmoji=g?.emoji||'🏠';
  const selColor=g?.color||GRP_COLORS[0];
  const mbrs=g?.members||['',''];
  const cur=g?.currency||'SGD';
  const emojiGrid=GRP_EMOJIS.map(e=>`<span class="emoji-opt${e===selEmoji?' sel':''}" data-e="${e}" style="font-size:1.6rem;cursor:pointer;padding:6px;border-radius:8px;border:2px solid ${e===selEmoji?'var(--accent)':'transparent'}">${e}</span>`).join('');
  const colorGrid=GRP_COLORS.map(c=>`<span class="color-opt" data-c="${c}" style="width:24px;height:24px;border-radius:50%;background:${c};cursor:pointer;display:inline-block;margin:3px;outline:${c===selColor?'3px solid white':''};outline-offset:2px"></span>`).join('');
  showModal(`
    <div class="modal-title">${g?'Edit Group':'New Group'}</div>
    <div class="field">
      <label>Icon</label>
      <div style="display:flex;flex-wrap:wrap;gap:2px;background:var(--card2);border-radius:10px;padding:8px" id="emoji-grid">${emojiGrid}</div>
    </div>
    <div class="field">
      <label>Colour</label>
      <div style="display:flex;flex-wrap:wrap;padding:4px;background:var(--card2);border-radius:10px" id="color-grid">${colorGrid}</div>
    </div>
    <div class="field"><label>Group Name *</label><input id="gm-name" value="${g?.name||''}" placeholder="e.g. Home Bills, Bali Trip"></div>
    <div class="field"><label>Currency</label>
      <select id="gm-cur">${CURRENCIES.map(c=>`<option ${c===cur?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field">
      <label>Members</label>
      <div id="gm-mbrs">${mbrs.map((m,i)=>`
        <div class="field-row" style="margin-bottom:7px;align-items:center">
          <div class="field" style="margin-bottom:0;flex:1"><input class="gm-mbr" value="${m}" placeholder="Member ${i+1} name"></div>
          ${mbrs.length>2?`<button class="btn btn-danger btn-sm btn-icon" onclick="gmRemoveMbr(${i})">✕</button>`:''}
        </div>`).join('')}
      </div>
      <button class="btn btn-outline btn-sm" onclick="gmAddMbr()" style="margin-top:4px">+ Add Member</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="gm-save">${g?'Save Changes':'Create Group'}</button>
    </div>`);
  // emoji picker
  let picked={emoji:selEmoji,color:selColor};
  document.querySelectorAll('.emoji-opt').forEach(el=>{
    el.addEventListener('click',()=>{
      document.querySelectorAll('.emoji-opt').forEach(x=>{x.style.border='2px solid transparent';x.classList.remove('sel');});
      el.style.border='2px solid var(--accent)';picked.emoji=el.dataset.e;
    });
  });
  document.querySelectorAll('.color-opt').forEach(el=>{
    el.addEventListener('click',()=>{
      document.querySelectorAll('.color-opt').forEach(x=>x.style.outline='');
      el.style.outline='3px solid white';el.style.outlineOffset='2px';picked.color=el.dataset.c;
    });
  });
  $('gm-save').addEventListener('click',async()=>{
    const name=$('gm-name').value.trim();
    const cur2=$('gm-cur').value;
    const mbrs2=[...document.querySelectorAll('.gm-mbr')].map(x=>x.value.trim()).filter(Boolean);
    if(!name){toast('Group name required','err');return;}
    if(mbrs2.length<2){toast('At least 2 members required','err');return;}
    if(new Set(mbrs2).size!==mbrs2.length){toast('Member names must be unique','err');return;}
    const now=Date.now();
    if(g){
      Object.assign(g,{name,members:mbrs2,currency:cur2,emoji:picked.emoji,color:picked.color,_ts:now});
      await DB.put('groups',g);toast('Group updated ✅','ok');
    } else {
      const ng={id:uid(),name,members:mbrs2,currency:cur2,emoji:picked.emoji,color:picked.color,createdAt:now,_ts:now};
      await DB.put('groups',ng);S.groups.push(ng);toast('Group created! 🎉','ok');
    }
    closeModal();renderGroups();
  });
}

function gmAddMbr(){
  const cur=[...document.querySelectorAll('.gm-mbr')].map(x=>x.value.trim());
  cur.push('');
  const cont=$('gm-mbrs');
  cont.innerHTML=cur.map((m,i)=>`
    <div class="field-row" style="margin-bottom:7px;align-items:center">
      <div class="field" style="margin-bottom:0;flex:1"><input class="gm-mbr" value="${m}" placeholder="Member ${i+1} name"></div>
      ${cur.length>2?`<button class="btn btn-danger btn-sm btn-icon" onclick="gmRemoveMbr(${i})">✕</button>`:''}
    </div>`).join('');
}
function gmRemoveMbr(i){
  const cur=[...document.querySelectorAll('.gm-mbr')].map(x=>x.value.trim());
  if(cur.length<=2){toast('Minimum 2 members','err');return;}
  cur.splice(i,1);
  $('gm-mbrs').innerHTML=cur.map((m,j)=>`
    <div class="field-row" style="margin-bottom:7px;align-items:center">
      <div class="field" style="margin-bottom:0;flex:1"><input class="gm-mbr" value="${m}" placeholder="Member ${j+1} name"></div>
      ${cur.length>2?`<button class="btn btn-danger btn-sm btn-icon" onclick="gmRemoveMbr(${j})">✕</button>`:''}
    </div>`).join('');
}
async function deleteGroup(id){
  const g=S.groups.find(x=>x.id===id);if(!g)return;
  const cnt=S.expenses.filter(e=>!e._del&&e.groupId===id).length;
  const warn=cnt>0?` This will also remove ${cnt} expense${cnt!==1?'s':''}.`:'';
  if(!confirm(`Delete group "${g.name}"?${warn} This cannot be undone.`))return;
  g._del=true;g._ts=Date.now();await DB.put('groups',g);
  toast('Group deleted','info');renderGroups();
}
function enterGroup(id){
  S.activeGroupId=id;S.settingsTab='profile';
  showNav(true);
  $('hdr-back').onclick=exitGroup;
  navigate('dashboard');
}
function exitGroup(){
  S.activeGroupId=null;
  showNav(false);
  renderGroups();
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
}
