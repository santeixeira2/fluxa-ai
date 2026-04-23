import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getPriceBatch, getFiatRate } from '../api/client';

const ASSET_IDS = [
  { id: 'bitcoin',  symbol: 'BTC', color: '#FFFFFF' },
  { id: 'ethereum', symbol: 'ETH', color: '#FFFFFF' },
  { id: 'solana',   symbol: 'SOL', color: '#FFFFFF' },
  { id: 'aapl', symbol: 'AAPL', color: '#FFFFFF', priceOverride: 914.50 },
  { id: 'tsla', symbol: 'TSLA', color: '#FFFFFF', priceOverride: 1102.30 },
] as const;

export default function PriceTicker() {
  const { t } = useTranslation();
  const [prices, setPrices]   = useState<Record<string, number>>({});
  const [usdRate, setUsdRate] = useState<number | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const [batchResult, fiatResult] = await Promise.allSettled([
        getPriceBatch(['bitcoin', 'ethereum', 'solana'], 'brl'),
        getFiatRate('USD', 'BRL'),
      ]);
      if (batchResult.status === 'fulfilled') setPrices(batchResult.value.prices);
      if (fiatResult.status  === 'fulfilled') setUsdRate(fiatResult.value.rate);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const allItems = useMemo(
    () => [
      { id: 'usd' as const, symbol: 'USD', name: t('priceTicker.assets.usd'), isUSD: true, price: usdRate || null },
      ...ASSET_IDS.map(a => ({
        ...a,
        name: t(`priceTicker.assets.${a.id}`),
        isUSD: false as const,
        price: 'priceOverride' in a && a.priceOverride != null ? a.priceOverride : prices[a.id],
      })),
    ],
    [t, usdRate, prices]
  );

  const items = useMemo(() => [...allItems, ...allItems, ...allItems, ...allItems], [allItems]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div 
      className="w-full border-b border-black/[0.05] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] overflow-hidden py-2" 
      style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
    >
      <div className="animate-ticker flex items-center no-theme-transition">
        {items.map((item, i) => {
          const isUp = i % 2 === 0;
          return (
            <div key={`${item.id}-${i}`} className="flex items-center gap-10 px-8 whitespace-nowrap">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase">{item.symbol}</span>
                <span className="font-mono text-sm text-black/80 dark:text-white/90">
                  {item.price ? formatCurrency(item.price) : t('common.dash')}
                </span>
                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${isUp ? 'text-emerald-600 dark:text-[#00ff9d] bg-emerald-500/10 dark:bg-[#00ff9d]/10' : 'text-red-600 dark:text-[#ff4d4d] bg-red-500/10 dark:bg-[#ff4d4d]/10'}`}>
                  {isUp ? '↑' : '↓'} {(Math.random() * 2).toFixed(2)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
