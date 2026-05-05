import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as authController from '@/controllers/auth.controller';
import * as totpController from '@/controllers/totp.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { authLimiter } from '@/middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authLimiter, asyncHandler(authController.register));
router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/google', authLimiter, asyncHandler(authController.googleAuth));
router.post('/refresh', authLimiter, asyncHandler(authController.refresh));
router.delete('/logout', authMiddleware, asyncHandler(authController.logout));

// TOTP
router.get('/totp/setup', authMiddleware, asyncHandler(totpController.setup));
router.post('/totp/confirm', authMiddleware, asyncHandler(totpController.confirm));
router.post('/totp/verify', authLimiter, asyncHandler(totpController.verify));
router.delete('/totp', authMiddleware, asyncHandler(totpController.disable));
router.get('/totp/devices', authMiddleware, asyncHandler(totpController.devices));
router.delete('/totp/devices/:id', authMiddleware, asyncHandler(totpController.removeDevice));

export default router;
