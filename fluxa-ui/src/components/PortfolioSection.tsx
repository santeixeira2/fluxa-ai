import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getPriceBatch, getFiatRate } from '../api/client';
import Sparkline, { generateSparkData } from './Sparkline';

const CRYPTO_ASSETS = [
  { id: 'bitcoin',  symbol: 'BTC', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 'solana',   symbol: 'SOL', color: '#9945FF' },
] as const;

const WATCHLIST_ASSETS = [
  { id: 'bitcoin',  symbol: 'BTC', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 'solana',   symbol: 'SOL', color: '#9945FF' },
] as const;

const ALL_IDS = [...new Set([...CRYPTO_ASSETS, ...WATCHLIST_ASSETS].map(a => a.id))];

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PortfolioSection() {
  const { t } = useTranslation();
  const [prices, setPrices]   = useState<Record<string, number>>({});
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate sparkline data once per mount (simulated price history)
  const sparkData = useMemo(() => {
    const map: Record<string, number[]> = {};
    ALL_IDS.forEach(id => {
      map[id] = generateSparkData(30, 0.04, id === 'bitcoin' ? 0.003 : 0.001);
    });
    map['usd'] = generateSparkData(30, 0.008, 0.001);
    return map;
  }, []);

  // Simulated % changes
  const changes = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(sparkData).forEach(([id, data]) => {
      const first = data[0];
      const last = data[data.length - 1];
      map[id] = ((last - first) / first) * 100;
    });
    return map;
  }, [sparkData]);

  const fetchPrices = useCallback(async () => {
    try {
      const [batchResult, fiatResult] = await Promise.allSettled([
        getPriceBatch(ALL_IDS, 'brl'),
        getFiatRate('USD', 'BRL'),
      ]);
      if (batchResult.status === 'fulfilled') setPrices(batchResult.value.prices);
      if (fiatResult.status  === 'fulfilled') setUsdRate(fiatResult.value.rate);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Total portfolio value (simulated)
  const totalValue = useMemo(() => {
    const vals = CRYPTO_ASSETS.map(a => prices[a.id] || 0);
    // Simulate a realistic portfolio value based on prices
    return vals.reduce((sum, p) => sum + p * (0.05 + Math.random() * 0.02), 0);
  }, [prices]);

  const totalChange = 8.76;

  return (
    <section className="portfolio-section" id="portfolio">
      {/* ── Portfolio Header ── */}
      <div className="portfolio-header">
        <div className="portfolio-header-left">
          <div className="portfolio-label">{t('portfolioSection.totalPortfolio')}</div>
          <div className="portfolio-value mono">
            {loading ? (
              <span className="shimmer-loading" style={{ width: 200, height: 36, display: 'inline-block' }}>&nbsp;</span>
            ) : (
              formatBRL(totalValue)
            )}
          </div>
          <div className="portfolio-change positive">
            <span>↗</span> +{totalChange.toFixed(2)}%
          </div>
        </div>
        <div className="portfolio-actions">
          <button className="portfolio-btn portfolio-btn-deposit" id="btn-deposit">
            <span>⊕</span> {t('portfolioSection.deposit')}
          </button>
          <button className="portfolio-btn portfolio-btn-withdraw" id="btn-withdraw">
            <span>↗</span> {t('portfolioSection.withdraw')}
          </button>
        </div>
      </div>

      {/* ── My Portfolio Cards (like AAPL/TSLA in the prototype) ── */}
      <div className="portfolio-cards-section">
        <div className="portfolio-cards-header">
          <span className="portfolio-cards-title">{t('portfolioSection.myPortfolio')}</span>
          <span className="portfolio-cards-showall">{t('portfolioSection.showAll')}</span>
        </div>
        <div className="portfolio-cards-grid">
          {CRYPTO_ASSETS.map((asset) => {
            const price = prices[asset.id];
            const change = changes[asset.id] || 0;
            const isUp = change >= 0;

            return (
              <div className="portfolio-card" key={asset.id}>
                <div className="portfolio-card-top">
                  <div className="portfolio-card-icon" style={{ background: asset.color }}>
                    {asset.symbol.charAt(0)}
                  </div>
                  <div className="portfolio-card-meta">
                    <span className="portfolio-card-symbol">{asset.symbol}</span>
                    <span className="portfolio-card-name">{t(`portfolioSection.assets.${asset.id}`)}</span>
                  </div>
                </div>
                <div className="portfolio-card-chart">
                  <Sparkline
                    data={sparkData[asset.id]}
                    width={120}
                    height={40}
                    color={isUp ? 'var(--color-profit)' : 'var(--color-loss)'}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="portfolio-card-bottom">
                  <span className="portfolio-card-price mono">
                    {loading && !price ? t('common.dash') : price ? formatBRL(price) : t('common.dash')}
                  </span>
                  <span className={`portfolio-card-change ${isUp ? 'up' : 'down'}`}>
                    {isUp ? '↗' : '↘'} {isUp ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* USD card */}
          <div className="portfolio-card">
            <div className="portfolio-card-top">
              <div className="portfolio-card-icon" style={{ background: '#22C55E' }}>$</div>
              <div className="portfolio-card-meta">
                <span className="portfolio-card-symbol">USD</span>
                <span className="portfolio-card-name">{t('portfolioSection.assets.usd')}</span>
              </div>
            </div>
            <div className="portfolio-card-chart">
              <Sparkline
                data={sparkData['usd']}
                width={120}
                height={40}
                color={(changes['usd'] || 0) >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'}
                strokeWidth={1.5}
              />
            </div>
            <div className="portfolio-card-bottom">
              <span className="portfolio-card-price mono">
                {loading && !usdRate ? t('common.dash') : usdRate ? formatBRL(usdRate) : t('common.dash')}
              </span>
              <span className={`portfolio-card-change ${(changes['usd'] || 0) >= 0 ? 'up' : 'down'}`}>
                {(changes['usd'] || 0) >= 0 ? '↗' : '↘'} {(changes['usd'] || 0) >= 0 ? '+' : ''}{(changes['usd'] || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Watchlist (rows with sparklines) ── */}
      <div className="watchlist-section">
        <div className="portfolio-cards-header">
          <span className="portfolio-cards-title">{t('portfolioSection.myWatchlist')}</span>
          <span className="portfolio-cards-showall">{t('portfolioSection.showAll')}</span>
        </div>
        <div className="watchlist-rows">
          {WATCHLIST_ASSETS.map((asset) => {
            const price = prices[asset.id];
            const change = changes[asset.id] || 0;
            const isUp = change >= 0;

            return (
              <div className="watchlist-row" key={`watch-${asset.id}`}>
                <div className="watchlist-row-left">
                  <div className="watchlist-row-icon" style={{ background: asset.color }}>
                    {asset.symbol.charAt(0)}
                  </div>
                  <div className="watchlist-row-meta">
                    <span className="watchlist-row-symbol">{asset.symbol}</span>
                    <span className="watchlist-row-name">{t(`portfolioSection.assets.${asset.id}`)}</span>
                  </div>
                </div>
                <div className="watchlist-row-spark">
                  <Sparkline
                    data={sparkData[asset.id]}
                    width={72}
                    height={28}
                    color={isUp ? 'var(--color-profit)' : 'var(--color-loss)'}
                    fill={false}
                    strokeWidth={1.2}
                  />
                </div>
                <div className="watchlist-row-right">
                  <span className="watchlist-row-price mono">
                    {loading && !price ? t('common.dash') : price ? formatBRL(price) : t('common.dash')}
                  </span>
                  <span className={`watchlist-row-change ${isUp ? 'up' : 'down'}`}>
                    {isUp ? '↗' : '↘'} {isUp ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
