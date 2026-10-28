'use client';

import React from 'react';
import { AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { DEMO_CONFIG } from '@/lib/demo-mode';

interface DemoActionBannerProps {
  customMessage?: string;
  variant?: 'warning' | 'info' | 'compact';
  className?: string;
}

export const DemoActionBanner: React.FC<DemoActionBannerProps> = ({
  customMessage,
  variant = 'warning',
  className = ''
}) => {
  const message = customMessage || DEMO_CONFIG.BANNER_MESSAGE;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 text-xs font-medium ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
        <span className="truncate">{message}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-3.5 shadow-sm text-amber-900 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-amber-500/20 text-amber-800 flex-shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs sm:text-sm">
          <div className="flex items-center gap-2 mb-0.5 font-semibold text-amber-950">
            <span>DEMO SIMULATION ACTIVE</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 uppercase tracking-wider">
              No External API
            </span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
