import { Router } from 'express';
import priceRoutes from './price.routes';
import simulationRoutes from './simulation.routes';
import aiRoutes from './ai.routes';
import assetsRoutes from './assets.routes';
import authRoutes from './auth.routes';
import portfolioRoutes from './portfolio.routes';
import profileRoutes from './profile.routes';
import alertRoutes from './alert.routes';
import notificationRoutes from './notification.routes';

const router = Router();
router.use('/price', priceRoutes);
router.use('/', simulationRoutes);
router.use('/ai', aiRoutes);
router.use('/assets', assetsRoutes);
router.use('/auth', authRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/profile', profileRoutes);
router.use('/alerts', alertRoutes);
router.use('/notifications', notificationRoutes);

export default router;