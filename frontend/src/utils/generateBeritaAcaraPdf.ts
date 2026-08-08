import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../assets/uigm.png';
import { getTerbilangTanggal } from './dateTerbilang';

export interface BeritaAcaraPdfData {
  jenis: 'Pemeriksaan' | 'Perbaikan';
  tanggal: Date;
  asset: {
    nama: string;
    jumlah: string;
    spesifikasi: string;
    lokasi: string;
  };
  keterangan: string;
  penandatangan: {
    nama: string;
    jabatan: string;
  };
  lampiranBase64: string | null;
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

export const generateBeritaAcaraPdf = async (data: BeritaAcaraPdfData) => {
  try {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- PAGE 1: BERITA ACARA ---

    // 1. Header (Logo Kiri, Kotak Hitam Kanan)
    try {
      const base64Logo = await getBase64ImageFromUrl(logoImg);
      // UIGM Logo is wide, maybe adjust width/height
      doc.addImage(base64Logo, 'PNG', 50, 40, 120, 60);
    } catch (e) {
      console.warn("Failed to load logo", e);
    }

    // Black Box on the right
    doc.setFillColor(40, 40, 44); // Dark gray/black
    doc.rect(200, 40, pageWidth - 250, 60, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("BERITA ACARA", (pageWidth + 150) / 2, 70, { align: 'center' });
    doc.setFontSize(12);
    doc.text("FM-PM-13.5/09", (pageWidth + 150) / 2, 90, { align: 'center' });

    // Reset text color to black for body
    doc.setTextColor(0, 0, 0);

    // 2. Paragraf Pembuka
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const { hari, tanggal_huruf, bulan, tahun_huruf, tanggal_angka } = getTerbilangTanggal(data.tanggal);

    const openingText = `Pada hari ini ${hari} tanggal ${tanggal_huruf} bulan ${bulan} tahun ${tahun_huruf} (${tanggal_angka}) Telah dilakukan ${data.jenis.toLowerCase()} barang dilingkungan UIGM, berupa;`;

    let currentY = 140;
    const splitOpening = doc.splitTextToSize(openingText, pageWidth - 100);
    doc.text(openingText, 50, currentY, { align: 'justify', maxWidth: pageWidth - 100 });
    currentY += splitOpening.length * 15 + 10;

    // 3. Tabel Aset
    autoTable(doc, {
      startY: currentY,
      head: [['No', 'Nama Barang', 'Jumlah', 'Spesifikasi', 'Ket']],
      body: [
        ['1', data.asset.nama, data.asset.jumlah, data.asset.spesifikasi, data.asset.lokasi]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [40, 40, 44],
        textColor: [255, 255, 255],
        font: 'helvetica',
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 5,
        lineColor: [40, 40, 44],
        lineWidth: 0.5,
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 120 },
        2: { cellWidth: 50 },
        3: { cellWidth: 145, halign: 'left' },
        4: { cellWidth: 150 }
      },
      margin: { left: 50, right: 50 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;

    // 4. Paragraf Isi & Keterangan
    // Create specs list text properly
    const specLines = data.asset.spesifikasi.split('\n').filter(s => s.trim() !== '');

    doc.setFontSize(11);

    const body1 = `Telah dilakukannya ${data.jenis.toLowerCase()} ${data.asset.jumlah} ${data.asset.nama.toLowerCase()} dengan spesifikasi berikut :`;
    const splitBody1 = doc.splitTextToSize(body1, pageWidth - 100);
    doc.text(body1, 50, currentY, { align: 'justify', maxWidth: pageWidth - 100 });
    currentY += splitBody1.length * 15;

    // Draw specs list exactly as user typed
    specLines.forEach((spec) => {
      doc.text(spec.trim(), 70, currentY); // Indented slightly from paragraph
      currentY += 15;
    });

    currentY += 5;

    const body2 = `Adapun penempatan ${data.asset.nama.toLowerCase()} tersebut berada di ${data.asset.lokasi.toLowerCase()} Universitas Indo Global Mandiri. ${data.keterangan}`;
    const splitBody2 = doc.splitTextToSize(body2, pageWidth - 100);
    doc.text(body2, 50, currentY, { align: 'justify', maxWidth: pageWidth - 100 });
    currentY += splitBody2.length * 15 + 10;

    const body3 = `Demikian, berita acara ini dibuat dengan sebenarnya dan apabila dikemudian hari terjadi perubahan maka akan diubah sebagaimana mestinya.`;
    const splitBody3 = doc.splitTextToSize(body3, pageWidth - 100);
    doc.text(body3, 50, currentY, { align: 'justify', maxWidth: pageWidth - 100 });
    currentY += splitBody3.length * 15 + 40;

    // 5. Tanda Tangan
    if (currentY > pageHeight - 150) {
      doc.addPage();
      currentY = 50;
    }

    doc.setFont('helvetica', 'bold');

    const leftCenterX = 150;
    const rightCenterX = pageWidth - 150;

    // Kiri: Mengetahui
    doc.text("Mengetahui,", leftCenterX, currentY, { align: 'center' });
    const signatureLabel = data.jenis === 'Pemeriksaan' ? "Diperiksa Oleh," : "Diperbaiki Oleh,";
    doc.text(signatureLabel, rightCenterX, currentY, { align: 'center' });

    currentY += 15;

    // Some space for signature
    currentY += 90;

    doc.text("Ricky Maulana Fajri, S.Kom., M.Sc., Ph.D", leftCenterX, currentY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text("Kepala Lembaga Pengelolaan Teknologi", leftCenterX, currentY + 15, { align: 'center' });
    doc.text("Informasi dan Komunikasi", leftCenterX, currentY + 30, { align: 'center' });

    // Kanan: Pembuat
    doc.setFont('helvetica', 'bold');
    doc.text(data.penandatangan.nama, rightCenterX, currentY, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    // Handle multiline jabatan (split to 2 lines max if needed)
    const splitJabatan = doc.splitTextToSize(data.penandatangan.jabatan, 200);
    splitJabatan.forEach((line: string, i: number) => {
      doc.text(line, rightCenterX, currentY + 15 + (i * 15), { align: 'center' });
    });

    // --- PAGE 2: LAMPIRAN ---
    if (data.lampiranBase64) {
      doc.addPage();

      // Header Lampiran (Kop sama)
      try {
        const base64Logo = await getBase64ImageFromUrl(logoImg);
        doc.addImage(base64Logo, 'PNG', 50, 40, 120, 60);
      } catch (e) {
        console.warn("Failed to load logo", e);
      }

      doc.setFillColor(40, 40, 44);
      doc.rect(200, 40, pageWidth - 250, 60, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("LAMPIRAN FOTO", (pageWidth + 150) / 2, 70, { align: 'center' });
      doc.setFontSize(12);
      doc.text("FM-PM-13.5/09", (pageWidth + 150) / 2, 90, { align: 'center' });

      doc.setTextColor(0, 0, 0);

      // Add image centered
      const imgWidth = 400;
      const xPos = (pageWidth - imgWidth) / 2;

      // we assume the image is standard aspect ratio, we'll give it 300 height
      // in a real app we might get the image dimensions to calculate aspect ratio properly
      doc.addImage(data.lampiranBase64, 'JPEG', xPos, 150, imgWidth, 300);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text(`Lampiran - Dokumentasi Perangkat ${data.asset.nama}`, pageWidth / 2, 470, { align: 'center' });
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');

    return true;
  } catch (error) {
    console.error('Failed to generate Berita Acara PDF:', error);
    throw error;
  }
};
