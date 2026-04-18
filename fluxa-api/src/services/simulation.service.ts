import type { SimulationResult, HistoricalSimulationResult } from "../types";

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