import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Box, Plus, Trash2, Image as ImageIcon, Pencil, X, FileDown } from 'lucide-react';
import apiClient, { ASSET_BASE_URL } from '../../services/apiClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useNotificationStore } from '../../store/notificationStore';
import { exportLabToPdf } from '../../utils/exportLabPdf';

interface InventoryItem {
  id: string;
  name: string;
  specification: string | null;
  quantity: number;
  condition: string;
  photo_url: string | null;
}

interface Lab {
  id: string;
  name: string;
  type: string;
  location: string;
}

export const InventoryLabDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [viewedPhoto, setViewedPhoto] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    name: '',
    specification: '',
    quantity: 1,
    condition: 'Baik',
    keterangan_kerusakan: ''
  });

  const { data: lab, isLoading: isLoadingLab } = useQuery<Lab>({
    queryKey: ['lab', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/labs/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: items, isLoading: isLoadingItems } = useQuery<InventoryItem[]>({
    queryKey: ['inventory-items', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/labs/${id}/inventory-items`);
      return data;
    },
    enabled: !!id,
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = items?.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = items ? Math.ceil(items.length / rowsPerPage) : 0;

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiClient.delete(`/inventory-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', id] });
      addNotification('success', 'Aset berhasil dihapus');
      setDeleteId(null);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal menghapus aset');
      setDeleteId(null);
    }
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      await apiClient.post(`/inventory-items/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
  });

  const addMutation = useMutation({
    mutationFn: async (newItem: { name: string; specification: string; quantity: number; condition: string }) => {
      const response = await apiClient.post(`/labs/${id}/inventory-items`, newItem);
      return response.data;
    },
    onSuccess: async (data) => {
      if (photoFile) {
        try {
          await uploadPhotoMutation.mutateAsync({ id: data.id, file: photoFile });
        } catch (error) {
          addNotification('error', 'Aset berhasil ditambahkan, tapi gagal mengunggah foto');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['inventory-items', id] });
      addNotification('success', 'Aset baru berhasil ditambahkan');
      setIsAdding(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal menambahkan aset baru');
    }
  });

  const editMutation = useMutation({
    mutationFn: async (updatedItem: { id: string; name: string; specification: string; quantity: number; condition: string; keterangan_kerusakan?: string }) => {
      const { id, ...data } = updatedItem;
      const response = await apiClient.put(`/inventory-items/${id}`, data);
      return response.data;
    },
    onSuccess: async (data) => {
      if (photoFile) {
        try {
          await uploadPhotoMutation.mutateAsync({ id: data.id, file: photoFile });
        } catch (error) {
          addNotification('error', 'Aset diperbarui, tapi gagal mengunggah foto');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['inventory-items', id] });
      addNotification('success', 'Aset berhasil diperbarui');
      setEditItem(null);
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal memperbarui aset');
    }
  });

  const handleEditClick = (item: InventoryItem) => {
    setEditItem(item);
    setIsAdding(false);
    setPhotoFile(null);
    setPhotoPreview(item.photo_url ? `${ASSET_BASE_URL}${item.photo_url}` : null);
    
    let condition = item.condition || 'Baik';
    if (condition === 'Perbaikan') condition = 'Perlu Perbaikan';

    setFormData({
      name: item.name,
      specification: item.specification || '',
      quantity: item.quantity,
      condition: condition,
      keterangan_kerusakan: ''
    });
  };

  const handleAddClick = () => {
    setEditItem(null);
    setIsAdding(true);
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData({
      name: '',
      specification: '',
      quantity: 1,
      condition: 'Baik',
      keterangan_kerusakan: ''
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdding) {
      addMutation.mutate(formData);
    } else if (editItem) {
      editMutation.mutate({
        id: editItem.id,
        ...formData
      });
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    try {
      setIsExporting(true);
      await exportLabToPdf(id);
      addNotification('success', 'Laporan PDF berhasil diekspor');
    } catch (error) {
      addNotification('error', 'Gagal mengekspor laporan PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const getConditionColor = (condition: string) => {
    const c = condition.toLowerCase();
    if (c === 'baik') return 'online';
    if (c === 'rusak') return 'offline';
    if (c === 'perbaikan' || c === 'maintenance') return 'locked';
    return 'pending';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Box className="w-6 h-6" />
          </div>
          <div>
            {isLoadingLab ? (
              <div className="h-6 w-48 bg-slate-200 animate-pulse rounded mb-2"></div>
            ) : (
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Aset: {lab?.name}</h1>
            )}
            <p className="text-sm text-slate-500">Kelola barang non-komputer di laboratorium ini.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" className="shrink-0 flex items-center gap-2 whitespace-nowrap" onClick={handleExportPdf} isLoading={isExporting}>
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
          <Button className="shrink-0 flex items-center gap-2 whitespace-nowrap" onClick={handleAddClick}>
            <Plus className="w-4 h-4" />
            Tambah Aset
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoadingItems ? (
          <div className="p-8 text-center text-slate-500">Memuat data aset...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Nama Item</TableHead>
                <TableHead>Spesifikasi</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Bukti (Photo)</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32 text-slate-500">
                    Tidak ada aset yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map((item, index) => (
                  <TableRow 
                    key={item.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setDetailItem(item)}
                  >
                    <TableCell className="text-slate-500">{indexOfFirstItem + index + 1}</TableCell>
                    <TableCell className="font-medium text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Box className="w-4 h-4 text-blue-600" />
                      </div>
                      {item.name}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm max-w-[200px] truncate">
                      {item.specification || '-'}
                    </TableCell>
                    <TableCell className="text-slate-800 font-medium">
                      {item.quantity}
                    </TableCell>
                    <TableCell>
                      <Badge status={getConditionColor(item.condition) as any}>
                        {item.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.photo_url ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewedPhoto(`${ASSET_BASE_URL}${item.photo_url}`);
                          }}
                          className="w-12 h-12 rounded bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all focus:outline-none"
                          title="Klik untuk memperbesar"
                        >
                          <img src={`${ASSET_BASE_URL}${item.photo_url}`} alt={item.name} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400" title="Tidak ada foto">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          className="px-2 py-1.5 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(item);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="danger" 
                          className="px-2 py-1.5 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(item.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        
        {/* Pagination Controls */}
        {items && items.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Tampilkan</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entri</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Button 
                variant="secondary" 
                className="px-3 py-1.5 h-auto text-xs" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              
              <div className="flex items-center px-3 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg py-1.5 min-w-[3rem] justify-center">
                {currentPage} / {totalPages}
              </div>

              <Button 
                variant="secondary" 
                className="px-3 py-1.5 h-auto text-xs" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Aset"
        description="Apakah Anda yakin ingin menghapus aset ini? Data yang sudah dihapus tidak dapat dikembalikan."
        confirmText="Ya, Hapus"
        isLoading={deleteMutation.isPending}
      />

      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Detail Aset Barang"
      >
        {detailItem && (
          <div className="space-y-4">
            {detailItem.photo_url && (
              <div className="flex justify-center mb-6">
                <img 
                  src={`${ASSET_BASE_URL}${detailItem.photo_url}`} 
                  alt={detailItem.name} 
                  className="max-h-48 object-contain rounded-xl shadow-sm border border-slate-200"
                />
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
              <div className="col-span-1 text-sm font-medium text-slate-500">Nama Barang</div>
              <div className="col-span-2 text-sm font-semibold text-slate-800">{detailItem.name}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
              <div className="col-span-1 text-sm font-medium text-slate-500">Spesifikasi</div>
              <div className="col-span-2 text-sm text-slate-700 whitespace-pre-wrap">{detailItem.specification || '-'}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
              <div className="col-span-1 text-sm font-medium text-slate-500">Jumlah</div>
              <div className="col-span-2 text-sm text-slate-700">{detailItem.quantity}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pb-2">
              <div className="col-span-1 text-sm font-medium text-slate-500">Kondisi</div>
              <div className="col-span-2">
                <Badge status={getConditionColor(detailItem.condition) as any}>
                  {detailItem.condition}
                </Badge>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
              <Button variant="ghost" onClick={() => setDetailItem(null)} type="button">Tutup</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editItem || isAdding}
        onClose={() => {
          setEditItem(null);
          setIsAdding(false);
        }}
        title={isAdding ? "Tambah Aset Barang" : "Edit Aset Barang"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bukti Foto (Opsional)</label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 hover:bg-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-xs text-slate-400 mt-1">Format: JPG, PNG. Maks 5MB.</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Barang</label>
            <input 
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: Proyektor Epson"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Spesifikasi / Deskripsi</label>
            <textarea
              value={formData.specification}
              onChange={(e) => setFormData({...formData, specification: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px]"
              placeholder="Contoh: 1080p, 3000 lumens..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah</label>
              <input 
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kondisi</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({...formData, condition: e.target.value, keterangan_kerusakan: ''})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Baik">Baik</option>
                <option value="Rusak">Rusak</option>
                <option value="Perlu Perbaikan">Perlu Perbaikan</option>
              </select>
            </div>
          </div>
          
          {/* Field keterangan kerusakan - hanya muncul jika kondisi Perlu Perbaikan */}
          {formData.condition === 'Perlu Perbaikan' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-amber-800 mb-1">
                ⚠️ Keterangan Kerusakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.keterangan_kerusakan}
                onChange={(e) => setFormData({...formData, keterangan_kerusakan: e.target.value})}
                required
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[80px] bg-white"
                placeholder="Jelaskan kerusakan yang terjadi..."
              />
              <p className="text-xs text-amber-600 mt-1">Keterangan ini akan masuk ke Berita Acara secara otomatis.</p>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <Button variant="ghost" onClick={() => { setEditItem(null); setIsAdding(false); setPhotoFile(null); setPhotoPreview(null); }} type="button">Batal</Button>
            <Button variant="primary" type="submit" isLoading={editMutation.isPending || addMutation.isPending || uploadPhotoMutation.isPending}>
              {isAdding ? "Tambah Aset" : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={!!viewedPhoto}
        onClose={() => setViewedPhoto(null)}
        title="Lihat Bukti Foto"
      >
        <div className="flex justify-center items-center bg-slate-50 rounded-lg p-2 overflow-hidden border border-slate-200">
          {viewedPhoto && (
            <img 
              src={viewedPhoto} 
              alt="Bukti Foto" 
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
