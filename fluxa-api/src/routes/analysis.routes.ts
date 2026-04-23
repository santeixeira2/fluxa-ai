import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { detectRegime } from '@/services/analysis.service';
import { z } from 'zod';

const router = Router();

router.get('/regime', asyncHandler(async (req, res) => {
    const { asset } = z.object({ asset: z.string().min(1) }).parse(req.query);
    const result = await detectRegime(asset);
    res.status(200).json(result);
}));

export default router;