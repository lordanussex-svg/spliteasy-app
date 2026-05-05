'use strict';
const LOGIC={
  balances(exps,setts,members){
    const b=Object.fromEntries(members.map(m=>[m,0]));
    for(const e of exps){
      if(e.paidBy in b)b[e.paidBy]+=e.amount;
      for(const[p,pct]of Object.entries(e.splits||{}))if(p in b)b[p]-=e.amount*pct/100;
    }
    for(const s of setts){
      if(s.payer in b)b[s.payer]+=s.amount;
      if(s.receiver in b)b[s.receiver]-=s.amount;
    }
    return Object.fromEntries(Object.entries(b).map(([k,v])=>[k,Math.round(v*100)/100]));
  },
  simplify(bals){
    let d=Object.entries(bals).filter(([,v])=>v<-0.01).map(([p,v])=>[p,-v]).sort((a,b)=>b[1]-a[1]).map(x=>[...x]);
    let c=Object.entries(bals).filter(([,v])=>v>0.01).sort((a,b)=>b[1]-a[1]).map(x=>[...x]);
    const t=[];let i=0,j=0;
    while(i<d.length&&j<c.length){
      const amt=Math.round(Math.min(d[i][1],c[j][1])*100)/100;
      t.push({debtor:d[i][0],creditor:c[j][0],amount:amt});
      d[i][1]=Math.round((d[i][1]-amt)*100)/100;c[j][1]=Math.round((c[j][1]-amt)*100)/100;
      if(d[i][1]<0.01)i++;if(c[j][1]<0.01)j++;
    }
    return t;
  },
  merge(local,remote){
    function mA(a,b){const m=new Map(a.map(x=>[x.id,x]));for(const x of b){const e=m.get(x.id);if(!e||x._ts>e._ts)m.set(x.id,x);}return[...m.values()];}
    return{
      expenses:mA(local.expenses||[],remote.expenses||[]),
      settlements:mA(local.settlements||[],remote.settlements||[]),
      budgets:mA(local.budgets||[],remote.budgets||[]),
      groups:mA(local.groups||[],remote.groups||[]),
    };
  },
};
