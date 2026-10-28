/**
 * Shared plumbing for the schema-mapping API routes (server only).
 */

import { NextResponse } from 'next/server';
import { getDatasetMetadata, getQueryableTables, DatasetMetadata, QueryableTable } from '../sqlite-server';
import { editableMapping, MappingConflictError, ActiveMapping } from './store';
import { MappingEditError, SchemaMappingDoc } from './model';

export interface MappingContext {
  meta: DatasetMetadata;
  tables: QueryableTable[];
  active: ActiveMapping & { doc: SchemaMappingDoc };
  /** Version number edits must be based on (0 = nothing saved yet for this workbook) */
  currentVersion: number;
}

/** The loaded dataset and its editable mapping, or a response saying there is no data. */
export function mappingContext(): MappingContext | NextResponse {
  const meta = getDatasetMetadata();
  if (!meta) {
    return NextResponse.json({ success: false, loaded: false, error: 'Upload a workbook first: a mapping belongs to a workbook.' }, { status: 409 });
  }
  const tables = getQueryableTables(meta).filter(t => t.tableName !== 'uploaded_data' || getQueryableTables(meta).length === 1);
  const active = editableMapping(meta);
  return { meta, tables, active, currentVersion: active.version?.version ?? 0 };
}

export function mappingErrorResponse(err: unknown): NextResponse {
  if (err instanceof MappingConflictError) {
    return NextResponse.json({ success: false, conflict: true, currentVersion: err.currentVersion, error: err.message }, { status: 409 });
  }
  if (err instanceof MappingEditError) {
    return NextResponse.json({ success: false, error: err.message, errors: err.issues }, { status: 422 });
  }
  return NextResponse.json({ success: false, error: (err as Error)?.message || String(err) }, { status: 500 });
}

export async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    throw new MappingEditError('Request body must be valid JSON');
  }
}

/** Column facts the editor needs to build and check a mapping */
export function describeDataTables(tables: QueryableTable[]) {
  return tables.map(t => ({
    sheetName: t.sheetName,
    tableName: t.tableName,
    rowCount: t.rowCount,
    columns: t.columns.map(c => {
      const p = t.profiles[c];
      return {
        column: c,
        header: p?.sourceHeader || c,
        type: p?.isDate ? 'date' : p?.isNumeric ? 'number' : 'text',
        distinct: p?.distinctCount ?? null,
        examples: (p?.distinctValues || []).slice(0, 3).map(v => String(v).slice(0, 40))
      };
    })
  }));
}
