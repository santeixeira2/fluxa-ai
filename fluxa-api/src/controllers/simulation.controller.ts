import { Request, Response } from 'express';
import * as simulationService from '../services/simulation.service';
import * as priceService from '../services/price.service';
import { simulationSchema, historicalSimulationSchema, dcaSchema } from '../schemas/simulation.schema';

export async function simulate(req: Request, res: Response) {
  const parsed = simulationSchema.parse(req.body);
  let currentPrice = parsed.currentPrice;

  if (currentPrice == null && parsed.asset) {
    currentPrice = await priceService.getPrice(
      parsed.asset,
      parsed.currency
    );
  }
  if (currentPrice == null || parsed.futurePrice == null) {
    return res.status(400).json({
      error: 'currentPrice (or asset) and futurePrice are required',
    });
  }

  const result = simulationService.simulateInvestment({
    investment: parsed.investment,
    currentPrice,
    futurePrice: parsed.futurePrice,
  });
  res.json(result);
}

export async function simulateHistorical(req: Request, res: Response) {
  const parsed = historicalSimulationSchema.parse(req.body);

  const today = new Date().toISOString().split('T')[0];
  if (parsed.purchaseDate >= today) {
    return res.status(400).json({ error: 'purchaseDate must be in the past' });
  }

  const [priceAtPurchase, currentPrice] = await Promise.all([
    priceService.getHistoricalPrice(parsed.asset, parsed.purchaseDate, parsed.currency),
    priceService.getPrice(parsed.asset, parsed.currency),
  ]);

  const result = simulationService.simulateHistoricalInvestment({
    investment: parsed.investment,
    priceAtPurchase,
    currentPrice,
    purchaseDate: parsed.purchaseDate,
  });

  res.json(result);
}

export async function dca(req: Request, res: Response) {
  const parsed = dcaSchema.parse(req.body);

  const today = new Date().toISOString().split('T')[0];
  const endDate = parsed.endDate && parsed.endDate <= today ? parsed.endDate : today;

  const result = await simulationService.simulateDCA({
    asset: parsed.asset,
    amount: parsed.amount,
    frequency: parsed.frequency,
    startDate: parsed.startDate,
    endDate,
    currency: parsed.currency,
  });

  res.json(result);
}