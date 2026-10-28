import { NextRequest, NextResponse } from 'next/server';
import { executeBoundedAgentPipeline } from '@/lib/multi-agent/bounded-orchestrator';
import { logger, generateCorrelationId } from '@/lib/logger';
import { parseQueryRequest } from '@/lib/query-request';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const parsed = await parseQueryRequest(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status, headers: parsed.headers });
  }

  try {
    const response = await executeBoundedAgentPipeline(parsed.request);

    return NextResponse.json(
      { success: true, ...response },
      {
        headers: {
          'Server-Timing': `total;dur=${response.metadata.latencyMs}` +
            (response.metadata.dbLatencyMs !== undefined ? `, db;dur=${response.metadata.dbLatencyMs}` : ''),
          'X-Correlation-Id': response.metadata.correlationId,
          'X-Cache': response.metadata.cacheHit ? 'HIT' : 'MISS'
        }
      }
    );
  } catch (err: any) {
    const correlationId = generateCorrelationId();
    logger.error('API query error', err, { correlationId });
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'production'
          ? `Query processing failed. Reference: ${correlationId}`
          : err?.message || 'Internal query processing error',
        correlationId
      },
      { status: 500 }
    );
  }
}
