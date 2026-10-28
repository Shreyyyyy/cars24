/**
 * Versioned storage of schema mappings (server only).
 *
 * Every save appends an immutable version to `schema_mapping_versions`, keyed by workbook (the file
 * name without extension or " (2)"-style copy suffix), so a mapping survives re-uploads of the same
 * workbook and uploads of other files. The newest version of a workbook is its active mapping.
 * A save states the version it was based on; if someone saved in between, it is refused (409), so
 * no edit silently overwrites another. Restoring an old version appends a copy of it.
 *
 * Which mapping a dataset uses: its workbook's latest saved version; otherwise the built-in Maruti
 * dictionary when enough of its sheets are present; otherwise none (generic schema prompts).
 */

import { getSQLiteDB, getDatasetMetadata, getQueryableTables, DatasetMetadata, QueryableTable } from '../sqlite-server';
import { clearSemanticCache } from '../semantic-cache';
import { logger } from '../logger';
import {
  SchemaMappingDoc,
  MappingDiff,
  checkMappingStructure,
  diffMappingDocs,
  describeDiff,
  emptyMappingDoc,
  parseMappingDoc
} from './model';
import { builtinMappingDoc, BUILTIN_MIN_MATCHED_SHEETS } from './builtin';
import { resolveMappingSheets } from './resolve';
import { syncMappingToCatalog } from './validate';

export type VersionSource = 'manual' | 'ai' | 'import' | 'add_sheet' | 'restore';

export interface MappingVersionInfo {
  id: number;
  workbookKey: string;
  version: number;
  createdAt: string;
  source: VersionSource;
  note: string | null;
  fileName: string | null;
  summary: string;
  sheets: number;
}

export interface ActiveMapping {
  workbookKey: string;
  /** stored: a saved version; builtin: the Maruti dictionary; none: no mapping applies */
  origin: 'stored' | 'builtin' | 'none';
  doc: SchemaMappingDoc | null;
  version: MappingVersionInfo | null;
  /** Changes whenever the mapping in use changes (cache key) */
  ref: string;
}

export class MappingConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super(`The mapping was changed by someone else (now version ${currentVersion}). Reload it and apply your edits again.`);
  }
}

export function workbookKeyFor(fileName: string): string {
  return String(fileName || 'dataset')
    .trim()
    .toLowerCase()
    .replace(/\.(xlsx|xlsm|xls|csv|tsv|json|sqlite|db)$/i, '')
    .replace(/\s*\(\d+\)$/, '')
    .replace(/\s+/g, ' ')
    .trim() || 'dataset';
}

let tableReady = false;
function ensureTable(): void {
  if (tableReady) return;
  getSQLiteDB().exec(`
    CREATE TABLE IF NOT EXISTS schema_mapping_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workbook_key TEXT NOT NULL,
      version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      source TEXT NOT NULL,
      note TEXT,
      file_name TEXT,
      summary TEXT,
      sheet_count INTEGER,
      doc TEXT NOT NULL,
      UNIQUE (workbook_key, version)
    );
    CREATE INDEX IF NOT EXISTS idx_schema_mapping_versions_key ON schema_mapping_versions(workbook_key, version DESC);
  `);
  tableReady = true;
}

interface VersionRow {
  id: number;
  workbook_key: string;
  version: number;
  created_at: number;
  source: VersionSource;
  note: string | null;
  file_name: string | null;
  summary: string | null;
  sheet_count: number | null;
  doc?: string;
}

const toInfo = (r: VersionRow): MappingVersionInfo => ({
  id: r.id,
  workbookKey: r.workbook_key,
  version: r.version,
  createdAt: new Date(r.created_at).toISOString(),
  source: r.source,
  note: r.note,
  fileName: r.file_name,
  summary: r.summary || '',
  sheets: r.sheet_count ?? 0
});

function readDoc(json: string): SchemaMappingDoc {
  return parseMappingDoc(json).doc;
}

function latestRow(workbookKey: string): VersionRow | undefined {
  ensureTable();
  return getSQLiteDB()
    .prepare(`SELECT * FROM schema_mapping_versions WHERE workbook_key = ? ORDER BY version DESC LIMIT 1`)
    .get(workbookKey) as VersionRow | undefined;
}

export function listMappingVersions(workbookKey: string, limit = 100): MappingVersionInfo[] {
  ensureTable();
  const rows = getSQLiteDB()
    .prepare(`SELECT id, workbook_key, version, created_at, source, note, file_name, summary, sheet_count
              FROM schema_mapping_versions WHERE workbook_key = ? ORDER BY version DESC LIMIT ?`)
    .all(workbookKey, Math.min(Math.max(limit, 1), 1000)) as VersionRow[];
  return rows.map(toInfo);
}

export function getMappingVersion(id: number): { info: MappingVersionInfo; doc: SchemaMappingDoc } | null {
  ensureTable();
  const row = getSQLiteDB().prepare(`SELECT * FROM schema_mapping_versions WHERE id = ?`).get(id) as VersionRow | undefined;
  return row ? { info: toInfo(row), doc: readDoc(row.doc!) } : null;
}

/** Every workbook that has saved mappings, newest first (to reuse one for a renamed file). */
export function listMappedWorkbooks(): { workbookKey: string; versions: number; updatedAt: string; sheets: number }[] {
  ensureTable();
  return (getSQLiteDB().prepare(`
    SELECT workbook_key, COUNT(*) n, MAX(created_at) updated,
           (SELECT sheet_count FROM schema_mapping_versions v2 WHERE v2.workbook_key = v.workbook_key ORDER BY version DESC LIMIT 1) sheets
    FROM schema_mapping_versions v GROUP BY workbook_key ORDER BY updated DESC
  `).all() as { workbook_key: string; n: number; updated: number; sheets: number }[])
    .map(r => ({ workbookKey: r.workbook_key, versions: r.n, updatedAt: new Date(r.updated).toISOString(), sheets: r.sheets }));
}

// ---------------------------------------------------------------------------
// Which mapping applies
// ---------------------------------------------------------------------------

/** Bumped on every save, so resolved mappings are recomputed */
let revision = 0;
let memo: { key: string; value: ActiveMapping } | null = null;

export function resolveMapping(input: { fileName: string; tables: QueryableTable[] }): ActiveMapping {
  const workbookKey = workbookKeyFor(input.fileName);
  const memoKey = `${workbookKey}|${revision}|${input.tables.map(t => `${t.tableName}:${t.sheetName}`).join(',')}`;
  if (memo?.key === memoKey) return memo.value;

  let value: ActiveMapping;
  let stored: VersionRow | undefined;
  try {
    stored = latestRow(workbookKey);
  } catch (err: any) {
    logger.warn(`Schema mapping store unavailable: ${err?.message || err}`);
  }
  if (stored) {
    value = { workbookKey, origin: 'stored', doc: readDoc(stored.doc!), version: toInfo(stored), ref: `v${stored.id}` };
  } else {
    const builtin = builtinMappingDoc();
    const matched = resolveMappingSheets(builtin, input.tables).length;
    value = matched >= BUILTIN_MIN_MATCHED_SHEETS
      ? { workbookKey, origin: 'builtin', doc: builtin, version: null, ref: 'builtin' }
      : { workbookKey, origin: 'none', doc: null, version: null, ref: 'none' };
  }
  memo = { key: memoKey, value };
  return value;
}

/** The mapping the current (or given) dataset's questions use. */
export function getActiveMapping(meta: DatasetMetadata | null = getDatasetMetadata()): ActiveMapping | null {
  if (!meta) return null;
  return resolveMapping({ fileName: meta.fileName, tables: getQueryableTables(meta) });
}

/** What the editor starts from: the active mapping, or an empty one named after the file. */
export function editableMapping(meta: DatasetMetadata | null = getDatasetMetadata()): ActiveMapping & { doc: SchemaMappingDoc } {
  const active = getActiveMapping(meta);
  if (active?.doc) return active as ActiveMapping & { doc: SchemaMappingDoc };
  const fileName = meta?.fileName || 'dataset';
  return {
    workbookKey: active?.workbookKey || workbookKeyFor(fileName),
    origin: 'none',
    doc: emptyMappingDoc(`${fileName.replace(/\.[a-z0-9]+$/i, '')} mapping`),
    version: null,
    ref: 'none'
  };
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

export interface SaveResult {
  version: MappingVersionInfo;
  diff: MappingDiff;
}

/**
 * Appends a new version. `baseVersion` is the version number the edit started from (0 when the
 * workbook had no saved version yet, e.g. it was editing the built-in dictionary).
 */
export function saveMappingVersion(
  workbookKey: string,
  doc: SchemaMappingDoc,
  opts: { source: VersionSource; note?: string; baseVersion: number; fileName?: string; previous?: SchemaMappingDoc | null }
): SaveResult {
  const errors = checkMappingStructure(doc).filter(i => i.level === 'error');
  if (errors.length) throw new Error(`Mapping is not valid: ${errors[0].message}`);
  ensureTable();
  const db = getSQLiteDB();

  const result = db.transaction((): SaveResult => {
    const latest = latestRow(workbookKey);
    const current = latest?.version ?? 0;
    if (opts.baseVersion !== current) throw new MappingConflictError(current);
    const before = latest ? readDoc(latest.doc!) : opts.previous ?? null;
    const diff = diffMappingDocs(before, doc);
    const summary = describeDiff(diff);
    const now = Date.now();
    const info = db.prepare(`
      INSERT INTO schema_mapping_versions (workbook_key, version, created_at, source, note, file_name, summary, sheet_count, doc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(workbookKey, current + 1, now, opts.source, opts.note?.slice(0, 1000) || null, opts.fileName ?? null, summary, doc.sheets.length, JSON.stringify(doc));
    return {
      version: {
        id: Number(info.lastInsertRowid), workbookKey, version: current + 1, createdAt: new Date(now).toISOString(),
        source: opts.source, note: opts.note || null, fileName: opts.fileName ?? null, summary, sheets: doc.sheets.length
      },
      diff
    };
  })();

  revision++;
  memo = null;
  // Cached answers were written with the old definitions
  clearSemanticCache();
  const meta = getDatasetMetadata();
  if (meta && workbookKeyFor(meta.fileName) === workbookKey) {
    try {
      syncMappingToCatalog(doc, getQueryableTables(meta));
    } catch (err: any) {
      logger.warn(`Could not refresh the data-mapping catalog: ${err?.message || err}`);
    }
  }
  logger.info(`Schema mapping ${workbookKey} v${result.version.version} saved (${result.version.source}): ${result.version.summary}`);
  return result;
}

/** Makes an old version current again by appending a copy of it. */
export function restoreMappingVersion(id: number, baseVersion: number, fileName?: string): SaveResult {
  const old = getMappingVersion(id);
  if (!old) throw new Error(`Version ${id} not found`);
  return saveMappingVersion(old.info.workbookKey, old.doc, {
    source: 'restore',
    note: `Restored version ${old.info.version}`,
    baseVersion,
    fileName
  });
}
