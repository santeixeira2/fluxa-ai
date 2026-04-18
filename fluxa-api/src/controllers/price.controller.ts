import { Request, Response } from 'express';
import { z } from 'zod';
import * as priceService from '../services/price.service';
import { getPriceSchema, getFiatRateSchema } from '../schemas/price.schema';

export async function getPrice(req: Request, res: Response) {
    const { asset, currency } = getPriceSchema.parse(req.query);
    const price = await priceService.getPrice(asset, currency);
    res.status(200).json({ asset, currency, price });
}

const getBatchSchema = z.object({
    assets: z.string().min(1),
    currency: z.string().min(1).default('brl'),
});

export async function getPriceBatch(req: Request, res: Response) {
    const { assets, currency } = getBatchSchema.parse(req.query);
    const assetList = assets.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
    const prices = await priceService.getPriceBatch(assetList, currency);
    res.json({ currency, prices });
}

export async function getFiatRate(req: Request, res: Response) {
    const { from, to } = getFiatRateSchema.parse(req.query);
    const rate = await priceService.getFiatRate(from, to);
    res.json({ rate });
}

