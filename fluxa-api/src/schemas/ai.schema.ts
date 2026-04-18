import { z } from 'zod';

export const parseUserInputSchema = z.object({
    message: z.string().min(1),
});

export const explainSimulationSchema = z.object({
    currentPrice: z.number(),
    finalValue: z.number(),
    profit: z.number(),
    roi: z.number(),
    investment: z.number(),
    futurePrice: z.number(),
  });