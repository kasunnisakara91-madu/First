import React from 'react';
import { Link } from 'react-router-dom';
import { ButterflyLogo } from './ButterflyLogo';
import { usePlatform } from '../context/PlatformContext';

export const Footer: React.FC = () => {
  const { settings } = usePlatform();

  return (
    <footer className="border-t border-white/[0.08] bg-[#07070D] text-slate-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <ButterflyLogo className="w-6 h-6" />
              <span className="font-display text-base font-bold text-white">
                {settings?.websiteName || '🦋 BESTIE API 🦋'}
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              {settings?.heroSubtitle ||
                'BESTIE API is a modern developer API platform that provides fast and easy-to-use APIs for bots, websites, applications and automation projects.'}
            </p>
            <p className="text-xs text-slate-500 pt-1">
              {settings?.tagline || 'Fast • Powerful • Developer Friendly API'}
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-white tracking-wide">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/apis" className="hover:text-white transition-colors">
                  API Directory
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-white transition-colors">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link to="/tester" className="hover:text-white transition-colors">
                  Live API Tester
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Developer Console
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-white tracking-wide">Resources & Access</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About BESTIE API
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact & Support
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Create Developer Account
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-white transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BESTIE API Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a
              href={settings?.socialLinks?.github || 'https://github.com'}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={settings?.socialLinks?.telegram || 'https://t.me'}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Telegram
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={settings?.socialLinks?.discord || 'https://discord.com'}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
