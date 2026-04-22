import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { simulateHistorical, type HistoricalSimulationResult } from '../api/client';
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

export default function HistoricalCalculator() {
  const { t } = useTranslation();
  const { assets } = useAssets();
  const [tab, setTab] = useState<TabType>('crypto');
  const [asset, setAsset] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [investment, setInvestment] = useState('');

  const api = useApi<HistoricalSimulationResult>();

  const grouped = useMemo(() => {
    const result: Record<TabType, { value: string; label: string; minDate: string }[]> = { crypto: [], stocks: [], forex: [] };
    for (const a of assets) {
      const t = (Object.entries(TAB_TYPES).find(([, types]) => types.includes(a.type))?.[0] ?? 'stocks') as TabType;
      result[t].push({ value: a.id, label: `${a.name} (${a.symbol})`, minDate: a.minDate });
    }
    return result;
  }, [assets]);

  // Set default asset when tab changes or assets load
  useEffect(() => {
    const list = grouped[tab];
    if (list.length > 0 && (!asset || !list.find(a => a.value === asset))) {
      setAsset(list[0].value);
      setPurchaseDate('');
    }
  }, [tab, grouped]);

  const today = new Date().toISOString().split('T')[0];
  const minDate = grouped[tab].find(a => a.value === asset)?.minDate ?? '2010-01-01';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const inv = parseFloat(investment);
    if (!inv || inv <= 0 || !purchaseDate) return;

    await api.execute(() =>
      simulateHistorical({
        asset,
        purchaseDate,
        investment: inv,
        currency: 'brl',
      })
    );
  }

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const result = api.data;
  const isProfit = result ? result.profit >= 0 : false;

  return (
    <section className="py-24 px-6 max-w-[1200px] mx-auto border-t border-white/[0.05]" id="historico">
      <Reveal delay={0}>
        <div className="text-center mb-16">
          <span className="section-label">{t('calculadoras.historical.badge')}</span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">{t('calculadoras.historical.headline')}</h2>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
        <Reveal delay={150} className="h-full">
          <div className="glass-card p-10 flex flex-col h-full">
           {/* Custom Pill Tabs */}
           <div className="flex gap-1 bg-white/[0.03] border border-white/[0.05] p-1 rounded-full w-fit mb-10 px-2 mx-auto sm:mx-0">
            {(['crypto', 'stocks', 'forex'] as TabType[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => { setTab(tabKey); setPurchaseDate(''); }}
                className={`px-6 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                  tab === tabKey ? 'bg-white text-black shadow-lg' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {t(`calculadoras.simulator.tabs.${tabKey}`)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8 flex-1">
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 ml-4">{t('calculadoras.historical.selectAsset')}</label>
              <Select
                variant="glass"
                value={asset}
                onChange={v => { setAsset(v); setPurchaseDate(''); }}
                options={grouped[tab]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 ml-4">{t('calculadoras.historical.purchaseDate')}</label>
                <input 
                  type="date"
                  min={minDate}
                  max={today}
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-white/30 color-scheme-dark h-[54px]"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 ml-4">{t('calculadoras.historical.investment')}</label>
                <input 
                  type="number" 
                  placeholder="0,00"
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                  value={investment}
                  onChange={e => setInvestment(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={api.loading}
              className="mt-4 w-full bg-white text-black font-bold py-5 rounded-2xl transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 shadow-glow"
            >
              {api.loading ? t('calculadoras.historical.calculating') : t('calculadoras.historical.calculate')}
            </button>
          </form>
        </div>
        </Reveal>

        {/* Result Area */}
        <Reveal delay={300} className="h-full">
          <div className="glass-card p-10 flex flex-col justify-center min-h-[400px]">
          {!result ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-white/[0.05] flex items-center justify-center mb-6 text-2xl text-white/10">
                ◌
              </div>
              <p className="text-sm font-mono tracking-tighter text-white/20 uppercase">{t('calculadoras.historical.awaiting')}</p>
            </div>
          ) : (
             <div className="animate-fade space-y-8">
              <div className="flex justify-between items-end border-b border-white/[0.05] pb-8 flex-wrap gap-6">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/30">{t('calculadoras.historical.currentAppraisal')}</span>
                  <div className="text-5xl font-bold tracking-tighter mt-2">
                    {formatBRL(result.currentValue)}
                  </div>
                </div>
                <div className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isProfit ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/10'}`} />
                  <span className="text-xs font-bold font-mono tracking-tighter">
                    {isProfit ? '+' : ''}{result.roi.toFixed(2)}% RET
                  </span>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.05] p-6 rounded-3xl">
                <p className="text-sm text-white/40 leading-relaxed font-medium">
                  {t('calculadoras.historical.resultSentence', { amount: formatBRL(parseFloat(investment)), asset: asset.toUpperCase(), date: formatDate(result.purchaseDate) })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 px-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-white/20">{t('calculadoras.historical.purchasePrice')}</span>
                  <span className="font-mono text-white/80 text-sm">{formatBRL(result.priceAtPurchase)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-white/20">{t('calculadoras.historical.marketPrice')}</span>
                  <span className="font-mono text-white/80 text-sm">{formatBRL(result.currentPrice)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-white/20">{t('calculadoras.historical.totalPnl')}</span>
                  <span className={`font-mono text-sm font-bold ${isProfit ? 'text-white' : 'text-white/40'}`}>
                    {isProfit ? '+' : ''}{formatBRL(result.profit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        </Reveal>
      </div>
    </section>
  );
}
