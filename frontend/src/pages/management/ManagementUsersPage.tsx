import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit2, Trash2, Search, Shield, User as UserIcon } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useNotificationStore } from '../../store/notificationStore';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';
import useAuthStore from '../../store/authStore';

interface User {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

export const ManagementUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore(state => state.addNotification);
  const currentUser = useAuthStore(state => state.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'operator'
  });
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Queries
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users');
      return data;
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newData: typeof formData) => {
      const { data } = await apiClient.post('/users', newData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification('success', 'Pengguna berhasil ditambahkan');
      closeModal();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal menambahkan pengguna');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      // If password is empty during edit, don't send it
      const payload = { ...data };
      if (!payload.password) {
        delete payload.password;
      }
      const response = await apiClient.put(`/users/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification('success', 'Data pengguna berhasil diperbarui');
      closeModal();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal memperbarui pengguna');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification('success', 'Pengguna berhasil dihapus');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal menghapus pengguna');
    }
  });

  // Handlers
  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        username: user.username,
        password: '', // Password field is blank when editing
        role: user.role
      });
    } else {
      setEditingId(null);
      setFormData({
        username: '',
        password: '',
        role: 'operator'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ username: '', password: '', role: 'operator' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      if (!formData.password) {
        addNotification('error', 'Password wajib diisi untuk pengguna baru');
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Manajemen Pengguna</h2>
            <p className="text-xs font-medium text-slate-500">
              Kelola akun operator dan superadmin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari pengguna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
          <Button onClick={() => handleOpenModal()} className="shrink-0 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah User
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Memuat data pengguna...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tgl Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    Tidak ada data pengguna ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border",
                          user.role === 'superadmin' ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-blue-50 border-blue-200 text-blue-600"
                        )}>
                          {user.role === 'superadmin' ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{user.username}</p>
                          {user.id === currentUser?.id && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-2 uppercase tracking-wider">
                              Anda
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge status={user.role === 'superadmin' ? 'online' : 'unlocked'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {new Date(user.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Pengguna"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(user)}
                          disabled={user.id === currentUser?.id && user.role === 'superadmin'}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Pengguna" : "Tambah Pengguna Baru"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="Masukkan username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Password {editingId && <span className="text-slate-400 font-normal">(Kosongkan jika tidak ingin mengubah)</span>}
            </label>
            <input
              type="password"
              required={!editingId}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="Masukkan password"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="operator">Operator</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              Super Admin memiliki hak akses penuh, termasuk mengelola pengguna. Operator hanya dapat mengelola lab dan device.
            </p>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={closeModal}>Batal</Button>
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Simpan Perubahan" : "Tambah Pengguna"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Pengguna"
        description={`Apakah Anda yakin ingin menghapus pengguna "${userToDelete?.username}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
};
