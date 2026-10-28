'use client';

import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import type { MappingIssue } from '@/lib/schema-dictionary/model';

export const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-slate-50 disabled:text-slate-500';

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

type Tone = 'primary' | 'secondary' | 'danger' | 'ghost';
const TONES: Record<Tone, string> = {
  primary: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
  danger: 'bg-white text-red-600 hover:bg-red-50 border-red-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent'
};

export function Button({ tone = 'secondary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${TONES[tone]} ${className}`}
    />
  );
}

const BADGES: Record<string, string> = {
  builtin: 'bg-slate-100 text-slate-600',
  ai: 'bg-violet-50 text-violet-700',
  manual: 'bg-sky-50 text-sky-700',
  import: 'bg-amber-50 text-amber-700',
  add_sheet: 'bg-emerald-50 text-emerald-700',
  restore: 'bg-slate-100 text-slate-700',
  verified: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  'not-matching': 'bg-red-50 text-red-700',
  'not-loaded': 'bg-slate-100 text-slate-500',
  wildcard: 'bg-slate-100 text-slate-500'
};

export function Badge({ kind, children }: { kind: string; children?: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${BADGES[kind] || 'bg-slate-100 text-slate-600'}`}>
      {children ?? kind.replace('_', ' ')}
    </span>
  );
}

export function IssueList({ issues, onPick, max = 50 }: { issues: MappingIssue[]; onPick?: (issue: MappingIssue) => void; max?: number }) {
  if (!issues.length) return null;
  return (
    <ul className="space-y-1">
      {issues.slice(0, max).map((i, n) => (
        <li key={n}>
          <button
            type="button"
            onClick={() => onPick?.(i)}
            className={`flex w-full items-start gap-1.5 text-left text-[11px] ${onPick ? 'hover:underline' : 'cursor-default'} ${i.level === 'error' ? 'text-red-700' : 'text-amber-700'}`}
          >
            {i.level === 'error' ? <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
            <span>{i.message}</span>
          </button>
        </li>
      ))}
      {issues.length > max && <li className="text-[11px] text-slate-400">+{issues.length - max} more</li>}
    </ul>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ${wide ? 'max-w-5xl' : 'max-w-2xl'}`} role="dialog" aria-label={title}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-black text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-lg leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
