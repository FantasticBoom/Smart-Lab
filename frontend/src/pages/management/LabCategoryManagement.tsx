import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Layers } from 'lucide-react';
import { getLabCategories, createLabCategory, updateLabCategory, deleteLabCategory, type LabCategory } from '../../services/labCategoryApi';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';


export const LabCategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<LabCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LabCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await getLabCategories();
      setCategories(data);
    } catch (error) {
      alert('Gagal memuat kategori lab');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category?: LabCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, slug: category.slug });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    // Auto generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData({ name, slug });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCategory) {
        await updateLabCategory(editingCategory.id, formData);
        alert('Kategori berhasil diperbarui');
      } else {
        await createLabCategory(formData);
        alert('Kategori berhasil ditambahkan');
      }
      handleCloseModal();
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Gagal menyimpan kategori');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteLabCategory(deleteId);
      alert('Kategori berhasil dihapus');
      setDeleteId(null);
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Gagal menghapus kategori');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Management Tipe Lab</h2>
            <p className="text-xs font-medium text-slate-500">
              Kelola tipe dan kategori laboratorium
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
              placeholder="Cari tipe lab..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
          <Button onClick={() => handleOpenModal()} className="shrink-0 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Tipe Lab
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Memuat data...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Tipe Lab</TableHead>
                <TableHead>Slug (Kode)</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-32 text-slate-500">
                    Tidak ada tipe lab yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium text-slate-800">{category.name}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-sm">{category.slug}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          className="px-2 py-1.5 h-auto"
                          onClick={() => handleOpenModal(category)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="danger"
                          className="px-2 py-1.5 h-auto"
                          onClick={() => setDeleteId(category.id)}
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
        onConfirm={handleDelete}
        title="Hapus Tipe Lab"
        description="Apakah Anda yakin ingin menghapus tipe lab ini? Pastikan tidak ada lab yang sedang menggunakan tipe ini."
        confirmText="Ya, Hapus"
        isLoading={isDeleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? "Edit Tipe Lab" : "Tambah Tipe Lab"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Tipe Lab</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={handleNameChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: Laboratorium Komputer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug (Kode Unik)</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: komputer"
            />
            <p className="text-xs text-slate-500 mt-1">Digunakan untuk keperluan internal sistem (tanpa spasi).</p>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <Button variant="ghost" onClick={handleCloseModal} type="button">Batal</Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {editingCategory ? "Simpan Perubahan" : "Tambah Tipe Lab"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
