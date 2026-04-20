import { z } from 'zod';

export const buySchema = z.object({
  assetId: z.string().min(1),
  amount: z.number().positive(),
});

export const sellSchema = z.object({
  assetId: z.string().min(1),
  quantity: z.number().positive(),
});

export type BuyInput = z.infer<typeof buySchema>;
export type SellInput = z.infer<typeof sellSchema>;
