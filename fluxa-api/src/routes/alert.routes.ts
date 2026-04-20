import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as alertController from '@/controllers/alert.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler(alertController.list));
router.post('/', asyncHandler(alertController.create));
router.delete('/:id', asyncHandler(alertController.remove));

export default router;
