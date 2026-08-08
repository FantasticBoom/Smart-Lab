import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Plus, Trash2, Pencil } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { getLabCategories, type LabCategory } from '../../services/labCategoryApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useNotificationStore } from '../../store/notificationStore';

interface Lab {
  id: string;
  name: string;
  type: string;
  location: string;
  is_active: boolean;
}

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editLab, setEditLab] = useState<Lab | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'komputer',
    location: '',
    is_active: true
  });

  const { data: labs, isLoading: isLabsLoading } = useQuery<Lab[]>({
    queryKey: ['labs'],
    queryFn: async () => {
      const { data } = await apiClient.get('/labs/');
      return data;
    },
  });

  const { data: categories, isLoading: isCategoriesLoading } = useQuery<LabCategory[]>({
    queryKey: ['labCategories'],
    queryFn: getLabCategories,
  });

  const isLoading = isLabsLoading || isCategoriesLoading;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/labs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      addNotification('success', 'Lab berhasil dihapus');
      setDeleteId(null);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal menghapus lab. Pastikan lab kosong.');
      setDeleteId(null);
    }
  });

  const editMutation = useMutation({
    mutationFn: async (updatedLab: { id: string; name: string; type: string; location: string; is_active: boolean }) => {
      const { id, ...data } = updatedLab;
      const response = await apiClient.put(`/labs/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      addNotification('success', 'Lab berhasil diperbarui');
      setEditLab(null);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal memperbarui lab.');
    }
  });

  const addMutation = useMutation({
    mutationFn: async (newLab: { name: string; type: string; location: string; is_active: boolean }) => {
      const response = await apiClient.post('/labs/', newLab);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labs'] });
      addNotification('success', 'Lab baru berhasil ditambahkan');
      setIsAdding(false);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal menambahkan lab baru.');
    }
  });

  const handleEditClick = (lab: Lab) => {
    setEditLab(lab);
    setIsAdding(false);
    setFormData({
      name: lab.name,
      type: lab.type,
      location: lab.location,
      is_active: lab.is_active
    });
  };

  const handleAddClick = () => {
    setEditLab(null);
    setIsAdding(true);
    setFormData({
      name: '',
      type: 'komputer',
      location: '',
      is_active: true
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdding) {
      addMutation.mutate(formData);
    } else if (editLab) {
      editMutation.mutate({
        id: editLab.id,
        ...formData
      });
    }
  };

  const filteredLabs = labs?.filter(lab => {
    const matchesSearch =
      lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || lab.type.toLowerCase() === filterType.toLowerCase();

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Manajemen Laboratorium</h1>
            <p className="text-sm text-slate-500">Kelola daftar lab dan aset di dalamnya.</p>
          </div>
        </div>
        <Button className="shrink-0 flex items-center gap-2" onClick={handleAddClick}>
          <Plus className="w-4 h-4" />
          Add New Lab
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, tipe, atau lokasi lab..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              <option value="all">Semua Tipe</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Memuat data...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Lab</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLabs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32 text-slate-500">
                    Tidak ada lab yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLabs?.map((lab) => (
                  <TableRow 
                    key={lab.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      if (lab.type.toLowerCase() === 'komputer') {
                        navigate(`/inventory/computer-labs/${lab.id}`);
                      } else {
                        navigate(`/inventory/labs/${lab.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-medium text-slate-800">{lab.name}</TableCell>
                    <TableCell className="capitalize text-slate-600">{lab.type}</TableCell>
                    <TableCell className="text-slate-600">{lab.location}</TableCell>
                    <TableCell>
                      <Badge status={lab.is_active ? 'online' : 'offline'}>
                        {lab.is_active ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          className="px-2 py-1.5 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(lab);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="danger"
                          className="px-2 py-1.5 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(lab.id);
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
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Laboratorium"
        description="Apakah Anda yakin ingin menghapus laboratorium ini? Aksi ini tidak dapat dibatalkan dan hanya bisa dilakukan jika lab tidak memiliki aset terkait."
        confirmText="Ya, Hapus"
        isLoading={deleteMutation.isPending}
      />

      <Modal
        isOpen={!!editLab || isAdding}
        onClose={() => {
          setEditLab(null);
          setIsAdding(false);
        }}
        title={isAdding ? "Tambah Laboratorium" : "Edit Laboratorium"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lab</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: Lab Komputer A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {categories?.map(cat => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: Gedung Timur Lt. 2"
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Lab Aktif</label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <Button variant="ghost" onClick={() => { setEditLab(null); setIsAdding(false); }} type="button">Batal</Button>
            <Button variant="primary" type="submit" isLoading={editMutation.isPending || addMutation.isPending}>
              {isAdding ? "Tambah Lab" : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
