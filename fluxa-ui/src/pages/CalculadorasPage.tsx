import { useState, useCallback, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SimulatorContainer, { type SimFormData } from '../components/containers/SimulatorContainer';
import HistoricalCalculator from '../components/HistoricalCalculator';
import PriceChart from '../components/PriceChart';
import Reveal from '../components/Reveal';
import { getFiatRate } from '../api/client';

// ── Currency Converter ──────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$' },
  { code: 'USD', name: 'Dólar Americano', symbol: '$' },
  { code: 'EUR', name: 'Euro',            symbol: '€' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£' },
  { code: 'JPY', name: 'Iene Japonês',    symbol: '¥' },
];

function CurrencyConverter() {
  const [from, setFrom] = useState('USD');
  const [to,   setTo]   = useState('BRL');
  const [amount, setAmount] = useState('1');
  const [rate,   setRate]   = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const convert = useCallback(async () => {
    if (from === to) { setRate(1); return; }
    setLoading(true);
    try {
      const res = await getFiatRate(from, to);
      setRate(res.rate);
    } catch { setRate(null); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { convert(); }, [convert]);

  const result = rate != null && amount ? Number(amount) * rate : null;
  const toCur = CURRENCIES.find(c => c.code === to);
  const fromCur = CURRENCIES.find(c => c.code === from);

  function swap() { setFrom(to); setTo(from); }

  const selectCls = "flex-1 bg-white/[0.03] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 appearance-none cursor-pointer";

  return (
    <section className="py-24 px-6 max-w-[900px] mx-auto" id="converter">
      <Reveal delay={0}>
        <div className="text-center mb-16">
          <span className="section-label">[ Conversor ]</span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">Câmbio em tempo real.</h2>
          <p className="text-white/40 mt-3 text-sm">Taxas atualizadas automaticamente.</p>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <div className="glass-card p-10 max-w-[600px] mx-auto">
          {/* Amount */}
          <div className="mb-6">
            <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 mb-2 block">Valor</label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl px-6 py-4 text-2xl font-bold text-white focus:outline-none focus:border-white/30 font-mono"
              placeholder="0"
            />
          </div>

          {/* From / Swap / To */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1">
              <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 mb-2 block">De</label>
              <select value={from} onChange={e => setFrom(e.target.value)} className={selectCls}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code} className="bg-black">{c.code} — {c.name}</option>)}
              </select>
            </div>

            <button
              onClick={swap}
              className="mt-6 w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </button>

            <div className="flex-1">
              <label className="text-[10px] font-mono tracking-widest uppercase text-white/30 mb-2 block">Para</label>
              <select value={to} onChange={e => setTo(e.target.value)} className={selectCls}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code} className="bg-black">{c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Result */}
          <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-6 text-center">
            {loading ? (
              <p className="text-white/30 font-mono text-sm">Buscando taxa...</p>
            ) : result != null ? (
              <>
                <p className="text-white/40 text-sm font-mono mb-1">
                  {amount} {from} =
                </p>
                <p className="text-4xl font-bold font-mono text-white">
                  {toCur?.symbol}{result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
                <p className="text-white/30 text-xs font-mono mt-2">
                  1 {fromCur?.code} = {rate?.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {toCur?.code}
                </p>
              </>
            ) : (
              <p className="text-white/30 font-mono text-sm">Taxa indisponível.</p>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CalculadorasPage() {
  const [prefill, setPrefill] = useState<SimFormData | null>(null);
  const [chartAsset, setChartAsset] = useState('bitcoin');

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col pt-[104px] selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navbar />

      <main className="flex-1">
        <CurrencyConverter />

        {/* Price chart — sincronizado com o simulador */}
        <section className="py-12 px-6 max-w-[1200px] mx-auto border-t border-white/[0.05]">
          <Reveal delay={0}>
            <div className="text-center mb-10">
              <span className="section-label">[ Gráfico ]</span>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">Preço em tempo real.</h2>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="glass-card p-8">
              <PriceChart assetId={chartAsset} />
            </div>
          </Reveal>
        </section>

        <SimulatorContainer
          prefill={prefill}
          onPrefillConsumed={() => setPrefill(null)}
          onAssetChange={setChartAsset}
        />

        <HistoricalCalculator />
      </main>

      <footer className="py-12 border-t border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-black">
        <p className="text-center text-[11px] font-mono text-black/20 dark:text-white/20 uppercase tracking-widest">
          © {new Date().getFullYear()} Fluxa
        </p>
      </footer>
    </div>
  );
}
