import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as svc from '@/services/notification.service';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler(async (req, res) => {
  const notifications = await svc.getUnread(req.user!.sub);
  res.json(notifications);
}));

router.post('/read', asyncHandler(async (req, res) => {
  await svc.markAllRead(req.user!.sub);
  res.status(204).send();
}));

export default router;
