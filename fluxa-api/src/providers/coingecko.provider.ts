import axios from 'axios';
import { config } from '../config';

const client = axios.create({
    baseURL: config.coingeckoBaseUrl,
    timeout: 10_000,
});

export async function fetchPrice(
    asset: string,
    vsCurrency: string,
): Promise<number> {
    const { data } = await client.get<Record<string, Record<string, number>>>(
    '/simple/price',
    { params: { ids: asset, vs_currencies: vsCurrency } }
    );
    const price = data[asset]?.[vsCurrency];
    if (price == null) {
        throw new Error(`Price not found for asset: ${asset} and currency: ${vsCurrency}`);
    }
    return price;
}

// Fetch multiple assets in a single API call to avoid rate limiting
export async function fetchPriceBatch(
    assets: string[],
    vsCurrency: string,
): Promise<Record<string, number>> {
    const { data } = await client.get<Record<string, Record<string, number>>>(
        '/simple/price',
        { params: { ids: assets.join(','), vs_currencies: vsCurrency } }
    );
    const result: Record<string, number> = {};
    for (const asset of assets) {
        const price = data[asset]?.[vsCurrency];
        if (price != null) result[asset] = price;
    }
    return result;
}

