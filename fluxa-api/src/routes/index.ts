import { Router } from 'express';
import priceRoutes from './price.routes';
import simulationRoutes from './simulation.routes';
import aiRoutes from './ai.routes';
import assetsRoutes from './assets.routes';
import authRoutes from './auth.routes';

const router = Router();
router.use('/price', priceRoutes);
router.use('/', simulationRoutes);
router.use('/ai', aiRoutes);
router.use('/assets', assetsRoutes);
router.use('/auth', authRoutes);

export default router;