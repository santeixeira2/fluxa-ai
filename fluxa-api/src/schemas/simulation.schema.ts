import { z } from 'zod';

export const historicalSimulationSchema = z.object({
    asset: z.string().min(1),
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    investment: z.number().positive(),
    currency: z.string().default('brl'),
});

export const simulationSchema = z.object({
    asset: z.string().min(1).optional(),
    investment: z.number().positive(),
    currentPrice: z.number().positive().optional(),
    futurePrice: z.number().positive().optional(),
    currency: z.string().default('brl'),
}).refine(
    (data) => data.currentPrice != null || data.asset != null,
    {
        message: 'Either currentPrice or asset must be provided',
    }
);