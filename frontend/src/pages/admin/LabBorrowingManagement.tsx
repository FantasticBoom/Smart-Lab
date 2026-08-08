import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLabBorrowings, updateLabBorrowingStatus } from '../../services/labBorrowingApi';
import { Check, X, Eye, FileText, Download, Building, XCircle, Calendar, Users, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../../assets/uigm.png';

const LabBorrowingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');

  // Fetch using React Query with 5s polling for Real-time updates
  const { data: borrowings = [], isLoading: loading } = useQuery({
    queryKey: ['lab-borrowings', filter],
    queryFn: () => getLabBorrowings(filter || undefined),
    refetchInterval: 5000,
  });

  // Modal States
  const [selectedBorrowing, setSelectedBorrowing] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMonth, setExportMonth] = useState('');

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
    newStatus: 'approved' | 'rejected';
  }>({ isOpen: false, id: '', newStatus: 'approved' });

  const handleStatusChangeClick = (id: string, newStatus: 'approved' | 'rejected') => {
    setConfirmModal({ isOpen: true, id, newStatus });
  };

  const executeStatusChange = async () => {
    const { id, newStatus } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });
    try {
      await updateLabBorrowingStatus(id, newStatus);
      queryClient.invalidateQueries({ queryKey: ['lab-borrowings'] });

      // Close View Modal if it's the one being acted upon
      if (selectedBorrowing && selectedBorrowing.id === id) {
        setShowViewModal(false);
      }
    } catch (error) {
      console.error('Gagal mengupdate status:', error);
    }
  };

  const handleView = (borrowing: any) => {
    setSelectedBorrowing(borrowing);
    setShowViewModal(true);
  };

  const handleExportPDF = async () => {
    if (!exportMonth) return;

    const [year, monthNum] = exportMonth.split('-');
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const monthName = monthNames[parseInt(monthNum) - 1];

    const filteredData = borrowings.filter((b: any) => {
      const bDate = new Date(b.start_datetime);
      return bDate.getFullYear() === parseInt(year) && (bDate.getMonth() + 1) === parseInt(monthNum);
    });

    if (filteredData.length === 0) return;

    const doc = new jsPDF();

    // Load Image for Kop Surat
    const img = new Image();
    img.src = logoUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    try {
      doc.addImage(img, 'PNG', 20, 12, 24, 20);
    } catch (e) {
      console.error("Failed to add image to PDF", e);
    }

    // Kop Surat Text 
    doc.setFont('times', 'bold');

    doc.setFontSize(14);
    doc.text("LEMBAGA PENGELOLAAN", 115, 15, { align: 'center' });
    doc.text("TEKNOLOGI INFORMASI DAN KOMUNIKASI", 115, 21, { align: 'center' });

    doc.setFontSize(12);
    doc.text("BAGIAN LABORATORIUM, JARINGAN DAN HARDWARE", 115, 27, { align: 'center' });
    doc.text("UNIVERSITAS INDO GLOBAL MANDIRI", 115, 33, { align: 'center' });

    // Divider Line
    doc.setLineWidth(0.8);
    doc.line(15, 38, 195, 38);

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Daftar Peminjaman Lab - Periode ${monthName} ${year}`, 105, 48, { align: 'center' });

    const tableColumn = ["No", "Nama Pemohon", "Lab", "Tujuan", "Tanggal Mulai", "Status"];
    const tableRows: any[] = [];

    filteredData.forEach((borrowing: any, index: number) => {
      const sDate = new Date(borrowing.start_datetime);
      const eDate = new Date(borrowing.end_datetime);

      const sDateStr = sDate.toLocaleDateString('id-ID');
      const timeRange = `${sDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${eDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

      let nameNPMText = `${borrowing.user_name}\n(${borrowing.user_npm})`;

      if (borrowing.members && borrowing.members.length > 0) {
        nameNPMText += `\n\nAnggota:`;
        borrowing.members.forEach((m: any) => {
          nameNPMText += `\n- ${m.name} (${m.npm})`;
        });
      }

      const row = [
        index + 1,
        nameNPMText,
        borrowing.lab_name,
        borrowing.purpose || '-',
        `${sDateStr}\n${timeRange}`,
        borrowing.status.toUpperCase()
      ];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
      headStyles: { fillColor: [37, 99, 235], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { cellWidth: 45 },
        4: { cellWidth: 30, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
      }
    });

    // Open in new tab instead of downloading directly
    window.open(doc.output('bloburl'), '_blank');

    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header UI Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manajemen Laboratorium</h2>
            <p className="text-sm text-gray-500">Kelola persetujuan peminjaman ruangan laboratorium oleh mahasiswa.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block w-full sm:w-auto pl-3 pr-10 py-2.5 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-gray-50"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="rejected">Ditolak (Rejected)</option>
          </select>
          <button
            onClick={() => {
              const now = new Date();
              const m = (now.getMonth() + 1).toString().padStart(2, '0');
              setExportMonth(`${now.getFullYear()}-${m}`);
              setShowExportModal(true);
            }}
            className="flex-shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-2xl border border-gray-100 relative">
        {loading && borrowings.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Memuat data...</div>
        ) : borrowings.length === 0 ? (
          <div className="p-10 text-center text-gray-500 flex flex-col items-center">
            <FileText className="w-10 h-10 text-gray-300 mb-3" />
            <p>Belum ada data peminjaman.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {borrowings.map((borrowing: any) => (
              <li key={borrowing.id} className="p-5 hover:bg-blue-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-base font-bold text-gray-900 truncate">
                        {borrowing.user_name} <span className="text-sm font-normal text-gray-500">({borrowing.user_npm})</span>
                      </p>
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full 
                        ${borrowing.status === 'approved' ? 'bg-green-100 text-green-700' :
                          borrowing.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {borrowing.status.toUpperCase()}
                      </span>
                      {borrowing.is_urgent && (
                        <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> URGENT
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 gap-2 sm:gap-6 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-blue-500" />
                        <span>{borrowing.lab_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>{new Date(borrowing.start_datetime).toLocaleString('id-ID')} - {new Date(borrowing.end_datetime).toLocaleTimeString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                    <button
                      onClick={() => handleView(borrowing)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <Eye className="h-4 w-4 mr-2" /> Detail
                    </button>
                    {borrowing.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChangeClick(borrowing.id, 'approved')}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                        </button>
                        <button
                          onClick={() => handleStatusChangeClick(borrowing.id, 'rejected')}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                        >
                          <X className="h-4 w-4 mr-1" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CONFIRM MODAL (Custom Alert) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.newStatus === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Konfirmasi Persetujuan</h3>
            <p className="text-gray-500 mb-6">
              Apakah Anda yakin ingin <strong className={confirmModal.newStatus === 'approved' ? 'text-green-600' : 'text-red-600'}>{confirmModal.newStatus === 'approved' ? 'MENYETUJUI' : 'MENOLAK'}</strong> permohonan peminjaman ini?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={executeStatusChange}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors shadow-sm ${confirmModal.newStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedBorrowing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-bold text-gray-900">Detail Peminjaman Lab</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Nama Lengkap</p>
                  <p className="text-base font-semibold text-gray-900">{selectedBorrowing.user_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">NPM</p>
                  <p className="text-base font-semibold text-gray-900">{selectedBorrowing.user_npm}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                  <p className="text-base font-semibold text-gray-900">{selectedBorrowing.user_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                  <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full 
                        ${selectedBorrowing.status === 'approved' ? 'bg-green-100 text-green-700' :
                      selectedBorrowing.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedBorrowing.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">Laboratorium</p>
                  <p className="text-base font-semibold text-blue-900">{selectedBorrowing.lab_name} ({selectedBorrowing.lab_type})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">Jadwal</p>
                  <p className="text-sm font-semibold text-blue-900">{new Date(selectedBorrowing.start_datetime).toLocaleString('id-ID')} s/d {new Date(selectedBorrowing.end_datetime).toLocaleTimeString('id-ID')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Tujuan Peminjaman</p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 border border-gray-200">
                  {selectedBorrowing.purpose}
                </div>
              </div>

              {selectedBorrowing.members && selectedBorrowing.members.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Daftar Anggota ({selectedBorrowing.num_people} total)
                  </p>
                  <ul className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                    {selectedBorrowing.members.map((m: any, i: number) => (
                      <li key={i} className="px-4 py-2.5 text-sm text-gray-700 flex justify-between">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-gray-500">{m.npm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {selectedBorrowing.status === 'pending' && (
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => handleStatusChangeClick(selectedBorrowing.id, 'rejected')}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-sm"
                >
                  Tolak Peminjaman
                </button>
                <button
                  onClick={() => handleStatusChangeClick(selectedBorrowing.id, 'approved')}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm"
                >
                  Setujui Peminjaman
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Export PDF</h3>
              <button onClick={() => setShowExportModal(false)} className="text-white/80 hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Periode Bulan</label>
                <input
                  type="month"
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                Sistem akan membuat file PDF rekapitulasi data peminjaman lab untuk bulan yang dipilih.
              </p>
              <button
                onClick={handleExportPDF}
                className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm mt-4"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabBorrowingManagement;
