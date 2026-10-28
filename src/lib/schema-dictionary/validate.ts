/**
 * Validation of a mapping against the loaded data (server only): which documented sheets and
 * headers exist, which data tables are not documented, and, for every relationship whose two sides
 * are loaded, the share of key values that actually match (so a wrong join is caught before the SQL
 * agent is told to use it).
 */

import { getSQLiteDB, QueryableTable } from '../sqlite-server';
import { MappingIssue, SchemaMappingDoc, checkMappingStructure, findSheet } from './model';
import { resolveMappingSheets, tableForSheet, columnResolver } from './resolve';

export interface RelationshipCheck {
  index: number;
  fromTable?: string;
  fromColumn?: string;
  toTable?: string;
  toColumn?: string;
  /** Share of the smaller side's distinct values found on the other side */
  matchPct?: number;
  matchedValues?: number;
  distinctValues?: number;
  status: 'verified' | 'partial' | 'not-matching' | 'not-loaded' | 'wildcard';
}

export interface SheetCheck {
  sheet: string;
  tableName: string | null;
  rowCount: number;
  documentedColumns: number;
  dataColumns: number;
  missingHeaders: string[];
  undocumentedColumns: string[];
}

export interface MappingValidationReport {
  ok: boolean;
  errors: MappingIssue[];
  warnings: MappingIssue[];
  sheets: SheetCheck[];
  relationships: RelationshipCheck[];
  /** Data tables no sheet of the mapping describes */
  unmappedTables: { sheetName: string; tableName: string; rowCount: number; columns: number }[];
}

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;
const EMPTY = `('', 'NA', 'N/A', 'NULL', 'NONE', '(NOT SET)', '-', '0', '1')`;

/** Measured overlap of two key columns, in the direction where the smaller set should be contained. */
export function measureJoin(fromTable: string, fromColumn: string, toTable: string, toColumn: string) {
  const keys = (t: string, c: string) =>
    `SELECT DISTINCT UPPER(TRIM(CAST(${q(c)} AS TEXT))) v FROM ${q(t)} WHERE ${q(c)} IS NOT NULL AND UPPER(TRIM(CAST(${q(c)} AS TEXT))) NOT IN ${EMPTY}`;
  const row = getSQLiteDB().prepare(`
    WITH f AS (${keys(fromTable, fromColumn)}), g AS (${keys(toTable, toColumn)})
    SELECT (SELECT COUNT(*) FROM f) fd, (SELECT COUNT(*) FROM g) gd, (SELECT COUNT(*) FROM f WHERE v IN (SELECT v FROM g)) hit
  `).get() as { fd: number; gd: number; hit: number };
  const small = Math.min(row.fd, row.gd);
  const pct = small ? row.hit / small : 0;
  return {
    matchPct: Math.round(pct * 1000) / 10,
    matchedValues: row.hit,
    distinctValues: small,
    status: (pct >= 0.9 ? 'verified' : pct >= 0.1 ? 'partial' : 'not-matching') as RelationshipCheck['status']
  };
}

export function validateMappingAgainstData(
  doc: SchemaMappingDoc,
  tables: QueryableTable[],
  opts: { measureJoins?: boolean } = {}
): MappingValidationReport {
  const issues = checkMappingStructure(doc);
  const resolved = resolveMappingSheets(doc, tables);
  const loaded = tables.length > 0;

  const sheets: SheetCheck[] = doc.sheets.map((s, i) => {
    const r = resolved.find(x => x.sheet === s);
    if (!r) {
      if (loaded) {
        issues.push({
          level: s.sqlTable ? 'error' : 'warning',
          path: `sheets[${i}]`,
          message: s.sqlTable
            ? `"${s.sheet}": SQL table "${s.sqlTable}" does not exist in the loaded data`
            : `"${s.sheet}" is not in the loaded data (it is used once a file with this sheet is loaded)`
        });
      }
      return { sheet: s.sheet, tableName: null, rowCount: 0, documentedColumns: s.columns.length, dataColumns: 0, missingHeaders: [], undocumentedColumns: [] };
    }
    if (r.missingHeaders.length) {
      issues.push({
        level: 'warning',
        path: `sheets[${i}].columns`,
        message: `"${s.sheet}": ${r.missingHeaders.length} documented column(s) not found in the data: ${r.missingHeaders.slice(0, 6).join(', ')}${r.missingHeaders.length > 6 ? '…' : ''}`
      });
    }
    s.columns.forEach((c, j) => {
      if (c.sqlColumn && !r.table.columns.includes(c.sqlColumn)) {
        issues.push({ level: 'error', path: `sheets[${i}].columns[${j}].sqlColumn`, message: `"${s.sheet}": SQL column "${c.sqlColumn}" does not exist in ${r.table.tableName}` });
      }
    });
    return {
      sheet: s.sheet,
      tableName: r.table.tableName,
      rowCount: r.table.rowCount,
      documentedColumns: r.meanings.filter(m => m.documented).length,
      dataColumns: r.table.columns.length,
      missingHeaders: r.missingHeaders,
      undocumentedColumns: r.meanings.filter(m => !m.documented).map(m => m.column)
    };
  });

  // Two documented sheets resolving to the same table would give it two conflicting descriptions
  const byTable = new Map<string, string>();
  for (const r of resolved) {
    const prev = byTable.get(r.table.tableName);
    if (prev) issues.push({ level: 'error', path: 'sheets', message: `"${prev}" and "${r.sheet.sheet}" both describe table ${r.table.tableName}` });
    else byTable.set(r.table.tableName, r.sheet.sheet);
  }

  const relationships: RelationshipCheck[] = doc.relationships.map((rel, index) => {
    if (rel.to.sheet === '*') return { index, status: 'wildcard' };
    const fromSheet = findSheet(doc, rel.from.sheet);
    const toSheet = findSheet(doc, rel.to.sheet);
    const ft = fromSheet && tableForSheet(fromSheet, tables);
    const tt = toSheet && tableForSheet(toSheet, tables);
    if (!ft || !tt) return { index, status: 'not-loaded' };
    const fc = resolved.find(r => r.table === ft)?.columnFor(rel.from.column) ?? columnResolver(ft)(rel.from.column);
    const tc = resolved.find(r => r.table === tt)?.columnFor(rel.to.column) ?? columnResolver(tt)(rel.to.column);
    const label = `${rel.from.sheet}.${rel.from.column} → ${rel.to.sheet}.${rel.to.column}`;
    if (!fc || !tc) {
      issues.push({ level: 'error', path: `relationships[${index}]`, message: `${label}: column "${!fc ? rel.from.column : rel.to.column}" does not exist in the loaded ${!fc ? ft.tableName : tt.tableName}` });
      return { index, fromTable: ft.tableName, toTable: tt.tableName, status: 'not-matching' };
    }
    const base = { index, fromTable: ft.tableName, fromColumn: fc, toTable: tt.tableName, toColumn: tc };
    if (opts.measureJoins === false) return { ...base, status: 'not-loaded' };
    try {
      const m = measureJoin(ft.tableName, fc, tt.tableName, tc);
      if (m.status === 'not-matching') {
        issues.push({ level: 'warning', path: `relationships[${index}]`, message: `${label}: only ${m.matchPct}% of key values match in the data; the SQL agent would get wrong joins` });
      } else if (m.status === 'partial') {
        issues.push({ level: 'warning', path: `relationships[${index}]`, message: `${label}: partial join (${m.matchPct}% of key values match); say so in its note` });
      }
      return { ...base, ...m };
    } catch (err: any) {
      issues.push({ level: 'warning', path: `relationships[${index}]`, message: `${label}: could not be measured (${err?.message || err})` });
      return { ...base, status: 'not-matching' };
    }
  });

  const mappedTables = new Set(resolved.map(r => r.table.tableName));
  const unmappedTables = tables
    .filter(t => !mappedTables.has(t.tableName) && t.tableName !== 'uploaded_data')
    .map(t => ({ sheetName: t.sheetName, tableName: t.tableName, rowCount: t.rowCount, columns: t.columns.length }));

  const errors = issues.filter(i => i.level === 'error');
  return { ok: errors.length === 0, errors, warnings: issues.filter(i => i.level === 'warning'), sheets, relationships, unmappedTables };
}

/**
 * Brings the upload's catalog (_schema_columns meanings, documented _schema_relationships) in line
 * with a newly saved mapping, so the Data Mapping page shows what the SQL agent now uses.
 */
export function syncMappingToCatalog(doc: SchemaMappingDoc, tables: QueryableTable[]): void {
  const db = getSQLiteDB();
  const exists = (name: string) => Boolean(db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`).get(name));
  if (!exists('_schema_columns')) return;
  const resolved = resolveMappingSheets(doc, tables);
  const report = exists('_schema_relationships') ? validateMappingAgainstData(doc, tables) : null;

  db.transaction(() => {
    db.prepare(`UPDATE _schema_columns SET business_meaning = NULL`).run();
    const setMeaning = db.prepare(`UPDATE _schema_columns SET business_meaning = ? WHERE table_name = ? AND column_name = ?`);
    for (const r of resolved) {
      for (const m of r.meanings) if (m.documented) setMeaning.run(m.meaning, r.table.tableName, m.column);
    }
    if (report) {
      db.prepare(`DELETE FROM _schema_relationships WHERE source = 'dictionary'`).run();
      const ins = db.prepare(`INSERT INTO _schema_relationships VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
      for (const c of report.relationships) {
        if (!c.fromTable || !c.toTable || !c.fromColumn || !c.toColumn || c.matchPct === undefined) continue;
        const rel = doc.relationships[c.index];
        const type = /1\s*:\s*1|0\.\.1|one-to-one/i.test(rel.cardinality) ? 'one-to-one' : 'many-to-one';
        ins.run(c.fromTable, c.fromColumn, c.toTable, c.toColumn, type, c.matchPct, c.matchedValues ?? 0, c.distinctValues ?? 0,
          c.status, 'dictionary', `${rel.cardinality}${rel.note ? `; ${rel.note}` : ''}`);
      }
    }
  })();
}
