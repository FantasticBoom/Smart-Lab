import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Server, Users, X, Database, Shrink, Expand, FileText } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const { user } = useAuthStore();
  // Normalisasi role: tangani kemungkinan format Enum seperti "superadmin", "SUPERADMIN", atau "UserRole.superadmin"
  const rawRole = user?.role ?? '';
  const normalizedRole = rawRole.includes('.') ? rawRole.split('.').pop()!.toLowerCase() : rawRole.toLowerCase();
  const isSuperAdmin = normalizedRole === 'superadmin';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventory Lab', path: '/inventory', icon: Database },
    { name: 'Berita Acara', path: '/berita-acara', icon: FileText },
    { name: 'Peminjaman LAB', path: '/peminjaman-lab', icon: FileText },
    { name: 'Lock Screen', path: '/lockscreen', icon: Server },
  ];

  if (isSuperAdmin) {
    navItems.push({ name: 'Management', path: '/management', icon: Users });
  }

  // The content of the sidebar
  const renderContent = (mobile = false) => {
    // For mobile, it's never visually "collapsed" in the desktop sense.
    const collapsed = !mobile && isCollapsed;

    return (
      <div className={cn(
        "flex flex-col h-full bg-gradient-to-b from-blue-700 via-indigo-800 to-[#0f172a] text-blue-50 shadow-2xl transition-all duration-300 relative",
        collapsed ? "w-[80px]" : "w-64"
      )}>
        {/* Decorative ambient light */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-400/20 to-transparent pointer-events-none" />

        <div className={cn(
          "flex items-center h-20 border-b border-white/10 relative z-10",
          collapsed ? "justify-center px-0" : "justify-between px-5"
        )}>
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="w-9 h-9 bg-gradient-to-br from-white to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <Database className="w-5 h-5 text-blue-700" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold text-white tracking-wide whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                Smart-Lab
              </span>
            )}
          </div>

          {/* Close button for mobile */}
          {mobile && (
            <button
              className="p-2 hover:bg-white/10 rounded-xl text-blue-200 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Collapse toggle for desktop */}
          {!mobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all hidden md:block",
                collapsed && "absolute -right-3.5 top-20 bg-indigo-600 hover:bg-indigo-500 border-2 border-[#1e1b4b] rounded-full p-1.5 shadow-xl z-50 text-white"
              )}
              title={collapsed ? "Expand Sidebar" : "Minimize Sidebar"}
            >
              {collapsed ? <Expand className="w-4 h-4" /> : <Shrink className="w-5 h-5" />}
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-8 space-y-2.5 overflow-y-auto overflow-x-hidden relative z-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => mobile && setIsOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-xl transition-all duration-300 group relative",
                    collapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3",
                    isActive
                      ? "bg-gradient-to-r from-white/20 to-white/5 text-white shadow-lg border border-white/10 backdrop-blur-sm"
                      : "hover:bg-white/10 hover:text-white text-blue-200/70"
                  )
                }
                title={collapsed ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      {isActive && (
                        <div className="absolute inset-0 bg-blue-400 blur-md opacity-50 rounded-full" />
                      )}
                      <Icon className={cn(
                        "w-4 h-4 transition-transform duration-300 flex-shrink-0 relative z-10",
                        isActive ? "text-white scale-110" : "group-hover:scale-110 group-hover:text-blue-100"
                      )} />
                    </div>

                    {!collapsed && (
                      <span className={cn(
                        "truncate text-sm font-medium transition-colors",
                        isActive ? "text-white" : "group-hover:text-blue-50"
                      )}>
                        {item.name}
                      </span>
                    )}

                    {/* Active indicator dot for collapsed state */}
                    {collapsed && isActive && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-300 rounded-l-full" />
                    )}

                    {/* Tooltip for collapsed state (shows on hover) */}
                    {collapsed && (
                      <div className="absolute left-16 bg-white/90 text-indigo-900 font-semibold text-xs px-3 py-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-50 whitespace-nowrap shadow-xl transform translate-x-2 group-hover:translate-x-0">
                        {item.name}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className={cn(
          "p-5 bg-black/10 border-t border-white/10 text-xs text-blue-200/60 relative z-10",
          collapsed ? "text-center px-2" : "text-left"
        )}>
          {!collapsed ? (
            <p className="truncate font-medium">&copy; 2026 Smart-Lab UIGM By LPTIK</p>
          ) : (
            <p className="font-bold text-center tracking-widest">SL</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 z-50 md:hidden shadow-2xl"
          >
            {renderContent(true)}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Static) */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 z-30">
        {renderContent(false)}
      </aside>
    </>
  );
};
