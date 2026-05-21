/**
 * Lightweight SWR-like cache for API responses.
 * - Returns stale data instantly on cache hit while revalidating in background
 * - Configurable staleTime / cacheTime
 * - Deduplicates in-flight requests
 */

const cache = new Map();      // key → { data, ts }
const inflight = new Map();   // key → Promise

const DEFAULT_STALE_TIME = 30_000;   // 30s — data considered fresh
const DEFAULT_CACHE_TIME = 300_000;  // 5min — data kept in memory

/**
 * Wrap an API call with caching.
 * @param {string} key - Unique cache key (e.g. "customer-dashboard")
 * @param {() => Promise<any>} fetcher - Function that returns the API promise
 * @param {object} opts
 * @param {number} opts.staleTime - ms before revalidation (default 30s)
 * @param {number} opts.cacheTime - ms before eviction (default 5min)
 * @param {boolean} opts.forceRefresh - bypass cache
 * @returns {Promise<any>}
 */
export async function cachedFetch(key, fetcher, opts = {}) {
  const { staleTime = DEFAULT_STALE_TIME, cacheTime = DEFAULT_CACHE_TIME, forceRefresh = false, signal } = opts;

  const entry = cache.get(key);
  const now = Date.now();

  // Cache hit and still fresh — return immediately
  if (!forceRefresh && entry && (now - entry.ts) < staleTime) {
    return entry.data;
  }

  // Cache hit but stale — return stale data, revalidate in background
  if (!forceRefresh && entry && (now - entry.ts) < cacheTime) {
    // Background revalidate (don't await)
    if (!inflight.has(key)) {
      const p = fetcher().then(data => {
        cache.set(key, { data, ts: Date.now() });
        inflight.delete(key);
        return data;
      }).catch(() => { inflight.delete(key); });
      inflight.set(key, p);
    }
    return entry.data;
  }

  // No cache or expired — deduplicate concurrent requests
  // Skip deduplication if the caller has a signal (may be from a different lifecycle)
  if (!signal && inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = fetcher().then(data => {
    cache.set(key, { data, ts: Date.now() });
    inflight.delete(key);
    return data;
  }).catch(err => {
    inflight.delete(key);
    // If request was aborted, don't return stale data — let next call retry fresh
    if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') {
      throw err;
    }
    // Return stale data on network error if available
    if (entry) return entry.data;
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

/** Invalidate a specific key or all keys matching a prefix */
export function invalidateCache(keyOrPrefix) {
  if (!keyOrPrefix) { cache.clear(); return; }
  for (const k of cache.keys()) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix + ':')) {
      cache.delete(k);
    }
  }
}

/** Prefetch data into cache (non-blocking) */
export function prefetch(key, fetcher, opts = {}) {
  const entry = cache.get(key);
  if (entry && (Date.now() - entry.ts) < (opts.staleTime || DEFAULT_STALE_TIME)) return;
  cachedFetch(key, fetcher, opts).catch(() => {});
}
