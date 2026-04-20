import type { Request, Response } from 'express';
import * as portfolioService from '@/services/portfolio.service';
import { buySchema, sellSchema } from '@/schemas/portfolio.schema';

export async function get(req: Request, res: Response) {
  const portfolio = await portfolioService.getPortfolio(req.user!.sub);
  res.json(portfolio);
}

export async function buy(req: Request, res: Response) {
  const input = buySchema.parse(req.body);
  const result = await portfolioService.buy(req.user!.sub, input);
  res.json(result);
}

export async function sell(req: Request, res: Response) {
  const input = sellSchema.parse(req.body);
  const result = await portfolioService.sell(req.user!.sub, input);
  res.json(result);
}

export async function transactions(req: Request, res: Response) {
  const result = await portfolioService.getTransactions(req.user!.sub);
  res.json(result);
}

export async function performance(req: Request, res: Response) {
  const result = await portfolioService.getPerformance(req.user!.sub);
  res.json(result);
}
