'use client';

import React from 'react';
import { Check, Copy } from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import type { ChatMessage } from './MarketingChatbot';

const BRAND = '#4736FE';
const MUTED_BAR = '#CBD5E1';
const PALETTE = ['#4736FE', '#0EA5E9', '#059669', '#D97706', '#E11D48', '#DB2777', '#0891B2', '#475569'];

interface ChartSpec {
  title: string;
  type: 'bar' | 'pie' | 'line' | 'area';
  x: string;
  y: string;
  rows: Record<string, any>[];
}

function compactTick(value: number): string {
  if (Math.abs(value) >= 10000000) return `${(value / 10000000).toFixed(1)} Cr`;
  if (Math.abs(value) >= 100000) return `${(value / 100000).toFixed(1)} L`;
  return value.toLocaleString('en-IN');
}

function formatValue(value: any): string {
  return typeof value === 'number' ? value.toLocaleString('en-IN') : String(value ?? '');
}

const PROJECTED_KEY = 'Projected';

function AnswerChart({ spec }: { spec: ChartSpec }) {
  const rows = spec.rows
    .map(r => ({ ...r, [spec.y]: typeof r[spec.y] === 'number' ? r[spec.y] : Number(r[spec.y]) }))
    .filter(r => !isNaN(r[spec.y]));
  if (rows.length === 0) return null;
  const hasProjection = rows.some(r => r.projected === true);
  const barFill = (r: Record<string, any>, highlight: boolean) =>
    r.projected === true ? 'url(#projected-hatch)' : highlight ? BRAND : MUTED_BAR;
  const hatch = (
    <defs>
      <pattern id="projected-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#F1F5F9" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="2" />
      </pattern>
    </defs>
  );

  const max = Math.max(...rows.map(r => r[spec.y]));
  const longLabels = rows.some(r => String(r[spec.x] ?? '').length > 12);
  const tooltip = <Tooltip formatter={(v: any) => [formatValue(v), spec.y]} cursor={{ fill: '#F1F5F9' }} />;

  let chart: React.ReactElement;
  if (spec.type === 'pie') {
    chart = (
      <PieChart>
        {tooltip}
        <Legend wrapperStyle={{ fontSize: '11px' }} />
        <Pie data={rows} dataKey={spec.y} nameKey={spec.x} cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
      </PieChart>
    );
  } else if (spec.type === 'line' || spec.type === 'area') {
    const lastActual = rows.map(r => r.projected === true).lastIndexOf(false);
    const lineRows = rows.map((r, i) => ({
      ...r,
      [spec.y]: r.projected === true ? undefined : r[spec.y],
      [PROJECTED_KEY]: r.projected === true || (hasProjection && i === lastActual) ? r[spec.y] : undefined
    }));
    chart = (
      <LineChart data={lineRows} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey={spec.x} tick={{ fontSize: 11, fill: '#334155' }} />
        <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={compactTick} width={56} />
        <Tooltip formatter={(v: any, name: any) => [formatValue(v), name === PROJECTED_KEY ? `${spec.y} (projected)` : spec.y]} />
        <Line type="monotone" dataKey={spec.y} stroke={BRAND} strokeWidth={2.5} dot={{ r: 3, fill: BRAND }} connectNulls={false} />
        {hasProjection && (
          <Line type="monotone" dataKey={PROJECTED_KEY} stroke={BRAND} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: '#fff', stroke: BRAND }} connectNulls={false} />
        )}
      </LineChart>
    );
  } else if (longLabels) {
    chart = (
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        {hatch}
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={compactTick} />
        <YAxis type="category" dataKey={spec.x} width={150} tick={{ fontSize: 11, fill: '#334155' }} />
        {tooltip}
        <Bar dataKey={spec.y} radius={[0, 4, 4, 0]}>
          {rows.map((r, i) => <Cell key={i} fill={barFill(r, r[spec.y] === max)} />)}
        </Bar>
      </BarChart>
    );
  } else {
    chart = (
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        {hatch}
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey={spec.x} tick={{ fontSize: 11, fill: '#334155' }} interval={0} />
        <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={compactTick} width={56} />
        {tooltip}
        <Bar dataKey={spec.y} radius={[4, 4, 0, 0]}>
          {rows.map((r, i) => <Cell key={i} fill={barFill(r, r[spec.y] === max)} />)}
        </Bar>
      </BarChart>
    );
  }

  const height = spec.type !== 'pie' && longLabels ? Math.max(200, rows.length * 32) : 240;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-xs font-semibold text-slate-800">{spec.title}</div>
        {hasProjection && (
          <span className="flex-shrink-0 rounded border border-dashed border-slate-400 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {spec.type === 'line' || spec.type === 'area' ? 'Dashed' : 'Hatched'} = projected
          </span>
        )}
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
      </div>
    </div>
  );
}

interface ChatAnswerProps {
  msg: ChatMessage;
  copied: boolean;
  onCopy: (text: string) => void;
}

/** Pulls the opening "## Headlines" section out of the answer so it can be shown as a card. */
function splitExecutiveBrief(content: string): { before: string; brief: string | null; rest: string } {
  const match = content.match(/(^|\n)#{2,3}\s*(?:Headlines|Key headlines|Executive brief)\s*\n([\s\S]*?)(?=\n#{2,3}\s|$)/i);
  if (!match || match.index === undefined) return { before: '', brief: null, rest: content };
  const trimRule = (t: string) => t.replace(/(^|\n)\s*(-{3,}|\*{3,})\s*$/, '').replace(/^\s*(-{3,}|\*{3,})\s*\n/, '').trim();
  return {
    before: trimRule(content.slice(0, match.index)),
    brief: trimRule(match[2]),
    rest: trimRule(content.slice(match.index + match[0].length))
  };
}

/** One assistant reply: the written answer, its charts, and a copy button. */
export function ChatAnswer({ msg, copied, onCopy }: ChatAnswerProps) {
  const { before, brief, rest } = splitExecutiveBrief(msg.content);
  const charts: ChartSpec[] = [];
  if (msg.chart && msg.rows?.length) {
    charts.push({ title: msg.chart.chartTitle, type: msg.chart.chartType, x: msg.chart.xKey, y: msg.chart.yKey, rows: msg.rows });
  }
  for (const s of msg.sections || []) {
    if (s.rows.length && s.categoryCol && s.valueCol) {
      charts.push({ title: s.title, type: s.chartType || 'bar', x: s.categoryCol, y: s.valueCol, rows: s.rows });
    }
  }

  return (
    <div className="group flex-1 min-w-0 space-y-3 text-sm leading-relaxed text-slate-800">
      {before && <MarkdownRenderer content={before} />}
      {brief && (
        <div className="rounded-xl border border-gray-200 border-l-[3px] border-l-indigo-600 bg-gray-50/70 px-4 py-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Headlines</div>
          <MarkdownRenderer content={brief} />
        </div>
      )}
      {rest && <MarkdownRenderer content={rest} />}
      {charts.map((spec, i) => <AnswerChart key={i} spec={spec} />)}
      <button
        type="button"
        onClick={() => onCopy(msg.content)}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100"
        title="Copy answer"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
