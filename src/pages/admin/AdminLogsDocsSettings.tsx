import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Power,
  Save,
  RefreshCw,
  X,
} from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout';
import {
  usePlatform,
  DocumentationItem,
  APIRequestLogItem,
  WebsiteSettings,
} from '../../context/PlatformContext';

export const AdminLogsPage: React.FC = () => {
  const { adminToken } = usePlatform();
  const [logs, setLogs] = useState<APIRequestLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '2xx' | '4xx' | '5xx'>('all');

  const fetchLogs = useCallback(async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs || []);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter((l) => {
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === '2xx' && l.statusCode >= 200 && l.statusCode < 300) ||
      (statusFilter === '4xx' && l.statusCode >= 400 && l.statusCode < 500) ||
      (statusFilter === '5xx' && l.statusCode >= 500);
    const matchSearch =
      !search.trim() ||
      l.username.toLowerCase().includes(search.toLowerCase()) ||
      l.endpoint.toLowerCase().includes(search.toLowerCase()) ||
      l.apiName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Global API Request Logs
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time gateway execution audit trail across all developers and API keys.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by user or endpoint..."
                className="pl-8 pr-3 py-2 rounded-xl bg-[#0D0E17] border border-white/15 text-xs text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-[#0D0E17] border border-white/15 text-xs text-white"
            >
              <option value="all">All Status Codes</option>
              <option value="2xx">2xx Successful</option>
              <option value="4xx">4xx Client / Auth / Rate</option>
              <option value="5xx">5xx Server Error</option>
            </select>
            <button
              type="button"
              onClick={fetchLogs}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-12 text-center text-sm text-slate-400">No request logs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                    <th className="py-3.5 px-4 font-semibold">User</th>
                    <th className="py-3.5 px-4 font-semibold">API Key</th>
                    <th className="py-3.5 px-4 font-semibold">Endpoint</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Latency</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Coins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filtered.map((l) => (
                    <tr key={l._id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-slate-400 tabular-nums">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{l.username}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{l.maskedKey}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-400 mr-2">
                          {l.method}
                        </span>
                        <code className="font-mono text-slate-200">{l.endpoint}</code>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold tabular-nums text-right">
                        <span
                          className={
                            l.statusCode >= 200 && l.statusCode < 300
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {l.statusCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-blue-300">
                        {l.responseTime} ms
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-amber-300">
                        {l.coinsUsed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export const AdminDocsPage: React.FC = () => {
  const { adminToken, refreshPortal, notify } = usePlatform();
  const [docs, setDocs] = useState<DocumentationItem[]>([]);
  const [editingDoc, setEditingDoc] = useState<Partial<DocumentationItem> | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/docs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setDocs(data.docs || []);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    const isEdit = Boolean(editingDoc._id);
    const url = isEdit ? `/api/admin/docs/${editingDoc._id}` : '/api/admin/docs';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editingDoc),
    });

    if (res.ok) {
      notify(
        isEdit
          ? 'Updated documentation & synced /docs page'
          : 'Created documentation & published to /docs',
        'success'
      );
      setEditingDoc(null);
      await Promise.all([fetchDocs(), refreshPortal()]);
    }
  };

  const handleToggleDocStatus = async (doc: DocumentationItem) => {
    const nextStatus = doc.status === 'enabled' ? 'disabled' : 'enabled';
    await fetch(`/api/admin/docs/${doc._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    notify(`Documentation "${doc.apiName}" ${nextStatus}`, 'info');
    await Promise.all([fetchDocs(), refreshPortal()]);
  };

  const handleDeleteDoc = async (id: string) => {
    await fetch(`/api/admin/docs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    notify('Deleted documentation entry', 'info');
    await Promise.all([fetchDocs(), refreshPortal()]);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Documentation CMS
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage public API documentation, response examples, and multi-language SDK snippets.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditingDoc({
                apiName: '',
                apiSlug: '',
                category: 'Utility APIs',
                endpoint: '/api/v1/custom',
                method: 'GET',
                description: '',
                authentication: 'Authorization: Bearer YOUR_API_KEY',
                coinCost: 1,
                rateLimit: '60 req/min · 1000 req/day',
                responseExample: '{\n  "status": true,\n  "result": {}\n}',
                status: 'enabled',
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Documentation
          </button>
        </div>

        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">API Name</th>
                  <th className="py-3.5 px-4 font-semibold">Endpoint</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Coin Cost</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {docs.map((doc) => (
                  <tr key={doc._id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-semibold text-white">{doc.apiName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="text-emerald-400 font-bold mr-1.5">{doc.method}</span>
                      {doc.endpoint}
                    </td>
                    <td className="py-3.5 px-4 text-violet-300">{doc.category}</td>
                    <td className="py-3.5 px-4 font-mono text-amber-300">{doc.coinCost} Coins</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={
                          doc.status === 'enabled'
                            ? 'text-emerald-400 font-semibold'
                            : 'text-rose-400 font-semibold'
                        }
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingDoc(doc)}
                          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDocStatus(doc)}
                          className="px-2.5 py-1 rounded bg-white/[0.06] text-slate-300"
                        >
                          <Power className="w-3 h-3 inline mr-1" />
                          {doc.status === 'enabled' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400"
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
        </div>

        {/* Edit/Create Documentation Modal */}
        {editingDoc && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveDoc}
              className="max-w-2xl w-full rounded-2xl bg-[#0D0E17] border border-white/15 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-lg font-bold text-white">
                  {editingDoc._id ? 'Edit Documentation' : 'Create Documentation'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs text-slate-400">API Name</label>
                  <input
                    type="text"
                    required
                    value={editingDoc.apiName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, apiName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-400">Slug</label>
                  <input
                    type="text"
                    required
                    value={editingDoc.apiSlug || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, apiSlug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs text-slate-400">Method</label>
                  <select
                    value={editingDoc.method || 'GET'}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, method: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs text-slate-400">Endpoint</label>
                  <input
                    type="text"
                    required
                    value={editingDoc.endpoint || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, endpoint: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-slate-400">Description</label>
                <textarea
                  rows={2}
                  value={editingDoc.description || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-slate-400">JSON Response Example</label>
                <textarea
                  rows={5}
                  value={editingDoc.responseExample || ''}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, responseExample: e.target.value })
                  }
                  className="w-full p-3 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-emerald-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-300 bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600"
                >
                  Save Documentation
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export const AdminSettingsPage: React.FC = () => {
  const { adminToken, refreshPortal, notify } = usePlatform();
  const [form, setForm] = useState<Partial<WebsiteSettings>>({});
  const [storageMode, setStorageMode] = useState<string>('mongodb');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminToken) return;
    fetch('/api/admin/settings', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setForm(d.settings);
        if (d.storageMode) setStorageMode(d.storageMode);
      });
  }, [adminToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        notify('Saved global platform settings!', 'success');
        await refreshPortal();
      }
    } catch {
      notify('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Website & Gateway Settings
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure brand identity, coin reward economics, rate limits, and maintenance mode.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-95 cursor-pointer self-start"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

        {/* Brand & Hero Configuration */}
        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">1. Brand & Portal Hero</h2>
            <span className="text-xs font-mono text-slate-400">
              Persistence Engine: <strong className="text-emerald-400">{storageMode}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Website Name</label>
              <input
                type="text"
                value={form.websiteName || ''}
                onChange={(e) => setForm({ ...form, websiteName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Tagline</label>
              <input
                type="text"
                value={form.tagline || ''}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Hero Headline</label>
            <input
              type="text"
              value={form.heroTitle || ''}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 text-xs text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Hero Description</label>
            <textarea
              rows={2}
              value={form.heroSubtitle || ''}
              onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">API Version</label>
              <input
                type="text"
                value={form.apiVersion || 'v1'}
                onChange={(e) => setForm({ ...form, apiVersion: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs text-slate-400">Public Base URL</label>
              <input
                type="text"
                value={form.baseUrl || ''}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Coin Rewards & Rate Limits */}
        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-white">
            2. BESTIE Coin Economy & Default Rate Limits
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">New Account Bonus (Coins)</label>
              <input
                type="number"
                min={0}
                value={form.newAccountBonusCoins ?? 50}
                onChange={(e) =>
                  setForm({ ...form, newAccountBonusCoins: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-amber-300"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Daily Reward Bonus (Coins)</label>
              <input
                type="number"
                min={0}
                value={form.dailyBonusCoins ?? 15}
                onChange={(e) => setForm({ ...form, dailyBonusCoins: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-amber-300"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Default Rate Limit / Min</label>
              <input
                type="number"
                min={1}
                value={form.defaultRateLimitPerMinute ?? 60}
                onChange={(e) =>
                  setForm({ ...form, defaultRateLimitPerMinute: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Default Rate Limit / Day</label>
              <input
                type="number"
                min={1}
                value={form.defaultRateLimitPerDay ?? 1000}
                onChange={(e) =>
                  setForm({ ...form, defaultRateLimitPerDay: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Mode & Social Links */}
        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-white">
                3. Gateway Maintenance Mode & Social Links
              </h2>
              <p className="text-xs text-slate-400">
                When enabled, all <code className="font-mono">/api/v1/*</code> requests return HTTP 503 Maintenance.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.maintenanceMode)}
                onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
              />
              Enable Maintenance Mode
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">GitHub URL</label>
              <input
                type="text"
                value={form.socialLinks?.github || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    socialLinks: { ...(form.socialLinks as any), github: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Telegram URL</label>
              <input
                type="text"
                value={form.socialLinks?.telegram || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    socialLinks: { ...(form.socialLinks as any), telegram: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Discord URL</label>
              <input
                type="text"
                value={form.socialLinks?.discord || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    socialLinks: { ...(form.socialLinks as any), discord: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Support Email</label>
              <input
                type="text"
                value={form.socialLinks?.email || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    socialLinks: { ...(form.socialLinks as any), email: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white"
              />
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
};
