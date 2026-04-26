import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { detectRegime } from '@/services/analysis.service';
import { compareAssets } from '@/services/comparison.service';
import { z } from 'zod';

const router = Router();

router.get('/regime', asyncHandler(async (req, res) => {
    const { asset } = z.object({ asset: z.string().min(1) }).parse(req.query);
    const result = await detectRegime(asset);
    res.status(200).json(result);
}));

const compareSchema = z.object({
    assets: z.string().min(1),
    period: z.enum(['1M', '1Y', '5Y']),
});

router.get('/compare', asyncHandler(async (req, res) => {
    const { assets, period } = compareSchema.parse(req.query);
    const ids = assets.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length !== 2) {
        return res.status(400).json({ error: 'Exactly two asset ids are required (comma-separated)' });
    }
    const result = await compareAssets(ids[0], ids[1], period);
    res.status(200).json(result);
}));

export default router;