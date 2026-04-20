import { Router } from 'express';
import * as priceController from '../controllers/price.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.get('/price', asyncHandler(priceController.getPrice));
router.get('/batch', asyncHandler(priceController.getPriceBatch));
router.get('/fiat-rate', asyncHandler(priceController.getFiatRate));
router.get('/chart/:assetId', asyncHandler(priceController.getChartData));
export default router;