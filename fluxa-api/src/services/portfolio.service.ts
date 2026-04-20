import { prisma } from '@/utils/prisma';
import { getPrice } from '@/services/price.service';
import { getAsset } from '@/config/assets.config';
import type { BuyInput, SellInput } from '@/schemas/portfolio.schema';

const INITIAL_BALANCE = 10_000;

export async function ensurePortfolio(userId: string) {
  return prisma.simulatedPortfolio.upsert({
    where: { userId },
    update: {},
    create: { userId, initialBalance: INITIAL_BALANCE, currentBalance: INITIAL_BALANCE },
  });
}

export async function getPortfolio(userId: string) {
  const portfolio = await prisma.simulatedPortfolio.findUnique({
    where: { userId },
    include: { positions: true },
  });
  if (!portfolio) throw new Error('Portfolio not found');

  const assetIds = portfolio.positions.map(p => p.assetId);
  const currentPrices = await Promise.all(
    assetIds.map(async id => ({ id, price: await getPrice(id, portfolio.currency) }))
  );
  const priceMap = Object.fromEntries(currentPrices.map(({ id, price }) => [id, price]));

  const positions = portfolio.positions.map(pos => {
    const currentPrice = priceMap[pos.assetId] ?? 0;
    const currentValue = Number(pos.quantity) * currentPrice;
    const cost = Number(pos.quantity) * Number(pos.avgPrice);
    const pnl = currentValue - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    return {
      assetId: pos.assetId,
      assetName: getAsset(pos.assetId)?.name ?? pos.assetId,
      quantity: Number(pos.quantity),
      avgPrice: Number(pos.avgPrice),
      currentPrice,
      currentValue,
      pnl,
      pnlPct,
    };
  });

  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0) + Number(portfolio.currentBalance);
  const totalCost = Number(portfolio.initialBalance);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return {
    id: portfolio.id,
    currency: portfolio.currency,
    initialBalance: totalCost,
    currentBalance: Number(portfolio.currentBalance),
    totalValue,
    totalPnl,
    totalPnlPct,
    positions,
  };
}

export async function buy(userId: string, input: BuyInput) {
  const portfolio = await prisma.simulatedPortfolio.findUnique({ where: { userId } });
  if (!portfolio) throw new Error('Portfolio not found');
  if (!getAsset(input.assetId)) throw new Error('Asset not found');

  const price = await getPrice(input.assetId, portfolio.currency);
  const total = input.amount;
  const quantity = total / price;

  if (Number(portfolio.currentBalance) < total) throw new Error('Saldo insuficiente');

  const portfolioId = portfolio.id;
  const existing = await prisma.simulatedPosition.findUnique({
    where: { portfolioId_assetId: { portfolioId, assetId: input.assetId } },
  });

  await prisma.$transaction(async tx => {
    if (existing) {
      const newQty = Number(existing.quantity) + quantity;
      const newAvg = (Number(existing.avgPrice) * Number(existing.quantity) + price * quantity) / newQty;
      await tx.simulatedPosition.update({
        where: { portfolioId_assetId: { portfolioId, assetId: input.assetId } },
        data: { quantity: newQty, avgPrice: newAvg },
      });
    } else {
      await tx.simulatedPosition.create({
        data: { portfolioId, assetId: input.assetId, quantity, avgPrice: price },
      });
    }
    await tx.simulatedPortfolio.update({
      where: { id: portfolioId },
      data: { currentBalance: { decrement: total } },
    });
    await tx.simulatedTransaction.create({
      data: { portfolioId, assetId: input.assetId, type: 'BUY', quantity, price, total },
    });
  });

  // snapshot assíncrono após trade
  getPortfolio(userId).then(p =>
    prisma.portfolioSnapshot.create({ data: { portfolioId: p.id, totalValue: p.totalValue } })
  ).catch(() => {});

  return { assetId: input.assetId, quantity, price, total };
}

export async function sell(userId: string, input: SellInput) {
  const portfolio = await prisma.simulatedPortfolio.findUnique({ where: { userId } });
  if (!portfolio) throw new Error('Portfolio not found');

  const portfolioId = portfolio.id;
  const position = await prisma.simulatedPosition.findUnique({
    where: { portfolioId_assetId: { portfolioId, assetId: input.assetId } },
  });
  if (!position) throw new Error('Position not found');
  if (Number(position.quantity) < input.quantity) throw new Error('Insufficient quantity');

  const price = await getPrice(input.assetId, portfolio.currency);
  const total = price * input.quantity;
  const remainingQty = Number(position.quantity) - input.quantity;

  await prisma.$transaction(async tx => {
    if (remainingQty === 0) {
      await tx.simulatedPosition.delete({
        where: { portfolioId_assetId: { portfolioId, assetId: input.assetId } },
      });
    } else {
      await tx.simulatedPosition.update({
        where: { portfolioId_assetId: { portfolioId, assetId: input.assetId } },
        data: { quantity: remainingQty },
      });
    }
    await tx.simulatedPortfolio.update({
      where: { id: portfolioId },
      data: { currentBalance: { increment: total } },
    });
    await tx.simulatedTransaction.create({
      data: { portfolioId, assetId: input.assetId, type: 'SELL', quantity: input.quantity, price, total },
    });
  });

  getPortfolio(userId).then(p =>
    prisma.portfolioSnapshot.create({ data: { portfolioId: p.id, totalValue: p.totalValue } })
  ).catch(() => {});

  return { assetId: input.assetId, quantity: input.quantity, price, total };
}

export async function getPerformance(userId: string) {
  const current = await getPortfolio(userId);

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { portfolioId: current.id },
    orderBy: { timestamp: 'asc' },
    select: { totalValue: true, timestamp: true },
  });

  const now = { totalValue: String(current.totalValue), timestamp: new Date().toISOString() };

  // se não tem snapshots, usa capital inicial como ponto de partida
  if (snapshots.length === 0) {
    const start = { totalValue: String(current.initialBalance), timestamp: new Date().toISOString() };
    return [start, now];
  }

  return [...snapshots.map(s => ({ totalValue: String(s.totalValue), timestamp: s.timestamp.toISOString() })), now];
}

export async function getTransactions(userId: string) {
  const portfolio = await prisma.simulatedPortfolio.findUnique({ where: { userId } });
  if (!portfolio) throw new Error('Portfolio not found');

  return prisma.simulatedTransaction.findMany({
    where: { portfolioId: portfolio.id },
    orderBy: { executedAt: 'desc' },
  });
}
