import { NotificationItem } from '../types';
import {
  getCollectionData,
  getDocumentData,
  setDocumentData,
  updateDocumentData,
  deleteDocumentData,
  subscribeToCollection
} from '../lib/storage';
import { generateId } from '../lib/utils';

export const notificationsService = {
  async getAll(): Promise<NotificationItem[]> {
    const notifications = await getCollectionData<NotificationItem>('notifications');
    return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getUnreadCount(): Promise<number> {
    const items = await this.getAll();
    return items.filter(n => !n.read).length;
  },

  async create(data: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'success' | 'danger';
    link?: string;
  }): Promise<NotificationItem> {
    const newNotification: NotificationItem = {
      id: generateId('NOTIF'),
      title: data.title.trim(),
      message: data.message.trim(),
      type: data.type || 'info',
      read: false,
      link: data.link,
      createdAt: new Date().toISOString()
    };

    await setDocumentData('notifications', newNotification.id, newNotification);
    return newNotification;
  },

  async markAsRead(id: string): Promise<void> {
    const item = await getDocumentData<NotificationItem>('notifications', id);
    if (item && !item.read) {
      await updateDocumentData('notifications', id, { read: true });
    }
  },

  async markAllAsRead(): Promise<void> {
    const items = await this.getAll();
    for (const item of items) {
      if (!item.read) {
        await updateDocumentData('notifications', item.id, { read: true });
      }
    }
  },

  async delete(id: string): Promise<void> {
    await deleteDocumentData('notifications', id);
  },

  async clearAll(): Promise<void> {
    const items = await this.getAll();
    for (const item of items) {
      await deleteDocumentData('notifications', item.id);
    }
  },

  subscribe(callback: (notifications: NotificationItem[]) => void): () => void {
    return subscribeToCollection<NotificationItem>('notifications', (items) => {
      const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(sorted);
    });
  }
};
