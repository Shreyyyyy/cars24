import { NextResponse } from 'next/server';
import { clearSQLiteDataset } from '@/lib/sqlite-server';
import { clearSemanticCache } from '@/lib/semantic-cache';
import { clearUploadedDocumentChunks } from '@/lib/rag-engine';
import { clearGrowthAnalysisCache } from '@/lib/growth-opportunities';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    clearSQLiteDataset();
    clearSemanticCache();
    clearUploadedDocumentChunks();
    clearGrowthAnalysisCache();
    return NextResponse.json({
      success: true,
      message: 'Database tables dropped, metadata reset, and cache invalidated successfully.'
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Failed to clear database'
    }, { status: 500 });
  }
}
