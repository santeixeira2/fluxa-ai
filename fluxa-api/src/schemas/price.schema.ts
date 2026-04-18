import { z } from 'zod';

export const getPriceSchema = z.object({
    asset: z.string().min(1),
    currency: z.string().min(1).default('brl'),
});

export const getFiatRateSchema = z.object({
    from: z.string().length(3).toUpperCase(),
    to: z.string().length(3).toUpperCase(),
  });