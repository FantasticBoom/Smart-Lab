import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, X, Cpu, HardDrive, MemoryStick, Info, Pencil, Image as ImageIcon, Copy, Check, Trash2 } from 'lucide-react';
import apiClient, { ASSET_BASE_URL } from '../../services/apiClient';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useNotificationStore } from '../../store/notificationStore';
import { Modal } from '../ui/Modal';

interface DeviceDetailPanelProps {
  deviceId: string | null;
  onClose: () => void;
}

interface DeviceDetail {
  id: string;
  code: string;
  condition: string;
  photo_url: string | null;
  device_token: string;
  ip_address: string | null;
  origin: string | null;
  handover_date: string | null;
  specs: Array<{ spec_key: string; spec_value: string }>;
}

const DEFAULT_SPECS = ['Monitor', 'Keyboard', 'Mouse', 'CPU', 'Aksesoris'];

export const DeviceDetailPanel: React.FC<DeviceDetailPanelProps> = ({ deviceId, onClose }) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [isEditing, setIsEditing] = useState(false);
  const [editSpecs, setEditSpecs] = useState<Record<string, string>>({});
  const [editCondition, setEditCondition] = useState('Baik');
  const [editKeteranganKerusakan, setEditKeteranganKerusakan] = useState('');
  const [editName, setEditName] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editHandoverDate, setEditHandoverDate] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: device, isLoading } = useQuery<DeviceDetail>({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      if (!deviceId) return null;
      const { data } = await apiClient.get(`/devices/${deviceId}`);
      return data;
    },
    enabled: !!deviceId,
  });

  const updateSpecsMutation = useMutation({
    mutationFn: async (updatedData: { code: string, condition: string, keterangan_kerusakan?: string, origin: string, handover_date: string, specs: Record<string, string> }) => {
      // First update condition, code, and history if needed
      if (updatedData.condition !== device?.condition || updatedData.code !== device?.code || updatedData.origin !== device?.origin || updatedData.handover_date !== device?.handover_date) {
        const payload: any = {
          condition: updatedData.condition,
          code: updatedData.code,
          origin: updatedData.origin || null,
          handover_date: updatedData.handover_date ? new Date(updatedData.handover_date).toISOString() : null
        };
        if (updatedData.keterangan_kerusakan) {
          payload.keterangan_kerusakan = updatedData.keterangan_kerusakan;
        }
        await apiClient.put(`/devices/${deviceId}`, payload);
      }
      // Then update specs
      await apiClient.put(`/devices/${deviceId}/specs`, updatedData.specs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      addNotification('success', 'Perangkat berhasil diperbarui');
      setIsEditing(false);
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal memperbarui perangkat');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/devices/${deviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      addNotification('success', 'Komputer berhasil dihapus');
      onClose();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal menghapus komputer');
    }
  });

  const handleEditClick = () => {
    if (!device) return;
    const currentSpecs: Record<string, string> = {};
    
    // Initialize with default specs keys even if empty
    DEFAULT_SPECS.forEach(key => currentSpecs[key] = '');
    
    // Populate with existing specs (excluding 'Network' as it's now handled automatically)
    device.specs.forEach(s => {
      if (s.spec_key.toLowerCase() !== 'network') {
        currentSpecs[s.spec_key] = s.spec_value;
      }
    });

    let initialCondition = device.condition || 'Baik';
    if (initialCondition === 'Perbaikan') initialCondition = 'Perlu Perbaikan';

    setEditSpecs(currentSpecs);
    setEditCondition(initialCondition);
    setEditKeteranganKerusakan('');
    setEditName(device.code || '');
    setEditOrigin(device.origin || '');
    setEditHandoverDate(device.handover_date ? new Date(device.handover_date).toISOString().split('T')[0] : '');
    setIsEditing(true);
  };

  const handleSaveSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty specs to clean up the DB
    const cleanedSpecs: Record<string, string> = {};
    Object.entries(editSpecs).forEach(([k, v]) => {
      if (v.trim()) cleanedSpecs[k] = v;
    });

    updateSpecsMutation.mutate({
      code: editName,
      condition: editCondition,
      keterangan_kerusakan: editCondition === 'Perlu Perbaikan' ? editKeteranganKerusakan : undefined,
      origin: editOrigin,
      handover_date: editHandoverDate,
      specs: cleanedSpecs
    });
  };

  const handleSpecChange = (key: string, value: string) => {
    setEditSpecs(prev => ({ ...prev, [key]: value }));
  };

  const handleDeleteDevice = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus komputer ini?')) {
      deleteMutation.mutate();
    }
  };

  const handleCopyToken = async () => {
    if (!device?.device_token) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(device.device_token);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = device.device_token;
        // Mencegah scroll ke bawah saat textarea difokuskan
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification('success', 'Token berhasil disalin');
    } catch (error) {
      addNotification('error', 'Gagal menyalin token');
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!deviceId) return null;

  const panelContent = (
    <div className="h-full flex flex-col bg-white overflow-hidden shadow-2xl md:shadow-none md:border-l md:border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-500" />
          Data Perangkat
        </h2>
        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-slate-200 rounded-xl"></div>
            <div className="h-8 bg-slate-200 rounded-lg w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            </div>
          </div>
        ) : device ? (
          <div className="space-y-6">
            {/* Main Info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{device.code}</h3>
                  <button onClick={handleEditClick} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Nama Komputer">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2">
                  <Badge status={
                    (device.condition || '').toLowerCase() === 'baik' ? 'online' : 
                    (device.condition || '').toLowerCase() === 'rusak' ? 'offline' : 'locked'
                  }>
                    {device.condition || 'Kondisi belum diatur'}
                  </Badge>
                </div>
              </div>
              {device.photo_url ? (
                <img src={`${ASSET_BASE_URL}${device.photo_url}`} alt="Device" className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm" />
              ) : (
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 text-slate-400 shadow-sm shrink-0">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>

            {/* Device Token & Network Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Device Token</p>
                  <p className="text-sm font-mono text-slate-700 truncate" title={device.device_token}>
                    {device.device_token || 'Tidak tersedia'}
                  </p>
                </div>
                <button
                  onClick={handleCopyToken}
                  className="shrink-0 p-2 bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200 transition-colors"
                  title="Copy Token"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">IP Address</p>
                  <p className="text-sm font-mono text-slate-700 truncate" title={device.ip_address || ''}>
                    {device.ip_address || 'Menunggu Agen...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Button 
                variant="secondary"
                className="flex-1 flex justify-center items-center gap-2 py-2"
                onClick={handleEditClick}
              >
                <Pencil className="w-4 h-4" /> Edit Spesifikasi
              </Button>
              <Button
                variant="ghost"
                className="shrink-0 flex justify-center items-center gap-2 py-2 px-3 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteDevice}
                title="Hapus Komputer"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Riwayat Aset */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Info className="w-4 h-4 text-emerald-500" /> Riwayat Aset
              </h4>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex justify-between items-start pb-3 border-b border-slate-200/60 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 text-sm text-slate-500 min-w-24">
                    <span>Asal Komputer</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-right max-w-[180px] break-words whitespace-pre-wrap">{device.origin || '-'}</span>
                </div>
                <div className="flex justify-between items-start pb-3 border-b border-slate-200/60 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 text-sm text-slate-500 min-w-24">
                    <span>Tgl Serah Terima</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-right max-w-[180px] break-words whitespace-pre-wrap">
                    {device.handover_date ? new Date(device.handover_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Info className="w-4 h-4 text-blue-500" /> Detail Spesifikasi
              </h4>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                {device.specs && device.specs.filter(s => s.spec_key.toLowerCase() !== 'network').length > 0 ? (
                  device.specs.filter(s => s.spec_key.toLowerCase() !== 'network').map((spec, i) => {
                    let Icon = Info;
                    const keyLower = spec.spec_key.toLowerCase();
                    if (keyLower.includes('cpu') || keyLower.includes('processor')) Icon = Cpu;
                    else if (keyLower.includes('ram') || keyLower.includes('memory')) Icon = MemoryStick;
                    else if (keyLower.includes('disk') || keyLower.includes('storage') || keyLower.includes('ssd')) Icon = HardDrive;
                    else if (keyLower.includes('monitor')) Icon = Monitor;

                    return (
                      <div key={i} className="flex justify-between items-start pb-3 border-b border-slate-200/60 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 text-sm text-slate-500 min-w-24">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="capitalize">{spec.spec_key}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 text-right max-w-[180px] break-words whitespace-pre-wrap">{spec.spec_value}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-400 italic text-center py-4">
                    Belum ada spesifikasi yang diinput. Klik "Edit Spesifikasi" untuk menambahkan.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 mt-10">Data tidak ditemukan.</div>
        )}
      </div>

      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Perangkat & Spesifikasi"
      >
        <form onSubmit={handleSaveSpecs} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Komputer / PC Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: PC-LAB-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kondisi Fisik</label>
            <select
              value={editCondition}
              onChange={(e) => { setEditCondition(e.target.value); setEditKeteranganKerusakan(''); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Baik">Baik</option>
              <option value="Rusak">Rusak</option>
              <option value="Perlu Perbaikan">Perlu Perbaikan</option>
            </select>
            {/* Field keterangan kerusakan - hanya muncul jika kondisi Perlu Perbaikan */}
            {editCondition === 'Perlu Perbaikan' && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <label className="block text-sm font-semibold text-amber-800 mb-1">
                  ⚠️ Keterangan Kerusakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editKeteranganKerusakan}
                  onChange={(e) => setEditKeteranganKerusakan(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[70px] bg-white text-sm"
                  placeholder="Jelaskan kerusakan yang terjadi..."
                />
                <p className="text-xs text-amber-600 mt-1">Akan masuk ke Berita Acara secara otomatis.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asal Komputer</label>
            <input
              type="text"
              value={editOrigin}
              onChange={(e) => setEditOrigin(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: Pembelian Yayasan, Pengabdian, dll."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Serah Terima</label>
            <input
              type="date"
              value={editHandoverDate}
              onChange={(e) => setEditHandoverDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          
          <div className="space-y-3 pt-2">
            <h4 className="font-semibold text-slate-800 text-sm">Spesifikasi Komponen</h4>
            {Object.keys(editSpecs).map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{key}</label>
                {key.toLowerCase() === 'cpu' ? (
                  <textarea
                    value={editSpecs[key]}
                    onChange={(e) => handleSpecChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px]"
                    placeholder="Contoh: Processor Intel i5, RAM 32GB, Motherboard MSI..."
                  />
                ) : (
                  <input
                    type="text"
                    value={editSpecs[key]}
                    onChange={(e) => handleSpecChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder={`Spesifikasi ${key}...`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <Button variant="ghost" onClick={() => setIsEditing(false)} type="button">Batal</Button>
            <Button variant="primary" type="submit" isLoading={updateSpecsMutation.isPending}>Simpan Perubahan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );

  return (
    <>
      {/* Mobile view (Bottom Sheet) */}
      <AnimatePresence>
        {deviceId && (
          <div className="md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-3xl overflow-hidden"
            >
              {panelContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop view (Side Panel) */}
      {deviceId && (
        <div className="hidden md:block w-[400px] flex-shrink-0 h-[calc(100vh-64px)] sticky top-16">
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full"
          >
            {panelContent}
          </motion.div>
        </div>
      )}
    </>
  );
};
