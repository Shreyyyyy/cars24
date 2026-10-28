import { redisCache } from '@/lib/redis-cache';
import { isCacheEnabled } from '@/lib/cache-config';

interface CacheEntry {
  normalizedKey: string;
  originalQuery: string;
  result: any;
  timestamp: number;
  hits: number;
}

const cacheStore = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 350;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Normalization & Synonym Mapping
const SYNONYMS: Record<string, string> = {
  'dealership': 'showroom',
  'dealerships': 'showroom',
  'showrooms': 'showroom',
  'branch': 'showroom',
  'branches': 'showroom',
  'outlet': 'showroom',
  'outlets': 'showroom',
  'car': 'model',
  'cars': 'model',
  'vehicles': 'model',
  'vehicle': 'model',
  'automobiles': 'model',
  'sales': 'sales',
  'sold': 'sales',
  'deliveries': 'sales',
  'volumes': 'sales',
  'units': 'sales',
  'worst': 'lowest',
  'underperforming': 'lowest',
  'lagging': 'lowest',
  'poor': 'lowest',
  'bottom': 'lowest',
  'least': 'lowest',
  'best': 'top',
  'highest': 'top',
  'leading': 'top',
  'maximum': 'top',
  'most': 'top',
  'cac': 'cac',
  'cpl': 'cpl',
  'roas': 'roas',
  'roi': 'roas'
};

const STOPWORDS = new Set([
  'which', 'what', 'who', 'show', 'me', 'list', 'the', 'a', 'an', 'in', 'of',
  'for', 'and', 'or', 'is', 'are', 'was', 'were', 'have', 'has', 'having',
  'with', 'all', 'please', 'tell', 'give', 'can', 'you', 'how', 'many'
]);

export function normalizeQueryKey(query: string): string {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && !STOPWORDS.has(t))
    .map(t => SYNONYMS[t] || t);

  tokens.sort(); // Sort tokens to make query order-agnostic
  return tokens.join('_');
}

export function cacheKey(query: string, namespace?: string): string {
  const normalized = normalizeQueryKey(query);
  return namespace ? `${namespace}::${normalized}` : normalized;
}

/**
 * Synchronous local cache check for sub-1ms hot path
 */
export function getFromSemanticCache(query: string, namespace?: string, cacheOverride?: boolean | null): any | null {
  if (!isCacheEnabled(cacheOverride)) return null;

  const key = cacheKey(query, namespace);
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cacheStore.delete(key);
    return null;
  }

  entry.hits += 1;
  return entry.result;
}

/**
 * Async cache check querying Redis then Memory
 */
export async function getFromDistributedCache(query: string, namespace?: string, cacheOverride?: boolean | null): Promise<any | null> {
  if (!isCacheEnabled(cacheOverride)) return null;

  const key = cacheKey(query, namespace);
  const local = getFromSemanticCache(query, namespace, cacheOverride);
  if (local) return local;

  const fromRedis = await redisCache.get<any>(key);
  if (fromRedis) {
    setInSemanticCache(query, fromRedis, namespace, cacheOverride);
    return fromRedis;
  }
  return null;
}

export function setInSemanticCache(query: string, result: any, namespace?: string, cacheOverride?: boolean | null): void {
  if (!isCacheEnabled(cacheOverride)) return;

  const key = cacheKey(query, namespace);
  if (!cacheStore.has(key) && cacheStore.size >= MAX_CACHE_SIZE) {
    // Evict least-hit entry
    let oldestKey = '';
    let minHits = Infinity;
    cacheStore.forEach((v, k) => {
      if (v.hits < minHits) {
        minHits = v.hits;
        oldestKey = k;
      }
    });
    if (oldestKey) cacheStore.delete(oldestKey);
  }

  cacheStore.set(key, {
    normalizedKey: key,
    originalQuery: query,
    result,
    timestamp: Date.now(),
    hits: 1
  });

  // Async push to Redis in background
  redisCache.set(key, result, 1800).catch(() => {});
}

export function clearSemanticCache(): void {
  cacheStore.clear();
  redisCache.clearAll().catch(() => {});
}

export function getCacheStats() {
  return {
    ...redisCache.getStats(),
    localCacheSize: cacheStore.size,
    maxSize: MAX_CACHE_SIZE
  };
}
