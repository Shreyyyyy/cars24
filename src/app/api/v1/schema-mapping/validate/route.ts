import { NextRequest, NextResponse } from 'next/server';
import { mappingContext, mappingErrorResponse, readJson } from '@/lib/schema-dictionary/api';
import { parseMappingDoc } from '@/lib/schema-dictionary/model';
import { validateMappingAgainstData } from '@/lib/schema-dictionary/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Full validation of a draft (or the active mapping when no doc is sent) against the loaded data,
 * including the measured match % of every relationship. Body: { doc? }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = mappingContext();
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(req).catch(() => ({}));
    const parsed = body?.doc !== undefined ? parseMappingDoc(body.doc) : { doc: ctx.active.doc, issues: [] };
    const report = validateMappingAgainstData(parsed.doc, ctx.tables);
    const parseErrors = parsed.issues.filter(i => i.level === 'error');
    // Structural issues from parsing come first; the data report repeats the structural checks, so only add parse-only ones
    const seen = new Set([...report.errors, ...report.warnings].map(i => `${i.path}|${i.message}`));
    const extra = parsed.issues.filter(i => !seen.has(`${i.path}|${i.message}`));
    return NextResponse.json({
      success: true,
      doc: parsed.doc,
      report: {
        ...report,
        ok: report.ok && parseErrors.length === 0,
        errors: [...extra.filter(i => i.level === 'error'), ...report.errors],
        warnings: [...extra.filter(i => i.level === 'warning'), ...report.warnings]
      }
    });
  } catch (err) {
    return mappingErrorResponse(err);
  }
}
