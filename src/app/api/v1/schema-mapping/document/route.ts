import { NextRequest, NextResponse } from 'next/server';
import { mappingContext, mappingErrorResponse, readJson, describeDataTables } from '@/lib/schema-dictionary/api';
import { parseMappingDoc, MappingEditError } from '@/lib/schema-dictionary/model';
import { validateMappingAgainstData } from '@/lib/schema-dictionary/validate';
import { saveMappingVersion, VersionSource, listMappedWorkbooks } from '@/lib/schema-dictionary/store';
import { builtinMappingDoc } from '@/lib/schema-dictionary/builtin';
import { resolveMappingSheets } from '@/lib/schema-dictionary/resolve';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The active schema mapping of the loaded workbook, with the data it describes and a quick validation. */
export async function GET() {
  try {
    const ctx = mappingContext();
    if (ctx instanceof NextResponse) return ctx;
    const { meta, tables, active, currentVersion } = ctx;
    return NextResponse.json({
      success: true,
      loaded: true,
      fileName: meta.fileName,
      workbookKey: active.workbookKey,
      origin: active.origin,
      version: active.version,
      currentVersion,
      doc: active.doc,
      report: validateMappingAgainstData(active.doc, tables, { measureJoins: false }),
      dataTables: describeDataTables(tables),
      builtinMatches: resolveMappingSheets(builtinMappingDoc(), tables).length,
      otherWorkbooks: listMappedWorkbooks().filter(w => w.workbookKey !== active.workbookKey)
    });
  } catch (err) {
    return mappingErrorResponse(err);
  }
}

/** Saves an edited, imported or generated mapping as a new version. Body: { doc, baseVersion, note?, source? } */
export async function PUT(req: NextRequest) {
  try {
    const ctx = mappingContext();
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(req);
    if (typeof body?.baseVersion !== 'number') throw new MappingEditError('baseVersion (the version your edit started from) is required');
    const { doc, issues } = parseMappingDoc(body.doc);
    const report = validateMappingAgainstData(doc, ctx.tables, { measureJoins: false });
    const errors = [...issues.filter(i => i.level === 'error'), ...report.errors];
    if (errors.length) {
      return NextResponse.json({ success: false, error: `${errors.length} error(s) must be fixed before saving: ${errors[0].message}`, errors, report }, { status: 422 });
    }
    const source: VersionSource = ['manual', 'ai', 'import'].includes(body.source) ? body.source : 'manual';
    const saved = saveMappingVersion(ctx.active.workbookKey, doc, {
      source,
      note: typeof body.note === 'string' ? body.note : undefined,
      baseVersion: body.baseVersion,
      fileName: ctx.meta.fileName,
      previous: ctx.active.doc
    });
    return NextResponse.json({ success: true, ...saved, doc, report });
  } catch (err) {
    return mappingErrorResponse(err);
  }
}
