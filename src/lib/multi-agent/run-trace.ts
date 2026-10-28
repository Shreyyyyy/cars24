/**
 * Records one question's walk through the agent graph (server-side).
 *
 * The orchestrator marks each stage with nodeStart/nodeEnd, and every LLM call and SQL execution is
 * attributed to the stage running at that moment. Each event is applied to the run (see run-graph.ts)
 * and forwarded to an optional listener, which the streaming endpoint uses to show the run live.
 * Finished runs are saved to the `agent_runs` table with their time, tokens, cost and graph.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { getSQLiteDB } from '../sqlite-server';
import { logger } from '../logger';
import { applyRunEvent, emptyRun, RunEvent, RunLLMCall, RunNodeId, RunNodeStatus, RunSQL, RunTrace } from './run-graph';

export class RunRecorder {
  readonly run: RunTrace;
  private readonly t0 = performance.now();

  constructor(correlationId: string, question: string, private readonly listener?: (e: RunEvent) => void) {
    const startedAt = new Date().toISOString();
    this.run = emptyRun(correlationId, question, startedAt);
    this.forward({ type: 'run_start', correlationId, question, startedAt });
  }

  now(): number {
    return Math.round(performance.now() - this.t0);
  }

  emit(e: RunEvent): void {
    applyRunEvent(this.run, e);
    this.forward(e);
  }

  private forward(e: RunEvent): void {
    try {
      this.listener?.(e);
    } catch {
      // A disconnected viewer must never break answering
    }
  }

  currentNode(): RunNodeId | null {
    return this.run.active[this.run.active.length - 1] || null;
  }
}

const storage = new AsyncLocalStorage<RunRecorder>();

export function runWithRecorder<T>(recorder: RunRecorder, fn: () => Promise<T>): Promise<T> {
  return storage.run(recorder, fn);
}

export function nodeStart(node: RunNodeId, via?: string): void {
  const rec = storage.getStore();
  if (rec) rec.emit({ type: 'node_start', node, atMs: rec.now(), via });
}

/** No-op when the node is not running, so every exit path can safely close it. */
export function nodeEnd(node: RunNodeId, status: RunNodeStatus = 'completed', summary?: string): void {
  const rec = storage.getStore();
  if (!rec || !rec.run.active.includes(node)) return;
  rec.emit({ type: 'node_end', node, atMs: rec.now(), status, summary: summary?.slice(0, 600) });
}

export function recordRunLLMCall(call: Omit<RunLLMCall, 'node' | 'atMs'>): void {
  const rec = storage.getStore();
  if (rec) rec.emit({ type: 'llm_call', call: { ...call, node: rec.currentNode(), atMs: rec.now() } });
}

export function recordRunSQL(sql: Omit<RunSQL, 'node' | 'atMs'>): void {
  const rec = storage.getStore();
  if (rec) rec.emit({ type: 'sql', sql: { ...sql, sql: sql.sql.slice(0, 4000), node: rec.currentNode(), atMs: rec.now() } });
}

let tableReady = false;
function ensureTable(): boolean {
  if (tableReady) return true;
  try {
    getSQLiteDB().exec(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        correlation_id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        conversation_id TEXT,
        message_id TEXT,
        question TEXT,
        answer TEXT,
        intent TEXT,
        status TEXT,
        model TEXT,
        total_ms INTEGER,
        llm_calls INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cost_usd REAL,
        path TEXT,
        trace TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_agent_runs_created ON agent_runs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_agent_runs_conversation ON agent_runs(conversation_id);
    `);
    tableReady = true;
  } catch (err: any) {
    logger.warn(`Agent run table unavailable: ${err?.message || err}`);
  }
  return tableReady;
}

/** Persists a finished run (never throws). */
export function saveRunTrace(run: RunTrace, answer: string): void {
  if (!ensureTable()) return;
  try {
    getSQLiteDB().prepare(`
      INSERT OR REPLACE INTO agent_runs
        (correlation_id, created_at, conversation_id, message_id, question, answer, intent, status, model,
         total_ms, llm_calls, input_tokens, output_tokens, cost_usd, path, trace)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.correlationId, Date.parse(run.startedAt), run.conversationId ?? null, run.messageId ?? null,
      run.question.slice(0, 2000), answer.slice(0, 4000), run.intent ?? null, run.status, run.model ?? null,
      run.totalMs, run.llmCallCount, run.inputTokens, run.outputTokens, run.costUsd,
      run.nodes.map(n => n.id).join(' > '), JSON.stringify(run)
    );
  } catch (err: any) {
    logger.warn(`Failed to save agent run: ${err?.message || err}`);
  }
}

export interface RunSummaryRow {
  correlationId: string;
  createdAt: number;
  conversationId: string | null;
  messageId: string | null;
  question: string;
  intent: string | null;
  status: string;
  model: string | null;
  totalMs: number;
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  path: string;
}

export function listRunTraces(opts: { conversationId?: string; limit?: number } = {}): RunSummaryRow[] {
  if (!ensureTable()) return [];
  const limit = Math.min(Math.max(opts.limit || 50, 1), 500);
  const where = opts.conversationId ? 'WHERE conversation_id = ?' : '';
  const params = opts.conversationId ? [opts.conversationId, limit] : [limit];
  return getSQLiteDB().prepare(`
    SELECT correlation_id correlationId, created_at createdAt, conversation_id conversationId, message_id messageId,
           question, intent, status, model, total_ms totalMs, llm_calls llmCalls, input_tokens inputTokens,
           output_tokens outputTokens, cost_usd costUsd, path
    FROM agent_runs ${where} ORDER BY created_at DESC LIMIT ?
  `).all(...params) as RunSummaryRow[];
}

export function getRunTrace(correlationId: string): (RunTrace & { answer: string }) | null {
  if (!ensureTable()) return null;
  const row = getSQLiteDB().prepare(`SELECT trace, answer FROM agent_runs WHERE correlation_id = ?`).get(correlationId) as
    { trace: string; answer: string } | undefined;
  if (!row) return null;
  try {
    return { ...JSON.parse(row.trace), answer: row.answer };
  } catch {
    return null;
  }
}
