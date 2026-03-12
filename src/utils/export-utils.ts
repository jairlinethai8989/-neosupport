import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// --- CSV Export Helper ---
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  );

  const csvContent = "\uFEFF" + [headers, ...rows].join('\n'); // Add BOM for Excel Thai support
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- PDF Export Helper (Tickets List) ---
export const exportTicketsPDF = (tickets: any[], title: string) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Note: For full Thai support in PDF, a custom font must be loaded.
  // Using autotable with default font will show squares for Thai characters
  // if not handled. Here we set up the structure.
  
  const tableData = tickets.map(t => [
    t.ticket_no,
    t.description.substring(0, 50),
    t.users?.hospitals?.name || 'N/A',
    t.users?.department || 'N/A',
    t.status,
    t.priority,
    t.assignee_name || '-'
  ]);

  autoTable(doc, {
    head: [['Ticket No', 'รายละเอียด', 'โรงพยาบาล', 'แผนก', 'สถานะ', 'ความสำคัญ', 'ผู้รับงาน']],
    body: tableData,
    styles: { font: 'helvetica', fontSize: 10 }, 
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${title}.pdf`);
};

// --- Image Export Helper (for Charts/Dashboard) ---
export const exportToImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-color'),
    scale: 2 // Higher quality
  });
  
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
