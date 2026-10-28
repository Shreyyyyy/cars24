import { NextResponse } from 'next/server';
import { getSQLiteDB, getDatasetMetadata } from '@/lib/sqlite-server';
import { readSchemaMapping } from '@/lib/schema-mapping';

export const dynamic = 'force-dynamic';

/** Sheet -> SQL table mapping, column mapping, relationships and load verification for the current upload. */
export async function GET() {
  try {
    const meta = getDatasetMetadata();
    const mapping = readSchemaMapping(getSQLiteDB());
    if (!meta || !mapping) {
      return NextResponse.json({ success: true, loaded: false, message: 'Upload a file to see its mapping.' });
    }
    return NextResponse.json({ success: true, loaded: true, fileName: meta.fileName, summary: meta.mapping ?? null, ...mapping });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
