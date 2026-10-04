import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ApiCard } from '../components/ApiCard';
import { usePlatform } from '../context/PlatformContext';

export const ApisPage: React.FC = () => {
  const { apis, categories } = usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCat = searchParams.get('category') || 'all';
  const initialQuery = searchParams.get('q') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);

  useEffect(() => {
    const catParam = searchParams.get('category');
    const qParam = searchParams.get('q');
    if (catParam) setSelectedCategory(catParam);
    if (qParam !== null) setSearchQuery(qParam);
  }, [searchParams]);

  const filtered = apis.filter((api) => {
    const matchCat = selectedCategory === 'all' || api.category === selectedCategory;
    const matchMethod = selectedMethod === 'ALL' || api.method === selectedMethod;
    const matchSearch =
      !searchQuery.trim() ||
      api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchMethod && matchSearch;
  });

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    const next = new URLSearchParams(searchParams);
    if (slug === 'all') next.delete('category');
    else next.set('category', slug);
    setSearchParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-white/[0.08] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-2">
            <span>BESTIE API Directory</span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-violet-300">
              {filtered.length} Endpoints Available
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Explore Developer APIs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse all production endpoints with transparent coin costs, rate limits, and live testing.
          </p>
        </div>

        {/* Search & HTTP Method Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name or endpoint..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#0D0E17] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D0E17] border border-white/10">
            {['ALL', 'GET', 'POST'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMethod(m)}
                className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors ${
                  selectedMethod === m
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#0D0E17] border border-white/[0.08] rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => handleCategoryChange('all')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Categories ({apis.length})
        </button>
        {categories.map((cat) => {
          const count = apis.filter((a) => a.category === cat.slug).length;
          return (
            <button
              key={cat._id}
              type="button"
              onClick={() => handleCategoryChange(cat.slug)}
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

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#0D0E17] border border-white/[0.08] p-12 text-center space-y-3">
          <p className="text-base font-semibold text-white">No matching API endpoints found</p>
          <p className="text-sm text-slate-400">
            Try clearing your search query or switching to All Categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedMethod('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((api) => (
            <ApiCard key={api._id} api={api} />
          ))}
        </div>
      )}
    </div>
  );
};
