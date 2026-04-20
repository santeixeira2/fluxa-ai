import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { startAlertChecker } from './jobs/alertChecker';
import { startPortfolioSnapshots } from './jobs/portfolioSnapshot';

app.listen(config.port, () => {
    logger.info(`Fluxa finance API is running on port ${config.port}`);
    startAlertChecker();
    startPortfolioSnapshots();
});
