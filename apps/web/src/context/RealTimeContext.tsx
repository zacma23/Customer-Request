import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getAccessToken, API_BASE_URL } from '../api/client';

export interface RealtimeToast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface RealTimeContextType {
  isConnected: boolean;
  toasts: RealtimeToast[];
  removeToast: (id: string) => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [toasts, setToasts] = useState<RealtimeToast[]>([]);
  const [listeners, setListeners] = useState<Map<string, Set<(data: any) => void>>>(new Map());

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    setListeners((prev) => {
      const next = new Map(prev);
      if (!next.has(event)) {
        next.set(event, new Set());
      }
      next.get(event)!.add(callback);
      return next;
    });

    return () => {
      setListeners((prev) => {
        const next = new Map(prev);
        if (next.has(event)) {
          next.get(event)!.delete(callback);
        }
        return next;
      });
    };
  }, []);

  const dispatchEvent = useCallback(
    (event: string, data: any) => {
      const callbacks = listeners.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb(data);
          } catch (err) {
            console.error('Realtime listener error:', err);
          }
        });
      }
    },
    [listeners]
  );

  useEffect(() => {
    const token = getAccessToken();
    if (!user || !token) {
      setIsConnected(false);
      return;
    }

    const sseUrl = `${API_BASE_URL}/realtime/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    // Generic Event Dispatcher
    const bindEvent = (eventName: string, toastTitle?: string) => {
      eventSource.addEventListener(eventName, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          dispatchEvent(eventName, data);
          if (toastTitle) {
            addToast(
              toastTitle,
              data.content || data.message || data.title || `Update on ${data.requestNumber || 'request'}`,
              'info'
            );
          }
        } catch {}
      });
    };

    bindEvent('new_message', 'New Message');
    bindEvent('request_status_updated', 'Status Updated');
    bindEvent('new_request', 'New Request Received');
    bindEvent('payment_verified', 'Payment Verified');
    bindEvent('payment_proof_submitted', 'Payment Proof Submitted');
    bindEvent('meeting_status_changed', 'Meeting Status Changed');

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [user, dispatchEvent]);

  return (
    <RealTimeContext.Provider value={{ isConnected, toasts, removeToast, subscribe }}>
      {children}
      {/* Real-time Toast Notifications Popup */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xl flex items-start justify-between gap-3 animate-slide-in"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                {toast.title}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) throw new Error('useRealTime must be used within RealTimeProvider');
  return context;
};
