"use client";

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function NotificationToast() {
  const { notifications, dismissNotification } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => {
        const isSuccess = n.type === 'success';
        const isWarning = n.type === 'warning';
        const isError = n.type === 'error';
        
        return (
          <div
            key={n.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              isSuccess
                ? 'bg-[#121E19]/90 border-emerald-500/40 text-emerald-200'
                : isWarning
                ? 'bg-[#211A12]/90 border-amber-500/40 text-amber-200'
                : isError
                ? 'bg-[#251214]/90 border-red-500/40 text-red-200'
                : 'bg-[#161A26]/95 border-purple-500/40 text-purple-200'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isWarning ? (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              ) : isError ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Info className="w-4 h-4 text-purple-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{n.title}</p>
              <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">{n.message}</p>
            </div>

            <button
              onClick={() => dismissNotification(n.id)}
              className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

