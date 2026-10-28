import { NextRequest, NextResponse } from 'next/server';
import { executeSQLiteQuery } from '@/lib/sqlite-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { sql } = await req.json();

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ error: 'SQL query string is required' }, { status: 400 });
    }

    const startTime = performance.now();
    const rows = executeSQLiteQuery(sql);
    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return NextResponse.json({
      success: true,
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'SQL execution failed' }, { status: 500 });
  }
}
