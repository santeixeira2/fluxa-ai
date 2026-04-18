import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.post('/parse', asyncHandler(aiController.parseUserInput));
router.post('/explain', asyncHandler(aiController.explainSimulation));
router.post('/chat', asyncHandler(aiController.chat));

export default router;