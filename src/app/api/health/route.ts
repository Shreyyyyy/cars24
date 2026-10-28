import { NextResponse } from 'next/server';
import { getDatasetMetadata, getSQLiteDB } from '@/lib/sqlite-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  try {
    const db = getSQLiteDB();
    const dbCheck = db.prepare('SELECT 1 as healthy').get() as { healthy: number };
    const metadata = getDatasetMetadata();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      database: {
        engine: 'SQLite WAL (In-Memory / Mapped)',
        isHealthy: dbCheck?.healthy === 1,
        datasetLoaded: Boolean(metadata && metadata.rowCount > 0),
        rowCount: metadata?.rowCount || 0,
        tableName: metadata?.tableName || 'none'
      },
      ai: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        outputMode: process.env.OUTPUT_MODE || process.env.NEXT_PUBLIC_OUTPUT_MODE || 'medium'
      },
      latencyMs: Date.now() - startTime
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: err.message || 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
