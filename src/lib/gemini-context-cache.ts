/**
 * Gemini explicit context caching for large, stable system instructions (server only).
 *
 * The SQL agent's system instruction (the whole data dictionary) is ~45k tokens and identical for
 * every question on the same dataset and mapping. Sent inline, the model re-reads it on every call.
 * Cached once, later calls reference it: the first token arrives sooner and cached tokens are billed
 * at the reduced cached-input price.
 *
 * Creation happens in the background on first use (that call proceeds uncached), so no request ever
 * waits for a cache. Anything unexpected (model without caching support, expired or deleted cache)
 * falls back to sending the instruction inline. Set GEMINI_CONTEXT_CACHE=off to disable.
 */

import { createHash } from 'crypto';
import { GoogleAICacheManager } from '@google/generative-ai/server';
import type { CachedContent } from '@google/generative-ai';
import { logger } from './logger';

/** Only instructions at least this long are worth a cache (well above the API minimum) */
const MIN_CHARS = Number(process.env.GEMINI_CONTEXT_CACHE_MIN_CHARS || 16000);
const TTL_SECONDS = Number(process.env.GEMINI_CONTEXT_CACHE_TTL_SECONDS || 3600);
/** Stop using a cache this long before it expires (a new one is created instead) */
const EXPIRY_MARGIN_MS = 120_000;
const UNSUPPORTED_RETRY_MS = 10 * 60_000;

interface Entry {
  cached?: CachedContent;
  expiresAt: number;
  creating?: Promise<void>;
}

const globalForCache = globalThis as unknown as {
  geminiContextCache?: Map<string, Entry>;
  geminiCacheUnsupported?: Map<string, number>;
};
const entries = (globalForCache.geminiContextCache ??= new Map());
const unsupported = (globalForCache.geminiCacheUnsupported ??= new Map());

const enabled = () => process.env.GEMINI_CONTEXT_CACHE !== 'off';

function keyFor(model: string, systemInstruction: string): string {
  return `${model}:${createHash('sha256').update(systemInstruction).digest('hex')}`;
}

/**
 * The ready cache for this instruction and model, or null (and a cache is created in the background
 * for the next call when worthwhile).
 */
export function cachedContentFor(apiKey: string, model: string, systemInstruction: string | undefined): CachedContent | null {
  if (!enabled() || !systemInstruction || systemInstruction.length < MIN_CHARS) return null;
  if ((unsupported.get(model) || 0) > Date.now()) return null;
  const key = keyFor(model, systemInstruction);
  const entry = entries.get(key);
  if (entry?.cached && entry.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return entry.cached;
  if (!entry?.creating) create(apiKey, model, systemInstruction, key);
  return null;
}

function create(apiKey: string, model: string, systemInstruction: string, key: string): void {
  const entry: Entry = { expiresAt: 0 };
  entry.creating = (async () => {
    try {
      const manager = new GoogleAICacheManager(apiKey);
      const cached = await manager.create({
        model: model.startsWith('models/') ? model : `models/${model}`,
        systemInstruction,
        // The API requires contents; one tiny turn keeps the cache about the instruction only
        contents: [{ role: 'user', parts: [{ text: 'Use the system instructions for the requests that follow.' }] }],
        ttlSeconds: TTL_SECONDS
      });
      entry.cached = cached;
      entry.expiresAt = cached.expireTime ? Date.parse(cached.expireTime) : Date.now() + TTL_SECONDS * 1000;
      logger.info(`Gemini context cache ready for ${model} (${Math.round(systemInstruction.length / 4 / 1000)}k tokens, ${Math.round(TTL_SECONDS / 60)} min)`);
    } catch (err: any) {
      unsupported.set(model, Date.now() + UNSUPPORTED_RETRY_MS);
      entries.delete(key);
      logger.warn(`Gemini context cache unavailable for ${model}; sending instructions inline: ${err?.message || err}`);
    } finally {
      entry.creating = undefined;
    }
  })();
  entries.set(key, entry);
  // Old caches of the same model (earlier dictionary versions) expire on their own TTL
}

/** Forget a cache the API rejected (expired or deleted), so the next call rebuilds it */
export function invalidateContextCache(cached: CachedContent): void {
  for (const [key, entry] of Array.from(entries.entries())) {
    if (entry.cached?.name === cached.name) entries.delete(key);
  }
}

export function isCacheError(err: unknown): boolean {
  return /cached ?content|cachedContents|cache.*(expired|not found)|CachedContent/i.test(String((err as Error)?.message || err));
}
