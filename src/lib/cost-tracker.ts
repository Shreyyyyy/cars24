/**
 * LLM cost tracking (server-side only; not shown in the UI).
 *
 * Every Gemini call records its token usage (from the API's usageMetadata) and the cost computed from
 * the price table below into the `llm_costs` table, tagged with the request it served (correlation id)
 * and its purpose (sql_generation, synthesis, conversation, ...). The request's running total is also
 * added to its trace, so `request_latency` rows and logs can be joined to cost.
 *
 * Prices are USD per 1M tokens. Verify them against Google's current price list and override with
 * GEMINI_PRICING_JSON, e.g. {"gemini-2.5-flash": {"input": 0.30, "output": 2.50, "cachedInput": 0.03}}.
 * A model without a price is recorded with its tokens and cost_usd NULL (flagged, never guessed).
 *
 * Read it with SQL, e.g.
 *   SELECT purpose, COUNT(*), SUM(cost_usd), SUM(input_tokens), SUM(output_tokens) FROM llm_costs GROUP BY purpose;
 * or from code with getCostSummary().
 */

import { getSQLiteDB } from './sqlite-server';
import { currentTrace } from './latency-tracker';
import { logger } from './logger';
import { recordRunLLMCall } from './multi-agent/run-trace';

export interface ModelPrice {
  /** USD per 1M prompt tokens */
  input: number;
  /** USD per 1M output tokens (thinking tokens are billed as output) */
  output: number;
  /** USD per 1M prompt tokens served from the context cache */
  cachedInput?: number;
  /** Prompts longer than this many tokens use the long-context prices */
  longContextThreshold?: number;
  longInput?: number;
  longOutput?: number;
}

/** Paid-tier text prices (USD / 1M tokens) for the models this app uses. */
const DEFAULT_PRICES: Record<string, ModelPrice> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50, cachedInput: 0.03 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40, cachedInput: 0.01 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0, cachedInput: 0.31, longContextThreshold: 200_000, longInput: 2.50, longOutput: 15.0 }
};

function loadPrices(): Record<string, ModelPrice> {
  const raw = process.env.GEMINI_PRICING_JSON;
  if (!raw) return DEFAULT_PRICES;
  try {
    return { ...DEFAULT_PRICES, ...JSON.parse(raw) };
  } catch {
    logger.warn('GEMINI_PRICING_JSON is not valid JSON; using default prices');
    return DEFAULT_PRICES;
  }
}
const PRICES = loadPrices();

/** Exact model first, then the longest priced prefix (e.g. "gemini-2.5-flash-001" -> "gemini-2.5-flash"). */
function priceFor(model: string): ModelPrice | undefined {
  if (PRICES[model]) return PRICES[model];
  const key = Object.keys(PRICES).filter(k => model.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key] : undefined;
}

export interface TokenUsage {
  promptTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cachedTokens: number;
}

/** Reads the Gemini SDK's usageMetadata (field names as the API returns them). */
export function usageFromResponse(usageMetadata: any): TokenUsage | null {
  if (!usageMetadata) return null;
  const promptTokens = Number(usageMetadata.promptTokenCount) || 0;
  const outputTokens = Number(usageMetadata.candidatesTokenCount) || 0;
  // Thinking tokens are billed as output; the SDK does not type the field, so fall back to the
  // part of the total that is neither prompt nor visible output
  const thinkingTokens = Number(usageMetadata.thoughtsTokenCount) ||
    Math.max(0, (Number(usageMetadata.totalTokenCount) || 0) - promptTokens - outputTokens);
  return { promptTokens, outputTokens, thinkingTokens, cachedTokens: Number(usageMetadata.cachedContentTokenCount) || 0 };
}

/** USD cost of one call, or null when the model has no price. */
export function computeCostUsd(model: string, usage: TokenUsage): number | null {
  const price = priceFor(model);
  if (!price) return null;
  const long = price.longContextThreshold !== undefined && usage.promptTokens > price.longContextThreshold;
  const inputRate = long ? price.longInput ?? price.input : price.input;
  const outputRate = long ? price.longOutput ?? price.output : price.output;
  const cached = Math.min(usage.cachedTokens, usage.promptTokens);
  const cost = ((usage.promptTokens - cached) * inputRate +
    cached * (price.cachedInput ?? inputRate) +
    (usage.outputTokens + usage.thinkingTokens) * outputRate) / 1_000_000;
  return Math.round(cost * 1e8) / 1e8;
}

let tableReady = false;
function ensureTable(): boolean {
  if (tableReady) return true;
  try {
    getSQLiteDB().exec(`
      CREATE TABLE IF NOT EXISTS llm_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        correlation_id TEXT,
        purpose TEXT,
        model TEXT,
        status TEXT,
        latency_ms INTEGER,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        thinking_tokens INTEGER DEFAULT 0,
        cached_tokens INTEGER DEFAULT 0,
        cost_usd REAL
      );
      CREATE INDEX IF NOT EXISTS idx_llm_costs_created ON llm_costs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_llm_costs_request ON llm_costs(correlation_id);
    `);
    tableReady = true;
  } catch (err: any) {
    logger.warn(`Cost table unavailable: ${err?.message || err}`);
  }
  return tableReady;
}

export interface LLMCallRecord {
  model: string;
  purpose: string;
  status: 'ok' | 'timeout' | 'error';
  latencyMs: number;
  /** Null when the call produced no usage data (e.g. it timed out client-side) */
  usage: TokenUsage | null;
}

/** Persists one LLM call and adds it to the current request's totals (never throws). */
export function recordLLMCost(call: LLMCallRecord): void {
  const usage = call.usage || { promptTokens: 0, outputTokens: 0, thinkingTokens: 0, cachedTokens: 0 };
  const cost = call.usage ? computeCostUsd(call.model, usage) : null;
  const trace = currentTrace();
  if (trace) {
    trace.inputTokens += usage.promptTokens;
    trace.outputTokens += usage.outputTokens + usage.thinkingTokens;
    if (cost !== null) trace.costUsd += cost;
    else if (call.usage) trace.unpricedCalls += 1;
  }
  recordRunLLMCall({
    purpose: call.purpose, model: call.model, status: call.status, latencyMs: call.latencyMs,
    inputTokens: usage.promptTokens, outputTokens: usage.outputTokens + usage.thinkingTokens,
    cachedTokens: usage.cachedTokens, costUsd: cost
  });
  if (!ensureTable()) return;
  try {
    getSQLiteDB().prepare(`
      INSERT INTO llm_costs (created_at, correlation_id, purpose, model, status, latency_ms, input_tokens, output_tokens, thinking_tokens, cached_tokens, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Date.now(), trace?.correlationId ?? null, call.purpose, call.model, call.status, call.latencyMs,
      usage.promptTokens, usage.outputTokens, usage.thinkingTokens, usage.cachedTokens, cost);
  } catch (err: any) {
    logger.warn(`Failed to record LLM cost: ${err?.message || err}`);
  }
}

/** Logs the finished request's token and cost totals. */
export function logRequestCost(): void {
  const trace = currentTrace();
  if (!trace || trace.llmCalls.length === 0) return;
  logger.info(
    `Cost $${trace.costUsd.toFixed(6)} (${trace.inputTokens} in / ${trace.outputTokens} out tokens` +
    `${trace.unpricedCalls ? `; ${trace.unpricedCalls} call(s) on unpriced models` : ''})`,
    { correlationId: trace.correlationId }
  );
}

export interface CostSummary {
  calls: number;
  requests: number;
  totalUsd: number;
  avgUsdPerRequest: number;
  inputTokens: number;
  outputTokens: number;
  unpricedCalls: number;
  byPurpose: { purpose: string; calls: number; usd: number; inputTokens: number; outputTokens: number }[];
  byModel: { model: string; calls: number; usd: number }[];
}

/** Totals over the last `sinceMs` (default 24 hours). */
export function getCostSummary(sinceMs: number = 24 * 60 * 60 * 1000): CostSummary | null {
  if (!ensureTable()) return null;
  const since = Date.now() - sinceMs;
  const db = getSQLiteDB();
  const t = db.prepare(`
    SELECT COUNT(*) calls, COUNT(DISTINCT correlation_id) requests, COALESCE(SUM(cost_usd), 0) usd,
           COALESCE(SUM(input_tokens), 0) inTok, COALESCE(SUM(output_tokens + thinking_tokens), 0) outTok,
           SUM(cost_usd IS NULL AND input_tokens > 0) unpriced
    FROM llm_costs WHERE created_at >= ?
  `).get(since) as any;
  const byPurpose = db.prepare(`
    SELECT purpose, COUNT(*) calls, ROUND(COALESCE(SUM(cost_usd), 0), 6) usd, SUM(input_tokens) inputTokens, SUM(output_tokens + thinking_tokens) outputTokens
    FROM llm_costs WHERE created_at >= ? GROUP BY 1 ORDER BY usd DESC
  `).all(since) as CostSummary['byPurpose'];
  const byModel = db.prepare(`
    SELECT model, COUNT(*) calls, ROUND(COALESCE(SUM(cost_usd), 0), 6) usd FROM llm_costs WHERE created_at >= ? GROUP BY 1 ORDER BY usd DESC
  `).all(since) as CostSummary['byModel'];
  return {
    calls: t.calls, requests: t.requests, totalUsd: Math.round(t.usd * 1e6) / 1e6,
    avgUsdPerRequest: t.requests ? Math.round((t.usd / t.requests) * 1e6) / 1e6 : 0,
    inputTokens: t.inTok, outputTokens: t.outTok, unpricedCalls: t.unpriced || 0, byPurpose, byModel
  };
}
