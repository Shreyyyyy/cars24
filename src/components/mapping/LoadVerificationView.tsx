'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Link2, UploadCloud, ChevronDown, ChevronRight, Search } from 'lucide-react';

interface TableRow {
  table_name: string;
  sheet_name: string;
  source_sheet: string;
  hidden_sheet: number;
  cell_range: string | null;
  source_rows: number;
  loaded_rows: number;
  skipped_rows: number;
  column_count: number;
  primary_key: string | null;
  verified: number;
  checks: number;
  verification_notes: string | null;
  load_notes: string | null;
}
interface ColumnRow {
  table_name: string;
  position: number;
  column_name: string;
  source_header: string;
  data_type: string;
  is_primary_key: number;
  non_null: number;
  distinct_values: number | null;
  min_value: string | null;
  max_value: string | null;
  business_meaning: string | null;
}
interface RelRow {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  relationship_type: string;
  match_pct: number;
  matched_values: number;
  status: string;
  source: string;
  note: string | null;
}

/** How every sheet was loaded into SQL, verified against the file, and linked (read-only). */
export function LoadVerificationView() {
  const [data, setData] = useState<{ fileName: string; tables: TableRow[]; columns: ColumnRow[]; relationships: RelRow[] } | null>(null);
  const [loaded, setLoaded] = useState<boolean | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/v1/schema-mapping')
      .then(r => r.json())
      .then(d => {
        setLoaded(Boolean(d.loaded));
        if (d.loaded) setData(d);
      })
      .catch(() => setLoaded(false));
  }, []);

  const sheetOf = useMemo(() => new Map((data?.tables || []).map(t => [t.table_name, t.sheet_name])), [data]);

  if (loaded === null) return <div className="p-12 text-center text-xs text-gray-500 font-bold">Loading mapping…</div>;
  if (!loaded || !data) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl space-y-4 max-w-2xl mx-auto my-8">
        <UploadCloud className="w-10 h-10 mx-auto text-red-600" />
        <h2 className="text-lg font-black text-gray-900">Upload a file to see how it maps into SQL</h2>
        <Link href="/" className="inline-block px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">Go to the assistant</Link>
      </div>
    );
  }

  const verified = data.tables.filter(t => t.verified).length;
  const rows = data.tables.reduce((a, t) => a + t.loaded_rows, 0);
  const cols = data.columns.length;
  const q = filter.toLowerCase();
  const tables = data.tables.filter(t => !q || t.sheet_name.toLowerCase().includes(q) || t.table_name.includes(q) ||
    data.columns.some(c => c.table_name === t.table_name && (c.source_header.toLowerCase().includes(q) || (c.business_meaning || '').toLowerCase().includes(q))));
  const rels = data.relationships.filter(r => r.status !== 'not-matching');

  return (
    <div className="space-y-6">
      <p className="text-xs sm:text-sm text-slate-500">
        How every sheet and table in <span className="font-semibold text-slate-700">{data.fileName}</span> was loaded into SQL, checked against the file, and linked.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Tables loaded', `${data.tables.length}`],
          ['Verified against file', `${verified} / ${data.tables.length}`],
          ['Rows loaded', rows.toLocaleString('en-IN')],
          ['Columns mapped', cols.toLocaleString('en-IN')]
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="text-xl font-black text-slate-900 mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Sheets → SQL tables</h2>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find a sheet, column or meaning" className="outline-none w-56 max-w-full" />
          </label>
        </div>
        <div className="divide-y divide-slate-100">
          {tables.map(t => {
            const isOpen = open[t.table_name];
            const tcols = data.columns.filter(c => c.table_name === t.table_name);
            return (
              <div key={t.table_name} className="py-2">
                <button onClick={() => setOpen(o => ({ ...o, [t.table_name]: !o[t.table_name] }))} className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 text-left text-xs">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  {t.verified ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  <span className="font-bold text-slate-900">{t.sheet_name}</span>
                  {t.hidden_sheet ? <span className="px-1.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">hidden</span> : null}
                  <span className="font-mono text-slate-500">→ {t.table_name}</span>
                  {t.cell_range && <span className="text-slate-400">{t.cell_range}</span>}
                  <span className="ml-auto text-slate-600">
                    {t.loaded_rows.toLocaleString('en-IN')} rows{t.skipped_rows ? ` (+${t.skipped_rows} skipped)` : ''} · {t.column_count} cols · {t.checks} checks
                    {t.primary_key ? ` · key ${t.primary_key}` : ''}
                  </span>
                </button>
                {!t.verified && t.verification_notes && <p className="ml-11 text-[11px] text-amber-700">{t.verification_notes}</p>}
                {isOpen && (
                  <div className="ml-6 mt-2 overflow-x-auto">
                    {t.load_notes && <p className="text-[11px] text-slate-500 mb-1">{t.load_notes}</p>}
                    <table className="w-full text-[11px]">
                      <thead className="text-left text-slate-500">
                        <tr><th className="py-1 pr-3">#</th><th className="pr-3">Header in file</th><th className="pr-3">SQL column</th><th className="pr-3">Type</th><th className="pr-3">Filled</th><th className="pr-3">Distinct</th><th>Meaning</th></tr>
                      </thead>
                      <tbody>
                        {tcols.map(c => (
                          <tr key={c.column_name} className="border-t border-slate-100 align-top">
                            <td className="py-1 pr-3 text-slate-400">{c.position}</td>
                            <td className="pr-3 text-slate-800">{c.source_header}</td>
                            <td className="pr-3 font-mono text-slate-600">{c.column_name}{c.is_primary_key ? ' 🔑' : ''}</td>
                            <td className="pr-3 text-slate-500">{c.data_type}</td>
                            <td className="pr-3 text-slate-500">{c.non_null.toLocaleString('en-IN')}</td>
                            <td className="pr-3 text-slate-500">{c.distinct_values?.toLocaleString('en-IN') ?? ''}</td>
                            <td className="text-slate-600">{c.business_meaning || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700 flex items-center gap-2"><Link2 className="w-4 h-4" /> Relationships ({rels.length})</h2>
        <p className="text-[11px] text-slate-500">Match % = share of distinct key values on the first side that exist on the other side, measured in your data.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="text-left text-slate-500">
              <tr><th className="py-1 pr-3">From</th><th className="pr-3">To</th><th className="pr-3">Type</th><th className="pr-3">Match</th><th className="pr-3">Status</th><th>Source</th></tr>
            </thead>
            <tbody>
              {rels.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1 pr-3"><span className="text-slate-800">{sheetOf.get(r.from_table) || r.from_table}</span> <span className="font-mono text-slate-500">.{r.from_column}</span></td>
                  <td className="pr-3"><span className="text-slate-800">{sheetOf.get(r.to_table) || r.to_table}</span> <span className="font-mono text-slate-500">.{r.to_column}</span></td>
                  <td className="pr-3 text-slate-500">{r.relationship_type}</td>
                  <td className="pr-3 font-semibold text-slate-800">{r.match_pct}%</td>
                  <td className="pr-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.status}</span>
                  </td>
                  <td className="text-slate-500">{r.source === 'dictionary' ? 'documented' : 'found in data'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
