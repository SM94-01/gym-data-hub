import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientData {
  name: string;
  email: string;
  totalWorkouts: number;
  totalSessions: number;
  lastActive: string | null;
}

interface MemberData {
  name: string;
  email: string;
  role: string;
  totalWorkouts: number;
  totalSessions: number;
  lastActive: string | null;
  totalClients?: number;
}

// ===== EXCEL REPORTS =====

export function exportClientsExcel(clients: ClientData[], trainerName: string) {
  const wb = XLSX.utils.book_new();
  
  const data = clients.map(c => ({
    'Nome': c.name,
    'Email': c.email,
    'Schede': c.totalWorkouts,
    'Sessioni': c.totalSessions,
    'Ultima Attività': c.lastActive ? new Date(c.lastActive).toLocaleDateString('it-IT') : 'Mai',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Clienti');

  XLSX.writeFile(wb, `GymApp_Report_Clienti_${trainerName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportMembersExcel(members: MemberData[], gymName: string) {
  const wb = XLSX.utils.book_new();

  const pts = members.filter(m => m.role === 'personal_trainer');
  const users = members.filter(m => m.role === 'utente');

  if (pts.length > 0) {
    const ptData = pts.map(m => ({
      'Nome': m.name,
      'Email': m.email,
      'Clienti': m.totalClients || 0,
      'Schede Create': m.totalWorkouts,
      'Sessioni Totali': m.totalSessions,
      'Ultima Attività': m.lastActive ? new Date(m.lastActive).toLocaleDateString('it-IT') : 'Mai',
    }));
    const ws = XLSX.utils.json_to_sheet(ptData);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Personal Trainer');
  }

  if (users.length > 0) {
    const userData = users.map(m => ({
      'Nome': m.name,
      'Email': m.email,
      'Schede': m.totalWorkouts,
      'Sessioni': m.totalSessions,
      'Ultima Attività': m.lastActive ? new Date(m.lastActive).toLocaleDateString('it-IT') : 'Mai',
    }));
    const ws = XLSX.utils.json_to_sheet(userData);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Utenti');
  }

  // Summary sheet
  const summaryData = [
    { 'Metrica': 'PT Totali', 'Valore': pts.length },
    { 'Metrica': 'Utenti Totali', 'Valore': users.length },
    { 'Metrica': 'Schede Totali', 'Valore': members.reduce((s, m) => s + m.totalWorkouts, 0) },
    { 'Metrica': 'Sessioni Totali', 'Valore': members.reduce((s, m) => s + m.totalSessions, 0) },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Riepilogo');

  XLSX.writeFile(wb, `GymApp_Report_Palestra_${gymName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ===== PDF REPORTS =====

export function exportClientsPDF(clients: ClientData[], trainerName: string) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(249, 115, 22);
  doc.text('GymApp', 14, 20);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Report Clienti - ${trainerName}`, 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, 14, 37);

  autoTable(doc, {
    startY: 45,
    head: [['Nome', 'Email', 'Schede', 'Sessioni', 'Ultima Attività']],
    body: clients.map(c => [
      c.name,
      c.email,
      c.totalWorkouts.toString(),
      c.totalSessions.toString(),
      c.lastActive ? new Date(c.lastActive).toLocaleDateString('it-IT') : 'Mai',
    ]),
    headStyles: { fillColor: [249, 115, 22] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`GymApp_Report_Clienti_${trainerName}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportMembersPDF(members: MemberData[], gymName: string) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(249, 115, 22);
  doc.text('GymApp', 14, 20);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Report Palestra - ${gymName}`, 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, 14, 37);

  const pts = members.filter(m => m.role === 'personal_trainer');
  const users = members.filter(m => m.role === 'utente');

  // Summary
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Riepilogo', 14, 50);
  autoTable(doc, {
    startY: 55,
    head: [['Metrica', 'Valore']],
    body: [
      ['Personal Trainer', pts.length.toString()],
      ['Utenti', users.length.toString()],
      ['Schede Totali', members.reduce((s, m) => s + m.totalWorkouts, 0).toString()],
      ['Sessioni Totali', members.reduce((s, m) => s + m.totalSessions, 0).toString()],
    ],
    headStyles: { fillColor: [249, 115, 22] },
    theme: 'grid',
  });

  const afterSummary = (doc as any).lastAutoTable?.finalY || 90;

  if (pts.length > 0) {
    doc.setFontSize(12);
    doc.text('Personal Trainer', 14, afterSummary + 10);
    autoTable(doc, {
      startY: afterSummary + 15,
      head: [['Nome', 'Email', 'Clienti', 'Schede', 'Sessioni']],
      body: pts.map(m => [
        m.name, m.email, (m.totalClients || 0).toString(),
        m.totalWorkouts.toString(), m.totalSessions.toString(),
      ]),
      headStyles: { fillColor: [249, 115, 22] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  }

  const afterPT = (doc as any).lastAutoTable?.finalY || afterSummary + 20;

  if (users.length > 0) {
    if (afterPT > 240) doc.addPage();
    const startY = afterPT > 240 ? 20 : afterPT + 10;
    doc.setFontSize(12);
    doc.text('Utenti', 14, startY);
    autoTable(doc, {
      startY: startY + 5,
      head: [['Nome', 'Email', 'Schede', 'Sessioni', 'Ultima Attività']],
      body: users.map(m => [
        m.name, m.email, m.totalWorkouts.toString(), m.totalSessions.toString(),
        m.lastActive ? new Date(m.lastActive).toLocaleDateString('it-IT') : 'Mai',
      ]),
      headStyles: { fillColor: [249, 115, 22] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  }

  doc.save(`GymApp_Report_Palestra_${gymName}_${new Date().toISOString().split('T')[0]}.pdf`);
}
