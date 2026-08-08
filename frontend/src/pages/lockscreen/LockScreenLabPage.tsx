import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Monitor, Lock, Unlock, Search, Loader2, Key, Copy, Check, Clock, RefreshCw, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { useDeviceStore } from '../../store/deviceStore';
import { useNotificationStore } from '../../store/notificationStore';
import { cn } from '../../utils/cn';

interface Lab {
  id: string;
  name: string;
  location: string;
}

interface Device {
  id: string;
  code: string;
  status: 'online' | 'offline';
  lock_status: 'unlocked' | 'pending' | 'locked';
  active_window?: string;
}

interface InstallKey {
  id: string;
  key_code: string;
  status: string;
  expires_at: string;
  generated_by: string;
  is_global: boolean;
}

// ─── Generate Key Modal Component ──────────────────────────────────
const GenerateKeyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentKey: InstallKey | null;
  isGenerating: boolean;
  onGenerate: () => void;
  label: string;
}> = ({ isOpen, onClose, currentKey, isGenerating, onGenerate, label }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!currentKey?.expires_at) {
      setTimeLeft(null);
      return;
    }
    const calculateTimeLeft = () => {
      const expiresAt = new Date(currentKey.expires_at).getTime();
      const now = new Date().getTime();
      return Math.max(0, expiresAt - now);
    };
    const initialDiff = calculateTimeLeft();
    setTimeLeft(initialDiff);
    if (initialDiff <= 0) return;

    const timer = setInterval(() => {
      const diff = calculateTimeLeft();
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentKey]);

  const handleCopy = () => {
    if (currentKey?.key_code) {
      navigator.clipboard.writeText(currentKey.key_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isExpired = timeLeft !== null && timeLeft <= 0;
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  const maxTime = 10 * 60 * 1000;
  const progressPercent = timeLeft !== null ? Math.min(100, Math.max(0, (timeLeft / maxTime) * 100)) : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Generate Key</h3>
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[320px]">
              <AnimatePresence mode="wait">
                {!currentKey ? (
                  <motion.div
                    key="initial"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="max-w-sm w-full flex flex-col items-center"
                  >
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border-8 border-slate-100">
                      <Key className="w-8 h-8 text-slate-300" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-700 mb-2">Belum ada Kunci Aktif</h2>
                    <p className="text-slate-500 mb-6 leading-relaxed text-sm">
                      Tekan tombol di bawah untuk menghasilkan Kunci Bypass Instalasi baru. Kunci ini hanya berlaku selama 10 menit.
                    </p>
                    <Button
                      size="lg"
                      className="w-full h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-500/20"
                      onClick={onGenerate}
                      isLoading={isGenerating}
                    >
                      <Key className="w-5 h-5 mr-2" />
                      Generate Kunci Baru
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="w-full max-w-sm flex flex-col items-center"
                  >
                    {/* Timer Circle */}
                    <div className="relative mb-6">
                      <svg className="w-28 h-28 transform -rotate-90">
                        <circle cx="56" cy="56" r="40" stroke="currentColor" strokeWidth="7" fill="transparent" className="text-slate-100" />
                        <circle
                          cx="56" cy="56" r="40" stroke="currentColor" strokeWidth="7" fill="transparent"
                          strokeDasharray={251}
                          strokeDashoffset={251 - (251 * progressPercent) / 100}
                          className={cn(
                            "transition-all duration-1000 ease-linear",
                            isExpired ? "text-slate-300" : timeLeft && timeLeft < 60000 ? "text-red-500" : "text-amber-500"
                          )}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Clock className={cn("w-4 h-4 mb-0.5", isExpired ? "text-slate-400" : "text-slate-500")} />
                        <span className={cn("font-bold font-mono text-base", isExpired ? "text-slate-400" : "text-slate-800")}>
                          {isExpired ? "00:00" : formatTime(timeLeft || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Key Display */}
                    <div className="w-full relative group mb-6">
                      <div className={cn(
                        "w-full bg-slate-50 border-2 rounded-2xl p-5 transition-colors",
                        isExpired ? "border-slate-200 bg-slate-100/50" : "border-amber-200 bg-amber-50/30"
                      )}>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Kode Instalasi</p>
                          <h2 className={cn(
                            "text-4xl sm:text-5xl font-black font-mono tracking-[0.25em] ml-[0.25em]",
                            isExpired ? "text-slate-300 line-through decoration-slate-400" : "text-slate-800"
                          )}>
                            {currentKey.key_code}
                          </h2>
                        </div>
                      </div>
                      {!isExpired && (
                        <button
                          onClick={handleCopy}
                          className="absolute top-3 right-3 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm text-slate-500 hover:text-slate-700 transition-all active:scale-95"
                          title="Copy Key"
                        >
                          {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                        </button>
                      )}
                    </div>

                    {/* Status / Action */}
                    {isExpired ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="flex items-center gap-2 text-red-500 mb-4 bg-red-50 px-4 py-2 rounded-full border border-red-100">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-semibold text-xs">Waktu habis. Kode tidak berlaku lagi.</span>
                        </div>
                        <Button
                          size="lg"
                          className="w-full h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 border-amber-600 text-white"
                          onClick={onGenerate}
                          isLoading={isGenerating}
                        >
                          <RefreshCw className={cn("w-5 h-5 mr-2", isGenerating && "animate-spin")} />
                          Generate Ulang
                        </Button>
                      </div>
                    ) : (
                      <p className="text-slate-500 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-xs font-medium">
                        {currentKey.is_global
                          ? "Kode ini berlaku untuk semua komputer di lab ini."
                          : "Berikan kode ini kepada mahasiswa untuk dimasukkan di komputer client."}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Main Page Component ───────────────────────────────────────────
export const LockScreenLabPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Generate Key Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLabel, setModalLabel] = useState('');
  const [currentKey, setCurrentKey] = useState<InstallKey | null>(null);
  const [generatePayload, setGeneratePayload] = useState<{ is_global: boolean; device_id?: string }>({ is_global: false });
  const [selectedAppDevice, setSelectedAppDevice] = useState<any>(null);
  
  // Zustand store
  const { devices: storeDevices, setDevices, updateDevice } = useDeviceStore();

  const { data: lab } = useQuery<Lab>({
    queryKey: ['lab', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/labs/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: initialDevices, isLoading: isLoadingDevices } = useQuery<Device[]>({
    queryKey: ['devices', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/labs/${id}/devices`);
      return data;
    },
    enabled: !!id,
  });

  // Initialize store with fetched devices — hanya jika belum ada data live dari WS
  useEffect(() => {
    if (initialDevices) {
      setDevices(initialDevices);
    }
  }, [initialDevices, setDevices]);

  // Derived devices array: API data sebagai base, WS store sebagai override
  // Hanya field yang benar-benar ada di store yang menimpa data API
  const devices = React.useMemo(() => {
    if (!initialDevices) return [];
    return initialDevices.map(d => {
      const storeEntry = storeDevices[d.id];
      if (!storeEntry) return d;
      return {
        ...d,
        // Override dengan data realtime dari WS, hanya jika nilainya terdefinisi
        ...(storeEntry.status !== undefined && { status: storeEntry.status }),
        ...(storeEntry.lock_status !== undefined && { lock_status: storeEntry.lock_status }),
        ...(storeEntry.active_window !== undefined && { active_window: storeEntry.active_window }),
        ...(storeEntry.open_windows !== undefined && { open_windows: storeEntry.open_windows }),
      };
    });
  }, [initialDevices, storeDevices]);

  const filteredDevices = devices
    .filter(d => d.code.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const lockMutation = useMutation({
    mutationFn: async ({ deviceId, action }: { deviceId: string, action: 'lock' | 'unlock' }) => {
      // Optimistic update
      updateDevice({ id: deviceId, lock_status: 'pending' });
      await apiClient.post(`/devices/${deviceId}/${action}`);
    },
    onError: (error: any, variables) => {
      addNotification('error', error.response?.data?.detail || `Gagal melakukan ${variables.action}`);
      // Revert optimistic update (ideally we fetch status, but let's just let it be or set back to unlocked)
      updateDevice({ id: variables.deviceId, lock_status: variables.action === 'lock' ? 'unlocked' : 'locked' });
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (payload: { is_global: boolean; device_id?: string }) => {
      const { data } = await apiClient.post('/install-keys', payload);
      return data as InstallKey;
    },
    onSuccess: (data) => {
      setCurrentKey(data);
      addNotification('success', 'Kunci instalasi berhasil dibuat');
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.detail || 'Gagal membuat kunci instalasi');
    }
  });

  const handleLockAction = (deviceId: string, currentStatus: string) => {
    if (currentStatus === 'pending') return;
    const action = currentStatus === 'locked' ? 'unlock' : 'lock';
    lockMutation.mutate({ deviceId, action });
  };

  // Open modal for Global Generate Key
  const handleGlobalGenerateKey = () => {
    setCurrentKey(null);
    setModalLabel('Global Key — Berlaku untuk semua PC');
    setGeneratePayload({ is_global: true });
    setModalOpen(true);
  };

  // Open modal for Per-Device Generate Key
  const handleDeviceGenerateKey = (device: Device) => {
    setCurrentKey(null);
    setModalLabel(`Key untuk ${device.code}`);
    setGeneratePayload({ is_global: false, device_id: device.id });
    setModalOpen(true);
  };

  const handleGenerate = () => {
    generateMutation.mutate(generatePayload);
  };

  const stats = React.useMemo(() => {
    let unlocked = 0, locked = 0, offline = 0;
    devices.forEach(d => {
      if (d.status === 'offline') offline++;
      else if (d.lock_status === 'locked') locked++;
      else unlocked++;
    });
    return { unlocked, locked, offline };
  }, [devices]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-4 sm:-m-6 lg:-m-8 bg-[#f8fafc]">
      {/* Header - Fixed */}
      <div className="shrink-0 p-4 sm:p-6 lg:p-8 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/lockscreen')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Workstation Status Grid</h1>
                <p className="text-sm font-medium text-slate-500">{lab?.name}</p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-xs font-bold text-slate-500 tracking-wider uppercase ml-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-900" />
                {stats.unlocked} Unlocked
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                {stats.locked} Locked
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                {stats.offline} Offline
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Global Generate Key Button */}
            <Button
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 border-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap"
              onClick={handleGlobalGenerateKey}
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Global Key</span>
              <span className="sm:hidden">Key</span>
            </Button>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari PC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-0">
        {isLoadingDevices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
            <Monitor className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Tidak ada perangkat yang ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {filteredDevices.map((device) => {
              const isLocked = device.lock_status === 'locked';
              const isPending = device.lock_status === 'pending';
              const isOnline = device.status === 'online';
              // Check if condition exists in initialDevices since it's not in store 
              const fullDevice = initialDevices?.find(d => d.id === device.id);
              const condition = (fullDevice as any)?.condition || 'Baik';
              const hasIssue = condition.toLowerCase() !== 'baik' && condition.toLowerCase() !== 'good';

              let cardClasses = "bg-white border-slate-200 shadow-sm hover:shadow-md";
              let badgeText = "ACTIVE";
              let badgeClasses = "bg-[#7aead1] text-[#0f4f40]";
              
              if (!isOnline) {
                cardClasses = "bg-[#f1f5f9] border-slate-200 opacity-90";
                badgeText = hasIssue ? "MAINTENANCE" : "OFFLINE";
                badgeClasses = "bg-[#cbd5e1] text-[#334155]";
              } else if (isLocked) {
                cardClasses = "bg-white border-[#b91c1c] ring-1 ring-[#b91c1c] shadow-md";
                badgeText = "LOCKED";
                badgeClasses = "bg-[#b91c1c] text-white";
              }

              return (
                <div 
                  key={device.id}
                  className={cn("flex flex-col p-4 rounded-2xl border transition-all duration-200", cardClasses)}
                >
                  {/* Top Header */}
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={cn(
                      "text-[10px] font-mono font-bold uppercase tracking-widest",
                      isLocked ? "text-[#b91c1c]" : "text-slate-500"
                    )}>
                      {lab?.name || 'WS-LAB'}
                    </span>
                    <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider", badgeClasses)}>
                      {badgeText}
                    </span>
                  </div>

                  {/* Device Name */}
                  <h3 className="font-extrabold text-xl text-slate-800 mb-4 tracking-tight">{device.code}</h3>

                  {/* Active Window */}
                  <div 
                    className="flex items-center gap-3 mb-5 flex-1 cursor-pointer hover:bg-slate-50 transition-colors p-2 -mx-2 rounded-xl"
                    onClick={() => {
                      if (isOnline) setSelectedAppDevice(device);
                    }}
                  >
                    <div className={cn(
                      "p-2.5 rounded-lg flex-shrink-0",
                      isOnline && !isLocked ? "bg-[#eff6ff] text-[#3b82f6]" : 
                      isLocked ? "bg-[#fef2f2] text-[#ef4444]" : "bg-white text-slate-400 shadow-sm border border-slate-100"
                    )}>
                       <Monitor className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">
                        {isOnline ? "CURRENT APP" : "LAST APP"}
                      </p>
                      <p className="text-xs font-bold text-slate-700 truncate" title={device.active_window || '-'}>
                        {device.active_window || (isOnline ? 'Desktop' : '-')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-2">
                    {!isOnline ? (
                       <div className="bg-[#e2e8f0] text-slate-400 text-xs font-extrabold uppercase tracking-widest text-center py-2.5 rounded-xl">
                         Actions Disabled
                       </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant={isLocked ? 'primary' : 'secondary'}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-xl font-bold transition-all shadow-none",
                            isLocked 
                              ? "bg-[#0f172a] hover:bg-slate-800 text-white border-transparent" 
                              : "bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] border-transparent"
                          )}
                          disabled={isPending}
                          onClick={() => handleLockAction(device.id, device.lock_status)}
                        >
                          <AnimatePresence mode="wait">
                            {isPending ? (
                              <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </motion.div>
                            ) : isLocked ? (
                              <motion.div key="unlock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <Unlock className="w-4 h-4" /> Unlock
                              </motion.div>
                            ) : (
                              <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <Lock className="w-4 h-4" /> Lock
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Button>

                        {/* Per-Device Generate Key Button */}
                        <button
                          onClick={() => handleDeviceGenerateKey(device)}
                          className="p-2.5 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-xl text-amber-600 hover:text-amber-700 transition-colors shrink-0 flex items-center justify-center"
                          title={`Generate Key untuk ${device.code}`}
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors shrink-0 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Key Modal */}
      <GenerateKeyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentKey={currentKey}
        isGenerating={generateMutation.isPending}
        onGenerate={handleGenerate}
        label={modalLabel}
      />

      {/* Open Apps Modal */}
      <AnimatePresence>
        {selectedAppDevice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedAppDevice(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-sm">
                    <Monitor className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">Active Applications</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">{selectedAppDevice.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAppDevice(null)}
                  className="p-2.5 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto">
                {selectedAppDevice.open_windows && selectedAppDevice.open_windows.length > 0 ? (
                  <ul className="space-y-2.5">
                    {selectedAppDevice.open_windows.map((app: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-indigo-50/50 transition-colors border border-transparent hover:border-indigo-100/50 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0 group-hover:scale-125 transition-transform" />
                        <span className="text-sm font-semibold text-slate-700 leading-snug break-words">{app}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                      <Monitor className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold">Tidak ada aplikasi yang terdeteksi.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
