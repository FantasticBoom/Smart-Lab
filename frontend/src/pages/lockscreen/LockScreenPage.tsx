import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Server, Search, ChevronRight } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

interface Lab {
  id: string;
  name: string;
  type: string;
  location: string;
  is_active: boolean;
}

export const LockScreenPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: labs, isLoading } = useQuery<Lab[]>({
    queryKey: ['labs', 'komputer'],
    queryFn: async () => {
      const { data } = await apiClient.get('/labs/?type=komputer');
      return data;
    }
  });

  const filteredLabs = labs?.filter(lab => 
    lab.type === 'komputer' && (
      lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Lock Screen Manager</h2>
            <p className="text-xs font-medium text-slate-500">
              {filteredLabs?.length || 0} Lab Tersedia
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau lokasi lab..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Content Section */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-200 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredLabs?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Pencarian Tidak Ditemukan</h3>
            <p className="text-slate-500 max-w-sm">
              Tidak ada laboratorium yang cocok dengan kata kunci "{searchTerm}". Coba gunakan nama atau lokasi lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLabs?.map((lab) => (
              <button
                key={lab.id}
                onClick={() => navigate(`/lockscreen/labs/${lab.id}`)}
                className="group relative flex flex-col text-left bg-white rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 border border-slate-200 hover:border-indigo-300 overflow-hidden"
              >
                {/* Background Decoration */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>

                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <h3 className="font-extrabold text-xl text-slate-800 group-hover:text-indigo-700 transition-colors mb-1.5">
                      {lab.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      {lab.location}
                    </p>
                  </div>
                  <div className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 shrink-0 shadow-sm",
                    "bg-white border border-slate-200 text-slate-400 group-hover:border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-200"
                  )}>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                
                <div className="relative z-10 mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                  <Badge status={lab.is_active ? 'online' : 'offline'}>
                    {lab.is_active ? 'Lab Aktif' : 'Non-Aktif'}
                  </Badge>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-400 transition-colors">
                    Kelola Akses
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
