import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Select from '../components/Select';
import PortfolioChart from '../components/PortfolioChart';
import PriceChart from '../components/PriceChart';
import {
  getPortfolio, buyAsset, sellAsset, getPortfolioTransactions, getAssets,
  listAlerts, createAlert, deleteAlert,
} from '../api/client';
import type { Portfolio, PortfolioTransaction, AssetInfo, Alert, AlertType } from '../api/client';

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

type Tab = 'positions' | 'transactions' | 'alerts';
type TradeMode = 'buy' | 'sell';

// ── Trade Modal ────────────────────────────────────────────────────────────

interface TradeModalProps {
  mode: TradeMode;
  assetId?: string;
  maxQuantity?: number;
  assets: AssetInfo[];
  balance: number;
  onClose: () => void;
  onDone: () => void;
}

function TradeModal({ mode, assetId: initialAsset, maxQuantity, assets, balance, onClose, onDone }: TradeModalProps) {
  const { t } = useTranslation();
  const [assetId, setAssetId] = useState(initialAsset ?? '');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const num = parseFloat(value);
    if (!assetId || isNaN(num) || num <= 0) return setError(t('portfolio.tradeModal.fillFields'));
    setLoading(true);
    try {
      if (mode === 'buy') await buyAsset(assetId, num);
      else await sellAsset(assetId, num);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar operação.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 font-mono";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-black dark:text-white">
            {mode === 'buy' ? t('portfolio.tradeModal.buyTitle') : t('portfolio.tradeModal.sellTitle')}
          </h2>
          <button onClick={onClose} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1.5 block">{t('portfolio.tradeModal.asset')}</label>
            <Select
              value={assetId}
              onChange={v => { setAssetId(v); setValue(''); }}
              placeholder={t('portfolio.tradeModal.selectAsset')}
              options={assets.map(a => ({ value: a.id, label: a.name, sublabel: a.symbol }))}
            />
          </div>

          {mode === 'buy' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase">{t('portfolio.tradeModal.amountBRL')}</label>
                <button type="button" onClick={() => setValue(balance.toFixed(2))} className="text-[10px] font-mono text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
                  {t('portfolio.tradeModal.useAll')} · {fmtBRL(balance)}
                </button>
              </div>
              <input type="number" step="any" min="0" max={balance} value={value} onChange={e => setValue(e.target.value)} placeholder="R$ 0,00" className={inputCls} />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase">{t('portfolio.tradeModal.quantity')}</label>
                {maxQuantity != null && (
                  <button type="button" onClick={() => setValue(maxQuantity.toString())} className="text-[10px] font-mono text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
                    {t('portfolio.tradeModal.sellAll')} · {maxQuantity}
                  </button>
                )}
              </div>
              <input type="number" step="any" min="0" value={value} onChange={e => setValue(e.target.value)} placeholder="0.00000000" className={inputCls} />
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={loading} className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${mode === 'buy' ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-red-500 hover:bg-red-400 text-white'} disabled:opacity-50`}>
            {loading ? t('portfolio.tradeModal.processing') : mode === 'buy' ? t('portfolio.tradeModal.buyAtPrice') : t('portfolio.tradeModal.sellAtPrice')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Alerts Tab ─────────────────────────────────────────────────────────────

function AlertsTab({ assets }: { assets: AssetInfo[] }) {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState<AlertType>('PRICE_BELOW');
  const [threshold, setThreshold] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try { setAlerts(await listAlerts()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const val = parseFloat(threshold);
    if (!assetId || isNaN(val) || val <= 0) return setFormError(t('portfolio.alerts.fillFields'));
    setCreating(true);
    try {
      await createAlert(assetId, type, val);
      setThreshold(''); setAssetId('');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar alerta.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  const inputCls = "w-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 font-mono";

  const active = alerts.filter(a => a.active);
  const triggered = alerts.filter(a => !a.active);

  if (loading) return <div className="py-20 text-center text-sm text-black/30 dark:text-white/30 font-mono">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-4">{t('portfolio.alerts.newAlert')}</h3>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {([
            { value: 'PRICE_BELOW', label: t('portfolio.alerts.buyAlert'), desc: t('portfolio.alerts.buyDesc'), color: 'emerald' },
            { value: 'PRICE_ABOVE', label: t('portfolio.alerts.sellAlert'), desc: t('portfolio.alerts.sellDesc'), color: 'red' },
          ] as { value: AlertType; label: string; desc: string; color: string }[]).map(alertType => (
            <button key={alertType.value} type="button" onClick={() => setType(alertType.value)}
              className={`p-3 rounded-xl border text-left transition-all ${type === alertType.value
                ? alertType.color === 'emerald' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'
                : 'border-black/[0.06] dark:border-white/[0.06] hover:border-black/20 dark:hover:border-white/20'}`}>
              <p className={`text-sm font-bold ${type === alertType.value ? (alertType.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400') : ''}`}>{alertType.label}</p>
              <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">{alertType.desc}</p>
            </button>
          ))}
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1.5 block">{t('portfolio.alerts.assetLabel')}</label>
            <Select value={assetId} onChange={setAssetId} placeholder={t('portfolio.alerts.selectAsset')} options={assets.map(a => ({ value: a.id, label: a.name, sublabel: a.symbol }))} />
          </div>
          <div>
            <label className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase mb-1.5 block">{t('portfolio.alerts.targetPrice')}</label>
            <input type="number" step="any" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="R$ 0,00" className={inputCls} />
          </div>
          <button type="submit" disabled={creating} className="px-5 py-3 rounded-lg text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50 whitespace-nowrap">
            {creating ? t('portfolio.alerts.creating') : t('portfolio.alerts.create')}
          </button>
        </form>
        {formError && <p className="text-xs text-red-500 mt-3">{formError}</p>}
      </div>

      {/* Active */}
      <div>
        <p className="text-xs font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-3">
          {t('portfolio.alerts.active')} {active.length > 0 && `· ${active.length}`}
        </p>
        {active.length === 0 ? (
          <div className="text-center py-10 text-black/30 dark:text-white/30 border border-dashed border-black/[0.08] dark:border-white/[0.08] rounded-xl text-sm">
            {t('portfolio.alerts.noActive')}
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(alert => {
              const asset = assets.find(a => a.id === alert.asset_id);
              const isBuy = alert.type === 'PRICE_BELOW';
              return (
                <div key={alert.id} className="flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-xl px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {isBuy ? t('portfolio.alerts.buyAlert').toUpperCase() : t('portfolio.alerts.sellAlert').toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{asset?.name ?? alert.asset_id}</p>
                      <p className="text-xs text-black/40 dark:text-white/40 font-mono mt-0.5">
                        {isBuy ? t('portfolio.alerts.below') : t('portfolio.alerts.above')} {fmtBRL(Number(alert.threshold))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-black/30 dark:text-white/30 font-mono hidden sm:block">{fmtDate(alert.created_at)}</span>
                    <button onClick={() => handleDelete(alert.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Triggered history */}
      {triggered.length > 0 && (
        <div>
          <p className="text-xs font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-3">{t('portfolio.alerts.history')}</p>
          <div className="space-y-2">
            {triggered.map(alert => {
              const asset = assets.find(a => a.id === alert.asset_id);
              const isBuy = alert.type === 'PRICE_BELOW';
              const trigger = alert.alert_triggers[0];
              return (
                <div key={alert.id} className="flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] rounded-xl px-5 py-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {isBuy ? t('portfolio.alerts.buyAlert').toUpperCase() : t('portfolio.alerts.sellAlert').toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{asset?.name ?? alert.asset_id}</p>
                      <p className="text-xs text-black/40 dark:text-white/40 font-mono mt-0.5">
                        {trigger?.message ?? `Alvo: ${fmtBRL(Number(alert.threshold))}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-black/30 dark:text-white/30">
                    {alert.triggered_at ? fmtDate(alert.triggered_at) : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Portfolio Page ─────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [tab, setTab] = useState<Tab>('positions');
  const [loading, setLoading] = useState(true);
  const [trade, setTrade] = useState<{ mode: TradeMode; assetId?: string; maxQuantity?: number } | null>(null);
  const [chartAsset, setChartAsset] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([getPortfolio(), getAssets()]);
      setPortfolio(p);
      setAssets(a);
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadTransactions = useCallback(async () => {
    try { setTransactions(await getPortfolioTransactions()); }
    catch { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'transactions') loadTransactions(); }, [tab, loadTransactions]);

  function handleTradeDone() { setTrade(null); load(); }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center pt-[104px]">
        <Navbar />
        <div className="text-black/30 dark:text-white/30 text-sm font-mono">{t('common.loading')}</div>
      </div>
    );
  }

  if (!portfolio) return null;

  const pnlPositive = portfolio.totalPnl >= 0;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'positions',    label: t('portfolio.tabs.positions') },
    { id: 'transactions', label: t('portfolio.tabs.transactions') },
    { id: 'alerts',       label: t('portfolio.tabs.alerts') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pt-[104px]">
      <Navbar />

      <main className="max-w-[900px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <span className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase">{t('portfolio.badge')}</span>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mt-3">
            <div>
              <p className="text-4xl font-bold tracking-tight font-mono">{fmtBRL(portfolio.totalValue)}</p>
              <p className={`mt-1 text-sm font-mono ${pnlPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {pnlPositive ? '↗' : '↘'} {fmtBRL(portfolio.totalPnl)} ({fmtPct(portfolio.totalPnlPct)}) total
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTrade({ mode: 'buy' })} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity">
                {t('portfolio.buy')}
              </button>
              <button onClick={() => setTrade({ mode: 'sell' })} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                {t('portfolio.sell')}
              </button>
            </div>
          </div>
        </div>

        {/* Performance chart */}
        <div className="mb-8 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5">
          <PortfolioChart />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: t('portfolio.freeBalance'),    value: fmtBRL(portfolio.currentBalance) },
            { label: t('portfolio.initialCapital'), value: fmtBRL(portfolio.initialBalance) },
            { label: t('portfolio.positions'),       value: `${portfolio.positions.length}` },
          ].map(s => (
            <div key={s.label} className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-xl p-4">
              <p className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-1">{s.label}</p>
              <p className="text-lg font-bold font-mono">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-black/[0.06] dark:border-white/[0.06]">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Positions */}
        {tab === 'positions' && (
          portfolio.positions.length === 0 ? (
            <div className="text-center py-20 text-black/30 dark:text-white/30">
              <p className="text-3xl mb-3">—</p>
              <p className="text-sm">{t('portfolio.emptyPositions')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {portfolio.positions.map(pos => {
                const up = pos.pnl >= 0;
                return (
                  <div key={pos.assetId} className="flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-xl px-5 py-4 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors group cursor-pointer"
                    onClick={() => setChartAsset({ id: pos.assetId, name: pos.assetName })}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{pos.assetName}</p>
                      <p className="text-xs text-black/40 dark:text-white/40 font-mono mt-0.5">{pos.quantity} × {fmtBRL(pos.avgPrice)} avg</p>
                    </div>
                    <div className="text-right mx-6 hidden sm:block">
                      <p className="text-xs text-black/40 dark:text-white/40 font-mono">{t('portfolio.currentPrice')}</p>
                      <p className="text-sm font-mono">{fmtBRL(pos.currentPrice)}</p>
                    </div>
                    <div className="text-right mx-6">
                      <p className="text-sm font-bold font-mono">{fmtBRL(pos.currentValue)}</p>
                      <p className={`text-xs font-mono ${up ? 'text-emerald-500' : 'text-red-500'}`}>
                        {up ? '↗' : '↘'} {fmtBRL(pos.pnl)} ({fmtPct(pos.pnlPct)})
                      </p>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setTrade({ mode: 'buy', assetId: pos.assetId })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors">+</button>
                      <button onClick={() => setTrade({ mode: 'sell', assetId: pos.assetId, maxQuantity: pos.quantity })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors">−</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Transactions */}
        {tab === 'transactions' && (
          transactions.length === 0 ? (
            <div className="text-center py-20 text-black/30 dark:text-white/30">
              <p className="text-3xl mb-3">—</p>
              <p className="text-sm">{t('portfolio.emptyTransactions')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => {
                const isBuy = tx.type === 'BUY';
                const asset = assets.find(a => a.id === tx.assetId);
                return (
                  <div key={tx.id} className="flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-xl px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>{tx.type}</span>
                      <div>
                        <p className="text-sm font-medium">{asset?.name ?? tx.assetId}</p>
                        <p className="text-xs text-black/40 dark:text-white/40 font-mono">{tx.quantity} × {fmtBRL(tx.price)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono">{fmtBRL(tx.total)}</p>
                      <p className="text-xs text-black/30 dark:text-white/30 font-mono">{fmtDate(tx.executedAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Alerts */}
        {tab === 'alerts' && <AlertsTab assets={assets} />}
      </main>

      {/* Price chart drawer */}
      {chartAsset && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={() => setChartAsset(null)}>
          <div className="w-full max-w-[700px] bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">{chartAsset.name}</h2>
              <button onClick={() => setChartAsset(null)} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <PriceChart assetId={chartAsset.id} />
          </div>
        </div>
      )}

      {trade && (
        <TradeModal
          mode={trade.mode}
          assetId={trade.assetId}
          maxQuantity={trade.maxQuantity}
          assets={assets}
          balance={portfolio.currentBalance}
          onClose={() => setTrade(null)}
          onDone={handleTradeDone}
        />
      )}
    </div>
  );
}
