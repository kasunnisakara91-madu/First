import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Key,
  Copy,
  RefreshCw,
  Power,
  Trash2,
  Gift,
  Plus,
  FlaskConical,
  LogOut,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { usePlatform } from '../context/PlatformContext';

export const DashboardPage: React.FC = () => {
  const {
    userToken,
    user,
    userKeys,
    userTransactions,
    userLogs,
    userUsageByDay,
    refreshUserDashboard,
    logoutUserSession,
    copyText,
    notify,
  } = usePlatform();

  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'logs' | 'transactions'>('keys');

  if (!userToken) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm text-slate-400">
        Loading developer workspace...
      </div>
    );
  }

  const handleClaimDailyBonus = async () => {
    setClaimingBonus(true);
    try {
      const res = await fetch('/api/user/daily-bonus', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        notify(data.message || 'Daily bonus claimed!', 'success');
        await refreshUserDashboard();
      } else {
        notify(data.error || 'Daily bonus unavailable', 'error');
      }
    } catch {
      notify('Error claiming daily bonus', 'error');
    } finally {
      setClaimingBonus(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingKey(true);
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKeyName('');
        notify('Generated new Bearer API Key!', 'success');
        await refreshUserDashboard();
      } else {
        notify(data.error || 'Could not generate API key', 'error');
      }
    } catch {
      notify('Failed to generate API key', 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRegenerateKey = async (id: string) => {
    const res = await fetch(`/api/user/api-keys/${id}/regenerate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (res.ok) {
      notify('Regenerated API Key secret!', 'success');
      await refreshUserDashboard();
    } else {
      notify('Failed to regenerate key', 'error');
    }
  };

  const handleToggleKeyStatus = async (id: string, nextStatus: 'active' | 'disabled' | 'revoked') => {
    const res = await fetch(`/api/user/api-keys/${id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      notify(`API key marked as ${nextStatus}`, 'info');
      await refreshUserDashboard();
    }
  };

  const handleDeleteKey = async (id: string) => {
    const res = await fetch(`/api/user/api-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (res.ok) {
      notify('Deleted API key', 'info');
      await refreshUserDashboard();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top User Profile & Daily Reward Bar */}
      <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-violet-300 font-semibold">Developer Console</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{user.email}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Status: Active</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Welcome, {user.username}
          </h1>
          <p className="text-xs text-slate-400">
            Manage your Bearer API keys, monitor BESTIE Coin usage, and inspect real-time request logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!user.canClaimDailyBonus || claimingBonus}
            onClick={handleClaimDailyBonus}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              user.canClaimDailyBonus
                ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white hover:opacity-95'
                : 'bg-white/[0.05] text-slate-500 border border-white/[0.06] cursor-not-allowed'
            }`}
          >
            <Gift className="w-4 h-4" />
            {user.canClaimDailyBonus
              ? `Claim Daily Bonus (+${user.dailyBonusAmount ?? 15} Coins)`
              : 'Daily Bonus Claimed Today'}
          </button>

          <Link
            to="/tester"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors whitespace-nowrap"
          >
            <FlaskConical className="w-4 h-4" />
            Open API Tester
          </Link>

          <button
            type="button"
            onClick={logoutUserSession}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* 6 Core Telemetry Cards (Coins & Requests) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
          <span className="text-xs text-slate-400 block mb-1">Current Balance</span>
          <p className="font-mono text-2xl font-bold text-amber-300 tabular-nums">
            {user.coins.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500">BESTIE Coins</span>
        </div>

        <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
          <span className="text-xs text-slate-400 block mb-1">Coins Used</span>
          <p className="font-mono text-2xl font-bold text-white tabular-nums">
            {user.coinsUsed.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500">Lifetime spent</span>
        </div>

        <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
          <span className="text-xs text-slate-400 block mb-1">Coins Received</span>
          <p className="font-mono text-2xl font-bold text-violet-300 tabular-nums">
            {user.coinsReceived.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500">Rewards & credits</span>
        </div>

        <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
          <span className="text-xs text-slate-400 block mb-1">Total Requests</span>
          <p className="font-mono text-2xl font-bold text-white tabular-nums">
            {user.totalRequests.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500">All endpoints</span>
        </div>

        <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
          <span className="text-xs text-slate-400 block mb-1">Successful (2xx)</span>
          <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {user.successfulRequests.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500">Completed calls</span>
        </div>

        <div className="p-5 rounded-xl bg-[#0D0E17] border border-white/[0.08]">
          <span className="text-xs text-slate-400 block mb-1">Failed (4xx/5xx)</span>
          <p className="font-mono text-2xl font-bold text-rose-400 tabular-nums">
            {user.failedRequests.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500">Rejected / Errors</span>
        </div>
      </div>

      {/* 7-Day API Usage & Coin Activity Chart */}
      <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              7-Day API Usage & Coin Consumption
            </h2>
            <p className="text-xs text-slate-400">
              Real request volume and BESTIE Coins spent over the last 7 days.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            Active Keys: {userKeys.filter((k) => k.status === 'active').length}
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={userUsageByDay}>
              <defs>
                <linearGradient id="userReqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="userCoinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D0E17',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="requests"
                name="API Requests"
                stroke="#7C3AED"
                fillOpacity={1}
                fill="url(#userReqGrad)"
              />
              <Area
                type="monotone"
                dataKey="coins"
                name="Coins Spent"
                stroke="#EC4899"
                fillOpacity={1}
                fill="url(#userCoinGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Section Switcher: API Keys, Recent Requests, Coin Transactions */}
      <div className="space-y-6">
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0D0E17] border border-white/[0.08] rounded-xl self-start w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'keys'
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            API Keys ({userKeys.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Recent Request Logs ({userLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'transactions'
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Coin Transaction History ({userTransactions.length})
          </button>
        </div>

        {/* TAB 1: API KEYS */}
        {activeTab === 'keys' && (
          <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Bearer API Key Management
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pass keys via <code className="font-mono text-violet-300">Authorization: Bearer YOUR_API_KEY</code>
                </p>
              </div>

              <form onSubmit={handleCreateApiKey} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key label (e.g. Telegram Bot)"
                  className="px-3.5 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={creatingKey}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Generate API Key
                </button>
              </form>
            </div>

            {userKeys.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No API keys found. Generate your first API key above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400">
                      <th className="py-3 px-4 font-semibold">Label</th>
                      <th className="py-3 px-4 font-semibold">Secret API Key</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Requests</th>
                      <th className="py-3 px-4 font-semibold">Last Used</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {userKeys.map((k) => (
                      <tr key={k._id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-semibold text-white">{k.name}</td>
                        <td className="py-3.5 px-4 font-mono text-violet-300">
                          <div className="flex items-center gap-2">
                            <span className="select-all">{k.key}</span>
                            <button
                              type="button"
                              onClick={() => copyText(k.key, `Copied API key: ${k.name}`)}
                              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white"
                              title="Copy API Key"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-semibold ${
                              k.status === 'active'
                                ? 'text-emerald-400'
                                : k.status === 'disabled'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {k.status === 'active'
                              ? 'Active'
                              : k.status === 'disabled'
                              ? 'Disabled'
                              : 'Revoked'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right text-slate-200">
                          {k.totalRequests}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRegenerateKey(k._id)}
                              className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 flex items-center gap-1"
                              title="Regenerate Secret Key"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Regenerate
                            </button>

                            {k.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => handleToggleKeyStatus(k._id, 'disabled')}
                                className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 flex items-center gap-1"
                              >
                                <Power className="w-3 h-3" />
                                Disable
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleKeyStatus(k._id, 'active')}
                                className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 flex items-center gap-1"
                              >
                                <Power className="w-3 h-3" />
                                Enable
                              </button>
                            )}

                            {k.status !== 'revoked' && (
                              <button
                                type="button"
                                onClick={() => handleToggleKeyStatus(k._id, 'revoked')}
                                className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300"
                              >
                                Revoke
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteKey(k._id)}
                              className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                              title="Delete Key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: USER API REQUEST LOGS */}
        {activeTab === 'logs' && (
          <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-white">Your API Request Logs</h3>
              <p className="text-xs text-slate-400">
                Real-time history of API requests executed with your keys.
              </p>
            </div>

            {userLogs.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-slate-400">No API requests logged yet.</p>
                <Link
                  to="/tester"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600"
                >
                  Run Your First Request in API Tester
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400">
                      <th className="py-3 px-4 font-semibold">Timestamp</th>
                      <th className="py-3 px-4 font-semibold">API Endpoint</th>
                      <th className="py-3 px-4 font-semibold">Method</th>
                      <th className="py-3 px-4 font-semibold">API Key</th>
                      <th className="py-3 px-4 font-semibold text-right">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Latency</th>
                      <th className="py-3 px-4 font-semibold text-right">Coins Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {userLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono text-slate-400 tabular-nums">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block">{log.apiName}</span>
                          <code className="font-mono text-[11px] text-slate-400">
                            {log.endpoint}
                          </code>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {log.method}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{log.maskedKey}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right">
                          <span
                            className={
                              log.statusCode >= 200 && log.statusCode < 300
                                ? 'text-emerald-400 font-bold'
                                : 'text-rose-400 font-bold'
                            }
                          >
                            {log.statusCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right text-blue-300">
                          {log.responseTime} ms
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right text-amber-300">
                          {log.coinsUsed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COIN TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                BESTIE Coin Ledger & History
              </h3>
              <p className="text-xs text-slate-400">
                Complete audit trail of welcome bonuses, daily rewards, admin adjustments, and API usage deductions.
              </p>
            </div>

            {userTransactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No coin transactions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400">
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {userTransactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono text-slate-400 tabular-nums">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-violet-300">{tx.type}</td>
                        <td className="py-3 px-4 text-slate-200">{tx.description}</td>
                        <td
                          className={`py-3 px-4 font-mono font-bold tabular-nums text-right ${
                            tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right text-amber-300">
                          {tx.balanceAfter}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
