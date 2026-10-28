import { NextRequest, NextResponse } from 'next/server';
import { mappingContext, mappingErrorResponse, readJson } from '@/lib/schema-dictionary/api';
import { listMappingVersions, getMappingVersion, restoreMappingVersion } from '@/lib/schema-dictionary/store';
import { diffMappingDocs, MappingEditError } from '@/lib/schema-dictionary/model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET                   versions of the loaded workbook's mapping, newest first
 * GET ?id=N             one version's document
 * GET ?id=N&compare=M   plus what changed from version id M to N
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = mappingContext();
    if (ctx instanceof NextResponse) return ctx;
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (id) {
      const v = getMappingVersion(id);
      if (!v || v.info.workbookKey !== ctx.active.workbookKey) {
        return NextResponse.json({ success: false, error: 'Version not found for this workbook' }, { status: 404 });
      }
      const compareId = Number(searchParams.get('compare'));
      const other = compareId ? getMappingVersion(compareId) : null;
      return NextResponse.json({ success: true, ...v, diff: other ? diffMappingDocs(other.doc, v.doc) : undefined });
    }
    return NextResponse.json({
      success: true,
      workbookKey: ctx.active.workbookKey,
      currentVersion: ctx.currentVersion,
      versions: listMappingVersions(ctx.active.workbookKey)
    });
  } catch (err) {
    return mappingErrorResponse(err);
  }
}

/** Restores an old version (appended as a new version). Body: { action: "restore", id, baseVersion } */
export async function POST(req: NextRequest) {
  try {
    const ctx = mappingContext();
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(req);
    if (body?.action !== 'restore' || typeof body.id !== 'number' || typeof body.baseVersion !== 'number') {
      throw new MappingEditError('Expected { action: "restore", id, baseVersion }');
    }
    const v = getMappingVersion(body.id);
    if (!v || v.info.workbookKey !== ctx.active.workbookKey) {
      return NextResponse.json({ success: false, error: 'Version not found for this workbook' }, { status: 404 });
    }
    const saved = restoreMappingVersion(body.id, body.baseVersion, ctx.meta.fileName);
    return NextResponse.json({ success: true, ...saved, doc: v.doc });
  } catch (err) {
    return mappingErrorResponse(err);
  }
}
