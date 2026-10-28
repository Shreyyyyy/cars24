/**
 * Matches a mapping document to the loaded data: each documented sheet to its SQL table and each
 * documented header to its SQL column (server only).
 */

import type { QueryableTable } from '../sqlite-server';
import { sanitizeIdentifier } from '../tabular-ingest';
import { MappingSheet, SchemaMappingDoc, normalizeName } from './model';

export interface ResolvedMappingSheet {
  sheet: MappingSheet;
  table: QueryableTable;
  /** Normalised header (or SQL name) -> SQL column */
  columnFor(header: string): string | undefined;
  /** Every SQL column with its meaning (documented, shared, or "Not documented") */
  meanings: { column: string; meaning: string; documented: boolean }[];
  /** Documented headers with no matching SQL column */
  missingHeaders: string[];
}

export function tableForSheet(sheet: MappingSheet, tables: QueryableTable[]): QueryableTable | undefined {
  if (sheet.sqlTable) return tables.find(t => t.tableName === sheet.sqlTable);
  const n = normalizeName(sheet.sheet);
  return tables.find(t => normalizeName(t.sheetName) === n) || tables.find(t => t.tableName === sheet.sheet.trim());
}

export function columnResolver(table: QueryableTable): (header: string) => string | undefined {
  const byHeader = new Map<string, string>();
  for (const col of table.columns) {
    const h = table.profiles[col]?.sourceHeader;
    if (h && !byHeader.has(normalizeName(h))) byHeader.set(normalizeName(h), col);
  }
  const cols = new Set(table.columns);
  return (header: string) => {
    if (!header) return undefined;
    // The workbook header wins (e.g. header "id" may have been loaded as "id_2")
    const byName = byHeader.get(normalizeName(header));
    if (byName) return byName;
    if (cols.has(header)) return header;
    const sanitized = sanitizeIdentifier(header, header);
    return cols.has(sanitized) ? sanitized : undefined;
  };
}

export function resolveMappingSheets(doc: SchemaMappingDoc, tables: QueryableTable[]): ResolvedMappingSheet[] {
  const common = new Map(Object.entries(doc.commonColumns).map(([h, m]) => [normalizeName(h), m]));
  const out: ResolvedMappingSheet[] = [];
  for (const sheet of doc.sheets) {
    const table = tableForSheet(sheet, tables);
    if (!table) continue;
    const lookup = columnResolver(table);
    const columnFor = (header: string) => {
      const doc = sheet.columns.find(c => normalizeName(c.header) === normalizeName(header));
      if (doc?.sqlColumn && table.columns.includes(doc.sqlColumn)) return doc.sqlColumn;
      return lookup(header);
    };
    const described = new Set<string>();
    const meanings: ResolvedMappingSheet['meanings'] = [];
    const missingHeaders: string[] = [];
    for (const c of sheet.columns) {
      const column = c.sqlColumn && table.columns.includes(c.sqlColumn) ? c.sqlColumn : lookup(c.header);
      if (!column) {
        missingHeaders.push(c.header);
        continue;
      }
      if (described.has(column)) continue;
      described.add(column);
      meanings.push({ column, meaning: c.meaning || 'Not documented', documented: Boolean(c.meaning) });
    }
    // Anything the sheet's own list didn't cover falls back to the shared definitions
    for (const col of table.columns) {
      if (described.has(col)) continue;
      const header = table.profiles[col]?.sourceHeader || col;
      const shared = common.get(normalizeName(header)) ?? common.get(normalizeName(col));
      meanings.push({ column: col, meaning: shared || 'Not documented', documented: Boolean(shared) });
    }
    out.push({ sheet, table, columnFor, meanings, missingHeaders });
  }
  return out;
}
