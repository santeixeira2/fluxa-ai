import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createChart, ColorType, CrosshairMode, LineStyle, AreaSeries } from 'lightweight-charts';
import { getPortfolioPerformance } from '../api/client';
import type { PerformancePoint } from '../api/client';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PortfolioChart() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<PerformancePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPortfolioPerformance()
      .then(setPoints)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return;

    const isDark = document.documentElement.classList.contains('dark');
    const bg = isDark ? '#000000' : '#ffffff';
    const text = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const grid = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

    const first = Number(points[0].totalValue);
    const last = Number(points[points.length - 1].totalValue);
    const isProfit = last >= first;
    const lineColor = isProfit ? '#10b981' : '#ef4444';

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 200,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: `${lineColor}30`,
      bottomColor: `${lineColor}05`,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: true,
    });

    series.setData(points.map(p => ({
      time: Math.floor(new Date(p.timestamp).getTime() / 1000) as unknown as string,
      value: Number(p.totalValue),
    })));

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) chart.applyOptions({ width: w });
    });
    ro.observe(containerRef.current);

    return () => { chart.remove(); ro.disconnect(); };
  }, [points]);

  if (loading) return (
    <div className="h-[200px] flex items-center justify-center text-xs font-mono text-black/30 dark:text-white/30">
      {t('common.loading')}
    </div>
  );

  if (points.length < 2) return (
    <div className="h-[200px] flex flex-col items-center justify-center text-black/20 dark:text-white/20">
      <p className="text-2xl mb-2">—</p>
      <p className="text-xs font-mono">{t('common.noData')}</p>
    </div>
  );

  const first = Number(points[0].totalValue);
  const last = Number(points[points.length - 1].totalValue);
  const pnl = last - first;
  const pnlPct = (pnl / first) * 100;

  return (
    <div className="w-full">
      <div className="flex items-baseline gap-3 mb-3">
        <p className="text-xs font-mono tracking-widest text-black/30 dark:text-white/30 uppercase">{t('common.performance')}</p>
        <span className={`text-xs font-mono font-bold ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {pnl >= 0 ? '+' : ''}{fmtBRL(pnl)} ({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
        </span>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
    </div>
  );
}
