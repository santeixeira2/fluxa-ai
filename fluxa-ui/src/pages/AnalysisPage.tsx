import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import ComparisonTab from '../components/ComparisonTab';
import Select from '../components/Select';
import { getAssets, getRegime, getRiskAnalysis } from '../api/client';
import type { AssetInfo, RegimeResult, RiskResult } from '../api/client';

type Tab = 'risk' | 'compare' | 'regime';

// ── Risk Tab ────────────────────────────────────────────────────────────────

function RiskTab() {
  const { t } = useTranslation();
  const [result, setResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getRiskAnalysis()
      .then(setResult)
      .catch(e => setError(e instanceof Error ? e.message : t('portfolio.riskTab.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return (
    <div className="space-y-3 pt-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] animate-pulse" />
      ))}
    </div>
  );

  if (error) return (
    <div className="py-20 text-center text-sm text-red-500 font-mono">{error}</div>
  );

  if (!result) return null;

  const stats = [
    { label: t('portfolio.riskTab.annualizedVol'), value: `${(result.annualizedVol * 100).toFixed(1)}%`, tone: 'neutral' as const },
    { label: t('portfolio.riskTab.annualizedReturn'), value: `${result.annualizedReturn >= 0 ? '+' : ''}${(result.annualizedReturn * 100).toFixed(1)}%`, tone: (result.annualizedReturn >= 0 ? 'pos' : 'neg') as 'pos' | 'neg' },
    { label: t('portfolio.riskTab.sharpe'), value: result.sharpe.toFixed(2), tone: (result.sharpe >= 1 ? 'pos' : result.sharpe >= 0 ? 'neutral' : 'neg') as 'pos' | 'neg' | 'neutral' },
    { label: t('portfolio.riskTab.marketFactor'), value: `${(result.marketFactorExposure * 100).toFixed(1)}%`, tone: 'neutral' as const },
  ];

  return (
    <div className="space-y-6">
      <p className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase">
        ✦ {t('portfolio.riskTab.title')}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-xl p-4">
            <p className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-1">{s.label}</p>
            <p className={`text-lg font-bold font-mono ${s.tone === 'pos' ? 'text-emerald-500' : s.tone === 'neg' ? 'text-red-500' : ''}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
        <p className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-4">
          {t('portfolio.riskTab.riskByAsset')}
        </p>
        <div className="space-y-3">
          {result.assetContributions
            .slice()
            .sort((a, b) => b.riskContribution - a.riskContribution)
            .map(ac => {
              const pct = Math.max(0, ac.riskContribution * 100);
              return (
                <div key={ac.ticker}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-mono text-black/60 dark:text-white/60">{ac.ticker}</span>
                    <span className="text-xs font-mono text-black/40 dark:text-white/40">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-[3px] rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-blue-400/70" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {result.stressLoss !== null && (
        <div className="border border-red-500/20 bg-red-500/[0.03] rounded-2xl p-5">
          <p className="text-[10px] font-mono tracking-widest text-red-500/60 uppercase mb-2">
            {t('portfolio.riskTab.stressTest', { period: result.stressPeriod })}
          </p>
          <p className="text-2xl font-bold font-mono text-red-500">
            {(result.stressLoss * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-black/40 dark:text-white/40 mt-1">
            {t('portfolio.riskTab.stressDesc')}
          </p>
        </div>
      )}
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

function RegimeTab({ assets }: { assets: AssetInfo[] }) {
  const { t } = useTranslation();
  const [assetId, setAssetId] = useState('');
  const [result, setResult] = useState<RegimeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-6">
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
        <label className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-2 block">
          {t('analysis.regime.selectAsset')}
        </label>
        <Select
          value={assetId}
          onChange={setAssetId}
          placeholder={t('analysis.regime.selectAsset')}
          options={assets.map(a => ({ value: a.id, label: a.name, sublabel: a.symbol }))}
        />
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-32 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] animate-pulse" />
          <div className="h-20 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] animate-pulse" />
        </div>
      )}

      {error && !loading && (
        <div className="py-10 text-center text-sm text-red-500 font-mono">{error}</div>
      )}

      {result && !loading && style && (
        <>
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
            <div className="grid grid-cols-3 gap-3">
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
        </>
      )}

      {!assetId && !loading && (
        <div className="py-20 text-center text-black/30 dark:text-white/30 text-sm">
          {t('analysis.regime.hint')}
        </div>
      )}
    </div>
  );
}

// ── Analysis Page ───────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('risk');
  const [assets, setAssets] = useState<AssetInfo[]>([]);

  useEffect(() => {
    getAssets().then(setAssets).catch(() => {});
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'risk',    label: t('analysis.tabs.risk') },
    { id: 'compare', label: t('analysis.tabs.compare') },
    { id: 'regime',  label: t('analysis.tabs.regime') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pt-[104px]">
      <Navbar />
      <main className="max-w-[900px] mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase">
            {t('analysis.badge')}
          </span>
          <h1 className="text-4xl font-bold tracking-tight mt-3">{t('analysis.title')}</h1>
          <p className="text-sm text-black/40 dark:text-white/40 mt-2">{t('analysis.subtitle')}</p>
        </div>

        <div className="flex gap-1 mb-6 border-b border-black/[0.06] dark:border-white/[0.06]">
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

        {tab === 'risk'    && <RiskTab />}
        {tab === 'compare' && <ComparisonTab assets={assets} />}
        {tab === 'regime'  && <RegimeTab assets={assets} />}
      </main>
    </div>
  );
}
