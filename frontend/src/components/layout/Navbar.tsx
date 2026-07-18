import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, LogOut, LayoutGrid, CalendarDays, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export function Navbar() {
  const { isAdmin, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Hardware Grid', path: '/', icon: LayoutGrid },
    { name: 'My Sessions', path: '/sessions', icon: CalendarDays },
    ...(isAdmin ? [{ name: 'Admin', path: '/admin', icon: Activity }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-brand-600 text-white p-2 rounded-lg group-hover:bg-brand-700 transition-colors shadow-sm">
              <Shield size={18} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg tracking-tight text-slate-900">Lab Slot</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Engine</span>
            </div>
          </Link>
          {isAdmin && (
            <span className="ml-2 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold tracking-widest uppercase border border-rose-200">
              Admin
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors",
                    isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <item.icon size={16} className={cn("transition-colors", isActive ? "text-brand-600" : "text-slate-400")} />
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
