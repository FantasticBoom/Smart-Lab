import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../assets/uigm.png';

export interface RecapBeritaAcaraData {
  id: string;
  namaItem: string;
  labName: string;
  jumlah: string;
  keterangan: string;
  tanggalLapor: string;
  tanggalSelesai: string | null;
}

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

export const generateBeritaAcaraRecapPdf = async (
  dataList: RecapBeritaAcaraData[],
  startDateStr: string,
  endDateStr: string
) => {
  try {
    // Landscape A4
    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // --- KOP SURAT ---
    doc.setFont('times', 'bold');
    doc.setFontSize(14);

    const title1 = "LEMBAGA PENGELOLAAN";
    const title2 = "TEKNOLOGI INFORMASI DAN KOMUNIKASI";
    const title3 = "BAGIAN LABORATORIUM, JARINGAN DAN HARDWARE";
    const title4 = "UNIVERSITAS INDO GLOBAL MANDIRI";

    try {
      const base64Logo = await getBase64ImageFromUrl(logoImg);
      doc.addImage(base64Logo, 'PNG', 40, 20, 100, 60);
    } catch (e) {
      console.warn("Failed to load logo", e);
    }

    const textCenterX = pageWidth / 2;
    doc.text(title1, textCenterX, 40, { align: 'center' });
    doc.text(title2, textCenterX, 55, { align: 'center' });
    doc.text(title3, textCenterX, 70, { align: 'center' });
    doc.text(title4, textCenterX, 85, { align: 'center' });

    doc.setLineWidth(1.5);
    doc.line(40, 100, pageWidth - 40, 100);
    doc.setLineWidth(0.5); 

    // --- JUDUL REKAP ---
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text("Rekap Perbaikan Perangkat Laboratorium", textCenterX, 130, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const formattedStart = new Date(startDateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const formattedEnd = new Date(endDateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Periode: ${formattedStart} - ${formattedEnd}`, textCenterX, 145, { align: 'center' });

    // --- TABEL ---
    const tableBody = dataList.map((item, index) => [
      (index + 1).toString(),
      item.namaItem,
      item.labName,
      item.jumlah,
      item.keterangan,
      new Date(item.tanggalLapor).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      item.tanggalSelesai ? new Date(item.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
    ]);

    autoTable(doc, {
      startY: 165,
      head: [['No', 'Nama Item', 'Lab & Lokasi Lab', 'Jumlah', 'Keterangan Kerusakan', 'Tanggal Dilaporkan', 'Tanggal Diselesaikan']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [40, 40, 44],
        textColor: [255, 255, 255],
        font: 'times',
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        font: 'times',
        fontSize: 10,
        cellPadding: 5,
        lineColor: [40, 40, 44],
        lineWidth: 0.5,
        textColor: [0, 0, 0],
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 }, // No
        1: { halign: 'left', cellWidth: 140 }, // Nama Item
        2: { halign: 'left', cellWidth: 120 }, // Lab
        3: { halign: 'center', cellWidth: 50 }, // Jumlah
        4: { halign: 'left', cellWidth: 200 }, // Keterangan
        5: { halign: 'center', cellWidth: 100 }, // Tgl Lapor
        6: { halign: 'center', cellWidth: 100 } // Tgl Selesai
      },
      margin: { left: 40, right: 40 }
    });

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');

    return true;
  } catch (error) {
    console.error('Failed to generate Rekap Berita Acara PDF:', error);
    throw error;
  }
};
