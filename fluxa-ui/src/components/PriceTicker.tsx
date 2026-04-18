import { useEffect, useState, useCallback } from 'react';
import { getPriceBatch, getFiatRate } from '../api/client';

const ASSETS = [
  { id: 'bitcoin',  symbol: 'BTC', name: 'Bitcoin',   color: '#FFFFFF' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum',  color: '#FFFFFF' },
  { id: 'solana',   symbol: 'SOL', name: 'Solana',    color: '#FFFFFF' },
  { id: 'aapl', symbol: 'AAPL', name: 'Apple', color: '#FFFFFF', priceOverride: 914.50 },
  { id: 'tsla', symbol: 'TSLA', name: 'Tesla', color: '#FFFFFF', priceOverride: 1102.30 },
];

export default function PriceTicker() {
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

  const allItems = [
    { id: 'usd', symbol: 'USD', name: 'Dólar', isUSD: true, price: usdRate || null },
    ...ASSETS.map(a => ({
      ...a,
      isUSD: false,
      price: a.priceOverride || prices[a.id]
    }))
  ];

  const items = [...allItems, ...allItems, ...allItems, ...allItems];

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="w-full border-b border-white/[0.05] bg-white/[0.01] overflow-hidden py-2" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
      <div className="animate-ticker flex items-center">
        {items.map((item, i) => {
          const isUp = i % 2 === 0;
          return (
            <div key={`${item.id}-${i}`} className="flex items-center gap-10 px-8 whitespace-nowrap">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase">{item.symbol}</span>
                <span className="font-mono text-sm text-white/90">
                  {item.price ? formatCurrency(item.price) : '—'}
                </span>
                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${isUp ? 'text-[#00ff9d] bg-[#00ff9d]/10' : 'text-[#ff4d4d] bg-[#ff4d4d]/10'}`}>
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
