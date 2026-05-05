'use strict';
let S={
  page:'groups',activeGroupId:null,settingsTab:'profile',
  groups:[],expenses:[],settlements:[],budgets:[],
  categories:[...DEFAULT_CATS],
  globalSettings:{seeded:false},
};
let catMap={};
function rebuildCatMap(){catMap=Object.fromEntries(S.categories.map(c=>[c.l,c]));}
function activeGroup(){return S.groups.find(g=>g.id===S.activeGroupId)||null;}
function gExps(){return S.expenses.filter(e=>!e._del&&e.groupId===S.activeGroupId);}
function gSetts(){return S.settlements.filter(s=>!s._del&&s.groupId===S.activeGroupId);}
function gBuds(){return S.budgets.filter(b=>b.groupId===S.activeGroupId);}
async function loadState(){
  S.groups=await DB.all('groups');
  S.expenses=await DB.all('expenses');
  S.settlements=await DB.all('settlements');
  S.budgets=await DB.all('budgets');
  const cats=await DB.getCfg('categories');if(cats?.length)S.categories=cats;
  const gs=await DB.getCfg('globalSettings');if(gs)S.globalSettings={...S.globalSettings,...gs};
  rebuildCatMap();
}
async function saveGlobalSettings(){await DB.setCfg('globalSettings',S.globalSettings);}
async function saveCategories(){await DB.setCfg('categories',S.categories);rebuildCatMap();}
async function migrateIfNeeded(){
  if(S.groups.length>0)return;
  const old=await DB.getCfg('settings');
  const g={id:'default',name:old?.groupName||'My Group',members:old?.members||['Person A','Person B'],
    currency:old?.currency||'SGD',emoji:'🏠',color:'#7c6fee',createdAt:Date.now(),_ts:Date.now()};
  await DB.put('groups',g);S.groups.push(g);
  for(const e of S.expenses.filter(x=>!x.groupId)){e.groupId='default';await DB.put('expenses',e);}
  for(const s of S.settlements.filter(x=>!x.groupId)){s.groupId='default';await DB.put('settlements',s);}
  for(const b of S.budgets.filter(x=>!x.groupId)){b.groupId='default';await DB.put('budgets',b);}
}
async function maybeSeed(){
  if(S.globalSettings.seeded||S.groups.length===0)return;
  const g=S.groups[0];const[a,b2]=g.members;const t=Date.now();const DAY=86400000;
  const rows=[
    [30,'Rent May',2800,'Rent & Housing',a],[29,'SP Utilities May',198,'Utilities',b2],
    [28,'Cold Storage groceries',132,'Groceries',b2],[27,'Grab ride',22,'Transport',a],
    [26,'Chicken rice Maxwell',16,'Food & Dining',b2],[25,'Netflix + Disney+',34,'Entertainment',a],
    [24,'Gym membership',80,'Fitness',b2],[22,'Nandos date night',64,'Food & Dining',a],
    [15,'Sushi Tei lunch',78,'Food & Dining',b2],[10,'Anniversary dinner',380,'Food & Dining',a],
    [8,'Sheng Siong',94,'Groceries',b2],[6,'Grab rides',55,'Transport',a],
    [4,'Bubble tea',18,'Drinks',b2],[2,'NTUC groceries',112,'Groceries',a],
    [1,'Kopitiam lunch',22,'Food & Dining',b2],[0,'Ya Kun toast',14,'Food & Dining',a],
  ];
  for(const[days,desc,amt,cat,paid]of rows){
    const d=new Date(t-days*DAY).toISOString().slice(0,10);
    const sp=Object.fromEntries(g.members.map(m=>[m,100/g.members.length]));
    const e={id:uid(),groupId:g.id,date:d,description:desc,amount:amt,category:cat,
      paidBy:paid,splitType:'Equal',splits:sp,notes:'',recurring:false,_ts:t-days*DAY,_del:false};
    await DB.put('expenses',e);S.expenses.push(e);
  }
  const sd=new Date(t-15*DAY).toISOString().slice(0,10);
  const sv={id:uid(),groupId:g.id,date:sd,payer:b2,receiver:a,amount:150,notes:'PayNow transfer',_ts:t-15*DAY,_del:false};
  await DB.put('settlements',sv);S.settlements.push(sv);
  const bDefs=[['Food & Dining',600],['Groceries',400],['Transport',200],['Rent & Housing',2900],['Utilities',220],['Entertainment',150]];
  const mo=new Date().toISOString().slice(0,7);
  for(const[cat,amt]of bDefs){
    const bv={id:`${mo}-${cat}-${g.id}`,groupId:g.id,month:mo,category:cat,amount:amt,_ts:t};
    await DB.put('budgets',bv);S.budgets.push(bv);
  }
  S.globalSettings.seeded=true;await saveGlobalSettings();
}
