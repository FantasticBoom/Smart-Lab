import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../assets/uigm.png';
import { getAllSchedules } from '../services/labScheduleApi';

const getBase64ImageFromUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const exportScheduleIndexPdf = async () => {
  // Use landscape for more columns
  const doc = new jsPDF('l', 'mm', 'a4');
  
  try {
    // Fetch all schedules
    const schedules: any[] = await getAllSchedules();
    const base64Logo = await getBase64ImageFromUrl(logoImg);
    
    // Page dimensions in landscape A4 (297 x 210 mm)
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Header Kop Surat
    doc.addImage(base64Logo, 'PNG', 14, 10, 30, 30);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('LEMBAGA PENGELOLAAN', centerX, 15, { align: 'center' });
    doc.text('TEKNOLOGI INFORMASI DAN KOMUNIKASI', centerX, 21, { align: 'center' });
    doc.text('BAGIAN LABORATORIUM, JARINGAN DAN HARDWARE', centerX, 27, { align: 'center' });
    doc.text('UNIVERSITAS INDO GLOBAL MANDIRI', centerX, 33, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 40, pageWidth - 14, 40);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DAFTAR JADWAL LABORATORIUM', centerX, 50, { align: 'center' });
    
    // Calculate row spans
    const labSpans: Record<string, number> = {};
    const labDaySpans: Record<string, number> = {};
    
    schedules.forEach(s => {
      labSpans[s.lab_name] = (labSpans[s.lab_name] || 0) + 1;
      
      const labDayKey = `${s.lab_name}_${s.day_of_week}`;
      labDaySpans[labDayKey] = (labDaySpans[labDayKey] || 0) + 1;
    });

    const tableBody: any[] = [];
    let currentLabNo = 0;
    const printedLabs = new Set<string>();
    const printedLabDays = new Set<string>();

    schedules.forEach((schedule) => {
      const isFirstLab = !printedLabs.has(schedule.lab_name);
      const spanLab = labSpans[schedule.lab_name];
      
      const labDayKey = `${schedule.lab_name}_${schedule.day_of_week}`;
      const isFirstLabDay = !printedLabDays.has(labDayKey);
      const spanLabDay = labDaySpans[labDayKey];
      
      const time = `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}`;
      const subject = schedule.subject;
      const lecturer = schedule.lecturer;

      const row: any[] = [];

      if (isFirstLab) {
        currentLabNo++;
        printedLabs.add(schedule.lab_name);
        row.push(
          { content: currentLabNo, rowSpan: spanLab, styles: { valign: 'middle', halign: 'center' } },
          { content: schedule.lab_name, rowSpan: spanLab, styles: { valign: 'middle' } },
          { content: schedule.location || '-', rowSpan: spanLab, styles: { valign: 'middle' } }
        );
      }

      if (isFirstLabDay) {
        printedLabDays.add(labDayKey);
        row.push(
          { content: schedule.day_of_week, rowSpan: spanLabDay, styles: { valign: 'middle', halign: 'center' } }
        );
      }

      row.push(time, subject, lecturer);
      tableBody.push(row);
    });

    autoTable(doc, {
      startY: 55,
      head: [['No', 'Nama Lab', 'Lokasi Lab', 'Hari', 'Waktu', 'Mata Kuliah', 'Dosen Pengampu']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // blue-500
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 32 },
        5: { cellWidth: 65 },
        6: { cellWidth: 55 },
      },
      styles: {
        fontSize: 10,
        cellPadding: 2,
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Halaman ${i} dari ${pageCount}`, centerX, 195, { align: 'center' });
    }

    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Terjadi kesalahan saat membuat PDF jadwal.');
  }
};
