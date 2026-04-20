import { prisma } from '@/utils/prisma';

export async function getUnread(userId: string) {
  return prisma.alert_triggers.findMany({
    where: {
      read_at: null,
      alerts: { user_id: userId },
    },
    include: { alerts: { select: { asset_id: true, type: true, threshold: true } } },
    orderBy: { triggered_at: 'desc' },
  });
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
