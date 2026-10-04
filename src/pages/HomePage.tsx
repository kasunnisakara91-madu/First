import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Terminal, Key, Coins, BookOpen, FlaskConical } from 'lucide-react';
import { ButterflyLogo } from '../components/ButterflyLogo';
import { ApiCard } from '../components/ApiCard';
import { usePlatform } from '../context/PlatformContext';

export const HomePage: React.FC = () => {
  const { settings, categories, apis, metrics, user } = usePlatform();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const navigate = useNavigate();

  const filteredApis = apis.filter((api) => {
    const matchesCat = selectedCategory === 'all' || api.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const featuredApis = apis.filter((a) => a.featured);
  const popularApis = [...apis].sort((a, b) => (b.totalCalls || 0) - (a.totalCalls || 0)).slice(0, 6);
  const latestApis = [...apis]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 6);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/apis?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-24 pb-12">
      {/* HERO SECTION */}
      <section className="relative pt-14 pb-16 border-b border-white/[0.08] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.28), rgba(59, 130, 246, 0.12) 45%, transparent 75%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <ButterflyLogo className="w-9 h-9" />
              <div className="text-xs text-slate-400 font-medium">
                <span>{settings?.websiteName || '🦋 BESTIE API 🦋'}</span>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                <span className="text-violet-300">
                  {settings?.tagline || 'Fast • Powerful • Developer Friendly API'}
                </span>
              </div>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              {settings?.heroTitle || 'Powerful APIs for Developers & Automation'}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl">
              {settings?.heroSubtitle ||
                'BESTIE API is a modern developer API platform that provides fast and easy-to-use APIs for bots, websites, applications and automation projects.'}
            </p>

            {/* Search & Primary CTA Row */}
            <form onSubmit={handleHeroSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl mb-10">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search endpoints by name, path, or capability (e.g. music, wikipedia, ai)..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D0E17] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
              >
                Search APIs
              </button>
            </form>

            {/* Quick Navigation Actions */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-colors whitespace-nowrap"
              >
                <Key className="w-4 h-4 text-violet-400" />
                {user ? 'Manage API Keys' : `Claim ${settings?.newAccountBonusCoins ?? 50} Free BESTIE Coins`}
              </Link>
              <Link
                to="/tester"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                <FlaskConical className="w-4 h-4 text-pink-400" />
                Open Live API Tester
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                Read Documentation
              </Link>
            </div>
          </div>

          {/* Real Platform Telemetry Row */}
          <div className="mt-14 pt-8 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-400 mb-1">Active Endpoints</p>
              <p className="font-mono text-2xl font-bold text-white tabular-nums">
                {metrics.totalApis}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">API Categories</p>
              <p className="font-mono text-2xl font-bold text-white tabular-nums">
                {metrics.totalCategories}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Requests Served</p>
              <p className="font-mono text-2xl font-bold text-white tabular-nums">
                {metrics.totalCalls.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Average Gateway Latency</p>
              <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                {metrics.avgLatencyMs} ms
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* API CATEGORIES & INTERACTIVE FILTER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              01. API Categories & Interactive Directory
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Filter endpoints by domain or inspect live parameters in the API Tester.
            </p>
          </div>
          <Link
            to="/apis"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 whitespace-nowrap"
          >
            View Full Directory
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Interactive Segmented Category Filter */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0D0E17] border border-white/[0.08] rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Endpoints ({apis.length})
          </button>
          {categories.map((cat) => {
            const count = apis.filter((a) => a.category === cat.slug).length;
            return (
              <button
                key={cat._id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.slug
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Filtered API Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApis.map((api) => (
            <ApiCard key={api._id} api={api} />
          ))}
        </div>
      </section>

      {/* FEATURED & POPULAR APIS SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Featured APIs */}
        {featuredApis.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">02. Featured APIs</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Curated production endpoints for bots, media automation, and web tooling.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {featuredApis.length} Featured
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredApis.map((api) => (
                <ApiCard key={`feat-${api._id}`} api={api} />
              ))}
            </div>
          </div>
        )}

        {/* Popular & Latest Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Popular APIs */}
          <div className="space-y-4">
            <div className="border-b border-white/[0.08] pb-3">
              <h3 className="font-display text-xl font-bold text-white">03. Popular APIs</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ranked by real developer request volume across the platform.
              </p>
            </div>
            <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl bg-[#0D0E17]">
              {popularApis.map((api, idx) => (
                <div
                  key={`pop-${api._id}`}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="font-mono text-violet-400">0{idx + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-emerald-400">{api.method}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-amber-300 tabular-nums">
                        {api.coinCost} Coins
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {api.totalCalls} calls
                      </span>
                    </div>
                    <Link
                      to={`/api/${api.slug}`}
                      className="text-sm font-semibold text-white hover:text-violet-300 transition-colors block truncate"
                    >
                      {api.name}
                    </Link>
                    <code className="text-xs font-mono text-slate-400">{api.endpoint}</code>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/tester?api=${encodeURIComponent(api.slug)}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600/80 hover:bg-violet-500 transition-colors whitespace-nowrap"
                    >
                      Try API
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest APIs */}
          <div className="space-y-4">
            <div className="border-b border-white/[0.08] pb-3">
              <h3 className="font-display text-xl font-bold text-white">04. Latest Releases</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Recently deployed endpoints and custom backend integrations.
              </p>
            </div>
            <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl bg-[#0D0E17]">
              {latestApis.map((api) => (
                <div
                  key={`lat-${api._id}`}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="text-violet-300">{api.categoryName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-emerald-400">{api.method}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-amber-300 tabular-nums">
                        {api.coinCost} Coins
                      </span>
                    </div>
                    <Link
                      to={`/api/${api.slug}`}
                      className="text-sm font-semibold text-white hover:text-violet-300 transition-colors block truncate"
                    >
                      {api.name}
                    </Link>
                    <code className="text-xs font-mono text-slate-400">{api.endpoint}</code>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/docs?api=${encodeURIComponent(api.slug)}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors whitespace-nowrap"
                    >
                      Docs
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BESTIE COINS & ARCHITECTURE EXPLANATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-[#0D0E17] border border-white/[0.08] p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="text-xs text-violet-300 font-medium">
              <span>BESTIE Coin System</span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span>Bearer Key Authentication</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Transparent Per-Request Coin Metering & Instant Bearer Keys
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every developer account receives{' '}
              <span className="font-mono font-semibold text-amber-300 tabular-nums">
                {settings?.newAccountBonusCoins ?? 50} BESTIE Coins
              </span>{' '}
              upon registration plus a recurring{' '}
              <span className="font-mono font-semibold text-amber-300 tabular-nums">
                +{settings?.dailyBonusCoins ?? 15} Coin
              </span>{' '}
              daily reward in the dashboard. Coins are only deducted when an API request succeeds.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#07070D] border border-white/[0.06]">
                <p className="text-xs text-slate-400 mb-1">Search & Web APIs</p>
                <p className="font-mono text-lg font-bold text-white tabular-nums">1 Coin / call</p>
              </div>
              <div className="p-4 rounded-xl bg-[#07070D] border border-white/[0.06]">
                <p className="text-xs text-slate-400 mb-1">Music & Asset APIs</p>
                <p className="font-mono text-lg font-bold text-white tabular-nums">2 Coins / call</p>
              </div>
              <div className="p-4 rounded-xl bg-[#07070D] border border-white/[0.06]">
                <p className="text-xs text-slate-400 mb-1">Download & AI APIs</p>
                <p className="font-mono text-lg font-bold text-white tabular-nums">3 Coins / call</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl bg-[#07070D] border border-white/10 p-5 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-white/[0.06]">
              <span className="flex items-center gap-2 text-white font-semibold">
                <Terminal className="w-4 h-4 text-violet-400" />
                Quick Authentication Example
              </span>
              <span>HTTP/1.1</span>
            </div>
            <pre className="text-slate-300 overflow-x-auto leading-relaxed">
              {`curl -X GET "${(settings?.baseUrl || window.location.origin).replace(
                /\/$/,
                ''
              )}/api/v1/music/search?query=Weeknd" \\
  -H "Authorization: Bearer bst_live_your_api_key"`}
            </pre>
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <span>Header: X-Bestie-Coins-Remaining</span>
              <span className="text-emerald-400">200 OK</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
