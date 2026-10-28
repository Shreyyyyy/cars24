'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import {
  SchemaMappingDoc,
  MappingSheet,
  MappingRelationship,
  MappingDefinition,
  MappingIssue,
  DEFINITION_KINDS,
  DefinitionKind,
  findSheet,
  normalizeName
} from '@/lib/schema-dictionary/model';
import { mappingApi, ApiError, DataTable } from './api';
import { SheetEditor, dataTableFor, columnsFromData } from './SheetEditor';
import { Button, Field, IssueList, Modal, inputCls } from './ui';

interface Props {
  doc: SchemaMappingDoc;
  baseVersion: number;
  dataTables: DataTable[];
  /** Pre-selected loaded sheet that is not mapped yet */
  initialSheet?: string;
  onClose: () => void;
  onAdded: (message: string) => void;
}

const blankSheet = (name = ''): MappingSheet => ({ sheet: name, grain: '', purpose: '', keywords: [], columns: [], origin: 'manual' });

/**
 * Adds one sheet to the saved mapping as its own version. Existing sheets are shown for linking but
 * cannot be changed from here; the server rejects anything that would alter them.
 */
export function AddSheetDialog({ doc, baseVersion, dataTables, initialSheet, onClose, onAdded }: Props) {
  const unmapped = useMemo(() => dataTables.filter(t => !doc.sheets.some(s => dataTableFor(s, dataTables)?.tableName === t.tableName)), [doc, dataTables]);
  const startTable = initialSheet ? dataTables.find(t => t.sheetName === initialSheet) : undefined;
  const [sheet, setSheet] = useState<MappingSheet>(() => startTable ? { ...blankSheet(startTable.sheetName), columns: columnsFromData(startTable) } : blankSheet());
  const [relationships, setRelationships] = useState<MappingRelationship[]>([]);
  const [definitions, setDefinitions] = useState<MappingDefinition[]>([]);
  const [note, setNote] = useState('');
  const [aiUsed, setAiUsed] = useState(false);
  const [busy, setBusy] = useState<'ai' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [issues, setIssues] = useState<MappingIssue[]>([]);

  const exists = Boolean(sheet.sheet.trim() && findSheet(doc, sheet.sheet));
  const newCols = sheet.columns.map(c => c.header).filter(Boolean);
  const colsOf = (name: string) => {
    if (normalizeName(name) === normalizeName(sheet.sheet)) return newCols;
    const s = findSheet(doc, name);
    const t = s && dataTableFor(s, dataTables);
    return Array.from(new Set([...(s?.columns.map(c => c.header) || []), ...(t?.columns.map(c => c.header) || [])]));
  };

  const pickDataSheet = (name: string) => {
    const t = dataTables.find(x => x.sheetName === name);
    setSheet(t ? { ...blankSheet(t.sheetName), columns: columnsFromData(t) } : { ...sheet, sheet: name });
    setRelationships([]);
    setAiUsed(false);
  };

  const draftWithAI = async () => {
    setBusy('ai'); setError('');
    try {
      const d = await mappingApi.generate({ scope: 'selected', sheets: [sheet.sheet] });
      const s = d.sheets[0];
      if (s) setSheet({ ...s, sheet: sheet.sheet });
      const mine = normalizeName(sheet.sheet);
      setRelationships(d.relationships.filter(r => normalizeName(r.from.sheet) === mine || normalizeName(r.to.sheet) === mine));
      setDefinitions(d.definitions);
      setAiUsed(true);
      if (d.notes.length) setError(d.notes.join(' '));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setBusy('save'); setError(''); setIssues([]);
    try {
      const res = await mappingApi.addSheet({ sheet, relationships, definitions, baseVersion, note: note || undefined, source: aiUsed ? 'ai' : 'manual' });
      const warns = res.report.warnings.length ? ` ${res.report.warnings.length} warning(s): ${res.report.warnings[0].message}` : '';
      onAdded(`Added "${sheet.sheet}" as version ${res.version.version}.${warns}`);
    } catch (e) {
      const err = e as ApiError;
      setError(err.conflict ? `${err.message} Your entry is still here; close and reopen to retry on the latest version.` : err.message);
      setIssues(err.issues || []);
    } finally {
      setBusy(null);
    }
  };

  const setRel = (i: number, patch: Partial<MappingRelationship>) => setRelationships(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setDef = (i: number, patch: Partial<MappingDefinition>) => setDefinitions(ds => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const otherSheets = doc.sheets.map(s => s.sheet);

  return (
    <Modal
      title="Add a sheet to the mapping"
      onClose={onClose}
      wide
      footer={
        <>
          <input className={`${inputCls} max-w-xs`} placeholder="Version note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="primary" onClick={submit} disabled={busy !== null || !sheet.sheet.trim() || exists}>
            {busy === 'save' ? 'Validating…' : 'Validate & add sheet'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-[11px] text-slate-500">
          The sheet is added as a new version. Every existing sheet, relationship and definition stays exactly as it is.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Start from a loaded sheet that is not mapped yet" className="min-w-[260px] flex-1">
            <select className={inputCls} value={dataTables.some(t => t.sheetName === sheet.sheet) ? sheet.sheet : ''} onChange={e => pickDataSheet(e.target.value)}>
              <option value="">{unmapped.length ? 'Choose… (or type a new name below)' : 'Every loaded sheet is mapped; type a new name below'}</option>
              {unmapped.map(t => <option key={t.tableName} value={t.sheetName}>{t.sheetName} ({t.rowCount.toLocaleString('en-IN')} rows)</option>)}
            </select>
          </Field>
          <Button onClick={draftWithAI} disabled={busy !== null || !dataTables.some(t => t.sheetName === sheet.sheet)}>
            <Sparkles className="h-3.5 w-3.5 text-violet-600" /> {busy === 'ai' ? 'Drafting…' : 'Draft with AI'}
          </Button>
        </div>

        {exists && <p className="text-[11px] font-semibold text-red-700">&quot;{sheet.sheet}&quot; is already mapped. Edit it in the Sheets tab instead.</p>}
        {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{error}</p>}
        <IssueList issues={issues} />

        <SheetEditor value={sheet} onChange={setSheet} dataTables={dataTables} />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">Relationships to existing sheets ({relationships.length})</h3>
            <Button onClick={() => setRelationships(rs => [...rs, { from: { sheet: sheet.sheet, column: newCols[0] || '' }, to: { sheet: otherSheets[0] || '', column: '' }, cardinality: 'many-to-one', origin: 'manual' }])} disabled={!sheet.sheet.trim()}>
              <Plus className="h-3.5 w-3.5" /> Relationship
            </Button>
          </div>
          {relationships.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-1.5 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <select className={inputCls} value={r.from.column} onChange={e => setRel(i, { from: { sheet: r.from.sheet, column: e.target.value } })}>
                <option value="">{r.from.sheet} column…</option>
                {colsOf(r.from.sheet).map(c => <option key={c} value={c}>{r.from.sheet}.{c}</option>)}
              </select>
              <select className={inputCls} value={r.to.sheet} onChange={e => setRel(i, { to: { sheet: e.target.value, column: '' } })}>
                {[r.to.sheet, ...otherSheets].filter((s, j, all) => s && all.indexOf(s) === j).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className={inputCls} value={r.to.column} onChange={e => setRel(i, { to: { sheet: r.to.sheet, column: e.target.value } })}>
                <option value="">column…</option>
                {colsOf(r.to.sheet).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className={inputCls} value={r.cardinality} placeholder="many-to-one" onChange={e => setRel(i, { cardinality: e.target.value })} />
              <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => setRelationships(rs => rs.filter((_, j) => j !== i))} aria-label="Remove relationship">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">New business definitions ({definitions.length})</h3>
            <Button onClick={() => setDefinitions(ds => [...ds, { name: '', kind: 'metric', definition: '', origin: 'manual' }])}>
              <Plus className="h-3.5 w-3.5" /> Definition
            </Button>
          </div>
          {definitions.map((d, i) => (
            <div key={i} className="grid grid-cols-1 gap-1.5 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_120px_2fr_auto]">
              <input className={inputCls} value={d.name} placeholder="Target achievement %" onChange={e => setDef(i, { name: e.target.value })} />
              <select className={inputCls} value={d.kind} onChange={e => setDef(i, { kind: e.target.value as DefinitionKind })}>
                {DEFINITION_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <textarea className={inputCls} rows={2} value={d.definition} placeholder="How to compute it" onChange={e => setDef(i, { definition: e.target.value })} />
              <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => setDefinitions(ds => ds.filter((_, j) => j !== i))} aria-label="Remove definition">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </section>
      </div>
    </Modal>
  );
}
