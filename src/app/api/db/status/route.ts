import { NextResponse } from 'next/server';
import { getDatasetMetadata, executeSQLiteQuery, getQueryableTables } from '@/lib/sqlite-server';
import { suggestQuestionsForDataset } from '@/lib/dataset-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metadata = getDatasetMetadata();

    if (!metadata) {
      return NextResponse.json({
        loaded: false,
        message: 'No spreadsheet loaded in database. Upload an Excel or CSV file to begin.'
      });
    }

    let previewRows: any[] = [];
    try {
      previewRows = executeSQLiteQuery('SELECT * FROM uploaded_data LIMIT 5;');
    } catch {}

    return NextResponse.json({
      loaded: true,
      engine: 'SQLite WAL',
      dbLocation: 'data/maruti.sqlite',
      metadata: { ...metadata, understanding: undefined },
      previewRows,
      tables: getQueryableTables(metadata).map(t => ({ sheetName: t.sheetName, tableName: t.tableName, rowCount: t.rowCount })),
      suggestedQuestions: suggestQuestionsForDataset(metadata),
      source: metadata.source || 'upload',
      sourceId: metadata.sourceId || null,
      understanding: metadata.understanding
        ? { status: metadata.understanding.status, builtInMs: metadata.understanding.builtInMs }
        : null
    });
  } catch (err: any) {
    return NextResponse.json({
      loaded: false,
      error: err.message
    }, { status: 500 });
  }
}
