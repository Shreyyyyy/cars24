'use client';

import React from 'react';

export interface CrazyLoaderIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

/**
 * CrazyLoaderIcon - Refined, sober, enterprise-grade spinner in CARS24 blue.
 * Features a smooth gradient arc over a soft track with a calm center focal point.
 */
export function CrazyLoaderIcon({ size = 'md', className = '' }: CrazyLoaderIconProps) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${sizeClass} ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full animate-spin"
        style={{ animationDuration: '0.9s' }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="soberRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4736FE" stopOpacity="1" />
            <stop offset="60%" stopColor="#4736FE" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4736FE" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Muted background track */}
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke="#E2E8F0"
          strokeWidth="3.2"
        />

        {/* Primary gradient arc */}
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke="url(#soberRedGradient)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="60 100"
        />
      </svg>

      {/* Gentle center pulse dot */}
      <span className="absolute w-1.5 h-1.5 rounded-full bg-red-600" />
    </div>
  );
}

export interface CrazyThinkingBubbleProps {
  title?: string;
  subtext?: string;
  elapsedMs?: number;
  costUsd?: number;
  llmCalls?: number;
  children?: React.ReactNode;
}

/**
 * CrazyThinkingBubble - Sober, minimalist executive thinking bubble.
 * Clean white card with subtle border, quiet typography, and smooth spinner.
 */
export function CrazyThinkingBubble({
  title,
  subtext,
  elapsedMs,
  costUsd,
  llmCalls,
  children,
}: CrazyThinkingBubbleProps) {
  const activeTitle = title || 'Analysing your data…';

  return (
    <div className="flex-1 min-w-0 rounded-2xl rounded-tl-xs bg-white border border-gray-200 shadow-2xs px-4 py-3 flex items-center justify-between gap-3 text-xs text-gray-700">
      {/* Left: Spinner & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <CrazyLoaderIcon size="sm" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
            {activeTitle}
          </span>
          {subtext && (
            <span className="text-[11px] text-gray-400 font-normal hidden sm:inline truncate">
              · {subtext}
            </span>
          )}
        </div>
      </div>

      {/* Right: Elapsed, Cost & Optional controls */}
      <div className="flex items-center gap-2.5 ml-auto flex-shrink-0">
        {elapsedMs !== undefined && (
          <span className="font-mono text-[11px] text-gray-400">
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        )}

        {costUsd !== undefined && (
          <span className="hidden sm:inline font-mono text-[11px] text-gray-400">
            ${costUsd.toFixed(4)} {llmCalls !== undefined ? `· ${llmCalls} LLM` : ''}
          </span>
        )}

        {children}
      </div>
    </div>
  );
}
