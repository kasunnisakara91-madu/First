import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Copy, FlaskConical, Key, AlertTriangle } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export const DocsPage: React.FC = () => {
  const { docs, settings, copyText } = usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLang, setActiveLang] = useState<'curl' | 'javascript' | 'nodejs' | 'python'>('curl');

  const paramSlug = searchParams.get('api');
  const [selectedSlug, setSelectedSlug] = useState<string>(
    paramSlug || (docs[0]?.apiSlug ?? '')
  );

  useEffect(() => {
    if (paramSlug) {
      setSelectedSlug(paramSlug);
    } else if (!selectedSlug && docs.length > 0) {
      setSelectedSlug(docs[0].apiSlug);
    }
  }, [paramSlug, docs, selectedSlug]);

  const filteredDocs = docs.filter(
    (d) =>
      !searchQuery.trim() ||
      d.apiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDoc =
    docs.find((d) => d.apiSlug === selectedSlug) || filteredDocs[0] || docs[0] || null;

  const baseUrl = (settings?.baseUrl || window.location.origin).replace(/\/$/, '');

  const handleSelectDoc = (slug: string) => {
    setSelectedSlug(slug);
    setSearchParams({ api: slug });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-24">
          <div>
            <h1 className="font-display text-xl font-bold text-white">API Documentation</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Reference specifications & multi-language SDK snippets.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter documentation..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0D0E17] border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="rounded-xl bg-[#0D0E17] border border-white/[0.08] p-2 space-y-1 max-h-[65vh] overflow-y-auto">
            {filteredDocs.length === 0 ? (
              <p className="p-3 text-xs text-slate-500 text-center">No matching docs</p>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = activeDoc?.apiSlug === doc.apiSlug;
                return (
                  <button
                    key={doc._id}
                    type="button"
                    onClick={() => handleSelectDoc(doc.apiSlug)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-violet-600/20 text-white border border-violet-500/40'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{doc.apiName}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">
                        {doc.endpoint}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-[10px] font-bold shrink-0 ${
                        doc.method === 'POST' ? 'text-blue-400' : 'text-emerald-400'
                      }`}
                    >
                      {doc.method}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Documentation Content */}
        <main className="lg:col-span-9 space-y-8">
          {!activeDoc ? (
            <div className="rounded-xl bg-[#0D0E17] border border-white/[0.08] p-12 text-center">
              <p className="text-sm text-slate-400">Select an API endpoint to view documentation.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-6 sm:p-8 space-y-8">
              {/* Header */}
              <div className="border-b border-white/[0.08] pb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="text-violet-300 font-medium">{activeDoc.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-bold text-emerald-400">{activeDoc.method}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-amber-300">
                    {activeDoc.coinCost} {activeDoc.coinCost === 1 ? 'Coin' : 'Coins'} / request
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{activeDoc.rateLimit}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                    {activeDoc.apiName}
                  </h2>
                  <Link
                    to={`/tester?api=${encodeURIComponent(activeDoc.apiSlug)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-95 transition-opacity whitespace-nowrap self-start"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    Test in Live Tester
                  </Link>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">{activeDoc.description}</p>

                {/* Endpoint Bar */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#07070D] border border-white/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                      {activeDoc.method}
                    </span>
                    <code className="font-mono text-xs sm:text-sm text-white truncate">
                      {baseUrl}
                      {activeDoc.endpoint}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(`${baseUrl}${activeDoc.endpoint}`, 'Copied endpoint URL')
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
              </div>

              {/* Authentication & Rate Limit Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#07070D] border border-white/[0.06] space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Authentication Header</span>
                    <Key className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <code className="block font-mono text-xs text-white truncate">
                    {activeDoc.authentication}
                  </code>
                </div>
                <div className="p-4 rounded-xl bg-[#07070D] border border-white/[0.06] space-y-1">
                  <span className="text-xs text-slate-400 block">Credit Cost</span>
                  <p className="font-mono text-sm font-semibold text-amber-300 tabular-nums">
                    {activeDoc.coinCost} BESTIE {activeDoc.coinCost === 1 ? 'Coin' : 'Coins'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#07070D] border border-white/[0.06] space-y-1">
                  <span className="text-xs text-slate-400 block">Rate Limit Quota</span>
                  <p className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                    {activeDoc.rateLimit}
                  </p>
                </div>
              </div>

              {/* Parameters */}
              <div className="space-y-3">
                <h3 className="font-display text-lg font-bold text-white">Parameters</h3>
                {activeDoc.parameters.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No query or body parameters are required for this endpoint.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#07070D]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-slate-400">
                          <th className="py-3 px-4 font-semibold">Name</th>
                          <th className="py-3 px-4 font-semibold">Location</th>
                          <th className="py-3 px-4 font-semibold">Type</th>
                          <th className="py-3 px-4 font-semibold">Requirement</th>
                          <th className="py-3 px-4 font-semibold">Default</th>
                          <th className="py-3 px-4 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {activeDoc.parameters.map((p) => (
                          <tr key={p.name}>
                            <td className="py-3 px-4 font-mono font-semibold text-violet-300">
                              {p.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">{p.location}</td>
                            <td className="py-3 px-4 font-mono text-blue-300">{p.type}</td>
                            <td className="py-3 px-4">
                              {p.required ? (
                                <span className="text-rose-400 font-semibold">Required</span>
                              ) : (
                                <span className="text-slate-500">Optional</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {p.defaultValue || '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-300">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Multi-Language Code Examples */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-white">
                    Request Code Examples
                  </h3>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#07070D] border border-white/10 self-start">
                    {(['curl', 'javascript', 'nodejs', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveLang(lang)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                          activeLang === lang
                            ? 'bg-violet-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang === 'curl'
                          ? 'cURL'
                          : lang === 'javascript'
                          ? 'JavaScript'
                          : lang === 'nodejs'
                          ? 'Node.js'
                          : 'Python'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-xl bg-[#07070D] border border-white/10 p-4">
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        activeDoc.codeExamples[activeLang],
                        `Copied ${activeLang} code example`
                      )
                    }
                    className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-slate-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </button>
                  <pre className="font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed pt-2">
                    {activeDoc.codeExamples[activeLang]}
                  </pre>
                </div>
              </div>

              {/* Response Example */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-white">
                    JSON Response Example
                  </h3>
                  <button
                    type="button"
                    onClick={() => copyText(activeDoc.responseExample, 'Copied JSON response')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-slate-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy JSON
                  </button>
                </div>
                <pre className="rounded-xl bg-[#07070D] border border-white/10 p-4 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                  {activeDoc.responseExample}
                </pre>
              </div>

              {/* Error Codes */}
              <div className="space-y-3">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Standard Gateway Error Codes
                </h3>
                <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#07070D]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400">
                        <th className="py-2.5 px-4 font-semibold">HTTP Status</th>
                        <th className="py-2.5 px-4 font-semibold">Error Code</th>
                        <th className="py-2.5 px-4 font-semibold">Meaning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {(activeDoc.errorCodes || []).map((err) => (
                        <tr key={err.code}>
                          <td className="py-2.5 px-4 font-mono font-bold text-rose-400 tabular-nums">
                            {err.code}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-amber-300">{err.status}</td>
                          <td className="py-2.5 px-4 text-slate-300">{err.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
