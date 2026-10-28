import { NextRequest, NextResponse } from 'next/server';
import { executeBoundedAgentPipeline } from '@/lib/multi-agent/bounded-orchestrator';
import { logger, generateCorrelationId } from '@/lib/logger';
import { parseQueryRequest } from '@/lib/query-request';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Same answer as POST /api/gemini/query, streamed as NDJSON so the chat can show the agent graph live:
 *   {"type":"event","event":{...}}   one per agent-graph event (node start/end, LLM call, SQL)
 *   {"type":"result","data":{...}}   the final response (same body as the JSON endpoint)
 *   {"type":"error","error":"..."}   the pipeline failed
 */
export async function POST(req: NextRequest) {
  const parsed = await parseQueryRequest(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status, headers: parsed.headers });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (payload: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
        } catch {
          open = false; // client went away; the pipeline still finishes and is saved
        }
      };
      try {
        const response = await executeBoundedAgentPipeline({
          ...parsed.request,
          onEvent: event => send({ type: 'event', event })
        });
        send({ type: 'result', data: { success: true, ...response } });
      } catch (err: any) {
        const correlationId = generateCorrelationId();
        logger.error('API query stream error', err, { correlationId });
        send({
          type: 'error',
          error: process.env.NODE_ENV === 'production'
            ? `Query processing failed. Reference: ${correlationId}`
            : err?.message || 'Internal query processing error'
        });
      } finally {
        if (open) controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      // no-transform keeps compression proxies from buffering the stream
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
}
