'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';

export const ToastNotification: React.FC = () => {
  const { toasts, removeToast } = useDemoContext();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-3 duration-200 ${
              isSuccess
                ? 'bg-slate-900 text-white border-slate-800'
                : isWarning
                ? 'bg-amber-900 text-white border-amber-800'
                : 'bg-white text-gray-900 border-gray-200'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isWarning && <AlertCircle className="w-4 h-4 text-amber-400" />}
              {!isSuccess && !isWarning && <Info className="w-4 h-4 text-blue-500" />}
            </div>

            <div className="flex-1 text-xs">
              <div className="font-bold text-sm leading-tight">{toast.title}</div>
              <div className={`mt-0.5 leading-relaxed ${isSuccess || isWarning ? 'text-gray-300' : 'text-gray-600'}`}>
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
