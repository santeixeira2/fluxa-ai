import { Router } from 'express';
import * as simulationController from '../controllers/simulation.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.post('/simulate', asyncHandler(simulationController.simulate));
router.post('/simulate/historical', asyncHandler(simulationController.simulateHistorical));
router.post('/simulate/dca', asyncHandler(simulationController.dca));
export default router;
