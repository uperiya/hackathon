import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationItem, Product } from '../types';
import { getCollectionData, subscribeToCollection, setDocumentData } from '../lib/storage';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
  removeToast: (id: string) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Listen to notifications
  useEffect(() => {
    const unsub = subscribeToCollection<NotificationItem>('notifications', (items) => {
      setNotifications(items || []);
    });
    return unsub;
  }, []);

  // Monitor low stock products and generate alerts if not already notified
  useEffect(() => {
    const checkLowStock = async () => {
      const products = await getCollectionData<Product>('products');
      const lowStockProducts = products.filter(p => p.active && p.availableStock <= p.reorderLevel);

      if (lowStockProducts.length > 0) {
        // Create an alert notice if out of stock
        const outOfStock = lowStockProducts.filter(p => p.totalStock <= 0);
        if (outOfStock.length > 0) {
          const sample = outOfStock.map(p => p.name).slice(0, 2).join(', ');
          const title = `⚠️ ${outOfStock.length} Product(s) Out of Stock`;
          const msg = `${sample}${outOfStock.length > 2 ? ` and ${outOfStock.length - 2} more` : ''} reached zero units. Restock urgently!`;

          setNotifications(prev => {
            if (prev.some(n => n.title === title)) return prev;
            const newNotif: NotificationItem = {
              id: `notif_oos_${Date.now()}`,
              title,
              message: msg,
              type: 'danger',
              read: false,
              link: '/reordering-rules',
              createdAt: new Date().toISOString()
            };
            return [newNotif, ...prev];
          });
        }
      }
    };

    checkLowStock();
  }, []);

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const newToast: ToastMessage = {
      id,
      type,
      message,
      title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Notice' : 'Information'),
      duration: 4500
    };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = async (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    const item = notifications.find(n => n.id === id);
    if (item) {
      await setDocumentData('notifications', id, { ...item, read: true });
    }
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    for (const n of notifications) {
      if (!n.read) {
        await setDocumentData('notifications', n.id, { ...n, read: true });
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}

      {/* Floating Toasts Viewport */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4">
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
                isSuccess
                  ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900'
                  : isError
                  ? 'bg-rose-50/95 border-rose-300 text-rose-900'
                  : isWarning
                  ? 'bg-amber-50/95 border-amber-300 text-amber-900'
                  : 'bg-slate-900/95 border-slate-800 text-white'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400" />}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <p className="text-sm font-semibold mb-0.5 tracking-wide">{toast.title}</p>
                )}
                <p className="text-xs leading-relaxed opacity-90 break-words">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
