import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, Copy, Key, Clock, Coins, Plus, Trash2 } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export const TesterPage: React.FC = () => {
  const { apis, user, userKeys, refreshUserDashboard, refreshPortal, copyText, notify } =
    usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSlug = searchParams.get('api') || apis[0]?.slug || '';
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [customParams, setCustomParams] = useState<Array<{ key: string; value: string }>>([]);

  const [sending, setSending] = useState(false);
  const [responseState, setResponseState] = useState<{
    statusCode: number | null;
    responseTimeMs: number | null;
    coinsUsed: string | null;
    coinsRemaining: string | null;
    rateLimitRemaining: string | null;
    body: any;
  }>({
    statusCode: null,
    responseTimeMs: null,
    coinsUsed: null,
    coinsRemaining: null,
    rateLimitRemaining: null,
    body: null,
  });

  const selectedApi = apis.find((a) => a.slug === selectedSlug) || apis[0] || null;

  // Populate default API key from logged-in user's active keys
  useEffect(() => {
    const activeKey = userKeys.find((k) => k.status === 'active');
    if (activeKey && !apiKeyInput) {
      setApiKeyInput(activeKey.key);
    }
  }, [userKeys, apiKeyInput]);

  // Populate default parameter values when selected API changes
  useEffect(() => {
    if (selectedApi) {
      const defaults: Record<string, string> = {};
      (selectedApi.parameters || []).forEach((p) => {
        defaults[p.name] = p.defaultValue || '';
      });
      setParamValues(defaults);
      setResponseState({
        statusCode: null,
        responseTimeMs: null,
        coinsUsed: null,
        coinsRemaining: null,
        rateLimitRemaining: null,
        body: null,
      });
    }
  }, [selectedApi?._id]);

  const handleApiChange = (slug: string) => {
    setSelectedSlug(slug);
    setSearchParams({ api: slug });
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApi) return;

    if (!apiKeyInput.trim()) {
      notify('Please select or enter a Bearer API Key before sending the request.', 'error');
      return;
    }

    setSending(true);
    const clientStart = performance.now();

    try {
      const queryObj = new URLSearchParams();
      const bodyObj: Record<string, any> = {};

      // Process defined parameters
      for (const param of selectedApi.parameters || []) {
        const val = paramValues[param.name];
        if (val !== undefined && val !== '') {
          if (selectedApi.method === 'GET' || param.location === 'query') {
            queryObj.set(param.name, val);
          } else {
            bodyObj[param.name] = param.type === 'number' ? Number(val) : val;
          }
        }
      }

      // Process custom extra parameters
      for (const cp of customParams) {
        if (cp.key.trim()) {
          if (selectedApi.method === 'GET') {
            queryObj.set(cp.key.trim(), cp.value);
          } else {
            bodyObj[cp.key.trim()] = cp.value;
          }
        }
      }

      const qs = queryObj.toString();
      const targetUrl = `${selectedApi.endpoint}${qs ? `?${qs}` : ''}`;

      const res = await fetch(targetUrl, {
        method: selectedApi.method,
        headers: {
          Authorization: `Bearer ${apiKeyInput.trim()}`,
          ...(selectedApi.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(selectedApi.method !== 'GET' ? { body: JSON.stringify(bodyObj) } : {}),
      });

      const elapsed = Math.round(performance.now() - clientStart);
      const headerLatency = res.headers.get('X-Response-Time');
      const serverMs = headerLatency ? parseInt(headerLatency, 10) : elapsed;

      const data = await res.json();

      setResponseState({
        statusCode: res.status,
        responseTimeMs: serverMs || elapsed,
        coinsUsed: res.headers.get('X-Bestie-Coins-Used'),
        coinsRemaining: res.headers.get('X-Bestie-Coins-Remaining'),
        rateLimitRemaining: res.headers.get('X-RateLimit-Remaining-Minute'),
        body: data,
      });

      if (res.ok) {
        notify(`200 OK · Executed ${selectedApi.name} in ${serverMs || elapsed}ms`, 'success');
      } else {
        notify(data?.message || `HTTP ${res.status} Error`, 'error');
      }

      // Sync updated user coin balance and portal request stats
      await Promise.all([refreshUserDashboard(), refreshPortal()]);
    } catch (err: any) {
      setResponseState({
        statusCode: 500,
        responseTimeMs: Math.round(performance.now() - clientStart),
        coinsUsed: '0',
        coinsRemaining: null,
        rateLimitRemaining: null,
        body: {
          status: false,
          error: 'NETWORK_ERROR',
          message: err?.message || 'Failed to reach API endpoint',
        },
      });
      notify('Network error while executing API request', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-white/[0.08] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-2">
            <span>BESTIE Live Workbench</span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span className="text-violet-300">Real Backend Execution</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Interactive API Tester
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Select an endpoint, configure parameters, attach your Bearer API key, and inspect live responses.
          </p>
        </div>

        {user ? (
          <div className="flex items-center gap-4 text-xs bg-[#0D0E17] border border-white/10 px-4 py-2.5 rounded-xl">
            <div>
              <span className="text-slate-400 block">Account Balance</span>
              <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                {user.coins} BESTIE Coins
              </span>
            </div>
            <div className="h-7 w-px bg-white/10" />
            <div>
              <span className="text-slate-400 block">Active Keys</span>
              <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                {userKeys.filter((k) => k.status === 'active').length}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[#0D0E17] border border-violet-500/30 px-4 py-3 rounded-xl text-xs">
            <span className="text-slate-300">Need an API key and free coins to test?</span>
            <Link
              to="/register"
              className="px-3 py-1.5 rounded-lg font-semibold text-white bg-violet-600 hover:bg-violet-500 whitespace-nowrap"
            >
              Register Free (+50 Coins)
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Request Builder */}
        <form
          onSubmit={handleSendRequest}
          className="lg:col-span-6 rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-6"
        >
          {/* 1. Select API Endpoint */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              1. Select API Endpoint
            </label>
            <select
              value={selectedApi?.slug || ''}
              onChange={(e) => handleApiChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              {apis.map((a) => (
                <option key={a._id} value={a.slug}>
                  [{a.method}] {a.name} — ({a.coinCost} {a.coinCost === 1 ? 'Coin' : 'Coins'})
                </option>
              ))}
            </select>
            {selectedApi && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <code className="font-mono text-violet-300">{selectedApi.endpoint}</code>
                <span className="font-mono tabular-nums text-amber-300">
                  Cost: {selectedApi.coinCost} Coins
                </span>
              </div>
            )}
          </div>

          {/* 2. Select or Enter API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-violet-400" />
                2. Authorization: Bearer API Key
              </label>
              {userKeys.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) setApiKeyInput(e.target.value);
                  }}
                  value={apiKeyInput}
                  className="text-xs bg-[#07070D] border border-white/15 rounded-lg px-2 py-1 text-slate-300"
                >
                  <option value="">Switch saved key...</option>
                  {userKeys
                    .filter((k) => k.status === 'active')
                    .map((k) => (
                      <option key={k._id} value={k.key}>
                        {k.name} ({k.key.slice(0, 12)}...)
                      </option>
                    ))}
                </select>
              )}
            </div>
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="bst_live_..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070D] border border-white/15 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* 3. Parameters */}
          {selectedApi && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  3. Request Parameters ({selectedApi.method === 'GET' ? 'Query String' : 'JSON Body'})
                </label>
                <button
                  type="button"
                  onClick={() => setCustomParams((prev) => [...prev, { key: '', value: '' }])}
                  className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Param
                </button>
              </div>

              <div className="space-y-3">
                {(selectedApi.parameters || []).map((param) => (
                  <div
                    key={param.name}
                    className="p-3.5 rounded-xl bg-[#07070D] border border-white/[0.08] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-violet-300">
                        {param.name}{' '}
                        {param.required && <span className="text-rose-400">*</span>}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {param.location} · {param.type}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paramValues[param.name] ?? ''}
                      onChange={(e) =>
                        setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))
                      }
                      placeholder={param.defaultValue || `Enter ${param.name}...`}
                      className="w-full px-3 py-2 rounded-lg bg-[#0D0E17] border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                    <p className="text-[11px] text-slate-500">{param.description}</p>
                  </div>
                ))}

                {customParams.map((cp, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cp.key}
                      onChange={(e) => {
                        const next = [...customParams];
                        next[index].key = e.target.value;
                        setCustomParams(next);
                      }}
                      placeholder="param_name"
                      className="w-1/3 px-3 py-2 rounded-lg bg-[#07070D] border border-white/10 font-mono text-xs text-white"
                    />
                    <input
                      type="text"
                      value={cp.value}
                      onChange={(e) => {
                        const next = [...customParams];
                        next[index].value = e.target.value;
                        setCustomParams(next);
                      }}
                      placeholder="value"
                      className="flex-1 px-3 py-2 rounded-lg bg-[#07070D] border border-white/10 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCustomParams((prev) => prev.filter((_, idx) => idx !== index))
                      }
                      className="p-2 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Request Button */}
          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            {sending ? 'Executing Live API Request...' : 'Send Live Request'}
          </button>
        </form>

        {/* RIGHT COLUMN: Live Response Inspector */}
        <div className="lg:col-span-6 rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <h2 className="font-display text-lg font-bold text-white">Live Gateway Response</h2>

            {responseState.statusCode !== null && (
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                <span
                  className={
                    responseState.statusCode >= 200 && responseState.statusCode < 300
                      ? 'text-emerald-400 font-bold'
                      : 'text-rose-400 font-bold'
                  }
                >
                  HTTP {responseState.statusCode}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-blue-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {responseState.responseTimeMs} ms
                </span>
                {responseState.coinsUsed !== null && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="text-amber-300 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />-{responseState.coinsUsed} Coins
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {responseState.statusCode === null ? (
            <div className="py-20 text-center space-y-2 text-slate-500">
              <p className="text-sm font-medium text-slate-300">Ready to Execute</p>
              <p className="text-xs max-w-sm mx-auto">
                Click "Send Live Request" to invoke the actual backend endpoint and inspect the status code, latency, and JSON payload.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Optional Interactive Media Preview for Music or QR responses */}
              {Array.isArray(responseState.body?.result) &&
                responseState.body.result[0]?.previewAudioUrl && (
                  <div className="p-3.5 rounded-xl bg-[#07070D] border border-white/10 flex flex-col sm:flex-row items-center gap-3">
                    {responseState.body.result[0].artworkHighRes && (
                      <img
                        src={responseState.body.result[0].artworkHighRes}
                        alt={responseState.body.result[0].title || 'Track Artwork'}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {responseState.body.result[0].title} — {responseState.body.result[0].artist}
                      </p>
                      <audio
                        controls
                        src={responseState.body.result[0].previewAudioUrl}
                        className="w-full h-8 mt-1.5"
                      />
                    </div>
                  </div>
                )}

              {responseState.body?.result?.dataUri && (
                <div className="p-4 rounded-xl bg-[#07070D] border border-white/10 flex items-center gap-4">
                  <img
                    src={responseState.body.result.dataUri}
                    alt="Generated QR Code"
                    className="w-24 h-24 rounded-lg bg-white p-1.5"
                  />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-white">Generated Vector QR Asset</p>
                    <p className="text-slate-400">
                      Dimensions: {responseState.body.result.dimensions}
                    </p>
                  </div>
                </div>
              )}

              {/* Raw JSON Output */}
              <div className="relative rounded-xl bg-[#07070D] border border-white/10 p-4">
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      JSON.stringify(responseState.body, null, 2),
                      'Copied JSON response payload'
                    )
                  }
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs text-slate-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy JSON
                </button>
                <pre className="font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed max-h-[500px] pt-2">
                  {JSON.stringify(responseState.body, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
