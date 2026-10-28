/**
 * Schema mapping & load verification.
 *
 * After an upload, every sheet/table is mapped into SQL and the mapping is stored in three tables:
 *   _schema_tables         sheet (and cell range) -> SQL table, row reconciliation, primary key, verified flag
 *   _schema_columns        workbook header -> SQL column, type, profile, business meaning
 *   _schema_relationships  join keys between tables with the measured share of matching values
 *
 * Relationships are discovered from the values themselves (a column whose values are contained in
 * another table's unique column), so differently named keys are found (e.g. lead__c -> id) and
 * look-alike columns that don't actually match (city, names, dates) are not proposed.
 * Every table is verified by re-reading it from SQLite and comparing counts, sums and sample rows.
 */

import type Database from 'better-sqlite3';
import type { CleanTable, CleanValue } from './tabular-ingest';
import { SchemaMappingDoc, findSheet, normalizeName } from './schema-dictionary/model';

export interface LoadedTable {
  tableName: string;
  sheetName: string;
  sourceSheet: string;
  hidden?: boolean;
  table: CleanTable;
}

export interface MappedRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  /** many-to-one: many rows in "from" point to one row in "to" */
  type: 'many-to-one' | 'one-to-one' | 'shared-key';
  /** Share of distinct "from" values found in "to" */
  matchPct: number;
  matchedValues: number;
  fromDistinct: number;
  status: 'verified' | 'partial' | 'not-matching';
  source: 'discovered' | 'dictionary';
  note?: string;
}

export interface TableVerification {
  tableName: string;
  sheetName: string;
  range?: string;
  sourceRows: number;
  loadedRows: number;
  skippedRows: number;
  columnsExpected: number;
  columnsLoaded: number;
  checks: number;
  failures: string[];
  ok: boolean;
}

export interface MappingSummary {
  tables: number;
  verifiedTables: number;
  rowsLoaded: number;
  relationships: number;
  verifiedRelationships: number;
  failures: string[];
}

// ---------------------------------------------------------------------------
// Relationship discovery
// ---------------------------------------------------------------------------

const EMPTY_VALUE = /^(na|n\/a|null|none|\(not set\)|-|0|1)$/i;
/** Personal / descriptive columns: identifying, but joining on them is not a data-model relationship */
const NOT_A_KEY = /(^|_)(first|last|middle)_?name|customer_name|contact_.*name|legal_name|consumer_name|account_name|sc_name|agent_name|^name$|email|phone|mobile|address|street|remarks|comment|description|subject|message|title|url|path|referrer|user_agent|signature|qr_code|latitude|longitude|pincode|postalcode|postal_code|zip|city|state|country|bank|account_number|ifsc|pan(_|$)|gstin|detail|json|attributes/i;
/** Audit fields (who created / modified a record) repeat the same system users everywhere */
const AUDIT_FIELD = /createdby|created_by|modifiedby|modified_by|lastmodified|ownerid|owner_id|recordtype|systemmodstamp|accountuserid/i;
/** Names that usually mark a table's own identifier */
const ID_NAME = /(^|_)(id|code|num|number|no|key)(_\d+)?$|^id(_\d+)?$/i;
/** Values that look like codes/ids: letters or digits with at least one digit, no spaces */
const CODE_VALUE = /^(?=.*\d)[A-Z0-9][A-Z0-9\-_.\/:]{3,}$/;

interface KeyColumn {
  tableName: string;
  column: string;
  values: Set<string>;
  /** First values, for a cheap overlap pre-check */
  sample: string[];
  unique: boolean;
  codeLike: boolean;
}

function normalizeKey(v: CleanValue): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toUpperCase();
  return s && !EMPTY_VALUE.test(s) ? s : null;
}

function keyColumns(loaded: LoadedTable[]): KeyColumn[] {
  const out: KeyColumn[] = [];
  for (const { tableName, table } of loaded) {
    for (const col of table.columns) {
      const p = table.profiles[col];
      if (!p || p.isDate || NOT_A_KEY.test(col) || AUDIT_FIELD.test(col)) continue;
      // Measures (sums, amounts, counts) are not keys; numeric ids stay text on ingest
      if (p.isNumeric) continue;
      const values: string[] = [];
      for (const r of table.rows) {
        const k = normalizeKey(r[col]);
        if (k) values.push(k);
      }
      const set = new Set(values);
      if (set.size < 10 || values.some(v => v.length > 80)) continue;
      let codeLike = 0;
      let i = 0;
      for (const v of Array.from(set)) {
        if (CODE_VALUE.test(v)) codeLike++;
        if (++i >= 200) break;
      }
      out.push({
        tableName,
        column: col,
        values: set,
        sample: Array.from(set).slice(0, 60),
        unique: set.size / values.length >= 0.95,
        codeLike: codeLike / Math.min(set.size, 200) >= 0.8
      });
    }
  }
  return out;
}

function containment(from: Set<string>, to: Set<string>): number {
  let hit = 0;
  from.forEach(v => { if (to.has(v)) hit++; });
  return hit;
}

/** Quick rejection: test a sample of values before scanning the whole set. */
function mayOverlap(from: KeyColumn, to: KeyColumn): boolean {
  return from.sample.some(v => to.values.has(v)) || to.sample.some(v => from.values.has(v));
}

export function discoverRelationships(loaded: LoadedTable[]): MappedRelationship[] {
  const keys = keyColumns(loaded);
  const found: MappedRelationship[] = [];

  // 1. Foreign key -> unique key in another table (many-to-one / one-to-one)
  for (const to of keys.filter(k => k.unique)) {
    for (const from of keys) {
      // Self-references (e.g. parent_lead -> id) are allowed; a column never references itself
      if ((from.tableName === to.tableName && from.column === to.column) || !mayOverlap(from, to)) continue;
      if (from.tableName === to.tableName && !ID_NAME.test(to.column)) continue;
      const hit = containment(from.values, to.values);
      const pct = hit / from.values.size;
      if (hit < 5 || pct < 0.1) continue;
      found.push({
        fromTable: from.tableName,
        fromColumn: from.column,
        toTable: to.tableName,
        toColumn: to.column,
        type: from.unique ? 'one-to-one' : 'many-to-one',
        matchPct: Math.round(pct * 1000) / 10,
        matchedValues: hit,
        fromDistinct: from.values.size,
        status: pct >= 0.9 ? 'verified' : 'partial',
        source: 'discovered'
      });
    }
  }

  // A one-to-one pair shows up in both directions; keep the stronger one
  const pairKey = (r: MappedRelationship) =>
    [`${r.fromTable}.${r.fromColumn}`, `${r.toTable}.${r.toColumn}`].sort().join('|');
  const best = new Map<string, MappedRelationship>();
  for (const r of found) {
    const k = pairKey(r);
    const prev = best.get(k);
    if (!prev || r.matchPct > prev.matchPct) best.set(k, r);
  }
  const result = Array.from(best.values());

  // 2. Shared code keys where neither side is unique (e.g. a consultant id in enquiries and in follow-ups),
  //    unless both already point to the same master table
  const referencesOf = (t: string, c: string) =>
    new Set(result.filter(r => r.fromTable === t && r.fromColumn === c).map(r => `${r.toTable}.${r.toColumn}`));
  const shared = keys.filter(k => !k.unique && k.codeLike && k.values.size >= 20);
  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      const a = shared[i], b = shared[j];
      if (a.tableName === b.tableName || !mayOverlap(a, b)) continue;
      const [small, large] = a.values.size <= b.values.size ? [a, b] : [b, a];
      const hit = containment(small.values, large.values);
      const pct = hit / small.values.size;
      if (hit < 20 || pct < 0.9) continue;
      const ra = referencesOf(a.tableName, a.column);
      const rb = referencesOf(b.tableName, b.column);
      if (Array.from(ra).some(x => rb.has(x))) continue; // both reference a master already
      result.push({
        fromTable: small.tableName,
        fromColumn: small.column,
        toTable: large.tableName,
        toColumn: large.column,
        type: 'shared-key',
        matchPct: Math.round(pct * 1000) / 10,
        matchedValues: hit,
        fromDistinct: small.values.size,
        status: 'verified',
        source: 'discovered'
      });
    }
  }

  return result.sort((x, y) => y.matchPct - x.matchPct || y.matchedValues - x.matchedValues);
}

/**
 * Keeps the links a person would draw on a data-model diagram:
 * - documented (dictionary) links first; one link per column per target table (duplicate id columns collapse);
 * - no "sibling" links between two columns that both already point to the same master column;
 * - for partial overlaps, only each column's single best target.
 */
export function pruneRelationships(documented: MappedRelationship[], discovered: MappedRelationship[]): MappedRelationship[] {
  const kept: MappedRelationship[] = [];
  const colTargets = new Set<string>();
  const add = (r: MappedRelationship) => {
    kept.push(r);
    colTargets.add(`${r.fromTable}.${r.fromColumn}>${r.toTable}`);
    colTargets.add(`${r.toTable}.${r.toColumn}>${r.fromTable}`);
  };
  const strong = (r: MappedRelationship) => r.status === 'verified' && r.type !== 'shared-key';

  for (const r of documented) add(r);

  // Masters each column points to with a verified link
  const mastersOf = new Map<string, Set<string>>();
  const noteMaster = (col: string, master: string) => {
    if (!mastersOf.has(col)) mastersOf.set(col, new Set());
    mastersOf.get(col)!.add(master);
  };
  for (const r of [...documented, ...discovered].filter(strong)) {
    noteMaster(`${r.fromTable}.${r.fromColumn}`, `${r.toTable}.${r.toColumn}`);
    // A documented one-to-one also makes the "to" side a child of the same master
    if (r.type === 'one-to-one') noteMaster(`${r.toTable}.${r.toColumn}`, `${r.fromTable}.${r.fromColumn}`);
  }
  const siblings = (r: MappedRelationship) => {
    const a = mastersOf.get(`${r.fromTable}.${r.fromColumn}`);
    const b = mastersOf.get(`${r.toTable}.${r.toColumn}`);
    if (!a || !b) return false;
    return Array.from(a).some(m => b.has(m) || m === `${r.toTable}.${r.toColumn}`) ||
      Array.from(b).some(m => m === `${r.fromTable}.${r.fromColumn}`);
  };

  const bestPartial = new Set<string>();
  for (const r of discovered) {
    const k1 = `${r.fromTable}.${r.fromColumn}>${r.toTable}`;
    const k2 = `${r.toTable}.${r.toColumn}>${r.fromTable}`;
    if (colTargets.has(k1) || colTargets.has(k2)) continue;
    if (r.status !== 'verified' && siblings(r)) continue;
    if (r.status === 'verified' && r.type !== 'shared-key' && siblings(r) && r.type === 'one-to-one') continue;
    if (r.status === 'partial') {
      const col = `${r.fromTable}.${r.fromColumn}`;
      if (bestPartial.has(col) || r.matchedValues < 20) continue;
      bestPartial.add(col);
    }
    add(r);
  }
  return kept;
}

/** Business meaning of a workbook column from the schema mapping (sheet entry first, then shared columns). */
function mappingColumnMeaning(doc: SchemaMappingDoc | null, sheetName: string, header: string): string | undefined {
  if (!doc) return undefined;
  const n = normalizeName(header);
  const col = findSheet(doc, sheetName)?.columns.find(c => normalizeName(c.header) === n);
  if (col?.meaning) return col.meaning;
  const shared = Object.entries(doc.commonColumns).find(([h]) => normalizeName(h) === n);
  return shared?.[1];
}

/** Measures the schema mapping's documented joins against the loaded data. */
export function measureDictionaryRelationships(loaded: LoadedTable[], doc: SchemaMappingDoc | null): MappedRelationship[] {
  const bySheet = (name: string) => loaded.find(l => l.sourceSheet.trim().toLowerCase() === name.trim().toLowerCase() && l.tableName !== 'uploaded_data');
  const colFor = (l: LoadedTable, header: string) =>
    l.table.columns.find(c => l.table.profiles[c]?.sourceHeader === header) ||
    l.table.columns.find(c => normalizeName(l.table.profiles[c]?.sourceHeader || '') === normalizeName(header)) ||
    l.table.columns.find(c => c === header);
  const valuesOf = (l: LoadedTable, col: string) =>
    new Set(l.table.rows.map(r => normalizeKey(r[col])).filter((v): v is string => Boolean(v)));

  const out: MappedRelationship[] = [];
  const documented = (doc?.relationships || [])
    .filter(r => r.to.sheet !== '*')
    .map(r => ({ fromSheet: r.from.sheet, fromHeader: r.from.column, toSheet: r.to.sheet, toHeader: r.to.column, cardinality: r.cardinality, note: r.note || '' }));
  for (const d of documented) {
    const from = bySheet(d.fromSheet);
    const to = bySheet(d.toSheet);
    if (!from || !to) continue;
    const fc = colFor(from, d.fromHeader);
    const tc = colFor(to, d.toHeader);
    if (!fc || !tc) continue;
    const fv = valuesOf(from, fc);
    const tv = valuesOf(to, tc);
    // Measure in the direction where the smaller set should be contained
    const [small, large] = fv.size <= tv.size ? [fv, tv] : [tv, fv];
    const hit = containment(small, large);
    const pct = small.size ? hit / small.size : 0;
    out.push({
      fromTable: from.tableName,
      fromColumn: fc,
      toTable: to.tableName,
      toColumn: tc,
      type: /1\s*:\s*1|0\.\.1/.test(d.cardinality) ? 'one-to-one' : 'many-to-one',
      matchPct: Math.round(pct * 1000) / 10,
      matchedValues: hit,
      fromDistinct: small.size,
      status: pct >= 0.9 ? 'verified' : pct >= 0.1 ? 'partial' : 'not-matching',
      source: 'dictionary',
      note: `${d.cardinality}; ${d.note}`
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Load verification: re-read every table from SQLite and compare with what was parsed
// ---------------------------------------------------------------------------

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-9);
}

export function verifyLoadedTables(db: Database.Database, loaded: LoadedTable[]): TableVerification[] {
  return loaded.map(({ tableName, sheetName, table }) => {
    const failures: string[] = [];
    let checks = 0;
    const q = (id: string) => `"${id.replace(/"/g, '""')}"`;
    const t = q(tableName);

    // Rows: source block = loaded + intentionally skipped, and SQLite holds exactly the loaded rows
    const loadedRows = (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
    checks++;
    if (loadedRows !== table.rows.length) failures.push(`row count ${loadedRows} in SQL vs ${table.rows.length} parsed`);
    checks++;
    if (table.rows.length + table.skippedRows !== table.sourceRows) {
      failures.push(`rows do not reconcile: ${table.sourceRows} in sheet vs ${table.rows.length} loaded + ${table.skippedRows} skipped`);
    }

    // Columns
    const sqlCols = (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(c => c.name).filter(c => c !== 'id');
    checks++;
    const missing = table.columns.filter(c => !sqlCols.includes(c));
    if (missing.length) failures.push(`columns missing in SQL: ${missing.join(', ')}`);

    // Per-column checksums
    for (const col of table.columns) {
      if (!sqlCols.includes(col)) continue;
      const p = table.profiles[col];
      const values = table.rows.map(r => r[col]).filter(v => v !== null && v !== undefined);
      const row = db.prepare(`SELECT COUNT(${q(col)}) AS n, COUNT(DISTINCT ${q(col)}) AS d${p?.isNumeric ? `, SUM(${q(col)}) AS s` : ''} FROM ${t}`).get() as { n: number; d: number; s?: number };
      checks++;
      if (row.n !== values.length) failures.push(`${col}: ${row.n} non-empty values in SQL vs ${values.length} parsed`);
      checks++;
      const distinct = new Set(values.map(v => (typeof v === 'number' ? v : String(v)))).size;
      if (row.d !== distinct) failures.push(`${col}: ${row.d} distinct values in SQL vs ${distinct} parsed`);
      if (p?.isNumeric) {
        checks++;
        const sum = values.reduce((a: number, v) => a + (typeof v === 'number' ? v : 0), 0);
        if (!close(row.s ?? 0, sum)) failures.push(`${col}: sum ${row.s} in SQL vs ${sum} parsed`);
      }
    }

    // First and last row, cell by cell
    if (table.rows.length > 0) {
      for (const [label, order, expected] of [['first', 'ASC', table.rows[0]], ['last', 'DESC', table.rows[table.rows.length - 1]]] as const) {
        const got = db.prepare(`SELECT * FROM ${t} ORDER BY id ${order} LIMIT 1`).get() as Record<string, any> | undefined;
        checks++;
        const diff = table.columns.filter(c => sqlCols.includes(c) && !sameCell(got?.[c], expected[c]));
        if (diff.length) failures.push(`${label} row differs in: ${diff.slice(0, 5).join(', ')}`);
      }
    }

    return {
      tableName,
      sheetName,
      range: table.range,
      sourceRows: table.sourceRows,
      loadedRows,
      skippedRows: table.skippedRows,
      columnsExpected: table.columns.length,
      columnsLoaded: table.columns.filter(c => sqlCols.includes(c)).length,
      checks,
      failures,
      ok: failures.length === 0
    };
  });
}

function sameCell(a: unknown, b: unknown): boolean {
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
  if (typeof a === 'number' && typeof b === 'number') return close(a, b);
  return String(a) === String(b);
}

// ---------------------------------------------------------------------------
// Persisting the mapping
// ---------------------------------------------------------------------------

export const MAPPING_TABLES = ['_schema_tables', '_schema_columns', '_schema_relationships'];

export function writeSchemaMapping(
  db: Database.Database,
  loaded: LoadedTable[],
  verification: TableVerification[],
  relationships: MappedRelationship[],
  doc: SchemaMappingDoc | null = null
): MappingSummary {
  db.exec(`
    DROP TABLE IF EXISTS _schema_tables;
    DROP TABLE IF EXISTS _schema_columns;
    DROP TABLE IF EXISTS _schema_relationships;
    CREATE TABLE _schema_tables (
      table_name TEXT PRIMARY KEY, sheet_name TEXT, source_sheet TEXT, hidden_sheet INTEGER, cell_range TEXT,
      source_rows INTEGER, loaded_rows INTEGER, skipped_rows INTEGER, column_count INTEGER,
      primary_key TEXT, verified INTEGER, checks INTEGER, verification_notes TEXT, load_notes TEXT
    );
    CREATE TABLE _schema_columns (
      table_name TEXT, position INTEGER, column_name TEXT, source_header TEXT, data_type TEXT, is_date INTEGER,
      is_primary_key INTEGER, non_null INTEGER, distinct_values INTEGER, min_value TEXT, max_value TEXT,
      business_meaning TEXT, PRIMARY KEY (table_name, column_name)
    );
    CREATE TABLE _schema_relationships (
      from_table TEXT, from_column TEXT, to_table TEXT, to_column TEXT, relationship_type TEXT,
      match_pct REAL, matched_values INTEGER, from_distinct INTEGER, status TEXT, source TEXT, note TEXT
    );
  `);

  const pkOf = (l: LoadedTable) => {
    const entity = l.sourceSheet.toLowerCase().replace(/^(dlite|spear|sfdc|sfmc)_/, '').split(/[^a-z]+/).filter(w => w.length > 2 && !['table', 'data', 'prod'].includes(w));
    const candidates = l.table.columns.filter(c => {
      const p = l.table.profiles[c];
      return p && !p.isDate && (p.nullCount || 0) === 0 && p.distinctCount === l.table.rows.length && l.table.rows.length > 1;
    });
    const score = (c: string) =>
      (ID_NAME.test(c) ? 4 : 0) + (entity.some(e => c.includes(e)) ? 2 : 0) - (NOT_A_KEY.test(c) || AUDIT_FIELD.test(c) ? 10 : 0) - (l.table.profiles[c].isNumeric ? 1 : 0);
    return candidates.sort((a, b) => score(b) - score(a))[0];
  };

  const insTable = db.prepare(`INSERT INTO _schema_tables VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insCol = db.prepare(`INSERT INTO _schema_columns VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insRel = db.prepare(`INSERT INTO _schema_relationships VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  db.transaction(() => {
    for (const l of loaded) {
      const v = verification.find(x => x.tableName === l.tableName);
      const pk = pkOf(l);
      insTable.run(
        l.tableName, l.sheetName, l.sourceSheet, l.hidden ? 1 : 0, l.table.range ?? null,
        l.table.sourceRows, v?.loadedRows ?? l.table.rows.length, l.table.skippedRows, l.table.columns.length,
        pk ?? null, v?.ok ? 1 : 0, v?.checks ?? 0, v?.failures.join('; ') || null, l.table.notes.join('; ') || null
      );
      l.table.columns.forEach((col, i) => {
        const p = l.table.profiles[col];
        const header = p?.sourceHeader || col;
        const min = p?.isNumeric ? p.min : p?.dateMin;
        const max = p?.isNumeric ? p.max : p?.dateMax;
        insCol.run(
          l.tableName, i + 1, col, header, p?.isDate ? 'DATE' : p?.column_type || 'TEXT', p?.isDate ? 1 : 0,
          col === pk ? 1 : 0, l.table.rows.length - (p?.nullCount || 0), p?.distinctCount ?? null,
          min === undefined ? null : String(min), max === undefined ? null : String(max),
          mappingColumnMeaning(doc, l.sourceSheet, header) ?? null
        );
      });
    }
    for (const r of relationships) {
      insRel.run(r.fromTable, r.fromColumn, r.toTable, r.toColumn, r.type, r.matchPct, r.matchedValues, r.fromDistinct, r.status, r.source, r.note ?? null);
    }
  })();

  const failures = verification.filter(v => !v.ok).map(v => `${v.sheetName}: ${v.failures.join('; ')}`);
  return {
    tables: loaded.length,
    verifiedTables: verification.filter(v => v.ok).length,
    rowsLoaded: verification.reduce((a, v) => a + v.loadedRows, 0),
    relationships: relationships.filter(r => r.status !== 'not-matching').length,
    verifiedRelationships: relationships.filter(r => r.status === 'verified').length,
    failures
  };
}

/** The stored mapping, for the API / UI. */
export function readSchemaMapping(db: Database.Database) {
  const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_tables'`).get();
  if (!exists) return null;
  return {
    tables: db.prepare(`SELECT * FROM _schema_tables ORDER BY rowid`).all(),
    columns: db.prepare(`SELECT * FROM _schema_columns ORDER BY table_name, position`).all(),
    relationships: db.prepare(`SELECT * FROM _schema_relationships ORDER BY source, match_pct DESC`).all()
  };
}

/**
 * Finds numbers that repeat on every row of the same key (e.g. an email job's totals copied onto each
 * event row). Summing such columns over raw rows multiplies them, so queries must reduce to one row per
 * key first.
 */
export function detectRepeatedTotals(table: CleanTable): { key: string; columns: string[] } | null {
  const n = table.rows.length;
  if (n < 20) return null;
  const numeric = table.columns.filter(c => table.profiles[c]?.isNumeric && (table.profiles[c]?.distinctCount || 0) > 2);
  if (numeric.length < 2) return null;
  const keys = table.columns.filter(c => {
    const p = table.profiles[c];
    const d = p?.distinctCount || 0;
    return p && !p.isNumeric && !p.isDate && /(^|_)(id|code|num|number|no|key)$|id$/.test(c) && d >= 5 && d < n * 0.95;
  });
  for (const key of keys) {
    const groups = new Map<string, Record<string, CleanValue>[]>();
    for (const r of table.rows) {
      const k = r[key];
      if (k === null || k === undefined) continue;
      const list = groups.get(String(k));
      if (list) list.push(r);
      else groups.set(String(k), [r]);
    }
    const repeated = Array.from(groups.values()).filter(g => g.length > 1);
    if (repeated.length < Math.max(5, groups.size * 0.05)) continue;
    const constant = numeric.filter(c => {
      const same = repeated.filter(g => g.every(r => r[c] === g[0][c])).length;
      // Mostly-zero/blank columns are "constant" trivially; they don't carry repeated totals
      const trivial = repeated.filter(g => g[0][c] === null || g[0][c] === 0).length;
      return same / repeated.length >= 0.95 && trivial / repeated.length < 0.5;
    });
    if (constant.length >= 2) return { key, columns: constant };
  }
  return null;
}
