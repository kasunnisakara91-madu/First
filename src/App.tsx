import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PlatformProvider } from './context/PlatformContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ApisPage } from './pages/ApisPage';
import { ApiDetailPage } from './pages/ApiDetailPage';
import { DocsPage } from './pages/DocsPage';
import { TesterPage } from './pages/TesterPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { AboutPage, ContactPage } from './pages/AboutContactPages';
import { AdminLoginPage, AdminDashboardPage } from './pages/admin/AdminLoginAndDashboard';
import {
  AdminUsersPage,
  AdminCoinsPage,
  AdminTransactionsPage,
} from './pages/admin/AdminUsersAndCoins';
import { AdminApisPage, AdminApiKeysPage } from './pages/admin/AdminApisAndKeys';
import {
  AdminLogsPage,
  AdminDocsPage,
  AdminSettingsPage,
} from './pages/admin/AdminLogsDocsSettings';

const AppShell: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/apis" element={<AdminApisPage />} />
        <Route path="/admin/api-keys" element={<AdminApiKeysPage />} />
        <Route path="/admin/coins" element={<AdminCoinsPage />} />
        <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
        <Route path="/admin/logs" element={<AdminLogsPage />} />
        <Route path="/admin/docs" element={<AdminDocsPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07070D] text-[#F3F4F8]">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/apis" element={<ApisPage />} />
          <Route path="/api/:slug" element={<ApiDetailPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/tester" element={<TesterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <PlatformProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </PlatformProvider>
  );
}
