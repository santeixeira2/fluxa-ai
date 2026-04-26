import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import SimulatorContainer, { type SimFormData } from '../components/containers/SimulatorContainer';
import HistoricalCalculator from '../components/HistoricalCalculator';
import DCACalculator from '../components/DCACalculator';
import PriceChart from '../components/PriceChart';
import Reveal from '../components/Reveal';
import Select from '../components/Select';
import { getFiatRate, getPrice } from '../api/client';

// ── Currency data ─────────────────────────────────────────────────────────────

const FIAT_CURRENCIES = [
  { code: 'BRL', name: 'Real Brasileiro',      symbol: 'R$'   },
  { code: 'USD', name: 'Dólar Americano',       symbol: '$'    },
  { code: 'EUR', name: 'Euro',                  symbol: '€'    },
  { code: 'GBP', name: 'Libra Esterlina',       symbol: '£'    },
  { code: 'JPY', name: 'Iene Japonês',          symbol: '¥'    },
  { code: 'CAD', name: 'Dólar Canadense',       symbol: 'C$'   },
  { code: 'AUD', name: 'Dólar Australiano',     symbol: 'A$'   },
  { code: 'CHF', name: 'Franco Suíço',          symbol: 'Fr'   },
  { code: 'MXN', name: 'Peso Mexicano',         symbol: 'MX$'  },
  { code: 'ARS', name: 'Peso Argentino',        symbol: 'AR$'  },
  { code: 'CLP', name: 'Peso Chileno',          symbol: 'CLP'  },
  { code: 'COP', name: 'Peso Colombiano',       symbol: 'COP'  },
  { code: 'PEN', name: 'Sol Peruano',           symbol: 'S/'   },
  { code: 'UYU', name: 'Peso Uruguaio',         symbol: '$U'   },
  { code: 'BOB', name: 'Boliviano',             symbol: 'Bs.'  },
  { code: 'PYG', name: 'Guarani Paraguaio',     symbol: '₲'    },
  { code: 'VES', name: 'Bolívar Venezuelano',   symbol: 'Bs.S' },
  { code: 'GTQ', name: 'Quetzal Guatemalteco',  symbol: 'Q'    },
  { code: 'CRC', name: 'Colón Costarriquenho',  symbol: '₡'    },
  { code: 'DOP', name: 'Peso Dominicano',       symbol: 'RD$'  },
  { code: 'HNL', name: 'Lempira Hondurenho',    symbol: 'L'    },
  { code: 'PAB', name: 'Balboa Panamenho',      symbol: 'B/.'  },
  { code: 'NIO', name: 'Córdoba Nicaraguense',  symbol: 'C$'   },
];

const CRYPTO_CURRENCIES = [
  { code: 'BTC',  name: 'Bitcoin',    assetId: 'bitcoin'     },
  { code: 'ETH',  name: 'Ethereum',   assetId: 'ethereum'    },
  { code: 'SOL',  name: 'Solana',     assetId: 'solana'      },
  { code: 'BNB',  name: 'BNB',        assetId: 'binancecoin' },
  { code: 'XRP',  name: 'XRP',        assetId: 'ripple'      },
  { code: 'ADA',  name: 'Cardano',    assetId: 'cardano'     },
  { code: 'AVAX', name: 'Avalanche',  assetId: 'avalanche'   },
  { code: 'DOGE', name: 'Dogecoin',   assetId: 'dogecoin'    },
  { code: 'DOT',  name: 'Polkadot',   assetId: 'polkadot'    },
  { code: 'MATIC',name: 'Polygon',    assetId: 'polygon'     },
  { code: 'LINK', name: 'Chainlink',  assetId: 'chainlink'   },
  { code: 'UNI',  name: 'Uniswap',    assetId: 'uniswap'     },
  { code: 'LTC',  name: 'Litecoin',   assetId: 'litecoin'    },
  { code: 'XLM',  name: 'Stellar',    assetId: 'stellar'     },
  { code: 'SHIB', name: 'Shiba Inu',  assetId: 'shiba-inu'   },
];

// Maps converter currency code → chart asset id
const CURRENCY_CHART_MAP: Record<string, string> = {
  USD: 'usd-brl', EUR: 'eur-brl', GBP: 'gbp-brl', JPY: 'jpy-brl',
  CAD: 'cad-brl', AUD: 'aud-brl', CHF: 'chf-brl',
  MXN: 'mxn-brl', ARS: 'ars-brl', CLP: 'clp-brl',
  COP: 'cop-brl', PEN: 'pen-brl', UYU: 'uyu-brl',
  BTC: 'bitcoin',  ETH: 'ethereum',  SOL: 'solana',
  BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano',
  AVAX: 'avalanche', DOGE: 'dogecoin', DOT: 'polkadot',
  MATIC: 'polygon', LINK: 'chainlink', UNI: 'uniswap',
  LTC: 'litecoin', XLM: 'stellar', SHIB: 'shiba-inu',
};

function cryptoAssetId(code: string) {
  return CRYPTO_CURRENCIES.find(c => c.code === code)?.assetId;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: 'converter', labelKey: 'calculadoras.nav.converter' },
  { id: 'chart',     labelKey: 'calculadoras.nav.chart'     },
  { id: 'simulator', labelKey: 'calculadoras.nav.simulator' },
  { id: 'historico', labelKey: 'calculadoras.nav.historical'},
  { id: 'dca',       labelKey: 'calculadoras.nav.dca'       },
];

function CalcSidebar({ active }: { active: string }) {
  const { t } = useTranslation();
  return (
    <aside className="hidden lg:flex flex-col gap-0.5 sticky top-[120px] self-start pt-24 pr-6">
      <p className="text-[9px] font-mono tracking-[0.2em] text-black/20 dark:text-white/20 uppercase mb-4">
        {t('nav.calculadoras')}
      </p>
      {NAV_SECTIONS.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`flex items-center gap-2.5 text-xs font-mono py-1.5 transition-colors ${
            active === s.id 
              ? 'text-black dark:text-white' 
              : 'text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full transition-all flex-shrink-0 ${
            active === s.id 
              ? 'bg-black dark:bg-white scale-125' 
              : 'bg-black/15 dark:bg-white/15'
          }`} />
          {t(s.labelKey)}
        </a>
      ))}
    </aside>
  );
}

// ── Currency Converter ────────────────────────────────────────────────────────

type ConverterTab = 'forex' | 'crypto';

const CONVERTER_DEFAULTS: Record<ConverterTab, { from: string; to: string }> = {
  forex:  { from: 'USD', to: 'BRL' },
  crypto: { from: 'BTC', to: 'BRL' },
};

interface ConverterProps {
  onChartChange: (assetId: string) => void;
}

function CurrencyConverter({ onChartChange }: ConverterProps) {
  const { t } = useTranslation();
  const [tab,    setTab]    = useState<ConverterTab>('forex');
  const [from,   setFrom]   = useState('USD');
  const [to,     setTo]     = useState('BRL');
  const [amount, setAmount] = useState('1');
  const [rate,   setRate]   = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset currencies when tab changes
  useEffect(() => {
    const { from: f, to: t } = CONVERTER_DEFAULTS[tab];
    setFrom(f);
    setTo(t);
    setRate(null);
  }, [tab]);

  const fromOptions = (tab === 'forex' ? FIAT_CURRENCIES : CRYPTO_CURRENCIES).map(c => ({
    value: c.code,
    label: c.name,
    sublabel: c.code,
  }));

  const toOptions = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES].map(c => ({
    value: c.code,
    label: c.name,
    sublabel: c.code,
  }));

  const convert = useCallback(async () => {
    if (from === to) { setRate(1); return; }
    setLoading(true);
    try {
      const fromId = cryptoAssetId(from);
      const toId   = cryptoAssetId(to);
      let r: number;
      if (!fromId && !toId) {
        r = (await getFiatRate(from, to)).rate;
      } else if (fromId && !toId) {
        r = (await getPrice(fromId, to.toLowerCase())).price;
      } else if (!fromId && toId) {
        const p = (await getPrice(toId, from.toLowerCase())).price;
        r = 1 / p;
      } else {
        const [fp, tp] = await Promise.all([
          getPrice(fromId!, 'usd'),
          getPrice(toId!,   'usd'),
        ]);
        r = fp.price / tp.price;
      }
      setRate(r);
    } catch { setRate(null); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { convert(); }, [convert]);

  // Notify parent so chart stays in sync
  useEffect(() => {
    const assetId = CURRENCY_CHART_MAP[from] ?? CURRENCY_CHART_MAP[to] ?? 'usd-brl';
    onChartChange(assetId);
  }, [from, to, onChartChange]);

  const result = rate != null && amount ? Number(amount) * rate : null;
  const allCurrencies = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];
  const toInfo   = allCurrencies.find(c => c.code === to);
  const fromInfo = allCurrencies.find(c => c.code === from);
  const toSymbol = toInfo && 'symbol' in toInfo ? (toInfo as (typeof FIAT_CURRENCIES)[0]).symbol : to;

  function swap() { setFrom(to); setTo(from); }

  const formatResult = (v: number) =>
    v < 0.01
      ? v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 8 })
      : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <section className="py-24 px-6 max-w-[900px] mx-auto" id="converter">
      <Reveal delay={0}>
        <div className="text-center mb-16">
          <span className="section-label">{t('calculadoras.converter.badge')}</span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2 text-black dark:text-white">{t('calculadoras.converter.headline')}</h2>
          <p className="text-black/40 dark:text-white/40 mt-3 text-sm">{t('calculadoras.converter.subheadline')}</p>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <div className="glass-card p-10 max-w-[600px] mx-auto">
          {/* Pill Tabs */}
          <div className="flex gap-1 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] p-1 rounded-full w-fit mb-10 px-2 mx-auto">
            {(['forex', 'crypto'] as ConverterTab[]).map(tabKey => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setTab(tabKey)}
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

          {/* Amount */}
          <div className="mb-6">
            <label className="text-[10px] font-mono tracking-widest uppercase text-black/30 dark:text-white/30 mb-2 block ml-4">
              {t('calculadoras.converter.amount')}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] rounded-2xl px-6 py-4 text-2xl font-bold text-black dark:text-white focus:outline-none focus:border-black/30 dark:focus:border-white/30 font-mono transition-colors"
              placeholder="0"
            />
          </div>

          {/* From / Swap / To */}
          <div className="flex items-end gap-3 mb-8">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-mono tracking-widest uppercase text-black/30 dark:text-white/30 block ml-4">
                {t('calculadoras.converter.from')}
              </label>
              <Select
                variant="glass"
                value={from}
                onChange={setFrom}
                options={fromOptions}
              />
            </div>

            <button
              type="button"
              onClick={swap}
              className="mb-[2px] w-10 h-[54px] flex items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-all active:scale-95 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </button>

            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-mono tracking-widest uppercase text-black/30 dark:text-white/30 block ml-4">
                {t('calculadoras.converter.to')}
              </label>
              <Select
                variant="glass"
                value={to}
                onChange={setTo}
                options={toOptions}
              />
            </div>
          </div>

          {/* Result */}
          <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-6 text-center transition-all">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
                <p className="text-black/30 dark:text-white/30 font-mono text-sm">{t('calculadoras.converter.fetching')}</p>
              </div>
            ) : result != null ? (
              <>
                <p className="text-black/40 dark:text-white/40 text-sm font-mono mb-1">
                  {amount} {from} =
                </p>
                <p className="text-4xl font-bold font-mono text-black dark:text-white break-all">
                  {toSymbol} {formatResult(result)}
                </p>
                <p className="text-black/30 dark:text-white/30 text-xs font-mono mt-2">
                  1 {fromInfo?.code} = {rate != null ? formatResult(rate) : '—'} {toInfo?.code}
                </p>
              </>
            ) : (
              <p className="text-black/30 dark:text-white/30 font-mono text-sm">{t('calculadoras.converter.unavailable')}</p>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalculadorasPage() {
  const { t } = useTranslation();
  const [prefill, setPrefill] = useState<SimFormData | null>(null);
  const [chartAsset, setChartAsset] = useState('usd-brl');
  const [activeSection, setActiveSection] = useState('converter');

  const handleChartChange = useCallback((assetId: string) => {
    setChartAsset(assetId);
  }, []);

  // Scroll spy for sidebar
  useEffect(() => {
    const ids = ['converter', 'chart', 'simulator', 'historico', 'dca'];
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { threshold: 0.25 },
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col pt-[104px] selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navbar />

      <div className="flex-1 max-w-[1400px] mx-auto w-full px-6">
        <div className="grid grid-cols-1 lg:grid-cols-8">

          {/* Sidebar — 2 cols */}
          <CalcSidebar active={activeSection} />

          {/* Content — 6 cols */}
          <main className="col-span-1 lg:col-span-6 min-w-0">
            <CurrencyConverter onChartChange={handleChartChange} />

            <section className="py-12 px-6 border-t border-black/[0.05] dark:border-white/[0.05]" id="chart">
              <Reveal delay={0}>
                <div className="text-center mb-10">
                  <span className="section-label">{t('calculadoras.chart.badge')}</span>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2 text-black dark:text-white">{t('calculadoras.chart.headline')}</h2>
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
              onAssetChange={handleChartChange}
            />

            <HistoricalCalculator />

            <DCACalculator />
          </main>

        </div>
      </div>

      <footer className="py-12 border-t border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-black">
        <p className="text-center text-[11px] font-mono text-black/20 dark:text-white/20 uppercase tracking-widest">
          © {new Date().getFullYear()} Fluxa
        </p>
      </footer>
    </div>
  );
}
