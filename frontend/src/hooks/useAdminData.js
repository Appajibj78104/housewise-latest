import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedFetch, invalidateCache } from '../../utils/apiCache';

/**
 * useAdminData - Hook for fetching admin data with:
 * - SWR-style caching (stale-while-revalidate)
 * - Abort signal to prevent stale state on unmount/re-fetch
 * - Optimistic updates
 * - Loading/error state
 *
 * Usage:
 *   const { data, loading, error, refresh, optimisticUpdate } = useAdminData(
 *     'admin-bookings',
 *     () => adminAPIService.searchBookings(params),
 *     { deps: [params] }
 *   );
 */
export function useAdminData(cacheKey, fetcher, options = {}) {
  const {
    deps = [],
    staleTime = 30000,
    cacheTime = 300000,
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await cachedFetch(
        cacheKey,
        () => fetcher(controller.signal),
        { staleTime, cacheTime, forceRefresh, signal: controller.signal }
      );

      if (mountedRef.current && !controller.signal.aborted) {
        setData(result);
        setLoading(false);
        onSuccess?.(result);
      }
    } catch (err) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
        onError?.(err);
      }
    }
  }, [cacheKey, enabled, staleTime, cacheTime, ...deps]);

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  const optimisticUpdate = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  const invalidate = useCallback(() => {
    invalidateCache(cacheKey);
  }, [cacheKey]);

  return { data, loading, error, refresh, optimisticUpdate, invalidate };
}

/**
 * useOptimisticToggle - For toggle/flag actions with instant UI feedback
 */
export function useOptimisticToggle(items, setItems, idKey = '_id') {
  const toggle = useCallback(async (itemId, field, apiCall) => {
    // Optimistic: flip immediately
    setItems(prev => prev.map(item =>
      item[idKey] === itemId ? { ...item, [field]: !item[field] } : item
    ));

    try {
      const response = await apiCall();
      if (!response?.success) {
        // Revert on failure
        setItems(prev => prev.map(item =>
          item[idKey] === itemId ? { ...item, [field]: !item[field] } : item
        ));
      }
    } catch {
      // Revert
      setItems(prev => prev.map(item =>
        item[idKey] === itemId ? { ...item, [field]: !item[field] } : item
      ));
    }
  }, [setItems, idKey]);

  return toggle;
}
