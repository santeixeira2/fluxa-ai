import type { Request, Response } from 'express';
import * as portfolioService from '@/services/portfolio.service';
import * as reportService from '@/services/report.service';
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

export async function monthlyReport(req: Request, res: Response) {
  const now = new Date();
  const year = parseInt(String(req.query.year ?? now.getUTCFullYear()), 10);
  const month = parseInt(String(req.query.month ?? now.getUTCMonth() + 1), 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Invalid year/month' });
  }
  const result = await reportService.getMonthlyReport(req.user!.sub, year, month);
  res.json(result);
}
