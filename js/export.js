'use strict';
function exportCSV(){
  const g=activeGroup();if(!g)return;
  const exps=gExps().sort((a,b)=>b.date.localeCompare(a.date));
  if(!exps.length){toast('No expenses to export','err');return;}
  const rows=[['Date','Description','Category',`Amount (${g.currency})`,'Paid By','Split Type',...g.members.map(m=>m+' %'),'Notes','Recurring'],
    ...exps.map(e=>[e.date,e.description,e.category,e.amount.toFixed(2),e.paidBy,e.splitType,
      ...g.members.map(m=>((e.splits||{})[m]||0).toFixed(2)),e.notes||'',e.recurring?'Yes':'No'])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=`${g.name}_${today()}.csv`;a.click();URL.revokeObjectURL(url);
  toast('CSV downloaded','ok');
}
function exportXLSX(){
  if(typeof XLSX==='undefined'){toast('SheetJS not loaded — need internet on first load','err',4000);return;}
  const g=activeGroup();if(!g)return;
  const exps=gExps().sort((a,b)=>b.date.localeCompare(a.date));
  const setts=gSetts();const cur=g.currency,mbrs=g.members;
  const txData=[['Date','Description','Category',`Amount (${cur})`,'Paid By','Split Type',...mbrs.map(m=>m+' %'),'Notes','Recurring'],
    ...exps.map(e=>[e.date,e.description,e.category,e.amount,e.paidBy,e.splitType,
      ...mbrs.map(m=>parseFloat(((e.splits||{})[m]||0).toFixed(2))),e.notes||'',e.recurring?'Yes':'No'])];
  const mM={};exps.forEach(e=>{const m=e.date.slice(0,7);if(!mM[m])mM[m]={total:0,p:Object.fromEntries(mbrs.map(mb=>[mb,0]))};mM[m].total+=e.amount;if(e.paidBy in mM[m].p)mM[m].p[e.paidBy]+=e.amount;});
  const moData=[['Month','Total',...mbrs.map(m=>m+' Paid')],...Object.entries(mM).sort().reverse().map(([m,v])=>[monthLabel(m),v.total,...mbrs.map(mb=>v.p[mb]||0)])];
  const bals=LOGIC.balances(exps,setts,mbrs);const txns=LOGIC.simplify(bals);
  const balData=[['Member','Net Balance','Status'],...mbrs.map(m=>[m,bals[m]||0,(bals[m]||0)>0.01?'Is owed':(bals[m]||0)<-0.01?'Owes':'Settled']),
    [],['Settlements needed'],['From','To','Amount'],...txns.map(t=>[t.debtor,t.creditor,t.amount])];
  const sData=[['Date','Payer','Receiver',`Amount (${cur})`,'Notes'],...setts.sort((a,b)=>b.date.localeCompare(a.date)).map(s=>[s.date,s.payer,s.receiver,s.amount,s.notes||''])];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(txData),'Transactions');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(moData),'Monthly Summary');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(balData),'Balances');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sData),'Settlements');
  XLSX.writeFile(wb,`${g.name}_${today()}.xlsx`);toast('Excel downloaded','ok');
}
function exportPDF(){
  if(typeof window.jspdf==='undefined'){toast('jsPDF not loaded — need internet on first load','err',4000);return;}
  const {jsPDF}=window.jspdf;const g=activeGroup();if(!g)return;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const cur=g.currency,mbrs=g.members;
  const exps=gExps().sort((a,b)=>b.date.localeCompare(a.date));
  const setts=gSetts();
  const bals=LOGIC.balances(exps,setts,mbrs);
  const txns=LOGIC.simplify(bals);
  const TH={fillColor:[92,79,207],textColor:255,fontStyle:'bold'};
  const TS={fontSize:9,cellPadding:3};const ARS={fillColor:[245,244,255]};
  function footer(){const n=doc.internal.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(150);doc.text(`SplitKira · ${g.name} · ${new Date().toLocaleDateString('en-SG')} · Page ${i}/${n}`,W/2,290,{align:'center'});}}
  doc.setFillColor(44,35,120);doc.rect(0,0,W,40,'F');doc.setFillColor(92,79,207);doc.rect(0,33,W,8,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(20);doc.setFont('helvetica','bold');doc.text('SplitKira',14,15);
  doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text('Expense Report',14,23);
  doc.setFontSize(8.5);doc.text(g.name,14,30);doc.text(`Generated: ${new Date().toLocaleDateString('en-SG',{day:'numeric',month:'long',year:'numeric'})}`,W-14,30,{align:'right'});
  let y=50;
  doc.setTextColor(30,30,60);doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text('Balance Summary',14,y);y+=5;
  if(txns.length===0){doc.setFontSize(10);doc.setFont('helvetica','normal');doc.setTextColor(34,150,80);doc.text('All settled up!',14,y);y+=9;}
  else{doc.autoTable({startY:y,head:[['Owes','To','Amount']],body:txns.map(t=>[t.debtor,t.creditor,`${cur} ${t.amount.toFixed(2)}`]),styles:TS,headStyles:TH,alternateRowStyles:ARS,margin:{left:14,right:14}});y=doc.lastAutoTable.finalY+7;}
  doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(30,30,60);doc.text('Net Position',14,y);y+=5;
  doc.autoTable({startY:y,head:[['Member','Balance','Status']],body:mbrs.map(m=>{const v=bals[m]||0;return[m,`${cur} ${(v>=0?'+':'')}${v.toFixed(2)}`,v>0.01?'Is owed':v<-0.01?'Owes':'Settled'];}),styles:TS,headStyles:TH,alternateRowStyles:ARS,margin:{left:14,right:14}});y=doc.lastAutoTable.finalY+7;
  const mM={};exps.forEach(e=>{const m=e.date.slice(0,7);if(!mM[m])mM[m]={total:0,p:Object.fromEntries(mbrs.map(mb=>[mb,0]))};mM[m].total+=e.amount;if(e.paidBy in mM[m].p)mM[m].p[e.paidBy]+=e.amount;});
  const moE=Object.entries(mM).sort().reverse();
  if(moE.length){if(y>215){doc.addPage();y=18;}doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(30,30,60);doc.text('Monthly Summary',14,y);y+=5;
    doc.autoTable({startY:y,head:[['Month','Total',...mbrs.map(m=>m+' Paid')]],body:moE.map(([m,v])=>[monthLabel(m),`${cur} ${v.total.toFixed(2)}`,...mbrs.map(mb=>`${cur} ${(v.p[mb]||0).toFixed(2)}`)]),styles:TS,headStyles:TH,alternateRowStyles:ARS,margin:{left:14,right:14}});y=doc.lastAutoTable.finalY+7;}
  const cT={};exps.forEach(e=>{cT[e.category]=(cT[e.category]||0)+e.amount;});const cE=Object.entries(cT).sort((a,b)=>b[1]-a[1]);const grand=exps.reduce((s,e)=>s+e.amount,0);
  if(cE.length){if(y>215){doc.addPage();y=18;}doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(30,30,60);doc.text('By Category',14,y);y+=5;
    doc.autoTable({startY:y,head:[['Category','Amount','% Total']],body:cE.map(([cat,amt])=>[cat,`${cur} ${amt.toFixed(2)}`,`${(amt/grand*100).toFixed(1)}%`]),styles:TS,headStyles:TH,alternateRowStyles:ARS,margin:{left:14,right:14}});}
  doc.addPage();y=18;doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(30,30,60);doc.text('All Transactions',14,y);y+=5;
  doc.autoTable({startY:y,head:[['Date','Description','Category','Amount','Paid By','Split']],
    body:exps.map(e=>[fmtDate(e.date),e.description,e.category,`${cur} ${e.amount.toFixed(2)}`,e.paidBy,
      Object.entries(e.splits||{}).filter(([,p])=>p>0).map(([m,p])=>`${m.split(' ')[0]}: ${p.toFixed(0)}%`).join(' / ')]),
    styles:{fontSize:8,cellPadding:2.5,overflow:'linebreak'},headStyles:TH,alternateRowStyles:ARS,
    columnStyles:{0:{cellWidth:23},1:{cellWidth:54},2:{cellWidth:28},3:{cellWidth:22},4:{cellWidth:20},5:{cellWidth:28}},margin:{left:14,right:14}});
  footer();doc.save(`${g.name}_report_${today()}.pdf`);toast('PDF downloaded','ok',3500);
}
