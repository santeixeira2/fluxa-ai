import { ASSETS } from '@/config/assets.config';
import { fetchMarketDataYahoo } from '@/providers/yahoo.provider';
import { fetchCurrentPrice } from '@/providers/cryptocompare.provider';
import { fetchFiatRate } from '@/providers/exchangerate.provider';
import { getCached, setCached } from '@/utils/cache';

export type MarketCategory = 'indices' | 'crypto' | 'stocks' | 'br_stocks' | 'commodities' | 'currencies';

export interface MarketItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

const CACHE_TTL = 60_000;

const MARKET_GROUPS: Record<MarketCategory, string[]> = {
  indices:     ['ibovespa', 'sp500', 'nasdaq', 'dowjones', 'dax', 'ftse100', 'nikkei'],
  crypto:      ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'dogecoin'],
  stocks:      ['aapl', 'msft', 'nvda', 'tsla', 'amzn', 'googl', 'meta'],
  br_stocks:   ['petr4', 'vale3', 'itub4', 'bbdc4', 'bbas3', 'wege3'],
  commodities: ['gold', 'silver', 'oil', 'brent'],
  currencies:  ['usd-brl', 'eur-brl', 'gbp-brl', 'jpy-brl'],
};

async function fetchItem(id: string): Promise<MarketItem | null> {
  const cacheKey = `market:${id}`;
  const cached = getCached<MarketItem>(cacheKey);
  if (cached) return cached;

  const asset = ASSETS.find(a => a.id === id);
  if (!asset) return null;

  try {
    let item: MarketItem;

    if (asset.provider === 'yahoo') {
      const data = await fetchMarketDataYahoo(asset.yahooTicker!);
      item = {
        id, symbol: asset.symbol, name: asset.name,
        price: data.price,
        change: data.change ?? 0,
        changePercent: data.changePercent ?? 0,
        currency: data.currency,
      };
    } else if (asset.provider === 'cryptocompare') {
      const [priceBRL, priceYesterday] = await Promise.all([
        fetchCurrentPrice(id, 'BRL'),
        fetchCurrentPrice(id, 'BRL').then(p => p), // same call, use CryptoCompare 24h data below
      ]);
      // CryptoCompare doesn't give change% in a simple call — approximate from cached prev value
      const prevKey = `market:prev:${id}`;
      const prev = getCached<number>(prevKey) ?? priceBRL;
      const change = priceBRL - prev;
      const changePercent = prev > 0 ? (change / prev) * 100 : 0;
      setCached(prevKey, priceBRL, 24 * 60 * 60_000);
      item = { id, symbol: asset.symbol, name: asset.name, price: priceBRL, change, changePercent, currency: 'BRL' };
    } else {
      // forex — exchangerate has no change data
      const [from, to] = id.split('-');
      const rate = await fetchFiatRate(from.toUpperCase(), to.toUpperCase());
      item = { id, symbol: asset.symbol, name: asset.name, price: rate, change: 0, changePercent: 0, currency: to.toUpperCase() };
    }

    setCached(cacheKey, item, CACHE_TTL);
    return item;
  } catch {
    return null;
  }
}

export async function getMarkets(): Promise<Record<MarketCategory, MarketItem[]>> {
  const result = {} as Record<MarketCategory, MarketItem[]>;

  await Promise.all(
    (Object.entries(MARKET_GROUPS) as [MarketCategory, string[]][]).map(async ([category, ids]) => {
      const items = await Promise.allSettled(ids.map(fetchItem));
      result[category] = items
        .filter((r): r is PromiseFulfilledResult<MarketItem> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);
    })
  );

  return result;
}
