import React from 'react';
import { useRealTime } from '../../context/RealTimeContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useRealTime();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300 transition-all"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {toast.title}
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
