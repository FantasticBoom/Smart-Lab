import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MonitorPlay, Plus, Box, FileDown } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { DeviceGrid } from '../../components/inventory/DeviceGrid';
import { DeviceDetailPanel } from '../../components/inventory/DeviceDetailPanel';
import { AnimatePresence } from 'framer-motion';
import { Modal } from '../../components/ui/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '../../store/notificationStore';
import { exportLabToPdf } from '../../utils/exportLabPdf';

interface Lab {
  id: string;
  name: string;
  type: string;
  location: string;
}

export const InventoryComputerLabPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    condition: 'Baik',
    origin: '',
    handover_date: ''
  });

  const { data: lab, isLoading: isLoadingLab } = useQuery<Lab>({
    queryKey: ['lab', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/labs/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: devices, isLoading: isLoadingDevices } = useQuery({
    queryKey: ['devices', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/labs/${id}/devices`);
      return data;
    },
    select: (data: any[]) => {
      return [...data].sort((a, b) => 
        (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
      );
    },
    enabled: !!id,
    refetchInterval: 15000, // Refresh device list status every 15 seconds
  });

  const addMutation = useMutation({
    mutationFn: async (newDevice: { code: string; condition: string; origin: string; handover_date: string }) => {
      const payload = {
        ...newDevice,
        handover_date: newDevice.handover_date ? new Date(newDevice.handover_date).toISOString() : null,
        origin: newDevice.origin || null
      };
      const response = await apiClient.post(`/labs/${id}/devices`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', id] });
      addNotification('success', 'Komputer berhasil ditambahkan');
      setIsAdding(false);
      setFormData({ code: '', condition: 'Baik', origin: '', handover_date: '' });
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal menambahkan komputer');
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData);
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

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] -m-4 sm:-m-6 lg:-m-8">
      {/* Main Grid Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/inventory')}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
              <MonitorPlay className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              {isLoadingLab ? (
                <div className="h-6 w-48 bg-slate-200 animate-pulse rounded mb-2"></div>
              ) : (
                <h1 className="text-xl font-bold text-slate-800 tracking-tight truncate">Perangkat: {lab?.name}</h1>
              )}
              <p className="text-sm text-slate-500 truncate">Kelola dan pantau perangkat komputer pintar.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" className="shrink-0 flex items-center gap-2 whitespace-nowrap" onClick={handleExportPdf} isLoading={isExporting}>
              <FileDown className="w-4 h-4" />
              Export PDF
            </Button>
            <Button variant="secondary" className="shrink-0 flex items-center gap-2 whitespace-nowrap" onClick={() => navigate(`/inventory/labs/${id}`)}>
              <Box className="w-4 h-4" />
              Kelola Aset Lain
            </Button>
            <Button className="shrink-0 flex items-center gap-2 whitespace-nowrap" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4" />
              Tambah Komputer
            </Button>
          </div>
        </div>

        {/* Grid Content */}
        {isLoadingDevices ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-square bg-slate-200 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : (
          <DeviceGrid 
            devices={devices || []} 
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
          />
        )}
      </div>

      {/* Detail Panel Area (Split View on Desktop, Bottom Sheet on Mobile) */}
      <AnimatePresence>
        {selectedDeviceId && (
          <DeviceDetailPanel 
            deviceId={selectedDeviceId} 
            onClose={() => setSelectedDeviceId(null)} 
          />
        )}
      </AnimatePresence>

      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="Tambah Komputer"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kode Perangkat / PC Name</label>
            <input 
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: PC-LAB-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kondisi</label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({...formData, condition: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Baik">Baik</option>
              <option value="Rusak">Rusak</option>
              <option value="Perbaikan">Perbaikan (Maintenance)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asal Komputer</label>
            <input 
              type="text"
              value={formData.origin}
              onChange={(e) => setFormData({...formData, origin: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: Pembelian Yayasan, Pengabdian, dll."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Serah Terima</label>
            <input 
              type="date"
              value={formData.handover_date}
              onChange={(e) => setFormData({...formData, handover_date: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <Button variant="ghost" onClick={() => setIsAdding(false)} type="button">Batal</Button>
            <Button variant="primary" type="submit" isLoading={addMutation.isPending}>
              Tambah Komputer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
