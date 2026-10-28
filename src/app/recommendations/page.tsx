'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Target,
  XCircle,
  IndianRupee,
  Award,
  PieChart,
  Filter,
  Rocket,
  UploadCloud,
  Info,
  RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { GrowthAnalysis, GrowthOpportunity, TrendOutlook } from '@/lib/growth-opportunities';

const KIND_META: Record<GrowthOpportunity['kind'], { label: string; icon: React.ElementType; tone: string }> = {
  conversion_gap: { label: 'Conversion gap', icon: Filter, tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  target_shortfall: { label: 'Behind target', icon: Target, tone: 'bg-rose-50 text-rose-800 border-rose-200' },
  decline: { label: 'Declining', icon: TrendingDown, tone: 'bg-rose-50 text-rose-800 border-rose-200' },
  momentum: { label: 'Growing', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  loss_driver: { label: 'Loss reason', icon: XCircle, tone: 'bg-orange-50 text-orange-800 border-orange-200' },
  under_monetised: { label: 'Value per sale', icon: IndianRupee, tone: 'bg-blue-50 text-blue-800 border-blue-200' },
  best_practice: { label: 'Best practice', icon: Award, tone: 'bg-violet-50 text-violet-800 border-violet-200' },
  concentration: { label: 'Dependence risk', icon: PieChart, tone: 'bg-slate-100 text-slate-700 border-slate-200' }
};

function compact(n: number): string {
  if (Math.abs(n) >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  return Math.round(n).toLocaleString('en-IN');
}

function OutlookChart({ outlook }: { outlook: TrendOutlook }) {
  const data = [
    ...outlook.periods.map(p => ({ period: p.period, actual: p.value })),
    ...(outlook.projection || []).map(p => ({ period: p.period, projected: p.value }))
  ];
  // Join the projection line to the last actual point
  if (outlook.projection?.length && outlook.periods.length) {
    const last = data[outlook.periods.length - 1] as any;
    last.projected = last.actual;
  }
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={compact} width={48} />
          <Tooltip formatter={(v: any) => compact(Number(v))} />
          <Line type="monotone" dataKey="actual" name="Actual" stroke="#E31837" strokeWidth={2} dot={false} />
          {outlook.projection && (
            <Line type="monotone" dataKey="projected" name="Projection" stroke="#64748b" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function GrowthOpportunitiesPage() {
  const [analysis, setAnalysis] = useState<GrowthAnalysis | null>(null);
  const [loaded, setLoaded] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoaded(null);
    setError('');
    fetch('/api/v1/opportunities')
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Analysis failed');
        setLoaded(Boolean(data.loaded));
        setAnalysis(data.analysis || null);
      })
      .catch(err => {
        setError(err.message);
        setLoaded(false);
      });
  };

  useEffect(load, []);

  if (loaded === null) {
    return <div className="p-12 text-center text-xs text-gray-500 font-bold">Scanning your data for growth opportunities…</div>;
  }

  if (!loaded || !analysis) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl space-y-4 max-w-2xl mx-auto shadow-2xs my-8">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-gray-900">{error ? 'Could not analyse the data' : 'Upload your data to find growth opportunities'}</h2>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          {error || 'Upload an Excel workbook or CSV (every sheet and every table inside it is analysed). Opportunities come only from your file.'}
        </p>
        <Link href="/" className="inline-block px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">Go to the assistant</Link>
      </div>
    );
  }

  const multi = analysis.tablesAnalysed > 1;

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600 text-white"><Rocket className="w-5 h-5" /></div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Growth Opportunities</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Where sales can grow, ranked by size, from <span className="font-semibold text-slate-700">{analysis.fileName}</span>
            {multi ? ` (${analysis.tablesAnalysed} tables analysed)` : ''}.
          </p>
        </div>
        <button onClick={load} className="self-start sm:self-auto px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {analysis.headline.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {analysis.headline.map(m => (
            <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{m.label}</div>
              <div className="text-xl font-black text-slate-900 mt-1">{m.value}</div>
              {m.note && <div className="text-[11px] text-slate-500 mt-0.5">{m.note}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Ranked opportunities</h2>
          {analysis.opportunities.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
              No clear gaps stand out: segments perform at similar levels on the measures in this file.
            </div>
          )}
          {analysis.opportunities.map((o, i) => {
            const meta = KIND_META[o.kind];
            const Icon = meta.icon;
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.tone}`}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                      {multi && <span className="text-[10px] font-semibold text-slate-400">{o.sheet}</span>}
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 mt-1">{o.title}</h3>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="font-bold text-slate-900 mb-0.5">What the data shows</div>
                    <p className="text-slate-700 leading-relaxed">{o.finding}</p>
                    {o.impact && <p className="text-emerald-800 font-semibold mt-1.5">{o.impact}</p>}
                  </div>
                  <div className="rounded-xl bg-red-50/50 border border-red-100 p-3">
                    <div className="font-bold text-slate-900 mb-0.5">Suggested next step</div>
                    <p className="text-slate-700 leading-relaxed">{o.action}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Outlook</h2>
          {analysis.outlooks.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-600">
              No monthly history found, so trends and projections can&apos;t be shown.
            </div>
          )}
          {analysis.outlooks.slice(0, 3).map(o => (
            <div key={`${o.table}_${o.dateColumn}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
              <div className="text-xs font-bold text-slate-900 capitalize">{o.metricLabel} by month{multi ? ` · ${o.sheet}` : ''}</div>
              <OutlookChart outlook={o} />
              <p className="text-xs text-slate-600 leading-relaxed">{o.summary}</p>
            </div>
          ))}

          {analysis.dataGaps.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
              <div className="text-xs font-bold text-slate-900">What this file can&apos;t tell us yet</div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                {analysis.dataGaps.map(g => <li key={g}>{g}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-[11px] text-slate-500">
            <Info className="w-4 h-4 flex-shrink-0 text-slate-400" />
            <span>
              Every figure is calculated from your uploaded file; no outside benchmarks are used. &quot;Potential&quot; figures are simple
              arithmetic on your data, not forecasts. Projections appear only when your monthly history back-tests well.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
