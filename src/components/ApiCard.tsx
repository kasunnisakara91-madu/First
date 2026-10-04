import React from 'react';
import { Link } from 'react-router-dom';
import { Copy, BookOpen, FlaskConical } from 'lucide-react';
import { APIEndpoint, usePlatform } from '../context/PlatformContext';

interface ApiCardProps {
  api: APIEndpoint;
}

export const ApiCard: React.FC<ApiCardProps> = ({ api }) => {
  const { copyText, settings } = usePlatform();
  const baseUrl = (settings?.baseUrl || window.location.origin).replace(/\/$/, '');
  const fullEndpoint = `${baseUrl}${api.endpoint}`;

  const methodColor =
    api.method === 'POST'
      ? 'text-blue-400'
      : api.method === 'DELETE'
      ? 'text-rose-400'
      : api.method === 'PUT'
      ? 'text-amber-400'
      : 'text-emerald-400';

  const statusColor =
    api.status === 'active'
      ? 'text-emerald-400'
      : api.status === 'maintenance'
      ? 'text-amber-400'
      : 'text-rose-400';

  const statusLabel =
    api.status === 'active'
      ? 'Active'
      : api.status === 'maintenance'
      ? 'Maintenance'
      : 'Disabled';

  return (
    <div className="group relative flex flex-col justify-between rounded-xl bg-[#0D0E17] border border-white/[0.08] hover:border-violet-500/40 p-6 transition-colors duration-150">
      <div>
        {/* Quiet 1-line unboxed metadata header */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2.5">
          <span className="text-violet-300 font-medium">{api.categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className={`font-mono font-semibold ${methodColor}`}>{api.method}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-amber-300">
            {api.coinCost} {api.coinCost === 1 ? 'Coin' : 'Coins'}
          </span>
          <span aria-hidden="true">·</span>
          <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
        </div>

        {/* Primary Title */}
        <Link
          to={`/api/${api.slug}`}
          className="block font-display text-lg font-bold text-white group-hover:text-violet-300 transition-colors mb-2"
        >
          {api.name}
        </Link>

        {/* Description */}
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 mb-4">
          {api.description}
        </p>

        {/* Endpoint Path Line */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#07070D] border border-white/[0.06] mb-5">
          <code className="text-xs font-mono text-slate-200 truncate">{api.endpoint}</code>
          <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
            {api.rateLimitPerMinute}/min
          </span>
        </div>
      </div>

      {/* Action Buttons: Documentation, Try API, Copy Endpoint */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            to={`/docs?api=${encodeURIComponent(api.slug)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-violet-400" />
            Documentation
          </Link>
          <Link
            to={`/tester?api=${encodeURIComponent(api.slug)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600/90 hover:bg-violet-500 transition-colors whitespace-nowrap"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Try API
          </Link>
        </div>

        <button
          type="button"
          onClick={() => copyText(fullEndpoint, `Copied endpoint: ${api.endpoint}`)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap"
          title="Copy Endpoint URL"
        >
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Copy Endpoint</span>
        </button>
      </div>
    </div>
  );
};
