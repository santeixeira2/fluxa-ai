import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as profileController from '@/controllers/profile.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/avatar/:userId', asyncHandler(profileController.getAvatar));

router.use(authMiddleware);

router.get('/', asyncHandler(profileController.get));
router.patch('/', asyncHandler(profileController.update));
router.patch('/password', asyncHandler(profileController.changePassword));
router.post('/avatar', upload.single('avatar'), asyncHandler(profileController.uploadAvatar));
router.delete('/avatar', asyncHandler(profileController.deleteAvatar));

export default router;
