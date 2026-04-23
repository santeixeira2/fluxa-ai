import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, type IChartApi } from 'lightweight-charts';
import { getChartData } from '../api/client';
import type { ChartPeriod } from '../api/client';
import RegimeBadge from './RegimeBadge';

const PERIODS: ChartPeriod[] = ['1D', '1W', '1M', '1Y', '5Y'];

interface Props {
  assetId: string;
  assetName?: string;
}

export default function PriceChart({ assetId, assetName }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [period, setPeriod] = useState<ChartPeriod>('1M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = document.documentElement.classList.contains('dark');
    const bg = isDark ? '#000000' : '#ffffff';
    const text = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const grid = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const upColor = '#10b981';
    const downColor = '#ef4444';

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 300,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    setLoading(true);
    setError(false);

    getChartData(assetId, period)
      .then(data => {
        candleSeries.setData(data.map(d => ({
          time: d.time as unknown as string,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })));
        chart.timeScale().fitContent();
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) chart.applyOptions({ width: w });
    });
    ro.observe(containerRef.current);

    return () => { chart.remove(); ro.disconnect(); };
  }, [assetId, period]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-1.5">
          {assetName && <p className="text-sm font-bold text-black dark:text-white">{assetName}</p>}
          <RegimeBadge assetId={assetId} />
        </div>
        <div className="flex gap-1 ml-auto">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
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

      {/* Chart */}
      <div className="relative">
        <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl">
            <p className="text-xs font-mono text-black/30 dark:text-white/30">{t('common.loading')}</p>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs font-mono text-black/30 dark:text-white/30">{t('common.chartNoData')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
