import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Thai font base64 placeholder - In production, load a real Thai font file
// For now, we'll use a workaround with html2canvas for Thai content
// To add full Thai support, download a Thai font (e.g., Sarabun from Google Fonts)
// and convert it to base64 or load it from a URL

// Sarabun Regular font (Google Fonts) - Base64 encoded subset for Thai characters
// Note: This is a simplified approach. For production, load the full font file.
let thaiFontLoaded = false;

/**
 * Load Thai font for jsPDF
 * Call this once on app initialization for best performance
 */
export async function loadThaiFont(doc?: jsPDF): Promise<void> {
  if (thaiFontLoaded && !doc) return;
  
  try {
    // Use Noto Sans Thai as a reliable direct TTF source
    const fontUrl = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf';
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error('Failed to load Thai font');
    
    const fontBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(fontBuffer);
    
    // Efficiently convert to base64
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    const fontBase64 = btoa(binary);
    
    // If a doc instance is provided, add font to it immediately
    const targetDoc = doc || new jsPDF();
    targetDoc.addFileToVFS('ThaiFont.ttf', fontBase64);
    targetDoc.addFont('ThaiFont.ttf', 'ThaiFont', 'normal');
    
    thaiFontLoaded = true;
    console.log('Thai font (Noto Sans Thai) loaded successfully for jsPDF');
  } catch (error) {
    console.warn('Thai font loading failed, falling back to default font:', error);
  }
}

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

// --- PDF Export Helper (Tickets List) with Thai Support ---
export const exportTicketsPDF = async (tickets: any[], title: string) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Try to load Thai font if not already loaded
  await loadThaiFont(doc);

  // Set Thai font if available
  try {
    doc.setFont('ThaiFont');
  } catch (e) {
    console.warn('Thai font not available, using default font');
  }

  const tableData = tickets.map(t => [
    t.ticket_no,
    (t.description || '').substring(0, 50),
    t.users?.hospitals?.name || 'N/A',
    t.users?.department || 'N/A',
    t.status,
    t.priority,
    t.assignee_name || '-'
  ]);

  autoTable(doc, {
    head: [['Ticket No', 'รายละเอียด', 'โรงพยาบาล', 'แผนก', 'สถานะ', 'ความสำคัญ', 'ผู้รับงาน']],
    body: tableData,
    styles: { 
      font: thaiFontLoaded ? 'ThaiFont' : 'helvetica',
      fontSize: 9,
      cellPadding: 3
    },
    theme: 'striped',
    headStyles: { 
      fillColor: [59, 130, 246],
      fontSize: 9,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Ticket No
      1: { cellWidth: 70 }, // Description
      2: { cellWidth: 40 }, // Hospital
      3: { cellWidth: 35 }, // Department
      4: { cellWidth: 25 }, // Status
      5: { cellWidth: 20 }, // Priority
      6: { cellWidth: 35 }  // Assignee
    },
    didParseCell: (data) => {
      // Handle Thai text rendering issues
      if (data.section === 'body') {
        const cellText = data.cell.raw;
        if (typeof cellText === 'string' && /[\u0E00-\u0E7F]/.test(cellText)) {
          // Contains Thai characters - ensure proper rendering
          data.cell.styles.font = thaiFontLoaded ? 'ThaiFont' : 'helvetica';
        }
      }
    }
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
