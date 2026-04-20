import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.post('/parse', asyncHandler(aiController.parseUserInput));
router.post('/explain', asyncHandler(aiController.explainSimulation));
router.post('/chat', optionalAuthMiddleware, asyncHandler(aiController.chat));

export default router;