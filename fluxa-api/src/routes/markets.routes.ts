import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { getMarkets } from '@/services/markets.service';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const data = await getMarkets();
  res.json(data);
}));

export default router;
