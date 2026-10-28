'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, Save, CheckCircle2, Undo2, Plus, Trash2, Upload, Download, History, FileJson, Search, AlertTriangle, RotateCcw, Eye, Link2, BookOpen, Settings2, Table2
} from 'lucide-react';
import {
  SchemaMappingDoc,
  MappingRelationship,
  MappingDefinition,
  MappingIssue,
  DEFINITION_KINDS,
  DefinitionKind,
  MergeMode,
  parseMappingDoc,
  mergeMappingDocs,
  diffMappingDocs,
  describeDiff,
  findSheet,
  normalizeName
} from '@/lib/schema-dictionary/model';
import { mappingApi, ApiError, downloadJson, MappingState, MappingValidationReport, MappingVersionInfo, RelationshipCheck } from './api';
import { SheetEditor, dataTableFor } from './SheetEditor';
import { AddSheetDialog } from './AddSheetDialog';
import { Badge, Button, Field, IssueList, Modal, inputCls } from './ui';

type Tab = 'sheets' | 'relationships' | 'definitions' | 'settings' | 'json' | 'history' | 'preview';
type DraftSource = 'manual' | 'ai' | 'import';

const stable = (d: SchemaMappingDoc) => JSON.stringify(d);

export function SchemaMappingEditor() {
  const [state, setState] = useState<MappingState | null>(null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<SchemaMappingDoc | null>(null);
  const [draftSource, setDraftSource] = useState<DraftSource>('manual');
  const [report, setReport] = useState<MappingValidationReport | null>(null);
  const [tab, setTab] = useState<Tab>('sheets');
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [conflict, setConflict] = useState(false);
  const [addSheetFor, setAddSheetFor] = useState<string | null | undefined>(undefined);
  const [saveOpen, setSaveOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await mappingApi.load();
      setState(s);
      setDraft(s.doc);
      setReport(s.report);
      setDraftSource('manual');
      setConflict(false);
      setLoadError('');
    } catch (e: any) {
      setLoadError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = Boolean(state && draft && stable(state.doc) !== stable(draft));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const edit = (next: SchemaMappingDoc, source: DraftSource = 'manual') => {
    setDraft(next);
    setDraftSource(prev => (source === 'manual' && prev !== 'manual' ? 'manual' : source));
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      const err = e as ApiError;
      if (err.conflict) setConflict(true);
      setNotice({ tone: 'error', text: err.message });
      if (err.body?.report) setReport(err.body.report);
    } finally {
      setBusy(null);
    }
  };

  const validate = () => run('validate', async () => {
    const r = await mappingApi.validate(draft!);
    setReport(r.report);
    setNotice(r.report.ok
      ? { tone: 'ok', text: `Valid: ${r.report.warnings.length} warning(s). Relationships were measured against the data.` }
      : { tone: 'error', text: `${r.report.errors.length} error(s) must be fixed before saving.` });
  });

  const save = (note: string) => run('save', async () => {
    const r = await mappingApi.save(draft!, state!.currentVersion, note, draftSource);
    setSaveOpen(false);
    await load();
    setNotice({ tone: 'ok', text: `Saved version ${r.version.version}: ${r.version.summary}. Text-to-SQL uses it from the next question.` });
  });

  const generate = (scope: 'unmapped' | 'all') => run('generate', async () => {
    if (scope === 'all' && draft!.sheets.length && !confirm('Draft every loaded sheet again with AI? Drafted sheets replace the current entries in your draft (nothing is saved until you save).')) return;
    const d = await mappingApi.generate({ scope });
    const incoming = { ...draft!, sheets: d.sheets, relationships: d.relationships, definitions: d.definitions };
    const merged = mergeMappingDocs(draft!, incoming, scope === 'all' ? 'upsert' : 'add_new');
    edit(merged.doc, 'ai');
    setTab('sheets');
    setNotice({
      tone: d.notes.length ? 'warn' : 'ok',
      text: `Drafted ${d.sheets.length} sheet(s) with ${d.model}` +
        `${merged.added.length ? `; added ${merged.added.length}` : ''}${merged.replaced.length ? `; replaced ${merged.replaced.length}` : ''}. ` +
        `Review, then save. ${d.notes.join(' ')}`
    });
  });

  const regenerateSheet = (index: number) => run(`regen-${index}`, async () => {
    const s = draft!.sheets[index];
    const d = await mappingApi.generate({ scope: 'selected', sheets: [s.sheet] });
    if (!d.sheets[0]) throw new Error('The model returned nothing for this sheet');
    const sheets = draft!.sheets.map((x, i) => (i === index ? { ...d.sheets[0], sheet: s.sheet, sqlTable: s.sqlTable } : x));
    const merged = mergeMappingDocs({ ...draft!, sheets }, { ...draft!, sheets: [], relationships: d.relationships, definitions: d.definitions }, 'add_new');
    edit(merged.doc, 'ai');
    setNotice({ tone: 'ok', text: `Re-drafted "${s.sheet}" with ${d.model}. Review, then save.` });
  });

  const openIssue = (issue: MappingIssue) => {
    const m = issue.path.match(/^(sheets|relationships|definitions)\[(\d+)\]/);
    if (m?.[1] === 'sheets') { setTab('sheets'); setSelected(Number(m[2])); }
    else if (m?.[1] === 'relationships') setTab('relationships');
    else if (m?.[1] === 'definitions') setTab('definitions');
    else setTab('settings');
  };

  if (loadError) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-600">{loadError}</div>;
  }
  if (!state || !draft) return <div className="p-8 text-center text-xs font-bold text-slate-500">Loading mapping…</div>;

  const issues = report ? [...report.errors, ...report.warnings] : [];
  const mappedTables = new Set(draft.sheets.map(s => dataTableFor(s, state.dataTables)?.tableName).filter(Boolean));
  const unmapped = state.dataTables.filter(t => !mappedTables.has(t.tableName));
  const diff = diffMappingDocs(state.doc, draft);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-black text-slate-900">{draft.name}</h2>
              {state.origin === 'stored' && state.version && <Badge kind={state.version.source}>v{state.version.version} · {state.version.source.replace('_', ' ')}</Badge>}
              {state.origin === 'builtin' && <Badge kind="builtin">built-in dictionary · not saved yet</Badge>}
              {state.origin === 'none' && <Badge kind="not-loaded">no mapping yet</Badge>}
              {dirty && <Badge kind="import">unsaved: {describeDiff(diff)}</Badge>}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Workbook <span className="font-semibold text-slate-700">{state.fileName}</span> · {draft.sheets.length} sheets mapped · {state.dataTables.length} loaded · {unmapped.length} not mapped
              {state.version && ` · saved ${new Date(state.version.createdAt).toLocaleString()}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button onClick={() => generate('unmapped')} disabled={!!busy || unmapped.length === 0} title="Draft entries for loaded sheets that are not mapped">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" /> {busy === 'generate' ? 'Drafting…' : `AI: map ${unmapped.length} unmapped`}
            </Button>
            <Button onClick={() => generate('all')} disabled={!!busy} title="Draft every loaded sheet again">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" /> AI: all sheets
            </Button>
            <Button onClick={() => setAddSheetFor(null)} disabled={!!busy || dirty} title={dirty ? 'Save or discard your edits first' : 'Add one sheet as its own version'}>
              <Plus className="h-3.5 w-3.5" /> Add sheet
            </Button>
            <Button onClick={validate} disabled={!!busy}>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {busy === 'validate' ? 'Validating…' : 'Validate'}
            </Button>
            <Button onClick={() => { setDraft(state.doc); setDraftSource('manual'); setReport(state.report); }} disabled={!dirty || !!busy}>
              <Undo2 className="h-3.5 w-3.5" /> Discard
            </Button>
            <Button tone="primary" onClick={() => setSaveOpen(true)} disabled={!!busy || (!dirty && state.origin === 'stored')}>
              <Save className="h-3.5 w-3.5" /> {state.origin === 'stored' ? 'Save version' : 'Save as version 1'}
            </Button>
          </div>
        </div>

        {conflict && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-800">
            <AlertTriangle className="h-4 w-4" /> Someone saved a newer version while you were editing.
            <Button onClick={() => downloadJson(draft, `${state.workbookKey}-my-draft.json`)}><Download className="h-3.5 w-3.5" /> Download my draft</Button>
            <Button tone="danger" onClick={load}>Reload latest (drops my edits)</Button>
          </div>
        )}
        {notice && (
          <p className={`rounded-lg px-3 py-2 text-[11px] ${notice.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : notice.tone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
            {notice.text}
          </p>
        )}
        {issues.length > 0 && (
          <details className="rounded-lg border border-slate-200 px-3 py-2" open={Boolean(report?.errors.length)}>
            <summary className="cursor-pointer text-[11px] font-bold text-slate-700">
              Validation: {report!.errors.length} error(s), {report!.warnings.length} warning(s) — click one to jump to it
            </summary>
            <div className="mt-2"><IssueList issues={issues} onPick={openIssue} /></div>
          </details>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {([
          ['sheets', `Sheets (${draft.sheets.length})`, Table2],
          ['relationships', `Relationships (${draft.relationships.length})`, Link2],
          ['definitions', `Definitions (${draft.definitions.length})`, BookOpen],
          ['settings', 'Settings', Settings2],
          ['json', 'JSON', FileJson],
          ['history', 'History', History],
          ['preview', 'Text-to-SQL preview', Eye]
        ] as [Tab, string, React.ElementType][]).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold ${tab === id ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <datalist id="mapping-data-sheets">
        {state.dataTables.map(t => <option key={t.tableName} value={t.sheetName} />)}
      </datalist>

      {tab === 'sheets' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find a sheet" className="w-full outline-none" />
            </label>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5">
              {draft.sheets.map((s, i) => ({ s, i })).filter(({ s }) => !filter || s.sheet.toLowerCase().includes(filter.toLowerCase())).map(({ s, i }) => {
                const t = dataTableFor(s, state.dataTables);
                const check = report?.sheets[i];
                const hasError = report?.errors.some(e => e.path.startsWith(`sheets[${i}]`));
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] ${selected === i ? 'bg-red-50 text-red-800' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${hasError ? 'bg-red-500' : t ? 'bg-emerald-500' : 'bg-slate-300'}`} title={t ? 'In the loaded data' : 'Not in the loaded data'} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{s.sheet}</span>
                    {check && t && <span className="text-[10px] text-slate-400">{check.documentedColumns}/{check.dataColumns}</span>}
                    {s.origin && s.origin !== 'builtin' && <Badge kind={s.origin} />}
                  </button>
                );
              })}
            </div>
            {unmapped.length > 0 && (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Loaded but not mapped ({unmapped.length})</p>
                {unmapped.map(t => (
                  <div key={t.tableName} className="flex items-center gap-2 text-[11px]">
                    <span className="min-w-0 flex-1 truncate text-slate-700">{t.sheetName}</span>
                    <button type="button" disabled={dirty} title={dirty ? 'Save or discard your edits first' : undefined} onClick={() => setAddSheetFor(t.sheetName)} className="font-bold text-red-700 hover:underline disabled:opacity-40">Add…</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            {draft.sheets[selected] ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button tone="danger" onClick={() => {
                    if (!confirm(`Remove "${draft.sheets[selected].sheet}" and its relationships from the draft?`)) return;
                    const name = normalizeName(draft.sheets[selected].sheet);
                    edit({
                      ...draft,
                      sheets: draft.sheets.filter((_, i) => i !== selected),
                      relationships: draft.relationships.filter(r => normalizeName(r.from.sheet) !== name && normalizeName(r.to.sheet) !== name)
                    });
                    setSelected(0);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove sheet
                  </Button>
                </div>
                <SheetEditor
                  key={selected}
                  value={draft.sheets[selected]}
                  dataTables={state.dataTables}
                  onChange={next => edit({ ...draft, sheets: draft.sheets.map((s, i) => (i === selected ? { ...next, origin: s.origin === 'builtin' ? 'manual' : next.origin || 'manual', updatedAt: new Date().toISOString() } : s)) })}
                  onRegenerate={() => regenerateSheet(selected)}
                  regenerating={busy === `regen-${selected}`}
                />
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">
                No sheets mapped yet. Use <b>AI: map unmapped</b> to draft them, <b>Add sheet</b> to write one, or import a JSON file in the JSON tab.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'relationships' && <RelationshipsPanel doc={draft} state={state} checks={report?.relationships || []} onChange={d => edit(d)} />}
      {tab === 'definitions' && <DefinitionsPanel doc={draft} onChange={d => edit(d)} />}
      {tab === 'settings' && <SettingsPanel doc={draft} onChange={d => edit(d)} />}
      {tab === 'json' && <JsonPanel doc={draft} active={state.doc} workbookKey={state.workbookKey} onApply={(d, source, message) => { edit(d, source); setNotice({ tone: 'ok', text: message }); setReport(null); }} />}
      {tab === 'history' && <HistoryPanel state={state} dirty={dirty} onRestored={async message => { await load(); setNotice({ tone: 'ok', text: message }); }} onOpenInDraft={(d, v) => { edit(d); setTab('sheets'); setNotice({ tone: 'warn', text: `Loaded version ${v} into the draft. Save to make it current.` }); }} />}
      {tab === 'preview' && <PreviewPanel draft={draft} dirty={dirty} />}

      {addSheetFor !== undefined && (
        <AddSheetDialog
          doc={state.doc}
          baseVersion={state.currentVersion}
          dataTables={state.dataTables}
          initialSheet={addSheetFor || undefined}
          onClose={() => setAddSheetFor(undefined)}
          onAdded={async message => { setAddSheetFor(undefined); await load(); setNotice({ tone: 'ok', text: message }); }}
        />
      )}
      {saveOpen && <SaveDialog summary={describeDiff(diff)} busy={busy === 'save'} onCancel={() => setSaveOpen(false)} onSave={save} />}
    </div>
  );
}

function SaveDialog({ summary, busy, onCancel, onSave }: { summary: string; busy: boolean; onCancel: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <Modal title="Save a new version" onClose={onCancel} footer={<><Button onClick={onCancel}>Cancel</Button><Button tone="primary" disabled={busy} onClick={() => onSave(note)}>{busy ? 'Validating & saving…' : 'Save'}</Button></>}>
      <div className="space-y-3">
        <p className="text-xs text-slate-600">Changes: <span className="font-semibold">{summary}</span></p>
        <Field label="What changed and why (optional)">
          <textarea className={inputCls} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Documented cancellation reasons; fixed booking join" />
        </Field>
        <p className="text-[11px] text-slate-500">The mapping is validated first. Earlier versions stay in History and can be restored.</p>
      </div>
    </Modal>
  );
}

function RelationshipsPanel({ doc, state, checks, onChange }: { doc: SchemaMappingDoc; state: MappingState; checks: RelationshipCheck[]; onChange: (d: SchemaMappingDoc) => void }) {
  const sheets = doc.sheets.map(s => s.sheet);
  const colsOf = (name: string) => {
    const s = findSheet(doc, name);
    const t = s && dataTableFor(s, state.dataTables);
    return Array.from(new Set([...(s?.columns.map(c => c.header) || []), ...(t?.columns.map(c => c.header) || []), ...Object.keys(doc.commonColumns)]));
  };
  const set = (i: number, patch: Partial<MappingRelationship>) =>
    onChange({ ...doc, relationships: doc.relationships.map((r, j) => (j === i ? { ...r, ...patch, origin: 'manual' } : r)) });
  const end = (value: { sheet: string; column: string }, onSet: (v: { sheet: string; column: string }) => void, allowWildcard = false) => (
    <div className="flex gap-1">
      <select className={inputCls} value={value.sheet} onChange={e => onSet({ sheet: e.target.value, column: value.column })}>
        {allowWildcard && <option value="*">* (every sheet)</option>}
        {!sheets.includes(value.sheet) && value.sheet !== '*' && <option value={value.sheet}>{value.sheet} (not mapped)</option>}
        {sheets.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input className={inputCls} value={value.column} list={`rel-cols-${normalizeName(value.sheet)}`} onChange={e => onSet({ sheet: value.sheet, column: e.target.value })} />
      <datalist id={`rel-cols-${normalizeName(value.sheet)}`}>{colsOf(value.sheet).map(c => <option key={c} value={c} />)}</datalist>
    </div>
  );
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">Join keys the SQL agent may use. Run <b>Validate</b> to measure how many key values actually match in the data.</p>
        <Button onClick={() => onChange({ ...doc, relationships: [...doc.relationships, { from: { sheet: sheets[0] || '', column: '' }, to: { sheet: sheets[1] || sheets[0] || '', column: '' }, cardinality: 'many-to-one', origin: 'manual' }] })}>
          <Plus className="h-3.5 w-3.5" /> Relationship
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr><th className="py-1 pr-2">From</th><th className="pr-2">To</th><th className="pr-2">Cardinality</th><th className="pr-2">Note</th><th className="pr-2">In data</th><th /></tr>
          </thead>
          <tbody>
            {doc.relationships.map((r, i) => {
              const c = checks.find(x => x.index === i);
              return (
                <tr key={i} className="border-t border-slate-100 align-top">
                  <td className="py-1.5 pr-2 min-w-[260px]">{end(r.from, v => set(i, { from: v }))}</td>
                  <td className="pr-2 py-1.5 min-w-[260px]">{end(r.to, v => set(i, { to: v }), true)}</td>
                  <td className="pr-2 py-1.5 min-w-[130px]"><input className={inputCls} value={r.cardinality} onChange={e => set(i, { cardinality: e.target.value })} /></td>
                  <td className="pr-2 py-1.5 min-w-[200px]"><input className={inputCls} value={r.note || ''} onChange={e => set(i, { note: e.target.value || undefined })} /></td>
                  <td className="pr-2 py-1.5 whitespace-nowrap">
                    {c ? <Badge kind={c.status}>{c.matchPct !== undefined ? `${c.matchPct}% ${c.status}` : c.status}</Badge> : <span className="text-slate-300">validate</span>}
                  </td>
                  <td className="py-1.5">
                    <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => onChange({ ...doc, relationships: doc.relationships.filter((_, j) => j !== i) })} aria-label="Remove relationship">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DefinitionsPanel({ doc, onChange }: { doc: SchemaMappingDoc; onChange: (d: SchemaMappingDoc) => void }) {
  const set = (i: number, patch: Partial<MappingDefinition>) =>
    onChange({ ...doc, definitions: doc.definitions.map((d, j) => (j === i ? { ...d, ...patch, origin: 'manual' } : d)) });
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] text-slate-500">
          <b>metric</b> and <b>rule</b> are repeated next to every question so every answer computes them the same way; <b>term</b> (glossary) and <b>guide</b> (procedures) go into the SQL agent&apos;s instructions.
        </p>
        <Button onClick={() => onChange({ ...doc, definitions: [...doc.definitions, { name: '', kind: 'metric', definition: '', origin: 'manual' }] })}>
          <Plus className="h-3.5 w-3.5" /> Definition
        </Button>
      </div>
      {doc.definitions.map((d, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_130px_auto_auto]">
            <input className={inputCls} value={d.name} placeholder="Name, e.g. Booking conversion %" onChange={e => set(i, { name: e.target.value })} />
            <select className={inputCls} value={d.kind} onChange={e => set(i, { kind: e.target.value as DefinitionKind })}>
              {DEFINITION_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <label className="flex items-center gap-1 text-[11px] text-slate-600" title="Write the text into the prompt exactly as is">
              <input type="checkbox" checked={Boolean(d.verbatim)} onChange={e => set(i, { verbatim: e.target.checked || undefined })} /> verbatim block
            </label>
            <button type="button" className="p-1 text-slate-400 hover:text-red-600" onClick={() => onChange({ ...doc, definitions: doc.definitions.filter((_, j) => j !== i) })} aria-label="Remove definition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea className={`${inputCls} font-mono`} rows={d.verbatim ? 10 : 3} value={d.definition} placeholder="How it is computed, with the exact filter values" onChange={e => set(i, { definition: e.target.value })} />
          {!d.verbatim && <input className={`${inputCls} font-mono`} value={d.sql || ''} placeholder="Reference SQL (optional)" onChange={e => set(i, { sql: e.target.value || undefined })} />}
        </div>
      ))}
    </div>
  );
}

function SettingsPanel({ doc, onChange }: { doc: SchemaMappingDoc; onChange: (d: SchemaMappingDoc) => void }) {
  const set = (patch: Partial<SchemaMappingDoc>) => onChange({ ...doc, ...patch });
  const commonText = Object.entries(doc.commonColumns).map(([h, m]) => `${h}: ${m}`).join('\n');
  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-2">
      <Field label="Mapping name"><input className={inputCls} value={doc.name} onChange={e => set({ name: e.target.value })} /></Field>
      <Field label="Source systems" hint="Named in the data-model overview"><input className={inputCls} value={doc.sourceSystems || ''} onChange={e => set({ sourceSystems: e.target.value || undefined })} /></Field>
      <Field label="Description" className="lg:col-span-2"><textarea className={inputCls} rows={2} value={doc.description || ''} onChange={e => set({ description: e.target.value || undefined })} /></Field>
      <Field label="Persona" hint="Who the assistant speaks as (empty = built-in VP Sales persona)" className="lg:col-span-2">
        <textarea className={inputCls} rows={4} value={doc.persona || ''} onChange={e => set({ persona: e.target.value || undefined })} />
      </Field>
      <Field label="Default sheets" hint="One per line: profiled when a question names no sheet">
        <textarea className={inputCls} rows={4} value={(doc.defaultSheets || []).join('\n')} onChange={e => set({ defaultSheets: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />
      </Field>
      <Field label="Joins that do NOT exist" hint="One per line: look-alike keys the SQL agent must never join on">
        <textarea className={inputCls} rows={4} value={doc.nonRelationships.join('\n')} onChange={e => set({ nonRelationships: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />
      </Field>
      <Field label="Shared column meanings" hint={'"header: meaning" per line; used for any sheet that does not document the column'} className="lg:col-span-2">
        <textarea
          className={`${inputCls} font-mono`}
          rows={6}
          defaultValue={commonText}
          onBlur={e => {
            const next: Record<string, string> = {};
            for (const line of e.target.value.split('\n')) {
              const i = line.indexOf(':');
              if (i > 0) next[line.slice(0, i).trim()] = line.slice(i + 1).trim();
            }
            set({ commonColumns: next });
          }}
        />
      </Field>
    </div>
  );
}

function JsonPanel({ doc, active, workbookKey, onApply }: {
  doc: SchemaMappingDoc; active: SchemaMappingDoc; workbookKey: string;
  onApply: (d: SchemaMappingDoc, source: DraftSource, message: string) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(doc, null, 2));
  const [issues, setIssues] = useState<MappingIssue[]>([]);
  const [pending, setPending] = useState<{ doc: SchemaMappingDoc; fileName: string } | null>(null);
  const [mode, setMode] = useState<MergeMode>('add_new');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(JSON.stringify(doc, null, 2)); }, [doc]);

  const applyText = () => {
    const { doc: parsed, issues: found } = parseMappingDoc(text);
    setIssues(found);
    if (found.some(i => i.level === 'error')) return;
    onApply(parsed, 'manual', `Applied the edited JSON to the draft (${found.length} warning(s)). Save to keep it.`);
  };
  const onFile = async (file: File) => {
    const { doc: parsed, issues: found } = parseMappingDoc(await file.text());
    setIssues(found);
    if (found.some(i => i.level === 'error')) return;
    setPending({ doc: parsed, fileName: file.name });
  };
  const preview = pending ? mergeMappingDocs(doc, pending.doc, mode) : null;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-1.5">
        <Button onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Import JSON file</Button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
        <Button onClick={() => downloadJson(doc, `${workbookKey}-mapping-draft.json`)}><Download className="h-3.5 w-3.5" /> Download draft</Button>
        <Button onClick={() => downloadJson(active, `${workbookKey}-mapping.json`)}><Download className="h-3.5 w-3.5" /> Download saved</Button>
        <Button tone="primary" onClick={applyText}><FileJson className="h-3.5 w-3.5" /> Apply edited JSON</Button>
      </div>
      {pending && preview && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px]">
          <p className="font-bold text-slate-800">Import {pending.fileName}: {pending.doc.sheets.length} sheets, {pending.doc.relationships.length} relationships, {pending.doc.definitions.length} definitions</p>
          <div className="flex flex-wrap gap-3">
            {([['add_new', 'Add new sheets only (keep every existing entry)'], ['upsert', 'Add new and update matching sheets'], ['replace', 'Replace the whole mapping']] as [MergeMode, string][]).map(([m, label]) => (
              <label key={m} className="flex items-center gap-1"><input type="radio" checked={mode === m} onChange={() => setMode(m)} /> {label}</label>
            ))}
          </div>
          <p className="text-slate-600">Result: {describeDiff(diffMappingDocs(doc, preview.doc))}{preview.skipped.length ? ` · skipped existing: ${preview.skipped.slice(0, 5).join(', ')}${preview.skipped.length > 5 ? '…' : ''}` : ''}</p>
          <div className="flex gap-1.5">
            <Button tone="primary" onClick={() => { onApply(preview.doc, 'import', `Imported ${pending.fileName} into the draft (${mode.replace('_', ' ')}). Validate and save to keep it.`); setPending(null); }}>Apply to draft</Button>
            <Button onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}
      <IssueList issues={issues} />
      <textarea className={`${inputCls} h-[55vh] font-mono text-[11px]`} value={text} onChange={e => setText(e.target.value)} spellCheck={false} />
      <p className="text-[10px] text-slate-400">
        Accepted: this document format; a bare list of sheets; columns as a list, an object of header: meaning, or &quot;header: meaning&quot; lines; relationship ends as {'{sheet, column}'}, [sheet, column] or &quot;sheet.column&quot;.
      </p>
    </div>
  );
}

function HistoryPanel({ state, dirty, onRestored, onOpenInDraft }: {
  state: MappingState; dirty: boolean;
  onRestored: (message: string) => void;
  onOpenInDraft: (doc: SchemaMappingDoc, version: number) => void;
}) {
  const [versions, setVersions] = useState<MappingVersionInfo[] | null>(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<{ info: MappingVersionInfo; doc: SchemaMappingDoc; diff?: ReturnType<typeof diffMappingDocs> } | null>(null);
  useEffect(() => { mappingApi.versions().then(r => setVersions(r.versions)).catch(e => setError(e.message)); }, [state.currentVersion]);

  const restore = async (v: MappingVersionInfo) => {
    if (!confirm(`Make version ${v.version} current again? It is saved as a new version; nothing is deleted.`)) return;
    try {
      const r = await mappingApi.restore(v.id, state.currentVersion);
      onRestored(`Restored version ${v.version} as version ${r.version.version}.`);
    } catch (e: any) {
      setError(e.message);
    }
  };
  const view = async (v: MappingVersionInfo) => {
    try {
      const r = await mappingApi.version(v.id);
      // What changed from this version to the current one (the current saved mapping is state.doc)
      setViewing({ info: r.info, doc: r.doc, diff: versions?.[0]?.id !== v.id ? diffMappingDocs(r.doc, state.doc) : undefined });
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</p>;
  if (!versions) return <p className="text-xs text-slate-500">Loading history…</p>;
  if (versions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
        Nothing saved yet for this workbook{state.origin === 'builtin' ? ': questions use the built-in dictionary until you save a version' : ''}.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <table className="w-full text-[11px]">
        <thead className="text-left text-[10px] uppercase tracking-wider text-slate-500">
          <tr><th className="py-1 pr-2">Version</th><th className="pr-2">Saved</th><th className="pr-2">How</th><th className="pr-2">Changes</th><th className="pr-2">Note</th><th /></tr>
        </thead>
        <tbody>
          {versions.map((v, i) => (
            <tr key={v.id} className="border-t border-slate-100 align-top">
              <td className="py-1.5 pr-2 font-bold text-slate-800">v{v.version}{i === 0 && <span className="ml-1 text-emerald-600">current</span>}</td>
              <td className="py-1.5 pr-2 whitespace-nowrap text-slate-500">{new Date(v.createdAt).toLocaleString()}</td>
              <td className="py-1.5 pr-2"><Badge kind={v.source} /></td>
              <td className="py-1.5 pr-2 text-slate-600">{v.summary} <span className="text-slate-400">({v.sheets} sheets)</span></td>
              <td className="py-1.5 pr-2 text-slate-500">{v.note}</td>
              <td className="py-1.5 whitespace-nowrap">
                <button type="button" className="mr-2 font-bold text-slate-600 hover:underline" onClick={() => view(v)}>View</button>
                {i > 0 && <button type="button" className="font-bold text-red-700 hover:underline disabled:opacity-40" disabled={dirty} title={dirty ? 'Save or discard your edits first' : undefined} onClick={() => restore(v)}><RotateCcw className="mr-0.5 inline h-3 w-3" />Restore</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {viewing && (
        <Modal
          title={`Version ${viewing.info.version} (${viewing.info.source.replace('_', ' ')})`}
          onClose={() => setViewing(null)}
          wide
          footer={
            <>
              <Button onClick={() => downloadJson(viewing.doc, `${state.workbookKey}-v${viewing.info.version}.json`)}><Download className="h-3.5 w-3.5" /> Download</Button>
              <Button onClick={() => { onOpenInDraft(viewing.doc, viewing.info.version); setViewing(null); }} disabled={dirty}>Open in draft</Button>
            </>
          }
        >
          {viewing.diff && <p className="mb-2 text-[11px] text-slate-600">From this version to the current one: {describeDiff(viewing.diff)}</p>}
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[10px] text-slate-100">{JSON.stringify(viewing.doc, null, 2)}</pre>
        </Modal>
      )}
    </div>
  );
}

function PreviewPanel({ draft, dirty }: { draft: SchemaMappingDoc; dirty: boolean }) {
  const [question, setQuestion] = useState('Which car models bring in the most leads?');
  const [result, setResult] = useState<Awaited<ReturnType<typeof mappingApi.preview>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = async () => {
    setBusy(true); setError('');
    try {
      setResult(await mappingApi.preview(draft, question));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const tokens = useMemo(() => result?.approxTokens?.toLocaleString('en-IN'), [result]);
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] text-slate-500">
        Exactly what the Text-to-SQL agent receives from {dirty ? 'your unsaved draft' : 'the saved mapping'}, and which tables it would profile for a question.
      </p>
      <div className="flex gap-2">
        <input className={inputCls} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Sample question" />
        <Button tone="primary" onClick={preview} disabled={busy}><Eye className="h-3.5 w-3.5" /> {busy ? 'Building…' : 'Preview'}</Button>
      </div>
      {error && <p className="text-[11px] text-red-700">{error}</p>}
      {result && !result.applies && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{result.message}</p>}
      {result?.applies && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-700">
            Tables profiled for this question: <span className="font-mono">{result.relevantTables?.join(', ') || '-'}</span> · system instructions ≈ {tokens} tokens
          </p>
          <details>
            <summary className="cursor-pointer text-[11px] font-bold text-slate-700">Definitions repeated with every question</summary>
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-[10px] text-slate-700">{result.canonicalDefinitions || '(none)'}</pre>
          </details>
          <details open>
            <summary className="cursor-pointer text-[11px] font-bold text-slate-700">System instructions</summary>
            <pre className="mt-1 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 font-mono text-[10px] text-slate-100">{result.systemPrompt}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
