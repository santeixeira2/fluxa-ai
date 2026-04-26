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

export const dcaSchema = z.object({
    asset: z.string().min(1),
    amount: z.number().positive(),
    frequency: z.enum(['weekly', 'monthly']),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    currency: z.string().default('brl'),
}).refine(
    (data) => {
        const today = new Date().toISOString().split('T')[0];
        const end = data.endDate ?? today;
        return data.startDate < end && data.startDate < today;
    },
    { message: 'startDate must be before endDate and in the past' }
);