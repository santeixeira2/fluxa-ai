import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as profileController from '@/controllers/profile.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(profileController.get));
router.patch('/', asyncHandler(profileController.update));
router.patch('/password', asyncHandler(profileController.changePassword));

export default router;
