import axios from 'axios';
import { config } from '../config';

const client = axios.create({
    baseURL: config.exchangeBaseUrl,
    timeout: 10_000,
});

interface ExchangeRateResponse {
    result: string;
    base_code: string;
    rates: Record<string, number>;
}

export async function fetchFiatRate(
    from: string,
    to: string,
): Promise<number> {
    const { data } = await client.get<ExchangeRateResponse>(`/latest/${from}`);
    if (data.result !== 'success') throw new Error('Failed to fetch exchange rate');
    const rate = data.rates[to];
    if (rate == null) throw new Error(`Exchange rate not found for ${from} to ${to}`);
    return rate;
}