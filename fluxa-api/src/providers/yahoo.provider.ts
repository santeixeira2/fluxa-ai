import axios from 'axios';

const client = axios.create({
    baseURL: 'https://query1.finance.yahoo.com/v8/finance',
    timeout: 10_000,
    headers: {
        'User-Agent': 'Mozilla/5.0',
    },
});

interface YahooChartResponse {
    chart: {
        result: Array<{
            meta: {
                regularMarketPrice: number;
                currency: string;
            };
            timestamp: number[];
            indicators: {
                quote: Array<{
                    open:   (number | null)[];
                    high:   (number | null)[];
                    low:    (number | null)[];
                    close:  (number | null)[];
                }>;
            };
        }> | null;
        error?: { description: string };
    };
}

export interface YahooOHLCVPoint {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export type YahooPeriod = '1D' | '1W' | '1M' | '1Y' | '5Y';

export async function fetchOHLCVYahoo(ticker: string, period: YahooPeriod): Promise<{ points: YahooOHLCVPoint[]; currency: string }> {
    const configs: Record<YahooPeriod, { interval: string; range: string }> = {
        '1D': { interval: '5m',  range: '1d' },
        '1W': { interval: '1h',  range: '5d' },
        '1M': { interval: '1d',  range: '1mo' },
        '1Y': { interval: '1d',  range: '1y' },
        '5Y': { interval: '1wk', range: '5y' },
    };
    const { interval, range } = configs[period];

    const { data } = await client.get<YahooChartResponse>(`/chart/${ticker}`, {
        params: { interval, range },
    });

    const result = data.chart.result?.[0];
    if (!result) throw new Error(`Yahoo Finance: no data for ${ticker}`);

    const quote = result.indicators.quote[0];
    const timestamps = result.timestamp ?? [];

    const points: YahooOHLCVPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open[i], h = quote.high[i], l = quote.low[i], c = quote.close[i];
        if (o == null || h == null || l == null || c == null) continue;
        points.push({ time: timestamps[i], open: o, high: h, low: l, close: c });
    }

    return { points, currency: result.meta.currency };
}

export async function fetchCurrentPriceYahoo(ticker: string): Promise<{ price: number; currency: string }> {
    const { data } = await client.get<YahooChartResponse>(`/chart/${ticker}`, {
        params: { interval: '1d', range: '1d' },
    });

    const result = data.chart.result?.[0];
    if (!result) throw new Error(`Yahoo Finance: no data for ${ticker}`);

    return {
        price: result.meta.regularMarketPrice,
        currency: result.meta.currency,
    };
}

export async function fetchHistoricalPriceYahoo(ticker: string, isoDate: string): Promise<{ price: number; currency: string }> {
    // Fetch a 5-day window around the target date to handle weekends/holidays
    const target = new Date(`${isoDate}T12:00:00Z`);
    const period1 = Math.floor((target.getTime() - 4 * 86_400_000) / 1000);
    const period2 = Math.floor((target.getTime() + 86_400_000) / 1000);

    const { data } = await client.get<YahooChartResponse>(`/chart/${ticker}`, {
        params: { interval: '1d', period1, period2 },
    });

    const result = data.chart.result?.[0];
    if (!result) throw new Error(`Yahoo Finance: no historical data for ${ticker} on ${isoDate}`);

    const closes = result.indicators.quote[0]?.close ?? [];
    const timestamps = result.timestamp ?? [];

    // Find the closest trading day to the target date
    const targetTs = target.getTime() / 1000;
    let bestIdx = -1;
    let bestDiff = Infinity;

    for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] == null) continue;
        const diff = Math.abs(timestamps[i] - targetTs);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
        }
    }

    if (bestIdx === -1) throw new Error(`No trading data for ${ticker} near ${isoDate}`);

    return {
        price: closes[bestIdx]!,
        currency: result.meta.currency,
    };
}
