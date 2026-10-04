import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { ButterflyLogo } from '../../components/ButterflyLogo';
import { AdminLayout } from '../../components/AdminLayout';
import { usePlatform } from '../../context/PlatformContext';

export const AdminLoginPage: React.FC = () => {
  const { loginAdminSession, notify } = usePlatform();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid administrator credentials');
        return;
      }
      loginAdminSession(data.token, data.admin);
      notify('Authenticated into BESTIE Admin Control Panel', 'success');
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Unable to reach admin authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070D] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ButterflyLogo className="w-7 h-7" />
              <span className="text-xs font-semibold text-violet-300">
                BESTIE Administrator Access
              </span>
            </div>
            <Link to="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Portal
            </Link>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Control Login</h1>
          <p className="text-xs text-slate-400">
            Authenticate with your configured <code className="font-mono text-slate-300">ADMIN_EMAIL</code> and <code className="font-mono text-slate-300">ADMIN_PASSWORD</code> environment credentials.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bestieapi.dev"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Admin Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {loading ? 'Verifying Credentials...' : 'Enter Admin Control Panel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { adminToken, notify } = usePlatform();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      notify('Failed to fetch admin telemetry', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminToken, notify]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs}h ${mins}m ${s}s`;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Platform Telemetry & Real-Time Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live database metrics across users, API keys, coin circulation, and gateway latency.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchStats}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors self-start cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>

        {!stats ? (
          <div className="py-16 text-center text-sm text-slate-400">
            Loading platform statistics...
          </div>
        ) : (
          <>
            {/* 12 Real Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
                <span className="text-xs text-slate-400 block mb-1">Total Users</span>
                <p className="font-mono text-2xl font-bold text-white tabular-nums">
                  {stats.overview.totalUsers}
                </p>
                <span className="text-[11px] text-emerald-400 font-mono tabular-nums">
                  {stats.overview.activeUsers} Active · {stats.overview.bannedUsers} Banned
                </span>
              </div>

              <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
                <span className="text-xs text-slate-400 block mb-1">Total API Keys</span>
                <p className="font-mono text-2xl font-bold text-white tabular-nums">
                  {stats.overview.totalApiKeys}
                </p>
                <span className="text-[11px] text-violet-300 font-mono tabular-nums">
                  {stats.overview.activeApiKeys} Active Keys
                </span>
              </div>

              <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
                <span className="text-xs text-slate-400 block mb-1">Total API Requests</span>
                <p className="font-mono text-2xl font-bold text-white tabular-nums">
                  {stats.overview.totalRequests.toLocaleString()}
                </p>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Across {stats.overview.totalApis} Endpoints
                </span>
              </div>

              <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
                <span className="text-xs text-slate-400 block mb-1">Success / Failed Calls</span>
                <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                  {stats.overview.successfulRequests}{' '}
                  <span className="text-slate-600 text-lg">/</span>{' '}
                  <span className="text-rose-400">{stats.overview.failedRequests}</span>
                </p>
                <span className="text-[11px] text-slate-400">2xx vs 4xx/5xx</span>
              </div>

              <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
                <span className="text-xs text-slate-400 block mb-1">Total Coins Used</span>
                <p className="font-mono text-2xl font-bold text-amber-300 tabular-nums">
                  {stats.overview.totalCoinsUsed.toLocaleString()}
                </p>
                <span className="text-[11px] text-slate-500">Consumed by API calls</span>
              </div>

              <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
                <span className="text-xs text-slate-400 block mb-1">Total Coins Distributed</span>
                <p className="font-mono text-2xl font-bold text-pink-400 tabular-nums">
                  {stats.overview.totalCoinsDistributed.toLocaleString()}
                </p>
                <span className="text-[11px] text-slate-500">Bonuses & admin grants</span>
              </div>

              <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
                <span className="text-xs text-slate-400 block mb-1">Average Response Time</span>
                <p className="font-mono text-2xl font-bold text-blue-400 tabular-nums">
                  {stats.overview.avgResponseTime} ms
                </p>
                <span className="text-[11px] text-slate-500">Gateway execution mean</span>
              </div>

              <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
                <span className="text-xs text-slate-400 block mb-1">Server Uptime</span>
                <p className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
                  {formatUptime(stats.overview.serverUptimeSeconds)}
                </p>
                <span className="text-[11px] text-slate-500 font-mono">
                  DB: {stats.overview.storageMode}
                </span>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Requests & Success/Fail Per Day */}
              <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Requests Per Day (Success vs Failed)
                  </h2>
                  <p className="text-xs text-slate-400">7-day request traffic breakdown</p>
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.charts.requestsPerDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D0E17',
                          borderColor: 'rgba(255,255,255,0.12)',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="success"
                        name="Successful"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.2}
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        name="Failed"
                        stroke="#F43F5E"
                        fill="#F43F5E"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Coin Usage & User Growth */}
              <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Daily Coin Consumption & User Growth
                  </h2>
                  <p className="text-xs text-slate-400">
                    Coins spent per day alongside cumulative registered developers
                  </p>
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.charts.requestsPerDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D0E17',
                          borderColor: 'rgba(255,255,255,0.12)',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="coinsUsed"
                        name="Coins Used"
                        stroke="#F59E0B"
                        fill="#F59E0B"
                        fillOpacity={0.25}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: API Usage by Endpoint */}
              <div className="lg:col-span-2 rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    API Usage by Endpoint
                  </h2>
                  <p className="text-xs text-slate-400">
                    Total execution calls per registered API endpoint
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.charts.apiUsage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="slug" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D0E17',
                          borderColor: 'rgba(255,255,255,0.12)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="calls" name="Total Calls" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
