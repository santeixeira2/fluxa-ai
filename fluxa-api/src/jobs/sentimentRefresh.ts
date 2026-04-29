import cron from 'node-cron';
import { refreshSentiment } from '@/services/analysis.service';
import { logger } from '@/utils/logger';

const EARNINGS_ASSET_IDS = [
    // US stocks (SEC EDGAR)
    'aapl', 'msft', 'nvda', 'tsla', 'amzn', 'googl', 'meta', 'nflx', 'brkb', 'jpm', 'v', 'coin',
    // B3 stocks (CVM ITR)
    'petr4', 'vale3', 'itub4', 'bbdc4', 'bbas3', 'wege3', 'mglu3', 'b3sa3',
];

async function run() {
  logger.info('Earnings sentiment refresh started');
  const results = await Promise.allSettled(EARNINGS_ASSET_IDS.map(id => refreshSentiment(id)));

  let totalNew = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      if (r.value.newQuarters > 0) {
        logger.info(`  ${r.value.ticker}: ${r.value.newQuarters} new quarter(s) stored`);
        totalNew += r.value.newQuarters;
      }
    } else {
      logger.warn(`  ${EARNINGS_ASSET_IDS[i]}: refresh failed — ${(r.reason as Error).message}`);
    }
  }

  logger.info(`Earnings sentiment refresh done — ${totalNew} new quarter(s) total`);
}

// Daily at 06:00 BRT = 09:00 UTC
export function startSentimentRefresh() {
  cron.schedule('0 9 * * *', run, { timezone: 'UTC' });
  logger.info('Earnings sentiment refresh scheduled (daily at 06:00 BRT)');
}
