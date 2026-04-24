import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as authController from '@/controllers/auth.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { authLimiter } from '@/middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authLimiter, asyncHandler(authController.register));
router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/google', authLimiter, asyncHandler(authController.googleAuth));
router.post('/refresh', authLimiter, asyncHandler(authController.refresh));
router.delete('/logout', authMiddleware, asyncHandler(authController.logout));

export default router;
