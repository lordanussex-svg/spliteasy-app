'use strict';
function togglePw(id){const el=$(id);el.type=el.type==='password'?'text':'password';}
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
    a.href=url;a.download=`spliteasy_backup_${today()}.json`;a.click();URL.revokeObjectURL(url);
    toast('Backup downloaded — share via AirDrop or iMessage','ok',3500);
  }catch(e){toast('Export failed: '+e.message,'err');}
}
async function doImport(){
  const file=$('im-file').files[0],pw=$('im-pw').value;
  if(!file){toast('Select a backup file','err');return;}
  if(!pw){toast('Enter the decryption password','err');return;}
  toast('Decrypting & merging...','info',2000);
  try{
    const pkg=JSON.parse(await file.text());
    const remote=await CRYPTO.decrypt(pkg,pw);
    const local={expenses:S.expenses,settlements:S.settlements,budgets:S.budgets,groups:S.groups};
    const merged=LOGIC.merge(local,remote);
    await DB.clear('expenses');for(const e of merged.expenses)await DB.put('expenses',e);
    await DB.clear('settlements');for(const s of merged.settlements)await DB.put('settlements',s);
    await DB.clear('budgets');for(const b of merged.budgets)await DB.put('budgets',b);
    await DB.clear('groups');for(const g of merged.groups)await DB.put('groups',g);
    S.expenses=merged.expenses;S.settlements=merged.settlements;S.budgets=merged.budgets;S.groups=merged.groups;
    if(remote.categories?.length){S.categories=remote.categories;await saveCategories();}
    toast(`Merged! +${Math.max(0,merged.expenses.length-local.expenses.length)} expenses`,'ok',4000);
    S.activeGroupId=null;showNav(false);renderGroups();
  }catch(e){toast('Import failed — wrong password or corrupted file','err',4000);}
}
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
