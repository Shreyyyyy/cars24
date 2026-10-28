import { NextRequest, NextResponse } from 'next/server';
import { getQALogs, clearAllQALogs } from '@/lib/qa-logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const sessionId = searchParams.get('sessionId') || undefined;

    const logs = getQALogs({ search, limit, sessionId });

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to fetch Q&A logs'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    clearAllQALogs();
    return NextResponse.json({
      success: true,
      message: 'All Q&A logs cleared successfully.'
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to clear Q&A logs'
    }, { status: 500 });
  }
}
