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
                quote: Array<{ close: (number | null)[] }>;
            };
        }> | null;
        error?: { description: string };
    };
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
