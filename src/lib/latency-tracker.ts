/**
 * Latency tracking (server-side only; not shown in the UI).
 *
 * Every question runs inside a request trace (AsyncLocalStorage), so any code on the request path,
 * including each LLM call, can add its timing without passing IDs around. When the request finishes,
 * one row is written to the `request_latency` table: total time, database time, LLM time and call
 * count, and the per-stage breakdown (supervisor, SQL agent, synthesis, ...).
 *
 * Read it with SQL, e.g.
 *   SELECT intent, COUNT(*), AVG(total_ms), MAX(total_ms) FROM request_latency GROUP BY intent;
 * or from code with getLatencySummary().
 */

import { AsyncLocalStorage } from 'async_hooks';
import { getSQLiteDB } from './sqlite-server';
import { logger } from './logger';

export interface LLMCallTiming {
  model: string;
  purpose: string;
  latencyMs: number;
  status: 'ok' | 'timeout' | 'error';
}

/** Everything measured for one request; the cost tracker adds its totals to the same trace. */
export interface RequestTrace {
  correlationId: string;
  question: string;
  startedAt: number;
  llmCalls: LLMCallTiming[];
  llmMs: number;
  /** Filled in by the cost tracker */
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  unpricedCalls: number;
}

const storage = new AsyncLocalStorage<RequestTrace>();

/** Runs `fn` inside a new request trace; everything it awaits can reach the trace. */
export function runWithTrace<T>(correlationId: string, question: string, fn: () => Promise<T>): Promise<T> {
  const trace: RequestTrace = {
    correlationId, question, startedAt: Date.now(),
    llmCalls: [], llmMs: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, unpricedCalls: 0
  };
  return storage.run(trace, fn);
}

/** The trace of the request currently executing, if any (background jobs have none). */
export function currentTrace(): RequestTrace | undefined {
  return storage.getStore();
}

export function recordLLMTiming(timing: LLMCallTiming): void {
  const trace = storage.getStore();
  if (!trace) return;
  trace.llmCalls.push(timing);
  trace.llmMs += timing.latencyMs;
}

let tableReady = false;
function ensureTable(): boolean {
  if (tableReady) return true;
  try {
    getSQLiteDB().exec(`
      CREATE TABLE IF NOT EXISTS request_latency (
        correlation_id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        question TEXT,
        intent TEXT,
        status TEXT,
        output_mode TEXT,
        cache_hit INTEGER DEFAULT 0,
        total_ms INTEGER,
        db_ms INTEGER,
        llm_ms INTEGER,
        llm_calls INTEGER,
        rows_returned INTEGER,
        stages TEXT,
        llm_breakdown TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_request_latency_created ON request_latency(created_at DESC);
    `);
    tableReady = true;
  } catch (err: any) {
    logger.warn(`Latency table unavailable: ${err?.message || err}`);
  }
  return tableReady;
}

export interface RequestOutcome {
  intent?: string;
  status?: string;
  outputMode?: string;
  cacheHit?: boolean;
  dbMs?: number;
  rowsReturned?: number;
  /** Per-agent stage timings, in execution order */
  stages?: { name: string; ms: number }[];
}

let warnedFileLink = false;

/** Column order of the tracking sheet (the Excel table's headers must match these names). */
export const TRACKING_COLUMNS = [
  'Timestamp', 'CorrelationId', 'Question', 'Intent', 'Status', 'OutputMode', 'CacheHit',
  'TotalMs', 'LlmMs', 'DbMs', 'LlmCalls', 'InputTokens', 'OutputTokens', 'CostUSD', 'UnpricedCalls',
  'RowsReturned', 'Models', 'SlowestStage'
] as const;

/**
 * Sends one row per question to a Power Automate flow ("When an HTTP request is received" ->
 * "Add a row into a table"), which appends it to the tracking sheet of the SharePoint workbook.
 * Set TRACKING_FLOW_URL to the flow's HTTP POST URL. Fire-and-forget: a slow or failing flow never
 * delays or breaks an answer.
 */
function exportRow(trace: RequestTrace, outcome: RequestOutcome, totalMs: number): void {
  const url = process.env.TRACKING_FLOW_URL;
  if (!url) return;
  // A SharePoint/OneDrive file link cannot accept rows; it must be the flow trigger's HTTP POST URL
  if (/sharepoint\.com|onedrive\.live\.com|1drv\.ms/i.test(url)) {
    if (!warnedFileLink) {
      warnedFileLink = true;
      logger.warn('TRACKING_FLOW_URL is a SharePoint/OneDrive file link. Set it to the Power Automate flow\'s "HTTP POST URL" instead; no rows are sent until then.');
    }
    return;
  }
  const slowest = (outcome.stages || []).reduce<{ name: string; ms: number } | null>((m, st) => (!m || st.ms > m.ms ? st : m), null);
  const row: Record<(typeof TRACKING_COLUMNS)[number], string | number> = {
    // IST wall-clock time, a format Excel reads as a date
    Timestamp: new Date(trace.startedAt).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }),
    CorrelationId: trace.correlationId,
    Question: trace.question.slice(0, 1000),
    Intent: outcome.intent || '',
    Status: outcome.status || '',
    OutputMode: outcome.outputMode || '',
    CacheHit: outcome.cacheHit ? 'yes' : 'no',
    TotalMs: totalMs,
    LlmMs: trace.llmMs,
    DbMs: outcome.dbMs ?? 0,
    LlmCalls: trace.llmCalls.length,
    InputTokens: trace.inputTokens,
    OutputTokens: trace.outputTokens,
    CostUSD: Math.round(trace.costUsd * 1e6) / 1e6,
    UnpricedCalls: trace.unpricedCalls,
    RowsReturned: outcome.rowsReturned ?? 0,
    Models: Array.from(new Set(trace.llmCalls.map(c => c.model))).join(', '),
    SlowestStage: slowest ? `${slowest.name} (${slowest.ms}ms)` : ''
  };
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(10_000)
  })
    .then(res => { if (!res.ok) logger.warn(`Tracking flow rejected the row: HTTP ${res.status}`, { correlationId: trace.correlationId }); })
    .catch(err => logger.warn(`Tracking flow unreachable: ${err?.message || err}`, { correlationId: trace.correlationId }));
}

/** Persists the finished request's timings (never throws: tracking must not break answering). */
export function recordRequestLatency(outcome: RequestOutcome): void {
  const trace = storage.getStore();
  if (!trace) return;
  const totalMs = Date.now() - trace.startedAt;
  exportRow(trace, outcome, totalMs);
  logger.info(`Latency ${totalMs}ms (llm ${trace.llmMs}ms in ${trace.llmCalls.length} calls, db ${outcome.dbMs ?? 0}ms)`, { correlationId: trace.correlationId });
  if (!ensureTable()) return;
  try {
    getSQLiteDB().prepare(`
      INSERT OR REPLACE INTO request_latency
        (correlation_id, created_at, question, intent, status, output_mode, cache_hit, total_ms, db_ms, llm_ms, llm_calls, rows_returned, stages, llm_breakdown)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trace.correlationId, trace.startedAt, trace.question.slice(0, 2000), outcome.intent ?? null, outcome.status ?? null,
      outcome.outputMode ?? null, outcome.cacheHit ? 1 : 0, totalMs, outcome.dbMs ?? 0, trace.llmMs, trace.llmCalls.length,
      outcome.rowsReturned ?? 0, JSON.stringify(outcome.stages || []),
      JSON.stringify(trace.llmCalls.map(c => ({ purpose: c.purpose, model: c.model, ms: c.latencyMs, status: c.status })))
    );
  } catch (err: any) {
    logger.warn(`Failed to record request latency: ${err?.message || err}`);
  }
}

export interface LatencySummary {
  requests: number;
  p50Ms: number;
  p90Ms: number;
  p99Ms: number;
  avgLlmMs: number;
  avgDbMs: number;
  byIntent: { intent: string; requests: number; avgMs: number; maxMs: number }[];
}

/** Percentiles and per-intent averages over the last `sinceMs` (default 24 hours). */
export function getLatencySummary(sinceMs: number = 24 * 60 * 60 * 1000): LatencySummary | null {
  if (!ensureTable()) return null;
  const since = Date.now() - sinceMs;
  const db = getSQLiteDB();
  const totals = (db.prepare(`SELECT total_ms FROM request_latency WHERE created_at >= ? ORDER BY total_ms`).all(since) as { total_ms: number }[]).map(r => r.total_ms);
  const at = (p: number) => totals.length ? totals[Math.min(totals.length - 1, Math.floor(p * totals.length))] : 0;
  const avg = db.prepare(`SELECT AVG(llm_ms) llm, AVG(db_ms) db FROM request_latency WHERE created_at >= ?`).get(since) as { llm: number | null; db: number | null };
  const byIntent = db.prepare(`
    SELECT COALESCE(intent, 'unknown') intent, COUNT(*) requests, ROUND(AVG(total_ms)) avgMs, MAX(total_ms) maxMs
    FROM request_latency WHERE created_at >= ? GROUP BY 1 ORDER BY requests DESC
  `).all(since) as LatencySummary['byIntent'];
  return {
    requests: totals.length, p50Ms: at(0.5), p90Ms: at(0.9), p99Ms: at(0.99),
    avgLlmMs: Math.round(avg.llm || 0), avgDbMs: Math.round(avg.db || 0), byIntent
  };
}
