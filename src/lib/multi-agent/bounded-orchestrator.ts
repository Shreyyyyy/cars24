/**
 * Chat entry point: runs one question through the analyst and records its trace, latency and cost.
 * The analyst answers from its own consistent model of CARS24's India data (see ../analyst).
 */

import { UserSecurityContext } from '../security';
import { MultiAgentResponse } from './types';
import { logger, generateCorrelationId } from '../logger';
import { runWithTrace, recordRequestLatency } from '../latency-tracker';
import { logRequestCost } from '../cost-tracker';
import { RunRecorder, runWithRecorder, saveRunTrace } from './run-trace';
import { RunEvent } from './run-graph';
import { runAssumedDataAnalyst } from '../analyst/assumed-data-analyst';

export interface BoundedOrchestrationRequest {
  query: string;
  conversationId?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  apiKey?: string;
  securityContext?: UserSecurityContext;
  outputMode?: string;
  useCache?: boolean | string;
  /** Receives every agent-graph event as it happens (live developer view) */
  onEvent?: (event: RunEvent) => void;
}

export async function executeBoundedAgentPipeline(
  request: BoundedOrchestrationRequest
): Promise<MultiAgentResponse> {
  const correlationId = generateCorrelationId();
  const recorder = new RunRecorder(correlationId, request.query, request.onEvent);
  return runWithTrace(correlationId, request.query, () => runWithRecorder(recorder, async () => {
    let response: MultiAgentResponse;
    try {
      response = await runAssumedDataAnalyst(request, correlationId);
    } catch (err) {
      logger.error('Analyst failed', err as Error, { correlationId });
      recorder.emit({ type: 'run_end', atMs: recorder.now(), status: 'error', conversationId: request.conversationId });
      saveRunTrace(recorder.run, `ERROR: ${(err as Error)?.message || err}`);
      throw err;
    }
    recorder.emit({
      type: 'run_end',
      atMs: recorder.now(),
      status: response.status,
      intent: response.intent,
      model: response.metadata?.model,
      conversationId: response.conversationId,
      messageId: response.messageId,
      cacheHit: false
    });
    saveRunTrace(recorder.run, response.answer || '');
    recordRequestLatency({
      intent: response.intent,
      status: response.status,
      outputMode: response.metadata?.outputMode,
      cacheHit: false,
      rowsReturned: response.data?.length || 0,
      stages: []
    });
    logRequestCost();
    return { ...response, runTrace: recorder.run };
  }));
}
