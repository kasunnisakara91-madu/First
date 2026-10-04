import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export const Navbar: React.FC = () => {
  const { settings, user, admin } = usePlatform();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Explore APIs', path: '/apis' },
    { label: 'Documentation', path: '/docs' },
    { label: 'API Tester', path: '/tester' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-40 w-full bg-[#07070D]/90 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element Brand wordmark */}
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-white hover:text-violet-300 transition-colors whitespace-nowrap shrink-0"
        >
          {settings?.websiteName || '🦋 BESTIE API 🦋'}
        </Link>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                isActive(item.path)
                  ? 'text-white border-violet-500'
                  : 'text-slate-400 border-transparent hover:text-white hover:border-white/30'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 rounded-lg hover:from-violet-500 hover:to-blue-500 transition-colors whitespace-nowrap shrink-0"
              >
                Dashboard ({user.coins} Coins)
              </Link>
              {admin && (
                <Link
                  to="/admin/dashboard"
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Admin Panel
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
              >
                Get API Key
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0D0E17] border-b border-white/10 px-4 pt-3 pb-5 space-y-3">
          <div className="flex flex-col space-y-1.5">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(item.path)
                    ? 'bg-violet-600/15 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 rounded-lg"
              >
                Developer Dashboard ({user.coins} Coins)
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-4 py-2.5 text-sm font-medium text-slate-200 border border-white/15 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 rounded-lg"
                >
                  Get API Key
                </Link>
              </div>
            )}
            <Link
              to={admin ? '/admin/dashboard' : '/admin/login'}
              onClick={() => setMobileOpen(false)}
              className="text-center px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              {admin ? 'Open Admin Control Panel' : 'Administrator Login'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
