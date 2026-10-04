import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Power,
  Edit3,
  Copy,
  RefreshCw,
  Code2,
  FolderKanban,
  X,
} from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout';
import {
  usePlatform,
  APIEndpoint,
  APIParameter,
  CategoryItem,
  APIKeyItem,
} from '../../context/PlatformContext';

export const AdminApisPage: React.FC = () => {
  const { adminToken, refreshPortal, notify } = usePlatform();
  const [apis, setApis] = useState<APIEndpoint[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'apis' | 'categories'>('apis');

  // API Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApiId, setEditingApiId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formEndpoint, setFormEndpoint] = useState('/api/v1/');
  const [formMethod, setFormMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('utility');
  const [formCoinCost, setFormCoinCost] = useState('1');
  const [formRateMin, setFormRateMin] = useState('60');
  const [formRateDay, setFormRateDay] = useState('1000');
  const [formStatus, setFormStatus] = useState<'active' | 'disabled' | 'maintenance'>('active');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPopular, setFormPopular] = useState(false);
  const [formHandlerType, setFormHandlerType] = useState<'builtin' | 'script' | 'proxy'>('script');
  const [formBuiltinHandler, setFormBuiltinHandler] = useState('music-search');
  const [formCustomScript, setFormCustomScript] = useState(
    `// Working Node.js API Script Handler\n// Available in context: { query, body, params, headers, fetch, crypto, dns, Buffer, URL, env }\nconst q = params.query || "default";\nreturn {\n  receivedQuery: q,\n  executedBy: "BESTIE Custom Script Engine",\n  timestamp: new Date().toISOString()\n};`
  );
  const [formProxyUrl, setFormProxyUrl] = useState('');
  const [formParams, setFormParams] = useState<APIParameter[]>([]);

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catOrder, setCatOrder] = useState('7');

  const fetchAdminApisAndCats = useCallback(async () => {
    if (!adminToken) return;
    const [aRes, cRes] = await Promise.all([
      fetch('/api/admin/apis', { headers: { Authorization: `Bearer ${adminToken}` } }),
      fetch('/api/admin/categories', { headers: { Authorization: `Bearer ${adminToken}` } }),
    ]);
    if (aRes.ok) {
      const aData = await aRes.json();
      setApis(aData.apis || []);
    }
    if (cRes.ok) {
      const cData = await cRes.json();
      setCategories(cData.categories || []);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchAdminApisAndCats();
  }, [fetchAdminApisAndCats]);

  const openCreateModal = () => {
    setEditingApiId(null);
    setFormName('');
    setFormSlug('');
    setFormEndpoint('/api/v1/custom/my-endpoint');
    setFormMethod('GET');
    setFormDescription('');
    setFormCategory(categories[0]?.slug || 'utility');
    setFormCoinCost('2');
    setFormRateMin('60');
    setFormRateDay('1000');
    setFormStatus('active');
    setFormFeatured(true);
    setFormPopular(false);
    setFormHandlerType('script');
    setFormCustomScript(
      `// Working Node.js API Script Handler\n// Available in context: { query, body, params, headers, fetch, crypto, dns, Buffer, URL, env }\nconst q = params.query || "hello";\nreturn {\n  query: q,\n  processedAt: new Date().toISOString()\n};`
    );
    setFormProxyUrl('');
    setFormParams([
      {
        name: 'query',
        location: 'query',
        type: 'string',
        required: true,
        defaultValue: 'hello',
        description: 'Input query parameter',
      },
    ]);
    setModalOpen(true);
  };

  const openEditModal = (api: APIEndpoint) => {
    setEditingApiId(api._id);
    setFormName(api.name);
    setFormSlug(api.slug);
    setFormEndpoint(api.endpoint);
    setFormMethod(api.method);
    setFormDescription(api.description);
    setFormCategory(api.category);
    setFormCoinCost(String(api.coinCost));
    setFormRateMin(String(api.rateLimitPerMinute));
    setFormRateDay(String(api.rateLimitPerDay));
    setFormStatus(api.status);
    setFormFeatured(Boolean(api.featured));
    setFormPopular(Boolean(api.popular));
    setFormHandlerType(api.handlerType || 'builtin');
    setFormBuiltinHandler(api.builtinHandler || api.slug);
    setFormCustomScript(
      api.customScript ||
        `// Working Node.js API Script Handler\nreturn { query: params.query };`
    );
    setFormProxyUrl(api.proxyUrl || '');
    setFormParams(api.parameters || []);
    setModalOpen(true);
  };

  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      slug: formSlug,
      endpoint: formEndpoint,
      method: formMethod,
      description: formDescription,
      category: formCategory,
      coinCost: Number(formCoinCost),
      rateLimitPerMinute: Number(formRateMin),
      rateLimitPerDay: Number(formRateDay),
      status: formStatus,
      featured: formFeatured,
      popular: formPopular,
      handlerType: formHandlerType,
      builtinHandler: formBuiltinHandler,
      customScript: formCustomScript,
      proxyUrl: formProxyUrl,
      parameters: formParams,
    };

    const url = editingApiId ? `/api/admin/apis/${editingApiId}` : '/api/admin/apis';
    const method = editingApiId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      notify(
        editingApiId
          ? `Updated API "${formName}" & synced public portal`
          : `Created API "${formName}" & published to portal`,
        'success'
      );
      setModalOpen(false);
      await Promise.all([fetchAdminApisAndCats(), refreshPortal()]);
    } else {
      const err = await res.json();
      notify(err.error || 'Failed to save API endpoint', 'error');
    }
  };

  const handleToggleApiStatus = async (api: APIEndpoint) => {
    const nextStatus = api.status === 'active' ? 'disabled' : 'active';
    const res = await fetch(`/api/admin/apis/${api._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      notify(`API "${api.name}" is now ${nextStatus}`, 'info');
      await Promise.all([fetchAdminApisAndCats(), refreshPortal()]);
    }
  };

  const handleDeleteApi = async (api: APIEndpoint) => {
    const res = await fetch(`/api/admin/apis/${api._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      notify(`Deleted API "${api.name}"`, 'info');
      await Promise.all([fetchAdminApisAndCats(), refreshPortal()]);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: catName,
        slug: catSlug,
        description: catDesc,
        order: Number(catOrder) || 1,
      }),
    });
    if (res.ok) {
      notify(`Added category "${catName}"`, 'success');
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      await Promise.all([fetchAdminApisAndCats(), refreshPortal()]);
    }
  };

  const handleToggleCategory = async (cat: CategoryItem) => {
    const next = cat.status === 'active' ? 'disabled' : 'active';
    await fetch(`/api/admin/categories/${cat._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: next }),
    });
    await Promise.all([fetchAdminApisAndCats(), refreshPortal()]);
  };

  const handleDeleteCategory = async (id: string) => {
    await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await Promise.all([fetchAdminApisAndCats(), refreshPortal()]);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              API Endpoints, Custom Scripts & Categories
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Add new APIs, integrate working Node.js scripts, configure coin costs, and manage rate limits.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0D0E17] border border-white/10">
              <button
                type="button"
                onClick={() => setActiveSubTab('apis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSubTab === 'apis'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                APIs ({apis.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('categories')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeSubTab === 'categories'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                Categories ({categories.length})
              </button>
            </div>

            {activeSubTab === 'apis' && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-95 transition-opacity cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add New API / Script
              </button>
            )}
          </div>
        </div>

        {/* SUB-TAB 1: API ENDPOINTS */}
        {activeSubTab === 'apis' && (
          <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">API Name & Endpoint</th>
                    <th className="py-3.5 px-4 font-semibold">Category</th>
                    <th className="py-3.5 px-4 font-semibold">Handler</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Coin Cost</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Rate Limit</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {apis.map((api) => (
                    <tr key={api._id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">{api.method}</span>
                          <span className="font-semibold text-white">{api.name}</span>
                        </div>
                        <code className="font-mono text-[11px] text-slate-400">{api.endpoint}</code>
                      </td>
                      <td className="py-3.5 px-4 text-violet-300">{api.categoryName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{api.handlerType}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-300 tabular-nums text-right">
                        {api.coinCost} Coins
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 tabular-nums text-right">
                        {api.rateLimitPerMinute}/m · {api.rateLimitPerDay}/d
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            api.status === 'active'
                              ? 'text-emerald-400'
                              : api.status === 'maintenance'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {api.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(api)}
                            className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleApiStatus(api)}
                            className={`px-2.5 py-1 rounded flex items-center gap-1 ${
                              api.status === 'active'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-emerald-500/15 text-emerald-300'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            {api.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteApi(api)}
                            className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
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
        )}

        {/* SUB-TAB 2: CATEGORIES MANAGER */}
        {activeSubTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleCreateCategory}
              className="lg:col-span-4 rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-4 h-fit"
            >
              <h2 className="font-display text-base font-bold text-white">Add API Category</h2>
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Category Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    setCatSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/apis?/gi, '')
                        .trim()
                        .replace(/[^a-z0-9]+/g, '-')
                    );
                  }}
                  placeholder="Social Media APIs"
                  className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Slug</label>
                <input
                  type="text"
                  required
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="social"
                  className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Endpoints for social profiles and media..."
                  className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 cursor-pointer"
              >
                Create Category
              </button>
            </form>

            <div className="lg:col-span-8 rounded-2xl bg-[#0D0E17] border border-white/[0.08] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">Category</th>
                    <th className="py-3.5 px-4 font-semibold">Slug</th>
                    <th className="py-3.5 px-4 font-semibold">Description</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {categories.map((cat) => (
                    <tr key={cat._id}>
                      <td className="py-3.5 px-4 font-semibold text-white">{cat.name}</td>
                      <td className="py-3.5 px-4 font-mono text-violet-300">{cat.slug}</td>
                      <td className="py-3.5 px-4 text-slate-400">{cat.description}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={
                            cat.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {cat.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(cat)}
                            className="px-2.5 py-1 rounded bg-white/[0.06] text-slate-200"
                          >
                            {cat.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat._id)}
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
        )}

        {/* CREATE / EDIT API MODAL (With Custom Working Script Integration) */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveApi}
              className="max-w-3xl w-full rounded-2xl bg-[#0D0E17] border border-white/15 p-6 space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    {editingApiId ? 'Edit API Endpoint' : 'Create & Integrate API Endpoint'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Automatically adds API key authentication, coin deduction, rate limiting, and request logging.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs text-slate-300">API Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!editingApiId) {
                        const s = e.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, '-');
                        setFormSlug(s);
                        setFormEndpoint(`/api/v1/${formCategory}/${s}`);
                      }
                    }}
                    placeholder="YouTube Audio Info API"
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-300">Slug</label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="yt-audio-info"
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs text-slate-300">HTTP Method</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs text-slate-300">Endpoint Route</label>
                  <input
                    type="text"
                    required
                    value={formEndpoint}
                    onChange={(e) => setFormEndpoint(e.target.value)}
                    placeholder="/api/v1/music/search"
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-slate-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-slate-300">Description</label>
                <textarea
                  rows={2}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs text-slate-300">Coin Cost / Call</label>
                  <input
                    type="number"
                    min={0}
                    value={formCoinCost}
                    onChange={(e) => setFormCoinCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-amber-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-300">Rate Limit / Min</label>
                  <input
                    type="number"
                    min={1}
                    value={formRateMin}
                    onChange={(e) => setFormRateMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-300">Rate Limit / Day</label>
                  <input
                    type="number"
                    min={1}
                    value={formRateDay}
                    onChange={(e) => setFormRateDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 font-mono text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-300">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#07070D] border border-white/15 text-xs text-white"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                  />
                  Show in Featured APIs
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                  />
                  Mark as Popular API
                </label>
              </div>

              {/* Execution Engine Mode */}
              <div className="p-4 rounded-xl bg-[#07070D] border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-violet-400" />
                    Backend Execution Engine
                  </span>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D0E17] border border-white/10">
                    {(['script', 'proxy', 'builtin'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormHandlerType(t)}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          formHandlerType === t
                            ? 'bg-violet-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t === 'script'
                          ? 'Custom Node.js Script'
                          : t === 'proxy'
                          ? 'Upstream Proxy URL'
                          : 'Built-in Service'}
                      </button>
                    ))}
                  </div>
                </div>

                {formHandlerType === 'script' && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-400">
                      Paste your working async JavaScript/Node.js function body. You have direct access to{' '}
                      <code className="font-mono text-violet-300">
                        query, body, params, headers, fetch, crypto, dns, Buffer, URL, env
                      </code>
                      .
                    </p>
                    <textarea
                      rows={6}
                      value={formCustomScript}
                      onChange={(e) => setFormCustomScript(e.target.value)}
                      className="w-full p-3 rounded-lg bg-[#0D0E17] border border-white/15 font-mono text-xs text-emerald-300"
                    />
                  </div>
                )}

                {formHandlerType === 'proxy' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-400">
                      Target Upstream API URL (Query & Body parameters are forwarded automatically)
                    </label>
                    <input
                      type="url"
                      value={formProxyUrl}
                      onChange={(e) => setFormProxyUrl(e.target.value)}
                      placeholder="https://api.external-service.com/v1/lookup"
                      className="w-full px-3 py-2 rounded-lg bg-[#0D0E17] border border-white/15 font-mono text-xs text-white"
                    />
                  </div>
                )}

                {formHandlerType === 'builtin' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-400">Select Built-In Handler</label>
                    <select
                      value={formBuiltinHandler}
                      onChange={(e) => setFormBuiltinHandler(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0D0E17] border border-white/15 font-mono text-xs text-white"
                    >
                      <option value="music-search">music-search (iTunes Track & Preview)</option>
                      <option value="music-lyrics">music-lyrics (Synced Song Lyrics)</option>
                      <option value="wiki-search">wiki-search (Wikipedia Knowledge)</option>
                      <option value="github-search">github-search (GitHub Repositories)</option>
                      <option value="github-release">github-release (GitHub Release Assets)</option>
                      <option value="qrcode-gen">qrcode-gen (QR SVG/PNG Generator)</option>
                      <option value="ai-generate">ai-generate (Gemini 3.8 Flash AI)</option>
                      <option value="crypto-utility">crypto-utility (SHA/HMAC/UUID Engine)</option>
                      <option value="web-inspect">web-inspect (Live DNS & HTTP Inspector)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Parameters Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Endpoint Parameters ({formParams.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormParams((prev) => [
                        ...prev,
                        {
                          name: '',
                          location: formMethod === 'GET' ? 'query' : 'body',
                          type: 'string',
                          required: true,
                          defaultValue: '',
                          description: '',
                        },
                      ])
                    }
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Parameter
                  </button>
                </div>

                {formParams.map((p, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-2.5 rounded-lg bg-[#07070D] border border-white/10 items-center"
                  >
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const next = [...formParams];
                        next[idx].name = e.target.value;
                        setFormParams(next);
                      }}
                      placeholder="name"
                      className="px-2.5 py-1.5 rounded bg-[#0D0E17] border border-white/10 font-mono text-xs text-white"
                    />
                    <select
                      value={p.location}
                      onChange={(e) => {
                        const next = [...formParams];
                        next[idx].location = e.target.value as any;
                        setFormParams(next);
                      }}
                      className="px-2 py-1.5 rounded bg-[#0D0E17] border border-white/10 text-xs text-white"
                    >
                      <option value="query">query</option>
                      <option value="body">body</option>
                    </select>
                    <input
                      type="text"
                      value={p.defaultValue || ''}
                      onChange={(e) => {
                        const next = [...formParams];
                        next[idx].defaultValue = e.target.value;
                        setFormParams(next);
                      }}
                      placeholder="default val"
                      className="px-2.5 py-1.5 rounded bg-[#0D0E17] border border-white/10 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={p.description}
                      onChange={(e) => {
                        const next = [...formParams];
                        next[idx].description = e.target.value;
                        setFormParams(next);
                      }}
                      placeholder="description"
                      className="sm:col-span-2 px-2.5 py-1.5 rounded bg-[#0D0E17] border border-white/10 text-xs text-white"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] text-slate-400 flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={p.required}
                          onChange={(e) => {
                            const next = [...formParams];
                            next[idx].required = e.target.checked;
                            setFormParams(next);
                          }}
                        />
                        Req
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormParams((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 cursor-pointer"
                >
                  {editingApiId ? 'Save Changes' : 'Publish API Endpoint'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export const AdminApiKeysPage: React.FC = () => {
  const { adminToken, copyText, notify } = usePlatform();
  const [keys, setKeys] = useState<APIKeyItem[]>([]);
  const [search, setSearch] = useState('');

  const fetchKeys = useCallback(async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/api-keys', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setKeys(data.apiKeys || []);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleUpdateKey = async (id: string, body: any, msg: string) => {
    const res = await fetch(`/api/admin/api-keys/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      notify(msg, 'success');
      fetchKeys();
    }
  };

  const handleDeleteKey = async (id: string) => {
    const res = await fetch(`/api/admin/api-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      notify('Deleted API key', 'info');
      fetchKeys();
    }
  };

  const filtered = keys.filter(
    (k) =>
      !search.trim() ||
      k.username.toLowerCase().includes(search.toLowerCase()) ||
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Platform Bearer API Keys
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitor, enable, disable, revoke, or regenerate developer API keys across all accounts.
            </p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, key name, or token..."
            className="px-3.5 py-2 rounded-xl bg-[#0D0E17] border border-white/15 text-xs text-white min-w-[260px]"
          />
        </div>

        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Owner</th>
                  <th className="py-3.5 px-4 font-semibold">Key Label</th>
                  <th className="py-3.5 px-4 font-semibold">Bearer Token</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total Calls</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map((k) => (
                  <tr key={k._id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-semibold text-white">{k.username}</td>
                    <td className="py-3.5 px-4 text-slate-300">{k.name}</td>
                    <td className="py-3.5 px-4 font-mono text-violet-300">
                      <div className="flex items-center gap-2">
                        <span>{k.key}</span>
                        <button
                          type="button"
                          onClick={() => copyText(k.key, 'Copied API key')}
                          className="p-1 text-slate-400 hover:text-white"
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
                        {k.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-right text-slate-200">
                      {k.totalRequests}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateKey(k._id, { regenerate: true }, 'Regenerated API key')
                          }
                          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Rotate
                        </button>
                        {k.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateKey(k._id, { status: 'disabled' }, 'Disabled API key')
                            }
                            className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300"
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateKey(k._id, { status: 'active' }, 'Enabled API key')
                            }
                            className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300"
                          >
                            Enable
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k._id)}
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
      </div>
    </AdminLayout>
  );
};
