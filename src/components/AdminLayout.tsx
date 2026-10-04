import React, { useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Cpu,
  Key,
  Coins,
  Receipt,
  ScrollText,
  BookOpen,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { ButterflyLogo } from './ButterflyLogo';
import { usePlatform } from '../context/PlatformContext';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminToken, admin, logoutAdminSession, settings } = usePlatform();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!adminToken) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'APIs & Categories', path: '/admin/apis', icon: Cpu },
    { label: 'API Keys', path: '/admin/api-keys', icon: Key },
    { label: 'Coin Management', path: '/admin/coins', icon: Coins },
    { label: 'Transactions', path: '/admin/transactions', icon: Receipt },
    { label: 'Request Logs', path: '/admin/logs', icon: ScrollText },
    { label: 'Documentation', path: '/admin/docs', icon: BookOpen },
    { label: 'Website Settings', path: '/admin/settings', icon: Settings },
  ];

  const currentSection =
    navItems.find((i) => location.pathname.startsWith(i.path))?.label || 'Control Panel';

  return (
    <div className="min-h-screen bg-[#07070D] text-[#F3F4F8] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0D0E17] border-r border-white/[0.08] z-30">
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-white/[0.08]">
          <ButterflyLogo className="w-6 h-6" />
          <span className="font-display text-base font-bold text-white truncate">
            BESTIE Admin
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/25 to-blue-600/20 text-white border border-violet-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-violet-400 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.08] space-y-2">
          <div className="px-2 text-xs">
            <p className="font-semibold text-white truncate">{admin?.name || 'Administrator'}</p>
            <p className="font-mono text-[11px] text-slate-400 truncate">{admin?.email}</p>
          </div>
          <button
            type="button"
            onClick={logoutAdminSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out of Admin
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#0D0E17] border-r border-white/10 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <ButterflyLogo className="w-6 h-6" />
                <span className="font-display text-sm font-bold text-white">BESTIE Admin</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-violet-600/25 text-white border border-violet-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-violet-400" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Admin Top Header */}
        <header className="sticky top-0 z-20 h-16 bg-[#07070D]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="text-slate-500">Admin Console</span>
              <span aria-hidden="true">/</span>
              <span className="text-white font-semibold">{currentSection}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {settings?.maintenanceMode && (
              <span className="text-xs font-mono text-amber-400">Maintenance Active</span>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public API Portal
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
