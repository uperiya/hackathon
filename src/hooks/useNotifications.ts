import { useState, useEffect, useCallback } from 'react';
import { NotificationItem } from '../types';
import { notificationsService } from '../services/notificationsService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const items = await notificationsService.getAll();
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const unsubscribe = notificationsService.subscribe((items) => {
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await notificationsService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    await notificationsService.markAllAsRead();
  };

  const deleteNotification = async (id: string) => {
    await notificationsService.delete(id);
  };

  const clearAll = async () => {
    await notificationsService.clearAll();
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh: fetchNotifications
  };
}
