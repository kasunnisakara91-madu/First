import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Ban,
  CheckCircle2,
  Trash2,
  KeyRound,
  Plus,
  Minus,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout';
import { usePlatform, UserProfile } from '../../context/PlatformContext';

export const AdminUsersPage: React.FC = () => {
  const { adminToken, notify, copyText } = usePlatform();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<{
    user: UserProfile;
    apiKeys: any[];
    transactions: any[];
    logs: any[];
  } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [coinAmount, setCoinAmount] = useState('50');

  const fetchUsers = useCallback(async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInspectUser = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedUserDetail(data);
    }
  };

  const handleToggleBan = async (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'banned' : 'active';
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      notify(
        `User ${user.username} is now ${nextStatus === 'banned' ? 'Banned' : 'Active'}`,
        'info'
      );
      fetchUsers();
      if (selectedUserDetail?.user._id === user._id) {
        handleInspectUser(user._id);
      }
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      notify(`Deleted user ${user.username}`, 'info');
      setSelectedUserDetail(null);
      fetchUsers();
    }
  };

  const handleResetKey = async (user: UserProfile) => {
    const res = await fetch(`/api/admin/users/${user._id}/reset-key`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      notify(`Reset API Key for ${user.username}: ${data.apiKey?.key}`, 'success');
      if (selectedUserDetail?.user._id === user._id) {
        handleInspectUser(user._id);
      }
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const res = await fetch(`/api/admin/users/${editingUser._id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: editUsername, email: editEmail }),
    });
    if (res.ok) {
      notify(`Updated user ${editUsername}`, 'success');
      setEditingUser(null);
      fetchUsers();
    }
  };

  const handleQuickCoinAction = async (
    userId: string,
    action: 'add' | 'remove' | 'set',
    amountVal: number
  ) => {
    const res = await fetch('/api/admin/coins', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        action,
        amount: amountVal,
        reason: `Admin user panel ${action} (${amountVal} coins)`,
      }),
    });
    if (res.ok) {
      notify(`Updated coins (${action}: ${amountVal})`, 'success');
      fetchUsers();
      if (selectedUserDetail?.user._id === userId) {
        handleInspectUser(userId);
      }
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !searchQuery.trim() ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Developer User Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Search, inspect, edit, ban/unban, reset API keys, and manage user coin balances.
            </p>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username or email..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0D0E17] border border-white/15 text-xs text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] overflow-hidden">
          {filteredUsers.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-400">No matching users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">Developer</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Coin Balance</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Coins Used</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Requests</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white block">{u.username}</span>
                        <span className="font-mono text-[11px] text-slate-400">{u.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            u.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Active' : 'Banned'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-300 tabular-nums text-right">
                        {u.coins.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 tabular-nums text-right">
                        {u.coinsUsed.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 tabular-nums text-right">
                        {u.totalRequests} ({u.successfulRequests} ok)
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleInspectUser(u._id)}
                            className="px-2.5 py-1 rounded bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View / Coins
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              setEditUsername(u.username);
                              setEditEmail(u.email);
                            }}
                            className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetKey(u)}
                            className="px-2.5 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 flex items-center gap-1"
                            title="Reset User Primary API Key"
                          >
                            <KeyRound className="w-3 h-3" />
                            Reset Key
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBan(u)}
                            className={`px-2.5 py-1 rounded flex items-center gap-1 ${
                              u.status === 'active'
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                            }`}
                          >
                            {u.status === 'active' ? (
                              <>
                                <Ban className="w-3 h-3" />
                                Ban
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Unban
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="Delete User"
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

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveEditUser}
              className="max-w-md w-full rounded-2xl bg-[#0D0E17] border border-white/15 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  Edit User: {editingUser.username}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Username</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-300 bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View User Details & Coin Controls Drawer/Modal */}
        {selectedUserDetail && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-3xl w-full rounded-2xl bg-[#0D0E17] border border-white/15 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Developer Inspector: {selectedUserDetail.user.username}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    {selectedUserDetail.user.email} · Balance:{' '}
                    <span className="text-amber-300 font-bold">
                      {selectedUserDetail.user.coins} Coins
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Coin Adjustment inside User Inspector */}
              <div className="p-4 rounded-xl bg-[#07070D] border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Adjust Coins:</span>
                  <input
                    type="number"
                    min={1}
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(e.target.value)}
                    className="w-24 px-3 py-1.5 rounded-lg bg-[#0D0E17] border border-white/15 font-mono text-xs text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickCoinAction(
                        selectedUserDetail.user._id,
                        'add',
                        Number(coinAmount) || 0
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Coins
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickCoinAction(
                        selectedUserDetail.user._id,
                        'remove',
                        Number(coinAmount) || 0
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 flex items-center gap-1"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    Remove Coins
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickCoinAction(
                        selectedUserDetail.user._id,
                        'set',
                        Number(coinAmount) || 0
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Set Balance
                  </button>
                </div>
              </div>

              {/* User API Keys */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">
                  User API Keys ({selectedUserDetail.apiKeys.length})
                </h4>
                <div className="space-y-1.5">
                  {selectedUserDetail.apiKeys.map((k: any) => (
                    <div
                      key={k._id}
                      className="p-3 rounded-lg bg-[#07070D] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white mr-2">{k.name}</span>
                        <code
                          onClick={() => copyText(k.key, 'Copied API key')}
                          className="font-mono text-violet-300 cursor-pointer"
                        >
                          {k.key}
                        </code>
                      </div>
                      <span className="font-mono text-slate-400">
                        {k.status} · {k.totalRequests} calls
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Recent Logs */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">
                  Recent API Requests ({selectedUserDetail.logs.length})
                </h4>
                <div className="max-h-48 overflow-y-auto rounded-lg bg-[#07070D] border border-white/[0.06] divide-y divide-white/[0.06] text-xs">
                  {selectedUserDetail.logs.length === 0 ? (
                    <p className="p-3 text-slate-500">No requests logged yet.</p>
                  ) : (
                    selectedUserDetail.logs.slice(0, 10).map((l: any) => (
                      <div key={l._id} className="p-2.5 flex items-center justify-between">
                        <span className="font-mono text-slate-300">
                          {l.method} {l.endpoint}
                        </span>
                        <span className="font-mono tabular-nums text-slate-400">
                          HTTP {l.statusCode} · {l.responseTime}ms · -{l.coinsUsed} Coins
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export const AdminCoinsPage: React.FC = () => {
  const { adminToken, notify } = usePlatform();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [amount, setAmount] = useState('100');
  const [reason, setReason] = useState('');

  const loadData = useCallback(async () => {
    if (!adminToken) return;
    const [uRes, tRes] = await Promise.all([
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${adminToken}` } }),
      fetch('/api/admin/transactions', { headers: { Authorization: `Bearer ${adminToken}` } }),
    ]);
    if (uRes.ok) {
      const uData = await uRes.json();
      setUsers(uData.users || []);
      if (!selectedUserId && uData.users?.length > 0) {
        setSelectedUserId(uData.users[0]._id);
      }
    }
    if (tRes.ok) {
      const tData = await tRes.json();
      setTransactions(tData.transactions || []);
    }
  }, [adminToken, selectedUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = users.filter(
    (u) =>
      !searchUser.trim() ||
      u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const activeUser =
    users.find((u) => u._id === selectedUserId) || filteredUsers[0] || users[0] || null;

  const handleCoinOperation = async (action: 'add' | 'remove' | 'set') => {
    if (!activeUser) return;
    const num = Number(amount);
    if (isNaN(num) || num < 0) {
      notify('Enter a valid non-negative coin amount', 'error');
      return;
    }

    const res = await fetch('/api/admin/coins', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: activeUser._id,
        action,
        amount: num,
        reason: reason.trim() || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      notify(
        `Updated ${activeUser.username}'s balance to ${data.user.coins} BESTIE Coins!`,
        'success'
      );
      setReason('');
      await loadData();
    } else {
      const err = await res.json();
      notify(err.error || 'Coin operation failed', 'error');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="border-b border-white/[0.08] pb-5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            BESTIE Coin Treasury & Reward Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search any developer account to add coins, remove coins, set balances, and audit coin usage.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: User Selector */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-white">1. Select Developer</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Search user by username or email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#07070D] border border-white/15 text-xs text-white"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {filteredUsers.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => setSelectedUserId(u._id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between ${
                    activeUser?._id === u._id
                      ? 'bg-violet-600/20 border-violet-500/40 text-white'
                      : 'bg-[#07070D] border-white/[0.06] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{u.username}</p>
                    <p className="text-[11px] font-mono text-slate-400">{u.email}</p>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="text-xs font-bold text-amber-300">{u.coins} Coins</span>
                    <span className="block text-[10px] text-slate-500">Used: {u.coinsUsed}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Coin Operations Panel */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-6">
            {!activeUser ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                No developer account selected.
              </p>
            ) : (
              <>
                <div className="p-5 rounded-xl bg-[#07070D] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block">Selected Developer</span>
                    <p className="font-display text-xl font-bold text-white">
                      User: {activeUser.username}
                    </p>
                    <span className="text-xs font-mono text-slate-400">{activeUser.email}</span>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-xs text-slate-400 block">Current Balance</span>
                    <p className="font-mono text-3xl font-extrabold text-amber-300 tabular-nums">
                      {activeUser.coins.toLocaleString()}
                    </p>
                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                      Lifetime Used: {activeUser.coinsUsed} · Received: {activeUser.coinsReceived}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Coin Amount
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 font-mono text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Audit Note / Reason (Optional)
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Monthly Hackathon Reward"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCoinOperation('add')}
                    className="py-3 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />+ Add Coins
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCoinOperation('remove')}
                    className="py-3 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />- Remove Coins
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCoinOperation('set')}
                    className="py-3 px-4 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Set Exact Balance
                  </button>
                </div>

                {/* User's Recent Coin Transactions */}
                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Recent Transactions for {activeUser.username}
                  </h3>
                  <div className="max-h-56 overflow-y-auto rounded-xl bg-[#07070D] border border-white/[0.06] divide-y divide-white/[0.06] text-xs">
                    {transactions
                      .filter((t) => t.userId === activeUser._id)
                      .slice(0, 15)
                      .map((tx) => (
                        <div key={tx._id} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <span className="font-mono text-violet-300 mr-2">{tx.type}</span>
                            <span className="text-slate-300">{tx.description}</span>
                          </div>
                          <div className="font-mono tabular-nums text-right shrink-0">
                            <span
                              className={
                                tx.amount >= 0
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-rose-400 font-bold'
                              }
                            >
                              {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                            </span>
                            <span className="text-slate-500 ml-2">→ {tx.balanceAfter}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export const AdminTransactionsPage: React.FC = () => {
  const { adminToken } = usePlatform();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!adminToken) return;
    fetch('/api/admin/transactions', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []));
  }, [adminToken]);

  const filtered = transactions.filter((t) => {
    const matchType = filterType === 'all' || t.type === filterType;
    const matchSearch =
      !search.trim() ||
      t.username?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Coin Transactions Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Complete platform-wide history of coin bonuses, admin grants, and API deductions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by username or description..."
              className="px-3.5 py-2 rounded-xl bg-[#0D0E17] border border-white/15 text-xs text-white"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0D0E17] border border-white/15 text-xs text-white"
            >
              <option value="all">All Types</option>
              <option value="api_usage">API Usage</option>
              <option value="bonus">Welcome Bonus</option>
              <option value="daily_reward">Daily Reward</option>
              <option value="admin_add">Admin Add</option>
              <option value="admin_remove">Admin Remove</option>
              <option value="admin_set">Admin Set</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">User</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Description</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map((tx) => (
                  <tr key={tx._id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-slate-400 tabular-nums">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{tx.username}</td>
                    <td className="py-3 px-4 font-mono text-violet-300">{tx.type}</td>
                    <td className="py-3 px-4 text-slate-300">{tx.description}</td>
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
        </div>
      </div>
    </AdminLayout>
  );
};
