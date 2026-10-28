import { NextRequest, NextResponse } from 'next/server';
import { listRunTraces, getRunTrace } from '@/lib/multi-agent/run-trace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Saved agent runs (developer view).
 *   GET /api/agent-runs?id=<correlationId>          one run with its full graph, timings, tokens and cost
 *   GET /api/agent-runs?conversationId=<id>&limit=N  run summaries, newest first
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const id = searchParams.get('id');
    if (id) {
      const run = getRunTrace(id);
      return run
        ? NextResponse.json({ success: true, run })
        : NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 });
    }
    const runs = listRunTraces({
      conversationId: searchParams.get('conversationId') || undefined,
      limit: Number(searchParams.get('limit')) || undefined
    });
    return NextResponse.json({ success: true, count: runs.length, runs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to read agent runs' }, { status: 500 });
  }
}
