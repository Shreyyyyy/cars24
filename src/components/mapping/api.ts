/**
 * Client for /api/v1/schema-mapping/* and the shapes the editor works with.
 */

import type { SchemaMappingDoc, MappingIssue, MappingSheet, MappingRelationship, MappingDefinition, MappingDiff } from '@/lib/schema-dictionary/model';
import type { MappingValidationReport, RelationshipCheck, SheetCheck } from '@/lib/schema-dictionary/validate';
import type { MappingVersionInfo } from '@/lib/schema-dictionary/store';

export type { MappingValidationReport, RelationshipCheck, SheetCheck, MappingVersionInfo };

export interface DataColumn {
  column: string;
  header: string;
  type: 'date' | 'number' | 'text';
  distinct: number | null;
  examples: string[];
}

export interface DataTable {
  sheetName: string;
  tableName: string;
  rowCount: number;
  columns: DataColumn[];
}

export interface MappingState {
  fileName: string;
  workbookKey: string;
  origin: 'stored' | 'builtin' | 'none';
  version: MappingVersionInfo | null;
  currentVersion: number;
  doc: SchemaMappingDoc;
  report: MappingValidationReport;
  dataTables: DataTable[];
  builtinMatches: number;
}

export interface MappingDraft {
  sheets: MappingSheet[];
  relationships: MappingRelationship[];
  definitions: MappingDefinition[];
  model: string;
  notes: string[];
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: any) {
    super(message);
  }
  get conflict(): boolean {
    return this.status === 409 && Boolean(this.body?.conflict);
  }
  get issues(): MappingIssue[] {
    return this.body?.errors || [];
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1/schema-mapping${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new ApiError(body.error || `Request failed (${res.status})`, res.status, body);
  return body as T;
}

export const mappingApi = {
  load: () => call<{ loaded: boolean } & MappingState>('/document'),
  save: (doc: SchemaMappingDoc, baseVersion: number, note: string, source: 'manual' | 'ai' | 'import') =>
    call<{ version: MappingVersionInfo; diff: MappingDiff; report: MappingValidationReport }>('/document', {
      method: 'PUT', body: JSON.stringify({ doc, baseVersion, note, source })
    }),
  validate: (doc: SchemaMappingDoc) =>
    call<{ doc: SchemaMappingDoc; report: MappingValidationReport }>('/validate', { method: 'POST', body: JSON.stringify({ doc }) }),
  addSheet: (body: { sheet: MappingSheet; relationships: MappingRelationship[]; definitions: MappingDefinition[]; baseVersion: number; note?: string; source?: 'ai' | 'manual' }) =>
    call<{ version: MappingVersionInfo; report: { sheet?: SheetCheck; relationships: RelationshipCheck[]; warnings: MappingIssue[] } }>('/sheets', {
      method: 'POST', body: JSON.stringify(body)
    }),
  generate: (body: { scope?: 'unmapped' | 'all' | 'selected'; sheets?: string[]; context?: string }) =>
    call<MappingDraft>('/generate', { method: 'POST', body: JSON.stringify(body) }),
  versions: () => call<{ versions: MappingVersionInfo[]; currentVersion: number }>('/versions'),
  version: (id: number, compare?: number) =>
    call<{ info: MappingVersionInfo; doc: SchemaMappingDoc; diff?: MappingDiff }>(`/versions?id=${id}${compare ? `&compare=${compare}` : ''}`),
  restore: (id: number, baseVersion: number) =>
    call<{ version: MappingVersionInfo }>('/versions', { method: 'POST', body: JSON.stringify({ action: 'restore', id, baseVersion }) }),
  preview: (doc: SchemaMappingDoc | undefined, question: string) =>
    call<{ applies: boolean; message?: string; systemPrompt?: string; canonicalDefinitions?: string; relevantTables?: string[]; approxTokens?: number }>('/preview', {
      method: 'POST', body: JSON.stringify({ doc, question })
    })
};

export function downloadJson(doc: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
