import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as portfolioController from '@/controllers/portfolio.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(portfolioController.get));
router.post('/buy', asyncHandler(portfolioController.buy));
router.post('/sell', asyncHandler(portfolioController.sell));
router.get('/transactions', asyncHandler(portfolioController.transactions));
router.get('/performance', asyncHandler(portfolioController.performance));

export default router;
