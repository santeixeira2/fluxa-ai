import { getPriceBatch } from '@/services/price.service';
import { checkAndTriggerAlerts } from '@/services/alert.service';
import { ASSETS } from '@/config/assets.config';
import { logger } from '@/utils/logger';

const INTERVAL_MS = 30_000;

export function startAlertChecker() {
  async function run() {
    try {
      const ids = ASSETS.filter(a => a.provider !== 'exchangerate').map(a => a.id);
      const prices = await getPriceBatch(ids, 'brl');
      await checkAndTriggerAlerts(prices);
    } catch (err) {
      logger.error(`Alert checker error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  setInterval(run, INTERVAL_MS);
  logger.info('Alert checker started (30s interval)');
}
