import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Eye, Pencil, Clock, CheckCircle, RefreshCw, Filter, FileDown } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { generateBeritaAcaraRecapPdf, type RecapBeritaAcaraData } from '../../utils/generateBeritaAcaraRecapPdf';
import { ExportRecapModal } from '../../components/berita-acara/ExportRecapModal';
import { useNotificationStore } from '../../store/notificationStore';

interface BeritaAcara {
  id: string;
  inventory_item_id: string | null;
  device_id: string | null;
  lab_id: string;
  keterangan_kerusakan: string;
  keterangan_perbaikan: string | null;
  status_penanganan: 'perlu_perbaikan' | 'telah_diperbaiki' | 'alat_baru';
  tanggal_lapor: string;
  tanggal_selesai: string | null;
  device: {
    id: string;
    code: string;
    condition: string | null;
    photo_url: string | null;
  } | null;
  inventory_item: {
    id: string;
    name: string;
    specification: string | null;
    quantity: number;
    condition: string;
    photo_url: string | null;
  } | null;
  lab: {
    id: string;
    name: string;
    type: string;
    location: string | null;
  } | null;
}

const STATUS_CONFIG = {
  perlu_perbaikan: {
    label: 'Perlu Perbaikan',
    color: 'offline' as const,
    icon: Clock,
    bgClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-700'
  },
  telah_diperbaiki: {
    label: 'Telah Diperbaiki',
    color: 'online' as const,
    icon: CheckCircle,
    bgClass: 'bg-green-50 border-green-200',
    textClass: 'text-green-700'
  },
  alat_baru: {
    label: 'Alat Baru',
    color: 'locked' as const,
    icon: RefreshCw,
    bgClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-700'
  }
};

export const BeritaAcaraPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [filterAktif, setFilterAktif] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BeritaAcara | null>(null);
  const [editForm, setEditForm] = useState({
    status_penanganan: 'telah_diperbaiki' as 'telah_diperbaiki' | 'alat_baru',
    keterangan_perbaikan: ''
  });

  const { data: list, isLoading } = useQuery<BeritaAcara[]>({
    queryKey: ['berita-acara', filterAktif],
    queryFn: async () => {
      const { data } = await apiClient.get('/berita-acara', {
        params: { aktif_only: filterAktif }
      });
      return data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; status_penanganan: string; keterangan_perbaikan: string }) => {
      const { data } = await apiClient.put(`/berita-acara/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['berita-acara'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      addNotification('success', 'Status penanganan berhasil diperbarui');
      setEditTarget(null);

      // Jika alat baru, arahkan ke halaman tambah aset
      if (editForm.status_penanganan === 'alat_baru' && data.lab_id) {
        navigate(`/inventory/labs/${data.lab_id}`);
      }
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal memperbarui status');
    }
  });

  const handleEditOpen = (ba: BeritaAcara) => {
    setEditTarget(ba);
    setEditForm({ status_penanganan: 'telah_diperbaiki', keterangan_perbaikan: '' });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateMutation.mutate({ id: editTarget.id, ...editForm });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Berita Acara</h1>
            <p className="text-sm text-slate-500">Daftar aset yang memerlukan perbaikan & riwayat penanganannya.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsExportModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm transition-all"
          >
            <FileDown className="w-4 h-4" />
            Export Rekap
          </Button>
          <Button
            onClick={() => navigate('/berita-acara/generate')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all"
          >
            <FileText className="w-4 h-4" />
            Buat Berita Acara
          </Button>
          <div className="w-px h-8 bg-slate-200 mx-2"></div>
          <button
            onClick={() => setFilterAktif(false)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${!filterAktif
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            Semua Riwayat
          </button>
          <button
            onClick={() => setFilterAktif(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filterAktif
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Filter className="w-4 h-4" />
            Perlu Perbaikan
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {!isLoading && list && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = list.filter(b => b.status_penanganan === key).length;
            const Icon = cfg.icon;
            return (
              <div key={key} className={`flex items-center gap-4 p-4 rounded-xl border ${cfg.bgClass}`}>
                <div className={`p-2 rounded-lg ${cfg.bgClass}`}>
                  <Icon className={`w-5 h-5 ${cfg.textClass}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${cfg.textClass}`}>{count}</p>
                  <p className={`text-xs font-medium ${cfg.textClass} opacity-80`}>{cfg.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Memuat data berita acara...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Nama Item</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Keterangan Kerusakan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal Lapor</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!list || list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-slate-500">
                    {filterAktif ? 'Tidak ada aset yang perlu perbaikan saat ini.' : 'Belum ada berita acara.'}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((ba, index) => {
                  const statusCfg = STATUS_CONFIG[ba.status_penanganan];
                  return (
                    <TableRow key={ba.id}>
                      <TableCell className="text-slate-500">{index + 1}</TableCell>
                      <TableCell className="font-medium text-slate-800">
                        <div>
                          {ba.inventory_item?.name ?? ba.device?.code ?? '-'}
                          {ba.device && (
                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-normal">Komputer</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div>{ba.lab?.name ?? '-'}</div>
                        {ba.lab?.location && (
                          <div className="text-xs text-slate-400 mt-0.5">{ba.lab.location}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-800 font-medium">
                        {ba.inventory_item?.quantity ?? (ba.device ? '1 unit' : '-')}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm max-w-[200px] truncate" title={ba.keterangan_kerusakan}>
                        {ba.keterangan_kerusakan}
                      </TableCell>
                      <TableCell>
                        <Badge status={statusCfg.color}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDate(ba.tanggal_lapor)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            className="px-2 py-1.5 h-auto"
                            onClick={() => navigate(`/berita-acara/${ba.id}`)}
                            title="Lihat Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {ba.status_penanganan === 'perlu_perbaikan' && (
                            <Button
                              variant="primary"
                              className="px-2 py-1.5 h-auto"
                              onClick={() => handleEditOpen(ba)}
                              title="Update Status"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal Edit Status */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Update Status Penanganan"
      >
        {editTarget && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Info Aset */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Aset yang ditangani</p>
              <p className="font-semibold text-slate-800">
                {editTarget.inventory_item?.name ?? editTarget.device?.code ?? '-'}
              </p>
              <p className="text-sm text-slate-500">{editTarget.lab?.name}</p>
            </div>

            {/* Keterangan kerusakan (read only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Kerusakan</label>
              <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 min-h-[60px]">
                {editTarget.keterangan_kerusakan}
              </div>
            </div>

            {/* Status Penanganan */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status Penanganan <span className="text-red-500">*</span>
              </label>
              <select
                value={editForm.status_penanganan}
                onChange={(e) => setEditForm({ ...editForm, status_penanganan: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              >
                <option value="telah_diperbaiki">✅ Telah Diperbaiki</option>
                <option value="alat_baru">🔄 Alat Baru (Ganti Unit)</option>
              </select>
              {editForm.status_penanganan === 'alat_baru' && (
                <p className="text-xs text-blue-600 mt-1">
                  ℹ️ Setelah menyimpan, Anda akan diarahkan ke halaman Lab untuk menambah aset baru secara manual.
                </p>
              )}
            </div>

            {/* Keterangan Perbaikan */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Keterangan Perbaikan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={editForm.keterangan_perbaikan}
                onChange={(e) => setEditForm({ ...editForm, keterangan_perbaikan: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px]"
                placeholder={
                  editForm.status_penanganan === 'alat_baru'
                    ? 'Contoh: Alat lama tidak bisa diperbaiki, diganti dengan unit baru...'
                    : 'Contoh: Kabel penghubung telah diganti, alat berfungsi normal kembali...'
                }
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setEditTarget(null)} type="button">Batal</Button>
              <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>
                Simpan & Tandai Selesai
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ExportRecapModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={async (startDate, endDate) => {
          setIsExportModalOpen(false);
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          const filteredList = (list || []).filter(ba => {
            const baDate = new Date(ba.tanggal_lapor);
            return baDate >= start && baDate <= end;
          });

          if (filteredList.length === 0) {
            alert('Tidak ada data berita acara pada rentang tanggal tersebut.');
            return;
          }

          const recapData: RecapBeritaAcaraData[] = filteredList.map(ba => ({
            id: ba.id,
            namaItem: ba.inventory_item?.name ?? ba.device?.code ?? '-',
            labName: ba.lab ? `${ba.lab.name}${ba.lab.location ? `\n${ba.lab.location}` : ''}` : '-',
            jumlah: ba.inventory_item?.quantity ? `${ba.inventory_item.quantity} unit` : (ba.device ? '1 unit' : '-'),
            keterangan: ba.keterangan_kerusakan,
            tanggalLapor: ba.tanggal_lapor,
            tanggalSelesai: ba.tanggal_selesai
          }));

          try {
            await generateBeritaAcaraRecapPdf(recapData, startDate, endDate);
          } catch (e) {
            console.error("Gagal export rekap", e);
            alert("Gagal membuat PDF rekap");
          }
        }}
      />
    </div>
  );
};
