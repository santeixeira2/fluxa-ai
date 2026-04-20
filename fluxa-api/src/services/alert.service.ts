import { prisma } from '@/utils/prisma';

export type AlertType = 'PRICE_ABOVE' | 'PRICE_BELOW';

export async function listAlerts(userId: string) {
  return prisma.alerts.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: { alert_triggers: { orderBy: { triggered_at: 'desc' }, take: 1 } },
  });
}

export async function createAlert(userId: string, data: { assetId: string; type: AlertType; threshold: number }) {
  return prisma.alerts.create({
    data: {
      user_id: userId,
      asset_id: data.assetId,
      type: data.type,
      threshold: data.threshold,
      direction: data.type === 'PRICE_ABOVE' ? 'above' : 'below',
    },
  });
}

export async function deleteAlert(alertId: string, userId: string) {
  const alert = await prisma.alerts.findFirst({ where: { id: alertId, user_id: userId } });
  if (!alert) throw new Error('Alert not found');
  await prisma.alerts.delete({ where: { id: alertId } });
}

export async function checkAndTriggerAlerts(prices: Record<string, number>) {
  const active = await prisma.alerts.findMany({
    where: { active: true },
  });

  const now = new Date();

  for (const alert of active) {
    const price = prices[alert.asset_id];
    if (price == null) continue;

    const threshold = Number(alert.threshold);
    const triggered =
      (alert.type === 'PRICE_ABOVE' && price >= threshold) ||
      (alert.type === 'PRICE_BELOW' && price <= threshold);

    if (!triggered) continue;

    await prisma.$transaction([
      prisma.alerts.update({
        where: { id: alert.id },
        data: { active: false, triggered_at: now },
      }),
      prisma.alert_triggers.create({
        data: {
          alert_id: alert.id,
          price_brl: price,
          message: `${alert.asset_id} atingiu R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (alvo: R$ ${threshold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
        },
      }),
    ]);
  }
}
