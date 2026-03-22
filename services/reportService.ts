import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Sample, HoldCase, SampleStatus, User } from '../types';

const sanitizeForPDF = (text: string | undefined | null): string => {
  if (!text) return 'N/A';
  // Simple check to reverse Arabic text for basic PDF rendering
  const arabicPattern = /[\u0600-\u06FF]/;
  if (arabicPattern.test(text)) {
    return text.split(' ').reverse().join(' '); 
  }
  return text;
};

const formatDate = (dateString?: string, includeTime: boolean = false) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (includeTime) return d.toLocaleString('en-GB'); // DD/MM/YYYY, HH:MM:SS
  return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
};

const getUserName = (userId: string | undefined, users: User[]): string => {
  if (!userId) return '-';
  const user = users.find(u => u.id === userId || u.username === userId);
  return user ? user.name : userId;
};

export const reportService = {
  
  // ==========================================
  // LABEL PRINTING
  // ==========================================
  printSampleLabel(sample: Sample) {
    try {
      // Create a small label size PDF (e.g., 50mm x 25mm standard lab label)
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeForPDF(sample.patient_name).substring(0, 18), 2, 5);
      
      doc.setFontSize(10);
      doc.text(sample.patient_id, 2, 10);
      
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tube: ${sample.tube_type}`, 2, 14);
      doc.text(`Date: ${formatDate(sample.created_at)}`, 2, 17);
      
      // Simulate Barcode lines
      doc.setLineWidth(0.5);
      let x = 2;
      for(let i=0; i<15; i++) {
         doc.line(x, 19, x, 23);
         x += (Math.random() * 2) + 0.5;
      }
      
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (error) {
      console.error("Label Print Failed", error);
      alert("Failed to generate label");
    }
  },

  // ==========================================
  // INVENTORY REPORTS
  // ==========================================
  exportInventoryToExcel(samples: Sample[], users: User[], fileName: string = 'Inventory_Report') {
    try {
      if (!samples || samples.length === 0) {
        alert("No inventory data available.");
        return;
      }
      
      const data = samples.map(s => {
        const isFinished = s.status === SampleStatus.FINISHED;
        return {
          'Patient Name': s.patient_name,
          'Patient Code': s.patient_id,
          'Tube Type': s.tube_type,
          'Count': s.count,
          'Entry Date': formatDate(s.created_at, true),
          'Finished Date': isFinished ? formatDate(s.finished_at || s.created_at, true) : 'Not Finished',
          'Finished By': getUserName(s.finished_by, users),
          'User': getUserName(s.created_by, users),
          'Status': s.status,
          'Notes': s.notes
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      XLSX.writeFile(wb, `${fileName}_${new Date().getTime()}.xlsx`);
    } catch (error) {
      console.error(error);
      alert("Export failed");
    }
  },

  exportInventoryToPDF(samples: Sample[], users: User[], title: string = 'Inventory Report') {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      doc.setFontSize(18);
      doc.text('Generations Genetics Labs - Inventory', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const headers = [['Name', 'Code', 'Tube', 'Status', 'Entry', 'Finished Date', 'User']];
      const data = samples.map(s => {
        const isFinished = s.status === SampleStatus.FINISHED;
        return [
          sanitizeForPDF(s.patient_name),
          s.patient_id,
          s.tube_type,
          s.status,
          formatDate(s.created_at),
          isFinished ? formatDate(s.finished_at || s.created_at, true) : '-',
          sanitizeForPDF(getUserName(s.created_by, users))
        ];
      });

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center' },
        headStyles: { fillColor: [0, 86, 179] }
      });

      doc.save(`${title}.pdf`);
    } catch (error) {
      console.error(error);
      alert("PDF Gen failed");
    }
  },

  // ==========================================
  // HOLD REPORTS
  // ==========================================

  exportHoldToExcel(cases: HoldCase[], users: User[], fileName: string = 'Hold_Report') {
    try {
      if (!cases || cases.length === 0) {
        alert("No hold cases available.");
        return;
      }

      const data = cases.map(c => ({
        'Patient Name': c.patient_name,
        'Code': c.patient_id,
        'Test Name': c.test_type,
        'Center Name': c.center_name,
        'Reason': c.status,
        'File Status': c.is_finished ? 'Finished' : 'Pending',
        'Entry Date': formatDate(c.created_at),
        'Exit Date': c.is_finished ? formatDate(c.finished_at) : 'Pending',
        'Finished By': getUserName(c.finished_by, users),
        'Created By': getUserName(c.created_by, users)
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hold Cases');
      XLSX.writeFile(wb, `${fileName}_${new Date().getTime()}.xlsx`);
    } catch (error) {
      console.error(error);
      alert("Export failed");
    }
  },

  exportHoldToPDF(cases: HoldCase[], users: User[], title: string = 'Hold Cases Report') {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      doc.setFontSize(18);
      doc.text('Generations Genetics Labs - Hold Registry', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      const headers = [['Name', 'Code', 'Test', 'Center', 'Status', 'Entry', 'Exit', 'Finished By']];
      
      const data = cases.map(c => [
        sanitizeForPDF(c.patient_name),
        c.patient_id,
        sanitizeForPDF(c.test_type),
        sanitizeForPDF(c.center_name),
        c.is_finished ? 'Finished' : 'Pending',
        formatDate(c.created_at),
        c.is_finished ? formatDate(c.finished_at) : '-',
        sanitizeForPDF(getUserName(c.finished_by, users))
      ]);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 35,
        theme: 'striped',
        styles: { fontSize: 8, halign: 'center' },
        headStyles: { fillColor: [220, 38, 38] }
      });

      doc.save(`${title}.pdf`);
    } catch (error) {
      console.error(error);
      alert("PDF Gen failed");
    }
  }
};
