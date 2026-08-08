import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';

interface NavbarProps {
  onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/inventory')) return 'Inventory Lab';
    if (pathname.startsWith('/lockscreen')) return 'Lock Screen';
    if (pathname.startsWith('/management/users')) return 'Management Users';
    if (pathname.startsWith('/management/lab-categories')) return 'Management Tipe Lab';
    if (pathname.startsWith('/management')) return 'Management';
    if (pathname.startsWith('/schedule-lab')) return 'Management Schedule Lab';
    if (pathname.startsWith('/berita-acara')) return 'Berita Acara';
    if (pathname.startsWith('/peminjaman-lab')) return 'Peminjaman LAB';
    if (pathname.startsWith('/profile')) return 'Profile';
    return 'Smart-Lab';
  };

  const title = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-white px-4 shadow-sm border-b border-slate-100 sm:px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden md:block">
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">{title}</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-4">
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
        
        <ProfileMenu />
      </div>
    </header>
  );
};
