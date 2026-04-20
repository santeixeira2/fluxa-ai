import { fetchCurrentPrice, fetchCurrentPriceBatch, fetchHistoricalPriceFromCC, fetchOHLCV, type ChartPeriod } from '../providers/cryptocompare.provider';
import { fetchCurrentPriceYahoo, fetchHistoricalPriceYahoo, fetchOHLCVYahoo } from '../providers/yahoo.provider';
import { fetchFiatRate } from '../providers/exchangerate.provider';
import { getAsset } from '../config/assets.config';
import { getCached, setCached } from '../utils/cache';

const PRICE_TTL_MS    = 60_000;
const HISTORY_TTL_MS  = 86_400_000;

// USD/BRL rate used for converting Yahoo USD prices to BRL
async function getUsdBrl(): Promise<number> {
    const key = 'fiat:USD:BRL';
    const cached = getCached<number>(key);
    if (cached != null) return cached;
    const rate = await fetchFiatRate('USD', 'BRL');
    setCached(key, rate, PRICE_TTL_MS);
    return rate;
}

export async function getPrice(assetId: string, currency: string): Promise<number> {
    const cacheKey = `price:${assetId}:${currency}`;
    const cached = getCached<number>(cacheKey);
    if (cached != null) return cached;

    const asset = getAsset(assetId);
    let price: number;

    if (asset?.provider === 'exchangerate') {
        // assetId format: "usd-brl", "eur-brl" → split to from/to
        const [from, to] = assetId.split('-');
        price = await fetchFiatRate(from.toUpperCase(), (to ?? currency).toUpperCase());
    } else if (asset?.provider === 'yahoo') {
        const { price: rawPrice, currency: rawCurrency } = await fetchCurrentPriceYahoo(asset.yahooTicker!);
        if (rawCurrency === 'USD' && currency.toUpperCase() === 'BRL') {
            const rate = await getUsdBrl();
            price = rawPrice * rate;
        } else {
            price = rawPrice;
        }
    } else {
        price = await fetchCurrentPrice(assetId, currency);
    }

    setCached(cacheKey, price, PRICE_TTL_MS);
    return price;
}

export async function getPriceBatch(assetIds: string[], currency: string): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const ccUncached: string[] = [];
    const yahooUncached: string[] = [];

    for (const id of assetIds) {
        const cached = getCached<number>(`price:${id}:${currency}`);
        if (cached != null) {
            result[id] = cached;
            continue;
        }
        const asset = getAsset(id);
        if (asset?.provider === 'yahoo') {
            yahooUncached.push(id);
        } else {
            ccUncached.push(id);
        }
    }

    const tasks: Promise<void>[] = [];

    if (ccUncached.length > 0) {
        tasks.push(
            fetchCurrentPriceBatch(ccUncached, currency).then(prices => {
                for (const [id, price] of Object.entries(prices)) {
                    setCached(`price:${id}:${currency}`, price, PRICE_TTL_MS);
                    result[id] = price;
                }
            })
        );
    }

    if (yahooUncached.length > 0) {
        const usdBrlTask = currency.toUpperCase() === 'BRL' ? getUsdBrl() : Promise.resolve(1);
        tasks.push(
            usdBrlTask.then(async rate => {
                await Promise.allSettled(
                    yahooUncached.map(id => {
                        const asset = getAsset(id)!;
                        return fetchCurrentPriceYahoo(asset.yahooTicker!).then(({ price, currency: rawCur }) => {
                            const final = rawCur === 'USD' && currency.toUpperCase() === 'BRL' ? price * rate : price;
                            setCached(`price:${id}:${currency}`, final, PRICE_TTL_MS);
                            result[id] = final;
                        });
                    })
                );
            })
        );
    }

    await Promise.allSettled(tasks);
    return result;
}

export async function getHistoricalPrice(assetId: string, date: string, currency: string): Promise<number> {
    const cacheKey = `history:${assetId}:${date}:${currency}`;
    const cached = getCached<number>(cacheKey);
    if (cached != null) return cached;

    const asset = getAsset(assetId);
    let price: number;

    if (asset?.provider === 'yahoo') {
        const { price: rawPrice, currency: rawCurrency } = await fetchHistoricalPriceYahoo(asset.yahooTicker!, date);
        if (rawCurrency === 'USD' && currency.toUpperCase() === 'BRL') {
            // Get historical USD/BRL rate via CryptoCompare
            const usdBrlHistorical = await fetchHistoricalPriceFromCC('USD', date, 'BRL');
            price = rawPrice * usdBrlHistorical;
        } else {
            price = rawPrice;
        }
    } else {
        price = await fetchHistoricalPriceFromCC(assetId, date, currency);
    }

    setCached(cacheKey, price, HISTORY_TTL_MS);
    return price;
}

export async function getChartData(assetId: string, period: ChartPeriod, currency: string) {
    const asset = getAsset(assetId);
    if (!asset) throw new Error('Asset not found');

    const cacheKey = `chart:${assetId}:${period}:${currency}`;
    const ttl = period === '1D' ? 5 * 60_000 : 60 * 60_000;

    type Point = { time: number; open: number; high: number; low: number; close: number };
    const cached = getCached<Point[]>(cacheKey);
    if (cached) return cached;

    let points: Point[];

    if (asset.provider === 'yahoo') {
        const { points: raw, currency: rawCurrency } = await fetchOHLCVYahoo(asset.yahooTicker!, period);
        if (rawCurrency === 'USD' && currency.toUpperCase() === 'BRL') {
            const rate = await getUsdBrl();
            points = raw.map(p => ({ ...p, open: p.open * rate, high: p.high * rate, low: p.low * rate, close: p.close * rate }));
        } else {
            points = raw;
        }
    } else if (asset.provider === 'cryptocompare') {
        points = await fetchOHLCV(assetId, period, currency);
    } else {
        throw new Error('Chart not available for this asset');
    }

    setCached(cacheKey, points, ttl);
    return points;
}

export async function getFiatRate(from: string, to: string): Promise<number> {
    const cacheKey = `fiat:${from}:${to}`;
    const cached = getCached<number>(cacheKey);
    if (cached != null) return cached;
    const rate = await fetchFiatRate(from.toUpperCase(), to.toUpperCase());
    setCached(cacheKey, rate, PRICE_TTL_MS);
    return rate;
}
