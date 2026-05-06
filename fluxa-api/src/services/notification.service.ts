import { prisma } from '@/utils/prisma';

export async function getUnread(userId: string) {
  const rows = await prisma.alert_triggers.findMany({
    where: {
      read_at: null,
      alerts: { user_id: userId },
    },
    include: { alerts: { select: { asset_id: true, type: true, threshold: true } } },
    orderBy: { triggered_at: 'desc' },
  });
  return rows.map(r => ({
    ...r,
    price_brl: r.price_brl != null ? Number(r.price_brl) : null,
    alerts: r.alerts ? { ...r.alerts, threshold: Number(r.alerts.threshold) } : r.alerts,
  }));
}

export async function markAllRead(userId: string) {
  const now = new Date();
  await prisma.alert_triggers.updateMany({
    where: {
      read_at: null,
      alerts: { user_id: userId },
    },
    data: { read_at: now },
  });
}
