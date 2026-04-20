import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markNotificationsRead } from '../api/client';
import type { Notification } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const POLL_MS = 30_000;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const poll = useCallback(async () => {
    if (!user) return;
    try { setNotifications(await getNotifications()); }
    catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  const markRead = useCallback(async () => {
    if (notifications.length === 0) return;
    await markNotificationsRead().catch(() => {});
    setNotifications([]);
  }, [notifications.length]);

  return { notifications, markRead };
}
