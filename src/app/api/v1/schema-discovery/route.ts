import { NextRequest, NextResponse } from 'next/server';
import { profileDataset } from '@/lib/schema-discovery';
import { executeSQLiteQuery, getDatasetMetadata } from '@/lib/sqlite-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const meta = getDatasetMetadata();
    const rows = executeSQLiteQuery('SELECT * FROM uploaded_data LIMIT 200;');
    const profile = profileDataset(meta?.tableName || 'uploaded_data', rows);

    return NextResponse.json({
      success: true,
      profile
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
