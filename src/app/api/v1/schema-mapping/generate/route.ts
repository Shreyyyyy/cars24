import { NextRequest, NextResponse } from 'next/server';
import { mappingContext, mappingErrorResponse, readJson } from '@/lib/schema-dictionary/api';
import { generateMappingDraft } from '@/lib/schema-dictionary/ai-generate';
import { resolveMappingSheets } from '@/lib/schema-dictionary/resolve';
import { MappingEditError, normalizeName } from '@/lib/schema-dictionary/model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_SHEETS_PER_REQUEST = 60;

/**
 * Drafts mapping entries with AI (nothing is saved; the editor reviews the draft first).
 * Body: { scope?: "unmapped" | "all" | "selected", sheets?: string[] (sheet or table names), context?, useModel? }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = mappingContext();
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(req).catch(() => ({}));
    const scope = body?.scope === 'all' || body?.scope === 'selected' ? body.scope : Array.isArray(body?.sheets) ? 'selected' : 'unmapped';

    const mapped = new Set(resolveMappingSheets(ctx.active.doc, ctx.tables).map(r => r.table.tableName));
    const wanted = new Set((Array.isArray(body?.sheets) ? body.sheets : []).map((s: unknown) => normalizeName(String(s))));
    const tables = ctx.tables.filter(t =>
      scope === 'all' ? true
        : scope === 'selected' ? wanted.has(normalizeName(t.sheetName)) || wanted.has(normalizeName(t.tableName))
          : !mapped.has(t.tableName));
    if (tables.length === 0) {
      throw new MappingEditError(scope === 'unmapped' ? 'Every sheet in the data is already mapped.' : 'None of the requested sheets are in the loaded data.');
    }
    if (tables.length > MAX_SHEETS_PER_REQUEST) {
      throw new MappingEditError(`At most ${MAX_SHEETS_PER_REQUEST} sheets per request; select fewer.`);
    }

    const draft = await generateMappingDraft({
      tables,
      allTables: ctx.tables,
      existing: ctx.active.doc,
      context: typeof body?.context === 'string' ? body.context.slice(0, 2000) : undefined,
      useModel: body?.useModel !== false
    });
    return NextResponse.json({ success: true, scope, ...draft });
  } catch (err) {
    return mappingErrorResponse(err);
  }
}
