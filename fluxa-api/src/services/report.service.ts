import { prisma } from '@/utils/prisma';
import { redis } from '@/utils/redis';
import { getAsset } from '@/config/assets.config';
import { getPortfolio } from '@/services/portfolio.service';
import { generateContent } from '@/providers/groq.provider';

const CACHE_TTL = 3_600;

export interface MonthlyReport {
  period: { year: number; month: number; label: string };
  startValue: number;
  endValue: number;
  periodPnl: number;
  periodPnlPct: number;
  peakValue: number;
  troughValue: number;
  maxDrawdownPct: number;
  trades: {
    total: number;
    buys: number;
    sells: number;
    volume: number;
    topAsset: { id: string; name: string; volume: number } | null;
  };
  alertsTriggered: number;
  topWinners: { assetId: string; assetName: string; pnl: number; pnlPct: number }[];
  topLosers: { assetId: string; assetName: string; pnl: number; pnlPct: number }[];
  aiSummary: string;
  generatedAt: string;
}

const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export async function getMonthlyReport(userId: string, year: number, month: number): Promise<MonthlyReport> {
  const cacheKey = `report:${userId}:${year}-${month}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as MonthlyReport;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const portfolio = await prisma.simulatedPortfolio.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!portfolio) throw new Error('Portfolio not found');

  const [snapshots, transactions, triggers, current] = await Promise.all([
    prisma.portfolioSnapshot.findMany({
      where: { portfolioId: portfolio.id, timestamp: { gte: start, lt: end } },
      orderBy: { timestamp: 'asc' },
      select: { totalValue: true, timestamp: true },
    }),
    prisma.simulatedTransaction.findMany({
      where: { portfolioId: portfolio.id, executedAt: { gte: start, lt: end } },
      select: { assetId: true, type: true, total: true },
    }),
    prisma.alert_triggers.count({
      where: {
        triggered_at: { gte: start, lt: end },
        alerts: { user_id: userId },
      },
    }),
    getPortfolio(userId),
  ]);

  const values = snapshots.map(s => Number(s.totalValue));
  const startValue = values[0] ?? current.initialBalance;
  const endValue = values[values.length - 1] ?? current.totalValue;
  const periodPnl = endValue - startValue;
  const periodPnlPct = startValue > 0 ? (periodPnl / startValue) * 100 : 0;

  const peakValue = values.length > 0 ? Math.max(...values) : endValue;
  const troughValue = values.length > 0 ? Math.min(...values) : endValue;
  const maxDrawdownPct = peakValue > 0 ? ((troughValue - peakValue) / peakValue) * 100 : 0;

  const buys = transactions.filter(t => t.type === 'BUY');
  const sells = transactions.filter(t => t.type === 'SELL');
  const volume = transactions.reduce((sum, t) => sum + Number(t.total), 0);

  const volumeByAsset = new Map<string, number>();
  for (const tx of transactions) {
    volumeByAsset.set(tx.assetId, (volumeByAsset.get(tx.assetId) ?? 0) + Number(tx.total));
  }
  let topAsset: { id: string; name: string; volume: number } | null = null;
  for (const [id, vol] of volumeByAsset) {
    if (!topAsset || vol > topAsset.volume) {
      topAsset = { id, name: getAsset(id)?.name ?? id, volume: vol };
    }
  }

  const sortedByPnlPct = [...current.positions].sort((a, b) => b.pnlPct - a.pnlPct);
  const topWinners = sortedByPnlPct.filter(p => p.pnl > 0).slice(0, 3).map(p => ({
    assetId: p.assetId, assetName: p.assetName, pnl: p.pnl, pnlPct: p.pnlPct,
  }));
  const topLosers = sortedByPnlPct.filter(p => p.pnl < 0).slice(-3).reverse().map(p => ({
    assetId: p.assetId, assetName: p.assetName, pnl: p.pnl, pnlPct: p.pnlPct,
  }));

  const aiSummary = await generateAiSummary({
    monthLabel: `${MONTH_NAMES_PT[month - 1]} de ${year}`,
    startValue, endValue, periodPnl, periodPnlPct, maxDrawdownPct,
    trades: { total: transactions.length, buys: buys.length, sells: sells.length, volume },
    topAsset, topWinners, topLosers, alertsTriggered: triggers,
  });

  const report: MonthlyReport = {
    period: { year, month, label: `${MONTH_NAMES_PT[month - 1]} de ${year}` },
    startValue, endValue, periodPnl, periodPnlPct,
    peakValue, troughValue, maxDrawdownPct,
    trades: {
      total: transactions.length,
      buys: buys.length,
      sells: sells.length,
      volume,
      topAsset,
    },
    alertsTriggered: triggers,
    topWinners,
    topLosers,
    aiSummary,
    generatedAt: new Date().toISOString(),
  };

  await redis.set(cacheKey, JSON.stringify(report), 'EX', CACHE_TTL);
  return report;
}

interface SummaryInput {
  monthLabel: string;
  startValue: number;
  endValue: number;
  periodPnl: number;
  periodPnlPct: number;
  maxDrawdownPct: number;
  trades: { total: number; buys: number; sells: number; volume: number };
  topAsset: { id: string; name: string; volume: number } | null;
  topWinners: { assetName: string; pnlPct: number }[];
  topLosers: { assetName: string; pnlPct: number }[];
  alertsTriggered: number;
}

async function generateAiSummary(input: SummaryInput): Promise<string> {
  const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const winners = input.topWinners.length > 0
    ? input.topWinners.map(w => `${w.assetName} (${fmtPct(w.pnlPct)})`).join(', ')
    : 'nenhum destaque positivo';
  const losers = input.topLosers.length > 0
    ? input.topLosers.map(l => `${l.assetName} (${fmtPct(l.pnlPct)})`).join(', ')
    : 'nenhuma perda relevante';

  const prompt = `Você é o Fluxa, assistente financeiro. Escreva um resumo executivo em português do mês de ${input.monthLabel} para a carteira simulada do usuário.

DADOS DO MÊS:
- Valor inicial: ${fmtBRL(input.startValue)}
- Valor final: ${fmtBRL(input.endValue)}
- Resultado do período: ${fmtBRL(input.periodPnl)} (${fmtPct(input.periodPnlPct)})
- Drawdown máximo: ${fmtPct(input.maxDrawdownPct)}
- Operações: ${input.trades.total} total (${input.trades.buys} compras, ${input.trades.sells} vendas), volume ${fmtBRL(input.trades.volume)}
- Ativo mais negociado: ${input.topAsset?.name ?? 'nenhum'}
- Top winners (posições atuais): ${winners}
- Top losers (posições atuais): ${losers}
- Alertas disparados: ${input.alertsTriggered}

Regras:
- 4 a 6 frases, direto ao ponto.
- Comece pelo resultado do mês (positivo/negativo/lateral).
- Comente o nível de atividade (poucas/muitas operações).
- Mencione os destaques (winners e losers) por nome.
- Termine com uma observação pragmática para o próximo mês (ex: "manter posições", "rever exposição em X", "evitar excesso de operações").
- Última frase obrigatória: "⚠️ Análise informativa, não é recomendação de investimento."
- Não use markdown, apenas texto corrido.`;

  return generateContent(prompt, { responseMimeType: 'text/plain' });
}
