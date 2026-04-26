import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createChart, ColorType, CrosshairMode, LineSeries, type IChartApi } from 'lightweight-charts';
import Select from './Select';
import { getComparison } from '../api/client';
import type { AssetInfo, ComparisonPeriod, ComparisonResult, ComparisonAsset } from '../api/client';

const PERIODS: ComparisonPeriod[] = ['1M', '1Y', '5Y'];

const COLOR_A = '#10b981'; // emerald
const COLOR_B = '#3b82f6'; // blue

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtNum = (n: number) => n.toFixed(2);

interface Props {
  assets: AssetInfo[];
}

export default function ComparisonTab({ assets }: Props) {
  const { t } = useTranslation();
  const [idA, setIdA] = useState<string>('bitcoin');
  const [idB, setIdB] = useState<string>('ethereum');
  const [period, setPeriod] = useState<ComparisonPeriod>('1Y');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!idA || !idB || idA === idB) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getComparison(idA, idB, period)
      .then(r => { if (!cancelled) setResult(r); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : t('portfolio.compare.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [idA, idB, period, t]);

  const optionsA = assets
    .filter(a => a.id !== idB)
    .map(a => ({ value: a.id, label: a.name, sublabel: a.symbol }));
  const optionsB = assets
    .filter(a => a.id !== idA)
    .map(a => ({ value: a.id, label: a.name, sublabel: a.symbol }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: COLOR_A }} />
              {t('portfolio.compare.assetA')}
            </label>
            <Select value={idA} onChange={setIdA} options={optionsA} />
          </div>
          <div>
            <label className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: COLOR_B }} />
              {t('portfolio.compare.assetB')}
            </label>
            <Select value={idB} onChange={setIdB} options={optionsB} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase">
            {t('portfolio.compare.period')}
          </p>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  period === p
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-sm text-black/40 dark:text-white/40 font-mono">
          {t('portfolio.compare.loading')}
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-20 text-sm text-red-500 font-mono">{error}</div>
      )}

      {result && !loading && !error && (
        <>
          <MetricsGrid a={result.assets[0]} b={result.assets[1]} />
          <CorrelationBanner value={result.correlation} />
          <ComparisonChart result={result} />
        </>
      )}
    </div>
  );
}

// ── Metrics ──────────────────────────────────────────────────────────────────

interface MetricsGridProps {
  a: ComparisonAsset;
  b: ComparisonAsset;
}

function MetricsGrid({ a, b }: MetricsGridProps) {
  const { t } = useTranslation();
  const rows: { key: keyof ComparisonAsset['metrics']; label: string; format: (n: number) => string; tone?: 'pos-neg' | 'always-neg' }[] = [
    { key: 'totalReturn',   label: t('portfolio.compare.totalReturn'),   format: fmtPct, tone: 'pos-neg' },
    { key: 'annualizedVol', label: t('portfolio.compare.annualizedVol'), format: (n) => `${n.toFixed(2)}%` },
    { key: 'sharpe',        label: t('portfolio.compare.sharpe'),        format: fmtNum, tone: 'pos-neg' },
    { key: 'maxDrawdown',   label: t('portfolio.compare.maxDrawdown'),   format: fmtPct, tone: 'always-neg' },
  ];

  const toneClass = (value: number, tone?: 'pos-neg' | 'always-neg') => {
    if (tone === 'always-neg') return 'text-red-500';
    if (tone === 'pos-neg') return value >= 0 ? 'text-emerald-500' : 'text-red-500';
    return '';
  };

  return (
    <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase">
          {t('portfolio.compare.metric')}
        </span>
        <div className="text-right flex items-center justify-end gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: COLOR_A }} />
          <span className="text-sm font-bold truncate">{a.name}</span>
        </div>
        <div className="text-right flex items-center justify-end gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: COLOR_B }} />
          <span className="text-sm font-bold truncate">{b.name}</span>
        </div>
      </div>
      {rows.map(row => {
        const va = a.metrics[row.key];
        const vb = b.metrics[row.key];
        return (
          <div key={row.key} className="grid grid-cols-3 gap-3 px-5 py-3 border-b last:border-b-0 border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-xs font-mono text-black/50 dark:text-white/50">{row.label}</span>
            <span className={`text-right text-sm font-mono font-bold ${toneClass(va, row.tone)}`}>{row.format(va)}</span>
            <span className={`text-right text-sm font-mono font-bold ${toneClass(vb, row.tone)}`}>{row.format(vb)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Correlation banner ──────────────────────────────────────────────────────

function CorrelationBanner({ value }: { value: number }) {
  const { t } = useTranslation();
  const abs = Math.abs(value);
  const strength = abs < 0.3 ? 'weak' : abs < 0.7 ? 'moderate' : 'strong';
  const sign = value < 0 ? 'negative' : 'positive';
  const desc = t(`portfolio.compare.correlation.${strength}_${sign}`);

  const tone =
    strength === 'strong' && sign === 'positive'
      ? 'border-amber-500/30 bg-amber-500/[0.06] text-amber-600 dark:text-amber-400'
      : strength === 'strong' && sign === 'negative'
      ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-600 dark:text-emerald-400'
      : 'border-black/[0.06] dark:border-white/[0.06] bg-black/[0.03] dark:bg-white/[0.03] text-black/70 dark:text-white/70';

  return (
    <div className={`rounded-2xl border px-5 py-4 ${tone}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono tracking-widest uppercase opacity-70 mb-1">
            {t('portfolio.compare.correlation.label')}
          </p>
          <p className="text-sm">{desc}</p>
        </div>
        <p className="text-2xl font-mono font-bold">{value.toFixed(2)}</p>
      </div>
    </div>
  );
}

// ── Chart ───────────────────────────────────────────────────────────────────

function ComparisonChart({ result }: { result: ComparisonResult }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = document.documentElement.classList.contains('dark');
    const bg = isDark ? '#000000' : '#ffffff';
    const text = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const grid = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 320,
    });
    chartRef.current = chart;

    const seriesA = chart.addSeries(LineSeries, { color: COLOR_A, lineWidth: 2, priceLineVisible: false });
    const seriesB = chart.addSeries(LineSeries, { color: COLOR_B, lineWidth: 2, priceLineVisible: false });

    seriesA.setData(result.assets[0].series.map(p => ({ time: p.time as unknown as string, value: p.normalized })));
    seriesB.setData(result.assets[1].series.map(p => ({ time: p.time as unknown as string, value: p.normalized })));

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) chart.applyOptions({ width: w });
    });
    ro.observe(containerRef.current);

    return () => { chart.remove(); ro.disconnect(); };
  }, [result]);

  return (
    <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase">
          {t('portfolio.compare.chartTitle')}
        </p>
        <p className="text-[10px] font-mono text-black/30 dark:text-white/30">
          {t('portfolio.compare.chartHint')}
        </p>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
    </div>
  );
}
