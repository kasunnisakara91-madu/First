import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Copy, FlaskConical, BookOpen, ArrowLeft } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export const ApiDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { apis, docs, settings, copyText } = usePlatform();
  const [activeLang, setActiveLang] = useState<'javascript' | 'nodejs' | 'python' | 'curl'>('curl');

  const api = apis.find((a) => a.slug === slug);
  const doc = docs.find((d) => d.apiSlug === slug);

  if (!api) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">API Endpoint Not Found</h1>
        <p className="text-sm text-slate-400">
          The requested API slug "{slug}" does not exist or is currently disabled.
        </p>
        <Link
          to="/apis"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to API Directory
        </Link>
      </div>
    );
  }

  const baseUrl = (settings?.baseUrl || window.location.origin).replace(/\/$/, '');
  const fullUrl = `${baseUrl}${api.endpoint}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="space-y-4 border-b border-white/[0.08] pb-8">
        <Link
          to="/apis"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to API Directory
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="text-violet-300 font-medium">{api.categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-semibold text-emerald-400">{api.method}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-amber-300">
            {api.coinCost} {api.coinCost === 1 ? 'BESTIE Coin' : 'BESTIE Coins'} / request
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {api.rateLimitPerMinute} req/min · {api.rateLimitPerDay} req/day
          </span>
          <span aria-hidden="true">·</span>
          <span className={api.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>
            {api.status === 'active' ? 'Active' : 'Maintenance'}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">{api.name}</h1>
          <div className="flex items-center gap-3">
            <Link
              to={`/tester?api=${encodeURIComponent(api.slug)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-95 transition-opacity whitespace-nowrap"
            >
              <FlaskConical className="w-4 h-4" />
              Test Live in API Tester
            </Link>
            <Link
              to={`/docs?api=${encodeURIComponent(api.slug)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-violet-400" />
              Full Documentation
            </Link>
          </div>
        </div>

        <p className="text-base text-slate-300 max-w-3xl leading-relaxed">{api.description}</p>

        {/* Endpoint Box */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#0D0E17] border border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
              {api.method}
            </span>
            <code className="font-mono text-sm text-white truncate">{fullUrl}</code>
          </div>
          <button
            type="button"
            onClick={() => copyText(fullUrl, 'Copied full endpoint URL')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy URL
          </button>
        </div>
      </div>

      {/* Parameters Table */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">Request Parameters</h2>
        {api.parameters.length === 0 ? (
          <p className="text-sm text-slate-400">No parameters required for this endpoint.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0D0E17]">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs text-slate-400">
                  <th className="py-3 px-4 font-semibold">Parameter</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Required</th>
                  <th className="py-3 px-4 font-semibold">Default / Example</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {api.parameters.map((p) => (
                  <tr key={p.name} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-violet-300">
                      {p.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{p.location}</td>
                    <td className="py-3 px-4 font-mono text-xs text-blue-300">{p.type}</td>
                    <td className="py-3 px-4 text-xs">
                      {p.required ? (
                        <span className="text-rose-400 font-medium">Required</span>
                      ) : (
                        <span className="text-slate-500">Optional</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {p.defaultValue || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Code Examples & Sample JSON Response */}
      {doc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Code Examples</h2>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D0E17] border border-white/10">
                {(['curl', 'javascript', 'nodejs', 'python'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      activeLang === lang
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'nodejs'
                      ? 'Node.js'
                      : lang === 'javascript'
                      ? 'JS'
                      : lang === 'python'
                      ? 'Python'
                      : 'cURL'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl bg-[#0D0E17] border border-white/[0.08] p-4">
              <button
                type="button"
                onClick={() =>
                  copyText(doc.codeExamples[activeLang], `Copied ${activeLang} snippet`)
                }
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs text-slate-300 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <pre className="font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed pt-2">
                {doc.codeExamples[activeLang]}
              </pre>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Response Example</h2>
              <span className="text-xs font-mono text-emerald-400">application/json</span>
            </div>
            <div className="relative rounded-xl bg-[#0D0E17] border border-white/[0.08] p-4">
              <button
                type="button"
                onClick={() => copyText(doc.responseExample, 'Copied JSON response example')}
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs text-slate-300 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <pre className="font-mono text-xs text-emerald-300/90 overflow-x-auto leading-relaxed pt-2 max-h-80">
                {doc.responseExample}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
