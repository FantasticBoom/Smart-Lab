import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Monitor, Building2, Stethoscope, Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Layers } from 'lucide-react';
import apiClient from '../../services/apiClient';
import QRCode from 'react-qr-code';

interface DashboardStats {
  active_labs_count: number;
  labs_by_type: Record<string, number>;
  devices_by_status: {
    online: number;
    offline: number;
    maintenance: number;
  };
}

const fetchStats = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get('/dashboard/stats');
  return data;
};

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Gagal Memuat Data</h2>
        <p className="mb-4 text-sm text-center max-w-md">Terjadi kesalahan saat mengambil statistik dashboard. Periksa koneksi Anda atau coba lagi nanti.</p>
        <button 
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </button>
      </div>
    );
  }

  // Calculate total devices
  const totalDevices = stats ? Object.values(stats.devices_by_status).reduce((a, b) => a + b, 0) : 0;

  const categoryStyles: Record<string, { icon: any, color: string, bgColor: string, borderColor: string }> = {
    komputer: { icon: Monitor, color: 'text-indigo-500', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
    teknik: { icon: Building2, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-100' },
    kedokteran: { icon: Stethoscope, color: 'text-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
  };

  const activeLabsCard = {
    title: 'Active Labs',
    value: stats?.active_labs_count || 0,
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  };

  const dynamicLabCards = Object.entries(stats?.labs_by_type || {}).map(([key, value]) => {
    const title = 'Lab ' + key.charAt(0).toUpperCase() + key.slice(1);
    const style = categoryStyles[key.toLowerCase()] || { 
      icon: Layers, 
      color: 'text-purple-500', 
      bgColor: 'bg-purple-50', 
      borderColor: 'border-purple-100' 
    };
    
    return {
      title,
      value: value as number,
      ...style,
    };
  });

  const statCards = [activeLabsCard, ...dynamicLabCards];

  const deviceStats = [
    { label: 'Online', value: stats?.devices_by_status.online || 0, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Maintenance', value: stats?.devices_by_status.maintenance || 0, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Offline', value: stats?.devices_by_status.offline || 0, icon: XCircle, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Utama</h1>
          <p className="text-sm text-slate-500 mt-1">Ringkasan status laboratorium dan perangkat cerdas Anda.</p>
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div 
                key={index}
                variants={itemVariants}
                className={`bg-white rounded-2xl p-6 border ${card.borderColor} shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}
              >
                {/* Decorative background circle */}
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.bgColor} opacity-50 group-hover:scale-110 transition-transform duration-500`}></div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
                    <h3 className="text-3xl font-bold text-slate-800">{card.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} strokeWidth={2} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Device Overview Section */}
      {!isLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-8"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-slate-400" /> Status Perangkat ({totalDevices})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {deviceStats.map((stat, i) => {
              const Icon = stat.icon;
              const percentage = totalDevices > 0 ? Math.round((stat.value / totalDevices) * 100) : 0;
              
              return (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className={`p-3 rounded-full bg-white shadow-sm border border-slate-100`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-800">{stat.value}</span>
                      <span className="text-xs font-semibold text-slate-400">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* QR Code Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-8 flex flex-col md:flex-row items-center gap-8"
      >
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800 mb-2">QR Code Peminjaman Lab</h2>
          <p className="text-sm text-slate-500 mb-4">
            Gunakan QR Code ini untuk memudahkan mahasiswa mengakses formulir peminjaman lab cerdas. Anda dapat mencetak gambar ini atau menunjukkannya langsung kepada mahasiswa.
          </p>
          <div className="inline-block px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 font-mono">
            {`${window.location.origin}/borrow-lab`}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
          <QRCode 
            value={`${window.location.origin}/borrow-lab`} 
            size={180}
            bgColor="#FFFFFF"
            fgColor="#0f172a"
            level="Q"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
