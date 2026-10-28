'use client';

import React from 'react';
import { Plus, Trash2, Sparkles, ListPlus } from 'lucide-react';
import {
  MappingSheet,
  MappingColumn,
  SHEET_DOMAINS,
  COLUMN_ROLES,
  ColumnRole,
  SheetDomain,
  normalizeName
} from '@/lib/schema-dictionary/model';
import type { DataTable, DataColumn } from './api';
import { Button, Field, inputCls } from './ui';

/** The loaded table a sheet entry describes (explicit SQL table, else by sheet name). */
export function dataTableFor(sheet: Pick<MappingSheet, 'sheet' | 'sqlTable'>, tables: DataTable[]): DataTable | undefined {
  if (sheet.sqlTable) return tables.find(t => t.tableName === sheet.sqlTable);
  const n = normalizeName(sheet.sheet);
  return tables.find(t => normalizeName(t.sheetName) === n) || tables.find(t => t.tableName === sheet.sheet.trim());
}

export function dataColumnFor(c: MappingColumn, table: DataTable | undefined): DataColumn | undefined {
  if (!table) return undefined;
  if (c.sqlColumn) return table.columns.find(d => d.column === c.sqlColumn);
  const n = normalizeName(c.header);
  return table.columns.find(d => normalizeName(d.header) === n) || table.columns.find(d => d.column === c.header.trim());
}

export function guessRole(d: DataColumn): ColumnRole {
  const h = d.header.toLowerCase();
  if (/(^|_)(first|last)?_?name$|email|phone|mobile|address/.test(h)) return 'pii';
  if (d.type === 'date') return 'date';
  if (/(^|_)(id|code|key|no|num|number)(_\d+)?$|^id$/.test(h)) return 'id';
  if (d.type === 'number' && (d.distinct ?? 0) > 2) return 'measure';
  if ((d.distinct ?? 0) <= 2) return 'flag';
  return 'dimension';
}

export function columnsFromData(table: DataTable): MappingColumn[] {
  return table.columns.map(d => ({ header: d.header, meaning: '', role: guessRole(d) }));
}

interface Props {
  value: MappingSheet;
  onChange: (next: MappingSheet) => void;
  dataTables: DataTable[];
  /** Existing entries may not be renamed into another sheet's name */
  nameLocked?: boolean;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export function SheetEditor({ value, onChange, dataTables, nameLocked, onRegenerate, regenerating }: Props) {
  const table = dataTableFor(value, dataTables);
  const set = (patch: Partial<MappingSheet>) => onChange({ ...value, ...patch });
  const setColumn = (i: number, patch: Partial<MappingColumn>) =>
    set({ columns: value.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const documented = new Set(value.columns.map(c => dataColumnFor(c, table)?.column).filter(Boolean));
  const undocumented = table ? table.columns.filter(d => !documented.has(d.column)) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Sheet name (as in the workbook)" hint={table ? `Loaded as ${table.tableName} · ${table.rowCount.toLocaleString('en-IN')} rows` : 'Not in the loaded data: it applies once a file with this sheet is loaded'}>
          <input className={inputCls} value={value.sheet} disabled={nameLocked} onChange={e => set({ sheet: e.target.value })} list="mapping-data-sheets" />
        </Field>
        <Field label="SQL table (only if the name does not match)">
          <select className={inputCls} value={value.sqlTable || ''} onChange={e => set({ sqlTable: e.target.value || undefined })}>
            <option value="">Match by sheet name</option>
            {dataTables.map(t => <option key={t.tableName} value={t.tableName}>{t.tableName} ({t.sheetName})</option>)}
          </select>
        </Field>
        <Field label="Grain: what one row is" className="sm:col-span-2">
          <input className={inputCls} value={value.grain} placeholder="one row per vehicle booking" onChange={e => set({ grain: e.target.value })} />
        </Field>
        <Field label="Purpose" className="sm:col-span-2">
          <textarea className={inputCls} rows={2} value={value.purpose} placeholder="What the sheet is for and which questions it answers" onChange={e => set({ purpose: e.target.value })} />
        </Field>
        <Field label="Source system">
          <input className={inputCls} value={value.system || ''} placeholder="e.g. DLITE (dealer DMS)" onChange={e => set({ system: e.target.value || undefined })} />
        </Field>
        <Field label="Domain">
          <select className={inputCls} value={value.domain || ''} onChange={e => set({ domain: (e.target.value || undefined) as SheetDomain | undefined })}>
            <option value="">Not set</option>
            {SHEET_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Keywords" hint="Comma separated words that point a question to this sheet" className="sm:col-span-2">
          <input
            className={inputCls}
            value={value.keywords.join(', ')}
            placeholder="booking, cancellation, delivery"
            onChange={e => set({ keywords: e.target.value.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) })}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
            Columns ({value.columns.length}{table ? ` documented of ${table.columns.length} in the data` : ''})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {onRegenerate && (
              <Button onClick={onRegenerate} disabled={regenerating || !table} title={table ? 'Draft this sheet again with AI' : 'Load a file with this sheet first'}>
                <Sparkles className="h-3.5 w-3.5 text-violet-600" /> {regenerating ? 'Drafting…' : 'Draft with AI'}
              </Button>
            )}
            {undocumented.length > 0 && (
              <Button onClick={() => set({ columns: [...value.columns, ...undocumented.map(d => ({ header: d.header, meaning: '', role: guessRole(d) }))] })}>
                <ListPlus className="h-3.5 w-3.5" /> Add {undocumented.length} undocumented column{undocumented.length > 1 ? 's' : ''}
              </Button>
            )}
            <Button onClick={() => set({ columns: [...value.columns, { header: '', meaning: '' }] })}>
              <Plus className="h-3.5 w-3.5" /> Column
            </Button>
          </div>
        </div>

        <datalist id={`mapping-headers-${table?.tableName || 'none'}`}>
          {table?.columns.map(d => <option key={d.column} value={d.header} />)}
        </datalist>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Header</th>
                <th className="px-2">In data</th>
                <th className="px-2">Role</th>
                <th className="px-2 w-1/2">Business meaning</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {value.columns.map((c, i) => {
                const d = dataColumnFor(c, table);
                return (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="px-2 py-1.5 min-w-[140px]">
                      <input className={inputCls} value={c.header} list={`mapping-headers-${table?.tableName || 'none'}`} onChange={e => setColumn(i, { header: e.target.value })} />
                    </td>
                    <td className="px-2 py-1.5 min-w-[120px]">
                      {d ? (
                        <span className="block font-mono text-slate-600" title={d.examples.length ? `e.g. ${d.examples.join(', ')}` : undefined}>
                          {d.column} <span className="text-slate-400">{d.type}</span>
                        </span>
                      ) : table ? (
                        <select className={`${inputCls} text-amber-700`} value={c.sqlColumn || ''} onChange={e => setColumn(i, { sqlColumn: e.target.value || undefined })}>
                          <option value="">not found: pick SQL column</option>
                          {table.columns.map(x => <option key={x.column} value={x.column}>{x.column}</option>)}
                        </select>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <select className={inputCls} value={c.role || ''} onChange={e => setColumn(i, { role: (e.target.value || undefined) as ColumnRole | undefined })}>
                        <option value="">-</option>
                        {COLUMN_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <textarea
                        className={`${inputCls} ${c.meaning ? '' : 'border-amber-300'}`}
                        rows={Math.min(4, Math.max(1, Math.ceil((c.meaning || '').length / 70)))}
                        value={c.meaning}
                        placeholder={d?.examples.length ? `e.g. values ${d.examples.join(', ')}` : 'What this column means'}
                        onChange={e => setColumn(i, { meaning: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <button type="button" onClick={() => set({ columns: value.columns.filter((_, j) => j !== i) })} className="p-1 text-slate-400 hover:text-red-600" aria-label="Remove column">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {value.columns.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-3 text-center text-slate-400">No columns documented yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
