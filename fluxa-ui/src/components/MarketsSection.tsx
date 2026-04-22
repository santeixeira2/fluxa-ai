import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getMarkets } from '../api/client';
import type { MarketsData, MarketCategory, MarketItem } from '../api/client';

const TAB_IDS: MarketCategory[] = ['indices', 'crypto', 'stocks', 'br_stocks', 'commodities', 'currencies'];

function fmt(value: number, currency: string): string {
  if (['BRL', 'USD', 'EUR', 'GBP'].includes(currency)) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MarketRow({ item }: { item: MarketItem }) {
  const pct = item.changePercent ?? 0;
  const up = pct >= 0;
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.name}</p>
        <p className="text-xs text-white/30 font-mono">{item.symbol}</p>
      </div>
      <div className="text-right ml-4">
        <p className="text-sm font-mono font-medium text-white">{fmt(item.price, item.currency)}</p>
        <p className={`text-xs font-mono ${up ? 'text-emerald-400' : 'text-red-400'}`}>
          {pct !== 0 ? `${up ? '+' : ''}${pct.toFixed(2)}%` : '—'}
        </p>
      </div>
    </div>
  );
}

export default function MarketsSection() {
  const { t } = useTranslation();
  const [data, setData] = useState<MarketsData | null>(null);
  const [tab, setTab] = useState<MarketCategory>('indices');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await getMarkets()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const items: MarketItem[] = data?.[tab] ?? [];

  return (
    <section className="py-24 px-6 max-w-[1200px] mx-auto border-t border-white/[0.05]">
      <div className="text-center mb-12">
        <span className="section-label">{t('markets.badge')}</span>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">{t('markets.headline')}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.05] p-1 rounded-full w-fit mb-8 px-2 mx-auto overflow-x-auto">
        {TAB_IDS.map(id => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
              tab === id ? 'bg-white text-black shadow-lg' : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t(`markets.tabs.${id}`)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card p-6 max-w-[700px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-1">
          <span className="text-[10px] font-mono tracking-widest text-white/20 uppercase">{t('markets.colName')}</span>
          <span className="text-[10px] font-mono tracking-widest text-white/20 uppercase">{t('markets.colPrice')}</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-white/20 text-sm font-mono">{t('markets.loading')}</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-white/20 text-sm font-mono">{t('markets.noData')}</div>
        ) : (
          items.map(item => <MarketRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}
