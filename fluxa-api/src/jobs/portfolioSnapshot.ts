import { prisma } from '@/utils/prisma';
import { getPortfolio } from '@/services/portfolio.service';
import { logger } from '@/utils/logger';

const INTERVAL_MS = 24 * 60 * 60_000; // diário

export function startPortfolioSnapshots() {
  async function run() {
    try {
      const portfolios = await prisma.simulatedPortfolio.findMany({ select: { userId: true } });
      for (const { userId } of portfolios) {
        try {
          const p = await getPortfolio(userId);
          await prisma.portfolioSnapshot.create({
            data: { portfolioId: p.id, totalValue: p.totalValue },
          });
        } catch { /* portfólio sem posições ou erro de preço — ignora */ }
      }
      logger.info(`Portfolio snapshots saved for ${portfolios.length} users`);
    } catch (err) {
      logger.error(`Portfolio snapshot error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // roda imediatamente e depois a cada 24h
  run();
  setInterval(run, INTERVAL_MS);
  logger.info('Portfolio snapshot job started (24h interval)');
}
