import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createChart,
  ColorType,
  CrosshairMode,
  AreaSeries,
  createSeriesMarkers,
  type IChartApi,
} from 'lightweight-charts';
import { simulateDCA, type DCAResult, type DCAFrequency } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAssets } from '../hooks/useAssets';
import Reveal from './Reveal';
import Select from './Select';

type TabType = 'crypto' | 'stocks' | 'forex';

const TAB_TYPES: Record<TabType, string[]> = {
  crypto: ['crypto'],
  stocks: ['stock', 'br_stock', 'etf', 'commodity'],
  forex:  ['forex'],
};

const FREQUENCIES: DCAFrequency[] = ['weekly', 'monthly'];

// ── Chart sub-component ──────────────────────────────────────────────────────

function DCAChart({ result }: { result: DCAResult }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartError, setChartError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || result.schedule.length === 0) return;

    try {
      const isDark = document.documentElement.classList.contains('dark');
      const bg = isDark ? '#000000' : '#ffffff';
      const text = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
      const grid = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

      const chart = createChart(containerRef.current, {
        layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
        grid: { vertLines: { color: grid }, horzLines: { color: grid } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: false },
        width: containerRef.current.clientWidth,
        height: 260,
      });
      chartRef.current = chart;

      // Area series for price curve
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
        topColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        bottomColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
        lineWidth: 2,
      });

      // Deduplicate dates (in case of collisions) and build price data
      const seen = new Set<string>();
      const priceData: { time: string; value: number }[] = [];
      for (const item of result.schedule) {
        if (!seen.has(item.date)) {
          seen.add(item.date);
          priceData.push({ time: item.date, value: item.price });
        }
      }

      areaSeries.setData(priceData as any);

      // Set markers at each purchase point
      const markers = priceData.map(item => ({
        time: item.time,
        position: 'belowBar' as const,
        color: '#10b981',
        shape: 'circle' as const,
        size: 0.5,
      }));
      createSeriesMarkers(areaSeries, markers as any);

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect.width;
        if (w) chart.applyOptions({ width: w });
      });
      ro.observe(containerRef.current);

      return () => { chart.remove(); ro.disconnect(); };
    } catch (err) {
      console.error('[DCAChart] Failed to render chart:', err);
      setChartError(true);
    }
  }, [result]);

  if (chartError) {
    return (
      <div className="w-full h-[260px] flex items-center justify-center rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
        <p className="text-xs font-mono text-black/30 dark:text-white/30">Chart unavailable</p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DCACalculator() {
  const { t } = useTranslation();
  const { assets } = useAssets();
  const [tab, setTab] = useState<TabType>('crypto');
  const [asset, setAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<DCAFrequency>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const api = useApi<DCAResult>();

  const grouped = useMemo(() => {
    const result: Record<TabType, { value: string; label: string; minDate: string }[]> = { crypto: [], stocks: [], forex: [] };
    for (const a of assets) {
      const tabKey = (Object.entries(TAB_TYPES).find(([, types]) => types.includes(a.type))?.[0] ?? 'stocks') as TabType;
      result[tabKey].push({ value: a.id, label: `${a.name} (${a.symbol})`, minDate: a.minDate });
    }
    return result;
  }, [assets]);

  // Set default asset when tab changes or assets load
  useEffect(() => {
    const list = grouped[tab];
    if (list.length > 0 && (!asset || !list.find(a => a.value === asset))) {
      setAsset(list[0].value);
      setStartDate('');
      setEndDate('');
    }
  }, [tab, grouped]);

  const today = new Date().toISOString().split('T')[0];
  const minDate = grouped[tab].find(a => a.value === asset)?.minDate ?? '2010-01-01';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !startDate) return;

    await api.execute(() =>
      simulateDCA({
        asset,
        amount: amt,
        frequency,
        startDate,
        endDate: endDate || undefined,
        currency: 'brl',
      })
    );
  }

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatQty = (val: number) =>
    val < 0.01
      ? val.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 8 })
      : val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const result = api.data;
  const isProfit = result ? result.profit >= 0 : false;

  // DCA vs Lump-Sum comparison
  const dcaWon = result ? result.roi > result.lumpSum.roi : false;
  const lumpWon = result ? result.lumpSum.roi > result.roi : false;
  const roiDiff = result
    ? Math.abs((result.roi - result.lumpSum.roi) * 100).toFixed(2) + 'pp'
    : '';

  return (
    <section className="py-24 px-6 max-w-[1200px] mx-auto border-t border-black/[0.05] dark:border-white/[0.05]" id="dca">
      <Reveal delay={0}>
        <div className="text-center mb-16">
          <span className="section-label">{t('calculadoras.dca.badge')}</span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2 text-black dark:text-white">{t('calculadoras.dca.headline')}</h2>
          <p className="text-black/40 dark:text-white/40 mt-3 text-sm">{t('calculadoras.dca.subheadline')}</p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* ── Form card ───────────────────────────────────────────────────── */}
        <Reveal delay={150}>
          <div className="glass-card p-10">
            {/* Pill Tabs */}
            <div className="flex gap-1 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] p-1 rounded-full w-fit mb-10 px-2 mx-auto sm:mx-0">
              {(['crypto', 'stocks', 'forex'] as TabType[]).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => { setTab(tabKey); setStartDate(''); setEndDate(''); }}
                  className={`px-6 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                    tab === tabKey
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                      : 'text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60'
                  }`}
                >
                  {t(`calculadoras.simulator.tabs.${tabKey}`)}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {/* Asset select */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest uppercase text-black/30 dark:text-white/30 ml-4">
                  {t('calculadoras.dca.asset')}
                </label>
                <Select
                  variant="glass"
                  value={asset}
                  onChange={v => { setAsset(v); setStartDate(''); setEndDate(''); }}
                  options={grouped[tab]}
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest uppercase text-black/30 dark:text-white/30 ml-4">
                  {t('calculadoras.dca.amount')}
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0,00"
                  className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] rounded-2xl px-6 py-4 text-sm text-black dark:text-white focus:outline-none focus:border-black/30 dark:focus:border-white/30 font-mono placeholder:text-black/25 dark:placeholder:text-white/25 transition-colors"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>

              {/* Frequency pills */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest uppercase text-black/30 dark:text-white/30 ml-4">
                  {t('calculadoras.dca.frequency')}
                </label>
                <div className="flex gap-2">
                  {FREQUENCIES.map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFrequency(freq)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-mono font-medium transition-all ${
                        frequency === freq
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                          : 'bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {t(`calculadoras.dca.${freq}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono tracking-widest uppercase text-black/30 dark:text-white/30 ml-4">
                    {t('calculadoras.dca.startDate')}
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    max={today}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] rounded-2xl px-6 py-4 text-sm text-black dark:text-white focus:outline-none focus:border-black/30 dark:focus:border-white/30 h-[54px] transition-colors"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono tracking-widest uppercase text-black/30 dark:text-white/30 ml-4">
                    {t('calculadoras.dca.endDate')}
                  </label>
                  <input
                    type="date"
                    min={startDate || minDate}
                    max={today}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] rounded-2xl px-6 py-4 text-sm text-black dark:text-white focus:outline-none focus:border-black/30 dark:focus:border-white/30 h-[54px] transition-colors"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={api.loading}
                className="mt-2 w-full bg-black dark:bg-white text-white dark:text-black font-bold py-5 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-lg"
              >
                {api.loading ? t('calculadoras.dca.calculating') : t('calculadoras.dca.calculate')}
              </button>
            </form>

            {api.error && (
              <p className="mt-4 text-sm font-mono text-red-500 text-center">{api.error}</p>
            )}
          </div>
        </Reveal>

        {/* ── Results area ─────────────────────────────────────────────────── */}
        <Reveal delay={300}>
          <div className="space-y-6">
            {!result ? (
              <div className="glass-card p-10 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 rounded-full border border-black/[0.05] dark:border-white/[0.05] flex items-center justify-center mb-6 text-2xl text-black/10 dark:text-white/10">
                  ◌
                </div>
                <p className="text-sm font-mono tracking-tighter text-black/20 dark:text-white/20 uppercase">
                  {t('calculadoras.historical.awaiting')}
                </p>
              </div>
            ) : (
              <div className="animate-fade space-y-6">
                {/* ── Totals grid ── */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Total Invested */}
                  <div className="glass-card p-6">
                    <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20">
                      {t('calculadoras.dca.totalInvested')}
                    </span>
                    <p className="font-mono text-lg font-bold text-black dark:text-white mt-1">
                      {formatBRL(result.totalInvested)}
                    </p>
                    <span className="text-[10px] font-mono text-black/30 dark:text-white/30">
                      {t('calculadoras.dca.entries', { count: result.schedule.length })}
                    </span>
                  </div>

                  {/* Current Value */}
                  <div className="glass-card p-6">
                    <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20">
                      {t('calculadoras.dca.currentValue')}
                    </span>
                    <p className="font-mono text-lg font-bold text-black dark:text-white mt-1">
                      {formatBRL(result.currentValue)}
                    </p>
                  </div>

                  {/* Profit */}
                  <div className="glass-card p-6">
                    <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20">
                      {t('calculadoras.dca.profit')}
                    </span>
                    <p className={`font-mono text-lg font-bold mt-1 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isProfit ? '+' : ''}{formatBRL(result.profit)}
                    </p>
                  </div>

                  {/* ROI */}
                  <div className="glass-card p-6">
                    <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20">
                      {t('calculadoras.dca.roi')}
                    </span>
                    <p className={`font-mono text-lg font-bold mt-1 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isProfit ? '+' : ''}{(result.roi * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* ── Avg Price + Total Qty ── */}
                <div className="glass-card p-6 flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20">
                      {t('calculadoras.dca.avgPrice')}
                    </span>
                    <span className="font-mono text-sm font-bold text-black dark:text-white">
                      {formatBRL(result.averagePrice)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20">
                      {t('calculadoras.dca.totalQty')}
                    </span>
                    <span className="font-mono text-sm font-bold text-black dark:text-white">
                      {formatQty(result.totalQuantity)}
                    </span>
                  </div>
                </div>

                {/* ── DCA vs Lump-Sum ── */}
                <div className="glass-card p-6">
                  <p className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20 mb-4">
                    {t('calculadoras.dca.lumpSum.title')}
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={`p-4 rounded-xl border transition-all ${dcaWon ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-black/[0.06] dark:border-white/[0.06]'}`}>
                      <span className="text-[10px] font-mono font-bold uppercase text-black/40 dark:text-white/40">
                        {t('calculadoras.dca.lumpSum.dcaLabel')}
                      </span>
                      <p className="font-mono text-sm font-bold text-black dark:text-white mt-1">
                        {(result.roi * 100).toFixed(2)}%
                      </p>
                      <p className="font-mono text-xs text-black/40 dark:text-white/40">
                        {formatBRL(result.currentValue)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl border transition-all ${lumpWon ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-black/[0.06] dark:border-white/[0.06]'}`}>
                      <span className="text-[10px] font-mono font-bold uppercase text-black/40 dark:text-white/40">
                        {t('calculadoras.dca.lumpSum.lumpLabel')}
                      </span>
                      <p className="font-mono text-sm font-bold text-black dark:text-white mt-1">
                        {(result.lumpSum.roi * 100).toFixed(2)}%
                      </p>
                      <p className="font-mono text-xs text-black/40 dark:text-white/40">
                        {formatBRL(result.lumpSum.currentValue)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-center mt-4 text-black/40 dark:text-white/40">
                    {dcaWon
                      ? t('calculadoras.dca.lumpSum.dcaWon', { diff: roiDiff })
                      : lumpWon
                      ? t('calculadoras.dca.lumpSum.lumpWon', { diff: roiDiff })
                      : t('calculadoras.dca.lumpSum.tied')}
                  </p>
                </div>

                {/* ── Price Chart ── */}
                <div className="glass-card p-6">
                  <p className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20 mb-4">
                    {t('calculadoras.dca.chart.title')}
                  </p>
                  <DCAChart result={result} />
                </div>

                {/* ── Schedule table (collapsible) ── */}
                <div className="glass-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-black/20 dark:text-white/20">
                      {t('calculadoras.dca.schedule.title')}
                    </span>
                    <span className="text-xs font-mono text-black/30 dark:text-white/30">
                      {showSchedule ? t('calculadoras.dca.schedule.hide') : t('calculadoras.dca.schedule.show')}
                    </span>
                  </button>

                  {showSchedule && (
                    <div className="px-6 pb-6 max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="text-[9px] uppercase tracking-[0.15em] text-black/20 dark:text-white/20">
                            <th className="text-left py-2 font-normal">{t('calculadoras.dca.schedule.date')}</th>
                            <th className="text-right py-2 font-normal">{t('calculadoras.dca.schedule.price')}</th>
                            <th className="text-right py-2 font-normal">{t('calculadoras.dca.schedule.qty')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.schedule.map((item, i) => (
                            <tr
                              key={i}
                              className="border-t border-black/[0.04] dark:border-white/[0.04]"
                            >
                              <td className="py-2.5 text-black/60 dark:text-white/60">{formatDate(item.date)}</td>
                              <td className="py-2.5 text-right text-black/80 dark:text-white/80">{formatBRL(item.price)}</td>
                              <td className="py-2.5 text-right text-black/80 dark:text-white/80">{formatQty(item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
