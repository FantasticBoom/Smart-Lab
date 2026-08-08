import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Layers, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export const ManagementIndexPage: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Management User',
      description: 'Kelola pengguna, hak akses (role), dan status akun staf maupun admin.',
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
      path: '/management/users'
    },
    {
      title: 'Management Type Lab',
      description: 'Kelola tipe dan kategori laboratorium untuk keperluan inventaris dan peminjaman.',
      icon: Layers,
      color: 'from-blue-500 to-indigo-600',
      path: '/management/lab-categories'
    },
    {
      title: 'Management Schedule Lab',
      description: 'Kelola jadwal penggunaan laboratorium.',
      icon: Calendar,
      color: 'from-blue-500 to-indigo-600',
      path: '/schedule-lab'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Management</h1>
        <p className="text-slate-500 mt-2">Pilih menu manajemen yang ingin Anda akses.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-slate-600 text-sm flex-grow">
                {item.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
