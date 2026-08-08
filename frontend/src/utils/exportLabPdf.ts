import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiClient, { ASSET_BASE_URL } from '../services/apiClient';
import logoImg from '../assets/uigm.png';

interface Lab {
  id: string;
  name: string;
  type: string;
  location: string;
}

// Helper to fetch image and convert to base64 string
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

export const exportLabToPdf = async (labId: string) => {
  try {
    // 1. Fetch data
    const labRes = await apiClient.get(`/labs/${labId}`);
    const lab: Lab = labRes.data;

    let devices: any[] = [];
    if (lab.type.toLowerCase() === 'komputer') {
      const devRes = await apiClient.get(`/labs/${labId}/devices`);
      devices = devRes.data;
    }

    const invRes = await apiClient.get(`/labs/${labId}/inventory-items`);
    const inventoryItems = invRes.data;

    // 2. Init PDF
    const doc = new jsPDF('p', 'pt', 'a4');

    // 3. Header Text & Logo
    // Set font to Times New Roman
    doc.setFont('times', 'bold');

    // Header text size 14
    doc.setFontSize(14);

    const title1 = "LEMBAGA PENGELOLAAN";
    const title2 = "TEKNOLOGI INFORMASI DAN KOMUNIKASI";
    const title3 = "BAGIAN LABORATORIUM, JARINGAN DAN HARDWARE";
    const title4 = "UNIVERSITAS INDO GLOBAL MANDIRI";

    const pageWidth = doc.internal.pageSize.width;

    // Draw Logo
    try {
      const base64Logo = await getBase64ImageFromUrl(logoImg);
      // Logo position: x=40, y=20, width=111, height=60 (menyesuaikan rasio asli)
      doc.addImage(base64Logo, 'PNG', 40, 20, 100, 60);
    } catch (e) {
      console.warn("Failed to load logo", e);
    }

    const textCenterX = (pageWidth / 2) + 40;
    doc.text(title1, textCenterX, 40, { align: 'center' });
    doc.text(title2, textCenterX, 55, { align: 'center' });
    doc.text(title3, textCenterX, 70, { align: 'center' });
    doc.text(title4, textCenterX, 85, { align: 'center' });

    doc.setLineWidth(1.5);
    doc.line(40, 100, pageWidth - 40, 100);
    doc.setLineWidth(0.5); // Reset line width for tables

    // Set font to times and size 11 for content
    doc.setFont('times', 'normal');
    doc.setFontSize(11);

    // 4. Info Table
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const infoData = [
      ['Nama Lab', lab.name, 'Tanggal Dicetak', formattedDate],
      ['Tipe Lab', lab.type.toUpperCase(), 'Total Komputer', `${devices.length} unit`],
      ['Lokasi Lab', lab.location, 'Total Non Komputer', `${inventoryItems.length} item`]
    ];

    if (lab.type.toLowerCase() !== 'komputer') {
      infoData[1][2] = 'Total Aset';
      infoData[1][3] = `${inventoryItems.length} item`;
      infoData[2][2] = '';
      infoData[2][3] = '';
    }

    autoTable(doc, {
      startY: 115,
      body: infoData,
      theme: 'grid',
      styles: { font: 'times', fontSize: 11, cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 100 },
        2: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 120 }
      },
      margin: { left: 40, right: 40 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 30;

    // 5. Table A (Asset Computer)
    if (lab.type.toLowerCase() === 'komputer') {
      const tableAData = devices
        .sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }))
        .map((dev, index) => {
          let monitor = '-', keyboard = '-', mouse = '-', cpu = '-', aksesoris = '-';
          if (dev.specs) {
            dev.specs.forEach((s: any) => {
              const k = s.spec_key.toLowerCase();
              if (k.includes('monitor')) monitor = s.spec_value;
              if (k.includes('keyboard')) keyboard = s.spec_value;
              if (k.includes('mouse')) mouse = s.spec_value;
              if (k.includes('cpu') || k.includes('processor') || k.includes('prosesor')) cpu = s.spec_value;
              if (k.includes('aksesoris')) aksesoris = s.spec_value;
            });
          }
          const mkb = `Monitor: ${monitor}\nKeyboard: ${keyboard}\nMouse: ${mouse}\nAksesoris: ${aksesoris}`;

          let tgl = '-';
          if (dev.handover_date) {
            tgl = new Date(dev.handover_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
          }
          const asal = dev.origin || '-';
          const riwayat = `${tgl}\n${asal}`;

          return [
            index + 1,
            dev.code,
            dev.condition || 'BAIK',
            cpu, // Spesifikasi
            mkb, // Monitor, Keyboard, Mouse dan Aksesoris
            riwayat // Riwayat Aset
          ];
        });

      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text("A. Aset Komputer", 40, currentY);
      currentY += 10;

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Nama Perangkat', 'Kondisi', 'Spesifikasi', 'Monitor, Keyboard, Mouse & Aksesoris', 'Riwayat Aset']],
        body: tableAData,
        theme: 'grid',
        headStyles: { font: 'times', fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        styles: { font: 'times', fontSize: 11, cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 30 },
          2: { halign: 'center' }
        },
        margin: { left: 40, right: 40 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 30;
    }

    // Load images for Table B
    const loadedImages: Record<number, string> = {};
    for (let i = 0; i < inventoryItems.length; i++) {
      if (inventoryItems[i].photo_url) {
        try {
          const imgUrl = `${ASSET_BASE_URL}${inventoryItems[i].photo_url}`;
          const base64Img = await getBase64ImageFromUrl(imgUrl);
          loadedImages[i] = base64Img;
        } catch (e) {
          console.warn("Failed to load inventory item photo", e);
        }
      }
    }

    // 6. Table B (Asset Non Computer)
    const tableBData = inventoryItems.map((item: any, index: number) => {
      return [
        index + 1,
        item.name,
        item.specification || '-',
        item.quantity,
        item.condition || 'BAIK',
        loadedImages[index] ? '' : (item.photo_url ? 'Foto Gagal' : '-')
      ];
    });

    if (lab.type.toLowerCase() === 'komputer') {
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text("B. Aset Non Komputer", 40, currentY);
      currentY += 10;
    }

    autoTable(doc, {
      startY: currentY,
      head: [['No', 'Nama Item', 'Spesifikasi', 'Jumlah', 'Kondisi', 'Gambar']],
      body: tableBData,
      theme: 'grid',
      headStyles: { font: 'times', fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      styles: { font: 'times', fontSize: 11, cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { cellWidth: 150 }, // Nama Item dipersempit
        2: { cellWidth: 150 }, // Spesifikasi diperlebar
        3: { halign: 'center', cellWidth: 50 },
        4: { halign: 'center', cellWidth: 60 },
        5: { halign: 'center', cellWidth: 85 }
      },
      margin: { left: 40, right: 40 },
      didParseCell: function (data: any) {
        if (data.column.index === 5 && data.section === 'body') {
          const rowIndex = data.row.index;
          if (loadedImages[rowIndex]) {
            data.cell.styles.minCellHeight = 50;
          }
        }
      },
      didDrawCell: function (data: any) {
        if (data.column.index === 5 && data.section === 'body') {
          const rowIndex = data.row.index;
          if (loadedImages[rowIndex]) {
            const base64Img = loadedImages[rowIndex];
            const imgSize = 40;
            const x = data.cell.x + (data.cell.width - imgSize) / 2;
            const y = data.cell.y + (data.cell.height - imgSize) / 2;
            doc.addImage(base64Img, 'JPEG', x, y, imgSize, imgSize);
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 50;

    // 7. Signatures
    // Check if we need a new page for signatures (approx 150pt needed)
    if (currentY + 150 > doc.internal.pageSize.height) {
      doc.addPage();
      currentY = 50;
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const dateStr = `Palembang, ${formattedDate}`;
    doc.text(dateStr, pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    const sigData = [
      [
        "Mengetahui,\nKepala Lembaga Pengelolaan\nTeknologi Informasi dan Komunikasi",
        "Menyetujui,\nKepala bagian Laboratorium,\nJaringan dan Hardware",
        "Dibuat oleh,\nKasi. Laboratorium Jaringan\ndan Hardware"
      ],
      [
        "\n\n\n\nRicky Maulana Fajri, S.Kom., M.Sc., Ph.D\nNIK. 12345678",
        "\n\n\n\nCandra Setiawan, S.Kom., M.T\nNIK. 12345678",
        "\n\n\n\nJimiria Pratama, S.Kom., M.Kom\nNIK. 12345678"
      ]
    ];

    autoTable(doc, {
      startY: currentY,
      body: sigData,
      theme: 'grid',
      styles: { font: 'times', fontSize: 11, halign: 'center', cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
      margin: { left: 40, right: 40 },
      didParseCell: function (data: any) {
        if (data.row.index === 0) {
          data.cell.styles.fillColor = [220, 220, 220];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // 8. Add page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`Halaman ${i} / ${pageCount}`, pageWidth - 40, doc.internal.pageSize.height - 20, { align: 'right' });
    }

    // Instead of saving, open as a blob URL in a new window to preview
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');

    return true;
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw error;
  }
};
