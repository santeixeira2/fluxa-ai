import axios from 'axios';

const clientV2 = axios.create({
    baseURL: 'https://min-api.cryptocompare.com/data/v2',
    timeout: 10_000,
});

const clientV1 = axios.create({
    baseURL: 'https://min-api.cryptocompare.com/data',
    timeout: 10_000,
});

// Maps CoinGecko-style asset IDs to CryptoCompare symbols
const SYMBOL_MAP: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    solana: 'SOL',
    cardano: 'ADA',
    dogecoin: 'DOGE',
    litecoin: 'LTC',
    polkadot: 'DOT',
    avalanche: 'AVAX',
    polygon: 'MATIC',
    'shiba-inu': 'SHIB',
};

interface HistodayResponse {
    Response: string;
    Message?: string;
    Data: {
        Data: Array<{
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
        }>;
    };
}

export interface OHLCVPoint {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export type ChartPeriod = '1D' | '1W' | '1M' | '1Y' | '5Y';

export function toSymbol(assetId: string): string {
    return SYMBOL_MAP[assetId.toLowerCase()] ?? assetId.toUpperCase();
}

export async function fetchCurrentPrice(
    assetId: string,
    currency: string,
): Promise<number> {
    const symbol = toSymbol(assetId);
    const tsym = currency.toUpperCase();
    const { data } = await clientV1.get<Record<string, Record<string, number>>>('/price', {
        params: { fsym: symbol, tsyms: tsym },
    });
    const price = data[tsym] as unknown as number;
    if (price == null) throw new Error(`Price not found for ${symbol}/${tsym}`);
    return price;
}

export async function fetchCurrentPriceBatch(
    assetIds: string[],
    currency: string,
): Promise<Record<string, number>> {
    const tsym = currency.toUpperCase();
    const symbols = assetIds.map(toSymbol);
    const { data } = await clientV1.get<Record<string, Record<string, number>>>('/pricemulti', {
        params: { fsyms: symbols.join(','), tsyms: tsym },
    });
    const result: Record<string, number> = {};
    for (let i = 0; i < assetIds.length; i++) {
        const price = data[symbols[i]]?.[tsym];
        if (price != null) result[assetIds[i]] = price;
    }
    return result;
}

export async function fetchOHLCV(
    assetId: string,
    period: ChartPeriod,
    currency: string,
): Promise<OHLCVPoint[]> {
    const symbol = toSymbol(assetId);
    const tsym = currency.toUpperCase();

    const configs: Record<ChartPeriod, { endpoint: string; limit: number; aggregate?: number }> = {
        '1D': { endpoint: 'histominute', limit: 288, aggregate: 5 },
        '1W': { endpoint: 'histohour',   limit: 168 },
        '1M': { endpoint: 'histoday',    limit: 30 },
        '1Y': { endpoint: 'histoday',    limit: 365 },
        '5Y': { endpoint: 'histoday',    limit: 1825 },
    };

    const { endpoint, limit, aggregate } = configs[period];

    const { data } = await clientV2.get<HistodayResponse>(`/${endpoint}`, {
        params: { fsym: symbol, tsym, limit, ...(aggregate ? { aggregate } : {}) },
    });

    if (data.Response !== 'Success') throw new Error(`CryptoCompare: ${data.Message}`);

    return data.Data.Data
        .filter(p => p.close > 0)
        .map(p => ({ time: p.time, open: p.open, high: p.high, low: p.low, close: p.close }));
}

export async function fetchHistoricalPriceFromCC(
    assetId: string,
    isoDate: string, // YYYY-MM-DD
    currency: string,
): Promise<number> {
    const symbol = toSymbol(assetId);
    const tsym = currency.toUpperCase();

    // Convert YYYY-MM-DD to Unix timestamp (midnight UTC)
    const toTs = Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);

    const { data } = await clientV2.get<HistodayResponse>('/histoday', {
        params: { fsym: symbol, tsym, limit: 1, toTs },
    });

    if (data.Response !== 'Success') {
        throw new Error(`CryptoCompare error: ${data.Message ?? 'Unknown error'}`);
    }

    const points = data.Data.Data;
    const point = points[points.length - 1];

    if (!point || point.close === 0) {
        throw new Error(`No historical price data for ${symbol} on ${isoDate}`);
    }

    return point.close;
}
