import { Router } from 'express';
import * as assetsController from '../controllers/assets.controller';

const router = Router();
router.get('/', assetsController.listAssets);
export default router;
