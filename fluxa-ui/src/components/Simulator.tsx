import { useState, useEffect, useMemo } from 'react';
import { simulate, type SimulationResult } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAssets } from '../hooks/useAssets';
import Reveal from './Reveal';

export interface SimFormData {
  asset: string;
  investment: string;
  futurePrice: string;
}

interface SimulatorProps {
  prefill?: SimFormData | null;
  onPrefillConsumed?: () => void;
}

type TabType = 'crypto' | 'stocks' | 'forex';

const TAB_TYPES: Record<TabType, string[]> = {
  crypto: ['crypto'],
  stocks: ['stock', 'br_stock', 'etf', 'commodity'],
  forex:  ['forex'],
};

export default function Simulator({ prefill, onPrefillConsumed }: SimulatorProps) {
  const { assets } = useAssets();
  const [tab, setTab] = useState<TabType>('crypto');

  const grouped = useMemo(() => {
    const result: Record<TabType, { value: string; label: string }[]> = { crypto: [], stocks: [], forex: [] };
    for (const a of assets) {
      const tab = (Object.entries(TAB_TYPES).find(([, types]) => types.includes(a.type))?.[0] ?? 'stocks') as TabType;
      result[tab].push({ value: a.id, label: `${a.name} (${a.symbol})` });
    }
    return result;
  }, [assets]);

  const [asset, setAsset] = useState('');
  const [investment, setInvestment] = useState('');
  const [futurePrice, setFuturePrice] = useState('');

  const simApi = useApi<SimulationResult>();

  // Set default asset when tab changes or assets load
  useEffect(() => {
    const list = grouped[tab];
    if (list.length > 0 && (!asset || !list.find(a => a.value === asset))) {
      setAsset(list[0].value);
    }
  }, [tab, grouped]);

  // Handle prefill from AI
  useEffect(() => {
    if (!prefill) return;
    if (prefill.asset) {
      const allOptions = Object.entries(grouped);
      for (const [t, list] of allOptions) {
        const match = list.find(a =>
          a.value.toLowerCase() === prefill.asset?.toLowerCase() ||
          a.label.toLowerCase().includes(prefill.asset?.toLowerCase() ?? '')
        );
        if (match) { setTab(t as TabType); setAsset(match.value); break; }
      }
    }
    if (prefill.investment) setInvestment(prefill.investment);
    if (prefill.futurePrice) setFuturePrice(prefill.futurePrice);
    const timer = setTimeout(() => onPrefillConsumed?.(), 50);
    return () => clearTimeout(timer);
  }, [prefill, onPrefillConsumed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const inv = parseFloat(investment);
    const fp  = parseFloat(futurePrice);
    if (!inv || !fp) return;

    await simApi.execute(() =>
      simulate({ asset, investment: inv, futurePrice: fp, currency: 'brl' })
    );
  }

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const result = simApi.data;
  const isProfit = result && result.profit >= 0;

  return (
    <section className="py-24 px-6 max-w-[1200px] mx-auto border-t border-white/[0.05]" id="simulator">
      <Reveal delay={0}>
        <div className="text-center mb-16">
          <span className="section-label">[ Investment Tool ]</span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">Manage Assets.</h2>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
        {/* ── Dashboard Card ── */}
        <Reveal delay={150} className="h-full">
          <div className="glass-card p-10 flex flex-col h-full">
          {/* Custom Pill Tabs */}
          <div className="flex gap-1 bg-white/[0.03] border border-white/[0.05] p-1 rounded-full w-fit mb-10 px-2 mx-auto sm:mx-0">
            {['crypto', 'stocks', 'forex'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t as TabType); }}
                className={`px-6 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                  tab === t ? 'bg-white text-black shadow-lg' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8 flex-1">
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 ml-4">Select Asset</label>
              <select 
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-white/30 appearance-none cursor-pointer"
                value={asset}
                onChange={e => setAsset(e.target.value)}
              >
                {grouped[tab].map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-black text-white">{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 ml-4">Investment (BRL)</label>
                <input 
                  type="number"
                  placeholder="0,00"
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                  value={investment}
                  onChange={e => setInvestment(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 ml-4">Target Price (BRL)</label>
                <input 
                  type="number"
                  placeholder="0,00"
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                  value={futurePrice}
                  onChange={e => setFuturePrice(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={simApi.loading}
              className="mt-4 w-full bg-white text-black font-bold py-5 rounded-2xl transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 shadow-glow"
            >
              {simApi.loading ? 'Simulating...' : 'Calculate Projection'}
            </button>
          </form>
        </div>
        </Reveal>

        {/* ── Projection/Result Card ── */}
        <Reveal delay={300} className="h-full">
          <div className="glass-card p-10 flex flex-col justify-center min-h-[400px]">
          {!result ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-white/[0.05] flex items-center justify-center mb-6 text-2xl text-white/10">
                ○
              </div>
              <p className="text-sm font-mono tracking-tighter text-white/20 uppercase">Awaiting Simulation Parameters</p>
            </div>
          ) : (
            <div className="space-y-10 animate-fade">
              <div className="flex justify-between items-end border-b border-white/[0.05] pb-10 flex-wrap gap-6">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/30">Projected Portfolio</span>
                  <div className="text-5xl font-bold tracking-tighter mt-2">
                    {formatBRL(result.finalValue)}
                  </div>
                </div>
                <div className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isProfit ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/20'}`} />
                  <span className="text-xs font-bold font-mono tracking-tighter">
                    {isProfit ? '+' : ''}{result.roi.toFixed(2)}% ROI
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/[0.05] rounded-3xl overflow-hidden border border-white/[0.05]">
                {[
                  { label: 'Current Price', value: formatBRL(result.currentPrice) },
                  { label: 'Projection', value: formatBRL(parseFloat(futurePrice)) },
                  { label: 'P&L Realized', value: (isProfit ? '+' : '') + formatBRL(result.profit) },
                  { label: 'Market Weight', value: '1.24x Leverage' }
                ].map((item, i) => (
                  <div key={i} className="bg-[#050505] p-6 flex flex-col gap-1">
                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/20">{item.label}</span>
                    <span className="text-sm font-bold text-white/80">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </Reveal>
      </div>
    </section>
  );
}
