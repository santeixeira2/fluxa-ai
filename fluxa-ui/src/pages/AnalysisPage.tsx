import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ComparisonTab from '../components/ComparisonTab';
import PriceChart from '../components/PriceChart';
import { getAssets, getRegime } from '../api/client';
import type { AssetInfo, AssetType, RegimeResult } from '../api/client';

type Tab = 'chart' | 'compare' | 'regime';

// ── Asset Picker ────────────────────────────────────────────────────────────

const TYPE_FILTERS: { id: string; label: string }[] = [
  { id: 'all',       label: 'Todos'     },
  { id: 'crypto',    label: 'Crypto'    },
  { id: 'stock',     label: 'Stock'     },
  { id: 'br_stock',  label: 'B3'        },
  { id: 'etf',       label: 'ETF'       },
  { id: 'forex',     label: 'Forex'     },
  { id: 'commodity', label: 'Commodity' },
];

function AssetPicker({ assets, value, onChange }: {
  assets: AssetInfo[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const selected = assets.find(a => a.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  const filtered = assets.filter(a => {
    const matchesType = typeFilter === 'all' || a.type === (typeFilter as AssetType);
    const q = query.toLowerCase();
    const matchesQuery = !q || a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 border text-sm transition-all px-3 py-2 ${
          open
            ? 'bg-black/[0.06] dark:bg-white/[0.06] border-black/20 dark:border-white/20 rounded-t-xl rounded-b-none border-b-transparent'
            : 'bg-black/[0.04] dark:bg-white/[0.05] border-black/10 dark:border-white/10 rounded-xl hover:border-black/20 dark:hover:border-white/20'
        }`}
      >
        {selected ? (
          <>
            <span className="text-[10px] font-mono font-bold text-black/50 dark:text-white/50 uppercase tracking-wider">
              {selected.symbol}
            </span>
            <span className="text-sm font-medium text-black dark:text-white max-w-[140px] truncate">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-black/40 dark:text-white/40">Selecionar ativo</span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-black/30 dark:text-white/30 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 w-72 bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 border-t-0 rounded-b-xl rounded-tl-xl shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-2 bg-black/[0.04] dark:bg-white/[0.04] rounded-lg px-3 py-2">
              <svg className="w-3.5 h-3.5 text-black/30 dark:text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar ativo..."
                className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none"
              />
            </div>
          </div>

          {/* Type filters */}
          <div className="flex gap-1 flex-wrap px-2 py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                  typeFilter === f.id
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-black/30 dark:text-white/30 hover:text-black/70 dark:hover:text-white/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Results */}
          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-sm text-center text-black/30 dark:text-white/30 font-mono">
                Sem resultados
              </li>
            ) : (
              filtered.slice(0, 60).map(a => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => select(a.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04] ${
                      a.id === value ? 'bg-black/[0.06] dark:bg-white/[0.06]' : ''
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold text-black/40 dark:text-white/40 uppercase w-12 flex-shrink-0">
                      {a.symbol}
                    </span>
                    <span className="text-sm text-black dark:text-white truncate">{a.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Chart Tab ───────────────────────────────────────────────────────────────

function ChartTab({ assetId }: { assetId: string }) {
  return (
    <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
      <PriceChart assetId={assetId} />
    </div>
  );
}

// ── Regime Tab ──────────────────────────────────────────────────────────────

const REGIME_STYLES: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  trending_up:    { border: 'border-emerald-500/30', bg: 'bg-emerald-500/[0.06]', text: 'text-emerald-500', icon: '↗' },
  trending_down:  { border: 'border-red-500/30',     bg: 'bg-red-500/[0.06]',     text: 'text-red-500',     icon: '↘' },
  volatile:       { border: 'border-amber-500/30',   bg: 'bg-amber-500/[0.06]',   text: 'text-amber-500',   icon: '⚡' },
  mean_reverting: { border: 'border-blue-500/30',    bg: 'bg-blue-500/[0.06]',    text: 'text-blue-500',    icon: '↔' },
};

function RegimeTab({ assetId }: { assetId: string }) {
  const { t } = useTranslation();
  const [result, setResult]   = useState<RegimeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!assetId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setResult(null);
    getRegime(assetId)
      .then(r => { if (!cancelled) setResult(r); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : t('analysis.regime.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [assetId, t]);

  const style = result ? (REGIME_STYLES[result.regime] ?? REGIME_STYLES.volatile) : null;

  if (loading) return (
    <div className="space-y-3">
      <div className="h-32 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] animate-pulse" />
      <div className="h-20 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] animate-pulse" />
    </div>
  );

  if (error) return (
    <div className="py-10 text-center text-sm text-red-500 font-mono">{error}</div>
  );

  if (!result || !style) return null;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-6 ${style.border} ${style.bg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest uppercase opacity-60 mb-2">
              {t('analysis.regime.label')}
            </p>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${style.text}`}>{style.icon}</span>
              <p className={`text-2xl font-bold ${style.text}`}>
                {t(`analysis.regime.regimes.${result.regime}`)}
              </p>
            </div>
            <p className="text-sm text-black/50 dark:text-white/50 mt-2 leading-relaxed">
              {t(`analysis.regime.descriptions.${result.regime}`)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1">
              {t('analysis.regime.confidence')}
            </p>
            <p className={`text-3xl font-bold font-mono ${style.text}`}>
              {(result.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {result.metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: t('analysis.regime.realizedVol'), value: `${(result.metrics.realizedVol * 100).toFixed(1)}%` },
            { label: t('analysis.regime.smaSlope'), value: result.metrics.smaSlope >= 0 ? `+${result.metrics.smaSlope.toFixed(4)}` : result.metrics.smaSlope.toFixed(4) },
            { label: t('analysis.regime.directionalBias'), value: result.metrics.directionalBias >= 0 ? `+${result.metrics.directionalBias.toFixed(2)}` : result.metrics.directionalBias.toFixed(2) },
          ].map(m => (
            <div key={m.label} className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-xl p-4">
              <p className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-1">{m.label}</p>
              <p className="text-base font-bold font-mono">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {result.aiSummary && (
        <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
          <p className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-3">✦ Kuant AI</p>
          <p className="text-sm leading-relaxed text-black/80 dark:text-white/80">{result.aiSummary}</p>
        </div>
      )}
    </div>
  );
}

// ── Analysis Page ───────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab]       = useState<Tab>('chart');
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [selectedAsset, setSelectedAsset] = useState(searchParams.get('asset') ?? 'bitcoin');

  useEffect(() => {
    getAssets().then(setAssets).catch(() => {});
  }, []);

  const handleAssetChange = useCallback((id: string) => {
    setSelectedAsset(id);
    setSearchParams({ asset: id }, { replace: true });
  }, [setSearchParams]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'chart',   label: t('analysis.tabs.chart') },
    { id: 'compare', label: t('analysis.tabs.compare') },
    { id: 'regime',  label: t('analysis.tabs.regime') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pt-[104px]">
      <Navbar />
      <main className="max-w-[900px] mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase">
            {t('analysis.badge')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3">{t('analysis.title')}</h1>
          <p className="text-sm text-black/40 dark:text-white/40 mt-2">{t('analysis.subtitle')}</p>
        </div>

        {/* Tabs row + asset picker */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 mb-6 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex gap-1">
            {TABS.map(tabItem => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === tabItem.id
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70'
                }`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          {/* Global asset picker — hidden for compare (it has its own) */}
          {tab !== 'compare' && assets.length > 0 && (
            <div className="pb-px">
              <AssetPicker assets={assets} value={selectedAsset} onChange={handleAssetChange} />
            </div>
          )}
        </div>

        {tab === 'chart'   && <ChartTab assetId={selectedAsset} />}
        {tab === 'compare' && <ComparisonTab assets={assets} preselectedA={selectedAsset} />}
        {tab === 'regime'  && <RegimeTab assetId={selectedAsset} />}
      </main>
    </div>
  );
}
