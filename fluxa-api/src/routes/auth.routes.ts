import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as authController from '@/controllers/auth.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/google', asyncHandler(authController.googleAuth));
router.post('/refresh', asyncHandler(authController.refresh));
router.delete('/logout', authMiddleware, asyncHandler(authController.logout));

export default router;
