import { NextRequest, NextResponse } from 'next/server';
import { mappingContext, mappingErrorResponse, readJson } from '@/lib/schema-dictionary/api';
import { addSheetToDoc, diffMappingDocs, MappingEditError, normalizeName } from '@/lib/schema-dictionary/model';
import { validateMappingAgainstData } from '@/lib/schema-dictionary/validate';
import { saveMappingVersion } from '@/lib/schema-dictionary/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Adds one sheet to the workbook's mapping as a new version, leaving every existing sheet,
 * relationship and definition exactly as it was.
 * Body: { sheet, relationships?, definitions?, baseVersion, note?, source? }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = mappingContext();
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(req);
    if (typeof body?.baseVersion !== 'number') throw new MappingEditError('baseVersion (the version the new sheet is added to) is required');
    if (body.baseVersion !== ctx.currentVersion) {
      return NextResponse.json({
        success: false, conflict: true, currentVersion: ctx.currentVersion,
        error: `The mapping changed since you opened it (now version ${ctx.currentVersion}). Reload and add the sheet again.`
      }, { status: 409 });
    }

    const before = ctx.active.doc;
    const next = addSheetToDoc(before, {
      sheet: body.sheet,
      relationships: Array.isArray(body.relationships) ? body.relationships : [],
      definitions: Array.isArray(body.definitions) ? body.definitions : []
    });
    if (body.source === 'ai') next.sheets[next.sheets.length - 1].origin = 'ai';
    const added = next.sheets[next.sheets.length - 1];

    // Only the new sheet's own problems block it: existing entries are not re-judged here
    const report = validateMappingAgainstData(next, ctx.tables);
    const newIndex = next.sheets.length - 1;
    const firstNewRel = before.relationships.length;
    const touchesNew = (path: string) =>
      path.startsWith(`sheets[${newIndex}]`) ||
      (/^relationships\[(\d+)\]/.test(path) && Number(path.match(/^relationships\[(\d+)\]/)![1]) >= firstNewRel) ||
      (/^definitions\[(\d+)\]/.test(path) && Number(path.match(/^definitions\[(\d+)\]/)![1]) >= before.definitions.length) ||
      path === 'sheets';
    const blocking = report.errors.filter(e => touchesNew(e.path) && (e.path !== 'sheets' || e.message.includes(`"${added.sheet}"`)));
    if (blocking.length) {
      return NextResponse.json({ success: false, error: blocking[0].message, errors: blocking, report }, { status: 422 });
    }

    // Guarantee: the new version only adds to the old one
    const diff = diffMappingDocs(before, next);
    if (diff.sheetsChanged.length || diff.sheetsRemoved.length || diff.relationshipsRemoved || diff.definitionsChanged.length ||
        diff.definitionsRemoved.length || diff.settingsChanged.length || diff.sheetsAdded.length !== 1 ||
        normalizeName(diff.sheetsAdded[0]) !== normalizeName(added.sheet)) {
      throw new Error('Adding the sheet would change existing mapping entries; nothing was saved.');
    }

    const saved = saveMappingVersion(ctx.active.workbookKey, next, {
      source: 'add_sheet',
      note: typeof body.note === 'string' && body.note.trim() ? body.note : `Added sheet "${added.sheet}"`,
      baseVersion: body.baseVersion,
      fileName: ctx.meta.fileName,
      previous: before
    });
    return NextResponse.json({
      success: true,
      ...saved,
      doc: next,
      sheet: added,
      report: {
        sheet: report.sheets[newIndex],
        relationships: report.relationships.filter(r => r.index >= firstNewRel),
        warnings: report.warnings.filter(w => touchesNew(w.path))
      }
    });
  } catch (err) {
    return mappingErrorResponse(err);
  }
}
