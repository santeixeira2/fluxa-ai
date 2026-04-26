import type { SimulationResult, HistoricalSimulationResult, DCAResult, DCAScheduleItem, DCAFrequency } from "../types";
import * as priceService from "./price.service";
import { getAsset } from "../config/assets.config";
import { getCached, setCached } from "../utils/cache";

const DCA_CACHE_TTL_MS = 5 * 60_000;
const MAX_DCA_ENTRIES = 500;

export function simulateInvestment(params: {
    investment: number;
    currentPrice: number;
    futurePrice: number;
}): SimulationResult {
    const { investment, currentPrice, futurePrice } = params;
    const finalValue = investment * (futurePrice / currentPrice);
    const profit = finalValue - investment;
    const roi = (profit / investment) * 100;
    return {
        currentPrice,
        finalValue,
        profit,
        roi,
    };
}

export function simulateHistoricalInvestment(params: {
    investment: number;
    priceAtPurchase: number;
    currentPrice: number;
    purchaseDate: string;
}): HistoricalSimulationResult {
    const { investment, priceAtPurchase, currentPrice, purchaseDate } = params;
    const quantity = investment / priceAtPurchase;
    const currentValue = quantity * currentPrice;
    const profit = currentValue - investment;
    const roi = (profit / investment) * 100;
    return {
        purchaseDate,
        priceAtPurchase,
        currentPrice,
        quantity,
        currentValue,
        profit,
        roi,
    };
}

// ── DCA Simulation ───────────────────────────────────────────────────────────

function generateDCADates(startDate: string, endDate: string, frequency: DCAFrequency): string[] {
    const dates: string[] = [];
    const end = new Date(endDate + 'T00:00:00');
    let current = new Date(startDate + 'T00:00:00');

    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);

        if (frequency === 'weekly') {
            current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
            // monthly: advance 1 month keeping same day (Date handles overflow)
            const day = current.getDate();
            const next = new Date(current);
            next.setMonth(next.getMonth() + 1);
            // Clamp day (e.g. Jan 31 → Feb 28)
            if (next.getDate() !== day) {
                next.setDate(0); // last day of previous month
            }
            current = next;
        }

        if (dates.length > MAX_DCA_ENTRIES) {
            throw new Error(`Too many DCA entries (>${MAX_DCA_ENTRIES}). Shorten the period or use monthly frequency.`);
        }
    }

    return dates;
}

export async function simulateDCA(params: {
    asset: string;
    amount: number;
    frequency: DCAFrequency;
    startDate: string;
    endDate: string;
    currency: string;
}): Promise<DCAResult> {
    const { asset, amount, frequency, startDate, endDate, currency } = params;

    const cacheKey = `dca:${asset}:${amount}:${frequency}:${startDate}:${endDate}:${currency}`;
    const cached = getCached<DCAResult>(cacheKey);
    if (cached) return cached;

    const assetConfig = getAsset(asset);
    if (!assetConfig) throw new Error(`Asset not found: ${asset}`);

    if (startDate < assetConfig.minDate) {
        throw new Error(`startDate ${startDate} is before asset's earliest data (${assetConfig.minDate})`);
    }

    const dates = generateDCADates(startDate, endDate, frequency);
    if (dates.length === 0) {
        throw new Error('No contribution dates in the given period');
    }

    const schedule: DCAScheduleItem[] = [];
    let totalQuantity = 0;

    for (const date of dates) {
        try {
            const price = await priceService.getHistoricalPrice(asset, date, currency);
            const quantity = amount / price;
            totalQuantity += quantity;
            schedule.push({
                date,
                price,
                quantity,
                cumulative: totalQuantity,
            });
        } catch (err) {
            console.warn(`[DCA] Skipping date ${date} for ${asset}: ${(err as Error).message}`);
        }
    }

    if (schedule.length === 0) {
        throw new Error('Could not fetch prices for any date in the period');
    }

    const totalInvested = schedule.length * amount;
    const averagePrice = totalInvested / totalQuantity; // harmonic mean
    const currentPrice = await priceService.getPrice(asset, currency);
    const currentValue = totalQuantity * currentPrice;
    const profit = currentValue - totalInvested;
    const roi = profit / totalInvested;

    // Lump-Sum comparison: invest totalInvested at P_1
    const firstPrice = schedule[0].price;
    const lsQuantity = totalInvested / firstPrice;
    const lsCurrentValue = lsQuantity * currentPrice;
    const lsProfit = lsCurrentValue - totalInvested;
    const lsRoi = lsProfit / totalInvested;

    const result: DCAResult = {
        schedule,
        totalInvested,
        totalQuantity,
        averagePrice,
        currentPrice,
        currentValue,
        profit,
        roi,
        lumpSum: {
            quantity: lsQuantity,
            currentValue: lsCurrentValue,
            profit: lsProfit,
            roi: lsRoi,
        },
    };

    setCached(cacheKey, result, DCA_CACHE_TTL_MS);
    return result;
}